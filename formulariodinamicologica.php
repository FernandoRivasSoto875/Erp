<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// --- PRIORIDAD 0: LOOKUP AJAX PARA CAMPOS CON data-formula tipo lookup ---
if (isset($_GET['action']) && $_GET['action'] === 'lookup') {
    ob_clean();
    header('Content-Type: application/json');
    ini_set('display_errors', 1); // Mostrar errores solo para depuración
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    $table = $_GET['table'] ?? '';
    $field = $_GET['field'] ?? '';
    $where = $_GET['where'] ?? '';

    if (!$table || !$field || !$where) {
        echo json_encode(['success' => false, 'error' => 'Faltan parámetros']);
        exit;
    }

    $config_path = __DIR__ . '/config/conexion.json';
    if (!file_exists($config_path)) {
        echo json_encode(['success' => false, 'error' => 'No existe config/conexion.json']);
        exit;
    }
    $config = json_decode(file_get_contents($config_path), true);
    if (!$config || !isset($config['host'], $config['user'], $config['password'], $config['database'])) {
        echo json_encode(['success' => false, 'error' => 'config/conexion.json inválido']);
        exit;
    }
    $mysqli = new mysqli($config['host'], $config['user'], $config['password'], $config['database']);
    if ($mysqli->connect_errno) {
        echo json_encode(['success' => false, 'error' => 'Error de conexión: ' . $mysqli->connect_error]);
        exit;
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $field)) {
        echo json_encode(['success' => false, 'error' => 'Parámetros inválidos']);
        exit;
    }

    $sql = "SELECT `$field` FROM `$table` WHERE $where LIMIT 1";
    $result = $mysqli->query($sql);
    if ($result && $row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'value' => $row[$field]]);
    } else {
        echo json_encode(['success' => false, 'value' => '', 'sql' => $sql, 'mysqli_error' => $mysqli->error]);
    }
    $mysqli->close();
    exit;
}

// Elimino el header global, solo se debe usar en respuestas AJAX

session_start();

// --- INICIO: Integración con Librerías ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require_once 'fpdf/fpdf.php';
require __DIR__ . '/vendor/autoload.php';
// --- FIN: Integración con Librerías ---

// --- Inclusiones de funciones ---
require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

// --- FUNCIONES AUXILIARES ---
function obtenerTodosLosCampos($fieldsets) { $campos = []; foreach ($fieldsets as $fieldset) { if (!empty($fieldset['fields'])) { $campos = array_merge($campos, $fieldset['fields']); } if (!empty($fieldset['fieldsets'])) { $campos = array_merge($campos, obtenerTodosLosCampos($fieldset['fieldsets'])); } } return $campos; }
function getFieldInfo($fieldName, $all_fields) { foreach ($all_fields as $field) { if (isset($field['name']) && $field['name'] === $fieldName) { return $field; } } return null; }

// --- INICIO: Preparación de Variables Globales ---
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$json_path = "json/" . basename($archivo_json);
if (!file_exists($json_path)) { die("Error: El archivo de configuración '$json_path' no existe."); }
$json = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) { die("Error: El archivo JSON contiene errores. " . json_last_error_msg()); }

$all_fields = obtenerTodosLosCampos($json['fieldsets'] ?? []);
$valores = [];
$soloLectura = false;
$mensaje_envio = '';

// =================================================================================
//  INICIO: LÓGICA DE PROCESAMIENTO DE PETICIONES (NUEVO ORDEN)
// =================================================================================

// --- PRIORIDAD 1: PROCESAR EL ENVÍO DEL FORMULARIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $json['parametros'] ?? [];
    $postData = $_POST;
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    $formData = [];
    foreach ($all_fields as $field) {
        $fieldName = $field['name'];
        if ($field['type'] === 'datatable') {
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : [];
        } else if ($field['type'] === 'file') {
            // Procesar archivos adjuntos
            $formData[$fieldName] = [];
            if (isset($_FILES[$fieldName]) && is_array($_FILES[$fieldName]['name'])) {
                foreach ($_FILES[$fieldName]['name'] as $idx => $fileName) {
                    if ($_FILES[$fieldName]['error'][$idx] === UPLOAD_ERR_OK) {
                        $tmpName = $_FILES[$fieldName]['tmp_name'][$idx];
                        $destPath = $uploadsDir . basename($fileName);
                        if (move_uploaded_file($tmpName, $destPath)) {
                            $formData[$fieldName][] = $destPath;
                        }
                    }
                }
            }
        } else {
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : null;
        }
    }

    $firstField = reset($all_fields);
    $id_registro = null;
    if ($firstField && array_key_exists($firstField['name'], $formData)) {
        $id_registro = $formData[$firstField['name']];
        $sessionKey = 'form_data_' . $archivo_json . '_' . $id_registro;
        $_SESSION[$sessionKey] = $formData;
    }
    
    try {
        // Generación de archivos y correo (sin cambios)
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $archivosAdjuntar = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1>";
        $datosParaArchivos = [];
        foreach ($formData as $key => $value) {
            $fieldInfo = getFieldInfo($key, $all_fields);
            if (!$fieldInfo) continue;
            $label = $fieldInfo['label'] ?? ucfirst($key);
            $displayValue = '';
            $valorParaArchivo = '';
            if ($fieldInfo['type'] === 'datatable' && is_array($value)) {
                $displayValue .= "<table border='1' cellpadding='5' style='width:100%; border-collapse:collapse; margin-top:5px;'><thead><tr>";
                foreach($fieldInfo['columns'] as $col) { $displayValue .= "<th>" . htmlspecialchars($col['label']) . "</th>"; }
                $displayValue .= "</tr></thead><tbody>";
                foreach($value as $row) { $displayValue .= "<tr>"; foreach($fieldInfo['columns'] as $col) { $displayValue .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $displayValue .= "</tr>"; }
                $displayValue .= "</tbody></table>";
                $valorParaArchivo = json_encode($value);
            } else if ($fieldInfo['type'] === 'file' && is_array($value)) {
                $displayValue = implode('<br>', array_map('htmlspecialchars', $value));
                $valorParaArchivo = implode(', ', $value);
                foreach ($value as $filePath) {
                    if (file_exists($filePath)) {
                        $archivosAdjuntar[] = $filePath;
                    }
                }
            } else {
                $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars($value));
                $valorParaArchivo = is_array($value) ? implode(', ', $value) : $value;
            }
            $datosParaArchivos[] = ['label' => $label, 'value' => $valorParaArchivo, 'type' => $fieldInfo['type'], 'columns' => $fieldInfo['columns'] ?? []];
            $cuerpoHtml .= "<h3>" . htmlspecialchars($label) . "</h3><div>{$displayValue}</div><hr>";
        }
        if (in_array('html', $formatosAgenerar)) { $path = $baseFilename . '.html'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; }
        if (in_array('json', $formatosAgenerar)) { $path = $baseFilename . '.json'; file_put_contents($path, json_encode($formData, JSON_PRETTY_PRINT)); $archivosAdjuntar[] = $path; }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { $path = $baseFilename . '.csv'; $fp = fopen($path, 'w'); fputcsv($fp, ['Campo', 'Valor']); foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); } fclose($fp); $archivosAdjuntar[] = $path; }
        if (in_array('xml', $formatosAgenerar)) { $path = $baseFilename . '.xml'; $xml = new SimpleXMLElement('<formulario/>'); foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); } $xml->asXML($path); $archivosAdjuntar[] = $path; }
        if (in_array('doc', $formatosAgenerar)) { $path = $baseFilename . '.doc'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) { $path = $baseFilename . '.xls'; $xlsContent = "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='UTF-8'></head><body>"; $xlsContent .= "<h3>Datos Principales</h3><table border='1'>"; $xlsContent .= "<tr><th>Campo</th><th>Valor</th></tr>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] !== 'datatable') { $xlsContent .= "<tr><td>" . htmlspecialchars($dato['label']) . "</td><td>" . htmlspecialchars($dato['value']) . "</td></tr>"; } } $xlsContent .= "</table><br/><br/>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] === 'datatable') { $xlsContent .= "<h3>" . htmlspecialchars($dato['label']) . "</h3><table border='1'>"; $tableData = json_decode($dato['value'], true); $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<th>" . htmlspecialchars($col['label']) . "</th>"; } $xlsContent .= "</tr>"; foreach($tableData as $row) { $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $xlsContent .= "</tr>"; } $xlsContent .= "</table><br/>"; } } $xlsContent .= "</body></html>"; file_put_contents($path, $xlsContent); $archivosAdjuntar[] = $path; }
        if (in_array('pdf', $formatosAgenerar)) { try { $path = $baseFilename . '.pdf'; $pdf = new FPDF('P', 'mm', 'A4'); $pdf->AddPage(); $pdf->SetFont('Arial', 'B', 16); $pdf->Cell(0, 10, utf8_decode($params['subject'] ?? 'Datos del Formulario'), 0, 1, 'C'); $pdf->Ln(10); foreach ($datosParaArchivos as $dato) { $pdf->SetFont('Arial', 'B', 12); $pdf->Cell(50, 8, utf8_decode($dato['label'] . ':'), 0, 0); $pdf->SetFont('Arial', '', 12); if ($dato['type'] === 'datatable') { $pdf->Ln(10); $tableData = json_decode($dato['value'], true); $pdf->SetFont('Arial', 'B', 10); foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($col['label']), 1); } $pdf->Ln(); $pdf->SetFont('Arial', '', 10); foreach($tableData as $row) { foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($row[$col['name']] ?? ''), 1); } $pdf->Ln(); } $pdf->Ln(5); } else { $pdf->MultiCell(0, 8, utf8_decode($dato['value'])); $pdf->Ln(2); } } $pdf->Output('F', $path); $archivosAdjuntar[] = $path; } catch (Exception $e) { /* Ignorar error de PDF */ } }
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            $mail = new PHPMailer(true);
            $mail->isSendmail();
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($params['mailDe'] ?? 'noreply@example.com', 'Formulario Web');
            $mail->addAddress($params['destinatario']);
            if (!empty($params['mailCc'])) { $mail->addCC($params['mailCc']); }
            $mail->isHTML(true);
            $mail->Subject = $params['subject'] ?? 'Nuevo Envío de Formulario';
            $mail->Body    = $cuerpoHtml;
            foreach ($archivosAdjuntar as $rutaArchivo) { if (file_exists($rutaArchivo)) { $mail->addAttachment($rutaArchivo); } }
            $mail->send();
        }

        $_SESSION['mensaje_flash'] = "Formulario guardado y procesado con éxito.";
        // Redirigimos a la página limpia, sin el ID, para permitir un nuevo registro.
        header("Location: formulariogenerico.php?archivo=" . urlencode($archivo_json) . "&status=saved");
        exit;

    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>Error al procesar: " . $e->getMessage() . "</div>";
        $valores = $formData; // Si hay error, rellenamos el form con los datos para corregir.
    }
}
// --- PRIORIDAD 2: PROCESAR PETICIONES AJAX PARA CARGAR DATOS ---
// Esta es AHORA la ÚNICA forma de cargar datos en el formulario.
else if (isset($_GET['action']) && $_GET['action'] === 'load_data') {
    header('Content-Type: application/json');
    $formName = $_GET['archivo'] ?? ''; 
    $key = $_GET['key'] ?? '';

    if (empty($formName) || empty($key)) {
        echo json_encode(['error' => 'Faltan parámetros para la carga.']);
        exit;
    }

    $sessionKey = 'form_data_' . $formName . '_' . $key;
    if (isset($_SESSION[$sessionKey])) {
        echo json_encode(['success' => true, 'data' => $_SESSION[$sessionKey]]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

// --- PRIORIDAD 3: LÓGICA PARA MOSTRAR MENSAJES (SI NO ES POST NI AJAX) ---
// Esto se ejecuta en la carga normal de la página.
if (isset($_SESSION['mensaje_flash'])) {
    $mensaje_envio = "<div class='alert alert-success'>" . $_SESSION['mensaje_flash'] . "</div>";
    unset($_SESSION['mensaje_flash']);
}
?>

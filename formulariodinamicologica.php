<?php
// TAMPOCO DEBE HABER NADA ANTES DE ESTA LÍNEA.
session_start();

// --- INICIO: Integración con Librerías ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once 'fpdf/fpdf.php';
require __DIR__ . '/vendor/autoload.php';
// --- FIN: Integración con Librerías ---

require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

// --- FUNCIONES AUXILIARES ---
function obtenerTodosLosCampos($fieldsets) { $campos = []; foreach ($fieldsets as $fieldset) { if (!empty($fieldset['fields'])) { $campos = array_merge($campos, $fieldset['fields']); } if (!empty($fieldset['fieldsets'])) { $campos = array_merge($campos, obtenerTodosLosCampos($fieldset['fieldsets'])); } } return $campos; }
function getFieldInfo($fieldName, $all_fields) { foreach ($all_fields as $field) { if (isset($field['name']) && $field['name'] === $fieldName) { return $field; } } return null; }

// --- INICIO: Endpoint AJAX para recuperar datos ---
if (isset($_GET['action']) && $_GET['action'] === 'load_data') {
    header('Content-Type: application/json');
    $formName = $_GET['form_name'] ?? '';
    $key = $_GET['key'] ?? '';

    if (empty($formName) || empty($key)) {
        echo json_encode(['error' => 'Faltan parámetros.']);
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
// --- FIN: Endpoint AJAX ---

// --- INICIO: Preparación de Variables para la Vista ---
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$json_path = "json/" . basename($archivo_json);
if (!file_exists($json_path)) { die("Error: El archivo de configuración '$json_path' no existe."); }
$json = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) { die("Error: El archivo JSON contiene errores. " . json_last_error_msg()); }

$all_fields = obtenerTodosLosCampos($json['fieldsets'] ?? []);
$valores = [];
$soloLectura = false;
$mensaje_envio = '';

// --- INICIO: LÓGICA DE PROCESAMIENTO DEL FORMULARIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $json['parametros'] ?? [];
    $postData = $_POST; // Datos crudos que llegan del formulario
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    // --- INICIO: RECONSTRUCCIÓN DE DATOS (VERSIÓN FORENSE) ---
    // Esta es la lógica que revisa cada tipo de campo uno por uno.
    $formData = [];
    foreach ($all_fields as $field) {
        $fieldName = $field['name'];

        // Caso 1: Checkboxes de opción múltiple (ej: name="intereses[]")
        if ($field['type'] === 'checkbox' && isset($field['options'])) {
            // Si el POST contiene datos para este campo, es un array. Lo guardamos.
            // Si no, significa que ninguno fue seleccionado, guardamos un array vacío.
            $formData[$fieldName] = isset($postData[$fieldName]) ? (array)$postData[$fieldName] : [];
        }
        // Caso 2: Checkbox único (ej: name="acepta_terminos")
        else if ($field['type'] === 'checkbox' && !isset($field['options'])) {
            // Si está en el POST, se marcó. Guardamos su valor.
            // Si no, no se marcó. Guardamos null.
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : null;
        }
        // Caso 3: Radio buttons
        else if ($field['type'] === 'radio') {
            // Si se seleccionó una opción, guardamos su valor.
            // Si no, guardamos null.
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : null;
        }
        // Caso 4: DataTables
        else if ($field['type'] === 'datatable') {
            // Los datatables siempre llegan como un array si tienen filas.
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : [];
        }
        // Caso 5: Todos los demás campos (text, textarea, time, number, select, etc.)
        else {
            // Si el campo fue enviado, guardamos su valor.
            // Si no (lo cual es raro para estos tipos), guardamos null.
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : null;
        }
    }
    // --- FIN: RECONSTRUCCIÓN DE DATOS ---

    // --- INICIO: LÓGICA DE GUARDADO EN SESIÓN (Revisada) ---
    $firstField = reset($all_fields);
    if ($firstField && array_key_exists($firstField['name'], $formData)) {
        $key = $formData[$firstField['name']];
        
        // La clave de sesión se construye siempre, incluso si la clave de datos está vacía.
        $sessionKey = 'form_data_' . $archivo_json . '_' . $key;

        // Guardamos SIEMPRE el formData reconstruido.
        $_SESSION[$sessionKey] = $formData;
    }
    // --- FIN: LÓGICA DE GUARDADO EN SESIÓN ---
    
    try {
        // --- LÓGICA DE GENERACIÓN DE ARCHIVOS Y CORREO (SIN CAMBIOS) ---
        // Esta parte ya funcionaba bien y usará el $formData corregido.
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $archivosAdjuntar = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1>";
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
            } else {
                $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars($value));
                $valorParaArchivo = is_array($value) ? implode(', ', $value) : $value;
            }
            $datosParaArchivos[] = ['label' => $label, 'value' => $valorParaArchivo, 'type' => $fieldInfo['type'], 'columns' => $fieldInfo['columns'] ?? []];
            $cuerpoHtml .= "<h3>" . htmlspecialchars($label) . "</h3><div>{$displayValue}</div><hr>";
        }
        if (in_array('html', $formatosAgenerar)) { $path = $baseFilename . '.html'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'HTML'; }
        if (in_array('json', $formatosAgenerar)) { $path = $baseFilename . '.json'; file_put_contents($path, json_encode($formData, JSON_PRETTY_PRINT)); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'JSON'; }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { $path = $baseFilename . '.csv'; $fp = fopen($path, 'w'); fputcsv($fp, ['Campo', 'Valor']); foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); } fclose($fp); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'CSV'; }
        if (in_array('xml', $formatosAgenerar)) { $path = $baseFilename . '.xml'; $xml = new SimpleXMLElement('<formulario/>'); foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); } $xml->asXML($path); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'XML'; }
        if (in_array('doc', $formatosAgenerar)) { $path = $baseFilename . '.doc'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'DOC'; }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) { $path = $baseFilename . '.xls'; $xlsContent = "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='UTF-8'></head><body>"; $xlsContent .= "<h3>Datos Principales</h3><table border='1'>"; $xlsContent .= "<tr><th>Campo</th><th>Valor</th></tr>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] !== 'datatable') { $xlsContent .= "<tr><td>" . htmlspecialchars($dato['label']) . "</td><td>" . htmlspecialchars($dato['value']) . "</td></tr>"; } } $xlsContent .= "</table><br/><br/>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] === 'datatable') { $xlsContent .= "<h3>" . htmlspecialchars($dato['label']) . "</h3><table border='1'>"; $tableData = json_decode($dato['value'], true); $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<th>" . htmlspecialchars($col['label']) . "</th>"; } $xlsContent .= "</tr>"; foreach($tableData as $row) { $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $xlsContent .= "</tr>"; } $xlsContent .= "</table><br/>"; } } $xlsContent .= "</body></html>"; file_put_contents($path, $xlsContent); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'XLS'; }
        if (in_array('pdf', $formatosAgenerar)) { try { $path = $baseFilename . '.pdf'; $pdf = new FPDF('P', 'mm', 'A4'); $pdf->AddPage(); $pdf->SetFont('Arial', 'B', 16); $pdf->Cell(0, 10, utf8_decode($params['subject'] ?? 'Datos del Formulario'), 0, 1, 'C'); $pdf->Ln(10); foreach ($datosParaArchivos as $dato) { $pdf->SetFont('Arial', 'B', 12); $pdf->Cell(50, 8, utf8_decode($dato['label'] . ':'), 0, 0); $pdf->SetFont('Arial', '', 12); if ($dato['type'] === 'datatable') { $pdf->Ln(10); $tableData = json_decode($dato['value'], true); $pdf->SetFont('Arial', 'B', 10); foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($col['label']), 1); } $pdf->Ln(); $pdf->SetFont('Arial', '', 10); foreach($tableData as $row) { foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($row[$col['name']] ?? ''), 1); } $pdf->Ln(); } $pdf->Ln(5); } else { $pdf->MultiCell(0, 8, utf8_decode($dato['value'])); $pdf->Ln(2); } } $pdf->Output('F', $path); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'PDF'; } catch (Exception $e) { $formatosGenerados[] = 'PDF (fallido: ' . $e->getMessage() . ')'; } }
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
            $formatosGenerados[] = 'Correo (htmlc) con ' . count($archivosAdjuntar) . ' adjuntos';
        }
        // --- FIN: LÓGICA DE GENERACIÓN DE ARCHIVOS Y CORREO ---

        $_SESSION['mensaje_flash'] = "Formulario guardado y procesado con éxito.";
        
        // --- INICIO: LÍNEA DE DEPURACIÓN TEMPORAL ---
        // Descomenta la siguiente línea para ver qué se guarda exactamente.
        // die('<pre>Datos guardados en sesión: ' . print_r($formData, true) . '</pre>');
        // --- FIN: LÍNEA DE DEPURACIÓN TEMPORAL ---

        header("Location: formulariodinamico.php?archivo=" . urlencode($archivo_json) . "&status=saved");
        exit;

    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>Error al procesar: " . $e->getMessage() . "</div>";
        $valores = $formData; // Mantenemos los datos para que el usuario corrija
    }
}

// --- Lógica para mostrar mensajes flash después de la redirección ---
if (isset($_SESSION['mensaje_flash'])) {
    $mensaje_envio = "<div class='alert alert-success'>" . $_SESSION['mensaje_flash'] . "</div>";
    unset($_SESSION['mensaje_flash']);
}
?>
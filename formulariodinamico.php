<?php
// --- INICIO: Integración con PHPMailer ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Si usas Composer, esta es la línea. Si no, ajusta la ruta a tu archivo.
require 'vendor/autoload.php'; 
// require 'lib/PHPMailer/src/Exception.php';
// require 'lib/PHPMailer/src/PHPMailer.php';
// require 'lib/PHPMailer/src/SMTP.php';
// --- FIN: Integración con PHPMailer ---

require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

// --- FUNCIONES AUXILIARES (sin cambios) ---
function obtenerTodosLosCampos($fieldsets) { $campos = []; foreach ($fieldsets as $fieldset) { if (!empty($fieldset['fields'])) { $campos = array_merge($campos, $fieldset['fields']); } if (!empty($fieldset['fieldsets'])) { $campos = array_merge($campos, obtenerTodosLosCampos($fieldset['fieldsets'])); } } return $campos; }
function getFieldInfo($fieldName, $all_fields) { foreach ($all_fields as $field) { if (isset($field['name']) && $field['name'] === $fieldName) { return $field; } } return null; }

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$json_path = "json/" . basename($archivo_json);
if (!file_exists($json_path)) { die("Error: El archivo de configuración '$json_path' no existe."); }
$json = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) { die("Error: El archivo JSON contiene errores. " . json_last_error_msg()); }

$all_fields = obtenerTodosLosCampos($json['fieldsets'] ?? []);
$valores = [];
$soloLectura = false;
$mensaje_envio = '';

// Lógica para cargar datos existentes (sin cambios)
if (!empty($_GET['id']) && isset($json['tabla_principal'])) {
    $conn = conexionBd();
    $tabla = $json['tabla_principal'];
    $id_campo = $json['id_campo'] ?? 'id';
    $id = $conn->real_escape_string($_GET['id']);
    $sql = "SELECT * FROM `$tabla` WHERE `$id_campo` = '$id'";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        $valores = $result->fetch_assoc();
    }
    foreach ($all_fields as $field) {
        if ($field['type'] === 'datatable' && isset($field['tabla_detalle'])) {
            $tabla_detalle = $field['tabla_detalle'];
            $fk_campo = $field['fk_campo'] ?? $id_campo;
            $sql_detalle = "SELECT * FROM `$tabla_detalle` WHERE `$fk_campo` = '$id'";
            $result_detalle = $conn->query($sql_detalle);
            if ($result_detalle) {
                $valores[$field['name']] = $result_detalle->fetch_all(MYSQLI_ASSOC);
            }
        }
    }
    $conn->close();
}

// --- INICIO: LÓGICA DE PROCESAMIENTO DEL FORMULARIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $json['parametros'] ?? [];
    $formData = $_POST;
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    try {
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $formatosGenerados = [];
        $archivosAdjuntar = []; // Array para guardar las rutas de los archivos a adjuntar
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        
        // Preparar contenido HTML (sin cambios)
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1>";
        // ... (el bucle que genera el $cuerpoHtml es el mismo de la versión anterior) ...
        foreach ($formData as $key => $value) {
            $fieldInfo = getFieldInfo($key, $all_fields);
            if (!$fieldInfo) continue;
            $label = $fieldInfo['label'] ?? ucfirst($key);
            $displayValue = '';
            if ($fieldInfo['type'] === 'datatable' && is_array($value)) {
                $displayValue .= "<table border='1' cellpadding='5' style='width:100%; border-collapse:collapse; margin-top:5px;'><thead><tr>";
                foreach($fieldInfo['columns'] as $col) { $displayValue .= "<th>" . htmlspecialchars($col['label']) . "</th>"; }
                $displayValue .= "</tr></thead><tbody>";
                foreach($value as $row) { $displayValue .= "<tr>"; foreach($fieldInfo['columns'] as $col) { $displayValue .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $displayValue .= "</tr>"; }
                $displayValue .= "</tbody></table>";
            } else {
                $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars($value));
            }
            $cuerpoHtml .= "<h3>" . htmlspecialchars($label) . "</h3><div>{$displayValue}</div><hr>";
        }

        // --- PASO 1: GENERAR TODOS LOS ARCHIVOS PRIMERO ---
        if (in_array('html', $formatosAgenerar)) { $path = $baseFilename . '.html'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'HTML'; }
        if (in_array('json', $formatosAgenerar)) { $path = $baseFilename . '.json'; file_put_contents($path, json_encode($formData, JSON_PRETTY_PRINT)); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'JSON'; }
        if (in_array('pdf', $formatosAgenerar)) { $path = $baseFilename . '.pdf.txt'; file_put_contents($path, "Simulación de PDF..."); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'PDF (simulado)'; }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) { $path = $baseFilename . '.xlsx.txt'; file_put_contents($path, "Simulación de Excel con los datos:\n\n" . print_r($datosParaArchivos, true)); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'XLSX (simulado)'; }
        if (in_array('doc', $formatosAgenerar)) { $path = $baseFilename . '.doc.txt'; file_put_contents($path, "Simulación de DOC con los datos:\n\n" . print_r($datosParaArchivos, true)); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'DOC (simulado)'; }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { $fp = fopen($baseFilename . '.csv', 'w'); fputcsv($fp, ['Campo', 'Valor']); foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); } fclose($fp); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'CSV'; }
        if (in_array('xml', $formatosAgenerar)) { $xml = new SimpleXMLElement('<formulario/>'); foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); } $xml->asXML($baseFilename . '.xml'); $archivosAdjuntar[] = $path; $formatosGenerados[] = 'XML'; }

        // --- PASO 2: SI SE PIDE CORREO, ENVIARLO CON LOS ADJUNTOS ---
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            $mail = new PHPMailer(true);
            
            // Configuración del servidor (ejemplo simple, puedes usar SMTP)
            $mail->isSendmail();
            $mail->CharSet = 'UTF-8';

            // Destinatarios
            $mail->setFrom($params['mailDe'] ?? 'noreply@example.com', 'Formulario Web');
            $mail->addAddress($params['destinatario']);
            if (!empty($params['mailCc'])) { $mail->addCC($params['mailCc']); }

            // Contenido
            $mail->isHTML(true);
            $mail->Subject = $params['subject'] ?? 'Nuevo Envío de Formulario';
            $mail->Body    = $cuerpoHtml;
            $mail->AltBody = 'Para ver este mensaje, por favor use un cliente de correo compatible con HTML.';

            // Adjuntar los archivos generados
            foreach ($archivosAdjuntar as $rutaArchivo) {
                if (file_exists($rutaArchivo)) {
                    $mail->addAttachment($rutaArchivo);
                }
            }

            $mail->send();
            $formatosGenerados[] = 'Correo (htmlc) con ' . count($archivosAdjuntar) . ' adjuntos';
        }

        $mensaje_envio = "<div class='alert alert-success'>Formulario procesado. Formatos generados: " . implode(', ', $formatosGenerados) . "</div>";
        if ($params['limpiar'] ?? false) { $valores = []; }

    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>No se pudo enviar el mensaje. Error de PHPMailer: {$mail->ErrorInfo}</div>";
    }
}
// --- FIN: LÓGICA DE PROCESAMIENTO ---
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Dinámico</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/formulariodinamo.css">
</head>
<body>
<div class="container mt-4">
    <h2>Formulario: <?php echo htmlspecialchars($archivo_json); ?></h2>
    <form id="formulario" method="post" action="" enctype="multipart/form-data">
        <?php if (!empty($mensaje_envio)) { echo "<div id='mensaje-envio'>{$mensaje_envio}</div>"; } ?>
        <?php echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); ?>
        <button type="submit" class="btn btn-success mt-3">Guardar</button>
    </form>
</div>
<script>window.fields = <?php echo json_encode($all_fields); ?>;</script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="js/formulariodinamico.js"></script>
</body>
</html>
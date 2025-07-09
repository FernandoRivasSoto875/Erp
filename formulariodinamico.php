<?php
session_start(); // INICIAR SESIÓN PARA GUARDAR Y RECUPERAR DATOS

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

// --- INICIO: Integración con Librerías ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once 'fpdf/fpdf.php'; // Asegúrate de que esta ruta sea correcta
require __DIR__ . '/vendor/autoload.php'; // Para PHPMailer
// --- FIN: Integración con Librerías ---

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
$valores = []; // Se asegura que el formulario siempre cargue vacío
$soloLectura = false;
$mensaje_envio = '';

// --- INICIO: LÓGICA DE PROCESAMIENTO DEL FORMULARIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $json['parametros'] ?? [];
    $formData = $_POST;
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    // --- INICIO: Guardar datos en la sesión ---
    $firstField = reset($all_fields);
    if ($firstField && isset($formData[$firstField['name']])) {
        $key = $formData[$firstField['name']];
        if (!empty($key)) {
            $sessionKey = 'form_data_' . $archivo_json . '_' . $key;
            $_SESSION[$sessionKey] = $formData;
        }
    }
    // --- FIN: Guardar datos en la sesión ---

    try {
        // --- INICIO: LÓGICA DE GENERACIÓN DE ARCHIVOS Y CORREO (SIN CAMBIOS) ---
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $formatosGenerados = [];
        $archivosAdjuntar = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        $datosParaArchivos = [];
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

        $mensaje_envio = "<div class='alert alert-success'>Formulario procesado. Formatos generados: " . implode(', ', $formatosGenerados) . "</div>";
        if ($params['limpiar'] ?? false) { 
            $valores = []; // Esta variable se usa para la recarga de la página
        }

    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>Error: " . $e->getMessage() . "</div>";
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

<!-- INICIO: SCRIPT PARA RECUPERACIÓN DE DATOS (VERSIÓN FINAL Y CORREGIDA) -->
<script>
function fillForm(data) {
    // Limpia el formulario y las tablas antes de rellenar
    document.getElementById('formulario').reset();
    document.querySelectorAll('[data-datatable-name] tbody').forEach(tbody => {
        tbody.innerHTML = '';
    });

    for (const fieldName in data) {
        const value = data[fieldName];
        const fieldInfo = window.fields.find(f => f.name === fieldName);

        if (fieldInfo && fieldInfo.type === 'datatable' && Array.isArray(value)) {
            const tableBody = document.querySelector(`[data-datatable-name="${fieldName}"] tbody`);
            if (!tableBody) continue;

            value.forEach((rowData, rowIndex) => {
                const newRow = tableBody.insertRow();
                fieldInfo.columns.forEach(col => {
                    const cell = newRow.insertCell();
                    const input = document.createElement('input');
                    input.type = col.type || 'text';
                    input.name = `${fieldName}[${rowIndex}][${col.name}]`;
                    input.className = 'form-control';
                    input.value = rowData[col.name] || '';
                    cell.appendChild(input);
                });
                // Añadir botón de eliminar si es necesario
                const actionCell = newRow.insertCell();
                actionCell.innerHTML = `<button type="button" class="eliminar_fila btn btn-danger btn-sm">Eliminar</button>`;
            });
        } else {
            const elements = document.querySelectorAll(`[name="${fieldName}"]`);
            elements.forEach(element => {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = Array.isArray(value) ? value.includes(element.value) : value === element.value;
                } else {
                    element.value = value;
                }
            });
        }
    }
    // Disparar un evento para que la lógica de cálculo en formulariodinamico.js se ejecute
    document.getElementById('formulario').dispatchEvent(new Event('input', { bubbles: true }));
}

function clearForm(formElement, firstFieldElement) {
    const key = firstFieldElement.value;
    formElement.reset();
    firstFieldElement.value = key; // Restaurar la clave que el usuario escribió
    document.querySelectorAll('[data-datatable-name] tbody').forEach(tbody => {
        tbody.innerHTML = '';
    });
    // Disparar un evento para que los totales se recalculen a cero
    formElement.dispatchEvent(new Event('input', { bubbles: true }));
}

document.addEventListener('DOMContentLoaded', function () {
    const allFields = window.fields || [];
    if (allFields.length === 0) return;

    const formElement = document.getElementById('formulario');
    const firstField = allFields[0];
    const firstFieldElement = document.querySelector(`[name="${firstField.name}"]`);
    const formName = '<?php echo $archivo_json; ?>';

    if (!formElement || !firstFieldElement) return;

    firstFieldElement.addEventListener('blur', function () {
        const key = this.value.trim();
        if (key === '') {
            // Si el usuario borra la clave, limpiar todo
            formElement.reset();
            document.querySelectorAll('[data-datatable-name] tbody').forEach(tbody => {
                tbody.innerHTML = '';
            });
            formElement.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        fetch(`?action=load_data&form_name=${encodeURIComponent(formName)}&key=${encodeURIComponent(key)}`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    fillForm(result.data);
                    // alert('Se han cargado los datos guardados anteriormente para "' + key + '".');
                } else {
                    // Si no se encuentran datos, limpiar el resto del formulario
                    clearForm(formElement, firstFieldElement);
                }
            })
            .catch(error => {
                console.error('Error al recuperar datos:', error);
                clearForm(formElement, firstFieldElement);
            });
    });
});
</script>
<!-- FIN: SCRIPT PARA RECUPERACIÓN DE DATOS -->
</body>
</html>
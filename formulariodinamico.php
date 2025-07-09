<?php
require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

// --- FUNCIONES AUXILIARES ---
function obtenerTodosLosCampos($fieldsets) {
    $campos = [];
    foreach ($fieldsets as $fieldset) {
        if (!empty($fieldset['fields'])) {
            $campos = array_merge($campos, $fieldset['fields']);
        }
        if (!empty($fieldset['fieldsets'])) {
            $campos = array_merge($campos, obtenerTodosLosCampos($fieldset['fieldsets']));
        }
    }
    return $campos;
}

function getFieldInfo($fieldName, $all_fields) {
    foreach ($all_fields as $field) {
        if (isset($field['name']) && $field['name'] === $fieldName) {
            return $field;
        }
    }
    return null;
}
// --- FIN FUNCIONES AUXILIARES ---

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$json_path = "json/" . basename($archivo_json);

if (!file_exists($json_path)) {
    die("Error: El archivo de configuración del formulario '$json_path' no existe.");
}

$json_content = file_get_contents($json_path);
$json = json_decode($json_content, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error: El archivo JSON contiene errores de sintaxis. " . json_last_error_msg());
}

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
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        
        $datosParaArchivos = [];
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1>";

        // --- BUCLE DE PROCESAMIENTO CORREGIDO ---
        foreach ($formData as $key => $value) {
            $fieldInfo = getFieldInfo($key, $all_fields);
            if (!$fieldInfo) continue; // Ignorar campos no definidos en el JSON

            $label = $fieldInfo['label'] ?? ucfirst($key);
            $displayValue = '';

            // Manejo especial para DataTables
            if ($fieldInfo['type'] === 'datatable' && is_array($value)) {
                $displayValue .= "<table border='1' cellpadding='5' style='width:100%; border-collapse:collapse; margin-top:5px;'><thead><tr>";
                foreach($fieldInfo['columns'] as $col) {
                    $displayValue .= "<th>" . htmlspecialchars($col['label']) . "</th>";
                }
                $displayValue .= "</tr></thead><tbody>";
                foreach($value as $row) {
                    $displayValue .= "<tr>";
                    foreach($fieldInfo['columns'] as $col) {
                        $displayValue .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>";
                    }
                    $displayValue .= "</tr>";
                }
                $displayValue .= "</tbody></table>";
                $datosParaArchivos[] = ['label' => $label, 'value' => json_encode($value)]; // Guardar como JSON para otros formatos
            } 
            // Manejo para campos normales y checkboxes
            else {
                $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars($value));
                $datosParaArchivos[] = ['label' => $label, 'value' => is_array($value) ? implode(', ', $value) : $value];
            }
            
            $cuerpoHtml .= "<h3>" . htmlspecialchars($label) . "</h3><div>{$displayValue}</div><hr>";
        }
        // --- FIN DEL BUCLE CORREGIDO ---

        // Generación de formatos (sin cambios en esta parte)
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: <" . ($params['mailDe'] ?? 'noreply@example.com') . ">\r\n";
            mail($params['destinatario'], $params['subject'], $cuerpoHtml, $headers);
            $formatosGenerados[] = 'Correo (htmlc)';
        }
        if (in_array('html', $formatosAgenerar)) { file_put_contents($baseFilename . '.html', $cuerpoHtml); $formatosGenerados[] = 'HTML'; }
        if (in_array('json', $formatosAgenerar)) { file_put_contents($baseFilename . '.json', json_encode($formData, JSON_PRETTY_PRINT)); $formatosGenerados[] = 'JSON'; }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { $fp = fopen($baseFilename . '.csv', 'w'); fputcsv($fp, ['Campo', 'Valor']); foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); } fclose($fp); $formatosGenerados[] = 'CSV'; }
        if (in_array('xml', $formatosAgenerar)) { $xml = new SimpleXMLElement('<formulario/>'); foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); } $xml->asXML($baseFilename . '.xml'); $formatosGenerados[] = 'XML'; }
        if (in_array('pdf', $formatosAgenerar)) { file_put_contents($baseFilename . '.pdf.txt', "Simulación de PDF con los datos:\n\n" . print_r($datosParaArchivos, true)); $formatosGenerados[] = 'PDF (simulado)'; }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) { file_put_contents($baseFilename . '.xlsx.txt', "Simulación de Excel con los datos:\n\n" . print_r($datosParaArchivos, true)); $formatosGenerados[] = 'XLSX (simulado)'; }
        if (in_array('doc', $formatosAgenerar)) { file_put_contents($baseFilename . '.doc.txt', "Simulación de DOC con los datos:\n\n" . print_r($datosParaArchivos, true)); $formatosGenerados[] = 'DOC (simulado)'; }


        $mensaje_envio = "<div class='alert alert-success'>Formulario procesado con éxito. Formatos generados: " . implode(', ', $formatosGenerados) . "</div>";
        
        if ($params['limpiar'] ?? false) {
            $valores = [];
        }

    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>Error al procesar: " . $e->getMessage() . "</div>";
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
        <?php 
        if (!empty($mensaje_envio)) {
            echo "<div id='mensaje-envio'>{$mensaje_envio}</div>";
        }
        ?>
        <?php echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); ?>
        <button type="submit" class="btn btn-success mt-3">Guardar</button>
    </form>
</div>

<?php
echo "<script>window.fields = " . json_encode($all_fields) . ";</script>";
?>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="js/formulariodinamico.js"></script>
</body>
</html>
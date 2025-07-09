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

function getFieldLabel($fieldName, $fieldsets) {
    foreach ($fieldsets as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                if (isset($field['name']) && $field['name'] === $fieldName) {
                    return $field['label'] ?? ucfirst($fieldName);
                }
            }
        }
    }
    return ucfirst($fieldName);
}
// --- FIN FUNCIONES AUXILIARES ---

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json'; // Usar un default seguro
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
$mensaje_envio = ''; // Variable para mensajes

// Lógica para cargar datos existentes si se provee un ID
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
    $fieldsets = $json['fieldsets'] ?? [];
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    try {
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $formatosGenerados = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');

        // Preparar contenido común
        $datosParaArchivos = [];
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1><table border='1' cellpadding='5' cellspacing='0' style='border-collapse:collapse; width:100%;'>";
        foreach ($formData as $key => $value) {
            $label = getFieldLabel($key, $fieldsets);
            $displayValue = is_array($value) ? implode(', ', $value) : nl2br(htmlspecialchars($value));
            $datosParaArchivos[] = ['label' => $label, 'value' => is_array($value) ? implode(', ', $value) : $value];
            $cuerpoHtml .= "<tr><td style='width:30%;'><strong>" . htmlspecialchars($label) . "</strong></td><td>{$displayValue}</td></tr>";
        }
        $cuerpoHtml .= "</table><hr><p>" . htmlspecialchars($params['pie'] ?? '') . "</p>";

        // Generar Formatos
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: <" . ($params['mailDe'] ?? 'noreply@example.com') . ">\r\n";
            mail($params['destinatario'], $params['subject'], $cuerpoHtml, $headers);
            $formatosGenerados[] = 'Correo (htmlc)';
        }
        if (in_array('html', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.html', $cuerpoHtml);
            $formatosGenerados[] = 'HTML';
        }
        if (in_array('json', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.json', json_encode($formData, JSON_PRETTY_PRINT));
            $formatosGenerados[] = 'JSON';
        }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) {
            $fp = fopen($baseFilename . '.csv', 'w');
            fputcsv($fp, ['Campo', 'Valor']);
            foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); }
            fclose($fp);
            $formatosGenerados[] = 'CSV';
        }
        if (in_array('xml', $formatosAgenerar)) {
            $xml = new SimpleXMLElement('<formulario/>');
            foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); }
            $xml->asXML($baseFilename . '.xml');
            $formatosGenerados[] = 'XML';
        }
        // Simuladores para formatos complejos (requieren librerías externas)
        if (in_array('pdf', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.pdf.txt', "Simulación de PDF con los datos:\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'PDF (simulado)';
        }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.xlsx.txt', "Simulación de Excel con los datos:\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'XLSX (simulado)';
        }
        if (in_array('doc', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.doc.txt', "Simulación de DOC con los datos:\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'DOC (simulado)';
        }

        $mensaje_envio = "<div class='alert alert-success'>Formulario procesado con éxito. Formatos generados: " . implode(', ', $formatosGenerados) . "</div>";
        
        // Si se debe limpiar el formulario, reseteamos los valores
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
        // Muestra el mensaje de éxito/error aquí, dentro del formulario
        if (!empty($mensaje_envio)) {
            echo "<div id='mensaje-envio'>{$mensaje_envio}</div>";
        }
        ?>
        <?php echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); ?>
        <button type="submit" class="btn btn-success mt-3">Guardar</button>
    </form>
</div>

<?php
// Expone la definición de los campos a JavaScript para la creación de filas en el datatable
echo "<script>window.fields = " . json_encode($all_fields) . ";</script>";
?>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="js/formulariodinamico.js"></script>
</body>
</html>
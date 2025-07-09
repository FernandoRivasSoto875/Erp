<?php

require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

/**
 * Función auxiliar para obtener todos los campos recursivamente.
 * Se define aquí al principio para evitar errores fatales.
 */
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

$archivo_json = $_GET['archivo'] ?? 'default.json';
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

// Lógica para procesar el envío del formulario (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Aquí va tu lógica de guardado.
    echo "<div id='mensaje-envio' class='alert alert-success'>Formulario procesado (simulación).</div>";
}
?>

<form id="formulario" method="post" action="" enctype="multipart/form-data" data-archivo="<?php echo htmlspecialchars($archivo_json); ?>">
    <div id="mensaje-envio"></div>
    <?php echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); ?>
    <button type="submit" class="btn btn-success">Guardar</button>
</form>

<?php
echo "<script>window.fields = " . json_encode($all_fields) . ";</script>";
?>
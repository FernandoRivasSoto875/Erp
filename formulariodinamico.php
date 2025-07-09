<?php
// ... (tus ini_set y error_reporting si los tienes aquí) ...

require_once 'formulariodinamico.funciones.php';
require_once 'funcionessql.php';

$archivo_json = $_GET['archivo'] ?? 'default.json';
$json_path = "json/" . basename($archivo_json);

if (!file_exists($json_path)) {
    die("Error: El archivo de configuración del formulario no existe.");
}

$json_content = file_get_contents($json_path);
$json = json_decode($json_content, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error: El archivo JSON contiene errores de sintaxis.");
}

$all_fields = obtenerTodosLosCampos($json['fieldsets'] ?? []);
$valores = [];
$soloLectura = false;

// --- LÓGICA DE CARGA DE DATOS RESTAURADA ---
if (!empty($_GET['id']) && isset($json['tabla_principal'])) {
    $conn = conexionBd();
    $tabla = $json['tabla_principal'];
    $id_campo = $json['id_campo'] ?? 'id';
    $id = $conn->real_escape_string($_GET['id']);

    // Cargar datos del registro principal
    $sql = "SELECT * FROM `$tabla` WHERE `$id_campo` = '$id'";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        $valores = $result->fetch_assoc();
    }

    // Cargar datos de los datatables asociados
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

// --- LÓGICA DE PROCESAMIENTO DE ENVÍO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // (Aquí iría tu lógica para guardar los datos, usando la función prepararValoresGuardados)
    // Por ahora, solo mostramos un mensaje.
    echo "<div id='mensaje-envio' class='alert alert-success'>Formulario procesado (simulación).</div>";
}

// Función auxiliar para obtener todos los campos recursivamente
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
?>

<form id="formulario" method="post" action="" enctype="multipart/form-data" data-archivo="<?php echo htmlspecialchars($archivo_json); ?>">
    <div id="mensaje-envio"></div>
    <?php echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); ?>
    <button type="submit" class="btn btn-primary">Guardar</button>
</form>

<script>
document.getElementById('formulario').addEventListener('submit', function(event) {
    event.preventDefault();
    // Aquí iría tu lógica de JavaScript para manejar el envío del formulario
    document.getElementById('mensaje-envio').innerHTML = 'Enviando...';
    this.submit();
});
</script>

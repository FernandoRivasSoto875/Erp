<?php
// Activar la captura de errores y loguearlos en error_log
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('display_errors', 0);
ini_set('error_log', __DIR__ . "/error_log.txt"); // Archivo donde se guardarán los errores
header('Content-Type: application/json');

// Incluir el archivo con las funciones de conexión
include 'funcionessql.php';

// Conectar a la base de datos
$conn = conexionBd();

if (!$conn || $conn->connect_error) {
    error_log("Error de conexión: " . ($conn ? $conn->connect_error : "Función conexionBd() devolvió falso."));
    echo json_encode(["error" => "Error interno del servidor."]);
    exit;
}


// Obtener la tabla desde GET y limpiar entrada
$table_name = $conn->real_escape_string($_GET['table_name'] ?? '');

if (!$table_name) {
    error_log("Error: No se proporcionó el parámetro 'table_name'.");
    echo json_encode(["error" => "Parámetro no válido."]);
    exit;
}

// Verificar si la tabla existe usando `query()`
$table_check_query = "SHOW TABLES LIKE '$table_name'";
$table_check_result = $conn->query($table_check_query);

if (!$table_check_result || $table_check_result->num_rows == 0) {
    error_log("Error: La tabla '$table_name' no existe.");
    echo json_encode(["error" => "Tabla no encontrada."]);
    exit;
}

// Obtener nombres de columnas dinámicamente
$columns_query = "SHOW COLUMNS FROM $table_name";
$columns_result = $conn->query($columns_query);

if (!$columns_result) {
    error_log("Error al obtener columnas: " . $conn->error);
    echo json_encode(["error" => "Error en el servidor."]);
    exit;
}

$columns = [];
while ($row = $columns_result->fetch_assoc()) {
    $columns[] = $row['Field'];
}

// Obtener datos de la tabla
$data_query = "SELECT * FROM $table_name";
$data_result = $conn->query($data_query);

if (!$data_result) {
    error_log("Error al obtener datos de la tabla '$table_name': " . $conn->error);
    echo json_encode(["error" => "Error en la consulta de datos."]);
    exit;
}

$data = [];
while ($row = $data_result->fetch_assoc()) {
    $data[] = $row;
}

// Verificar si la tabla está vacía
if (empty($data)) {
    error_log("Aviso: La tabla '$table_name' no tiene registros.");
    echo json_encode(["error" => "No hay registros disponibles."]);
    exit;
}

// Enviar datos en formato JSON  // Actualizar   
$response = [
    "columns" => $columns,
    "data" => $data
];

echo json_encode($response);
$conn->close();
?>

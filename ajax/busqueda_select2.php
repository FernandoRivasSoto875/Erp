<?php
header('Content-Type: application/json');
error_reporting(0); // Desactivar reportes de errores para no corromper el JSON

// Incluir archivos de configuración y funciones
require_once '../config/conexion.php';
require_once '../funcionessql.php';

// Parámetros de la solicitud
$tabla = isset($_GET['tabla']) ? $_GET['tabla'] : '';
$campo = isset($_GET['campo']) ? $_GET['campo'] : '';
$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : '1=1';
$searchTerm = isset($_GET['q']) ? $_GET['q'] : '';

if (empty($tabla) || empty($campo)) {
    echo json_encode(['results' => [['id' => '', 'text' => 'Error: Parámetros incompletos']]] );
    exit;
}

// Conexión a la base de datos
$conn = newConexion();
if ($conn->connect_error) {
    echo json_encode(['results' => [['id' => '', 'text' => 'Error: Falla de conexión a BD']]] );
    exit;
}
$conn->set_charset("utf8");


// Construir la consulta
// Se asume que el campo de búsqueda es el mismo que el campo de descripción
$filtroAdicional = "";
if (!empty($searchTerm)) {
    // Usar parámetros preparados para prevenir inyección SQL
    $filtroAdicional = " AND " . $campo . " LIKE ?";
}

// La consulta debe devolver 'id' y 'text' para Select2
$sql = "SELECT DISTINCT " . $campo . " as id, " . $campo . " as text FROM " . $tabla . " WHERE " . $filtro . $filtroAdicional . " ORDER BY " . $campo . " ASC LIMIT 50";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    echo json_encode(['results' => [['id' => '', 'text' => 'Error en la preparación de la consulta']]] );
    exit;
}

if (!empty($searchTerm)) {
    $searchTermLike = '%' . $searchTerm . '%';
    $stmt->bind_param("s", $searchTermLike);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
} else {
     echo json_encode(['results' => [['id' => '', 'text' => 'Error en la ejecución de la consulta']]] );
    exit;
}

$stmt->close();
$conn->close();

// Select2 espera un array de objetos directamente
echo json_encode($data);
?>

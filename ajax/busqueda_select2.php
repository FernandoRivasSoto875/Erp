<?php
// DIAGNOSTICO: Habilitar todos los errores y quitar la cabecera JSON
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// header('Content-Type: application/json');

echo "<pre>"; // Para facilitar la lectura

// Incluir archivos de configuración y funciones
require_once '../config/conexion.php';
require_once '../funcionessql.php';

// Parámetros de la solicitud
$tabla = isset($_GET['tabla']) ? $_GET['tabla'] : '';
$campo = isset($_GET['campo']) ? $_GET['campo'] : '';
$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : '1=1';
$searchTerm = isset($_GET['q']) ? $_GET['q'] : '';

echo "--- PARÁMETROS RECIBIDOS ---\n";
var_dump(['tabla' => $tabla, 'campo' => $campo, 'filtro' => $filtro, 'searchTerm' => $searchTerm]);

if (empty($tabla) || empty($campo)) {
    die("Error: Parámetros 'tabla' o 'campo' incompletos.");
}

// Conexión a la base de datos
echo "\n--- INTENTANDO CONEXIÓN A BD ---\n";
$conn = newConexion();
if ($conn->connect_error) {
    die("Error de conexión a BD: " . $conn->connect_error);
}
echo "Conexión exitosa.\n";
$conn->set_charset("utf8");


// Construir la consulta
$filtroAdicional = "";
// La consulta debe devolver 'id' y 'text' para Select2
$sql = "SELECT DISTINCT " . $campo . " as id, " . $campo . " as text FROM " . $tabla . " WHERE " . $filtro . $filtroAdicional . " ORDER BY " . $campo . " ASC LIMIT 50";

echo "\n--- CONSULTA SQL ---\n";
var_dump($sql);

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    die("Error en la preparación de la consulta: " . $conn->error);
}
echo "Preparación de consulta exitosa.\n";

$stmt->execute();
echo "Ejecución de consulta exitosa.\n";

$result = $stmt->get_result();

$data = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
} else {
    die("Error en la ejecución o obtención de resultados: " . $stmt->error);
}

echo "\n--- DATOS OBTENIDOS (" . count($data) . " filas) ---\n";
var_dump($data);

$stmt->close();
$conn->close();
echo "\n--- CONEXIÓN CERRADA ---\n";

echo "</pre>";

// echo json_encode($data); // Desactivado para diagnóstico

?>

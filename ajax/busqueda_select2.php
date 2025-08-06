<?php
header('Content-Type: application/json');

// Incluir el archivo de funciones que contiene la conexión correcta.
// Usamos __DIR__ para asegurar que la ruta sea siempre correcta.
require_once __DIR__ . '/../funcionessql.php';

// Parámetros de la solicitud de Select2
$tabla = isset($_GET['tabla']) ? $_GET['tabla'] : '';
$campo = isset($_GET['campo']) ? $_GET['campo'] : '';
$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : '1=1';
$searchTerm = isset($_GET['q']) ? $_GET['q'] : '';

// Validar parámetros esenciales
if (empty($tabla) || empty($campo)) {
    echo json_encode(['results' => [['id' => '', 'text' => 'Error: Parámetros incompletos']]] );
    exit;
}

// Usar la función de conexión correcta de funcionessql.php
$conn = conexionBd();
if ($conn === null) {
    echo json_encode(['results' => [['id' => '', 'text' => 'Error: Falla de conexión a BD']]] );
    exit;
}

// Construir la consulta de forma segura
$filtroAdicional = "";
if (!empty($searchTerm)) {
    // Usar parámetros preparados para prevenir inyección SQL
    $filtroAdicional = " AND LOWER(" . $conn->real_escape_string($campo) . ") LIKE LOWER(?)";
}

// La consulta debe devolver 'id' y 'text' para Select2
// Se usa real_escape_string para una capa extra de seguridad en los nombres de tabla/campo
$sql = "SELECT DISTINCT " . $conn->real_escape_string($campo) . " as id, " . $conn->real_escape_string($campo) . " as text 
        FROM " . $conn->real_escape_string($tabla) . " 
        WHERE " . $filtro . $filtroAdicional . " 
        ORDER BY " . $conn->real_escape_string($campo) . " ASC 
        LIMIT 50";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    // En un entorno real, sería mejor registrar este error en un log
    echo json_encode(['results' => [['id' => '', 'text' => 'Error en la preparación de la consulta']]] );
    exit;
}

// Si hay un término de búsqueda, vincular el parámetro
if (!empty($searchTerm)) {
    $searchTermLike = '%' . $searchTerm . '%';
    $stmt->bind_param("s", $searchTermLike);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Asegurarnos de que los datos están en el formato {id: "valor", text: "valor"}
        $data[] = ['id' => $row['id'], 'text' => $row['text']];
    }
}

$stmt->close();
// No cerramos la conexión aquí si es estática y se reutiliza en otros lados.

// Select2 espera un objeto con una clave 'results' que contiene el array de datos
echo json_encode(['results' => $data]);
?>

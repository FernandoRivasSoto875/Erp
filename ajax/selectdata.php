<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../funcionessql.php';

$tabla = isset($_GET['tabla']) ? $_GET['tabla'] : '';
$campo_valor = isset($_GET['campo_valor']) ? $_GET['campo_valor'] : '';
$campo_etiqueta = isset($_GET['campo_etiqueta']) ? $_GET['campo_etiqueta'] : '';
$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : '1=1';
$order = isset($_GET['order']) ? $_GET['order'] : '';

if (empty($tabla) || empty($campo_valor) || empty($campo_etiqueta)) {
    echo json_encode([]);
    exit;
}

$conn = conexionBd();
if ($conn === null) {
    echo json_encode([]);
    exit;
}

// Construir la consulta
$sql = "SELECT DISTINCT " . $conn->real_escape_string($campo_valor) . " as value, " . $conn->real_escape_string($campo_etiqueta) . " as label 
        FROM " . $conn->real_escape_string($tabla) . " 
        WHERE $filtro";
if ($order) $sql .= " ORDER BY " . $conn->real_escape_string($order);
$sql .= " LIMIT 100";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode([]);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = ['value' => $row['value'], 'label' => $row['label']];
    }
}

$stmt->close();

echo json_encode($data);
?>
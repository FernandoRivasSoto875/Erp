<?php
header('Content-Type: application/json');

// Usar la función de conexión correcta
require_once __DIR__ . '/../funcionessql.php';
$conn = conexionBd();
if ($conn === null) {
    echo json_encode([]);
    exit;
}

$tabla = $_GET['tabla'] ?? '';
$campo_valor = $_GET['campo_valor'] ?? 'id';
$campo_etiqueta = $_GET['campo_etiqueta'] ?? 'nombre';
$filtro = $_GET['filtro'] ?? '1=1';
$order = $_GET['order'] ?? '';

// Validación básica de nombres
if(!preg_match('/^[a-zA-Z0-9_]+$/', $tabla)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_valor)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_etiqueta)) die(json_encode([]));
if($order && !preg_match('/^[a-zA-Z0-9_ ]+(ASC|DESC)?$/i', $order)) $order = '';

// Construir la consulta
$sql = "SELECT DISTINCT " . $conn->real_escape_string($campo_valor) . " as value, " . $conn->real_escape_string($campo_etiqueta) . " as label 
        FROM " . $conn->real_escape_string($tabla) . " 
        WHERE $filtro";
if($order) $sql .= " ORDER BY " . $conn->real_escape_string($order);
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
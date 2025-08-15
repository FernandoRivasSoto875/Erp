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

// Validación básica de nombres
if(!preg_match('/^[a-zA-Z0-9_]+$/', $tabla)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_valor)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_etiqueta)) die(json_encode([]));
if($order && !preg_match('/^[a-zA-Z0-9_ ]+(ASC|DESC)?$/i', $order)) $order = '';

// Construir la consulta
$sql = "SELECT DISTINCT $campo_valor as value, $campo_etiqueta as label FROM $tabla WHERE $filtro";
if ($order) $sql .= " ORDER BY $order";
$sql .= " LIMIT 100";

// Depuración: muestra el SQL si necesitas
error_log($sql);

$result = $conn->query($sql);

$data = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = ['value' => $row['value'], 'label' => $row['label']];
    }
}

echo json_encode($data);
?>
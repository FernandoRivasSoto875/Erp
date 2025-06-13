<?php

require_once '../funcionessql.php';
$conn = conexionBd();

$data = json_decode(file_get_contents('php://input'), true);

// Validar nombres de tabla y campo (solo letras, números y guion bajo)
$tabla = preg_replace('/\W/', '', $data['tabla']);
$campo = preg_replace('/\W/', '', $data['campo']);
$where = $data['where'];

$condiciones = [];
$valores = [];
foreach ($where as $k => $v) {
    $condiciones[] = "$k = ?";
    $valores[] = $v;
}
$whereSql = implode(' AND ', $condiciones);

$stmt = $conn->prepare("SELECT $campo FROM $tabla WHERE $whereSql LIMIT 1");
if ($valores) {
    $tipos = str_repeat('s', count($valores));
    $stmt->bind_param($tipos, ...$valores);
}
$stmt->execute();
$stmt->bind_result($resultado);
$stmt->fetch();
$stmt->close();

echo json_encode(['resultado' => $resultado]);
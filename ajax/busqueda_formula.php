<?php
require_once '../funcionessql.php'; // Ajusta la ruta si es necesario
$conn = conexionBd();

$data = json_decode(file_get_contents('php://input'), true);
$tabla = $data['tabla'];
$campo = $data['campo'];
$where = $data['where'];

$stmt = $conn->prepare("SELECT $campo FROM $tabla WHERE $where LIMIT 1");
$stmt->execute();
$stmt->bind_result($resultado);
$stmt->fetch();
$stmt->close();

echo json_encode(['resultado' => $resultado]);
<?php
header('Content-Type: application/json');
require_once '../config/conexion.json'; // Ajusta si tienes otro archivo de conexión
// Conexión básica (ajusta según tu sistema)
$conn = new mysqli('localhost', 'usuario', 'clave', 'basedatos');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Conexión fallida']);
    exit;
}
$sql = isset($_GET['sql']) ? $_GET['sql'] : '';
if (!$sql) {
    echo json_encode(['error' => 'No se recibió SQL']);
    exit;
}
// Solo permite SELECT por seguridad
if (stripos(trim($sql), 'select') !== 0) {
    echo json_encode(['error' => 'Solo se permiten sentencias SELECT']);
    exit;
}
$res = $conn->query($sql);
if ($res && $row = $res->fetch_assoc()) {
    // Devuelve el primer valor del primer campo
    $valor = reset($row);
    echo json_encode(['valor' => $valor]);
} else {
    echo json_encode(['valor' => null]);
}
$conn->close();

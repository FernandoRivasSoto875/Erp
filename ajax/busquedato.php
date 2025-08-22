<?php
header('Content-Type: application/json');
require_once '../config/conexion.json'; // Ajusta si tienes otro archivo de conexión
// Conexión básica (ajusta según tu sistema)
$conn = new mysqli('localhost', 'usuario', 'clave', 'basedatos');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Conexión fallida']);
    exit;
}
$tabla = isset($_GET['tabla']) ? $_GET['tabla'] : '';
$valor = isset($_GET['valor']) ? $_GET['valor'] : '';
$filtro = isset($_GET['filtro']) ? $_GET['filtro'] : '';
$order = isset($_GET['order']) ? $_GET['order'] : '';
if (!$tabla || !$valor) {
    echo json_encode(['error' => 'Faltan parámetros']);
    exit;
}
$sql = "SELECT `$valor` FROM `$tabla";
if ($filtro) $sql .= " WHERE $filtro";
if ($order) $sql .= " ORDER BY $order";
$sql .= " LIMIT 1";
$res = $conn->query($sql);
if ($res && $row = $res->fetch_assoc()) {
    $valorRet = $row[$valor];
    echo json_encode(['valor' => $valorRet]);
} else {
    echo json_encode(['valor' => null]);
}
$conn->close();

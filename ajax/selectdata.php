<?php
header('Content-Type: application/json');

// Carga la configuración desde conexion.json
$config = json_decode(file_get_contents(__DIR__.'/../config/conexion.json'), true);
$host = $config['host'] ?? $config['server'];
$user = $config['user'] ?? $config['username'];
$pass = $config['password'] ?? '';
$db   = $config['database'] ?? '';

$tabla = $_GET['tabla'] ?? '';
$campo_valor = $_GET['campo_valor'] ?? 'id';
$campo_etiqueta = $_GET['campo_etiqueta'] ?? 'nombre';
$filtro = $_GET['filtro'] ?? '1=1';
$order = $_GET['order'] ?? '';

if(!preg_match('/^[a-zA-Z0-9_]+$/', $tabla)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_valor)) die(json_encode([]));
if(!preg_match('/^[a-zA-Z0-9_]+$/', $campo_etiqueta)) die(json_encode([]));
if($order && !preg_match('/^[a-zA-Z0-9_ ]+(ASC|DESC)?$/i', $order)) $order = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $sql = "SELECT $campo_valor as value, $campo_etiqueta as label FROM $tabla WHERE $filtro";
    if($order) $sql .= " ORDER BY $order";
    $sql .= " LIMIT 100";
    $stmt = $pdo->query($sql);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch(Exception $e) {
    echo json_encode(['error'=>$e->getMessage()]);
}
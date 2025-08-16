<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../funcionessql.php';

$conn = conexionBd();
if ($conn === null) {
    echo json_encode(['error'=>'No se pudo conectar a la BD']);
    exit;
}

$tabla = $_GET['tabla'] ?? '';
$action = $_POST['action'] ?? $_GET['action'] ?? 'list';

if(!preg_match('/^[a-zA-Z0-9_]+$/', $tabla)) die(json_encode(['error'=>'Tabla inválida']));

switch($action) {
    case 'list':
        $sql = "SELECT * FROM $tabla LIMIT 100";
        $result = $conn->query($sql);
        $data = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        echo json_encode(['data'=>$data]);
        break;

    case 'add':
        $cols = [];
        $vals = [];
        foreach ($_POST as $k => $v) {
            if ($k === 'action') continue;
            $cols[] = $conn->real_escape_string($k);
            $vals[] = "'".$conn->real_escape_string($v)."'";
        }
        if ($cols) {
            $sql = "INSERT INTO $tabla (".implode(',',$cols).") VALUES (".implode(',',$vals).")";
            $ok = $conn->query($sql);
            echo json_encode(['success'=>$ok]);
        } else {
            echo json_encode(['error'=>'Sin datos']);
        }
        break;

    case 'edit':
        $id = $_POST['id'] ?? '';
        $updates = [];
        foreach ($_POST as $k => $v) {
            if ($k === 'action' || $k === 'id') continue;
            $updates[] = $conn->real_escape_string($k)."='".$conn->real_escape_string($v)."'";
        }
        if ($id && $updates) {
            $sql = "UPDATE $tabla SET ".implode(',',$updates)." WHERE id='".$conn->real_escape_string($id)."'";
            $ok = $conn->query($sql);
            echo json_encode(['success'=>$ok]);
        } else {
            echo json_encode(['error'=>'Sin datos']);
        }
        break;

    case 'delete':
        $id = $_POST['id'] ?? '';
        if ($id) {
            $sql = "DELETE FROM $tabla WHERE id='".$conn->real_escape_string($id)."'";
            $ok = $conn->query($sql);
            echo json_encode(['success'=>$ok]);
        } else {
            echo json_encode(['error'=>'Sin id']);
        }
        break;

    default:
        echo json_encode(['error'=>'Acción inválida']);
}
?>
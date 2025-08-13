<?php
header('Content-Type: application/json');

include 'funcionessql.php';
$conn = conexionBd();

if ($conn->connect_error) {
    echo json_encode(["error" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

// Obtener el nombre de la tabla.
$table_name = $_POST['table_name'] ?? null;
if (!$table_name) {
    echo json_encode(["error" => "Parámetro 'table_name' no proporcionado."]);
    exit;
}

$action = $_POST['action'] ?? '';

if ($action == 'create') {
    // Crear registro: quitar campos reservados.
    $data = $_POST;
    unset($data['action'], $data['table_name']);
    
    $fields = [];
    $values = [];
    foreach ($data as $field => $value) {
        $fields[] = $field;
        $values[] = "'" . $conn->real_escape_string($value) . "'";
    }
    $sql = "INSERT INTO $table_name (" . implode(',', $fields) . ") VALUES (" . implode(',', $values) . ")";
    
    if ($conn->query($sql)) {
        echo json_encode(["success" => "Registro creado exitosamente."]);
    } else {
        echo json_encode(["error" => "Error al crear registro: " . $conn->error]);
    }
    
} elseif ($action == 'update') {
    // Actualizar registro.
    $data = $_POST;
    unset($data['action'], $data['table_name']);
    
    // Se verifica si se envió el campo "id" (clave primaria)
    if (isset($data['id'])) {
        $id_field = 'id';
        $id_value = $data['id'];
        unset($data['id']);
    } else {
        $keys = array_keys($data);
        if (count($keys) == 0) {
            echo json_encode(["error" => "No se encontraron datos para actualizar."]);
            exit;
        }
        $id_field = $keys[0];
        $id_value = $data[$id_field];
        unset($data[$id_field]);
    }
    
    if (empty($data)) {
        echo json_encode(["error" => "No hay campos para actualizar."]);
        exit;
    }
    
    $updates = [];
    foreach ($data as $field => $value) {
        $updates[] = "$field = '" . $conn->real_escape_string($value) . "'";
    }
    $sql = "UPDATE $table_name SET " . implode(',', $updates) . " WHERE $id_field = '" . $conn->real_escape_string($id_value) . "'";
    
    if ($conn->query($sql)) {
        echo json_encode(["success" => "Registro actualizado exitosamente."]);
    } else {
        echo json_encode(["error" => "Error al actualizar registro: " . $conn->error]);
    }
    
} elseif ($action == 'delete') {
    // Eliminar registro.
    $data = $_POST;
    unset($data['action'], $data['table_name']);
    if (isset($data['id'])) {
        $id_field = 'id';
        $id_value = $data['id'];
    } else {
        $keys = array_keys($data);
        if (empty($keys)) {
            echo json_encode(["error" => "ID no proporcionado para eliminar."]);
            exit;
        }
        $id_field = $keys[0];
        $id_value = $data[$id_field];
    }
    $sql = "DELETE FROM $table_name WHERE $id_field = '" . $conn->real_escape_string($id_value) . "'";
    
    if ($conn->query($sql)) {
        echo json_encode(["success" => "Registro eliminado exitosamente."]);
    } else {
        echo json_encode(["error" => "Error al eliminar registro: " . $conn->error]);
    }
    
} else {
    echo json_encode(["error" => "Acción no válida."]);
}

$conn->close();
?>

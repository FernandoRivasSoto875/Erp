<?php
header('Content-Type: application/json');

$archivo = isset($_POST['archivo']) ? $_POST['archivo'] : '';
$response = ['success' => false];

if ($archivo) {
    $data = [];

    if (isset($_POST['parametros'])) {
        $data['parametros'] = json_decode($_POST['parametros'], true);
    }
    if (isset($_POST['layout'])) {
        $data['layout'] = json_decode($_POST['layout'], true);
    }
    if (isset($_POST['fieldsets'])) {
        $data['fieldsets'] = json_decode($_POST['fieldsets'], true);
    }
    if (isset($_POST['elementos_fuera'])) {
        $data['elementos_fuera'] = json_decode($_POST['elementos_fuera'], true);
    }

    $jsonFilePath = '../src/json/' . $archivo;

    if (file_put_contents($jsonFilePath, json_encode($data, JSON_PRETTY_PRINT))) {
        $response['success'] = true;
    } else {
        $response['error'] = 'Error al guardar el archivo.';
    }
} else {
    $response['error'] = 'Nombre de archivo no proporcionado.';
}

echo json_encode($response);
?>
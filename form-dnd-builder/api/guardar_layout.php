<?php
// guardar_layout.php

header('Content-Type: application/json');

$archivo = isset($_POST['archivo']) ? $_POST['archivo'] : '';
$layout = isset($_POST['layout']) ? $_POST['layout'] : '';
$elementos_fuera = isset($_POST['elementos_fuera']) ? $_POST['elementos_fuera'] : '';

if (empty($archivo)) {
    echo json_encode(['success' => false, 'error' => 'No se detectó el archivo JSON a guardar.']);
    exit;
}

if (file_put_contents($archivo, json_encode(['layout' => json_decode($layout), 'elementos_fuera' => json_decode($elementos_fuera)]))) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo.']);
}
?>
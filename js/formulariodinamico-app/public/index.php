<?php
// filepath: formulariodinamico-app/public/index.php
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../app/formulariodinamico.php';
require_once '../app/partials/right-panel-json-tree.php';

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$json_path = '../json/' . basename($archivo_json);

if (!is_file($json_path)) {
    die("<div class='alert alert-danger'>No existe el archivo: " . htmlspecialchars($json_path) . "</div>");
}

$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true) ?: [];

$titulo_formulario = $json_data['titulo'] ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion'] ?? '';

?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($titulo_formulario); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="assets/css/styles.css">
    <link rel="stylesheet" href="assets/css/json-tree.css">
</head>
<body>
    <div class="container">
        <h1><?php echo htmlspecialchars($titulo_formulario); ?></h1>
        <p><?php echo htmlspecialchars($descripcion_formulario); ?></p>
        
        <div class="row">
            <div class="col-md-8">
                <?php include '../app/formulariodinamico.php'; ?>
            </div>
            <div class="col-md-4">
                <?php include '../app/partials/right-panel-json-tree.php'; ?>
            </div>
        </div>
    </div>

    <script src="assets/js/jquery.min.js"></script>
    <script src="assets/js/formulariodinamico.js"></script>
    <script src="assets/js/dragdrop-formulariodinamico.js"></script>
    <script src="assets/js/json-tree-panel.js"></script>
    <script src="assets/js/json-editor-panel.js"></script>
    <script src="assets/js/state-history.js"></script>
</body>
</html>
<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$archivo_base = basename($archivo_json);
if (stripos($archivo_base, '.json') === false) $archivo_base .= '.json';
$json_path = __DIR__ . '/../json/' . $archivo_base;

if (!is_file($json_path)) {
    die("<div class='alert alert-danger'>No existe el archivo: " . htmlspecialchars($json_path) . "</div>");
}

$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true) ?: [];

$titulo_formulario = $json_data['titulo'] ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion'] ?? '';
$fieldsets = $json_data['fieldsets'] ?? [];
$layout = $json_data['layout'] ?? [];
$elementos_fuera = $json_data['elementos_fuera'] ?? [];
$params = $json_data['parametros'] ?? [];

require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';
require_once __DIR__ . '/partials/right-panel-json-tree.php';
require_once __DIR__ . '/partials/outside-elements.php';
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<link rel="stylesheet" href="../assets/css/json-tree.css">
<style>
#fd-root { display: flex; }
#fd-root .form-container { flex: 1; }
#fd-root .json-tree-container { width: 300px; border-left: 1px solid #ddd; padding-left: 15px; }
</style>
</head>
<body>
<div id="fd-root">
    <div class="form-container">
        <div class="container mt-3 mb-5">
            <div class="card">
                <div class="card-header text-center">
                    <h2 id="form-title" class="mb-0">
                        <?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?>
                    </h2>
                </div>
                <div class="card-body">
                    <?php if (!empty($descripcion_formulario)): ?>
                        <p class="text-muted"><?php echo htmlspecialchars($descripcion_formulario); ?></p>
                    <?php endif; ?>

                    <form id="formulariodinamico" method="POST" action="formulariodinamico.php?archivo=<?php echo urlencode($archivo_base); ?>" enctype="multipart/form-data">
                        <?php if (function_exists('generarLayout')) {
                            echo generarLayout($layout, $fieldsets, [], false);
                        } ?>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">Guardar</button>
                            <button type="button" class="btn btn-secondary" onclick="history.back()">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="json-tree-container">
        <?php echo generarJsonTree($json_data); ?>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
<script src="../assets/js/json-tree-panel.js"></script>
</body>
</html>
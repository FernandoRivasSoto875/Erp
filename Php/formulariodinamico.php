<?php
// Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
// --- INCLUDES PRINCIPALES ---
require_once __DIR__ . '/formulariodinamicologica.php';
require_once __DIR__ . '/Php/formulariodinamicofunciones.php';

// --- CARGA DEL JSON DEL FORMULARIO ---
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$json_path = __DIR__ . '/json/' . $archivo_json;
$json = [];
if (file_exists($json_path)) {
    $json = json_decode(file_get_contents($json_path), true);
    if (!is_array($json)) $json = [];
}

// --- EXTRACCIÓN DE FIELDSETS Y CAMPOS ---
$fieldsets = $json['fieldsets'] ?? [];
$layout    = $json['layout'] ?? [];
$valores   = $_POST ?: [];
$soloLectura = false;
$all_fields = [];
foreach ($fieldsets as $fs) {
    foreach ($fs['campos'] ?? [] as $campo) {
        $all_fields[] = $campo;
    }
}

// --- RENDER DEL FORMULARIO ---
?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Formulario Dinámico</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/css/estilos.css">
    <link rel="stylesheet" href="/css/formulariodinamico-blue1.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/js/formulariodinamico.js"></script>
        <script src="/js/formulariodinamico-page.js"></script>
    <script src="/js/formulariodinamico-init.js"></script>
    <script src="/js/formulariodinamico-float.js"></script>
</head>
<body>
<div class="container mt-4">
    <h2 class="mb-3">Formulario Dinámico</h2>
    <!-- Bloque de diagnóstico visual -->
    <div class="alert alert-info mb-3">
        <b>Diagnóstico:</b><br>
        <?php
        echo 'Archivo JSON: <b>' . htmlspecialchars($archivo_json) . '</b><br>';
        echo 'Fieldsets cargados: <b>' . count($fieldsets) . '</b><br>';
        echo 'Layout presente: <b>' . (!empty($layout) ? 'Sí' : 'No') . '</b><br>';
        if (empty($fieldsets)) echo '<span class="text-danger">No se encontraron fieldsets en el JSON.</span><br>';
        if (empty($layout)) echo '<span class="text-warning">No se encontró layout, se mostrarán todos los fieldsets.</span><br>';
        ?>
    </div>
    <?php
    // Renderizar el layout principal
    if (!empty($layout)) {
        echo generarLayout($layout, $fieldsets, $valores, $soloLectura);
    } else {
        // Renderizar todos los fieldsets si no hay layout
        foreach (array_keys($fieldsets) as $fsName) {
            echo generarFieldsetContenido($fsName, $fieldsets, $valores, $soloLectura);
        }
    }
    ?>
</div>
</body>
</html>

<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Asegurar: solo diseño si ?modoDiseno=1 exacto
$modoDiseno  = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1') ? 1 : 0;
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';

$archivo_base = basename($archivo_json);
if (stripos($archivo_base, '.json') === false) $archivo_base .= '.json';
$json_path = __DIR__ . '/json/' . $archivo_base;

if (!is_file($json_path)) {
    die("<div class='alert alert-danger'>No existe el archivo: " . htmlspecialchars($json_path) . "</div>");
}

$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true) ?: [];

$titulo_formulario      = $json_data['titulo'] ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion'] ?? '';
$fieldsets              = $json_data['fieldsets'] ?? [];
$layout                 = $json_data['layout'] ?? [];
$elementos_fuera        = $json_data['elementos_fuera'] ?? [];
$params                 = $json_data['parametros'] ?? [];

// Normalizar fieldsets a mapa
if (is_array($fieldsets) && array_keys($fieldsets) === range(0, count($fieldsets)-1)) {
    $byName = [];
    foreach ($fieldsets as $fs) { if (!empty($fs['name'])) $byName[$fs['name']] = $fs; }
    if ($byName) $fieldsets = $byName;
}

require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';

?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<style>
/* IMPORTANTE: Escopar al root del formulario, no al <body> */
#fd-root.design-mode .draggable-fieldset,
#fd-root.design-mode .draggable-field { cursor: move; border: 2px dashed #0d6efd !important; background: rgba(13,110,253,.05); }
.sortable-ghost { background: #e7f1ff; border: 2px dashed #0d6efd; opacity: .7; }
#fd-root.design-mode [data-col-width] { min-height: 80px; background: #f8f9fa; border: 1px dashed #dee2e6; padding: .5rem; }
#elementos-fuera-container { display: <?php echo $modoDiseno ? 'block' : 'none'; ?>; }
.design-mode-switch { position: fixed; right: 16px; bottom: 16px; z-index: 1050; background: #fff; border-radius: 999px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,.15); display: flex; align-items: center; gap: 8px; }
.edit-icon { cursor: pointer; color: #6c757d; margin-left: 6px; }
.edit-icon:hover { color: #0d6efd; }
</style>
</head>
<body>
<div id="fd-root" class="<?php echo $modoDiseno ? 'design-mode' : ''; ?>">
    <!-- elementos_fuera solo en modo diseño -->
    <?php if ($modoDiseno): ?>
    <div id="elementos-fuera-container" class="p-3 border rounded mb-3 bg-light" data-dropzone="outside"></div>
    <?php endif; ?>

    <form id="formulariodinamico" method="POST" action="formulariodinamico.php?archivo=<?php echo urlencode($archivo_base); ?>" enctype="multipart/form-data">
        <?php
        // IMPORTANTE: soloLectura = !$modoDiseno
        echo generarLayout($layout, $fieldsets, [], !$modoDiseno);
        ?>
        <button type="submit" class="btn btn-primary" <?php echo $modoDiseno ? 'disabled' : ''; ?>>Guardar</button>
    </form>
</div>
<!-- toggle que recarga con ?modoDiseno=1|0 -->
<script>
document.getElementById('designModeToggle')?.addEventListener('change', function(){
    const u = new URL(location.href);
    u.searchParams.set('modoDiseno', this.checked ? '1':'0');
    location.href = u.toString();
});
</script>
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
window.FORM_CONFIG = { archivo_json: '<?php echo addslashes($archivo_base); ?>' };
window.formularioJsonOriginal = <?php echo json_encode($json_data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
$('#designModeToggle').on('change', function(){
    const url = new URL(location.href);
    url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
    location.href = url.toString();
});
</script>
<script src="js/formulariodinamico.js"></script>
<script src="js/dragdrop-formulariodinamico.js"></script>
</body>
</html>

<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Solo diseño si ?modoDiseno=1
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
/* Mostrar CRUD solo en diseño */
#fd-root:not(.design-mode) .add-tab-button,
#fd-root:not(.design-mode) .edit-tab-icon,
#fd-root:not(.design-mode) .delete-tab-icon { display: none !important; }
</style>
<!-- Necesario para navegación de tabs -->
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
window.FORM_CONFIG = { archivo_json: '<?php echo addslashes($archivo_base); ?>' };
window.formularioJsonOriginal = <?php echo json_encode($json_data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;

$(function(){
    const $root = $('#fd-root');
    const $save = $('#saveLayoutBtn');
    const $submit = $('#formulariodinamico button[type="submit"]');
    const $toggle = $('#designModeToggle');

    function uiSetDesignMode(on) {
        $root.toggleClass('design-mode', !!on);
        $save.toggle(!!on);
        $submit.prop('disabled', !!on);
        if (window.DnDFormBuilder) {
            if (on) window.DnDFormBuilder.activateDesignMode();
            else window.DnDFormBuilder.deactivateDesignMode();
        }
        const url = new URL(location.href);
        url.searchParams.set('modoDiseno', on ? '1' : '0');
        history.replaceState(null, '', url.toString());
    }

    $toggle.on('change', function(){ uiSetDesignMode(this.checked); });
    uiSetDesignMode($root.hasClass('design-mode'));
});
</script>
<script src="js/formulariodinamico.js"></script>
<script src="js/dragdrop-formulariodinamico.js"></script>
</body>
</html>

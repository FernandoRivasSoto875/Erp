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
/* Escopar al root del formulario */
#fd-root.design-mode .draggable-fieldset,
#fd-root.design-mode .draggable-field { cursor: move; border: 2px dashed #0d6efd !important; background: rgba(13,110,253,.05); }
#fd-root.design-mode [data-col-width] { min-height: 80px; background: #f8f9fa; border: 1px dashed #dee2e6; padding: .5rem; }
.sortable-ghost { background: #e7f1ff; border: 2px dashed #0d6efd; opacity: .7; }

/* Íconos/controles visibles solo en diseño */
#fd-root:not(.design-mode) .edit-icon,
#fd-root:not(.design-mode) .edit-tab-icon,
#fd-root:not(.design-mode) .add-tab-button { display: none !important; }

/* “Elementos fuera” visible solo en diseño */
#fd-root:not(.design-mode) #elementos-fuera-container { display: none !important; }

/* Switch flotante */
.design-mode-switch { position: fixed; right: 16px; bottom: 16px; z-index: 1050; background: #fff; border-radius: 999px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,.15); display: flex; align-items: center; gap: 8px; }
.edit-icon { cursor: pointer; color: #6c757d; margin-left: 6px; }
.edit-icon:hover { color: #0d6efd; }
</style>
</head>
<body>
<div id="fd-root" class="<?php echo $modoDiseno ? 'design-mode' : ''; ?>">

    <!-- SIEMPRE presente; visible solo en diseño por CSS -->
    <div id="elementos-fuera-container" class="container mt-3 p-3 border rounded bg-light" data-dropzone="outside">
        <h5 class="mb-2">Elementos fuera del formulario</h5>
        <?php echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, [], false); ?>
    </div>

    <div class="container mt-3 mb-5">
        <div class="card">
            <div class="card-header text-center">
                <h2 id="form-title" class="mb-0">
                    <?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?>
                    <!-- SIEMPRE renderizar; se oculta en modo normal por CSS -->
                    <span class="edit-icon" data-edit="form-title" title="Editar título"><i class="fas fa-pencil-alt"></i></span>
                </h2>
                <?php if (!empty($params['comentario'])): ?>
                    <p class="mb-0 text-muted"><?php echo htmlspecialchars($params['comentario']); ?></p>
                <?php endif; ?>
            </div>
            <div class="card-body">
                <form id="formulariodinamico" method="POST" action="formulariodinamico.php?archivo=<?php echo urlencode($archivo_base); ?>" enctype="multipart/form-data">
                    <?php
                    // Inputs SIEMPRE editables (no readonly)
                    echo generarLayout($layout, $fieldsets, [], false);
                    ?>
                    <div class="mt-3">
                        <button type="submit" class="btn btn-primary" <?php echo $modoDiseno ? 'disabled' : ''; ?>>Guardar</button>
                        <button type="button" class="btn btn-secondary" onclick="history.back()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Switch flotante -->
    <div class="design-mode-switch">
        <button id="undoBtn" class="btn btn-outline-secondary btn-sm" style="display:none" title="Deshacer"><i class="fas fa-undo"></i></button>
        <button id="redoBtn" class="btn btn-outline-secondary btn-sm" style="display:none" title="Rehacer"><i class="fas fa-redo"></i></button>
        <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="designModeToggle" <?php echo $modoDiseno ? 'checked' : ''; ?>>
            <label class="custom-control-label" for="designModeToggle">Modo diseño</label>
        </div>
        <button id="saveLayoutBtn" class="btn btn-success btn-sm" style="<?php echo $modoDiseno ? '' : 'display:none'; ?>">Guardar diseño</button>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<!-- IMPORTANTE: Bootstrap JS para navegación de tabs/pills -->
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
        $submit.prop('disabled', !!on); // deshabilitar submit solo en diseño
        if (window.DnDFormBuilder) {
            if (on) window.DnDFormBuilder.activateDesignMode();
            else window.DnDFormBuilder.deactivateDesignMode();
        }
        // Mantener el query param sin recargar
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

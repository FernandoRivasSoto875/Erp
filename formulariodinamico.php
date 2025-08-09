<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Solo diseño si ?modoDiseno=1
$modoDiseno  = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1') ? 1 : 0;
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';

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
    foreach ($fieldsets as $fs) {
        $name = $fs['name'] ?? $fs['nombre'] ?? null;
        if ($name) $byName[$name] = $fs;
    }
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
/* Solo visibles en modo diseño */
#fd-root:not(.design-mode) .add-tab-button,
#fd-root:not(.design-mode) .edit-tab-icon,
#fd-root:not(.design-mode) .delete-tab-icon,
#fd-root:not(.design-mode) .edit-icon { display: none !important; }
/* “Elementos fuera” visible solo en diseño */
#fd-root:not(.design-mode) #elementos-fuera-container { display: none !important; }
/* Señales visuales en diseño */
#fd-root.design-mode .draggable-fieldset,
#fd-root.design-mode .draggable-field { border: 2px dashed #0d6efd; background: rgba(13,110,253,.05); }
.sortable-ghost { background:#e7f1ff; border:2px dashed #0d6efd; opacity:.7; }
/* Switch flotante */
.design-mode-switch { position: fixed; right: 16px; bottom: 16px; z-index: 1050; background: #fff; border-radius: 999px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,.15); display: flex; align-items: center; gap: 8px; }
.edit-icon { cursor: pointer; color: #6c757d; margin-left: 6px; }
.edit-icon:hover { color: #0d6efd; }
/* CRUD de tabs visible en diseño */
#fd-root:not(.design-mode) .add-tab-button,
#fd-root:not(.design-mode) .edit-tab-icon,
#fd-root:not(.design-mode) .delete-tab-icon { display: none !important; }

#fd-root [data-block-type="tabs"] .nav .edit-tab-icon,
#fd-root [data-block-type="tabs"] .nav .delete-tab-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  font-size: .9rem;
  cursor: pointer;
  color: #6c757d;
}
#fd-root.design-mode [data-block-type="tabs"] .nav .edit-tab-icon:hover,
#fd-root.design-mode [data-block-type="tabs"] .nav .delete-tab-icon:hover { color: #0d6efd; }
</style>
</head>
<body>
<div id="fd-root" class="design-mode">
  <h1 id="form-title">Formulario</h1>
  <!-- ...tu formulario renderizado... -->
</div>

<script>
  // Apunta al archivo que quieres editar
  window.FORM_CONFIG = { archivo_json: 'formulariogenerico.json' };

  // Cuando cambies el modo, notifica (el panel escucha este evento)
  function uiSetDesignMode(on){
    const root = document.getElementById('fd-root');
    if (root) root.classList.toggle('design-mode', !!on);
    window.dispatchEvent(new CustomEvent('design-mode-changed', { detail: { on: !!on } }));
  }
  // si ya tienes un toggle, llama uiSetDesignMode(true/false) allí.
</script>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="js/json-tree-panel.js"></script>
</body>
</html>

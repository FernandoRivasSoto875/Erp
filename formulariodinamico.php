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
$json_error = (json_last_error() !== JSON_ERROR_NONE) ? json_last_error_msg() : '';

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
<div id="fd-root" class="<?php echo $modoDiseno ? 'design-mode' : ''; ?>">
  <div class="container py-3">
    <h1 id="form-title"><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></h1>

    <?php if ($json_error): ?>
      <div class="alert alert-danger">JSON inválido: <?php echo htmlspecialchars($json_error); ?>. Corrige el archivo <?php echo htmlspecialchars($archivo_base); ?> (posibles comas finales).</div>
    <?php endif; ?>

    <?php if (!empty($descripcion_formulario)): ?>
      <p class="text-muted"><?php echo htmlspecialchars($descripcion_formulario); ?></p>
    <?php endif; ?>

    <div id="form-container">
      <?php
      if (function_exists('generarLayout')) {
          echo generarLayout($layout, $fieldsets, $json_data['valores'] ?? [], false);
      } else {
          echo '<div class="alert alert-warning">Falta la función generarLayout(). Incluye formulariodinamicologica.php con las funciones de render.</div>';
      }
      ?>
    </div>

    <?php if ($modoDiseno): ?>
      <div id="elementos-fuera-container" class="mt-3">
        <?php
        if (function_exists('generarContenedorFueraDelFormulario')) { // <- comilla y paréntesis corregidos
            echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, [], false);
        }
        ?>
      </div>
    <?php endif; ?>
  </div>
</div>

<!-- Switch flotante de Modo Diseño -->
<div class="design-mode-switch">
  <input type="checkbox" id="designModeToggle" <?php echo $modoDiseno ? 'checked' : ''; ?> />
  <label for="designModeToggle" class="mb-0">Modo diseño</label>
</div>

<script>
  // Archivo JSON activo y datos embebidos (el árbol los usa)
  window.FORM_CONFIG = { archivo_json: <?php echo json_encode($archivo_base); ?> };
  window.formularioJsonOriginal = <?php echo json_encode($json_data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;

  // Toggle de modo diseño
  function uiSetDesignMode(on){
    const root = document.getElementById('fd-root');
    if (root) root.classList.toggle('design-mode', !!on);
    window.dispatchEvent(new CustomEvent('design-mode-changed', { detail: { on: !!on } }));
  }

  document.addEventListener('DOMContentLoaded', function(){
    const toggle = document.getElementById('designModeToggle');
    if (!toggle) return;
    // Sincroniza estado inicial (y notifica a paneles)
    uiSetDesignMode(toggle.checked);
    // Cambios del usuario
    toggle.addEventListener('change', function(){
      uiSetDesignMode(this.checked);
      // Reflejar en la URL sin recargar
      const url = new URL(location.href);
      url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
      history.replaceState(null, '', url.toString());
    });
  });

  function fdActivateTab(container, href){
    if (!container || !href || !href.startsWith('#')) return;
    // activa link
    container.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
    const link = container.querySelector(`.nav-link[href="${href}"]`);
    if (link) link.classList.add('active');
    // muestra pane
    container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
    const pane = container.querySelector(href);
    if (pane) pane.classList.add('show','active');
  }

  // Click en pestañas (funciona con o sin Bootstrap)
  document.addEventListener('click', function(e){
    const link = e.target.closest('#fd-root [data-block-type="tabs"] .nav-link');
    if (!link) return;

    // Si está Bootstrap, dejar que lo maneje
    const hasBS4 = window.jQuery && jQuery.fn && jQuery.fn.tab;
    const hasBS5 = window.bootstrap && bootstrap.Tab;
    if (hasBS4 || hasBS5) return;

    e.preventDefault();
    const container = link.closest('[data-block-type="tabs"]');
    const href = link.getAttribute('href');
    fdActivateTab(container, href);
  });

  // Asegurar que haya una pestaña activa al cargar
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('#fd-root [data-block-type="tabs"]').forEach(container => {
      const active = container.querySelector('.nav-link.active');
      const first  = container.querySelector('.nav-link');
      const target = (active || first);
      if (target) fdActivateTab(container, target.getAttribute('href'));
    });
  });
</script>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="js/json-tree-panel.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Solo diseño si ?modoDiseno=1
$modoDiseno  = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1');

$archivo_base = 'formulariogenerico2.json';
$json_path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $archivo_base;

// Carga JSON y captura error si hay
$json_text  = is_file($json_path) ? file_get_contents($json_path) : '{}';
$json_data  = json_decode($json_text, true);
$json_error = null;
if ($json_data === null && json_last_error() !== JSON_ERROR_NONE) {
    $json_error = json_last_error_msg();
    $json_data  = [];
}

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
  <meta charset="utf-8">
  <title>Formulario dinámico</title>
  <!-- Estilos mínimos del árbol -->
  <style>
    #json-tree-panel ul{ list-style:none; margin:0; padding-left:16px; }
    #json-tree-panel [data-node="group"]{ margin:4px 0; }
    #json-tree-panel [data-node="group"] > .title{
      cursor:pointer; user-select:none; padding:2px 4px; border-radius:4px;
    }
    #json-tree-panel [data-node="group"] > .title:hover{ background:#f3f4f6; }
    #json-tree-panel [data-node="group"] > .title::before{ content:"▾"; margin-right:6px; color:#6b7280; }
    #json-tree-panel [data-node="group"].collapsed > .title::before{ content:"▸"; }
    #json-tree-panel [data-node="group"].collapsed > [data-node="fields"]{ display:none; }
    #json-tree-panel [data-node="field"]{ padding:2px 4px; border-radius:4px; margin:2px 0; }
    #json-tree-panel [data-node="field"]:hover{ background:#f8fafc; }
    #json-tree-panel .handle{
      display:inline-block; margin-right:6px; background:#6f42c1; color:#fff;
      border-radius:4px; padding:0 6px; font-weight:600; line-height:1.2;
    }
    #json-tree-panel .node-fields-list{ min-height:14px; padding:4px; border:1px dashed rgba(111,66,193,.25); border-radius:4px; }
  </style>
</head>
<body>
  <!-- Barra de herramientas -->
  <div id="fd-design-toolbar" style="margin:8px 0;">
    <label style="display:inline-flex;align-items:center;gap:6px;">
      <input type="checkbox" id="designModeToggle"> Modo diseño
    </label>
  </div>

  <!-- Asegura que tu formulario esté dentro de #fd-root -->
  <div id="fd-root">
    <div class="container py-3">
      <h1 id="form-title"><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></h1>

      <?php if ($json_error): ?>
        <div class="alert alert-danger">
          JSON inválido: <?php echo htmlspecialchars($json_error); ?>.
          Corrige el archivo <?php echo htmlspecialchars($archivo_base); ?> (posibles comas finales).
        </div>
      <?php endif; ?>

      <?php if (!empty($descripcion_formulario)): ?>
        <p class="text-muted"><?php echo htmlspecialchars($descripcion_formulario); ?></p>
      <?php endif; ?>

      <div id="form-container">
        <?php
        if (function_exists('generarLayout')) {
            echo generarLayout($layout, $fieldsets, $json_data['valores'] ?? [], false);
        } else {
            echo '<div class="alert alert-warning">Falta la función generarLayout().</div>';
        }
        ?>
      </div>

      <?php if ($modoDiseno): ?>
        <div id="elementos-fuera-container" class="mt-3">
          <?php
          if (function_exists('generarContenedorFueraDelFormulario')) {
              echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, [], false);
          }
          ?>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Panel para el árbol -->
  <div id="json-tree-panel"></div>

  <!-- Scripts (solo una vez, en este orden) -->
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script>
  // Toggle de modo diseño + evento para fd-dnd-lite
  (function(){
    const root = document.getElementById('fd-root');
    const toggle = document.getElementById('designModeToggle');
    function emit(on){
      window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } }));
    }
    function refresh(){
      const on = root && root.classList.contains('design-mode');
      window.fdDndLiteRefresh && window.fdDndLiteRefresh();
    }
    if (toggle){
      toggle.addEventListener('change', function(){
        if (!root) return;
        root.classList.toggle('design-mode', this.checked);
        emit(this.checked); refresh();
      });
    }
    // iniciar según estado inicial
    if (toggle && toggle.checked){ root && root.classList.add('design-mode'); emit(true); }
    document.addEventListener('click', function(e){
      const t = e.target.closest('#json-tree-panel [data-node="group"] > .title');
      if (t) t.parentElement.classList.toggle('collapsed');
    });
  })();
  </script>
  <script src="js/fd-tree-config.js"></script>
  <script src="js/fd-dnd-lite.js"></script>
  <script src="js/fd-tree-render.js"></script>

  <!-- Re-render del árbol al cargar -->
  <script>
  document.addEventListener('DOMContentLoaded', function(){
    window.renderJsonTreeFromForm && window.renderJsonTreeFromForm();
  });
  </script>
</body>
</html>

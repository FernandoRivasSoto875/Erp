<?php
// Vista principal del formulario dinámico. Orquesta la carga del JSON y el renderizado visual.
/*
COPILOT_PROMPT (Lineamientos y requisitos para cualquier cambio en este archivo)
Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
 */
// Incluye helpers de renderizado y lógica adicional
require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';

// --- CARGA JSON FUENTE Y VARIABLES PRINCIPALES ---
// Carga el JSON fuente y extrae variables principales
$archivo_base = $_GET['json'] ?? $_POST['json'] ?? 'formulariogenerico2.json'; // Determina el archivo JSON a usar
$json_path = __DIR__ . '/json/' . $archivo_base;
$json_data = [];
if (file_exists($json_path)) {
  $json_raw = file_get_contents($json_path); // Lee el archivo JSON
  $json_data = json_decode($json_raw, true); // Decodifica el JSON
  if (json_last_error() !== JSON_ERROR_NONE) {
    $json_data = [];
  }
} else {
  $json_data = [];
}

// Extrae parámetros y configuraciones del JSON
$parametros = $json_data['parametros'] ?? [];
$fieldsets = $json_data['fieldsets'] ?? [];
$layout = $json_data['layout'] ?? [];
$botones_config = $parametros['botones'] ?? [];
$titulo_formulario = $parametros['titulo'] ?? 'Formulario Genérico';
$descripcion_formulario = $parametros['comentario'] ?? '';
$modoDiseno = isset($_GET['modoDiseno']) ? (bool)$_GET['modoDiseno'] : false;
?>
<body class="<?= $modoDiseno ? 'fd-design-mode' : '' ?>">
  <!-- Hoja de estilos principal del formulario dinámico -->
  <?php
    // Determina la hoja de estilos principal a usar
    $cssDefault = $parametros['CssDefault'] ?? 'formulariodinamico.css';
    $cssPath = 'css/' . $cssDefault;
    if (!file_exists(__DIR__ . '/css/' . $cssDefault)) {
      $cssPath = 'css/formulariodinamico.css';
    }
  ?>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="<?= $cssPath ?>">
  <!-- IMPORTANTE: Revisar el bloque COPILOT_PROMPT al inicio de este archivo para TODOS los lineamientos, reglas y requisitos de rediseño runtime. -->
  <div class="container-fluid py-2">
    <div class="d-flex justify-content-between align-items-center mb-3 design-toolbar">
      <div>
        <h4 class="m-0" id="fd-form-title"><?= htmlspecialchars($titulo_formulario) ?></h4>
        <?php if ($descripcion_formulario): ?>
          <small class="text-muted" id="fd-form-desc"><?= htmlspecialchars($descripcion_formulario) ?></small>
        <?php endif; ?>
      </div>
      <div class="d-flex align-items-center gap-2">
        <label class="form-check form-switch m-0">
          <input type="checkbox" class="form-check-input" id="designModeToggle" <?= $modoDiseno ? 'checked' : '' ?> aria-label="Activar modo diseño">
          <span class="form-check-label">Diseño</span>
        </label>
        <button type="button" class="btn btn-sm btn-outline-secondary <?= $modoDiseno ? '' : 'd-none' ?>" id="toggleTreeBtn">Árbol</button>
        <button type="button" class="btn btn-sm btn-primary <?= $modoDiseno ? '' : 'd-none' ?>" id="saveLayoutBtn" <?= $modoDiseno ? '' : 'disabled' ?>>Guardar</button>
      </div>
    </div>

    <!-- Botones flotantes para alternar vistas -->
    <div id="fd-float-btns" style="position:fixed;bottom:32px;right:32px;z-index:9999;display:flex;flex-direction:column;gap:12px;">
      <button id="btnShowTree" class="btn btn-outline-secondary shadow">Diseño Árbol</button>
      <button id="btnShowForm" class="btn btn-outline-primary shadow">Diseño Formulario</button>
    </div>

    <div class="fd-shell">
      <div class="fd-form-area">
    <?php
    require_once __DIR__ . '/formulariodinamicofunciones.php';
    $mainLayout = $json_data['layout']['main'];
    $tabsCount = isset($mainLayout['tabs']) && is_array($mainLayout['tabs']) ? count($mainLayout['tabs']) : 0;
    if ($tabsCount > 0 && ($mainLayout['type'] ?? '') === 'tabs') {
      // Solo renderizar los tabs y su contenido
      echo fd_render_tabs_section($mainLayout, $json_data['fieldsets']);
      // Renderizar los botones debajo de los tabs
      echo '<div class="mt-3">';
      $botones_config = is_array($botones_config) ? $botones_config : [];
      foreach ($botones_config as $b) {
        $txt    = htmlspecialchars($b['texto'] ?? 'Botón');
        $accion = $b['accion'] ?? 'submit';
        $cls    = htmlspecialchars($b['clase'] ?? 'btn-secondary');
        $type   = ($accion === 'reset' ? 'reset' : 'submit');
        echo "<button type=\"$type\" class=\"btn $cls\">$txt</button>";
      }
      if ($modoDiseno) {
        echo '<button type="button" class="btn btn-warning ms-2" id="btnDisenoExtra">Botón Diseño Activo</button>';
      }
      echo '</div>';
    } else {
      // Si no hay tabs, renderizar el layout completo como antes
      echo '<form id="formulariodinamico" data-layout-container class="mb-4">';
      $layout = is_array($layout) ? $layout : [];
      $fieldsets = is_array($fieldsets) ? $fieldsets : [];
      echo fd_render_layout_fallback($layout, $fieldsets);
      echo '<div class="mt-3">';
      $botones_config = is_array($botones_config) ? $botones_config : [];
      foreach ($botones_config as $b) {
        $txt    = htmlspecialchars($b['texto'] ?? 'Botón');
        $accion = $b['accion'] ?? 'submit';
        $cls    = htmlspecialchars($b['clase'] ?? 'btn-secondary');
        $type   = ($accion === 'reset' ? 'reset' : 'submit');
        echo "<button type=\"$type\" class=\"btn $cls\">$txt</button>";
      }
      if ($modoDiseno) {
        echo '<button type="button" class="btn btn-warning ms-2" id="btnDisenoExtra">Botón Diseño Activo</button>';
      }
      echo '</div>';
      echo '</form>';
    }
      // Cierre correcto de contenedores
      echo '</div>'; // fd-form-area
      echo '</div>'; // fd-shell
      echo '</div>'; // container-fluid

  <?php
    // Contenedor del árbol y nodo de datos
    echo '<div id="fd-json-tree-app" class="'.($modoDiseno ? '' : 'd-none').'" data-tree-app></div>';
    echo '<div id="fd-data"'
      .' data-json-file="'.htmlspecialchars($archivo_base ?? 'formulariogenerico2.json').'"'
      .' data-form-json=\''.htmlspecialchars(json_encode($json_data ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8").'\'></div>';
  ?>

  <!-- Scripts requeridos -->
  <!-- Scripts requeridos para render y diseño -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script src="js/formulariodinamico_v2.js"></script>
  <script src="js/formulariodinamico-init.js"></script>
</body>
</html>
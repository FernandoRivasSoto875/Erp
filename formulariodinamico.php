  <!-- ...existing code... -->
    <!-- Botones flotantes para alternar vistas -->
    <div id="fd-float-btns" style="position:fixed;bottom:32px;right:32px;z-index:9999;display:flex;flex-direction:column;gap:12px;">
      <button id="btnShowTree" class="btn btn-outline-secondary shadow">Diseño Árbol</button>
      <button id="btnShowForm" class="btn btn-outline-primary shadow">Diseño Formulario</button>
    </div>

    <div class="fd-shell">
      <div class="fd-form-area">
  <?php
  // Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
  // Cargar y decodificar el JSON del formulario
  $json_path = __DIR__ . '/json/formulariogenerico2.json';
  $json_data = [];
  if (file_exists($json_path)) {
    $json_str = file_get_contents($json_path);
    $json_data = json_decode($json_str, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      echo '<div class="alert alert-danger">Error al decodificar el JSON: '.json_last_error_msg().'</div>';
      $json_data = [];
    }
  } else {
    echo '<div class="alert alert-danger">No se encontró el archivo JSON: '.$json_path.'</div>';
  }
  require_once __DIR__ . '/formulariodinamicofunciones.php';
  // Inicializar variables clave
  $botones_config = $json_data['parametros']['botones'] ?? [];
  $modoDiseno = false;
  $layout = $json_data['layout'] ?? [];
  $fieldsets = $json_data['fieldsets'] ?? [];
  $mainLayout = $layout['main'] ?? [];
  $tabsCount = isset($mainLayout['tabs']) && is_array($mainLayout['tabs']) ? count($mainLayout['tabs']) : 0;
  if (empty($json_data) || empty($layout) || empty($fieldsets)) {
    echo '<div class="alert alert-warning">No hay datos suficientes para renderizar el formulario.</div>';
  } elseif ($tabsCount > 0 && ($mainLayout['type'] ?? '') === 'tabs') {
      // Renderizar tabs como nav-pills (botones)
      echo fd_render_tabs_section($mainLayout, $json_data['fieldsets'], true);
      // Botones debajo de los tabs
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
      // Mostrar los fieldsets no referenciados en los tabs
      $referenciados = [];
      foreach ($mainLayout['tabs'] as $tab) {
        foreach ($tab['rows'] as $row) {
          foreach ($row['columns'] as $col) {
            if (!empty($col['fieldset'])) $referenciados[] = $col['fieldset'];
          }
        }
      }
      $otros_fieldsets = array_diff(array_keys($json_data['fieldsets']), $referenciados);
      if (!empty($otros_fieldsets)) {
        echo '<div class="mt-4"><h5>Otros Fieldsets</h5>';
        foreach ($otros_fieldsets as $fs) {
          echo fd_render_fieldset_fallback($fs, $json_data['fieldsets'][$fs]);
        }
        echo '</div>';
      }
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
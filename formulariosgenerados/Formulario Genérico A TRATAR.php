<?php
// Archivo generado automáticamente a partir de formulariogenerico2.json
// Fecha de generación: 2025-08-13
// Título: Formulario Genérico A TRATAR

require_once __DIR__ . '/../formulariodinamicofunciones.php';
require_once __DIR__ . '/../formulariodinamicologica.php';

// Cargar datos JSON

$json_data = json_decode(file_get_contents(__DIR__ . '/../json/formulariogenerico2.json'), true);
$parametros = $json_data['parametros'] ?? [];
$fieldsets = $json_data['fieldsets'] ?? [];
$layout = $json_data['layout'] ?? [];
$botones_config = $parametros['botones'] ?? [];
$titulo_formulario = $parametros['titulo'] ?? '';
$descripcion_formulario = $parametros['comentario'] ?? '';
$archivo_base = 'formulariogenerico2.json';
$modoDiseno = false;

// Cargar CSS según CssDefault
$cssDefault = $parametros['CssDefault'] ?? 'formulariodinamico.css';
$cssPath = '../css/' . $cssDefault;
if (!file_exists(__DIR__ . '/../css/' . $cssDefault)) {
  $cssPath = '../css/formulariodinamico.css';
}
echo '<link rel="stylesheet" href="' . $cssPath . '" />';

?>
<body class="<?= $modoDiseno ? 'fd-design-mode' : '' ?>">
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
    <div class="fd-shell">
      <div class="fd-form-area">
        <form id="formulariodinamico" data-layout-container class="mb-4">
      <?php
      $layoutHtml = fd_render_layout_fallback($layout, $fieldsets);
      // Si el resultado es un JSON clasificado (de fd_render_tabs_section), decodificar y mostrar cada parte
      if (is_string($layoutHtml) && strpos($layoutHtml, '{"css":') === 0) {
        $layoutParts = json_decode($layoutHtml, true);
        if (!empty($layoutParts['css'])) {
          echo $layoutParts['css'];
        }
        if (!empty($layoutParts['tabs'])) {
          echo $layoutParts['tabs'];
        }
        if (!empty($layoutParts['panes'])) {
          foreach ($layoutParts['panes'] as $paneHtml) {
            echo $paneHtml;
          }
        }
      } else {
        echo $layoutHtml;
      }
      ?>
          <div class="mt-3">
            <?php foreach ($botones_config as $b):
              $txt    = htmlspecialchars($b['texto'] ?? 'Botón');
              $accion = $b['accion'] ?? 'submit';
              $cls    = htmlspecialchars($b['clase'] ?? 'btn-secondary');
              $type   = ($accion === 'reset' ? 'reset' : 'submit'); ?>
              <button type="<?= $type ?>" class="btn <?= $cls ?>"><?= $txt ?></button>
            <?php endforeach; ?>
            <?php if ($modoDiseno): ?>
              <button type="button" class="btn btn-warning ms-2" id="btnDisenoExtra">Botón Diseño Activo</button>
            <?php endif; ?>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div id="fd-json-tree-app" class="<?= $modoDiseno ? '' : 'd-none' ?>" data-tree-app></div>
  <div id="fd-data"
       data-json-file="<?= htmlspecialchars($archivo_base) ?>"
       data-form-json='<?= htmlspecialchars(json_encode($json_data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8") ?>'></div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script src="../js/formulariodinamico.js"></script>
  <script src="../js/formulariodinamico-float.js"></script>
</body>
</html>

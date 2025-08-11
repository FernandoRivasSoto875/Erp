<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$modoDiseno  = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1');

$archivo_base = 'formulariogenerico2.json';
$json_path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $archivo_base;
$json_text  = is_file($json_path) ? file_get_contents($json_path) : '{}';
$json_data  = json_decode($json_text, true) ?: [];

$params   = $json_data['parametros'] ?? [];
$fieldsets = $json_data['fieldsets'] ?? [];
$layout    = $json_data['layout'] ?? [];

$titulo_formulario      = $params['titulo']        ?? 'Formulario Dinámico';
$descripcion_formulario = $params['comentario']    ?? ($json_data['descripcion'] ?? '');
$css_default            = $params['CssDefault']    ?? '';
$botones_config         = $params['botones']       ?? [];

require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';

// Helper mínimo para fallback (si no existe motor de render)
function fd_render_field_simple($f) {
    $tipo = htmlspecialchars($f['tipo'] ?? $f['type'] ?? 'text');
    $name = htmlspecialchars($f['nombre'] ?? $f['name'] ?? '');
    $label= htmlspecialchars($f['etiqueta'] ?? $f['label'] ?? $name);
    $ph   = htmlspecialchars($f['placeholder'] ?? '');
    if ($tipo === 'hidden') {
        $val = htmlspecialchars($f['valor_predeterminado'] ?? $f['value'] ?? '');
        return "<input type='hidden' name='{$name}' value='{$val}'>";
    }
    $ctrl = "<input class='form-control' type='{$tipo}' name='{$name}' placeholder='{$ph}'>";
    if ($tipo === 'textarea') $ctrl = "<textarea class='form-control' name='{$name}' placeholder='{$ph}'></textarea>";
    return "<div class='mb-2 fd-field-wrapper' data-field-name='{$name}'>{$label}<br>{$ctrl}</div>";
}
function fd_render_fieldset_simple($nombre, $fs) {
    $titulo = htmlspecialchars($fs['titulo'] ?? $fs['legend'] ?? $nombre);
    $htmlCampos = '';
    foreach (($fs['campos'] ?? $fs['fields'] ?? []) as $c) {
        $htmlCampos .= fd_render_field_simple($c);
    }
    return "<fieldset class='mb-3 p-2 border rounded draggable-fieldset' data-fieldset-name='{$nombre}'><legend class='small m-0 px-1'>{$titulo}</legend>{$htmlCampos}</fieldset>";
}

// Fallback layout: si hay layout estructurado, idealmente usar funciones existentes del motor (no mostrado aquí).
function fd_render_layout_fallback($layout, $fieldsets) {
    if (!$layout || !is_array($layout)) {
        // Sin layout: listar todos los fieldsets uno debajo de otro
        $out = "<div class='row'><div class='col-12' data-col-width='12'>";
        foreach ($fieldsets as $k=>$fs) $out .= fd_render_fieldset_simple($k,$fs);
        $out .= "</div></div>";
        return $out;
    }
    // Layout con header/main/footer (estructura actual)
    $html = '';
    foreach (['header','main','footer'] as $zone) {
        if (!isset($layout[$zone])) continue;
        $block = $layout[$zone];
        $type  = $block['type'] ?? '';
        if ($type === 'tabs') {
            $tabs = $block['tabs'] ?? [];
            $nav = "<ul class='nav nav-tabs' role='tablist'>";
            $panes = "<div class='tab-content'>";
            foreach ($tabs as $i=>$tab) {
                $tabId = 'tab_'.$zone.'_'.$i;
                $active = $i===0 ? 'active' : '';
                $nav .= "<li class='nav-item'><a class='nav-link {$active}' data-bs-toggle='tab' href='#{$tabId}'>{$tab['title']}</a></li>";
                $panes .= "<div class='tab-pane fade ".($i===0?'show active':'')."' id='{$tabId}' data-dropzone='tab-pane'>";
                foreach ($tab['rows'] ?? [] as $row) {
                    $panes .= "<div class='row'>";
                    foreach ($row['columns'] ?? [] as $col) {
                        $w = (int)($col['width'] ?? 12);
                        $panes .= "<div class='col-12 col-md-{$w}' data-col-width='{$w}'>";
                        if (!empty($col['fieldset']) && isset($fieldsets[$col['fieldset']])) {
                            $panes .= fd_render_fieldset_simple($col['fieldset'], $fieldsets[$col['fieldset']]);
                        }
                        $panes .= "</div>";
                    }
                    $panes .= "</div>";
                }
                $panes .= "</div>";
            }
            $nav .= "</ul>";
            $panes .= "</div>";
            $html .= "<div class='fd-block-tabs mb-3' data-block-type='tabs'>{$nav}{$panes}</div>";
        } else {
            foreach ($block['rows'] ?? [] as $row) {
                $html .= "<div class='row'>";
                foreach ($row['columns'] ?? [] as $col) {
                    $w = (int)($col['width'] ?? 12);
                    $html .= "<div class='col-12 col-md-{$w}' data-col-width='{$w}'>";
                    if (!empty($col['fieldset']) && isset($fieldsets[$col['fieldset']])) {
                        $html .= fd_render_fieldset_simple($col['fieldset'], $fieldsets[$col['fieldset']]);
                    }
                    $html .= "</div>";
                }
                $html .= "</div>";
            }
        }
    }
    return $html;
}
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?php echo htmlspecialchars($titulo_formulario); ?></title>
  <?php if ($css_default): ?>
    <link rel="stylesheet" href="css/<?php echo htmlspecialchars($css_default); ?>">
  <?php endif; ?>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <style>
    body.design-mode .fd-json-tree-panel{display:block;}
    .design-toolbar{gap:.5rem;}
    fieldset.draggable-fieldset{cursor:move;}
  </style>
</head>
<body id="fd-root" class="<?php echo $modoDiseno?'design-mode':''; ?>">
<div class="container-fluid py-2">
  <div class="d-flex justify-content-between align-items-center mb-3 design-toolbar">
    <div>
      <h4 class="m-0" id="fd-form-title" data-editable="titulo-form"><?php echo htmlspecialchars($titulo_formulario); ?></h4>
      <?php if ($descripcion_formulario): ?>
        <small class="text-muted" id="fd-form-desc" data-editable="descripcion-form"><?php echo htmlspecialchars($descripcion_formulario); ?></small>
      <?php endif; ?>
    </div>
    <div>
      <label class="form-check form-switch">
        <input type="checkbox" class="form-check-input" id="designModeToggle" <?php echo $modoDiseno?'checked':''; ?>>
        <span class="form-check-label">Diseño</span>
      </label>
      <button type="button" class="btn btn-sm btn-primary ms-2" id="saveLayoutBtn" <?php echo $modoDiseno?'':'disabled'; ?>>Guardar diseño</button>
    </div>
  </div>

  <form id="formulariodinamico" data-layout-container class="mb-4">
    <?php echo fd_render_layout_fallback($layout, $fieldsets); ?>
    <div class="mt-3">
      <?php foreach ($botones_config as $b): 
        $txt = htmlspecialchars($b['texto'] ?? 'Botón');
        $acc = $b['accion'] ?? 'submit';
        $cls = htmlspecialchars($b['clase'] ?? 'btn-secondary');
        $type = ($acc === 'reset' ? 'reset' : 'submit');
      ?>
        <button type="<?php echo $type; ?>" class="btn <?php echo $cls; ?>"><?php echo $txt; ?></button>
      <?php endforeach; ?>
    </div>
  </form>

  <?php if ($modoDiseno): ?>
    <div id="elementos-fuera-container" class="border p-2 mb-5">
      <strong>Elementos fuera del formulario</strong>
      <div class="fd-out-items small text-muted">Arrastra fieldsets aquí</div>
    </div>
  <?php endif; ?>
</div>

<script>
document.getElementById('designModeToggle')?.addEventListener('change', function(){
  const url = new URL(window.location.href);
  url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
  window.location.href = url.toString();
});
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="js/fd-dnd-lite-min.js"></script>
</body>
</html>

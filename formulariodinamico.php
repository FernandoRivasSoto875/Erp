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
function fd_build_attr(array $attrs){
    $out = [];
    foreach ($attrs as $k=>$v){
        if ($v === null || $v === false || $v === '') continue;
        if ($v === true) { $out[] = $k; continue; }
        $out[] = $k . "='" . htmlspecialchars($v, ENT_QUOTES) . "'";
    }
    return $out ? ' '.implode(' ', $out) : '';
}
function fd_mask_to_pattern($mask){
    if (!$mask) return '';
    // Convierte # -> \d, A -> [A-Za-z], * -> .
    $p = '';
    for ($i=0;$i<strlen($mask);$i++){
        $c = $mask[$i];
        if ($c === '#') $p .= '\\d';
        elseif ($c === 'A') $p .= '[A-Za-z]';
        elseif ($c === '*') $p .= '.';
        else $p .= preg_quote($c,'/');
    }
    return '^'.$p.'$';
}
function fd_render_field($f){
    // Normaliza claves
    $tipo   = strtolower($f['tipo'] ?? $f['type'] ?? 'text');
    $nombre = $f['nombre'] ?? $f['name'] ?? '';
    $etiqueta = $f['etiqueta'] ?? $f['label'] ?? $nombre;
    $valorDef = $f['valor_predeterminado'] ?? $f['default'] ?? $f['value'] ?? '';
    $ph    = $f['placeholder'] ?? '';
    $ayuda = $f['ayuda'] ?? $f['help'] ?? '';
    $req   = !empty($f['obligatorio']) || !empty($f['required']);
    $ro    = !empty($f['readonly']);
    $dis   = !empty($f['disabled']);
    $min   = $f['min'] ?? null;
    $max   = $f['max'] ?? null;
    $step  = $f['step'] ?? null;
    $maxlen= $f['longitud'] ?? $f['maxlength'] ?? null;
    $mask  = $f['mascara'] ?? $f['mask'] ?? '';
    $pattern = fd_mask_to_pattern($mask);
    $opcs  = $f['opciones'] ?? $f['options'] ?? [];
    $id    = $f['id'] ?? ($nombre ? 'fld_'.$nombre : 'fld_'.uniqid());
    $classes = ['form-control'];
    if (in_array($tipo, ['checkbox','radio'])) $classes = ['form-check-input'];
    $wrapperClasses = ['mb-3','fd-field-wrapper','fd-field-tipo-'.$tipo];
    if ($req) $wrapperClasses[] = 'fd-required';
    $dataAttrs = [
        'data-field-name'=>$nombre,
        'data-field-tipo'=>$tipo,
        'data-required'=>$req?'1':'0',
        'data-mask'=>$mask ?: null
    ];
    $attr = [
        'type'=> in_array($tipo,['text','password','email','number','date','datetime','hidden']) ? ($tipo==='datetime'?'datetime-local':$tipo) : 'text',
        'name'=>$nombre,
        'id'=>$id,
        'class'=>implode(' ',$classes),
        'placeholder'=>$ph ?: null,
        'value'=>!in_array($tipo,['textarea','select','radio']) ? $valorDef : null,
        'required'=>$req,
        'readonly'=>$ro,
        'disabled'=>$dis,
        'min'=>$min,
        'max'=>$max,
        'step'=>$step,
        'maxlength'=>$maxlen,
        'pattern'=>$pattern ?: null,
        'autocomplete'=>'off'
    ];
    // Campo hidden directo
    if ($tipo === 'hidden'){
        return "<input ".fd_build_attr($attr).">";
    }
    // Label
    $labelHtml = "<label for='".htmlspecialchars($id,ENT_QUOTES)."' class='form-label mb-1'>"
                .htmlspecialchars($etiqueta)
                .($req?" <span class='text-danger'>*</span>":'')
                ."</label>";
    $controlHtml = '';
    if ($tipo === 'textarea'){
        $controlHtml = "<textarea ".fd_build_attr(array_diff_key($attr,['type'=>1,'value'=>1])).">".htmlspecialchars($valorDef)."</textarea>";
    } elseif ($tipo === 'select'){
        $optionsHtml = '';
        // Opciones: puede ser lista de strings o array key=>label
        if ($opcs && is_array($opcs)){
            foreach ($opcs as $k=>$v){
                if (is_array($v) && isset($v['valor'])) { // caso [{valor:.., texto:..}]
                    $val = $v['valor']; $txt = $v['texto'] ?? $v['label'] ?? $val;
                } else {
                    $val = is_int($k)? $v : $k;
                    $txt = is_int($k)? $v : $v;
                }
                $sel = ((string)$val === (string)$valorDef) ? " selected" : "";
                $optionsHtml .= "<option value='".htmlspecialchars($val,ENT_QUOTES)."'{$sel}>".htmlspecialchars($txt)."</option>";
            }
        }
        $controlHtml = "<select ".fd_build_attr(array_diff_key($attr,['type'=>1,'value'=>1])).">{$optionsHtml}</select>";
    } elseif ($tipo === 'checkbox'){
        // Para checkbox ponemos el label al lado
        $attr['class'] = 'form-check-input';
        $attr['value'] = $valorDef ?: '1';
        if (!empty($f['checked']) || (string)$valorDef==='1') $attr['checked']=true;
        $controlHtml = "<div class='form-check'>"
                      ."<input ".fd_build_attr($attr)."> "
                      ."<label class='form-check-label' for='".htmlspecialchars($id,ENT_QUOTES)."'>".htmlspecialchars($etiqueta).($req?" *":"")."</label>"
                      ."</div>";
        $labelHtml = ''; // ya incluido
    } elseif ($tipo === 'radio'){
        // Radio group: opciones obligatorias
        $groupHtml = '';
        if ($opcs && is_array($opcs)){
            foreach ($opcs as $k=>$v){
                $val = is_int($k)? $v : $k;
                $txt = is_int($k)? $v : $v;
                $rid = $id.'_'.$val;
                $ra = [
                  'type'=>'radio',
                  'name'=>$nombre,
                  'id'=>$rid,
                  'class'=>'form-check-input',
                  'value'=>$val,
                  'required'=>$req && empty($groupHtml)
                ];
                if ((string)$val === (string)$valorDef) $ra['checked']=true;
                $groupHtml .= "<div class='form-check form-check-inline'>"
                             ."<input ".fd_build_attr($ra).">"
                             ."<label for='".htmlspecialchars($rid,ENT_QUOTES)."' class='form-check-label ms-1'>".htmlspecialchars($txt)."</label>"
                             ."</div>";
            }
        }
        $controlHtml = $groupHtml;
    } else {
        // input estándar
        $controlHtml = "<input ".fd_build_attr($attr).">";
    }
    $helpHtml = $ayuda ? "<div class='form-text'>".htmlspecialchars($ayuda)."</div>" : '';
    $errorSlot = "<div class='invalid-feedback'></div>";
    $wrapperAttr = fd_build_attr($dataAttrs);
    return "<div class='".implode(' ',$wrapperClasses)."' {$wrapperAttr}>{$labelHtml}{$controlHtml}{$helpHtml}{$errorSlot}</div>";
}
function fd_render_fieldset_simple($nombre, $fs){
    $titulo = htmlspecialchars($fs['titulo'] ?? $fs['legend'] ?? $nombre);
    $campos = $fs['campos'] ?? $fs['fields'] ?? [];
    $htmlCampos = '';
    foreach ($campos as $c){
        $htmlCampos .= fd_render_field($c);
    }
    return "<fieldset class='mb-3 p-2 border rounded draggable-fieldset' data-group-id='".htmlspecialchars($nombre,ENT_QUOTES)."' data-fieldset-name='".htmlspecialchars($nombre,ENT_QUOTES)."'>"
          . "<legend class='small m-0 px-1'>".$titulo."</legend>"
          . $htmlCampos
          . "</fieldset>";
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
<script>
(function(){
  const form = document.getElementById('formulariodinamico');
  if (!form) return;
  form.addEventListener('submit', function(e){
    if (!form.checkValidity()){
      e.preventDefault();
      e.stopPropagation();
      form.querySelectorAll(':invalid').forEach(inp=>{
        const wrap = inp.closest('.fd-field-wrapper');
        if (wrap){
          wrap.classList.add('was-validated');
          const fb = wrap.querySelector('.invalid-feedback');
          if (fb && !fb.textContent.trim()) {
            fb.textContent = inp.validationMessage;
          }
        }
      });
    }
  });
  // Mostrar feedback en blur
  form.addEventListener('blur', function(e){
    const inp = e.target;
    if (inp.matches('input,select,textarea')){
      const wrap = inp.closest('.fd-field-wrapper');
      if (wrap){
        const fb = wrap.querySelector('.invalid-feedback');
        if (!inp.checkValidity()){
          wrap.classList.add('was-validated');
          if (fb) fb.textContent = inp.validationMessage;
        } else {
          if (fb) fb.textContent = '';
        }
      }
    }
  }, true);
})();
</script>
</body>
</html>

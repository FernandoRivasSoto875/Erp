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
        'data-field-type'=>$tipo,   // <-- añadido
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
    $typeFs = htmlspecialchars($fs['tipo'] ?? $fs['type'] ?? 'group', ENT_QUOTES);
    return "<fieldset class='mb-3 p-2 border rounded draggable-fieldset' data-group-id='".htmlspecialchars($nombre,ENT_QUOTES)."' data-fieldset-name='".htmlspecialchars($nombre,ENT_QUOTES)."' data-fieldset-type='{$typeFs}'>"
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
    .fd-shell{display:flex;align-items:flex-start;gap:1rem;}
    .fd-form-area{flex:1 1 auto;min-width:0;}
    #fd-tree-side{
      width:320px;max-width:320px;background:#f8f9fa;border:1px solid #dee2e6;
      border-radius:6px;padding:8px;display:flex;flex-direction:column;
    }
    #fd-tree-side.hidden{display:none!important;}
    #fd-tree-side h6{font-size:.85rem;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5rem;}
    #fd-tree-toolbar{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}
    #fd-tree-toolbar button{font-size:.7rem;}
    #fd-tree{flex:1 1 auto;overflow:auto;font-size:.78rem;line-height:1.2;}
    #fd-tree ul{list-style:none;margin:0;padding-left:14px;}
    #fd-tree li{margin:2px 0;}
    #fd-tree .g-title{display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:4px;cursor:pointer;background:#fff;}
    #fd-tree .g-title:hover{background:#eef2ff;}
    #fd-tree .f-item{display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:4px;cursor:grab;}
    #fd-tree .f-item:hover{background:#f1f3fb;}
    #fd-tree .handle{background:#6f42c1;color:#fff;border-radius:4px;padding:0 5px;font-weight:600;cursor:grab;line-height:1.1;}
    #fd-tree .actions button{border:none;background:transparent;color:#666;padding:0 2px;font-size:.75rem;cursor:pointer;}
    #fd-tree .actions button:hover{color:#000;}
    #fd-tree .collapsed > ul{display:none;}
    /* Grips form (ya en modo diseño) */
    #fd-root.design-mode .fd-dnd-grip,#fd-root.design-mode .fd-group-grip,#fd-root.design-mode .fd-tab-grip{
      cursor:grab;display:inline-block;margin-right:6px;background:#198754;color:#fff;border-radius:4px;padding:0 6px;font-weight:600;line-height:1.2;
    }
    #fd-tree .ico{width:16px;text-align:center;color:#6c757d;font-size:.7rem;}
    #fd-tree .fd-tree-field .ico{color:#845ef7;}
    #fd-tree .fd-tree-group .ico{color:#0d6efd;}
    #fd-tree-side .nav-link{padding:.25rem .5rem;}
    #fd-tree-side .nav-link.active{background:#fff;}
    /* JSON tree */
    #fd-json-tree{max-height:60vh;overflow:auto;font-size:.72rem;font-family:ui-monospace,monospace;line-height:1.25;}
    .fd-json-tree ul{list-style:none;margin:0;padding-left:16px;}
    .fd-json-tree li{margin:1px 0;position:relative;}
    .fd-json-node{display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:3px;}
    .fd-json-node:hover{background:#eef5ff;}
    .fd-json-node.selected{background:#ffe9b5;}
    .fd-json-toggle{cursor:pointer;color:#0d6efd;font-weight:600;width:12px;text-align:center;}
    .fd-json-toggle.empty{color:#ccc;cursor:default;}
    .fd-json-key{color:#7c4d00;font-weight:600;}
    .fd-json-type-object>.fd-json-key:after{content:" (obj)";color:#999;font-weight:400;font-size:.6rem;}
    .fd-json-type-array>.fd-json-key:after{content:" (arr)";color:#999;font-weight:400;font-size:.6rem;}
    .fd-json-value{color:#1d4e89;flex:1;min-width:40px;cursor:pointer;}
    .fd-json-value.fd-type-string:before{content:'"';color:#999;}
    .fd-json-value.fd-type-string:after{content:'"';color:#999;}
    .fd-json-value.fd-editing{background:#fff3cd;border:1px solid #ffec99;padding:0 2px;border-radius:2px;}
    .fd-json-actions button{border:none;background:transparent;color:#666;padding:0 3px;font-size:.65rem;cursor:pointer;}
    .fd-json-actions button:hover{color:#000;}
    .fd-json-badge{background:#dee2e6;color:#555;font-size:.55rem;padding:1px 4px;border-radius:10px;}
    .fd-json-dirty:after{content:"*";color:#d6336c;margin-left:2px;font-weight:700;}
  </style>
</head>
<body>
  <div id="fd-root" class="<?php echo $modoDiseno?'design-mode':''; ?>">
    <!-- (elimina aquí el label/checkbox duplicado) -->
  </div>

  <!-- Botón/árbol aparecerán aquí -->
  <div class="container-fluid py-2">
    <div class="d-flex justify-content-between align-items-center mb-3 design-toolbar">
      <div>
        <h4 class="m-0" id="fd-form-title" data-editable="titulo-form"><?php echo htmlspecialchars($titulo_formulario); ?></h4>
        <?php if ($descripcion_formulario): ?>
          <small class="text-muted" id="fd-form-desc" data-editable="descripcion-form"><?php echo htmlspecialchars($descripcion_formulario); ?></small>
        <?php endif; ?>
      </div>
      <div class="d-flex align-items-center gap-3">
        <label class="form-check form-switch m-0">
          <input type="checkbox" class="form-check-input" id="designModeToggle" <?php echo $modoDiseno?'checked':''; ?>>
          <span class="form-check-label">Modo diseño</span>
        </label>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="toggleTreeBtn">Árbol</button>
        <button type="button" class="btn btn-sm btn-primary" id="saveLayoutBtn" <?php echo $modoDiseno?'':'disabled'; ?>>Guardar</button>
      </div>
    </div>

    <div class="fd-shell">
      <div class="fd-form-area">
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
      </div>
      <div id="fd-tree-side" class="<?php echo $modoDiseno ? '' : 'hidden'; ?>">
        <h6 class="d-flex justify-content-between align-items-center mb-2">
          Diseñador
          <button type="button" id="closeTree" class="btn btn-sm btn-outline-secondary py-0 px-1" style="font-size:.6rem;">×</button>
        </h6>
        <ul class="nav nav-tabs nav-sm mb-2" id="fd-side-tabs" style="font-size:.7rem;">
          <li class="nav-item"><button class="nav-link active" data-tab="form">Formulario</button></li>
          <li class="nav-item"><button class="nav-link" data-tab="json">JSON</button></li>
        </ul>
        <div class="mb-2">
          <input type="text" id="fd-tree-filter" class="form-control form-control-sm" placeholder="Filtrar...">
        </div>

        <!-- Contenido Formulario (estructura visual) -->
        <div id="fd-tree-wrapper-form">
          <div id="fd-tree"></div>
        </div>

        <!-- Contenido JSON -->
        <div id="fd-tree-wrapper-json" class="d-none">
          <div class="d-flex gap-2 mb-2">
            <button id="fd-json-expand" class="btn btn-light btn-sm">Expandir</button>
            <button id="fd-json-collapse" class="btn btn-light btn-sm">Colapsar</button>
            <button id="fd-json-save" class="btn btn-primary btn-sm" disabled>Guardar JSON</button>
          </div>
          <div id="fd-json-tree" class="fd-json-tree"></div>
        </div>
      </div>
    </div>
  </div>

  <link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
  integrity="sha512-DTOQO9RWCH3ppGqcWaEA1B4..."
  crossorigin="anonymous" referrerpolicy="no-referrer">
<script>
  // Preferente: inyectar el JSON ya parseado en PHP
  window.FORM_JSON = <?php echo json_encode($json_data ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;

  // Fallback: si no existe en PHP, que el front lo cargue desde archivo
  window.FORM_CONFIG = window.FORM_CONFIG || { archivo_json: 'json/formulariogenerico2.json' };
</script>
  <script>
(function(){
  const root  = document.getElementById('fd-root');
  const toggle= document.getElementById('designModeToggle');
  const saveBtn = document.getElementById('saveLayoutBtn');

  function ensureTreePanel(){
    if (!document.getElementById('json-tree-panel') && root.classList.contains('design-mode')){
      const div = document.createElement('div');
      div.id = 'json-tree-panel';
      root.appendChild(div);
    }
  }

  // Builder simple si no existe renderJsonTreeFromForm (fallback)
  if (!window.renderJsonTreeFromForm){
    window.renderJsonTreeFromForm = function(){
      const panel = document.getElementById('json-tree-panel');
      if (!panel) return;
      panel.innerHTML = '';
      const groups = root.querySelectorAll('fieldset, .card, .panel, .fd-fieldset');
      if (!groups.length){ panel.innerHTML = '<div class="text-muted small">Sin grupos</div>'; return; }
      const ul = document.createElement('ul');
      groups.forEach(g=>{
        const gid = g.getAttribute('data-group-id') || g.id || 'g_'+Math.random().toString(36).slice(2,8);
        if (!g.getAttribute('data-group-id')) g.setAttribute('data-group-id', gid);
        const liG = document.createElement('li');
        liG.setAttribute('data-node','group');
        liG.setAttribute('data-id', gid);
        const title = document.createElement('div');
        title.className='title';
        title.textContent = (g.querySelector(':scope > legend, :scope > .card-header')?.textContent||gid).trim();
        liG.appendChild(title);
        const fieldsWrap = document.createElement('div');
        fieldsWrap.setAttribute('data-node','fields');
        fieldsWrap.setAttribute('data-id', gid);
        const list = document.createElement('ul');
        list.className='node-fields-list';
        list.setAttribute('data-id', gid);
        Array.from((g.querySelector(':scope > .card-body, :scope > .fd-fields-container')||g).children)
          .filter(ch=> !!ch.querySelector?.('input,select,textarea,[name],[data-name]') &&
                        !ch.matches('fieldset,.card,.panel,.fd-fieldset'))
          .forEach(w=>{
            const fid = w.getAttribute('data-field-id') ||
              w.querySelector('[name]')?.getAttribute('name') ||
              w.querySelector('[id]')?.getAttribute('id') ||
              'f_'+Math.random().toString(36).slice(2,8);
            if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);
            const liF = document.createElement('li');
            liF.setAttribute('data-node','field');
            liF.setAttribute('data-id', fid);
            const h = document.createElement('span');
            h.className='handle';
            h.textContent='⋮⋮';
            liF.appendChild(h);
            const lbl = w.querySelector('label')?.textContent || fid;
            liF.appendChild(document.createTextNode(' '+lbl.trim()));
            list.appendChild(liF);
          });
        fieldsWrap.appendChild(list);
        liG.appendChild(fieldsWrap);
        ul.appendChild(liG);
      });
      panel.appendChild(ul);
      // Re-engancha DnD del árbol si fd-dnd-lite lo soporta
      window.fdDndLiteRefresh && window.fdDndLiteRefresh();
    };
  }

  function enterDesign(on){
    root.classList.toggle('design-mode', on);
    saveBtn && (saveBtn.disabled = !on);
    ensureTreePanel();
    window.dispatchEvent(new CustomEvent('design-mode-changed',{detail:{on}}));
    if (on){
      window.fdDndLiteRefresh && window.fdDndLiteRefresh();
      window.renderJsonTreeFromForm && window.renderJsonTreeFromForm();
    } else {
      // Limpio grips visuales si quieres (opcional)
    }
  }

  if (toggle){
    toggle.addEventListener('change', ()=> enterDesign(toggle.checked));
    // Sin recargar por querystring
  }

  // Estado inicial
  if (toggle?.checked){
    enterDesign(true);
  }

  // Click títulos del árbol para colapsar
  document.addEventListener('click', e=>{
    const t = e.target.closest('#json-tree-panel [data-node="group"] > .title');
    if (t) t.parentElement.classList.toggle('collapsed');
  });

})();
</script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script src="js/fd-dnd-lite-min.js"></script>
  <script src="js/fd-tree-side.js"></script>
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

<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$modoDiseno  = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1');

$archivo_base = 'formulariogenerico2.json';
$json_path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $archivo_base;
$json_text  = is_file($json_path) ? file_get_contents($json_path) : '{}';
$json_data  = json_decode($json_text, true) ?: [];

$titulo_formulario      = $json_data['titulo']        ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion']   ?? '';
$fieldsets              = $json_data['fieldsets']     ?? [];
$layout                 = $json_data['layout']        ?? []; // si define tabs / orden
$params                 = $json_data['parametros']    ?? [];

require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';

/*
  NOTA:
  - Si ya tienes un motor que imprime el formulario (tabs + fieldsets + campos),
    úsalo dentro de <div id="fd-root"> y elimina el ejemplo mínimo.
  - Este ejemplo mínimo crea 1 tab y 2 fieldsets de muestra si no hay layout.
*/
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Formulario Dinámico</title>

  <!-- Bootstrap 5 CSS (única vez) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
        crossorigin="anonymous">

  <!-- (Opcional) tu CSS propio después -->
  <style>
    /* Ajustes propios */
    #json-tree-panel ul{ list-style:none; margin:0; padding-left:16px; }
    #json-tree-panel [data-node="group"]{ margin:4px 0; }
    #json-tree-panel [data-node="group"] > .title{ cursor:pointer; user-select:none; padding:2px 4px; border-radius:4px; }
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
    /* Espacio para grips en modo diseño (opcional) */
    #fd-root.design-mode fieldset, 
    #fd-root.design-mode .card{ scroll-margin-top:60px; }
  </style>
</head>
<body>

<div class="container-fluid py-2">
  <div class="d-flex justify-content-between align-items-center">
    <h5 class="mb-0"><?= htmlspecialchars($titulo_formulario) ?></h5>
    <div id="fd-design-toolbar">
      <label class="form-check-label" style="display:inline-flex;align-items:center;gap:6px;">
        <input type="checkbox" id="designModeToggle" class="form-check-input" <?= $modoDiseno?'checked':''; ?>> Modo diseño
      </label>
      <a href="?<?= http_build_query(array_merge($_GET,['modoDiseno'=>$modoDiseno?0:1])) ?>" class="btn btn-sm btn-outline-secondary ms-2">
        <?= $modoDiseno?'Salir diseño':'Entrar diseño' ?>
      </a>
    </div>
  </div>
  <?php if ($descripcion_formulario): ?>
    <p class="text-muted small mb-2"><?= htmlspecialchars($descripcion_formulario) ?></p>
  <?php endif; ?>

  <div id="fd-root" class="<?= $modoDiseno?'design-mode':'' ?>">
    <ul class="nav nav-tabs" id="mainTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active"
                id="tabA-tab"
                data-bs-toggle="tab"
                data-bs-target="#tabA"
                type="button"
                role="tab"
                aria-controls="tabA"
                aria-selected="true">Tab A</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link"
                id="tabB-tab"
                data-bs-toggle="tab"
                data-bs-target="#tabB"
                type="button"
                role="tab"
                aria-controls="tabB"
                aria-selected="false">Tab B</button>
      </li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active p-3" id="tabA" role="tabpanel" aria-labelledby="tabA-tab">
        <fieldset id="fsCliente"><legend>Cliente</legend>
          <div class="mb-3"><label class="form-label">Nombre</label><input class="form-control" name="nombre"></div>
        </fieldset>
      </div>
      <div class="tab-pane fade p-3" id="tabB" role="tabpanel" aria-labelledby="tabB-tab">
        <fieldset id="fsDireccion"><legend>Dirección</legend>
          <div class="mb-3"><label class="form-label">Ciudad</label><input class="form-control" name="ciudad"></div>
        </fieldset>
      </div>
    </div>
  </div>

  <hr>
  <h6 class="mt-3">Árbol (estructura)</h6>
  <div id="json-tree-panel"></div>
</div>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="js/fd-tree-config.js"></script>
<script src="js/fd-dnd-lite.js"></script>
<script src="js/fd-tree-render.js"></script>
<script>
  // Toggle modo diseño
  (function(){
    const root = document.getElementById('fd-root');
    const toggle = document.getElementById('designModeToggle');
    function emit(on){ window.dispatchEvent(new CustomEvent('design-mode-changed',{detail:{on}})); }
    function refresh(){ window.fdDndLiteRefresh && window.fdDndLiteRefresh(); }
    if (toggle){
      toggle.addEventListener('change', function(){
        root.classList.toggle('design-mode', this.checked);
        emit(this.checked); refresh();
      });
    }
    document.addEventListener('DOMContentLoaded', ()=>{
      window.renderJsonTreeFromForm && window.renderJsonTreeFromForm();
      // Verificación Bootstrap:
      console.log('[Bootstrap test] nav-tabs:', !!document.querySelector('.nav.nav-tabs'),
                  ' Version JS:', bootstrap?.Tooltip ? 'OK' : 'NO');
    });
  })();
</script>
</body>
</html>

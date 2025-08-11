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
<meta charset="UTF-8">
<title><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Consejo: alinea Bootstrap (usa 5.x en CSS y JS o 4.x en ambos) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"/>
<style>
  /* Oculta todo lo de diseño cuando no está activo */
  #fd-root:not(.design-mode) .fd-design-only,
  #fd-root:not(.design-mode) [data-design-only="true"],
  #fd-root:not(.design-mode) .fd-dnd-handle { display:none !important; }
  /* Estilo básico de árbol */
  #json-tree-panel ul{ list-style:none; margin:0; padding-left:16px; }
  #json-tree-panel [data-node="group"]{ margin:4px 0; }
  #json-tree-panel [data-node="group"] > .title{
    cursor:pointer; user-select:none; padding:2px 4px; border-radius:4px;
  }
  #json-tree-panel [data-node="group"] > .title:hover{ background:#f3f4f6; }
  /* Caret ▾/▸ */
  #json-tree-panel [data-node="group"] > .title::before{
    content:"▾"; margin-right:6px; color:#6b7280;
  }
  #json-tree-panel [data-node="group"].collapsed > .title::before{ content:"▸"; }
  #json-tree-panel [data-node="group"].collapsed > [data-node="fields"]{ display:none; }

  /* Ítems de campo */
  #json-tree-panel [data-node="field"]{
    padding:2px 4px; border-radius:4px; margin:2px 0;
  }
  #json-tree-panel [data-node="field"]:hover{ background:#f8fafc; }
  /* Grip en el árbol si usas .handle */
  #json-tree-panel .handle{
    display:inline-block; margin-right:6px; background:#6f42c1; color:#fff;
    border-radius:4px; padding:0 6px; font-weight:600; line-height:1.2;
  }
  /* Lista donde caen los campos (admite drop cuando está vacía) */
  #json-tree-panel .node-fields-list{ min-height:14px; padding:4px; border:1px dashed rgba(111,66,193,.25); border-radius:4px; }
</style>
</head>
<body>
  <!-- Wrapper único del formulario dinámico -->
  <?php
$modoDiseno = isset($modoDiseno) ? (bool)$modoDiseno : (isset($_GET['design']) && $_GET['design']=='1');
?>
<div id="fd-root" class="<?php echo $modoDiseno ? 'design-mode' : '' ?>">
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

<div id="fd-design-toggle" style="position:fixed;bottom:12px;right:12px;z-index:1050;background:#fff;padding:6px 10px;border:1px solid #ddd;border-radius:6px;">
  <label><input type="checkbox" id="designModeToggle" <?php echo $modoDiseno ? 'checked' : ''; ?>> Modo diseño</label>
</div>

<!-- Ocultar SIEMPRE el icono de lápiz en el formulario (no afecta al árbol) -->
<style id="fd-hide-pencil-form">
  #fd-root .fd-edit-btn,
  #fd-root .fd-field-edit,
  #fd-root .field-edit-btn,
  #fd-root [data-action="edit-field"],
  #fd-root .btn-edit,
  #fd-root .icon-edit,
  #fd-root .fa-pencil,
  #fd-root .fa-pencil-alt { display:none !important; }
</style>

<script>
  // Bloquea cualquier “lápiz” que se inyecte dinámicamente
  (function(){
    const SEL = '.fd-edit-btn, .fd-field-edit, .field-edit-btn, [data-action="edit-field"], .btn-edit, .icon-edit, .fa-pencil, .fa-pencil-alt';
    function init(){
      const root = document.getElementById('fd-root');
      if (!root) return;
      root.querySelectorAll(SEL).forEach(el => el.remove());
      root.addEventListener('click', e=>{
        if (e.target.closest(SEL)){ e.preventDefault(); e.stopPropagation(); }
      }, true);
      new MutationObserver(muts=>{
        muts.forEach(m=>{
          m.addedNodes.forEach(n=>{
            if (n.nodeType!==1) return;
            if (n.matches?.(SEL)) n.remove();
            n.querySelectorAll?.(SEL).forEach(el=> el.remove());
          });
        });
      }).observe(root, { childList:true, subtree:true });
    }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  })();
</script>

<?php /* Variables globales del formulario */ ?>
<script>
  window.FORM_CONFIG = { archivo_json: <?php echo json_encode($archivo_base ?? 'formulariogenerico2.json'); ?> };
  window.formularioJsonOriginal = <?php echo json_encode($json_data ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
</script>

<!-- Dependencias (cargar ANTES del runtime DnD y de forma síncrona) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  if (!window.bootstrap) {
    document.write('<script src="js/lib/bootstrap.bundle.min.js"><\/script>');
  }
</script>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="js/fd-tree-config.js"></script>
<script src="js/fd-dnd-lite.js"></script>

<script>
  (function(){
    const root = document.getElementById('fd-root');
    const toggle = document.getElementById('designModeToggle');
    function emit(on){ window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } })); }
    function refresh(){ if (root?.classList.contains('design-mode')) { window.fdDndLiteRefresh && window.fdDndLiteRefresh(); } }
    emit(root?.classList.contains('design-mode'));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
    window.addEventListener('load', refresh);
    toggle?.addEventListener('change', function(){
      root?.classList.toggle('design-mode', this.checked);
      emit(this.checked); refresh();
    });
  })();
</script>

<div id="json-tree-panel">
  <!-- tu árbol se renderiza aquí -->
</div>

<script>
  // Toggle básico: colapsa/expande los grupos al hacer click en .title
  document.addEventListener('click', function(e){
    const t = e.target.closest('#json-tree-panel [data-node="group"] > .title');
    if (!t) return;
    t.parentElement.classList.toggle('collapsed');
  });
</script>
<!-- Sortable + config del árbol + DnD -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="js/fd-tree-config.js"></script>
<script src="js/fd-dnd-lite.js"></script>

<!-- Eliminar duplicados: NO vuelvas a renderizar #fd-root ni el estilo del lápiz más abajo -->
</body>
</html>

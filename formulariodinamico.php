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
</style>
</head>
<body>
  <!-- Wrapper único del formulario dinámico -->
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

  <!-- Toggle visible (debug) -->
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
  <script>
    if (typeof window.Sortable !== 'function') {
      document.write('<script src="js/lib/Sortable.min.js"><\/script>');
    }
  </script>

  <!-- Quitar estos si estaban: form-bootstrap-enhancer.js (opcional puedes dejarlo), form-runtime-dnd.js y el bloque inline de DnD -->
  <!-- <script src="js/form-runtime-dnd.js"></script> -->

  <!-- Nuevo runtime ligero -->
  <script src="js/fd-dnd-lite.js"></script>

  <script>
    // Activación de modo diseño + diagnóstico
    (function(){
      const root   = document.getElementById('fd-root');
      const toggle = document.getElementById('designModeToggle');

      function emit(on){
        console.info('[FD] design-mode-changed =>', on);
        window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } }));
      }
      function refresh(){
        const on = root?.classList.contains('design-mode');
        console.info('[FD] refresh. design?', on, 'Sortable?', typeof window.Sortable, 'lite?', typeof window.fdDndLiteRefresh);
        if (on) { window.fdDndLiteRefresh && window.fdDndLiteRefresh(); }
      }

      // Chequeos básicos
      (function(){
        const count = document.querySelectorAll('#fd-root').length;
        if (count !== 1) console.error('[FD] #fd-root duplicado/ausente. count =', count);
        if (!root) console.error('[FD] Falta #fd-root');
        if (!toggle) console.warn('[FD] Falta #designModeToggle');
      })();

      // Estado inicial
      emit(root?.classList.contains('design-mode'));
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
      } else {
        refresh();
      }
      window.addEventListener('load', refresh);

      // Toggle
      toggle?.addEventListener('change', function(){
        if (!root) return;
        root.classList.toggle('design-mode', this.checked);
        emit(this.checked);
        refresh();
      });

      // Reenganchar en render dinámico
      const formContainer = document.getElementById('form-container');
      if (formContainer){
        new MutationObserver(()=> refresh()).observe(formContainer, { childList:true, subtree:true });
      }

      // Comando de consola para verificar en runtime
      window.fdDebug = function(){
        console.log('[FD] debug:', {
          rootExists: !!root,
          design: root?.classList.contains('design-mode'),
          sortable: typeof window.Sortable,
          lite: typeof window.fdDndLiteRefresh
        });
      };
    })();
  </script>

  <script src="js/json-tree-panel.js"></script>

  <!-- Eliminar duplicados: NO vuelvas a renderizar #fd-root ni el estilo del lápiz más abajo -->
</body>
</html>

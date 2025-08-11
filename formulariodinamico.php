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
  <div id="fd-root" class="<?php echo !empty($modoDiseno) ? 'design-mode' : '' ?>">
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

  <!-- Toggle modo diseño (opcional) -->
  <div style="position:fixed;bottom:12px;right:12px;z-index:1055;">
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

  <!-- Dependencias para tabs y DnD (después de renderizar el formulario) -->
  <!-- Bootstrap (con fallback local opcional) -->
  <script>
    (function(){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
      s.defer = true;
      s.onerror = function(){
        var b = document.createElement('script');
        b.src = 'js/lib/bootstrap.bundle.min.js'; // coloca aquí una copia local
        b.defer = true;
        document.head.appendChild(b);
      };
      document.head.appendChild(s);
    })();
  </script>

  <!-- SortableJS con fallback local (NECESARIO para DnD de fields/tabs) -->
  <script>
    (function(){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js';
      s.defer = true;
      s.onerror = function(){
        var s2 = document.createElement('script');
        s2.src = 'js/lib/Sortable.min.js'; // coloca aquí una copia local
        s2.defer = true;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    })();
  </script>

  <!-- Opcional: estilos Bootstrap al HTML generado -->
  <script src="js/form-bootstrap-enhancer.js" defer></script>

  <!-- DnD del formulario -->
  <script src="js/form-runtime-dnd.js" defer></script>

  <script>
    (function(){
      const root = document.getElementById('fd-root');
      const toggle = document.getElementById('designModeToggle');
      const container = document.getElementById('form-container');

      function emit(on){
        window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } }));
      }
      function refreshIfDesign(){
        if (!root?.classList.contains('design-mode')) return;
        // Espera a que Sortable y el runtime estén listos
        let tries = 0;
        (function wait(){
          if (window.Sortable && window.formRuntimeDndRefresh){
            window.formRuntimeDndRefresh();
          } else if (tries++ < 50) {
            setTimeout(wait, 100);
          } else {
            console.warn('[FD] Falta Sortable o form-runtime-dnd.js');
          }
        })();
      }

      // Estado inicial + refresh
      emit(root?.classList.contains('design-mode'));
      refreshIfDesign();

      toggle?.addEventListener('change', function(){
        root?.classList.toggle('design-mode', this.checked);
        emit(this.checked);
        refreshIfDesign();
      });

      // Re-render runtime: vuelve a inicializar DnD
      if (container){
        const mo = new MutationObserver(()=> refreshIfDesign());
        mo.observe(container, { childList:true, subtree:true });
      }
    })();
  </script>

  <script src="js/json-tree-panel.js"></script>

  <!-- Eliminar duplicados: NO vuelvas a renderizar #fd-root ni el estilo del lápiz más abajo -->
</body>
</html>

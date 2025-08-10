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
            echo '<div class="alert alert-warning">Falta la función generarLayout(). Incluye [formulariodinamicologica.php](http://_vscodecontentref_/0) con las funciones de render.</div>';
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
    /* Oculta cualquier botón/ícono de edición SOLO dentro del formulario */
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
    // Quita y bloquea la acción del "lápiz" dentro del formulario
    (function(){
      const SEL = '.fd-edit-btn, .fd-field-edit, .field-edit-btn, [data-action="edit-field"], .btn-edit, .icon-edit, .fa-pencil, .fa-pencil-alt';
      function removePencils(root){
        if (!root) return;
        root.querySelectorAll(SEL).forEach(el => el.remove());
      }
      function init(){
        const root = document.getElementById('fd-root');
        if (!root) return;
        removePencils(root);
        // Evita clicks si algún botón se agrega dinámicamente
        root.addEventListener('click', function(e){
          if (e.target.closest(SEL)){
            e.preventDefault(); e.stopPropagation();
          }
        }, true);
        // Observa inyecciones dinámicas y las elimina
        const mo = new MutationObserver(muts=>{
          muts.forEach(m=>{
            m.addedNodes.forEach(n=>{
              if (n.nodeType !== 1) return;
              if (n.matches && n.matches(SEL)) n.remove();
              n.querySelectorAll && n.querySelectorAll(SEL).forEach(el=> el.remove());
            });
          });
        });
        mo.observe(root, { childList:true, subtree:true });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>

  <?php /* Define variables GLOBALES antes de cargar el runtime DnD */ ?>
  <script>
    window.FORM_CONFIG = { archivo_json: <?php echo json_encode($archivo_base ?? 'formulariogenerico2.json'); ?> };
    window.formularioJsonOriginal = <?php echo json_encode($json_data ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
  </script>

  <!-- DnD solo en modo diseño (tabs y campos). No persiste, solo UI. -->
  <script src="js/form-runtime-dnd.js"></script>

  <script>
    (function(){
      const root = document.getElementById('fd-root');
      const toggle = document.getElementById('designModeToggle');

      function emit(on){
        window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } }));
      }
      // Estado inicial
      emit(root && root.classList.contains('design-mode'));
      // Si ya está en diseño al cargar, refresca DnD
      if (root && root.classList.contains('design-mode') && window.formRuntimeDndRefresh){
        window.formRuntimeDndRefresh();
      }
      // Toggle del modo diseño desde el checkbox
      if (toggle && root){
        toggle.addEventListener('change', function(){
          root.classList.toggle('design-mode', this.checked);
          const url = new URL(location.href);
          url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
          history.replaceState(null, '', url.toString());
          emit(this.checked);
          // Refresca DnD solo cuando está en diseño
          if (this.checked && window.formRuntimeDndRefresh){
            window.formRuntimeDndRefresh();
          }
        });
      }
      // Botón externo opcional
      document.getElementById('btnDesignMode')?.addEventListener('click', function(){
        if (!root) return;
        const on = !root.classList.contains('design-mode');
        root.classList.toggle('design-mode', on);
        emit(on);
        if (on && window.formRuntimeDndRefresh){
          window.formRuntimeDndRefresh();
        }
      });
    })();

    // Eventos opcionales (el árbol puede escuchar y persistir si corresponde)
    window.addEventListener('form-dnd:tabs-reordered', (e)=> {
      // console.log('tabs reorder', e.detail);
    });
    window.addEventListener('form-dnd:fields-reordered', (e)=> {
      // console.log('fields reorder', e.detail);
    });
  </script>

  <?php /* El árbol se mantiene intacto */ ?>
  <script src="js/json-tree-panel.js"></script>

  <?php /* Elimina script antiguo que podía interferir con el DnD del formulario */ ?>
  <!-- <script src="js/form-dnd.js"></script> -->
</body>
</html>

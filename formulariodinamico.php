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

  <!-- Opcional: aplicar estilos Bootstrap al HTML generado -->
  <script src="js/form-bootstrap-enhancer.js"></script>

  <!-- Runtime DnD (tabs, fields, fieldsets) -->
  <!-- Opcional: si este runtime interfiere, puedes comentarlo -->
  <script src="js/form-runtime-dnd.js"></script>
  <!-- ^^^ ANTES estaba comentado; esto impedía el DnD del runtime -->

  <script>
    (function(){
      const root = document.getElementById('fd-root');
      const toggle = document.getElementById('designModeToggle');
      const container = document.getElementById('form-container');

      // Estilos mínimos para el grip/ghost
      injectDndStyles();
      function injectDndStyles(){
        if (document.getElementById('fd-inline-dnd-css')) return;
        const st = document.createElement('style');
        st.id = 'fd-inline-dnd-css';
        st.textContent = `
          #fd-root.design-mode .fd-dnd-grip{ cursor:grab; user-select:none; display:inline-block; margin-right:6px; opacity:.9; }
          #fd-root.design-mode .fd-dnd-ghost{ opacity:.6; background:#eef2ff !important; }
        `;
        document.head.appendChild(st);
      }

      function inDesign(){ return !!root?.classList.contains('design-mode'); }
      function emit(on){ window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: !!on } })); }

      // Init completo: intenta runtime; si no, usa fallback (con o sin Sortable)
      function initDnd(){
        if (!inDesign()) return;
        if (window.formRuntimeDndRefresh){
          try { window.formRuntimeDndRefresh(); } catch(e){}
        }
        setTimeout(()=> initFallbackDnd(), 80);
      }

      function initFallbackDnd(){
        if (!inDesign()) return;
        initTabsFallback();           // <- ahora existe
        const configured = initFieldsDnDJson();
        if (!configured) initFieldsFallback();
      }

      // --------- NUEVO: Tabs fallback + helpers ----------
      function initTabsFallback(){
        document.querySelectorAll('#fd-root .nav-tabs').forEach(ul=>{
          if (ul.dataset.fdTabsInit === '1') return;
          ul.dataset.fdTabsInit = '1';

          Array.from(ul.children).forEach(li=>{
            const link = li.querySelector('a,button');
            if (!link) return;
            if (!link.getAttribute('data-bs-toggle')) link.setAttribute('data-bs-toggle','tab');
            if (!link.querySelector('.fd-dnd-grip')){
              const g = document.createElement('span');
              g.className = 'fd-dnd-grip';
              g.title = 'Arrastra para reordenar pestañas';
              g.textContent = '⋮⋮';
              link.prepend(g);
            }
          });

          if (window.Sortable){
            new Sortable(ul, {
              animation: 150,
              draggable: 'li',
              handle: '.fd-dnd-grip',
              ghostClass: 'fd-dnd-ghost',
              onEnd: ()=> reorderTabContentByUl(ul)
            });
          } else {
            initNativeListDnD(ul, {
              handleSel: '.fd-dnd-grip',
              childSel: 'li',
              crossGroup: false,
              onDrop: ()=> reorderTabContentByUl(ul)
            });
          }
        });
      }

      function findTabContentContainer(ul){
        const sib = ul.nextElementSibling;
        if (sib && sib.classList?.contains('tab-content')) return sib;
        return document.querySelector('#fd-root .tab-content');
      }

      function getTabTargetId(link){
        if (!link) return null;
        let t = link.getAttribute('data-bs-target') || link.getAttribute('href') || '';
        if (!t) return null;
        t = t.trim();
        if (t.startsWith('#')) return t.slice(1);
        const pos = t.indexOf('#');
        return pos>=0 ? t.substring(pos+1) : null;
      }

      function reorderTabContentByUl(ul){
        const cont = findTabContentContainer(ul);
        if (!cont) return;
        Array.from(ul.children).forEach(li=>{
          const link = li.querySelector('a,button');
          const id = getTabTargetId(link);
          if (!id) return;
          const pane = cont.querySelector('#'+cssEscape(id));
          if (pane) cont.appendChild(pane);
        });
      }
      // --------- FIN Tabs fallback ----------

      // ---------- Fields por JSON (robusto, por padre real) ----------
      function initFieldsDnDJson(){
        const json = window.formularioJsonOriginal || {};
        const fieldsets = json.fieldsets && typeof json.fieldsets === 'object' ? json.fieldsets : null;
        if (!fieldsets) return 0;

        let configured = 0;

        Object.keys(fieldsets).forEach(fsName=>{
          const campos = Array.isArray(fieldsets[fsName]?.campos) ? fieldsets[fsName].campos : [];
          if (!campos.length) return;

          // 1) localizar wrappers por campo
          const wrappers = [];
          campos.forEach(c=>{
            const fname = c?.nombre || c?.name || c?.field || '';
            if (!fname) return;
            const ctrl = findControlByName(fname);
            if (!ctrl) return;
            const wrap = closestFieldWrapper(ctrl);
            if (!wrap) return;
            wrap.setAttribute('data-fd-wrapper','1');
            wrap.setAttribute('data-fd-name', fname);
            ensureGrip(wrap);
            wrappers.push(wrap);
          });
          if (!wrappers.length) return;

          // 2) agrupar por padre real y montar Sortable por padre
          const byParent = new Map();
          wrappers.forEach(w=>{
            const p = w.parentElement;
            if (!p) return;
            if (!byParent.has(p)) byParent.set(p, []);
            byParent.get(p).push(w);
          });

          byParent.forEach((wraps, parent)=>{
            // marca contenedor y pane
            if (parent.dataset.fdFieldsInit === '1') return;
            parent.dataset.fdFieldsInit = '1';
            const pane = parent.closest('.tab-pane');
            if (pane?.id) parent.dataset.tabPaneId = pane.id;

            // asegurar grips en hijos directos (wrappers)
            wraps.forEach(w => ensureGrip(w));

            // 3) montar Sortable por contenedor real (permite cross-group)
            if (window.Sortable){
              new Sortable(parent, {
                animation: 150,
                draggable: ':scope > [data-fd-wrapper="1"]',
                handle: '.fd-dnd-grip',
                ghostClass: 'fd-dnd-ghost',
                group: { name: 'fd-fields', pull: true, put: true }
              });
            } else {
              initNativeListDnD(parent, {
                handleSel: '.fd-dnd-grip',
                childSel: ':scope > [data-fd-wrapper="1"]',
                crossGroup: true
              });
            }
            configured++;
          });
        });

        if (inDesign()) console.info('[FD] JSON fields containers configurados:', configured);
        return configured;
      }

      // ---------- Fallback DOM (agrupa por padre real) ----------
      function initFieldsFallback(){
        const containerSel = [
          '#fd-root .tab-pane .card-body',
          '#fd-root .tab-pane .container',
          '#fd-root .tab-pane .container-fluid',
          '#fd-root .tab-pane .row',
          '#fd-root .tab-pane .col',
          '#fd-root .tab-pane',
          '#fd-root .card-body',
          '#fd-root .panel-body',
          '#fd-root .fieldset',
          '#fd-root .fields-container',
          '#fd-root [data-fs-container]',
          '#fd-root [data-fd-fields-group]',
          '#fd-root form',
          '#fd-root form .row',
          '#fd-root form .col',
          '#fd-root table tbody'
        ].join(', ');

        let configured = 0;

        document.querySelectorAll(containerSel).forEach(cont=>{
          // detectar wrappers-hijos directos con controles
          const wrappers = Array.from(cont.children)
            .filter(el => el.tagName!=='SCRIPT' && el.tagName!=='STYLE')
            .filter(el => el.querySelector?.('input,select,textarea,[name],[data-name]'));

          if (!wrappers.length) return;

          // marca contenedor + grips
          if (cont.dataset.fdFieldsInit === '1') return;
          cont.dataset.fdFieldsInit = '1';
          wrappers.forEach(w => { w.setAttribute('data-fd-wrapper','1'); ensureGrip(w); });

          if (window.Sortable){
            new Sortable(cont, {
              animation: 150,
              draggable: ':scope > [data-fd-wrapper="1"]',
              handle: '.fd-dnd-grip',
              ghostClass: 'fd-dnd-ghost',
              group: { name: 'fd-fields', pull: true, put: true }
            });
          } else {
            initNativeListDnD(cont, {
              handleSel: '.fd-dnd-grip',
              childSel: ':scope > [data-fd-wrapper="1"]',
              crossGroup: true
            });
          }
          configured++;
        });

        if (inDesign()) console.info('[FD] Fields DnD contenedores configurados (fallback):', configured);
      }

      // Helpers sin cambio relevante: ensureGrip, findControlByName, closestFieldWrapper, initNativeListDnD...
      // ...existing code...
    })();
  </script>

  <script src="js/json-tree-panel.js"></script>

  <!-- Eliminar duplicados: NO vuelvas a renderizar #fd-root ni el estilo del lápiz más abajo -->
</body>
</html>

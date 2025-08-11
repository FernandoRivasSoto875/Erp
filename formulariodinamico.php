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
  <script src="js/form-runtime-dnd.js"></script>

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
        // 1) Runtime si está expuesto
        if (window.formRuntimeDndRefresh){
          try { window.formRuntimeDndRefresh(); } catch(e){}
        }
        // 2) Asegura grips y DnD aunque falte Sortable o el runtime
        setTimeout(()=> initFallbackDnd(), 80);
      }

      // Fallback DnD: Tabs + Fields. Usa Sortable si está; si no, usa HTML5 nativo.
      function initFallbackDnd(){
        if (!inDesign()) return;
        initTabsFallback();
        initFieldsFallback();
      }

      // ---------- Tabs ----------
      function initTabsFallback(){
        document.querySelectorAll('#fd-root .nav-tabs').forEach(ul=>{
          if (ul.dataset.fdTabsInit === '1') return;
          ul.dataset.fdTabsInit = '1';

          // Grip en cada tab
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

          // Usar Sortable si está, si no, nativo
          if (window.Sortable){
            new Sortable(ul, {
              animation: 150,
              draggable: 'li',
              handle: '.fd-dnd-grip',
              ghostClass: 'fd-dnd-ghost',
              onEnd: ()=> reorderTabContentByUl(ul)
            });
          } else {
            initNativeListDnD(ul, { handleSel: '.fd-dnd-grip', onDrop: ()=> reorderTabContentByUl(ul), childSel: 'li' });
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
          const pane = cont.querySelector('#'+CSS.escape(id));
          if (pane) cont.appendChild(pane);
        });
      }

      // ---------- Fields (dentro y entre contenedores/pestañas) ----------
      function initFieldsFallback(){
        const guessContainers = [
          '#fd-root .tab-pane .row',
          '#fd-root .tab-pane .col',
          '#fd-root .card-body',
          '#fd-root form .row',
          '#fd-root form .col',
          '#fd-root form'
        ];
        document.querySelectorAll(guessContainers.join(',')).forEach(cont=>{
          if (cont.dataset.fdFieldsInit === '1') return;

          // Hijos que parezcan wrapper de field
          const children = Array.from(cont.children)
            .filter(ch=> ch.tagName!=='SCRIPT' && ch.tagName!=='STYLE')
            .filter(ch=> ch.querySelector?.('input,select,textarea,[name],[data-name]'));
          if (children.length < 2) return;

          cont.dataset.fdFieldsInit = '1';

          // Grip en cada wrapper
          children.forEach(w=>{
            if (!w.querySelector('.fd-dnd-grip')){
              const g = document.createElement('span');
              g.className = 'fd-dnd-grip';
              g.title = 'Arrastra para mover';
              g.textContent = '⋮⋮';
              w.prepend(g);
            }
          });

          // Sortable si está, si no, nativo. Grupo cruzado por defecto.
          if (window.Sortable){
            new Sortable(cont, {
              animation: 150,
              draggable: ':scope > *',
              handle: '.fd-dnd-grip',
              ghostClass: 'fd-dnd-ghost',
              group: { name: 'fd-fields', pull: true, put: true }
            });
          } else {
            initNativeListDnD(cont, { handleSel: '.fd-dnd-grip', onDrop: null, childSel: ':scope > *', crossGroup: true });
          }
        });
      }

      // ---------- Fallback nativo HTML5 para listas (con soporte entre contenedores) ----------
      function initNativeListDnD(container, opts){
        const handleSel = opts?.handleSel || null;
        const childSel  = opts?.childSel  || ':scope > *';
        const cross     = !!opts?.crossGroup;
        const onDropCb  = typeof opts?.onDrop === 'function' ? opts.onDrop : null;

        if (container.dataset.fdNativeDnD === '1') return;
        container.dataset.fdNativeDnD = '1';

        let dragEl = null;

        function ownerChild(el){
          // Asegura que sea hijo directo del container
          while (el && el.parentElement !== container) el = el.parentElement;
          return el && el.parentElement === container ? el : null;
        }

        container.addEventListener('mousedown', (e)=>{
          if (!inDesign()) return;
          const handle = handleSel ? e.target.closest(handleSel) : e.target;
          if (!handle) return;
          const row = ownerChild(handle);
          if (!row) return;
          row.setAttribute('draggable','true');
        });

        container.addEventListener('dragstart', (e)=>{
          const row = ownerChild(e.target);
          if (!row) return e.preventDefault();
          dragEl = row;
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain','drag'); } catch {}
          setTimeout(()=> dragEl.classList.add('fd-dnd-ghost'), 0);
        });

        container.addEventListener('dragover', (e)=>{
          if (!dragEl) return;
          if (cross || e.currentTarget === container){
            e.preventDefault();
            const over = ownerChild(e.target);
            if (!over || over === dragEl) return;
            const rect = over.getBoundingClientRect();
            const before = (e.clientY - rect.top) < rect.height/2;
            if (before) container.insertBefore(dragEl, over);
            else container.insertBefore(dragEl, over.nextSibling);
          }
        });

        container.addEventListener('drop', (e)=>{
          if (!dragEl) return;
          e.preventDefault();
          dragEl.classList.remove('fd-dnd-ghost');
          dragEl.removeAttribute('draggable');
          dragEl = null;
          onDropCb && onDropCb();
        });

        container.addEventListener('dragend', ()=>{
          if (dragEl){
            dragEl.classList.remove('fd-dnd-ghost');
            dragEl.removeAttribute('draggable');
          }
          dragEl = null;
        });

        // Si se permite cruzar entre grupos, habilita dropear desde otros contenedores
        if (cross){
          document.addEventListener('dragover', (e)=>{
            if (!dragEl) return;
            const targetContainer = e.target.closest('[data-fd-fields-init="1"]');
            if (!targetContainer || targetContainer === container) return;
            // Permitir soltar en el otro contenedor
            e.preventDefault();
          });
          document.addEventListener('drop', (e)=>{
            if (!dragEl) return;
            const targetContainer = e.target.closest('[data-fd-fields-init="1"]');
            if (!targetContainer || targetContainer === container) return;
            e.preventDefault();
            // Inserta al final si no calculamos posición exacta
            targetContainer.appendChild(dragEl);
            dragEl.classList.remove('fd-dnd-ghost');
            dragEl.removeAttribute('draggable');
            dragEl = null;
            onDropCb && onDropCb();
          });
        }
      }

      // Estado inicial + onload
      emit(inDesign());
      window.addEventListener('load', initDnd);

      // Toggle modo diseño
      toggle?.addEventListener('change', function(){
        root?.classList.toggle('design-mode', this.checked);
        emit(this.checked);
        initDnd();
      });

      // Re-render en tiempo de ejecución
      if (container){
        const mo = new MutationObserver(()=> initDnd());
        mo.observe(container, { childList:true, subtree:true });
      }
    })();
  </script>

  <script src="js/json-tree-panel.js"></script>

  <!-- Eliminar duplicados: NO vuelvas a renderizar #fd-root ni el estilo del lápiz más abajo -->
</body>
</html>

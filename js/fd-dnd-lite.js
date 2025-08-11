(function(){
  console.info('[FD Lite] loaded');

  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const isDesign = ()=> {
    const rootEl = document.getElementById('fd-root');
    return !!(rootEl && rootEl.classList && rootEl.classList.contains('design-mode'));
  };
  const hasSortable = ()=> typeof window.Sortable === 'function';

  let sortables = [];
  const initedContainers = new Set();

  injectStyles();
  function injectStyles(){
    if ($('#fd-lite-dnd-css')) return;
    const st = document.createElement('style');
    st.id = 'fd-lite-dnd-css';
    st.textContent = `
      /* Grip de pestañas (morado) */
      #fd-root.design-mode .fd-tab-grip{
        cursor:grab; user-select:none; touch-action:none;
        display:inline-block; margin-right:6px;
        background:#6f42c1; color:#fff; border-radius:4px;
        padding:0 6px; font-weight:600; line-height:1.2;
        box-shadow:0 0 0 1px rgba(111,66,193,.25) inset;
      }
      #fd-root.design-mode .fd-tab-grip:hover{ background:#5a36a1; }
      #fd-root.design-mode .fd-tab-grip:active{ cursor:grabbing; transform:scale(.98); }

      /* Grip de grupos/fieldsets (azul) */
      #fd-root.design-mode .fd-group-grip{
        cursor:grab; user-select:none; touch-action:none;
        display:inline-block; margin-right:6px;
        background:#0d6efd; color:#fff; border-radius:4px;
        padding:0 6px; font-weight:600; line-height:1.2;
        box-shadow:0 0 0 1px rgba(13,110,253,.25) inset;
        position:relative; z-index:3;
      }
      #fd-root.design-mode .fd-group-grip:hover{ background:#0b5ed7; }
      #fd-root.design-mode .fd-group-grip:active{ cursor:grabbing; transform:scale(.98); }

      /* Grip de campos (verde) */
      #fd-root.design-mode .fd-dnd-grip{
        cursor:grab; user-select:none; touch-action:none;
        display:inline-block; margin-right:6px;
        background:#198754; color:#fff; border-radius:4px;
        padding:0 6px; font-weight:600; line-height:1.2;
        box-shadow:0 0 0 1px rgba(25,135,84,.25) inset;
      }
      #fd-root.design-mode .fd-dnd-grip:hover{ background:#157347; }
      #fd-root.design-mode .fd-dnd-grip:active{ cursor:grabbing; transform:scale(.98); }

      /* Resaltado de elementos arrastrables en modo diseño */
      #fd-root.design-mode .fd-fs-draggable{
        position:relative; outline:2px dashed rgba(13,110,253,.6); border-radius:6px;
      }
      #fd-root.design-mode .fd-field-draggable{
        position:relative; outline:1px dashed rgba(25,135,84,.6); border-radius:4px;
      }

      /* Badges de tipo (Grupo/Campo) */
      #fd-root.design-mode .fd-badge-group::after{
        content:'Grupo';
        position:absolute; top:-10px; right:-10px;
        background:#0d6efd; color:#fff; border-radius:10px;
        padding:2px 8px; font-size:11px; font-weight:600;
        box-shadow:0 0 0 1px rgba(13,110,253,.25) inset;
      }
      #fd-root.design-mode .fd-badge-field::after{
        content:'Campo';
        position:absolute; top:-10px; right:-10px;
        background:#198754; color:#fff; border-radius:10px;
        padding:2px 8px; font-size:11px; font-weight:600;
        box-shadow:0 0 0 1px rgba(25,135,84,.25) inset;
      }

      /* Ghost al arrastrar */
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.65; background:#eef2ff !important; }
    `;
    document.head.appendChild(st);
  }

  window.fdDndLiteRefresh = initAll;

  whenReady(()=> {
    window.addEventListener('design-mode-changed', ()=> initAll());
    initAll();
  });

  function whenReady(cb){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
  }

  function destroyAll(){
    sortables.forEach(s=> { try{ s && s.destroy && s.destroy(); }catch{} });
    sortables = [];
    initedContainers.clear();
  }

  function initAll(){
    const root = document.getElementById('fd-root');
    if (!root){ console.warn('[FD Lite] Falta #fd-root.'); return; }
    if (!isDesign()) { destroyAll(); return; }
    if (!hasSortable()){ console.warn('[FD Lite] Falta SortableJS.'); return; }

    console.info('[FD Lite] initAll: design ON, Sortable OK');
    destroyAll();
    attachTabsDnD();
    attachFieldsetsDnD();
    attachFieldsDnD();
  }

  // ---------- Tabs ----------
  function attachTabsDnD(){
    const uls = $$('#fd-root .nav-tabs');
    uls.forEach(ul=>{
      if (!ul || ul.nodeType!==1) return;
      Array.from(ul.children).forEach(li=>{
        const link = li.querySelector('a,button');
        if (!link) return;
        if (!link.querySelector('.fd-tab-grip')) {
          const g = document.createElement('span');
          g.className = 'fd-tab-grip';
          g.title = 'Arrastra para reordenar pestañas';
          g.textContent = '⋮⋮';
          link.prepend(g);
        }
      });
      ul.addEventListener('click', (e)=>{
        if (isDesign() && e.target.closest('.fd-tab-grip')) e.preventDefault();
      });
      const s = new Sortable(ul, {
        animation: 150,
        draggable: 'li',
        handle: '.fd-tab-grip',
        ghostClass: 'fd-dnd-ghost',
        onEnd: ()=> syncTabContent(ul)
      });
      sortables.push(s);
    });
  }
  function findTabContentContainer(ul){
    const sib = ul.nextElementSibling;
    if (sib && sib.classList?.contains('tab-content')) return sib;
    return $('#fd-root .tab-content');
  }
  function getTabTargetId(link){
    if (!link) return null;
    let t = link.getAttribute('data-bs-target') || link.getAttribute('href') || '';
    if (!t) return null;
    t = t.trim();
    if (t.startsWith('#')) return t.slice(1);
    const pos = t.indexOf('#'); return pos>=0 ? t.substring(pos+1) : null;
  }
  function cssEscape(s){
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(s));
    return String(s).replace(/(["\\.#\[\]:])/g, '\\$1');
  }
  function syncTabContent(ul){
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

  // ---------- Fieldsets entre columnas ----------
  function attachFieldsetsDnD(){
    const colCandidates = $$('#fd-root .row > [class*="col-"], #fd-root .row > .col, #fd-root [data-col-width]');
    colCandidates.forEach(col=>{
      const picked = pickFsContainer(col);
      if (!picked) return;
      const { container, groups } = picked;
      if (!container || container.nodeType!==1) return;
      if (container.dataset.fdSortableFs === '1') return;
      container.dataset.fdSortableFs = '1';

      // marcar como draggable + grip visible
      groups.forEach(g=> { markFieldsetGroup(g); ensureGroupGrip(g); });

      const s = new Sortable(container, {
        animation: 150,
        group: { name: 'fd-fieldsets', pull: true, put: true },
        draggable: '.fd-fs-draggable',
        handle: '.fd-group-grip, legend, .card-header, [data-fieldset-title]',
        ghostClass: 'fd-dnd-ghost',
        forceFallback: true,
        fallbackOnBody: true,
        onAdd: (evt)=> rebindMovedGroup(evt.item),
        onUpdate: (evt)=> rebindMovedGroup(evt.item),
        onEnd: (evt)=> rebindMovedGroup(evt.item)
      });
      sortables.push(s);
    });
  }

  function rebindMovedGroup(item){
    if (!item) return;
    markFieldsetGroup(item);
    ensureGroupGrip(item);
    const parent = item.parentElement;
    if (parent && parent.nodeType===1 && parent.dataset.fdSortableFs !== '1'){
      parent.dataset.fdSortableFs = '1';
      const s = new Sortable(parent, {
        animation: 150,
        group: { name: 'fd-fieldsets', pull: true, put: true },
        draggable: '.fd-fs-draggable',
        handle: '.fd-group-grip, legend, .card-header, [data-fieldset-title]',
        ghostClass: 'fd-dnd-ghost',
        forceFallback: true,
        fallbackOnBody: true,
        onAdd: (evt)=> rebindMovedGroup(evt.item),
        onUpdate: (evt)=> rebindMovedGroup(evt.item),
        onEnd: (evt)=> rebindMovedGroup(evt.item)
      });
      sortables.push(s);
    }
  }

  function markFieldsetGroup(el){
    if (!el || el.nodeType!==1) return;
    el.classList.add('fd-fs-draggable', 'fd-badge-group');
  }

  // ---------- Fields dentro y entre fieldsets ----------
  function attachFieldsDnD(){
    const containers = getFieldContainers(); // contenedores finales donde van los wrappers directos

    containers.forEach(cont=>{
      if (!cont || cont.nodeType!==1) return;
      if (cont.dataset.fdSortableField === '1') return;
      cont.dataset.fdSortableField = '1';

      // Wrappers directos movibles (hijos directos del contenedor)
      const wrappers = Array.from(cont.children).filter(isFieldWrapperDirect);

      // Marca grip/clase si hay wrappers; si no, igual inicializamos para permitir drop
      wrappers.forEach(w=> { markFieldWrapper(w); ensureFieldGrip(w); });

      // Evita navegación si se hace click en el grip
      cont.addEventListener('click', (e)=>{
        if (isDesign() && e.target.closest('.fd-dnd-grip')) e.preventDefault();
      });

      const s = new Sortable(cont, {
        animation: 150,
        draggable: '.fd-field-draggable',
        handle: '.fd-dnd-grip',
        ghostClass: 'fd-dnd-ghost',
        group: { name: 'fd-fields', pull: true, put: true }, // mover entre fieldsets/columnas
        forceFallback: true,
        fallbackOnBody: true,
        onAdd: (evt)=> rebindMovedField(evt.item),
        onUpdate: (evt)=> rebindMovedField(evt.item),
        onEnd: (evt)=> rebindMovedField(evt.item)
      });
      sortables.push(s);
    });
  }

  // Devuelve contenedores donde los campos son hijos directos (body de card/fieldset o columnas)
  function getFieldContainers(){
    const bases = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root [data-fd-fields-group], #fd-root .fd-fields-container, #fd-root table');
    const out = [];

    bases.forEach(base=>{
      const body = pickFieldsContainer(base); // card-body / panel-body / tbody / fallback
      if (!body) return;

      if (body.matches('table')) {
        // Ya resuelto en pickFieldsContainer a tbody
        out.push(body);
        return;
      }

      // Si el body es una fila, usa cada columna como contenedor final
      if (body.matches('.row')){
        const cols = Array.from(body.children).filter(el=> el.matches('[class*="col-"], .col'));
        if (cols.length){
          cols.forEach(col=> out.push(col));
          return;
        }
      }

      // Si no es fila, usa el propio body como contenedor
      out.push(body);
    });

    // Evita duplicados
    return Array.from(new Set(out));
  }

  function pickFieldsContainer(base){
    if (!base || base.nodeType!==1) return null;
    if (base.matches('table')) return (base.tBodies && base.tBodies[0]) || base;

    // Preferir cuerpos típicos del grupo
    const body = base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row');
    return body || base;
  }

  function isFieldWrapperDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    // No considerar grupos completos ni contenedores de grid como wrappers
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
    if (el.matches('.row')) return false;
    // En columnas sí permitimos si contienen controles (para layouts simples)
    if (el.matches('[class*="col-"], .col')){
      return hasControl(el);
    }
    // Debe contener un control
    return hasControl(el);
  }

  // Helpers de campos (añadir si no existen)
  function hasControl(el){
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  function isGroupEl(el){
    return !!el && el.matches && el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  function ensureFieldGrip(w){
    if (w.querySelector('.fd-dnd-grip')) return;
    const grip = document.createElement('span');
    grip.className = 'fd-dnd-grip';
    grip.title = 'Arrastra para mover';
    grip.textContent = '⋮⋮';
    if (w.matches('tr')){
      const cell = w.querySelector(':scope > th, :scope > td') || w;
      cell.insertBefore(grip, cell.firstChild);
    } else {
      const header = w.querySelector(':scope > .card-header, :scope > legend, :scope > label, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
      if (header) header.insertBefore(grip, header.firstChild);
      else w.insertBefore(grip, w.firstChild);
    }
  }
})();
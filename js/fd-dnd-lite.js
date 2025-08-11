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
      #fd-root.design-mode .fd-dnd-grip,
      #fd-root.design-mode .fd-group-grip{ cursor:grab; user-select:none; touch-action:none; display:inline-block; margin-right:6px; opacity:.9; }
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.6; background:#eef2ff !important; }
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
        if (!link.querySelector('.fd-dnd-grip')) {
          const g = document.createElement('span');
          g.className = 'fd-dnd-grip';
          g.title = 'Arrastra para reordenar pestañas';
          g.textContent = '⋮⋮';
          link.prepend(g);
        }
      });
      ul.addEventListener('click', (e)=>{
        if (isDesign() && e.target.closest('.fd-dnd-grip')) e.preventDefault();
      });
      const s = new Sortable(ul, {
        animation: 150,
        draggable: 'li',
        handle: '.fd-dnd-grip',
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
      if (initedContainers.has(container)) return;
      initedContainers.add(container);

      groups.forEach(g=> ensureGroupGrip(g));

      const s = new Sortable(container, {
        animation: 150,
        group: { name: 'fd-fieldsets', pull: true, put: true },
        draggable: '.fd-fs-draggable',
        handle: '.fd-group-grip',
        ghostClass: 'fd-dnd-ghost'
      });
      sortables.push(s);
    });
  }
  function pickFsContainer(col){
    if (!col || col.nodeType!==1) return null;
    // Grupos directos en la columna
    let direct = Array.from(col.children).filter(isGroupElementDirect);
    if (direct.length){
      direct.forEach(el => markFieldsetGroup(el));
      return { container: col, groups: direct };
    }
    // Un hijo directo que contenga grupos
    for (const ch of Array.from(col.children)){
      const inner = Array.from(ch.children).filter(isGroupElementDirect);
      if (inner.length){
        inner.forEach(el => markFieldsetGroup(el));
        return { container: ch, groups: inner };
      }
    }
    // No hay grupos aún: usa la columna como dropzone
    return { container: col, groups: [] };
  }
  function isGroupElementDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    return el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  function markFieldsetGroup(el){
    if (!el.classList.contains('fd-fs-draggable')) el.classList.add('fd-fs-draggable');
  }
  function ensureGroupGrip(group){
    if (group.querySelector('.fd-group-grip')) return;
    const grip = document.createElement('span');
    grip.className = 'fd-group-grip';
    grip.title = 'Arrastra para mover el grupo';
    grip.textContent = '⋮⋮';
    const header = group.querySelector(':scope > .card-header, :scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
    if (header) header.insertBefore(grip, header.firstChild);
    else group.insertBefore(grip, group.firstChild);
  }

  // ---------- Fields dentro y entre fieldsets ----------
  function attachFieldsDnD(){
    // Busca candidatos de wrappers de campo en todo el #fd-root
    const candidates = Array.from(document.querySelectorAll('#fd-root ' + [
      '.form-group',
      '.mb-3',
      '.form-floating',
      '.input-group',
      '.fd-field',
      'li',
      'tr',
      '[data-field-wrapper]'
    ].join(', ')))
      .filter(el => !isGroupEl(el))   // que no sean grupos (fieldset/card/panel)
      .filter(el => hasControl(el));  // que contengan controles

    // Agrupa los wrappers por su padre real
    const parentsMap = new Map();
    candidates.forEach(w => {
      const p = w.parentElement;
      if (!p) return;
      if (!parentsMap.has(p)) parentsMap.set(p, new Set());
      parentsMap.get(p).add(w);
    });

    // Monta Sortable en cada padre con >=1 wrapper (también si luego queda vacío, para permitir drops)
    parentsMap.forEach((set, parent) => {
      if (!parent || parent.nodeType !== 1) return;
      if (initedContainers.has(parent)) return;
      initedContainers.add(parent);

      const wrappers = Array.from(set);
      wrappers.forEach(w => {
        if (!w.classList.contains('fd-field-draggable')) w.classList.add('fd-field-draggable');
        ensureFieldGrip(w);
      });

      // Evita navegación si se hace click en el grip
      parent.addEventListener('click', (e)=>{
        if (isDesign() && e.target.closest('.fd-dnd-grip')) e.preventDefault();
      });

      const s = new Sortable(parent, {
        animation: 150,
        draggable: '.fd-field-draggable',
        handle: '.fd-dnd-grip',
        ghostClass: 'fd-dnd-ghost',
        group: { name: 'fd-fields', pull: true, put: true } // mover entre fieldsets/columnas
      });
      sortables.push(s);
    });
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
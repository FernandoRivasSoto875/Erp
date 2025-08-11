(function(){
  console.info('[FD Lite] loaded');

  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const isDesign = ()=> {
    const rootEl = document.getElementById('fd-root');
    return !!(rootEl && rootEl.classList && rootEl.classList.contains('design-mode'));
  };
  const hasSortable = ()=> typeof window.Sortable === 'function';

  let obs = null;
  let sortables = [];

  injectStyles();
  function injectStyles(){
    if ($('#fd-lite-dnd-css')) return;
    const st = document.createElement('style');
    st.id = 'fd-lite-dnd-css';
    st.textContent = `
      #fd-root.design-mode .fd-dnd-grip,
      #fd-root.design-mode .fd-group-grip{ cursor:grab; user-select:none; touch-action:none; display:inline-block; margin-right:6px; opacity:.9; }
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.6; background:#eef2ff !important; }
      #fd-root.design-mode{ outline: 1px dashed #0d6efd; outline-offset: 4px; }
    `;
    document.head.appendChild(st);
  }

  window.fdDndLiteRefresh = initAll;

  whenReady(()=> {
    window.addEventListener('design-mode-changed', ()=> initAll());
    const root = document.getElementById('fd-root');
    if (root){
      obs = new MutationObserver(debounce(()=> isDesign() && initAll(), 120));
      obs.observe(root, { childList:true, subtree:true });
    } else {
      console.warn('[FD Lite] #fd-root no existe al iniciar.');
    }
    initAll();
  });

  function whenReady(cb){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
  }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  function destroyAll(){
    sortables.forEach(s=> { try{ s && s.destroy && s.destroy(); }catch{} });
    sortables = [];
  }

  function initAll(){
    const root = document.getElementById('fd-root');
    if (!root){ console.warn('[FD Lite] Falta #fd-root.'); return; }

    if (!isDesign()) { destroyAll(); return; }
    if (!hasSortable()){
      console.warn('[FD Lite] Falta SortableJS. No se puede activar DnD.');
      return;
    }

    console.info('[FD Lite] initAll: design ON, Sortable OK');
    destroyAll();
    attachTabsDnD();
    attachFieldsetsDnD();
    attachFieldsDnD();
  }

  // Tabs (prevenir navegación al usar el grip)
  function attachTabsDnD(){
    const uls = $$('#fd-root .nav-tabs');
    uls.forEach(ul=>{
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

  // Fieldsets entre columnas (siempre inicializa y usa el contenedor real)
  function attachFieldsetsDnD(){
    const colCandidates = $$('#fd-root .row > [class*="col-"], #fd-root .row > .col, #fd-root [data-col-width]');
    colCandidates.forEach(col=>{
      const { container, groups } = pickFsContainer(col);
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
    let direct = Array.from(col.children).filter(isGroupElementDirect);
    if (direct.length){
      direct.forEach(el => isFieldsetGroup(el));
      return { container: col, groups: direct };
    }
    for (const ch of Array.from(col.children)){
      const inner = Array.from(ch.children).filter(isGroupElementDirect);
      if (inner.length){
        inner.forEach(el => isFieldsetGroup(el));
        return { container: ch, groups: inner };
      }
    }
    return { container: col, groups: [] };
  }
  function isGroupElementDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    return el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  function isFieldsetGroup(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) {
      el.classList.add('fd-fs-draggable');
      return true;
    }
    return false;
  }
  function ensureGroupGrip(group){
    if (group.querySelector('.fd-group-grip')) return;
    const grip = document.createElement('span');
    grip.className = 'fd-group-grip';
    grip.title = 'Arrastra para mover el grupo';
    grip.textContent = '⋮⋮';
    const header = group.querySelector(':scope > .card-header, :scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h5, :scope > h6');
    if (header) header.insertBefore(grip, header.firstChild);
    else group.insertBefore(grip, group.firstChild);
  }

  // Fields dentro y entre fieldsets (siempre inicializa en el body real)
  function attachFieldsDnD(){
    const bases = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root [data-fd-fields-group], #fd-root .fd-fields-container, #fd-root table');
    const inited = new Set();

    bases.forEach(base=>{
      const cont = pickFieldsContainer(base);
      if (!cont || inited.has(cont)) return;
      inited.add(cont);

      const wrappers = Array.from(cont.children).filter(isFieldWrapperDirect);
      wrappers.forEach(w=> { w.classList.add('fd-field-draggable'); ensureFieldGrip(w); });

      const s = new Sortable(cont, {
        animation: 150,
        draggable: '.fd-field-draggable',
        handle: '.fd-dnd-grip',
        ghostClass: 'fd-dnd-ghost',
        group: { name: 'fd-fields', pull: true, put: true }
      });
      sortables.push(s);
    });
  }
  function pickFieldsContainer(base){
    if (base.matches('table')) return (base.tBodies && base.tBodies[0]) || base;
    const body = base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row');
    if (body) return body;
    return base;
  }
  function isFieldWrapperDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
    if (el.matches('.row, [class*="col-"], .col')) return false;
    const hasCtrl = !!el.querySelector?.('input,select,textarea,[name],[data-name]');
    return hasCtrl;
  }
})();
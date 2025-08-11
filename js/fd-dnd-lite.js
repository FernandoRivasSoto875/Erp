(function(){
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const isDesign = ()=> !!$('#fd-root')?.classList.contains('design-mode');
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
    const root = $('#fd-root');
    if (root){
      obs = new MutationObserver(debounce(()=> isDesign() && initAll(), 120));
      obs.observe(root, { childList:true, subtree:true });
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
    // no removemos grips para no parpadear; se regeneran en cada init
  }

  function initAll(){
    if (!isDesign()) { destroyAll(); return; }
    if (!hasSortable()){
      console.warn('[FD Lite] Falta SortableJS. No se puede activar DnD.');
      return;
    }
    destroyAll();
    attachTabsDnD();
    attachFieldsetsDnD();
    attachFieldsDnD();
    console.info('[FD Lite] DnD listo.');
  }

  // Tabs
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

  // Fieldsets entre columnas
  function attachFieldsetsDnD(){
    const cols = $$('#fd-root .row > [class*="col-"], #fd-root .row > .col, #fd-root [data-col-width]');
    cols.forEach(col=>{
      const groups = Array.from(col.children).filter(isFieldsetGroup);
      if (groups.length < 1) return;
      groups.forEach(g=> ensureGroupGrip(g));
      const s = new Sortable(col, {
        animation: 150,
        group: { name: 'fd-fieldsets', pull: true, put: true },
        draggable: '.fd-fs-draggable',
        handle: '.fd-group-grip',
        ghostClass: 'fd-dnd-ghost'
      });
      sortables.push(s);
    });
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

  // Fields dentro de cada grupo
  function attachFieldsDnD(){
    const containers = $$('#fd-root fieldset .card-body, #fd-root fieldset > .card-body, #fd-root fieldset, #fd-root .card > .card-body, #fd-root .panel > .panel-body, #fd-root [data-fd-fields-group], #fd-root .fd-fields-container, #fd-root table tbody');
    containers.forEach(cont=>{
      const wrappers = Array.from(cont.children).filter(isFieldWrapper);
      if (wrappers.length < 2) return;
      wrappers.forEach(w=> ensureFieldGrip(w));
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
  function isFieldWrapper(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
    const hasCtrl = !!el.querySelector?.('input,select,textarea,[name],[data-name]');
    if (!hasCtrl) return false;
    el.classList.add('fd-field-draggable');
    return true;
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
      const header = w.querySelector(':scope > .card-header, :scope > legend, :scope > label, :scope > h1, :scope > h2, :scope > h3, :scope > h5, :scope > h6');
      if (header) header.insertBefore(grip, header.firstChild);
      else w.insertBefore(grip, w.firstChild);
    }
  }
})();
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

  // NUEVO: estado para drop preciso de campos
  const lastFieldDrop = new WeakMap();
  const fieldHighlight = new WeakMap();

  injectStyles();
  function injectStyles(){
    if (document.getElementById('fd-lite-dnd-css')) return;
    const st = document.createElement('style');
    st.id = 'fd-lite-dnd-css';
    st.textContent = `
      /* Grip de pestañas (morado) */
      #fd-root.design-mode .fd-tab-grip{
        cursor:grab; user-select:none; touch-action:none;
        display:inline-block; margin-right:6px;              /* corregido: inline-block */
        background:#6f42c1; color:#fff; border-radius:4px;
        padding:0 6px; font-weight:600; line-height:1.2;
        box-shadow:0 0 0 1px rgba(111,66,193,.25) inset;
      }
      #fd-root.design-mode .fd-tab-grip:hover{ background:#5a36a1; }
      #fd-root.design-mode .fd-tab-grip:active{ cursor:grabbing; transform:scale(.98); }

      /* Grip de grupos (azul) */
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

      /* Ghost */
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.65; background:#eef2ff !important; }
    `;
    document.head.appendChild(st);
  }

  window.fdDndLiteRefresh = initAll;

  whenReady(()=> {
    window.addEventListener('design-mode-changed', ()=> initAll());
    initAll();

    // observa cambios de DOM y reengancha en caliente
    const root = document.getElementById('fd-root');
    if (root && !window.__fdLiteObs){
      window.__fdLiteObs = new MutationObserver(debounce(()=>{
        if (isDesign()){
          attachFieldsetsDnD();
          attachFieldsDnD();
          attachTreeFieldsDnD(); // <-- NUEVO
        }
      }, 120));
      window.__fdLiteObs.observe(root, { childList:true, subtree:true });
    }
  });

  function whenReady(cb){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
  }

  // NUEVO: debounce utilitario
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

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
    attachTreeFieldsDnD(); // <-- NUEVO: DnD en árbol
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
  // REEMPLAZAR COMPLETO
  function attachFieldsDnD(){
    const bases = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root [data-fd-fields-group], #fd-root .fd-fields-container, #fd-root table, #fd-root .fd-fieldset');

    // Mapa: parentElement -> Set<wrapper>
    const parentsMap = new Map();
    const emptyBodies = new Set();

    bases.forEach(base=>{
      const scope = pickFieldsContainer(base) || base;

      // 1) Detecta wrappers típicos dentro del scope
      let wrappers = Array.from(scope.querySelectorAll(
        '.form-group, .mb-3, .form-floating, .input-group, .fd-field, [data-field-wrapper], tr, li'
      )).filter(w => !isGroupElementDirect(w) && isFieldWrapperCandidate(w));

      // 2) Fallback: si no encontró ninguno, arma wrappers desde los controles
      if (wrappers.length === 0){
        const ctrls = Array.from(scope.querySelectorAll('input,select,textarea,[name],[data-name]'));
        ctrls.forEach(ct=>{
          let w = ct.closest('.form-group, .mb-3, .form-floating, .input-group, .fd-field, [data-field-wrapper], tr, li');
          if (!w) w = ct.closest('tr, li, td, div, span') || ct.parentElement;
          if (!w) return;
          if (!scope.contains(w)) return;
          if (isGroupElementDirect(w)) return;
          if (!isFieldWrapperCandidate(w)) return;
          wrappers.push(w);
        });
        // dedup
        wrappers = Array.from(new Set(wrappers));
      }

      if (wrappers.length){
        wrappers.forEach(w=>{
          const p = w.parentElement;
          if (!p) return;
          if (!parentsMap.has(p)) parentsMap.set(p, new Set());
          parentsMap.get(p).add(w);
        });
      } else {
        // No hay wrappers aún: habilita drop en el body vacío
        emptyBodies.add(scope);
      }
    });

    // Inicializa Sortable por cada padre real
    parentsMap.forEach((set, parent)=>{
      ensureFieldContainerSortable(parent, Array.from(set));
    });

    // También habilita los bodies vacíos
    emptyBodies.forEach(body=>{
      ensureFieldContainerSortable(body, []);
    });
  }

  // Crea Sortable en un contenedor de campos si no existe y marca wrappers
  function ensureFieldContainerSortable(cont, wrappers){
    if (!cont || cont.nodeType!==1) return;
    if (cont.dataset.fdSortableField === '1') return;
    cont.dataset.fdSortableField = '1';

    wrappers.forEach(w=> { markFieldWrapper(w); ensureFieldGrip(w); });

    cont.addEventListener('click', (e)=>{
      if (isDesign() && e.target.closest('.fd-dnd-grip')) e.preventDefault();
    });

    const s = new Sortable(cont, {
      animation: 150,
      draggable: '.fd-field-draggable',
      handle: '.fd-dnd-grip',
      ghostClass: 'fd-dnd-ghost',
      group: { name: 'fd-fields', pull: true, put: true }, // mover entre grupos
      direction: 'vertical',
      swapThreshold: 0.5,
      emptyInsertThreshold: 8,
      filter: 'input,select,textarea,button,[contenteditable],a[href]',
      preventOnFilter: false,
      scroll: true,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      forceFallback: true,
      fallbackOnBody: true,
      onMove: (evt)=>{
        const rel = evt.related && evt.related.matches('.fd-field-draggable') ? evt.related : null;
        lastFieldDrop.set(evt.to, { related: rel, after: !!evt.willInsertAfter });
        highlightRelated(evt.to, rel);
        return true;
      },
      onAdd: (evt)=>{
        try{
          const ctx = lastFieldDrop.get(evt.to);
          if (ctx && ctx.related && ctx.related.parentElement === evt.to){
            const ref = ctx.after ? ctx.related.nextSibling : ctx.related;
            evt.to.insertBefore(evt.item, ref);
          }
        } finally {
          rebindMovedField(evt.item);
          window.fdLayoutChanged && window.fdLayoutChanged();
          clearHighlight(evt.to);
        }
      },
      onUpdate: (evt)=>{
        rebindMovedField(evt.item);
        window.fdLayoutChanged && window.fdLayoutChanged();
        clearHighlight(evt.to);
      },
      onEnd: (evt)=>{
        rebindMovedField(evt.item);
        window.fdLayoutChanged && window.fdLayoutChanged();
      }
    });
    sortables.push(s);
  }

  // Un wrapper de campo válido debe contener controles
  function isFieldWrapperCandidate(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    if (el.matches('.row, [class*="col-"], .col')) return false;
    return hasControl(el);
  }

  // NUEVO: resaltado del destino y helpers de selección
  function highlightRelated(container, related){
    const prev = fieldHighlight.get(container);
    if (prev && prev !== related) prev.classList.remove('fd-drop-hover');
    if (related && related.nodeType===1){
      related.classList.add('fd-drop-hover');
      fieldHighlight.set(container, related);
    }
  }
  function clearHighlight(container){
    const prev = fieldHighlight.get(container);
    if (prev) prev.classList.remove('fd-drop-hover');
    fieldHighlight.delete(container);
    lastFieldDrop.delete(container);
  }

  // NUEVO: helpers faltantes
  function isGroupElementDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    return el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  function hasControl(el){
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
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

  // ¿Este contenedor tiene grupos (fieldsets/cards) como hijos directos?
  function hasDirectGroup(el){
    if (!el || el.nodeType!==1) return false;
    return Array.from(el.children).some(isGroupElementDirect);
  }

  // Devuelve contenedores finales donde van los campos (evita los que contienen grupos)
  function getFieldContainers(){
    const bases = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root [data-fd-fields-group], #fd-root .fd-fields-container, #fd-root table, #fd-root .fd-fieldset');
    const out = [];

    bases.forEach(base=>{
      const body = pickFieldsContainer(base);
      if (!body) return;

      // Tablas: tbody
      if (body.matches('table')){
        out.push(body);
        return;
      }

      // Si el body es una fila, usa cada columna que NO tenga grupos directos
      if (body.matches('.row')){
        const cols = Array.from(body.children).filter(el=> el.matches('[class*="col-"], .col'));
        cols.forEach(col=> { if (!hasDirectGroup(col)) out.push(col); });
        return;
      }

      // Si el body tiene grupos directos, no es contenedor de campos
      if (!hasDirectGroup(body)) out.push(body);
    });

    // Evita duplicados
    return Array.from(new Set(out));
  }

  // ---------- DnD en Árbol: nodo "Campos" acepta drop ----------
  // Configurable vía window.fdTreeConfig si tus selectores difieren
  function attachTreeFieldsDnD(){
    const cfg = window.fdTreeConfig || {};
    const roots = $$(cfg.root || '.json-tree-panel, .fd-tree, #fd-tree');
    if (!roots.length) return;

    // Encuentra TODAS las listas bajo el árbol que contienen nodos "Campo"
    const lists = [];
    roots.forEach(root=>{
      // 1) Contenedores "Campos"
      const camposNodes = $$(cfg.fieldsContainer || '[data-node="fields"], .node-fields, [data-tree="fields"]', root);

      camposNodes.forEach(campos=>{
        // Lista real donde van los "Campo"
        let list = campos.querySelector(cfg.fieldsList || 'ul, ol, .children, .nodes, .list');
        if (!list){
          // Si no existe, créala para aceptar drops en contenedores vacíos
          list = document.createElement('ul');
          list.className = (cfg.fieldsListClass || 'node-fields-list');
          // Propaga el id del grupo al UL para leerlo en onAdd
          const gid = getTreeGroupId(campos, cfg);
          if (gid) list.setAttribute(cfg.groupIdAttr || 'data-id', gid);
          campos.appendChild(list);
        }
        lists.push(list);
      });

      // 2) También listas ya existentes que contienen nodos "Campo"
      const moreLists = $$(cfg.fieldsList || 'ul, ol, .children, .nodes, .list', root)
        .filter(ul => ul.querySelector(cfg.fieldItem || '[data-node="field"], .node-field, li'));
      moreLists.forEach(ul=>{
        // Asegura que la lista tenga el group-id (hereda del contenedor "Campos" si aplica)
        if (!ul.getAttribute(cfg.groupIdAttr || 'data-id')){
          const ownerCampos = ul.closest(cfg.fieldsContainer || '[data-node="fields"], .node-fields, [data-tree="fields"]');
          const gid = getTreeGroupId(ownerCampos || ul, cfg);
          if (gid) ul.setAttribute(cfg.groupIdAttr || 'data-id', gid);
        }
        lists.push(ul);
      });
    });

    // Dedup
    const uniq = Array.from(new Set(lists)).filter(Boolean);

    // Inicializa Sortable en cada lista de “Campos”
    uniq.forEach(list=>{
      if (list.dataset.fdSortableTreeFields === '1') return;
      list.dataset.fdSortableTreeFields = '1';

      const s = new Sortable(list, {
        animation: 150,
        group: { name: 'fd-tree-fields', pull: true, put: true }, // DnD solo dentro del árbol
        draggable: cfg.fieldItem || '[data-node="field"], .node-field, li',
        handle: cfg.fieldHandle || '.fd-tab-grip, .fd-group-grip, .fd-dnd-grip, .handle, .drag-handle',
        ghostClass: 'fd-dnd-ghost',
        swapThreshold: 0.5,
        emptyInsertThreshold: 8,
        forceFallback: true,
        fallbackOnBody: true,
        onAdd: (evt)=>{
          const item = evt.item;
          const fieldId = getTreeFieldId(item, cfg);
          const targetGroupId = getTreeGroupId(evt.to, cfg);
          const prev = item.previousElementSibling;
          const afterFieldId = prev ? getTreeFieldId(prev, cfg) : null;

          if (!fieldId || !targetGroupId){
            console.warn('[FD Lite][Tree] Falta fieldId/groupId en drop.', { fieldId, targetGroupId });
          } else {
            moveLiveField(fieldId, targetGroupId, afterFieldId);
          }

          // No mantenemos el DOM insertado por Sortable (lo gestiona el árbol)
          try { item.remove(); } catch {}
          // Si tienes un refresco del árbol, invócalo aquí:
          // window.refreshTree && window.refreshTree();
        }
      });
      sortables.push(s);
    });
  }

  function getTreeFieldId(node, cfg){
    return node?.getAttribute?.(cfg.fieldIdAttr || 'data-field-id') || null;
  }
  function getTreeGroupId(node, cfg){
    if (!node) return null;
    // Busca el atributo en el propio nodo o en su "Campos" más cercano
    const attr = cfg.groupIdAttr || 'data-group-id';
    return node.getAttribute?.(attr) ||
           node.closest?.(cfg.fieldsContainer || '[data-node="fields"], .node-fields, [data-tree="fields"]')?.getAttribute?.(attr) ||
           null;
  }

  // Mueve el wrapper real del campo al body del grupo destino (en #fd-root)
  function moveLiveField(fieldId, groupId, afterFieldId){
    const wrap = findLiveFieldWrapper(fieldId);
    const body = findLiveGroupBody(groupId);
    if (!wrap || !body){
      console.warn('[FD Lite][Tree] No se encontró wrapper/body en #fd-root', { fieldId, groupId, wrap, body });
      return;
    }
    markFieldWrapper(wrap);
    ensureFieldGrip(wrap);

    // Asegura Sortable en el contenedor destino (por si estaba vacío)
    if (body.dataset.fdSortableField !== '1'){
      ensureFieldContainerSortable(body, []);
    }

    if (afterFieldId){
      const ref = findLiveFieldWrapper(afterFieldId);
      if (ref && ref.parentElement === body){
        body.insertBefore(wrap, ref.nextSibling);
      } else {
        body.appendChild(wrap);
      }
    } else {
      body.appendChild(wrap);
    }
    rebindMovedField(wrap);
    window.fdLayoutChanged && window.fdLayoutChanged();
  }

  // Busca el wrapper de campo en el formulario vivo (#fd-root)
  function findLiveFieldWrapper(fieldId){
    if (!fieldId) return null;
    // 1) data-field-id exacto
    let el = $('#fd-root [data-field-id="'+cssEscape(fieldId)+'"]');
    if (el) return el;

    // 2) por control name o id, sube al wrapper típico
    const ctrl = $('#fd-root [name="'+cssEscape(fieldId)+'"], #fd-root #'+cssEscape(fieldId));
    if (ctrl){
      el = ctrl.closest('.form-group, .mb-3, .form-floating, .input-group, .fd-field, [data-field-wrapper], tr, li');
      if (el) return el;
    }
    return null;
  }

  // Encuentra el body real del grupo/fieldset destino
  function findLiveGroupBody(groupId){
    if (!groupId) return null;
    // grupo por data-group-id o por data-fieldset-name/id
    let group = $('#fd-root [data-group-id="'+cssEscape(groupId)+'"], #fd-root [data-fieldset-name="'+cssEscape(groupId)+'"], #fd-root #'+cssEscape(groupId));
    if (!group) return null;
    return pickFieldsContainer(group) || group;
  }

  // Asegura que exista esta utilidad (se usa también arriba)
  function pickFieldsContainer(base){
    if (!base || base.nodeType!==1) return null;
    if (base.matches('table')) return (base.tBodies && base.tBodies[0]) || base;
    const body = base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .accordion-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row');
    return body || base;
  }
})();

// ---- SERIALIZACIÓN Y GUARDADO DEL LAYOUT ----
(function(){
  const SAVE_URL = 'save-layout.php';          // endpoint PHP
  const BASE_JSON = 'formulariogenerico2.json';// nombre del archivo base (en /json/)
  let saveTimer = null;
  let lastPayload = '';

  function serializeLayout(){
    const root = document.getElementById('fd-root');
    if (!root) return {};

    // Tabs (si existen)
    const tabs = [];
    const tabList = root.querySelector('ul.nav.nav-tabs');
    if (tabList){
      tabList.querySelectorAll(':scope > li > button[data-bs-target]').forEach(btn=>{
        const paneId = btn.getAttribute('data-bs-target')?.replace('#','') || '';
        tabs.push({
          id: paneId || slug(btn.textContent),
          title: (btn.textContent||'').trim(),
          pane: paneId
        });
      });
    }

    // Grupos (fieldsets/cards) dentro de cada tab-pane (o sin tabs)
    const groups = [];
    const groupEls = root.querySelectorAll('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root .fd-fieldset');
    groupEls.forEach(g=>{
      const gid = g.getAttribute('data-group-id') || g.getAttribute('data-fieldset-name') || g.id || slug(getGroupTitle(g));
      if (!g.getAttribute('data-group-id')) g.setAttribute('data-group-id', gid);

      const parentPane = g.closest('.tab-pane');
      const tabRef = parentPane ? parentPane.id : null;

      const body = pickFieldsContainer(g) || g;
      // Wrappers directos de campos
      const fieldWrappers = Array.from(body.children).filter(isFieldWrapperDirect);
      const fields = fieldWrappers.map(w=>{
        const fid = w.getAttribute('data-field-id') ||
          w.querySelector('[name]')?.getAttribute('name') ||
          w.querySelector('[id]')?.getAttribute('id') ||
          slug(w.textContent||'campo');
        if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);
        return {
          id: fid,
          label: (w.querySelector('label')?.textContent||fid||'').trim()
        };
      });

      groups.push({
        id: gid,
        title: getGroupTitle(g),
        tab: tabRef,
        fields: fields
      });
    });

    return {
      archivo: BASE_JSON,
      tabs: tabs,
      groups: groups,
      timestamp: Date.now()
    };
  }

  function slug(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-_.]+/g,''); }
  function getGroupTitle(g){
    const t = g.querySelector(':scope > legend, :scope > .card-header, :scope > [data-fieldset-title]');
    if (t) return (t.textContent||'').trim() || 'Grupo';
    return g.getAttribute('data-fieldset-name') || g.id || 'Grupo';
  }
  // Reutilizamos pickFieldsContainer y isFieldWrapperDirect si ya existen; si no, define fallback
  if (typeof pickFieldsContainer !== 'function'){
    window.pickFieldsContainer = function(base){
      if (!base) return null;
      if (base.matches('table')) return base.tBodies[0] || base;
      return base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .accordion-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row') || base;
    };
  }
  if (typeof isFieldWrapperDirect !== 'function'){
    window.isFieldWrapperDirect = function(el){
      if (!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
      if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
      if (el.matches('.row,[class*="col-"],.col')) return false;
      return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
    };
  }

  function queueSave(){
    const data = serializeLayout();
    const payload = JSON.stringify(data);
    if (payload === lastPayload) return; // sin cambios reales
    lastPayload = payload;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(()=> doSave(payload), 600); // debounce 600ms
  }

  function doSave(payload){
    fetch(SAVE_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: payload
    })
    .then(r=>r.json().catch(()=>null))
    .then(res=>{
      console.log('[Layout] Guardado', res);
    })
    .catch(err=>{
      console.warn('[Layout] Error guardando', err);
    });
  }

  // Exponer para pruebas
  window.fdSerializeLayout = serializeLayout;
  window.fdQueueSaveLayout = queueSave;

  // Hook central que llamaremos tras cada cambio DnD
  window.fdLayoutChanged = function(){
    queueSave();
    // Opcional: volver a pintar árbol si quieres reflejar orden
    window.renderJsonTreeFromForm && window.renderJsonTreeFromForm();
  };
})();


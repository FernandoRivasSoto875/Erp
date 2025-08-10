(function(){
  // Dependencias: opcional SortableJS. Si no está, usa fallback nativo básico para tabs/campos.
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const hasSortable = ()=> typeof window.Sortable !== 'undefined';

  // Estilos: ocultar lápices/edición en el formulario en modo diseño y mostrar manilla de arrastre
  injectStyles();
  function injectStyles(){
    if ($('#fd-form-dnd-styles')) return;
    const css = `
      #fd-root.design-mode .fd-edit-btn,
      #fd-root.design-mode .fd-field-edit,
      #fd-root.design-mode .field-edit-btn,
      #fd-root.design-mode .btn-edit,
      #fd-root.design-mode [data-action="edit-field"]{ display:none !important; }
      #fd-root.design-mode .fd-dnd-handle{ cursor:grab; opacity:.8; }
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.6; background:#eef2ff !important; }
    `;
    const st = document.createElement('style');
    st.id = 'fd-form-dnd-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // Util: clonado simple
  const deepClone = (o)=> JSON.parse(JSON.stringify(o||null));

  // Persistir solo la raíz afectada
  async function postGuardarRoot(rootName, newValue){
    try{
      const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || 'json/formulariogenerico2.json';
      const fd = new FormData();
      fd.append('archivo', archivo);
      fd.append(rootName, JSON.stringify(newValue));
      const r = await fetch('guardar_layout.php', { method:'POST', body: fd });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const j = await r.json().catch(()=> ({}));
      if (j && j.error) throw new Error(j.error);
    }catch(err){
      console.warn('[form-dnd] Error guardando:', err);
    }
  }

  // Observa activación de modo diseño
  whenRootReady((root)=>{
    const mo = new MutationObserver(()=> {
      const on = root.classList.contains('design-mode');
      if (on) enableDesignDnD(); else disableDesignDnD();
    });
    mo.observe(root, { attributes:true, attributeFilter:['class'] });

    // estado inicial
    if (root.classList.contains('design-mode')) enableDesignDnD();
  });

  function whenRootReady(cb){
    const root = document.getElementById('fd-root');
    if (root) return cb(root);
    const mo = new MutationObserver(()=>{
      const r = document.getElementById('fd-root');
      if (r){ mo.disconnect(); cb(r); }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  // Estado para destruir DnD al salir de diseño
  const state = { sortables: [], native: [] };

  function enableDesignDnD(){
    destroyAllDnD();
    // Tabs
    attachTabsDnD();
    // Fields por fieldset
    attachFieldsDnD();
  }

  function disableDesignDnD(){
    destroyAllDnD();
  }

  function destroyAllDnD(){
    state.sortables.forEach(s=> { try{s && s.destroy && s.destroy();}catch{} });
    state.sortables = [];
    state.native.forEach(off=> { try{off && off();}catch{} });
    state.native = [];
  }

  // --------- DnD de Tabs (Bootstrap nav-tabs) ----------
  function attachTabsDnD(){
    const json = window.formularioJsonOriginal;
    const tabsJson = json?.layout?.main?.tabs;
    if (!Array.isArray(tabsJson) || tabsJson.length===0) return;

    // Detecta el UL de pestañas cuyo conteo coincide
    const candidates = $$('#fd-root .nav-tabs');
    const ul = candidates.find(u => u.children.length === tabsJson.length);
    if (!ul) return;

    // Marca cada LI con data-tab-title
    Array.from(ul.children).forEach((li, i)=>{
      const link = li.querySelector('a,button');
      const title = (link?.textContent || '').trim();
      li.dataset.tabTitle = title;
      li.classList.add('fd-dnd-handle');
    });

    if (hasSortable()){
      const s = new Sortable(ul, {
        animation: 150,
        draggable: 'li',
        handle: 'li',
        ghostClass: 'fd-dnd-ghost',
        onEnd: async (evt)=>{
          if (!evt || evt.from !== evt.to) return;
          await applyTabsNewOrderByDom(ul);
        }
      });
      state.sortables.push(s);
    } else {
      // Fallback nativo básico
      const off = initNativeListDnD(ul, async ()=> await applyTabsNewOrderByDom(ul));
      state.native.push(off);
    }
  }

  async function applyTabsNewOrderByDom(ul){
    try{
      const json = window.formularioJsonOriginal;
      const oldTabs = json?.layout?.main?.tabs;
      if (!Array.isArray(oldTabs)) return;

      // Nuevo orden por títulos
      const newOrderTitles = Array.from(ul.children).map(li => (li.dataset.tabTitle||'').trim());
      const used = new Set();
      const newTabs = [];
      newOrderTitles.forEach(t=>{
        const idx = oldTabs.findIndex((x, i)=> !used.has(i) && String(x.title||'').trim() === t);
        if (idx>=0){ newTabs.push(deepClone(oldTabs[idx])); used.add(idx); }
      });
      // Conserva los que no aparecieron (por si no coincidieron) al final
      oldTabs.forEach((tab, i)=> { if (!used.has(i)) newTabs.push(deepClone(tab)); });

      // Actualiza en memoria y persiste layout
      const newLayout = deepClone(json.layout);
      newLayout.main = newLayout.main || {};
      newLayout.main.tabs = newTabs;
      window.formularioJsonOriginal.layout = newLayout;
      await postGuardarRoot('layout', newLayout);

      // Reordena también .tab-content si existe (por data-bs-target/href)
      const tabContent = ul.nextElementSibling && ul.nextElementSibling.classList.contains('tab-content') ? ul.nextElementSibling : $('#fd-root .tab-content');
      if (tabContent){
        const panes = Array.from(tabContent.children);
        // Mapear pane por texto del header si coincide data-tab-title con pane aria-labelledby o por orden previo
        // Heurística: usa el índice actual según títulos
        const paneMap = new Map();
        panes.forEach((p, i)=> paneMap.set(i, p));
        // Mover panes siguiendo el nuevo orden de LI
        newOrderTitles.forEach((_, i)=> {
          const pane = paneMap.get(i);
          if (pane) tabContent.appendChild(pane);
        });
      }
    }catch(e){
      console.error('[form-dnd] Reordenando tabs:', e);
      alert('No se pudo reordenar pestañas.');
    }
  }

  // --------- DnD de Fields por Fieldset ----------
  function attachFieldsDnD(){
    const json = window.formularioJsonOriginal;
    const fieldsets = json?.fieldsets;
    if (!fieldsets || typeof fieldsets !== 'object') return;

    Object.keys(fieldsets).forEach(fsName=>{
      const campos = fieldsets[fsName]?.campos;
      if (!Array.isArray(campos) || campos.length === 0) return;

      // Encuentra wrappers DOM de cada campo por su "nombre"
      const wrappers = [];
      campos.forEach(c=>{
        const name = c?.nombre || c?.name || c?.field || '';
        if (!name) return;
        // Busca el control y su contenedor visual
        const ctrl = findFieldControlInDOM(name);
        if (!ctrl) return;
        const wrap = closestFieldWrapper(ctrl);
        if (wrap) wrappers.push({ name, wrap });
      });
      if (wrappers.length < 2) return;

      // Determina contenedor común
      const container = commonParent(wrappers.map(w=> w.wrap));
      if (!container) return;

      // Asegura data-name en cada wrapper y handle de arrastre
      wrappers.forEach(({name, wrap})=>{
        wrap.dataset.fdName = name;
        if (!wrap.querySelector('.fd-dnd-handle')){
          const h = document.createElement('div');
          h.className = 'fd-dnd-handle';
          h.title = 'Arrastra para reordenar';
          h.style.minWidth = '12px';
          h.style.minHeight = '12px';
          h.style.display = 'inline-block';
          h.style.marginRight = '4px';
          // Inserta un pequeño handler al inicio del wrapper (no altera contenido)
          wrap.insertBefore(h, wrap.firstChild);
        }
      });

      if (hasSortable()){
        const s = new Sortable(container, {
          animation: 150,
          draggable: directChildSelector(container, wrappers.map(w=>w.wrap)),
          handle: '.fd-dnd-handle',
          ghostClass: 'fd-dnd-ghost',
          onEnd: async (evt)=>{
            if (!evt || evt.from !== evt.to) return;
            await applyFieldsNewOrderByDom(container, fsName);
          }
        });
        state.sortables.push(s);
      } else {
        const off = initNativeListDnD(container, async ()=> await applyFieldsNewOrderByDom(container, fsName), '.fd-dnd-handle');
        state.native.push(off);
      }
    });
  }

  function directChildSelector(container, elements){
    // Construye un selector que asegure arrastrar solo wrappers directos del contenedor
    // Preferimos usar > .form-group / > .mb-3 / > [data-fd-name]
    const classes = ['form-group','mb-3','form-floating'];
    const selectors = classes.map(c=> `:scope > .${c}`);
    selectors.push(':scope > [data-fd-name]');
    // Si ninguno coincide, permite todos los hijos elemento
    const anyMatch = elements.some(el => el.parentElement === container && (classes.some(c=> el.classList.contains(c)) || el.hasAttribute('data-fd-name')));
    return anyMatch ? selectors.join(',') : ':scope > *';
  }

  async function applyFieldsNewOrderByDom(container, fsName){
    try{
      const json = window.formularioJsonOriginal;
      const fs = json?.fieldsets?.[fsName];
      const old = Array.isArray(fs?.campos) ? fs.campos : [];
      if (!old.length) return;

      // Orden nuevo por wrappers (buscando el control y su name/id)
      const children = Array.from(container.children).filter(ch=> ch.querySelector('[name], [id], [data-fd-name]'));
      const namesInDom = children.map(ch=>{
        const byData = ch.getAttribute('data-fd-name');
        if (byData) return byData;
        const ctrl = ch.querySelector('[name]');
        if (ctrl && ctrl.name) return ctrl.name;
        const byId = ch.querySelector('[id]');
        if (byId && byId.id) return byId.id;
        return null;
      }).filter(Boolean);

      // Mapea campos del JSON por "nombre" y reordena
      const mapByName = new Map();
      old.forEach(c=> { const n = c?.nombre || c?.name || c?.field; if (n) mapByName.set(n, c); });

      const newCampos = [];
      const used = new Set();
      namesInDom.forEach(n=>{
        if (!mapByName.has(n)) return;
        newCampos.push(deepClone(mapByName.get(n)));
        used.add(n);
      });
      // Conserva los no encontrados al final
      old.forEach(c=>{
        const n = c?.nombre || c?.name || c?.field;
        if (n && !used.has(n)) newCampos.push(deepClone(c));
      });

      // Actualiza en memoria y persiste fieldsets (solo el que cambió)
      const newFieldsets = deepClone(json.fieldsets || {});
      if (!newFieldsets[fsName]) newFieldsets[fsName] = {};
      newFieldsets[fsName].campos = newCampos;
      window.formularioJsonOriginal.fieldsets = newFieldsets;
      await postGuardarRoot('fieldsets', newFieldsets);
    }catch(e){
      console.error('[form-dnd] Reordenando campos:', e);
      alert('No se pudo reordenar campos.');
    }
  }

  // --------- Utilidades DOM ----------
  function findFieldControlInDOM(name){
    // Busca por name, id y data-name
    let el = $(`#fd-root [name="${cssEscape(name)}"]`);
    if (el) return el;
    el = $(`#fd-root [data-name="${cssEscape(name)}"]`);
    if (el) return el;
    el = $(`#fd-root #${cssEscape(name)}`);
    return el || null;
  }

  function closestFieldWrapper(el){
    return el.closest('.form-group, .mb-3, .form-floating, .fd-field, .col, .row') || el.parentElement;
  }

  function commonParent(nodes){
    if (!nodes.length) return null;
    if (nodes.length === 1) return nodes[0].parentElement;
    const paths = nodes.map(n=>{
      const arr = []; let x = n;
      while (x){ arr.unshift(x); x = x.parentElement; }
      return arr;
    });
    let i = 0;
    while (true){
      const a = paths[0][i];
      if (!a) break;
      if (paths.some(p=> p[i] !== a)) break;
      i++;
    }
    return paths[0][i-1] || null;
  }

  function cssEscape(s){
    return String(s).replace(/(["\\.#\[\]:])/g, '\\$1');
  }

  // Fallback DnD nativo simple para listas (ul/li o contenedor lineal)
  function initNativeListDnD(container, onDrop, handleSelector){
    let dragEl = null;
    const onDragStart = (e)=>{
      const target = handleSelector ? e.target.closest(handleSelector) : e.target;
      const row = target ? target.closest(':scope > *') : null;
      if (!row || row.parentElement !== container) return;
      dragEl = row;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'drag');
      setTimeout(()=> dragEl.classList.add('fd-dnd-ghost'), 0);
    };
    const onDragOver = (e)=>{
      if (!dragEl) return;
      const over = e.target.closest(':scope > *');
      if (!over || over.parentElement !== container) return;
      e.preventDefault();
      const rect = over.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height/2;
      if (before) container.insertBefore(dragEl, over);
      else container.insertBefore(dragEl, over.nextSibling);
    };
    const onDropEv = async (e)=>{
      if (!dragEl) return;
      e.preventDefault();
      dragEl.classList.remove('fd-dnd-ghost');
      dragEl = null;
      try{ await onDrop(); }catch{}
    };
    container.addEventListener('dragstart', onDragStart);
    container.addEventListener('dragover', onDragOver);
    container.addEventListener('drop', onDropEv);
    // Hacer hijos arrastrables
    Array.from(container.children).forEach(ch=>{
      ch.setAttribute('draggable', 'true');
    });
    return ()=> {
      container.removeEventListener('dragstart', onDragStart);
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('drop', onDropEv);
      Array.from(container.children).forEach(ch=> ch.removeAttribute('draggable'));
    };
  }
})();
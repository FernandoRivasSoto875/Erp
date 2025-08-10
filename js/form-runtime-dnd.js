(function(){
  // DnD SOLO en el formulario y SOLO en modo diseño (#fd-root.design-mode)
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const hasSortable = ()=> typeof window.Sortable !== 'undefined';

  // Estilos mínimos para DnD (sin ocultar lápiz ni otras acciones)
  injectStyles();
  function injectStyles(){
    if ($('#fd-form-dnd-styles')) return;
    const css = `
      #fd-root.design-mode .fd-dnd-handle{ cursor:grab; opacity:.9; user-select:none; }
      #fd-root.design-mode .fd-dnd-ghost{ opacity:.6; background:#eef2ff !important; }
      #fd-root.design-mode .fd-dnd-grip{ cursor:grab; opacity:.8; margin-right:6px; user-select:none; }
      #fd-root.design-mode .nav-tabs .fd-dnd-grip{ font-size:.9em; }
    `;
    const st = document.createElement('style');
    st.id = 'fd-form-dnd-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  const state = { sortables: [], native: [], attached: new WeakSet(), mo: null };
  const debounce = (fn, ms=100)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const isDesign = ()=> !!document.getElementById('fd-root')?.classList.contains('design-mode');

  whenRootReady((root)=>{
    const moClass = new MutationObserver(()=> { isDesign() ? enableDesignDnD() : disableDesignDnD(); });
    moClass.observe(root, { attributes:true, attributeFilter:['class'] });
    if (isDesign()) enableDesignDnD();
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

  function enableDesignDnD(){
    destroyAllDnD();
    setTimeout(()=>{
      attachTabsDnD();
      attachFieldsDnD();
      attachFieldsetsDnD(); // NUEVO: mover grupos (fieldsets)
      const root = document.getElementById('fd-root');
      if (root){
        const rescan = debounce(()=>{
          if (!isDesign()) return;
          attachTabsDnD();
          attachFieldsDnD();
          attachFieldsetsDnD(); // re-escanea fieldsets
        }, 150);
        state.mo = new MutationObserver(rescan);
        state.mo.observe(root, { childList:true, subtree:true });
      }
    }, 50);
  }
  function disableDesignDnD(){ destroyAllDnD(); }
  function destroyAllDnD(){
    if (state.mo){ try{ state.mo.disconnect(); }catch{} state.mo = null; }
    state.sortables.forEach(s=> { try{s && s.destroy && s.destroy();}catch{} });
    state.sortables = [];
    state.native.forEach(off=> { try{off && off();}catch{} });
    state.native = [];
    state.attached = new WeakSet();
    // Limpia grips/handles añadidos
    $$('#fd-root .fd-dnd-handle, #fd-root .fd-dnd-grip').forEach(el=>{
      if (el.classList.contains('fd-dnd-handle')) el.remove();
      else el.remove();
    });
    // Quita draggable de elementos
    $$('#fd-root [draggable="true"]').forEach(el=> el.removeAttribute('draggable'));
  }

  // --------- Tabs DnD (solo UI; emite evento para que EL ÁRBOL guarde) ----------
  function attachTabsDnD(){
    const tabsJson = window.formularioJsonOriginal?.layout?.main?.tabs;
    if (!Array.isArray(tabsJson) || tabsJson.length===0) return;

    const titles = tabsJson.map(t=> String(t.title||'').trim()).filter(Boolean);
    if (!titles.length) return;

    const candidates = $$('#fd-root .nav-tabs');
    if (!candidates.length) return;

    let best = null, bestScore = 0;
    for (const ul of candidates){
      const liTitles = Array.from(ul.children).map(li=>{
        const link = getTabLink(li); return (link?.textContent || '').trim();
      });
      const score = liTitles.filter(t=> titles.includes(t)).length;
      if (score > bestScore){ best = ul; bestScore = score; }
    }
    const ul = best || candidates[0];
    if (!ul || state.attached.has(ul)) return;
    state.attached.add(ul);

    Array.from(ul.children).forEach(li=>{
      const link = getTabLink(li);
      const title = (link?.textContent || '').trim();
      li.dataset.tabTitle = title;
      li.classList.add('fd-dnd-handle');
      // Asegura data-bs-toggle y target correcto
      if (link){
        if (!link.getAttribute('data-bs-toggle')) link.setAttribute('data-bs-toggle', 'tab');
      }
      if (link && !link.querySelector('.fd-dnd-grip')){
        // Grip como handle (evita interferir con click del tab)
        link.insertAdjacentHTML('afterbegin', '<i class="fas fa-grip-lines fd-dnd-grip" title="Arrastra para reordenar pestañas">⋮⋮</i>');
      }
    });

    // Enlaza comportamiento de pestañas (Bootstrap o fallback manual)
    wireBootstrapTabs(ul);

    if (hasSortable()){
      const s = new Sortable(ul, {
        animation: 150,
        draggable: 'li',
        handle: '.fd-dnd-grip',          // usar solo grip como handle
        ghostClass: 'fd-dnd-ghost',
        onEnd: (evt)=>{
          if (!evt || evt.from !== evt.to) return;
          // Reordenar panes visualmente según nuevo orden
          reorderTabContentByUl(ul);
          emitTabsReordered(ul, tabsJson);
        }
      });
      state.sortables.push(s);
    } else {
      const off = initNativeListDnD(ul, ()=>{
        reorderTabContentByUl(ul);
        emitTabsReordered(ul, tabsJson);
      }, '.fd-dnd-grip'); // usar solo grip como handle
      state.native.push(off);
    }
  }

  function getTabLink(li){
    return li?.querySelector('a[data-bs-toggle="tab"], button[data-bs-toggle="tab"], a, button') || null;
  }

  function getTabTargetId(link){
    if (!link) return null;
    let t = link.getAttribute('data-bs-target') || link.getAttribute('href') || '';
    let id = '';
    if (t){
      t = t.trim();
      if (t.startsWith('#')) id = t.slice(1);
      else if (t.includes('#')) id = t.substring(t.indexOf('#')+1);
    }
    if (!id) id = link.getAttribute('aria-controls') || '';
    return id || null;
  }

  function findTabContentContainer(ul){
    // Prefer: siguiente hermano .tab-content
    const sib = ul.nextElementSibling;
    if (sib && sib.classList?.contains('tab-content')) return sib;
    // Buscar un .tab-content dentro de fd-root que contenga al menos una tab-pane objetivo
    const all = $$('#fd-root .tab-content');
    if (!all.length) return null;
    const ids = Array.from(ul.children).map(li => getTabTargetId(getTabLink(li))).filter(Boolean);
    for (const cont of all){
      const any = ids.some(id => cont.querySelector(`#${cssEscape(id)}`));
      if (any) return cont;
    }
    return all[0] || null;
  }

  function reorderTabContentByUl(ul){
    const cont = findTabContentContainer(ul);
    if (!cont) return;
    const orderIds = Array.from(ul.children).map(li => getTabTargetId(getTabLink(li))).filter(Boolean);
    const panes = orderIds
      .map(id => cont.querySelector(`#${cssEscape(id)}`))
      .filter(Boolean);
    panes.forEach(p => cont.appendChild(p)); // reubica panes al nuevo orden
  }

  function wireBootstrapTabs(ul){
    const cont = findTabContentContainer(ul);
    Array.from(ul.children).forEach(li=>{
      const link = getTabLink(li);
      if (!link) return;

      // Asegura atributos
      if (!link.getAttribute('data-bs-toggle')) link.setAttribute('data-bs-toggle', 'tab');

      // Bootstrap 5 si está disponible
      if (window.bootstrap && bootstrap.Tab){
        try{
          // Instancia sin guardar referencia (BS maneja internamente)
          new bootstrap.Tab(link);
        }catch{}
      } else {
        // Fallback manual: activa pane por id
        link.addEventListener('click', (e)=>{
          e.preventDefault();
          if (!cont) return;
          showTabManually(link, cont, ul);
        });
      }
    });
  }

  function showTabManually(link, tabContent, ul){
    const id = getTabTargetId(link);
    if (!id) return;

    // Quitar activos en pestañas
    Array.from(ul.children).forEach(li=>{
      li.classList.remove('active');
      const a = getTabLink(li);
      if (a){
        a.classList.remove('active');
        a.setAttribute('aria-selected', 'false');
      }
    });
    // Activar pestaña clickeada
    link.classList.add('active');
    link.setAttribute('aria-selected', 'true');
    link.closest('li')?.classList.add('active');

    // Quitar activos en panes
    Array.from(tabContent.children).forEach(p=>{
      p.classList.remove('active','show');
    });
    // Activar pane objetivo
    const pane = tabContent.querySelector(`#${cssEscape(id)}`);
    if (pane){
      pane.classList.add('active','show');
      // Asegura visibilidad si el contenedor tiene estilos de altura
      pane.style.display = '';
    }
  }

  function emitTabsReordered(ul, tabsJson){
    const oldTitles = tabsJson.map(t=> String(t.title||'').trim());
    const newOrderTitles = Array.from(ul.children).map(li => (li.dataset.tabTitle||'').trim());
    const orderIndices = newOrderTitles.map(t => oldTitles.findIndex(x=> x === t));
    window.dispatchEvent(new CustomEvent('form-dnd:tabs-reordered', {
      detail: {
        layoutPath: ['layout','main','tabs'],
        oldTitles,
        newOrderTitles,
        orderIndices
      }
    }));
  }

  // --------- Fields DnD (solo UI; emite evento para que EL ÁRBOL guarde) ----------
  function attachFieldsDnD(){
    const fieldsets = window.formularioJsonOriginal?.fieldsets;
    if (!fieldsets || typeof fieldsets !== 'object') return;

    Object.keys(fieldsets).forEach(fsName=>{
      const campos = fieldsets[fsName]?.campos;
      if (!Array.isArray(campos) || campos.length < 2) return;

      // Encuentra wrappers DOM por nombre
      const wrappers = [];
      campos.forEach(c=>{
        const name = c?.nombre || c?.name || c?.field || '';
        if (!name) return;
        const ctrl = findFieldControlInDOM(name);
        if (!ctrl) return;
        const wrap = closestFieldWrapper(ctrl);
        if (wrap) wrappers.push({ name, wrap });
      });
      if (wrappers.length < 2) return;

      const container = commonParent(wrappers.map(w=> w.wrap));
      if (!container || state.attached.has(container)) return;
      state.attached.add(container);

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
          h.innerHTML = '<i class="fas fa-grip-vertical fd-dnd-grip">⋮⋮</i>';
          wrap.insertBefore(h, wrap.firstChild);
        }
      });

      if (hasSortable()){
        const s = new Sortable(container, {
          animation: 150,
          draggable: directChildSelector(container, wrappers.map(w=>w.wrap)),
          handle: '.fd-dnd-handle',
          ghostClass: 'fd-dnd-ghost',
          onEnd: (evt)=>{
            if (!evt || evt.from !== evt.to) return;
            emitFieldsReordered(container, fsName, campos);
          }
        });
        state.sortables.push(s);
      } else {
        const off = initNativeListDnD(container, ()=> emitFieldsReordered(container, fsName, campos), '.fd-dnd-handle');
        state.native.push(off);
      }
    });
  }
  function emitFieldsReordered(container, fsName, campos){
    const oldNames = (campos||[]).map(c=> c?.nombre || c?.name || c?.field).filter(Boolean);
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
    const orderIndices = namesInDom.map(n => oldNames.findIndex(x=> x === n));
    window.dispatchEvent(new CustomEvent('form-dnd:fields-reordered', {
      detail: {
        fieldset: fsName,
        jsonPath: ['fieldsets', fsName, 'campos'],
        oldNames,
        namesInDom,
        orderIndices
      }
    }));
  }

  // --------- Fieldsets (grupo de fields) DnD: solo UI; emite evento ----------
  function attachFieldsetsDnD(){
    const fieldsets = window.formularioJsonOriginal?.fieldsets;
    if (!fieldsets || typeof fieldsets !== 'object') return;

    // Mapa: contenedor DOM => [wrapper de cada fieldset dentro]
    const byContainer = new Map();

    Object.keys(fieldsets).forEach(fsName=>{
      const fs = fieldsets[fsName] || {};
      const campos = Array.isArray(fs.campos) ? fs.campos : [];

      // 1) intenta localizar un wrapper del fieldset por atributos comunes
      let fsWrapper = findFieldsetGroupWrapper(fsName);
      let container = null;

      // 2) si no hay wrapper directo, dedúcelo por los campos que contiene
      if (!fsWrapper && campos.length){
        const fieldWraps = [];
        campos.forEach(c=>{
          const name = c?.nombre || c?.name || c?.field || '';
          if (!name) return;
          const ctrl = findFieldControlInDOM(name);
          if (!ctrl) return;
          const wrap = closestFieldWrapper(ctrl);
          if (wrap) fieldWraps.push(wrap);
        });
        if (fieldWraps.length){
          // contenedor común de campos del fieldset
          const common = commonParent(fieldWraps);
          // elegir entre los hijos directos del contenedor común el que más campos del fs contiene
          if (common){
            let bestChild = null, bestCount = 0;
            Array.from(common.children).forEach(ch=>{
              const count = fieldWraps.filter(w => ch.contains(w)).length;
              if (count > bestCount){ bestChild = ch; bestCount = count; }
            });
            if (bestChild && bestCount > 0){
              fsWrapper = bestChild;
            }
          }
        }
      }

      if (!fsWrapper) return; // no encontramos wrapper para este fieldset

      // Marca el wrapper con data-fs-name
      fsWrapper.dataset.fsName = fsName;

      // Añade grip/handle visible
      ensureFieldsetHandle(fsWrapper);

      // Determina su contenedor (padre directo)
      container = fsWrapper.parentElement;
      if (!container) return;

      // Evita reconfigurar el mismo contenedor
      if (!byContainer.has(container)) byContainer.set(container, []);
      byContainer.get(container).push(fsWrapper);
    });

    // Inicializa DnD por contenedor con 2+ fieldsets
    byContainer.forEach((wrappers, container)=>{
      if (wrappers.length < 2) return;
      if (state.attached.has(container)) return; // ya está
      state.attached.add(container);

      // Asegura que los wrappers sean hijos directos del contenedor
      const selector = ':scope > [data-fs-name]';

      if (hasSortable()){
        const s = new Sortable(container, {
          animation: 150,
          draggable: selector,
          handle: '.fd-dnd-handle, .fd-dnd-fs-handle',
          ghostClass: 'fd-dnd-ghost',
          onEnd: (evt)=>{
            if (!evt || evt.from !== evt.to) return;
            emitFieldsetsReordered(container);
          }
        });
        state.sortables.push(s);
      } else {
        const off = initNativeListDnD(container, ()=> emitFieldsetsReordered(container), '.fd-dnd-handle, .fd-dnd-fs-handle');
        state.native.push(off);
      }
    });
  }

  function findFieldsetGroupWrapper(fsName){
    // Busca por atributos/ids comunes
    const sels = [
      `#fd-root [data-fieldset="${cssEscape(fsName)}"]`,
      `#fd-root [data-fieldset-name="${cssEscape(fsName)}"]`,
      `#fd-root [data-fs="${cssEscape(fsName)}"]`,
      `#fd-root [data-fs-name="${cssEscape(fsName)}"]`,
      `#fd-root #fs-${cssEscape(fsName)}`,
      `#fd-root #fieldset-${cssEscape(fsName)}`
    ];
    for (const s of sels){
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function ensureFieldsetHandle(wrapper){
    // Inserta grip en encabezado si existe; si no, crea uno al inicio
    let target =
      wrapper.querySelector(':scope > .card-header, :scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6') ||
      wrapper.firstElementChild || wrapper;

    if (!target.querySelector('.fd-dnd-fs-handle')){
      const grip = document.createElement('span');
      grip.className = 'fd-dnd-fs-handle fd-dnd-handle';
      grip.title = 'Arrastra para mover el grupo';
      grip.style.display = 'inline-block';
      grip.style.marginRight = '6px';
      grip.innerHTML = '<i class="fas fa-grip-horizontal fd-dnd-grip">⋮⋮</i>';
      target.insertBefore(grip, target.firstChild);
    }
  }

  function emitFieldsetsReordered(container){
    const fsOrder = Array.from(container.children)
      .filter(ch => ch.hasAttribute('data-fs-name'))
      .map(ch => ch.getAttribute('data-fs-name'));
    window.dispatchEvent(new CustomEvent('form-dnd:fieldset-groups-reordered', {
      detail: {
        containerSelector: container.id ? `#${container.id}` : undefined,
        fsOrder
      }
    }));
  }

  // --------- Utils ----------
  function directChildSelector(container, elements){
    const classes = ['form-group','mb-3','form-floating','fd-field','col','row'];
    const selectors = classes.map(c=> `:scope > .${c}`);
    selectors.push(':scope > [data-fd-name]');
    const anyMatch = elements.some(el => el.parentElement === container && (classes.some(c=> el.classList.contains(c)) || el.hasAttribute('data-fd-name')));
    return anyMatch ? selectors.join(',') : ':scope > *';
  }
  function findFieldControlInDOM(name){
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
  function initNativeListDnD(container, onDrop, handleSelector){
    if (state.attached.has(container)) return ()=>{};
    state.attached.add(container);

    let dragEl = null;
    const onDragStart = (e)=>{
      const handle = handleSelector ? e.target.closest(handleSelector) : e.target;
      if (!handle) return;
      const row = handle.closest(':scope > *') || handle.closest('*');
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
    Array.from(container.children).forEach(ch=> ch.setAttribute('draggable', 'true'));

    return ()=> {
      container.removeEventListener('dragstart', onDragStart);
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('drop', onDropEv);
      Array.from(container.children).forEach(ch=> ch.removeAttribute('draggable'));
    };
  }

  // Refresco manual si cambias el DOM del formulario durante diseño
  window.formRuntimeDndRefresh = ()=> { if (isDesign()){ enableDesignDnD(); } };
})();
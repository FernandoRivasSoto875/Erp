(function(){
  // Evita doble carga del script
  if (window.__JSON_TREE_PANEL_LOADED__) return;
  window.__JSON_TREE_PANEL_LOADED__ = true;

  // Helpers
  const $ = (s, r)=> (r||document).querySelector(s);
  const $all = (s, r)=> Array.from((r||document).querySelectorAll(s));
  const typeOf = v => Array.isArray(v) ? 'array' : (v===null ? 'null' : (typeof v==='object' ? 'object' : typeof v));
  const esc = s => String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const shouldShow = ()=> !!(document.getElementById('fd-root') && document.getElementById('fd-root').classList.contains('design-mode'));

  // Helpers extra para CRUD
  const deepClone = v => JSON.parse(JSON.stringify(v));
  const getAtPath = (obj, path)=> (path||[]).reduce((acc,k)=> (acc==null?acc:acc[k]), obj);
  function setAtPath(obj, path, val){
    if (!path || !path.length) return;
    let cur = obj;
    for (let i=0;i<path.length-1;i++){
      const k = path[i];
      if (cur[k]==null || typeof cur[k]!=='object') cur[k] = (typeof path[i+1]==='number')?[]:{};
      cur = cur[k];
    }
    cur[path[path.length-1]] = val;
  }

  // CSS mínimo (posición). El look lo da Bootstrap si está cargado
  function injectStyles(){
    if ($('#json-tree-panel-styles')) return;
    const css = `
      .json-tree-panel{ position:fixed; top:60px; right:12px; width:460px; height:72vh; z-index:1055; resize:both; }
      .json-tree-panel .card-body.scroll{ overflow:auto; height:calc(100% - 94px); }
      #fd-tree-toggle-btn{ position:fixed; top:60px; right:486px; z-index:1055; }
      /* Árbol jerárquico */
      #jsonTreeBody .json-tree-item{ }
      #jsonTreeBody .json-row{ display:flex; align-items:center; gap:.5rem; padding:.25rem .5rem; }
      #jsonTreeBody .json-children{ display:none; padding-left:12px; border-left:1px dashed #e5e7eb; margin-left:8px; }
      #jsonTreeBody .json-children.show{ display:block; }
      .json-toggle{ width:1.25rem; height:1.25rem; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; color:#6c757d; cursor:pointer; }
      .json-node-key{ font-weight:600; cursor:pointer; }
      .json-drag-ghost{ opacity:.6; background:#eef2ff !important; }
    `;
    const st = document.createElement('style'); st.id='json-tree-panel-styles'; st.textContent = css;
    document.head.appendChild(st);
  }

  // Carga JSON si no viene embebido
  async function ensureJsonLoaded(){
    if (window.formularioJsonOriginal && typeof window.formularioJsonOriginal === 'object') return window.formularioJsonOriginal;
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    if (!archivo){ window.formularioJsonOriginal = {}; return window.formularioJsonOriginal; }
    const r = await fetch('json/' + archivo, { cache:'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar json/' + archivo + ' ('+r.status+')');
    window.formularioJsonOriginal = await r.json();
    return window.formularioJsonOriginal;
  }

  // UI: panel y botón (Bootstrap si existe)
  function ensurePanel(){
    let panel = $('#json-tree-panel');
    if (panel) return panel;
    injectStyles();
    panel = document.createElement('div');
    panel.id = 'json-tree-panel';
    panel.className = 'json-tree-panel card shadow';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="card-header d-flex align-items-center justify-content-between py-2">
        <h6 class="mb-0 json-tree-title"><i class="fas fa-sitemap me-1"></i> Árbol del JSON</h6>
        <div class="d-flex align-items-center gap-1">
          <button id="jsonTreeInit" type="button" class="btn btn-link btn-sm text-secondary" title="Inicializar estructura"><i class="fas fa-seedling"></i></button>
          <button id="jsonTreeRefresh" type="button" class="btn btn-link btn-sm text-secondary" title="Refrescar"><i class="fas fa-sync-alt"></i></button>
          <button id="jsonTreeClose" type="button" class="btn btn-link btn-sm text-secondary" title="Cerrar"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="card-body py-2 border-bottom">
        <div class="input-group input-group-sm">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
          <input id="jsonTreeFilter" type="search" class="form-control" placeholder="Filtrar...">
          <button id="jsonTreeFilterClear" class="btn btn-outline-secondary" type="button" title="Limpiar">×</button>
        </div>
      </div>
      <div class="card-body p-0 scroll">
        <div class="list-group list-group-flush" id="jsonTreeBody"></div>
      </div>
    `;
    document.body.appendChild(panel);
    $('#jsonTreeClose').addEventListener('click', ()=> panel.style.display='none');
    $('#jsonTreeRefresh').addEventListener('click', ()=>{ buildTree(true); });
    $('#jsonTreeFilter').addEventListener('input', ()=>{ filterTree(); updateSortablesDisabled(); });
    $('#jsonTreeFilterClear').addEventListener('click', ()=>{ const i=$('#jsonTreeFilter'); if(i){ i.value=''; buildTree(true); updateSortablesDisabled(); }});
    $('#jsonTreeInit').addEventListener('click', ensureBaseStructureInteractive);
    bindTreeEvents();
    return panel;
  }

  function ensureToggleButton(){
    if ($('#fd-tree-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'fd-tree-toggle-btn';
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-sm shadow position-fixed';
    btn.style.top = '60px';
    btn.style.right = '486px';
    btn.innerHTML = '<i class="fas fa-sitemap me-1"></i> Árbol';
    btn.addEventListener('click', async ()=>{
      const p = ensurePanel();
      const hidden = getComputedStyle(p).display === 'none';
      p.style.display = hidden ? '' : 'none';
      if (hidden){
        try { await ensureJsonLoaded(); } catch(e){ console.error(e); }
        buildTree(true);
      }
    });
    btn.style.display = 'none';
    document.body.appendChild(btn);
  }

  // Render del árbol jerárquico (colapsado por defecto)
  function buildTree(resetState=false){
    if (!shouldShow()) return;
    const body = $('#jsonTreeBody'); if (!body) return;
    const data = window.formularioJsonOriginal || {};

    // NUEVO: capturar ramas abiertas antes de reconstruir (si no vamos a resetear)
    const openPaths = (!resetState) ? captureOpenPaths() : [];

    const preferred = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = preferred.filter(k => Object.prototype.hasOwnProperty.call(data, k))
      .concat(Object.keys(data).filter(k => !preferred.includes(k)));

    body.innerHTML = keys.length
      ? keys.map(k => renderNode(k, data[k], [k], /*isRoot*/true)).join('')
      : `<div class="list-group-item text-muted py-2">JSON vacío</div>`;

    if (resetState){
      // Colapsar todo por defecto al reconstruir
      $all('#jsonTreeBody .json-children').forEach(c=> c.classList.remove('show'));
    } else {
      // NUEVO: restaurar ramas abiertas
      restoreOpenPaths(openPaths);
    }
    updatePanelTitle();

    // Enlazar acciones CRUD tras render
    bindCrudActions();
    // Inicializar DnD en hijos de cada padre
    initTreeDnD();
    // Desactivar DnD si hay filtro activo
    updateSortablesDisabled();
  }

  function hasChildrenValue(val){
    const t = typeOf(val);
    if (t==='object') return Object.keys(val||{}).length>0;
    if (t==='array') return (val||[]).length>0;
    return false;
  }

  function renderNode(key, val, path, isRoot){
    const t = typeOf(val);
    const meta = (t==='object') ? 'object' : (t==='array') ? `array(${(val||[]).length})` : renderValue(val);
    const canToggle = hasChildrenValue(val);

    let html = `<div class="json-tree-item" data-path='${esc(JSON.stringify(path))}'>`;
    html += `<div class="json-row list-group-item border-0 border-bottom">`;
    html += canToggle
      ? `<button class="json-toggle" aria-label="expandir"><i class="fas fa-chevron-right"></i></button>`
      : `<span style="display:inline-block;width:1.25rem;"></span>`;
    html += `<span class="json-node-key">${esc(String(key))}</span>`;
    html += `<small class="text-secondary ms-auto">${esc(meta)}</small>`;
    html += `<span class="json-node-actions ms-2">
        <button class="btn btn-link btn-sm text-secondary p-0 act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn btn-link btn-sm text-secondary p-0 act-dup" title="Duplicar"><i class="fas fa-clone"></i></button>
        <button class="btn btn-link btn-sm text-secondary p-0 act-rename" title="Renombrar"><i class="fas fa-i-cursor"></i></button>
        <button class="btn btn-link btn-sm text-danger p-0 act-del" title="Eliminar"><i class="fas fa-trash"></i></button>
      </span>`;
    html += `</div>`;

    if (t==='object' || t==='array'){
      const children = (t==='object')
        ? Object.keys(val||{}).map(k=> renderNode(k, val[k], path.concat(k), false)).join('')
        : (val||[]).map((item, idx)=> renderNode(`[${idx}]`, item, path.concat(idx), false)).join('');
      html += `<div class="json-children">${children}</div>`;
    }
    html += `</div>`;
    return html;
  }

  function renderValue(v){
    const t = typeOf(v);
    if (t==='string') return `"${v}"`;
    if (t==='number' || t==='boolean') return String(v);
    if (t==='null') return 'null';
    if (t==='array') return `array(${(v||[]).length})`;
    if (t==='object') return 'object';
    return String(v);
  }

  function updatePanelTitle(){
    const title = $('.json-tree-title'); if (!title) return;
    const count = $('#jsonTreeBody')?.querySelectorAll('.json-tree-item')?.length || 0;
    title.textContent = `Árbol del JSON (${count})`;
  }

  // Toggle expand/collapse
  function bindTreeEvents(){
    const body = $('#jsonTreeBody'); if (!body) return;
    body.addEventListener('click', (e)=>{
      const toggleBtn = e.target.closest('.json-toggle');
      const keyEl = e.target.closest('.json-node-key');
      if (toggleBtn || keyEl){
        const item = (toggleBtn || keyEl)?.closest('.json-tree-item');
        if (!item) return;
        const children = item.querySelector(':scope > .json-children');
        if (!children) return;
        const isOpen = children.classList.toggle('show');
        const icon = item.querySelector(':scope > .json-row .json-toggle i');
        if (icon){
          icon.classList.toggle('fa-chevron-right', !isOpen);
          icon.classList.toggle('fa-chevron-down', isOpen);
        }
      }
    });
  }

  // Filtro: muestra nodos coincidentes y abre sus ancestros
  function filterTree(){
    const q = ($('#jsonTreeFilter')?.value || '').trim().toLowerCase();
    const rootCont = $('#jsonTreeBody'); if (!rootCont) return;

    if (!q){
      $all('.json-tree-item', rootCont).forEach(it=> it.style.display = '');
      $all('.json-children', rootCont).forEach(c=> c.classList.remove('show'));
      $all('.json-toggle i', rootCont).forEach(i=> { i.classList.add('fa-chevron-right'); i.classList.remove('fa-chevron-down'); });
      updatePanelTitle();
      return;
    }

    const apply = (container)=>{
      let any=false;
      const items = $all(':scope > .json-tree-item', container);
      items.forEach(it=>{
        const row = it.querySelector(':scope > .json-row');
        const text = (row?.textContent || '').toLowerCase();
        const matchSelf = text.includes(q);
        const children = it.querySelector(':scope > .json-children');
        let matchChild = false;
        if (children) matchChild = apply(children);

        const show = matchSelf || matchChild;
        it.style.display = show ? '' : 'none';

        if (children){
          const open = matchChild || matchSelf;
          children.classList.toggle('show', open);
          const icon = it.querySelector(':scope > .json-row .json-toggle i');
          if (icon){
            icon.classList.toggle('fa-chevron-right', !open);
            icon.classList.toggle('fa-chevron-down', open);
          }
        }
        any = any || show;
      });
      return any;
    };

    apply(rootCont);
    updatePanelTitle();
  }

  // Guardado por raíz (si lo usas con los botones)
  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    ['parametros','layout','fieldsets','elementos_fuera'].forEach(k=>{
      if (Object.prototype.hasOwnProperty.call(blocks, k)) form.append(k, JSON.stringify(blocks[k]));
    });
    return fetch('guardar_layout.php', { method:'POST', body: form }).then(r=>r.json());
  }

  // Persistir raíz afectada
  async function persistRootByPath(path, updatedRoot){
    const rootKey = path[0];
    // Persistencia optimista: actualiza el estado local primero
    if (!window.formularioJsonOriginal) window.formularioJsonOriginal = {};
    window.formularioJsonOriginal[rootKey] = updatedRoot;
    try{
      await postGuardar({ [rootKey]: updatedRoot });
    }catch(err){
      console.warn('[json-tree] Error al guardar en servidor, se mantiene estado local:', err);
    }
  }

  async function ensureBaseStructureInteractive(){
    await ensureJsonLoaded();
    const data = window.formularioJsonOriginal || {};
    const payload = {};
    if (!data.parametros || typeof data.parametros!=='object') payload.parametros = {};
    if (!data.layout || typeof data.layout!=='object') payload.layout = { header:{type:'header',rows:[]}, main:{type:'generic',rows:[{columns:[{width:12}]}]}, footer:{type:'footer',rows:[]} };
    if (!data.fieldsets || typeof data.fieldsets!=='object') payload.fieldsets = {};
    if (!Array.isArray(data.elementos_fuera)) payload.elementos_fuera = [];
    if (!Object.keys(payload).length) { alert('La estructura base ya existe.'); return; }
    await postGuardar(payload);
    window.formularioJsonOriginal = { ...data, ...payload };
    buildTree(true);
  }

  // CRUD: binding
  function bindCrudActions(){
    const body = $('#jsonTreeBody'); if (!body) return;
    if (body.__crudBound) return;
    body.__crudBound = true;
    body.addEventListener('click', (e)=>{
      const btn = e.target.closest('.json-node-actions .btn'); if (!btn) return;
      const item = e.target.closest('.json-tree-item'); if (!item) return;
      let path; try { path = JSON.parse(item.getAttribute('data-path')); } catch { return; }

      if (btn.classList.contains('act-edit'))   { e.preventDefault(); editNodeByPath(path); return; }
      if (btn.classList.contains('act-dup'))    { e.preventDefault(); duplicateNodeByPath(path); return; }
      if (btn.classList.contains('act-del'))    { e.preventDefault(); deleteNodeByPath(path); return; }
      if (btn.classList.contains('act-rename')) { e.preventDefault(); renameNodeByPath(path); return; }
    });
  }

  // CRUD: editar valor
  async function editNodeByPath(path){
    try{
      const data = window.formularioJsonOriginal || {};
      const rootKey = path[0], sub = path.slice(1);
      let root = deepClone(data[rootKey]);
      let cur  = sub.length ? getAtPath(root, sub) : root;

      const prev = (typeOf(cur)==='object' || typeOf(cur)==='array') ? JSON.stringify(cur, null, 2) : JSON.stringify(cur);
      const input = window.prompt('Editar valor (JSON)\nEj: "texto", 123, true, {"a":1}', prev);
      if (input == null) return;
      let val; try { val = JSON.parse(input); } catch(e){ alert('JSON inválido: ' + e.message); return; }

      if (sub.length === 0) root = val; else setAtPath(root, sub, val);
      await persistRootByPath(path, root);
      buildTree();
    }catch(err){ console.error(err); alert('Error al editar: '+(err.message||err)); }
  }

  // CRUD: duplicar
  async function duplicateNodeByPath(path){
    try{
      const data = window.formularioJsonOriginal || {};
      const rootKey = path[0], sub = path.slice(1);
      let root = deepClone(data[rootKey]);

      const parentPath = sub.slice(0,-1);
      const key = sub[sub.length-1];
      let parent = parentPath.length ? getAtPath(root, parentPath) : root;
      if (parent == null) return;

      const val = deepClone(parent[key]);

      if (Array.isArray(parent)){
        if (typeof key !== 'number') { alert('Índice inválido.'); return; }
        parent.splice(key+1, 0, val);
      } else if (parent && typeof parent === 'object'){
        const base = String(key);
        let nk = base + '_copia', i = 2;
        while (Object.prototype.hasOwnProperty.call(parent, nk)) nk = base + '_copia' + (i++);
        parent[nk] = val;
      } else {
        alert('No se puede duplicar aquí.');
        return;
      }

      await persistRootByPath(path, root);
      buildTree();
    }catch(err){ console.error(err); alert('Error al duplicar: '+(err.message||err)); }
  }

  // CRUD: eliminar
  async function deleteNodeByPath(path){
    try{
      if (!confirm('¿Eliminar este elemento?')) return;
      const data = window.formularioJsonOriginal || {};
      const rootKey = path[0], sub = path.slice(1);
      let root = deepClone(data[rootKey]);

      if (sub.length === 0){
        if (!confirm('Esto vaciará la raíz "'+rootKey+'". ¿Continuar?')) return;
        root = (rootKey === 'elementos_fuera') ? [] : {};
      } else {
        const parentPath = sub.slice(0,-1);
        const key = sub[sub.length-1];
        let parent = parentPath.length ? getAtPath(root, parentPath) : root;

        if (Array.isArray(parent) && typeof key === 'number') parent.splice(key,1);
        else if (parent && typeof parent === 'object') delete parent[key];
        else { alert('No se pudo eliminar.'); return; }
      }

      await persistRootByPath(path, root);
      buildTree();
    }catch(err){ console.error(err); alert('Error al eliminar: '+(err.message||err)); }
  }

  // CRUD: renombrar clave
  async function renameNodeByPath(path){
    try{
      const data = window.formularioJsonOriginal || {};
      const rootKey = path[0], sub = path.slice(1);
      if (sub.length === 0) { alert('No puedes renombrar la raíz.'); return; }
      let root = deepClone(data[rootKey]);

      const parentPath = sub.slice(0,-1);
      const key = sub[sub.length-1];
      let parent = parentPath.length ? getAtPath(root, parentPath) : root;

      if (!(parent && typeof parent === 'object') || Array.isArray(parent)){
        alert('Solo se puede renombrar una clave de objeto.'); return;
      }

      const nuevo = window.prompt('Nueva clave', String(key));
      if (!nuevo || nuevo === key) return;
      if (Object.prototype.hasOwnProperty.call(parent, nuevo)) { alert('La clave ya existe.'); return; }

      parent[nuevo] = parent[key]; delete parent[key];

      await persistRootByPath(path, root);
      buildTree();
    }catch(err){ console.error(err); alert('Error al renombrar: '+(err.message||err)); }
  }

  // NUEVO: guardar/restaurar estado expandido
  function captureOpenPaths(){
    const paths = [];
    $all('#jsonTreeBody .json-tree-item > .json-children.show').forEach(ch=>{
      const item = ch.closest('.json-tree-item');
      if (!item) return;
      const p = item.getAttribute('data-path');
      if (p) paths.push(p);
    });
    return paths;
  }
  function restoreOpenPaths(paths){
    if (!paths || !paths.length) return;
    const set = new Set(paths);
    $all('#jsonTreeBody .json-tree-item').forEach(item=>{
      const p = item.getAttribute('data-path');
      if (!p || !set.has(p)) return;
      const ch = item.querySelector(':scope > .json-children');
      if (!ch) return;
      ch.classList.add('show');
      const icon = item.querySelector(':scope > .json-row .json-toggle i');
      if (icon){
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
      }
    });
  }

  // Drag & Drop: inicializar en cada contenedor de hijos
  function initTreeDnD(){
    // Si hay Sortable, úsalo
    if (typeof Sortable !== 'undefined'){
      // Evita re-init
      $all('#jsonTreeBody .json-children').forEach((cont, idx)=>{
        if (cont.__jtSortable) return;
        const parentItem = cont.closest('.json-tree-item');
        const parentPathAttr = parentItem?.getAttribute('data-path') || '[]';
        const groupName = 'jt-' + parentPathAttr + '-' + idx;

        cont.__jtSortable = new Sortable(cont, {
          group: { name: groupName, put: false, pull: false }, // solo reordenar entre hermanos
          animation: 150,
          draggable: ':scope > .json-tree-item',
          handle: '.json-row, .json-node-key, .json-toggle',
          ghostClass: 'json-drag-ghost',
          onEnd: async (evt)=>{
            try{
              if (!evt || evt.from !== evt.to) return; // impedir mover entre padres
              const parentItem2 = evt.to.closest('.json-tree-item');
              if (!parentItem2) return;

              const parentPath = JSON.parse(parentItem2.getAttribute('data-path') || '[]');
              const data = window.formularioJsonOriginal || {};
              const rootKey = parentPath[0];
              const sub = parentPath.slice(1);
              let rootClone = deepClone(data[rootKey]);
              let parentVal = sub.length ? getAtPath(rootClone, sub) : rootClone;

              const t = typeOf(parentVal);
              if (t === 'array'){
                const arr = parentVal;
                const from = evt.oldIndex;
                const to   = evt.newIndex;
                if (from === to) return;
                const [moved] = arr.splice(from, 1);
                arr.splice(to, 0, moved);
                if (sub.length===0) rootClone = arr; else setAtPath(rootClone, sub, arr);
                await persistRootByPath(parentPath, rootClone);
                buildTree(); // preserva estado expandido
              } else if (t === 'object'){
                const obj = parentVal || {};
                const newOrder = Array.from(evt.to.children)
                  .map(el => {
                    const p = JSON.parse(el.getAttribute('data-path')||'[]');
                    return p[p.length-1];
                  })
                  .filter(k => k !== undefined);
                const reordered = {};
                newOrder.forEach(k => { reordered[k] = obj[k]; });
                if (sub.length===0) rootClone = reordered; else setAtPath(rootClone, sub, reordered);
                await persistRootByPath(parentPath, rootClone);
                buildTree();
              }
            }catch(err){
              console.error(err);
              alert('Error al reordenar: '+(err.message||err));
            }
          }
        });
      });
      return;
    }

    // Fallback nativo (HTML5 DnD) si no hay SortableJS
    initNativeDnD();
  }

  // NUEVO: DnD nativo (sin SortableJS)
  function initNativeDnD(){
    const root = $('#jsonTreeBody');
    if (!root) return;

    // marca items arrastrables (solo hijos de un padre)
    setNativeDraggables(true);

    if (root.__nativeDnDBound) return;
    root.__nativeDnDBound = true;

    let dragItem = null;
    let dragContainer = null;

    root.addEventListener('dragstart', (e)=>{
      const row = e.target.closest('.json-tree-item > .json-row');
      if (!row) return;
      if (isDnDDisabled()) { e.preventDefault(); return; }
      dragItem = row.parentElement; // .json-tree-item
      dragContainer = dragItem.parentElement; // .json-children
      if (!dragContainer || !dragContainer.classList.contains('json-children')){
        // no permitimos arrastrar top-level
        e.preventDefault();
        dragItem = dragContainer = null;
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragItem.getAttribute('data-path') || '');
      setTimeout(()=> dragItem.classList.add('json-drag-ghost'), 0);
    });

    root.addEventListener('dragover', (e)=>{
      if (!dragItem) return;
      const overItem = e.target.closest('.json-tree-item');
      const overContainer = overItem?.parentElement;
      if (overContainer !== dragContainer) return; // solo mismo padre
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    root.addEventListener('drop', async (e)=>{
      if (!dragItem) return;
      const overItem = e.target.closest('.json-tree-item');
      const overContainer = overItem?.parentElement;
      if (overContainer !== dragContainer) { cleanupDrag(); return; }
      e.preventDefault();

      // insert antes o después según posición del cursor
      const rect = overItem.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      if (before) {
        overContainer.insertBefore(dragItem, overItem);
      } else {
        overContainer.insertBefore(dragItem, overItem.nextSibling);
      }

      try{
        const parentItem = overContainer.closest('.json-tree-item');
        if (!parentItem) { cleanupDrag(); return; }
        const parentPath = JSON.parse(parentItem.getAttribute('data-path') || '[]');

        // Actualiza el JSON según nuevo orden DOM
        const data = window.formularioJsonOriginal || {};
        const rootKey = parentPath[0];
        const sub = parentPath.slice(1);
        let rootClone = deepClone(data[rootKey]);
        let parentVal = sub.length ? getAtPath(rootClone, sub) : rootClone;

        const children = Array.from(overContainer.children);
        const t = typeOf(parentVal);
        if (t === 'array'){
          const arr = parentVal;
          // recalcula orden por índice DOM tomando los valores previos
          const oldVals = arr.slice();
          const newArr = children.map((el)=>{
            const p = JSON.parse(el.getAttribute('data-path')||'[]');
            const idx = p[p.length-1];
            return oldVals[idx];
          });
          if (sub.length===0) rootClone = newArr; else setAtPath(rootClone, sub, newArr);
          await persistRootByPath(parentPath, rootClone);
          buildTree();
        } else if (t === 'object'){
          const obj = parentVal || {};
          const newOrder = children
            .map(el => {
              const p = JSON.parse(el.getAttribute('data-path')||'[]');
              return p[p.length-1];
            })
            .filter(k => k !== undefined);
          const reordered = {};
          newOrder.forEach(k => { reordered[k] = obj[k]; });
          if (sub.length===0) rootClone = reordered; else setAtPath(rootClone, sub, reordered);
          await persistRootByPath(parentPath, rootClone);
          buildTree();
        }
      }catch(err){
        console.error(err);
        alert('Error al reordenar: '+(err.message||err));
      }finally{
        cleanupDrag();
      }
    });

    root.addEventListener('dragend', cleanupDrag);

    function cleanupDrag(){
      if (dragItem) dragItem.classList.remove('json-drag-ghost');
      dragItem = null;
      dragContainer = null;
    }
  }

  function setNativeDraggables(enabled){
    $all('#jsonTreeBody .json-children > .json-tree-item > .json-row').forEach(row=>{
      row.setAttribute('draggable', enabled ? 'true' : 'false');
    });
  }

  function isDnDDisabled(){
    return (($('#jsonTreeFilter')?.value || '').trim().length > 0);
  }

  // Desactivar DnD si hay filtro activo (evita índices inconsistentes)
  function updateSortablesDisabled(){
    const hasFilter = (($('#jsonTreeFilter')?.value || '').trim().length > 0);
    // SortableJS
    $all('#jsonTreeBody .json-children').forEach(cont=>{
      if (cont.__jtSortable) cont.__jtSortable.option('disabled', hasFilter);
    });
    // Nativo
    setNativeDraggables(!hasFilter);
  }

  // Observa #fd-root y emite design-mode-changed
  function whenRootReady(cb){
    const root = document.getElementById('fd-root');
    if (root) return cb(root);
    const mo = new MutationObserver(()=>{
      const r = document.getElementById('fd-root');
      if (r){ mo.disconnect(); cb(r); }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }
  function watchDesignMode(){
    whenRootReady((root)=>{
      const emit = ()=> window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: root.classList.contains('design-mode') } }));
      new MutationObserver(emit).observe(root, { attributes:true, attributeFilter:['class'] });
      // estado inicial
      emit();
    });
  }

  // Reacciona al cambio de modo
  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    const panel = $('#json-tree-panel');
    const btn0 = $('#fd-tree-toggle-btn');
    if (!on){
      if (panel) panel.style.display = 'none';
      if (btn0) btn0.style.display = 'none';
      return;
    }
    ensureToggleButton();
    const btn = $('#fd-tree-toggle-btn');
    if (btn) btn.style.display = 'inline-flex';
  }

  // API para refrescar
  window.FD_refreshTree = function(){ if (shouldShow() && $('#json-tree-panel') && getComputedStyle($('#json-tree-panel')).display !== 'none') buildTree(); };
  window.addEventListener('fd-json-updated', ()=> window.FD_refreshTree());

  // Boot
  window.addEventListener('load', ()=>{
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
  });
})();
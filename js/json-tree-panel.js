(function(){
  const CONFIG = { side: 'right', width: 360, showOnlyInDesignMode: true };

  // Utils
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s==null?'':s); }
  function typeOf(v){ if (Array.isArray(v)) return 'array'; if (v===null) return 'null'; return typeof v==='object'?'object':typeof v; }
  function renderValueInline(v){
    const t = typeOf(v);
    if (t === 'object') return '{...}';
    if (t === 'array') return '[...]';
    if (t === 'string') return `"${esc(v)}"`;
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'null') return 'null';
    return String(v);
  }
  function getAtPath(obj, path){ return path.reduce((acc, k)=> (acc==null?acc:acc[k]), obj); }
  function setAtPath(obj, path, value){
    let curr = obj;
    for (let i=0; i<path.length-1; i++){
      const k = path[i];
      if (curr[k] == null || typeof curr[k] !== 'object') curr[k] = (typeof path[i+1] === 'number' ? [] : {});
      curr = curr[k];
    }
    curr[path[path.length-1]] = value;
  }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

  // Styles
  function injectStyles(){
    if ($('#json-tree-panel-styles')) return;
    const css = `
    .json-tree-panel{ position:fixed; top:70px; bottom:16px; ${CONFIG.side}:16px; width:${CONFIG.width}px; z-index:1060;
      background:#fff; border:1px solid #dee2e6; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.15); display:flex; flex-direction:column; overflow:hidden;
      resize: horizontal; min-width: 260px; max-width: 75vw; }
    .json-tree-header{ padding:8px 12px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; }
    .json-tree-title{ font-weight:600; margin:0; font-size:14px; flex:1; }
    .json-tree-actions button{ border:none; background:transparent; color:#6c757d; cursor:pointer; }
    .json-tree-search{ padding:6px 10px; border-bottom:1px solid #f1f1f1; }
    .json-tree-search input{ width:100%; border:1px solid #ddd; border-radius:6px; padding:6px 8px; font-size:13px; }
    .json-tree-body{ flex:1; overflow:auto; padding:8px; font-size:13px; }
    .json-tree-body details{ margin-left:6px; }
    .json-tree-body summary{ list-style:none; cursor:pointer; display:flex; align-items:center; gap:6px; }
    .json-tree-node{ display:flex; align-items:center; gap:6px; padding:2px 4px; border-radius:4px; }
    .json-tree-node:hover{ background:#f8f9fa; }
    .json-node-key{ color:#0d6efd; }
    .json-node-meta{ color:#6c757d; font-size:12px; }
    .json-node-actions{ margin-left:auto; display:flex; gap:6px; }
    .json-node-actions .btn-icon{ border:none; background:transparent; color:#6c757d; cursor:pointer; font-size:12px; }
    .json-node-actions .btn-icon:hover{ color:#0d6efd; }
    .json-highlight{ outline:3px solid #0d6efd !important; animation: jsonFlash .9s ease-in-out 1; }
    @keyframes jsonFlash { 0%{outline-color:transparent;} 50%{outline-color:#0d6efd;} 100%{outline-color:transparent;} }
    .fd-tree-toggle-btn{ display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; margin-left:8px;
      border-radius:50%; border:1px solid #dee2e6; background:#fff; color:#6c757d; box-shadow:0 2px 6px rgba(0,0,0,.08); cursor:pointer; }
    .fd-tree-toggle-btn:hover{ color:#0d6efd; border-color:#0d6efd; }
    .swal2-popup.json-wide { width: clamp(480px, 70vw, 1200px) !important; }
    .swal2-popup .swal2-textarea{ width:100%; min-width:420px; min-height:320px; resize: both; box-sizing: border-box; font-family: monospace; }
    .swal2-popup .swal2-input{ width:100%; box-sizing: border-box; }`;
    const st = document.createElement('style'); st.id='json-tree-panel-styles'; st.textContent = css;
    document.head.appendChild(st);
  }

  // Panel
  function ensurePanel(){
    let panel = $('#json-tree-panel');
    if (!panel){
      panel = document.createElement('div');
      panel.id = 'json-tree-panel';
      panel.className = 'json-tree-panel';
      panel.innerHTML = `
        <div class="json-tree-header">
          <h6 class="json-tree-title"><i class="fas fa-sitemap"></i> Árbol del JSON</h6>
          <div class="json-tree-actions">
            <button title="Inicializar estructura" id="jsonTreeInit"><i class="fas fa-seedling"></i></button>
            <button title="Colapsar/Expandir" id="jsonTreeToggleAll"><i class="fas fa-compress-alt"></i></button>
            <button title="Refrescar" id="jsonTreeRefresh"><i class="fas fa-sync-alt"></i></button>
            <button title="Cerrar" id="jsonTreeClose"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="json-tree-search"><input id="jsonTreeFilter" type="search" placeholder="Filtrar..."></div>
        <div class="json-tree-body" id="jsonTreeBody"></div>
      `;
      document.body.appendChild(panel);
      $('#jsonTreeClose').addEventListener('click', ()=> panel.style.display='none');
      $('#jsonTreeRefresh').addEventListener('click', buildTree);
      $('#jsonTreeToggleAll').addEventListener('click', toggleAll);
      $('#jsonTreeFilter').addEventListener('input', filterTree);
      // NUEVO: inicializar estructura base
      $('#jsonTreeInit').addEventListener('click', ensureBaseStructureInteractive);
    }
    return panel;
  }

  function ensureToggleButton(){
    const titleEl = document.getElementById('form-title') || document.querySelector('#fd-root h1, #fd-root h2, #fd-root .form-title');
    if (!titleEl) return null;
    let btn = document.getElementById('fd-tree-toggle-btn');
    if (!btn){
      btn = document.createElement('button');
      btn.id = 'fd-tree-toggle-btn';
      btn.type = 'button';
      btn.className = 'fd-tree-toggle-btn';
      btn.title = 'Mostrar/ocultar árbol JSON';
      btn.innerHTML = '<i class="fas fa-sitemap" aria-hidden="true"></i>';
      titleEl.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', ()=>{
        const panel = document.getElementById('json-tree-panel'); if (!panel) return;
        if (!shouldShow()){
          if (window.Swal) Swal.fire('Modo diseño', 'Activa el modo diseño para usar el árbol.', 'info');
          return;
        }
        const visible = getComputedStyle(panel).display !== 'none';
        panel.style.display = visible ? 'none' : 'block';
        if (!visible) buildTree();
      });
    }
    btn.style.display = shouldShow() ? 'inline-flex' : 'none';
    return btn;
  }

  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }

  // Data
  async function ensureJsonLoaded(){
    if (window.formularioJsonOriginal) return window.formularioJsonOriginal;
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || 'formulariogenerico2.json';
    const url = 'json/' + archivo;
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar '+url);
    const data = await r.json();
    window.formularioJsonOriginal = data || {};
    return data;
  }

  // Render
  function isEditablePath(path){
    const root = path && path[0];
    return root === 'parametros' || root === 'layout' || root === 'fieldsets' || root === 'elementos_fuera';
  }
  // NUEVO: acciones contextuales ampliadas (añade “wrap main a tabs” y “encapsular en tabset/grupo”)
  function actionsForNode(path, val, type){ // <--- Acepta val
    const isArrayItem = typeof path[path.length-1] === 'number';
    const isRootEditable = isEditablePath(path);

    // Heurísticas de contexto
    const isLayoutMainObject = (type==='object' && path.length===2 && path[0]==='layout' && path[1]==='main');
    const isLayoutColumnObject = (type==='object' && path[0]==='layout' && path.includes('rows') && path.includes('columns') && typeof path[path.length-1] !== 'string');
    const columnHasFieldset = isLayoutColumnObject && val && typeof val==='object' && !!val.fieldset;
    const columnHasTabset   = isLayoutColumnObject && val && typeof val==='object' && !!val.tabset;
    const columnHasGroup    = isLayoutColumnObject && val && typeof val==='object' && !!val.group;
    const isTabsetObject = (type==='object' && val && (val.type==='tabs' || Array.isArray(val.tabs)));
    const isTabsArray = (type==='array' && path[path.length-1]==='tabs');
    const isGroupObject = (type==='object' && val && (val.type==='fieldset-group' || val.items));
    const isGroupItemsArray = (type==='array' && path[path.length-1]==='items');

    const parts = [];
    if (isRootEditable) parts.push(`<button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>`);
    if (isRootEditable && (type==='object' || type==='array')) parts.push(`<button class="btn-icon act-add" title="Agregar hijo (genérico)"><i class="fas fa-plus"></i></button>`);
    if (isArrayItem) {
      parts.push(`<button class="btn-icon act-add-sibling" title="Insertar hermano"><i class="fas fa-level-down-alt"></i></button>`);
      parts.push(`<button class="btn-icon act-up" title="Subir"><i class="fas fa-arrow-up"></i></button>`);
      parts.push(`<button class="btn-icon act-down" title="Bajar"><i class="fas fa-arrow-down"></i></button>`);
    }
    if (isRootEditable) {
      parts.push(`<button class="btn-icon act-dup" title="Duplicar"><i class="fas fa-clone"></i></button>`);
      if (!isArrayItem) parts.push(`<button class="btn-icon act-rename" title="Renombrar clave"><i class="fas fa-i-cursor"></i></button>`);
      parts.push(`<button class="btn-icon act-del" title="Eliminar" style="color:#dc3545"><i class="fas fa-trash-alt"></i></button>`);
    }

    // Diseño: TabSet/Grupo
    if (isLayoutMainObject) {
      parts.push(`<button class="btn-icon act-wrap-main-tabs" title="Convertir main en Tabs (no destructivo)"><i class="fas fa-folder-plus"></i></button>`);
    }
    if (isLayoutColumnObject) {
      parts.push(`<button class="btn-icon act-new-tabset" title="Nuevo TabSet en esta columna"><i class="fas fa-folder-plus"></i></button>`);
      parts.push(`<button class="btn-icon act-new-group" title="Nuevo Grupo de Fieldsets"><i class="fas fa-object-group"></i></button>`);
      if (columnHasFieldset || columnHasGroup) {
        parts.push(`<button class="btn-icon act-encapsulate-tabset" title="Encapsular contenido en TabSet"><i class="fas fa-layer-group"></i></button>`);
      }
      if (columnHasFieldset || columnHasTabset) {
        parts.push(`<button class="btn-icon act-encapsulate-group" title="Encapsular contenido en Grupo"><i class="fas fa-boxes"></i></button>`);
      }
    }
    if (isTabsetObject || isTabsArray) {
      parts.push(`<button class="btn-icon act-add-tab" title="Agregar pestaña"><i class="fas fa-plus-square"></i></button>`);
    }
    if (isGroupObject || isGroupItemsArray) {
      parts.push(`<button class="btn-icon act-add-group-item" title="Agregar item al grupo"><i class="fas fa-plus-circle"></i></button>`);
    }

    return parts.length ? `<span class="json-node-actions">${parts.join('')}</span>` : '';
  }

  function renderAnyNode(key, val, path, open=false){
    const t = typeOf(val);
    if (t === 'object') {
      const det = document.createElement('details'); det.open = open;
      det.innerHTML = `<summary>
        <span class="json-tree-node" data-path='${JSON.stringify(path)}' draggable="true">
          <i class="far fa-folder"></i>
          <span class="json-node-key">${esc(key)}</span>
          <span class="json-node-meta">object</span>
          ${actionsForNode(path, val, 'object')}
        </span>
      </summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      Object.keys(val||{}).forEach(k=> wrap.appendChild(renderAnyNode(k, val[k], path.concat(k))));
      det.appendChild(wrap);
      return det;
    }
    if (t === 'array') {
      const det = document.createElement('details'); det.open = open;
      det.innerHTML = `<summary>
        <span class="json-tree-node" data-path='${JSON.stringify(path)}' draggable="true">
          <i class="far fa-folder-open"></i>
          <span class="json-node-key">${esc(key)}</span>
          <span class="json-node-meta">array(${val.length})</span>
          ${actionsForNode(path, val, 'array')}
        </span>
      </summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      val.forEach((item, idx)=> wrap.appendChild(renderAnyNode(`[${idx}]`, item, path.concat(idx))));
      det.appendChild(wrap);
      return det;
    }
    const div = document.createElement('div');
    div.className = 'json-tree-node';
    div.setAttribute('data-path', JSON.stringify(path));
    div.setAttribute('draggable', 'true'); // <- DnD
    div.innerHTML = `
      <i class="far fa-dot-circle"></i>
      <span class="json-node-key">${esc(key)}</span>
      <span class="json-node-meta">${renderValueInline(val)}</span>
      ${actionsForNode(path, val, 'leaf')}
    `;
    return div;
  }

  function buildTree(){
    const data = window.formularioJsonOriginal || {};
    const body = $('#jsonTreeBody'); if (!body) return;
    body.innerHTML = '';
    if ('parametros' in data) body.appendChild(renderAnyNode('parametros', data.parametros ?? {}, ['parametros'], true));
    if ('layout' in data) body.appendChild(renderAnyNode('layout', data.layout ?? {}, ['layout'], true));
    if ('fieldsets' in data) body.appendChild(renderAnyNode('fieldsets', data.fieldsets ?? {}, ['fieldsets'], true));
    if ('elementos_fuera' in data) body.appendChild(renderAnyNode('elementos_fuera', data.elementos_fuera, ['elementos_fuera'], true));
    const handled = new Set(['parametros','layout','fieldsets','elementos_fuera']);
    Object.keys(data).forEach(k=>{ if (!handled.has(k)) body.appendChild(renderAnyNode(k, data[k], [k], true)); });

    bindEditActions(body);
    bindTreeDragAndDrop(body); // <- NUEVO
  }

  // Interacción
  function toggleAll(){
    const body = $('#jsonTreeBody'); const details = $all('details', body);
    const anyClosed = details.some(d=>!d.open); details.forEach(d => d.open = anyClosed);
  }
  function filterTree(e){
    const q = (e.target.value || '').toLowerCase();
    const body = $('#jsonTreeBody');
    $all('.json-tree-node', body).forEach(n=>{
      const txt = n.textContent.toLowerCase();
      n.style.display = txt.includes(q) ? '' : 'none';
    });
  }
  function getClickedNodeAndPath(target){
    let nodeEl = target.closest('.json-tree-node');
    if (!nodeEl) {
      const summary = target.closest('summary');
      if (summary) nodeEl = summary.querySelector('.json-tree-node');
    }
    if (!nodeEl) return { nodeEl:null, path:null };
    const pathStr = nodeEl.getAttribute('data-path') || nodeEl.dataset.path;
    if (!pathStr) return { nodeEl, path:null };
    try { return { nodeEl, path: JSON.parse(pathStr) }; } catch { return { nodeEl, path:null }; }
  }

  function bindEditActions(root){
    // Evitar que <summary> se abra/cierre al pulsar botones
    root.addEventListener('mousedown', function(e){
      const btn = e.target.closest('.json-node-actions button');
      if (!btn) return;
      if (btn.closest('summary')) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    root.addEventListener('click', async function(e){
      const btn = e.target.closest('.json-node-actions button'); if (!btn) return;
      const { nodeEl, path } = getClickedNodeAndPath(btn);
      if (!nodeEl || !Array.isArray(path)) { if (window.Swal) Swal.fire('Error', 'Ruta no encontrada.', 'error'); return; }
      try {
        if (btn.classList.contains('act-edit')) return await editNodeByPath(path, nodeEl);
        if (btn.classList.contains('act-add')) return await addChildAtPath(path);
        if (btn.classList.contains('act-add-sibling')) return await insertSiblingAtPath(path);
        if (btn.classList.contains('act-up')) return await moveArrayItem(path, -1);
        if (btn.classList.contains('act-down')) return await moveArrayItem(path, +1);
        if (btn.classList.contains('act-dup')) return await duplicateAtPath(path);
        if (btn.classList.contains('act-rename')) return await renameAtPath(path);
        if (btn.classList.contains('act-del')) return await deleteAtPath(path);

        // NUEVO
        if (btn.classList.contains('act-wrap-main-tabs')) return await wrapMainIntoTabs(path);
        if (btn.classList.contains('act-new-tabset')) return await addTabsetAtColumn(path);
        if (btn.classList.contains('act-add-tab')) return await addTabToTabset(path);
        if (btn.classList.contains('act-new-group')) return await addGroupAtColumn(path);
        if (btn.classList.contains('act-add-group-item')) return await addItemToGroup(path);
        if (btn.classList.contains('act-encapsulate-tabset')) return await encapsulateColumnIntoTabset(path);
        if (btn.classList.contains('act-encapsulate-group')) return await encapsulateColumnIntoGroup(path);
      } catch(err){
        if (window.Swal) Swal.fire('Error', String(err.message||err), 'error');
      }
    });
  }

  // Editar
  async function editNodeByPath(path, nodeEl){
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey];
    const subPath = path.slice(1);
    const current = subPath.length ? getAtPath(currentRoot, subPath) : currentRoot;
    const t = typeOf(current);

    let nuevoVal;
    if (t === 'object' || t === 'array' || t === 'null') {
      const { value: jsonObj } = await swalJsonEditor(path.join('.'), (t==='null')?'null':JSON.stringify(current, null, 2));
      if (jsonObj == null) return;
      nuevoVal = jsonObj;
    } else if (t === 'boolean') {
      const { value: choice } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'select',
        inputOptions:{ 'true':'true','false':'false' }, inputValue: current ? 'true':'false',
        width: '50vw', showCancelButton:true, confirmButtonText:'Guardar' });
      if (choice == null) return; nuevoVal = (choice === 'true');
    } else if (t === 'number') {
      const { value: num } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'number',
        inputValue: current, width: '50vw', inputAttributes:{ style:'width:100%;' },
        showCancelButton:true, confirmButtonText:'Guardar' });
      if (num == null) return; nuevoVal = Number(num);
    } else {
      const { value: txt } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'text',
        inputValue: String(current ?? ''), width: '50vw', inputAttributes:{ style:'width:100%;' },
        showCancelButton:true, confirmButtonText:'Guardar' });
      if (txt == null) return; nuevoVal = txt;
    }

    const newRoot = deepClone(currentRoot ?? {});
    if (subPath.length) setAtPath(newRoot, subPath, nuevoVal); else Object.assign(newRoot, nuevoVal);

    await persistRoot(rootKey, newRoot, path);
    // refrescar UI
    const meta = nodeEl.querySelector('.json-node-meta');
    if (meta) meta.textContent = renderValueInline(nuevoVal);
    if (typeOf(nuevoVal) === 'object' || typeOf(nuevoVal) === 'array' || subPath.length===0) buildTree();
  }

  // Agregar hijo
  async function addChildAtPath(path){
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey] ?? {};
    const subPath = path.slice(1);
    const parent = subPath.length ? getAtPath(currentRoot, subPath) : currentRoot;

    if (Array.isArray(parent)) {
      const sample = parent.length ? parent[parent.length-1] : null;
      const newItem = sample ? clearPrimitivesDeep(sample) : defaultValueForFamily(null);
      const newArray = parent.slice(); newArray.push(newItem);
      const newRoot = deepClone(currentRoot);
      if (subPath.length) setAtPath(newRoot, subPath, newArray); else Object.assign(newRoot, newArray);
      await persistRoot(rootKey, newRoot, path);
      buildTree();
      return;
    }

    if (parent && typeof parent === 'object') {
      const keys = Object.keys(parent);
      const sampleVal = keys.length ? parent[keys[0]] : '';
      const { value: keyName } = await Swal.fire({
        title: 'Nueva propiedad', input: 'text', inputLabel: 'Nombre de la propiedad',
        inputPlaceholder: 'ej: nuevo_campo', showCancelButton: true, confirmButtonText: 'Agregar',
        preConfirm: (k)=> {
          if (!k) { Swal.showValidationMessage('Indica un nombre'); return false; }
          if (Object.prototype.hasOwnProperty.call(parent, k)) { Swal.showValidationMessage('Ya existe esa propiedad'); return false; }
          return k;
        }
      });
      if (!keyName) return;
      const newVal = clearPrimitivesDeep(sampleVal);
      const newObj = { ...parent, [keyName]: newVal };
      const newRoot = deepClone(currentRoot);
      if (subPath.length) setAtPath(newRoot, subPath, newObj); else Object.assign(newRoot, newObj);
      await persistRoot(rootKey, newRoot, path);
      buildTree();
    }
  }

  // Reordenar array
  async function moveArrayItem(path, dir){
    if (typeof path[path.length-1] !== 'number') return;
    const idx = path[path.length-1];
    const parentPath = path.slice(0, -1);
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey] ?? {};
    const parent = getAtPath(currentRoot, parentPath.slice(1));
    if (!Array.isArray(parent)) return;
    const newIdx = idx + dir; if (newIdx < 0 || newIdx >= parent.length) return;

    const arr = parent.slice();
    const tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp;

    const newRoot = deepClone(currentRoot);
    setAtPath(newRoot, parentPath.slice(1), arr);
    await persistRoot(rootKey, newRoot, path);
    buildTree();
  }

  // Clonado/limpieza
  function defaultValueForFamily(sample){
    const t = typeOf(sample);
    if (t === 'object') return {};
    if (t === 'array') return [];
    if (t === 'number') return 0;
    if (t === 'boolean') return false;
    return '';
  }
  function clearPrimitivesDeep(v){
    const t = typeOf(v);
    if (t === 'object') { const out = {}; Object.keys(v||{}).forEach(k => out[k] = clearPrimitivesDeep(v[k])); return out; }
    if (t === 'array') { if (!v || !v.length) return []; return [ clearPrimitivesDeep(v[0]) ]; }
    if (t === 'number') return 0;
    if (t === 'boolean') return false;
    if (t === 'null') return null;
    return '';
  }

  // Persistencia
  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    if (blocks.parametros !== undefined) form.append('parametros', JSON.stringify(blocks.parametros));
    if (blocks.layout !== undefined) form.append('layout', JSON.stringify(blocks.layout));
    if (blocks.fieldsets !== undefined) form.append('fieldsets', JSON.stringify(blocks.fieldsets));
    if (blocks.elementos_fuera !== undefined) form.append('elementos_fuera', JSON.stringify(blocks.elementos_fuera));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }
  async function persistRoot(rootKey, newRoot, path){
    if (rootKey === 'parametros') {
      await postGuardar({ parametros: newRoot });
      window.formularioJsonOriginal.parametros = newRoot;
    } else if (rootKey === 'layout') {
      await postGuardar({ layout: newRoot });
      window.formularioJsonOriginal.layout = newRoot;
    } else if (rootKey === 'fieldsets') {
      await postGuardar({ fieldsets: newRoot });
      window.formularioJsonOriginal.fieldsets = newRoot;
      if (path.length >= 2 && typeof path[1] === 'string') {
        const fs = newRoot[path[1]];
        if (fs && fs.titulo) {
          const el = document.querySelector(`[data-fieldset-name="${CSS.escape(path[1])}"] legend`);
          if (el) el.textContent = fs.titulo || path[1];
        }
      }
    } else if (rootKey === 'elementos_fuera') {
      await postGuardar({ elementos_fuera: newRoot });
      window.formularioJsonOriginal.elementos_fuera = newRoot;
    } else {
      const payload = {}; payload[rootKey] = newRoot;
      await postGuardar(payload);
      window.formularioJsonOriginal[rootKey] = newRoot;
    }
  }

  // Editor JSON
  function swalJsonEditor(title, initial){
    if (!window.Swal) {
      const txt = window.prompt('JSON para '+title, initial); if (txt==null) return Promise.resolve({ value:null });
      try { return Promise.resolve({ value: JSON.parse(txt) }); } catch(e){ alert('JSON inválido'); return Promise.resolve({ value:null }); }
    }
    return Swal.fire({
      title, input: 'textarea', inputValue: initial, customClass: { popup: 'json-wide' }, width: '70vw',
      inputAttributes:{ spellcheck:'false', style:'min-height:320px; font-family:monospace; resize: both;' },
      showCancelButton:true, confirmButtonText:'Guardar',
      preConfirm: (txt)=> { try { return JSON.parse(txt); } catch(e){ Swal.showValidationMessage('JSON inválido'); return false; } }
    });
  }

  // Modo diseño
  function onDesignModeChanged(e){
    const panel = $('#json-tree-panel'); if (panel) panel.style.display = e.detail && e.detail.on ? '' : 'none';
    const btn = document.getElementById('fd-tree-toggle-btn'); if (btn) btn.style.display = e.detail && e.detail.on ? 'inline-flex' : 'none';
    if (e.detail && e.detail.on) buildTree();
  }

  async function init(){
    injectStyles();
    await ensureJsonLoaded();
    const panel = ensurePanel();
    ensureToggleButton();
    panel.style.display = shouldShow() ? '' : 'none';
    if (shouldShow()) buildTree();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// ====== NUEVO: Drag & Drop en árbol ======
let dragSrcPath = null;

function pathsEqual(a,b){ if (!a || !b || a.length!==b.length) return false; return a.every((v,i)=> v===b[i]); }
function isAncestorPath(anc, child){
  if (!anc || !child || anc.length>=child.length) return false;
  for (let i=0;i<anc.length;i++){ if (anc[i] !== child[i]) return false; }
  return true;
}

function getDataRoot(){ return window.formularioJsonOriginal || {}; }
function getRootObj(rootKey){ const d=getDataRoot(); return deepClone(d[rootKey]); }
function removeAtPath(rootObj, path){
  const parentPath = path.slice(1, -1); // dentro del root
  const key = path[path.length-1];
  const parent = parentPath.length ? getAtPath(rootObj, parentPath) : rootObj;
  if (Array.isArray(parent) && typeof key==='number'){ parent.splice(key,1); return true; }
  if (parent && typeof parent==='object' && typeof key==='string'){ delete parent[key]; return true; }
  return false;
}
function insertIntoArray(rootObj, arrayPath, idx, value){
  const arr = getAtPath(rootObj, arrayPath) || [];
  if (!Array.isArray(arr)) throw new Error('Destino no es array');
  const copy = arr.slice();
  if (idx == null || idx < 0 || idx > copy.length) copy.push(value);
  else copy.splice(idx, 0, value);
  setAtPath(rootObj, arrayPath, copy);
}
async function insertIntoObject(rootObj, objPath, value, suggestedKey){
  const obj = getAtPath(rootObj, objPath) || {};
  if (typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Destino no es objeto');
  let key = suggestedKey || '';
  if (!key || Object.prototype.hasOwnProperty.call(obj, key)) {
    const { value: k } = await Swal.fire({
      title:'Clave para nuevo hijo', input:'text', inputValue: key || '',
      inputPlaceholder:'nombre_propiedad', showCancelButton:true, confirmButtonText:'Agregar',
      preConfirm: (v)=>{ if(!v){ Swal.showValidationMessage('Ingresa una clave'); return false; } if (obj.hasOwnProperty(v)) { Swal.showValidationMessage('La clave ya existe'); return false; } return v; }
    });
    if (!k) return false;
    key = k;
  }
  obj[key] = value;
  setAtPath(rootObj, objPath, obj);
  return true;
}

function getNodePathFromEl(el){
  const n = el.closest('.json-tree-node'); if (!n) return null;
  try { return JSON.parse(n.getAttribute('data-path')); } catch { return null; }
}

function getDropTargetInfo(el){
  // Determina destino lógico (objeto/array padre cuando se apunta a hoja o ítem)
  const data = getDataRoot();
  const rawPath = getNodePathFromEl(el);
  if (!rawPath) return null;
  const rootKey = rawPath[0];
  const rootObj = data[rootKey];
  let targetPath = rawPath.slice(1); // dentro del root
  let targetVal = targetPath.length ? getAtPath(rootObj, targetPath) : rootObj;

  // Si el target es ítem de array -> se inserta después de ese índice
  if (typeof rawPath[rawPath.length-1] === 'number') {
    return { rootKey, kind:'array-item', parentPath: rawPath.slice(0,-1), insertAfterIndex: rawPath[rawPath.length-1] };
  }
  // Si no es objeto/array, usar su padre como destino
  const t = typeOf(targetVal);
  if (t!=='object' && t!=='array') {
    return { rootKey, kind:'parent', parentPath: rawPath.slice(0,-1) };
  }
  // Si es objeto o array
  return { rootKey, kind: t, path: rawPath };
}

function addDragStyles(){
  if ($('#json-tree-dnd-styles')) return;
  const css = `
    .json-tree-node.drag-src{ opacity:.6; }
    .json-tree-node.drop-ok{ outline:2px dashed #0d6efd; }
    .json-tree-node.drop-bad{ outline:2px dashed #dc3545; }
  `;
  const st = document.createElement('style'); st.id='json-tree-dnd-styles'; st.textContent = css;
  document.head.appendChild(st);
}

function canMove(srcPath, targetInfo){
  if (!targetInfo) return false;
  // Misma raíz
  if (srcPath[0] !== targetInfo.rootKey) return false;
  // Evita mover dentro de sí mismo o un descendiente
  const tgtPath = targetInfo.path || targetInfo.parentPath;
  if (tgtPath && isAncestorPath(srcPath, tgtPath)) return false;
  // Debe caer en objeto o array (o item/parent que derive en ellos)
  return targetInfo.kind === 'object' || targetInfo.kind === 'array' || targetInfo.kind === 'array-item' || targetInfo.kind === 'parent';
}

function bindTreeDragAndDrop(root){
  addDragStyles();

  root.addEventListener('dragstart', (e)=>{
    const node = e.target.closest('.json-tree-node'); if (!node) return;
    const path = getNodePathFromEl(node); if (!path || !isEditablePath(path)) { e.preventDefault(); return; }
    dragSrcPath = path;
    node.classList.add('drag-src');
    try { e.dataTransfer.setData('application/json', JSON.stringify(path)); } catch {}
    e.dataTransfer.effectAllowed = 'move';
  });

  root.addEventListener('dragend', (e)=>{
    dragSrcPath = null;
    $all('.json-tree-node.drag-src', root).forEach(n=> n.classList.remove('drag-src'));
    $all('.json-tree-node.drop-ok', root).forEach(n=> n.classList.remove('drop-ok'));
    $all('.json-tree-node.drop-bad', root).forEach(n=> n.classList.remove('drop-bad'));
  });

  root.addEventListener('dragover', (e)=>{
    if (!dragSrcPath) return;
    const over = e.target.closest('.json-tree-node'); if (!over) return;
    const info = getDropTargetInfo(over);
    if (!canMove(dragSrcPath, info)) { over.classList.add('drop-bad'); over.classList.remove('drop-ok'); return; }
    e.preventDefault(); // permitir drop
    e.dataTransfer.dropEffect = 'move';
    over.classList.add('drop-ok'); over.classList.remove('drop-bad');
  });

  root.addEventListener('dragleave', (e)=>{
    const over = e.target.closest('.json-tree-node'); if (!over) return;
    over.classList.remove('drop-ok','drop-bad');
  });

  root.addEventListener('drop', async (e)=>{
    const over = e.target.closest('.json-tree-node'); if (!over) return;
    const info = getDropTargetInfo(over);
    $all('.json-tree-node.drop-ok,.json-tree-node.drop-bad', root).forEach(n=> n.classList.remove('drop-ok','drop-bad'));
    if (!dragSrcPath || !canMove(dragSrcPath, info)) return;

    e.preventDefault();
    const srcRoot = dragSrcPath[0];
    const data = getDataRoot();
    let srcRootObj = getRootObj(srcRoot);
    const srcParentPathInsideRoot = dragSrcPath.slice(1, -1);
    const srcKey = dragSrcPath[dragSrcPath.length-1];
    const srcParent = srcParentPathInsideRoot.length ? getAtPath(srcRootObj, srcParentPathInsideRoot) : srcRootObj;
    const movingVal = Array.isArray(srcParent) ? deepClone(srcParent[srcKey]) : deepClone(srcParent[srcKey]);

    // Eliminar del origen primero (tendrá efecto si destino es el mismo padre)
    removeAtPath(srcRootObj, dragSrcPath);

    const finishPersist = async ()=>{
      await persistRoot(srcRoot, srcRootObj, dragSrcPath);
      buildTree();
    };

    // Calcular inserción según destino
    if (info.kind === 'array-item') {
      const parentInsideRoot = info.parentPath.slice(1); // quita root
      const idx = info.insertAfterIndex + 1;
      insertIntoArray(srcRootObj, parentInsideRoot, idx, movingVal);
      return finishPersist();
    }

    if (info.kind === 'array') {
      const arrPathInsideRoot = info.path.slice(1);
      insertIntoArray(srcRootObj, arrPathInsideRoot, null, movingVal);
      return finishPersist();
    }

    if (info.kind === 'parent') {
      // usa el padre real; decidir inserción por tipo del padre
      const parentRaw = info.parentPath;
      const parentInsideRoot = parentRaw.slice(1);
      const parentVal = parentInsideRoot.length ? getAtPath(srcRootObj, parentInsideRoot) : srcRootObj;

      if (Array.isArray(parentVal)) {
        insertIntoArray(srcRootObj, parentInsideRoot, null, movingVal);
        return finishPersist();
      }
      if (parentVal && typeof parentVal==='object') {
        await insertIntoObject(srcRootObj, parentInsideRoot, movingVal, (typeof dragSrcPath[dragSrcPath.length-1]==='string' ? dragSrcPath[dragSrcPath.length-1] : 'nuevo'));
        return finishPersist();
      }
      // si no es objeto/array, no mover
      return buildTree();
    }

    if (info.kind === 'object') {
      const objPathInsideRoot = info.path.slice(1);
      const suggestedKey = (typeof dragSrcPath[dragSrcPath.length-1]==='string' ? dragSrcPath[dragSrcPath.length-1] : '');
      const ok = await insertIntoObject(srcRootObj, objPathInsideRoot, movingVal, suggestedKey);
      if (ok) return finishPersist();
      else return buildTree();
    }
  });
}
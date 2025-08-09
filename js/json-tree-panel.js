(function(){
  const CONFIG = { side: 'right', width: 360, showOnlyInDesignMode: true };

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s==null?'':s); }
  function typeOf(v){ if (Array.isArray(v)) return 'array'; if (v===null) return 'null'; return typeof v==='object'?'object':typeof v; }

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

    /* Botón flotante junto al título del formulario */
    .fd-tree-toggle-btn{
      display:inline-flex; align-items:center; justify-content:center;
      width:28px; height:28px; margin-left:8px;
      border-radius:50%; border:1px solid #dee2e6; background:#fff; color:#6c757d;
      box-shadow:0 2px 6px rgba(0,0,0,.08); cursor:pointer;
    }
    .fd-tree-toggle-btn:hover{ color:#0d6efd; border-color:#0d6efd; }
    `;
    const st = document.createElement('style'); st.id='json-tree-panel-styles'; st.textContent = css;
    document.head.appendChild(st);
  }

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
    }
    return panel;
  }

  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }

  // Carga JSON si no está en memoria
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

  function nodeActionsHtml(){ return `<span class="json-node-actions"><button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button></span>`; }

// NUEVO: acciones según tipo y si es elemento de array
  function actionsForNode(path, type){
    const isRootEditable = isEditablePath(path);
    const isArrayItem = typeof path[path.length-1] === 'number';
    const canAddChild = isRootEditable && (type === 'object' || type === 'array');
    const parts = [];
    if (isRootEditable) parts.push(`<button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>`);
    if (canAddChild) parts.push(`<button class="btn-icon act-add" title="Agregar hijo"><i class="fas fa-plus"></i></button>`);
    if (isArrayItem) {
      parts.push(`<button class="btn-icon act-up" title="Subir"><i class="fas fa-arrow-up"></i></button>`);
      parts.push(`<button class="btn-icon act-down" title="Bajar"><i class="fas fa-arrow-down"></i></button>`);
    }
    return parts.length ? `<span class="json-node-actions">${parts.join('')}</span>` : '';
  }

  function isEditablePath(path){
    const root = path && path[0];
    return root === 'parametros' || root === 'layout' || root === 'fieldsets' || root === 'elementos_fuera';
  }

  // Render recursivo de TODO el JSON
  function buildTree(){
    const data = window.formularioJsonOriginal || {};
    const body = $('#jsonTreeBody'); if (!body) return;
    body.innerHTML = '';
    body.appendChild(renderAnyNode('parametros', data.parametros ?? {}, ['parametros'], true));
    body.appendChild(renderAnyNode('layout', data.layout ?? {}, ['layout'], true));
    body.appendChild(renderAnyNode('fieldsets', data.fieldsets ?? {}, ['fieldsets'], true));
    if (data.elementos_fuera !== undefined) body.appendChild(renderAnyNode('elementos_fuera', data.elementos_fuera, ['elementos_fuera'], true));

    // Otros nodos top-level no cubiertos
    const handled = new Set(['parametros','layout','fieldsets','elementos_fuera']);
    Object.keys(data).forEach(k=>{ if (!handled.has(k)) body.appendChild(renderAnyNode(k, data[k], [k], true)); });

    bindEditActions(body);
  }

  function renderAnyNode(key, val, path, open=false){
    const t = typeOf(val);
    if (t === 'object') {
      const det = document.createElement('details'); det.open = open;
      det.innerHTML = `<summary><span class="json-tree-node" data-path='${JSON.stringify(path)}'>
        <i class="far fa-folder"></i>
        <span class="json-node-key">${esc(key)}</span>
        <span class="json-node-meta">object</span>
        ${actionsForNode(path, 'object')}
      </span></summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      Object.keys(val||{}).forEach(k=> wrap.appendChild(renderAnyNode(k, val[k], path.concat(k))));
      det.appendChild(wrap);
      return det;
    }
    if (t === 'array') {
      const det = document.createElement('details'); det.open = open;
      det.innerHTML = `<summary><span class="json-tree-node" data-path='${JSON.stringify(path)}'>
        <i class="far fa-folder-open"></i>
        <span class="json-node-key">${esc(key)}</span>
        <span class="json-node-meta">array(${val.length})</span>
        ${actionsForNode(path, 'array')}
      </span></summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      val.forEach((item, idx)=> wrap.appendChild(renderAnyNode(`[${idx}]`, item, path.concat(idx))));
      det.appendChild(wrap);
      return det;
    }
    // hoja
    const div = document.createElement('div');
    div.className = 'json-tree-node';
    div.dataset.path = JSON.stringify(path);
    div.innerHTML = `
      <i class="far fa-dot-circle"></i>
      <span class="json-node-key">${esc(key)}</span>
      <span class="json-node-meta">${renderValueInline(val)}</span>
      ${actionsForNode(path, 'leaf')}
    `;
    // Click para resaltar fieldset si corresponde
    const root = path[0], p2 = path[1], p3 = path[2];
    if (root==='layout' && typeof val!=='object' && p2 && String(p3||'').includes('fieldset')) {
      div.style.cursor='pointer';
      div.addEventListener('click', (e)=> { if (e.target.closest('.json-node-actions')) return; highlightFieldset(val); });
    }
    return div;
  }

  function renderValueInline(v){
    const t = typeOf(v);
    if (t === 'object') return '{...}';
    if (t === 'array') return '[...]';
    if (t === 'string') return `"${esc(v)}"`;
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'null') return 'null';
    return String(v);
  }

  function highlightFieldset(name){
    const el = document.querySelector(`[data-fieldset-name="${CSS.escape(name)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.add('json-highlight');
    setTimeout(()=> el.classList.remove('json-highlight'), 900);
  }

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

  function bindEditActions(root){
    root.addEventListener('click', async function(e){
      const node = e.target.closest('.json-tree-node'); if (!node) return;
      const pathStr = node.getAttribute('data-path') || node.dataset.path; if (!pathStr) return;
      let path; try { path = JSON.parse(pathStr); } catch { return; }

      if (e.target.closest('.act-edit')) {
        await editNodeByPath(path, node); return;
      }
      if (e.target.closest('.act-add')) {
        await addChildAtPath(path); return;
      }
      if (e.target.closest('.act-up')) {
        await moveArrayItem(path, -1); return;
      }
      if (e.target.closest('.act-down')) {
        await moveArrayItem(path, +1); return;
      }
    });
  }

// NUEVO: agregar hijo en objeto/array
  async function addChildAtPath(path){
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey] ?? {};
    const subPath = path.slice(1);
    const parent = subPath.length ? getAtPath(currentRoot, subPath) : currentRoot;

    if (Array.isArray(parent)) {
      // Clona estructura del último o primero; si vacío, básico
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
      // Necesita nombre de propiedad. Usa tipo del primer hijo como plantilla.
      const keys = Object.keys(parent);
      const sampleVal = keys.length ? parent[keys[0]] : '';
      const { value: keyName } = await Swal.fire({
        title: 'Nueva propiedad',
        input: 'text',
        inputLabel: 'Nombre de la propiedad',
        inputPlaceholder: 'ej: nuevo_campo',
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        preConfirm: (k)=> {
          if (!k) { Swal.showValidationMessage('Indica un nombre'); return false; }
          if (parent.hasOwnProperty(k)) { Swal.showValidationMessage('Ya existe esa propiedad'); return false; }
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

// NUEVO: mover elemento de array (subir/bajar)
  async function moveArrayItem(path, dir){
    // path apunta al elemento. El padre es un array.
    if (typeof path[path.length-1] !== 'number') return;
    const idx = path[path.length-1];
    const parentPath = path.slice(0, -1);
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey] ?? {};
    const parent = getAtPath(currentRoot, parentPath.slice(1));
    if (!Array.isArray(parent)) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= parent.length) return;

    const arr = parent.slice();
    const tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp;

    const newRoot = deepClone(currentRoot);
    setAtPath(newRoot, parentPath.slice(1), arr);
    await persistRoot(rootKey, newRoot, path);
    buildTree();
  }

// Helpers de clonación/normalización
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
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
    if (t === 'object') {
      const out = {};
      Object.keys(v||{}).forEach(k => out[k] = clearPrimitivesDeep(v[k]));
      return out;
    }
    if (t === 'array') {
      if (!v || !v.length) return [];
      return [ clearPrimitivesDeep(v[0]) ]; // misma “familia”
    }
    if (t === 'number') return 0;
    if (t === 'boolean') return false;
    if (t === 'null') return null;
    return ''; // strings u otros primitivos
  }

// Persistencia por root
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
      // si cambia título de un fieldset, refresca leyenda
      if (path.length >= 2 && typeof path[1] === 'string') {
        const fs = newRoot[path[1]];
        if (fs && fs.titulo) syncLegend(path[1], fs.titulo);
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

  function onDesignModeChanged(e){
    const panel = $('#json-tree-panel'); if (!panel) return;
    panel.style.display = e.detail && e.detail.on ? '' : 'none';
    if (e.detail && e.detail.on) buildTree();
    // Mostrar/ocultar botón flotante
    const btn = document.getElementById('fd-tree-toggle-btn');
    if (btn) btn.style.display = e.detail && e.detail.on ? 'inline-flex' : 'none';
  }

  function ensureToggleButton(){
    // Busca un título. Ideal: <h1 id="form-title">...</h1>
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
      // Insertar justo después del título
      titleEl.insertAdjacentElement('afterend', btn);

      btn.addEventListener('click', ()=>{
        const panel = document.getElementById('json-tree-panel');
        if (!panel) return;
        if (!shouldShow()){
          if (window.Swal) Swal.fire('Modo diseño', 'Activa el modo diseño para usar el árbol.', 'info');
          return;
        }
        const visible = getComputedStyle(panel).display !== 'none';
        panel.style.display = visible ? 'none' : 'block';
        if (!visible) buildTree();
      });
    }
    // Mostrar solo en modo diseño
    btn.style.display = shouldShow() ? 'inline-flex' : 'none';
    return btn;
  }

  async function init(){
    injectStyles();
    await ensureJsonLoaded();
    const panel = ensurePanel();
    panel.style.display = shouldShow() ? '' : 'none';
    if (shouldShow()) buildTree();

    // Crear botón flotante junto al título
    ensureToggleButton();

    window.addEventListener('design-mode-changed', onDesignModeChanged);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
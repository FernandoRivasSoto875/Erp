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
      background:#fff; border:1px solid #dee2e6; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.15); display:flex; flex-direction:column; overflow:hidden; }
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
    @keyframes jsonFlash { 0%{outline-color:transparent;} 50%{outline-color:#0d6efd;} 100%{outline-color:transparent;} }`;
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
        ${isEditablePath(path) ? nodeActionsHtml() : ''}
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
        ${isEditablePath(path) ? nodeActionsHtml() : ''}
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
      ${isEditablePath(path) ? nodeActionsHtml() : ''}
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
      const btn = e.target.closest('.act-edit'); if (!btn) return;
      const node = btn.closest('.json-tree-node'); if (!node) return;
      const pathStr = node.getAttribute('data-path') || node.dataset.path;
      if (!pathStr) return;
      let path; try { path = JSON.parse(pathStr); } catch { return; }
      await editNodeByPath(path, node);
    });
  }

  async function editNodeByPath(path, nodeEl){
    const rootKey = path[0];
    const data = window.formularioJsonOriginal || {};
    const currentRoot = data[rootKey];
    const subPath = path.slice(1);
    const current = subPath.length ? getAtPath(currentRoot, subPath) : currentRoot;
    const t = typeOf(current);

    // Editor según tipo
    let nuevoVal;
    if (t === 'object' || t === 'array' || t === 'null') {
      const { value: jsonObj } = await swalJsonEditor(path.join('.'), (t==='null')?'null':JSON.stringify(current, null, 2));
      if (jsonObj == null) return;
      nuevoVal = jsonObj;
    } else if (t === 'boolean') {
      const { value: choice } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'select',
        inputOptions:{ 'true':'true','false':'false' }, inputValue: current ? 'true':'false',
        showCancelButton:true, confirmButtonText:'Guardar' });
      if (choice == null) return; nuevoVal = (choice === 'true');
    } else if (t === 'number') {
      const { value: num } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'number',
        inputValue: current, showCancelButton:true, confirmButtonText:'Guardar' });
      if (num == null) return; nuevoVal = Number(num);
    } else {
      const { value: txt } = await Swal.fire({ title:`Editar ${path.join('.')}`, input:'text',
        inputValue: String(current ?? ''), showCancelButton:true, confirmButtonText:'Guardar' });
      if (txt == null) return; nuevoVal = txt;
    }

    // Aplica en memoria
    const newRoot = JSON.parse(JSON.stringify(currentRoot ?? (Array.isArray(subPath[0])?[]:{})));
    if (subPath.length) setAtPath(newRoot, subPath, nuevoVal); else Object.assign(newRoot, nuevoVal);

    // Persistir según root
    if (rootKey === 'parametros') {
      await postGuardar({ parametros: newRoot });
      data.parametros = newRoot;
    } else if (rootKey === 'layout') {
      await postGuardar({ layout: newRoot });
      data.layout = newRoot;
    } else if (rootKey === 'fieldsets') {
      await postGuardar({ fieldsets: newRoot });
      data.fieldsets = newRoot;
      // sincroniza leyendas si cambió titulo de algún fieldset
      if (subPath.length >= 1) {
        const fsName = subPath[0];
        const fs = newRoot[fsName];
        if (fs && fs.titulo) syncLegend(fsName, fs.titulo);
      }
    } else if (rootKey === 'elementos_fuera') {
      await postGuardar({ elementos_fuera: newRoot });
      data.elementos_fuera = newRoot;
    } else {
      // otros nodos de nivel raíz: reemplaza bloque
      const payload = {}; payload[rootKey] = newRoot;
      await postGuardar(payload);
      data[rootKey] = newRoot;
    }

    // refresca vista
    const meta = nodeEl.querySelector('.json-node-meta');
    if (meta) meta.textContent = renderValueInline(nuevoVal);
    // si era objeto/array, reconstruir árbol
    if (typeOf(nuevoVal) === 'object' || typeOf(nuevoVal) === 'array' || subPath.length===0) buildTree();
  }

  function syncLegend(fsName, nuevoTitulo){
    const el = document.querySelector(`[data-fieldset-name="${CSS.escape(fsName)}"] legend`);
    if (el) el.textContent = nuevoTitulo || fsName;
  }

  function swalJsonEditor(title, initial){
    if (!window.Swal) {
      const txt = window.prompt('JSON para '+title, initial); if (txt==null) return Promise.resolve({ value:null });
      try { return Promise.resolve({ value: JSON.parse(txt) }); } catch(e){ alert('JSON inválido'); return Promise.resolve({ value:null }); }
    }
    return Swal.fire({
      title: title, input: 'textarea', inputValue: initial,
      inputAttributes:{ spellcheck:'false', style:'min-height:260px;font-family:monospace;' },
      showCancelButton:true, confirmButtonText:'Guardar',
      preConfirm: (txt)=> { try { return JSON.parse(txt); } catch(e){ Swal.showValidationMessage('JSON inválido'); return false; } }
    });
  }

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

  function onDesignModeChanged(e){
    const panel = $('#json-tree-panel'); if (!panel) return;
    panel.style.display = e.detail && e.detail.on ? '' : 'none';
    if (e.detail && e.detail.on) buildTree();
  }

  async function init(){
    injectStyles();
    await ensureJsonLoaded();
    const panel = ensurePanel();
    panel.style.display = shouldShow() ? '' : 'none';
    if (shouldShow()) buildTree();

    window.addEventListener('design-mode-changed', onDesignModeChanged);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
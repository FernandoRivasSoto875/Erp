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

  function parseLenientJson(text){
    try { return JSON.parse(text); } catch(_){
      const noComments = text.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'');
      const re = /([{,])\s*([a-zA-Z0-9_]+)\s*:/g;
      const fixed = noComments.replace(re, '$1"$2":');
      return JSON.parse(fixed);
    }
  }

  // Tree
  const tree = { data:{}, el:null, filter:'' };
  function buildTree(){
    const panel = ensurePanel();
    const body = $('#jsonTreeBody');
    body.innerHTML = '<div style="padding:12px; text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>';
    const json = getJsonData();
    tree.data = json;
    const html = renderNode(json, null, 0);
    body.innerHTML = html;
    tree.el = body;
    if (html) body.firstChild.click();
    updatePanelTitle();
    // setTimeout(()=>{ panel.scrollTop = 0; },50);
  }

  function renderNode(data, path, level){
    if (data == null) return '';
    if (typeof data !== 'object') return `<div class="json-tree-node" data-path="${esc(JSON.stringify(path))}" style="margin-left:${level*16}px;">
        <span class="json-node-key">${esc(String(path[path.length-1]))}</span>: <span class="json-node-value">${renderValueInline(data)}</span>
      </div>`;
    const keys = Object.keys(data);
    const hasChildren = keys.length > 0;
    const collapsed = tree.filter ? ' collapsed' : '';
    const children = hasChildren ? `<div class="json-tree-children" style="display:${collapsed?'none':'block'};">
        ${keys.map(k=>renderNode(data[k], path.concat(k), level+1)).join('')}
      </div>` : '';
    return `<div class="json-tree-node" data-path="${esc(JSON.stringify(path))}" style="margin-left:${level*16}px;">
        <span class="json-node-key">${esc(String(path[path.length-1]))}</span>: <span class="json-node-value">${renderValueInline(data)}</span>
        <div class="json-node-actions">
          <button class="btn-icon" title="Eliminar" onclick="event.stopPropagation(); deleteNode(${esc(JSON.stringify(path))});"><i class="fas fa-trash"></i></button>
          <button class="btn-icon" title="Duplicar" onclick="event.stopPropagation(); duplicateNode(${esc(JSON.stringify(path))});"><i class="fas fa-clone"></i></button>
          <button class="btn-icon" title="Editar" onclick="event.stopPropagation(); editNode(${esc(JSON.stringify(path))});"><i class="fas fa-pencil-alt"></i></button>
        </div>
      </div>`;
  }

  function filterTree(){
    const panel = ensurePanel();
    const body = $('#jsonTreeBody');
    const txt = $('#jsonTreeFilter').value.trim().toLowerCase();
    if (txt === tree.filter) return;
    tree.filter = txt;
    const json = getJsonData();
    let html = '';
    if (txt){
      const keys = Object.keys(json);
      for (const k of keys){
        if (String(k).toLowerCase().includes(txt)){
          html += renderNode(json[k], [k], 0);
        } else {
          const v = json[k];
          if (v && typeof v === 'object'){
            const childKeys = Object.keys(v);
            for (const ck of childKeys){
              if (String(ck).toLowerCase().includes(txt)){
                html += renderNode(v[ck], [k, ck], 1);
              }
            }
          }
        }
      }
    } else {
      html = renderNode(json, null, 0);
    }
    body.innerHTML = html;
    tree.el = body;
    if (html) body.firstChild.click();
    updatePanelTitle();
  }

  function updatePanelTitle(){
    const panel = $('#json-tree-panel');
    const body = $('#jsonTreeBody');
    const count = body.querySelectorAll('.json-tree-node').length;
    const title = `Árbol del JSON (${count})`;
    $('.json-tree-title', panel).textContent = title;
  }

  // Data
  function getJsonData(){
    const txt = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    return parseLenientJson(txt);
  }

  function setJsonData(data){
    const txt = JSON.stringify(data, null, 2);
    if (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json){
      const file = window.FORM_CONFIG.archivo_json;
      return fetch('guardar_layout.php', {
        method:'POST',
        body: JSON.stringify({ archivo:file, data:txt }),
        headers: { 'Content-Type': 'application/json' }
      })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
    }
    return Promise.resolve();
  }

  // CRUD
  function deleteNode(path){
    const json = getJsonData();
    let parent = json;
    for (let i=0; i<path.length-1; i++){
      parent = parent[path[i]];
    }
    delete parent[path[path.length-1]];
    buildTree();
    setJsonData(json);
  }

  function duplicateNode(path){
    const json = getJsonData();
    let src = json;
    for (let i=0; i<path.length; i++){
      src = src[path[i]];
    }
    const copy = deepClone(src);
    const parentPath = path.slice(0, path.length-1);
    let dest = json;
    for (let i=0; i<parentPath.length; i++){
      dest = dest[parentPath[i]];
    }
    const newKey = `__copy_${path[path.length-1]}`;
    dest[newKey] = copy;
    buildTree();
    setJsonData(json);
  }

  function editNode(path){
    const json = getJsonData();
    let value = json;
    for (let i=0; i<path.length; i++){
      value = value[path[i]];
    }
    const newValue = prompt('Editar valor', renderValueInline(value));
    if (newValue == null) return;
    const parsedValue = parseLenientJson(`{ "value": ${newValue} }`);
    setAtPath(json, path, parsedValue.value);
    buildTree();
    setJsonData(json);
  }

  // Form
  function initForm(){
    const form = document.forms[0];
    if (!form) return;
    const json = getJsonData();
    const keys = Object.keys(json);
    keys.forEach(k=>{
      const el = form.elements[k];
      if (el){
        el.value = renderValueInline(json[k]);
        el.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
  }

  function saveForm(){
    const form = document.forms[0];
    if (!form) return;
    const json = getJsonData();
    const data = {};
    const keys = Object.keys(json);
    keys.forEach(k=>{
      const el = form.elements[k];
      if (el){
        let value = el.value;
        if (value === '') value = null;
        setAtPath(data, k.split('.'), value);
      }
    });
    return postGuardar(data);
  }

  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    const allow = ['parametros','layout','fieldsets','elementos_fuera'];
    let sent = 0;
    allow.forEach(k=>{
      if (Object.prototype.hasOwnProperty.call(blocks, k)) {
        form.append(k, JSON.stringify(blocks[k]));
        sent++;
      }
    });
    if (!sent) return Promise.resolve({ success:true });
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  // Base Structure
  function ensureBaseStructureInteractive(){
    const json = getJsonData();
    const base = {
      parametros: json.parametros || {},
      layout: json.layout || [],
      fieldsets: json.fieldsets || {},
      elementos_fuera: json.elementos_fuera || {}
    };
    setJsonData(base).then(()=>{
      buildTree();
      Swal.fire('Estructura inicializada', 'La estructura base del JSON ha sido inicializada.', 'success');
    }).catch(e=>{
      Swal.fire('Error', e.message, 'error');
    });
  }

  // Events
  window.addEventListener('load', ()=>{
    injectStyles();
    ensurePanel();
    ensureToggleButton();
    buildTree();
    setTimeout(initForm, 100);
  });
  window.addEventListener('resize', ()=>{
    const panel = $('#json-tree-panel');
    if (!panel) return;
    const visible = getComputedStyle(panel).display !== 'none';
    if (visible) buildTree();
  });

  // Global functions
  window.jsonTreePanel = {
    buildTree,
    setJsonData,
    getJsonData,
    ensureBaseStructureInteractive
  };
})();
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

  // Mostrar solo en modo diseño
  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }
  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    const panel = document.getElementById('json-tree-panel');
    if (panel) panel.style.display = on ? '' : 'none';
    const btn = document.getElementById('fd-tree-toggle-btn');
    if (btn) btn.style.display = on ? 'inline-flex' : 'none';
    if (on) { ensureJsonLoaded().then(buildTree).catch(console.error); }
  }
  function watchDesignMode(){
    const root = document.getElementById('fd-root'); if (!root) return;
    new MutationObserver(()=>{
      const on = root.classList.contains('design-mode');
      window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on } }));
    }).observe(root, { attributes:true, attributeFilter:['class'] });
  }

  function parseLenientJson(text){
    try { return JSON.parse(text); } catch(_){
      const noComments = text.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'');
      const noTrailing = noComments.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(noTrailing);
    }
  }

  // Carga JSON real desde /json/<archivo>
  async function ensureJsonLoaded(){
    if (window.formularioJsonOriginal) return window.formularioJsonOriginal;
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || 'formulariogenerico2.json';
    const url = 'json/' + archivo;
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar '+url+' ('+r.status+')');
    const txt = await r.text();
    const data = parseLenientJson(txt) || {};
    window.formularioJsonOriginal = data;
    return data;
  }

  // Tree
  const tree = { data:{}, el:null, filter:'' };
  function buildTree(){
    const body = $('#jsonTreeBody'); if (!body) return;
    const json = getJsonData();
    tree.data = json;

    // Renderiza todos los nodos de primer nivel
    const keys = Object.keys(json);
    const html = keys.map(k => renderNode(k, json[k], [k], 0)).join('');
    body.innerHTML = html || '<div class="text-muted" style="padding:8px;">JSON vacío</div>';
    tree.el = body;
    updatePanelTitle();
  }

  function renderNode(key, value, path, level){
    const pad = level * 14;
    const t = typeOf(value);
    const meta = (t==='object') ? 'object' : (t==='array') ? `array(${(value||[]).length})` : renderValueInline(value);

    let html = `<div class="json-tree-node" data-path='${esc(JSON.stringify(path))}' style="margin-left:${pad}px;">
      <span class="json-node-key">${esc(String(key))}</span>
      <span class="json-node-meta">${esc(meta)}</span>
      <span class="json-node-actions">
        <button class="btn-icon" title="Editar" onclick="event.stopPropagation(); editNode(${esc(JSON.stringify(path))});"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn-icon" title="Duplicar" onclick="event.stopPropagation(); duplicateNode(${esc(JSON.stringify(path))});"><i class="fas fa-clone"></i></button>
        <button class="btn-icon" title="Eliminar" onclick="event.stopPropagation(); deleteNode(${esc(JSON.stringify(path))});"><i class="fas fa-trash"></i></button>
      </span>
    </div>`;

    if (t === 'object') {
      Object.keys(value||{}).forEach(k=>{
        html += renderNode(k, value[k], path.concat(k), level+1);
      });
    } else if (t === 'array') {
      (value||[]).forEach((item, idx)=>{
        html += renderNode(`[${idx}]`, item, path.concat(idx), level+1);
      });
    }
    return html;
  }

  function filterTree(){
    const q = ($('#jsonTreeFilter')?.value || '').trim().toLowerCase();
    tree.filter = q;
    if (!q) { buildTree(); return; }
    const body = $('#jsonTreeBody'); if (!body) return;
    // Asegura que esté renderizado
    if (!body.firstChild) buildTree();
    $all('.json-tree-node', body).forEach(n=>{
      const txt = n.textContent.toLowerCase();
      n.style.display = txt.includes(q) ? '' : 'none';
    });
    updatePanelTitle();
  }

  function updatePanelTitle(){
    const panel = $('#json-tree-panel'); if (!panel) return;
    const count = $('#jsonTreeBody')?.querySelectorAll('.json-tree-node')?.length || 0;
    $('.json-tree-title', panel).textContent = `Árbol del JSON (${count})`;
  }

  // Data
  function getJsonData(){
    return window.formularioJsonOriginal || {};
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

  // Persistencia por bloque raíz según path[0]
  async function persistRootByPath(path, updatedRoot){
    const rootKey = path[0];
    await postGuardar({ [rootKey]: updatedRoot });
    if (!window.formularioJsonOriginal) window.formularioJsonOriginal = {};
    window.formularioJsonOriginal[rootKey] = updatedRoot;
  }

  // CRUD
  async function deleteNode(path){
    const json = getJsonData();
    const rootKey = path[0];
    const subPath = path.slice(1);
    let root = deepClone(json[rootKey]);

    // Navega al padre
    let parent = root;
    for (let i=0;i<subPath.length-1;i++) parent = parent[subPath[i]];

    const last = subPath[subPath.length-1];
    if (Array.isArray(parent) && typeof last === 'number') parent.splice(last,1);
    else delete parent[last];

    await persistRootByPath(path, root);
    buildTree();
  }

  async function duplicateNode(path){
    const json = getJsonData();
    const rootKey = path[0];
    const subPath = path.slice(1);
    let root = deepClone(json[rootKey]);

    // Obtener valor origen
    let src = root; subPath.forEach(k=> src = src[k]);
    const copy = deepClone(src);

    // Insertar al lado
    const parentPath = subPath.slice(0, -1);
    let dest = root; parentPath.forEach(k=> dest = dest[k]);
    const last = subPath[subPath.length-1];

    if (Array.isArray(dest) && typeof last==='number') {
      dest.splice(last+1, 0, copy);
    } else if (dest && typeof dest==='object') {
      let base = String(last) + '_copia', i=2, newKey = base;
      while (Object.prototype.hasOwnProperty.call(dest, newKey)) newKey = base + i++;
      dest[newKey] = copy;
    }

    await persistRootByPath(path, root);
    buildTree();
  }

  async function editNode(path){
    const json = getJsonData();
    const rootKey = path[0];
    const subPath = path.slice(1);
    let root = deepClone(json[rootKey]);

    // Valor actual
    let value = root; subPath.forEach(k=> value = value[k]);

    // Prompt simple (puedes reemplazar por Swal)
    const input = window.prompt('Editar valor (JSON o texto)', (typeOf(value)==='string') ? JSON.stringify(value) : JSON.stringify(value));
    if (input == null) return;

    let newVal;
    try { newVal = JSON.parse(input); }
    catch { newVal = input; }

    setAtPath(root, subPath, newVal);
    await persistRootByPath(path, root);
    buildTree();
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
    ensureJsonLoaded().then(async ()=>{
      const data = getJsonData();
      const payload = {};
      if (!data.parametros || typeof data.parametros!=='object') payload.parametros = {};
      if (!data.layout || typeof data.layout!=='object') {
        payload.layout = {
          header: { type:'header', rows: [] },
          main:   { type:'generic', rows: [ { columns: [ { width: 12 } ] } ] },
          footer: { type:'footer', rows: [] }
        };
      }
      if (!data.fieldsets || typeof data.fieldsets!=='object') payload.fieldsets = {};
      if (!Array.isArray(data.elementos_fuera)) payload.elementos_fuera = [];

      if (Object.keys(payload).length === 0) {
        if (window.Swal) Swal.fire('Listo', 'La estructura base ya existe.', 'success');
        return;
      }

      await postGuardar(payload);
      window.formularioJsonOriginal = { ...data, ...payload };
      buildTree();
      if (window.Swal) Swal.fire('Hecho', 'Estructura creada.', 'success');
    }).catch(e=>{
      if (window.Swal) Swal.fire('Error', String(e.message||e), 'error');
    });
  }

  // Events
  window.addEventListener('load', async ()=>{
    injectStyles();
    ensurePanel();
    ensureToggleButton();
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);

    if (shouldShow()) {
      try { await ensureJsonLoaded(); buildTree(); } catch(e){ console.error(e); }
    } else {
      const panel = $('#json-tree-panel'); if (panel) panel.style.display = 'none';
    }
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
(function(){
  // Evita doble carga del script
  if (window.__JSON_TREE_PANEL_LOADED__) return;
  window.__JSON_TREE_PANEL_LOADED__ = true;

  const CONFIG = { showOnlyInDesignMode: true };
  let lastDesignOn = null;

  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.from((r||document).querySelectorAll(s)); }
  function typeOf(v){ if (Array.isArray(v)) return 'array'; return v===null?'null':(typeof v==='object'?'object':typeof v); }
  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
  function getAtPath(obj, path){ return (path||[]).reduce((acc,k)=> (acc==null?acc:acc[k]), obj); }
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

  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }

  // Carga JSON si no viene embebido
  async function ensureJsonLoaded(){
    if (window.formularioJsonOriginal && Object.keys(window.formularioJsonOriginal).length) return window.formularioJsonOriginal;
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || 'formulariogenerico2.json';
    const url = 'json/' + archivo;
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar '+url+' ('+r.status+')');
    const txt = await r.text();
    let data;
    try { data = JSON.parse(txt); }
    catch {
      const noComments = txt.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'')
      const noTrailing = noComments.replace(/,\s*([}\]])/g, '$1');
      data = JSON.parse(noTrailing);
    }
    window.formularioJsonOriginal = data || {};
    return window.formularioJsonOriginal;
  }

  function ensurePanel(){
    let panel = $('#json-tree-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'json-tree-panel';
    panel.className = 'json-tree-panel';
    panel.innerHTML = `
      <div class="json-tree-header">
        <h6 class="json-tree-title"><i class="fas fa-sitemap"></i> Árbol del JSON</h6>
        <div class="json-tree-actions">
          <button id="jsonTreeInit" title="Inicializar estructura"><i class="fas fa-seedling"></i></button>
          <button id="jsonTreeRefresh" title="Refrescar"><i class="fas fa-sync-alt"></i></button>
          <button id="jsonTreeClose" title="Cerrar"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="json-tree-search"><input id="jsonTreeFilter" type="search" placeholder="Filtrar..."></div>
      <div class="json-tree-body" id="jsonTreeBody"></div>
    `;
    document.body.appendChild(panel);
    $('#jsonTreeClose').addEventListener('click', ()=> panel.style.display='none');
    $('#jsonTreeRefresh').addEventListener('click', ()=> buildTree());
    $('#jsonTreeFilter').addEventListener('input', filterTree);
    $('#jsonTreeInit').addEventListener('click', ensureBaseStructureInteractive);
    return panel;
  }

  function ensureToggleButton(){
    if ($('#fd-tree-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'fd-tree-toggle-btn';
    btn.innerHTML = '<i class="fas fa-sitemap"></i> Árbol';
    btn.addEventListener('click', ()=>{
      const p = ensurePanel();
      const isHidden = getComputedStyle(p).display === 'none';
      p.style.display = isHidden ? '' : 'none';
      if (isHidden) buildTree();
    });
    document.body.appendChild(btn);
    btn.style.display = 'none'; // oculto por defecto
  }

  // Construcción del árbol (solo si estamos en diseño y existe data)
  function buildTree(){
    if (!shouldShow()) return;
    const data = window.formularioJsonOriginal || {};
    const body = $('#jsonTreeBody'); if (!body) return;

    // Claves existentes, en orden preferido
    const preferred = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = preferred.filter(k => Object.prototype.hasOwnProperty.call(data, k))
      .concat(Object.keys(data).filter(k => !preferred.includes(k)));

    body.innerHTML = keys.length
      ? keys.map(k => renderNode(k, data[k], [k], 0)).join('')
      : '<div class="text-muted" style="padding:8px;">JSON vacío</div>';

    bindEditActions(body);
    if (typeof bindTreeDragAndDrop === 'function') bindTreeDragAndDrop(body); // opcional
    updatePanelTitle();
  }

  function renderNode(key, val, path, level){
    const pad = Math.max(0, level * 12);
    const t = typeOf(val);
    const meta = (t==='object') ? 'object' : (t==='array') ? `array(${(val||[]).length})` : renderValue(val);

    let html = `<div class="json-tree-node" data-path='${esc(JSON.stringify(path))}' draggable="true" style="margin-left:${pad}px;">
      <span class="json-node-key">${esc(String(key))}</span>
      <span class="json-node-meta">${esc(meta)}</span>
      <span class="json-node-actions">
        <button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn-icon act-dup" title="Duplicar"><i class="fas fa-clone"></i></button>
        <button class="btn-icon act-rename" title="Renombrar"><i class="fas fa-i-cursor"></i></button>
        <button class="btn-icon act-del" title="Eliminar"><i class="fas fa-trash"></i></button>
      </span>
    </div>`;

    if (t === 'object') {
      Object.keys(val||{}).forEach(k=>{ html += renderNode(k, val[k], path.concat(k), level+1); });
    } else if (t === 'array') {
      (val||[]).forEach((item, idx)=>{ html += renderNode(`[${idx}]`, item, path.concat(idx), level+1); });
    }
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
    const count = $('#jsonTreeBody')?.querySelectorAll('.json-tree-node')?.length || 0;
    title.textContent = `Árbol del JSON (${count})`;
  }

  function filterTree(){
    const q = ($('#jsonTreeFilter')?.value || '').trim().toLowerCase();
    const body = $('#jsonTreeBody'); if (!body) return;
    if (!q) return buildTree();
    $all('.json-tree-node', body).forEach(n=>{
      n.style.display = n.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    updatePanelTitle();
  }

  // Persistencia básica por raíz
  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    ['parametros','layout','fieldsets','elementos_fuera'].forEach(k=>{
      if (Object.prototype.hasOwnProperty.call(blocks, k)) form.append(k, JSON.stringify(blocks[k]));
    });
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }
  async function persistRootByPath(path, updatedRoot){
    const rootKey = path[0];
    await postGuardar({ [rootKey]: updatedRoot });
    if (!window.formularioJsonOriginal) window.formularioJsonOriginal = {};
    window.formularioJsonOriginal[rootKey] = updatedRoot;
  }

  // CRUD mínimos (evita errores y funcionan)
  async function editNodeByPath(path){
    const data = window.formularioJsonOriginal || {};
    const rootKey = path[0], sub = path.slice(1);
    let root = deepClone(data[rootKey]);
    let cur = root; sub.forEach(k=> cur = cur[k]);
    const prev = (typeOf(cur)==='object' || typeOf(cur)==='array') ? JSON.stringify(cur, null, 2) : JSON.stringify(cur);
    const input = window.prompt('Editar valor (JSON)', prev);
    if (input == null) return;
    let val; try { val = JSON.parse(input); } catch(e){ return alert('JSON inválido'); }
    setAtPath(root, sub, val);
    await persistRootByPath(path, root);
    buildTree();
  }
  async function duplicateAtPath(path){
    const data = window.formularioJsonOriginal || {};
    const rootKey = path[0], sub = path.slice(1);
    let root = deepClone(data[rootKey]);
    const parentPath = sub.slice(0,-1), key = sub[sub.length-1];
    let parent = parentPath.length ? getAtPath(root, parentPath) : root;
    const val = deepClone(parent[key]);
    if (Array.isArray(parent) && typeof key==='number') parent.splice(key+1, 0, val);
    else if (parent && typeof parent==='object'){
      let nk = String(key) + '_copia', i=2;
      while (Object.prototype.hasOwnProperty.call(parent, nk)) nk = String(key) + '_copia' + (i++);
      parent[nk] = val;
    }
    await persistRootByPath(path, root);
    buildTree();
  }
  async function deleteAtPath(path){
    if (!confirm('¿Eliminar elemento?')) return;
    const data = window.formularioJsonOriginal || {};
    const rootKey = path[0], sub = path.slice(1);
    let root = deepClone(data[rootKey]);
    const parentPath = sub.slice(0,-1), key = sub[sub.length-1];
    let parent = parentPath.length ? getAtPath(root, parentPath) : root;
    if (Array.isArray(parent) && typeof key==='number') parent.splice(key,1);
    else if (parent && typeof parent==='object') delete parent[key];
    await persistRootByPath(path, root);
    buildTree();
  }
  async function renameAtPath(path){
    const data = window.formularioJsonOriginal || {};
    const rootKey = path[0], sub = path.slice(1);
    let root = deepClone(data[rootKey]);
    const parentPath = sub.slice(0,-1), key = sub[sub.length-1];
    let parent = parentPath.length ? getAtPath(root, parentPath) : root;
    if (!(parent && typeof parent==='object') || typeof key!=='string') return;
    const nuevo = window.prompt('Nueva clave', String(key)); if (!nuevo || nuevo===key) return;
    if (Object.prototype.hasOwnProperty.call(parent, nuevo)) return alert('La clave ya existe.');
    parent[nuevo] = parent[key]; delete parent[key];
    await persistRootByPath(path, root);
    buildTree();
  }

  // Inicializador no destructivo
  async function ensureBaseStructureInteractive(){
    await ensureJsonLoaded();
    const data = window.formularioJsonOriginal || {};
    const payload = {};
    if (!data.parametros || typeof data.parametros!=='object') payload.parametros = {};
    if (!data.layout || typeof data.layout!=='object') payload.layout = { header:{type:'header',rows:[]}, main:{type:'generic',rows:[{columns:[{width:12}]}]}, footer:{type:'footer',rows:[]} };
    if (!data.fieldsets || typeof data.fieldsets!=='object') payload.fieldsets = {};
    if (!Array.isArray(data.elementos_fuera)) payload.elementos_fuera = [];
    if (!Object.keys(payload).length) return alert('La estructura base ya existe.');
    await postGuardar(payload);
    window.formularioJsonOriginal = { ...data, ...payload };
    buildTree();
  }

  // Transiciones de modo diseño
  async function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    if (on === lastDesignOn) return;
    lastDesignOn = on;

    let panel = $('#json-tree-panel');
    let btn = $('#fd-tree-toggle-btn');

    if (on) {
      if (!panel) panel = ensurePanel();
      if (!btn) ensureToggleButton();
      panel.style.display = '';
      btn.style.display = 'inline-flex';
      try { await ensureJsonLoaded(); buildTree(); } catch(err){ console.error(err); }
    } else {
      if (panel) panel.style.display = 'none';
      if (btn) btn.style.display = 'none';
    }
  }

  // Observa #fd-root y emite eventos
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
      emit(); // estado actual (no crea panel si está apagado)
    });
  }

  // Boot: no crear nada si no es diseño
  window.addEventListener('load', ()=>{
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
  });

})();
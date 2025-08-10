(function(){
  const CONFIG = { showOnlyInDesignMode: true };

  // Helpers
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function typeOf(v){ if (Array.isArray(v)) return 'array'; return v===null ? 'null' : typeof v==='object' ? 'object' : typeof v; }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
  function getAtPath(obj, path){ return (path||[]).reduce((acc,k)=> (acc==null?acc:acc[k]), obj); }
  function setAtPath(obj, path, val){
    if (!path || !path.length) return;
    let cur = obj; for (let i=0;i<path.length-1;i++){ const k=path[i]; if (cur[k]==null || typeof cur[k]!=='object') cur[k] = (typeof path[i+1]==='number')?[]:{}; cur = cur[k]; }
    cur[path[path.length-1]] = val;
  }
  function parseLenientJson(text){
    try { return JSON.parse(text); } catch(_){
      const noComments = text.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'');
      const noTrailing = noComments.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(noTrailing);
    }
  }
  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }
  function watchDesignMode(){
    const root = document.getElementById('fd-root'); if (!root) return;
    new MutationObserver(()=>{
      const on = root.classList.contains('design-mode');
      window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on } }));
    }).observe(root, { attributes:true, attributeFilter:['class'] });
  }

  // Carga JSON actual
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

  // Panel
  function injectStyles(){
    if ($('#json-tree-panel-styles')) return;
    const css = `
      .json-tree-panel{ position:fixed; top:60px; right:12px; width:460px; height:72vh; background:#fff; border:1px solid #dcdfe3; border-radius:8px; box-shadow:0 10px 24px rgba(16,24,40,.12); z-index:9999; display:flex; flex-direction:column; overflow:hidden; }
      .json-tree-header{ padding:8px 10px; background:#f8f9fb; border-bottom:1px solid #e9ecef; display:flex; align-items:center; justify-content:space-between; }
      .json-tree-title{ margin:0; font-size:13px; color:#344054; }
      .json-tree-actions button{ background:none; border:0; cursor:pointer; padding:4px 6px; color:#475467; }
      .json-tree-actions button:hover{ color:#0d6efd; }
      .json-tree-search{ padding:8px 10px; border-bottom:1px solid #f0f2f5; }
      .json-tree-search input{ width:100%; border:1px solid #d0d5dd; border-radius:6px; padding:6px 10px; font-size:12px; }
      .json-tree-body{ overflow:auto; padding:6px 8px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size:12px; background:linear-gradient(#fff, #fff) padding-box, linear-gradient(0deg, #fff, #f8fafc) border-box; }
      .json-tree-node{ padding:6px 8px; border-radius:6px; margin:2px 0; display:flex; align-items:center; gap:8px; transition:background .15s ease,border-color .15s ease; border:1px solid transparent; }
      .json-tree-node:hover{ background:#f8fafc; border-color:#eef2f6; }
      .json-node-icon{ width:18px; text-align:center; color:#667085; }
      .json-node-key{ font-weight:600; color:#344054; }
      .json-node-meta{ color:#667085; margin-left:auto; padding-left:6px; }
      .json-node-actions button{ background:none; border:0; cursor:pointer; padding:2px 4px; color:#667085; }
      .json-node-actions button:hover{ color:#0d6efd; }
      .json-badge{ display:inline-block; font-weight:600; padding:1px 6px; border-radius:10px; font-size:11px; border:1px solid #e4e7ec; color:#475467; background:#f8fafc; margin-left:6px; }
      .json-badge.field{ border-color:#ffd9b3; background:#fff7ed; color:#b54708; }
      .json-badge.array{ border-color:#e0e7ff; background:#eef2ff; color:#3730a3; }
      .json-badge.object{ border-color:#d1fae5; background:#ecfdf5; color:#047857; }
      .pos-badge{ display:inline-block; margin-left:6px; background:#eef2ff; color:#3730a3; border:1px solid #e0e7ff; border-radius:999px; padding:0 7px; font-size:11px; }
      #fd-tree-toggle-btn{ position:fixed; top:60px; right:486px; z-index:9999; display:inline-flex; gap:6px; align-items:center; background:#0d6efd; color:#fff; border:0; padding:7px 12px; border-radius:6px; font-size:12px; cursor:pointer; box-shadow:0 4px 10px rgba(13,110,253,.25); }
      #fd-tree-toggle-btn:hover{ filter:brightness(.98); }
      .json-tree-node.drag-src{ opacity:.6; }
      .json-tree-node.drop-ok{ outline:2px dashed #0d6efd; }
      .json-tree-node.drop-bad{ outline:2px dashed #dc3545; }
    `;
    const st = document.createElement('style'); st.id='json-tree-panel-styles'; st.textContent = css;
    document.head.appendChild(st);
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
      p.style.display = (p.style.display==='none'?'':'') === '' ? 'none' : '';
      // al abrir, construir
      if (p.style.display !== 'none') ensureJsonLoaded().then(buildTree).catch(console.error);
    });
    document.body.appendChild(btn);
    // Solo visible en modo diseño
    btn.style.display = shouldShow() ? 'inline-flex' : 'none';
  }

  // Tree state
  const tree = { data:{}, el:null, filter:'' };

  function buildTree(){
    const panel = ensurePanel();
    panel.style.display = shouldShow() ? '' : 'none';
    const body = $('#jsonTreeBody'); if (!body) return;
    const data = window.formularioJsonOriginal || {};
    tree.data = data;

    const order = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = [...new Set(order.concat(Object.keys(data)))];

    body.innerHTML = keys.map(k => renderAnyNode(k, data[k], [k], true)).join('') || '<div class="text-muted" style="padding:8px;">JSON vacío</div>';
    bindEditActions(body);
    bindTreeDragAndDrop(body);
    updatePanelTitle();
  }

  function actionsForNode(path, val, type){
    const isArrayItem = typeof path[path.length-1] === 'number';
    const parts = [];
    parts.push(`<button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>`);
    parts.push(`<button class="btn-icon act-dup" title="Duplicar"><i class="fas fa-clone"></i></button>`);
    if (!isArrayItem) parts.push(`<button class="btn-icon act-rename" title="Renombrar"><i class="fas fa-i-cursor"></i></button>`);
    parts.push(`<button class="btn-icon act-del" title="Eliminar"><i class="fas fa-trash"></i></button>`);
    return `<span class="json-node-actions">${parts.join('')}</span>`;
  }

  // Iconos y metadata de nodos
  const FIELD_TYPE_ICONS = {
    text:'fa-i-cursor', textarea:'fa-align-left', number:'fa-hashtag', integer:'fa-hashtag', decimal:'fa-hashtag',
    select:'fa-caret-down', multiselect:'fa-list-ul', checkbox:'fa-check-square', radio:'fa-dot-circle',
    date:'fa-calendar-day', datetime:'fa-calendar-alt', time:'fa-clock',
    email:'fa-envelope', tel:'fa-phone', url:'fa-link',
    file:'fa-paperclip', image:'fa-image', color:'fa-palette',
    password:'fa-key', switch:'fa-toggle-on', range:'fa-sliders-h', html:'fa-code'
  };
  function isFieldNode(path, val){
    // fieldsets.<fs>.campos[<idx>] -> objeto campo
    return Array.isArray(path)
      && path.length >= 4
      && path[0] === 'fieldsets'
      && path[2] === 'campos'
      && typeof path[3] === 'number'
      && val && typeof val === 'object';
  }
  function getFieldInfo(path, val){
    const idx = path[3];
    const nombre = (val && (val.nombre || val.name)) ? String(val.nombre || val.name) : '';
    const tipo = (val && (val.tipo || val.type)) ? String(val.tipo || val.type).toLowerCase() : '';
    const icon = FIELD_TYPE_ICONS[tipo] || 'fa-square';
    return { idx, nombre, tipo, icon };
  }
  function getGenericIcon(path, key, val, type){
    // Íconos generales por contexto
    if (path.length === 1){
      if (key === 'parametros') return 'fa-cog';
      if (key === 'layout') return 'fa-th-large';
      if (key === 'fieldsets') return 'fa-layer-group';
      if (key === 'elementos_fuera') return 'fa-box-open';
    }
    if (type === 'array') return 'fa-list-ol';
    if (type === 'object'){
      const t = (val && val.type) ? String(val.type).toLowerCase() : '';
      if (t === 'tabs') return 'fa-folder-open';
      if (t === 'fieldset-group') return 'fa-object-group';
      if (t === 'header') return 'fa-heading';
      if (t === 'footer') return 'fa-ellipsis-h';
      if (t === 'generic') return 'fa-th';
      // ítem de grupo explícito
      if (val && val.type === 'fieldset') return 'fa-clipboard-list';
    }
    // Hojas por tipo simple
    if (type === 'string') return 'fa-quote-right';
    if (type === 'number') return 'fa-hashtag';
    if (type === 'boolean') return 'fa-toggle-on';
    if (type === 'null') return 'fa-ban';
    return 'fa-folder';
  }

  function renderAnyNode(key, val, path, open){
    const t = typeOf(val);
    const indent = Math.max(0, (path.length-1) * 12);

    // Campo: nombre + posición + icono por tipo
    let isField = isFieldNode(path, val);
    let iconClass, displayKey = String(key), extraBadges = '';
    if (isField){
      const info = getFieldInfo(path, val);
      iconClass = info.icon;
      displayKey = (info.nombre ? info.nombre : displayKey) + ` <span class="pos-badge">#${info.idx}</span>`;
      extraBadges += info.tipo ? ` <span class="json-badge field">${esc(info.tipo)}</span>` : '';
    } else {
      iconClass = getGenericIcon(path, key, val, t);
      // Badges para object/array
      if (t === 'array') extraBadges += ` <span class="json-badge array">array(${(val||[]).length})</span>`;
      else if (t === 'object') extraBadges += ` <span class="json-badge object">object</span>`;
    }

    const meta = (t==='object' || t==='array') ? '' : esc(renderValueInline(val));

    let html = `<div class="json-tree-node${isField?' is-field-node':''}" data-path='${esc(JSON.stringify(path))}' draggable="true" style="margin-left:${indent}px;">
      <span class="json-node-icon"><i class="fas ${iconClass}"></i></span>
      <span class="json-node-key">${displayKey}</span>
      ${extraBadges}
      <span class="json-node-meta">${meta}</span>
      ${actionsForNode(path, val, t)}
    </div>`;

    if (t === 'object') {
      Object.keys(val||{}).forEach(k=>{
        html += renderAnyNode(k, val[k], path.concat(k), false);
      });
    } else if (t === 'array') {
      (val||[]).forEach((item, idx)=>{
        html += renderAnyNode(`[${idx}]`, item, path.concat(idx), false);
      });
    }
    return html;
  }
  function renderValueInline(v){
    const t = typeOf(v);
    if (t==='string') return `"${v}"`;
    if (t==='number' || t==='boolean') return String(v);
    if (t==='null') return 'null';
    if (t==='array') return `array(${(v||[]).length})`;
    if (t==='object') return 'object';
    return String(v);
  }
  function updatePanelTitle(){
    const count = $('#jsonTreeBody')?.querySelectorAll('.json-tree-node')?.length || 0;
    const title = $('.json-tree-title'); if (title) title.textContent = `Árbol del JSON (${count})`;
  }
  function filterTree(){
    const q = ($('#jsonTreeFilter')?.value || '').trim().toLowerCase();
    const body = $('#jsonTreeBody'); if (!body) return;
    if (!q) { buildTree(); return; }
    $all('.json-tree-node', body).forEach(n=>{
      const txt = n.textContent.toLowerCase();
      n.style.display = txt.includes(q) ? '' : 'none';
    });
    updatePanelTitle();
  }

  // Persistencia
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

  // CRUD básicos
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
    let val = parent[key]; const copy = deepClone(val);
    if (Array.isArray(parent) && typeof key==='number') parent.splice(key+1,0,copy);
    else if (parent && typeof parent==='object') {
      let base = String(key)+'_copia', i=2, newKey=base;
      while (Object.prototype.hasOwnProperty.call(parent,newKey)) newKey = base + i++;
      parent[newKey] = copy;
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

  function bindEditActions(root){
    root.addEventListener('click', async (e)=>{
      const btn = e.target.closest('.json-node-actions button'); if (!btn) return;
      const node = e.target.closest('.json-tree-node'); if (!node) return;
      let path; try { path = JSON.parse(node.getAttribute('data-path')); } catch { return; }
      if (btn.classList.contains('act-edit')) return editNodeByPath(path);
      if (btn.classList.contains('act-dup')) return duplicateAtPath(path);
      if (btn.classList.contains('act-del')) return deleteAtPath(path);
      if (btn.classList.contains('act-rename')) return renameAtPath(path);
    });
  }

  // Drag & Drop básico en árbol
  let dragSrcPath = null;
  function pathsEqual(a,b){ return a && b && a.length===b.length && a.every((v,i)=> v===b[i]); }
  function isAncestorPath(anc, child){
    if (!anc || !child || anc.length>=child.length) return false;
    for (let i=0;i<anc.length;i++) if (anc[i]!==child[i]) return false;
    return true;
  }
  function canMove(src, dst){
    if (!dst) return false;
    if (src[0] !== dst[0]) return false; // misma raíz
    if (isAncestorPath(src, dst)) return false; // no dentro de sí mismo
    return true;
  }
  function bindTreeDragAndDrop(root){
    root.addEventListener('dragstart', (e)=>{
      const n = e.target.closest('.json-tree-node'); if (!n) return;
      const p = JSON.parse(n.getAttribute('data-path'));
      dragSrcPath = p;
      n.classList.add('drag-src');
      try { e.dataTransfer.setData('application/json', JSON.stringify(p)); } catch {}
      e.dataTransfer.effectAllowed = 'move';
    });
    root.addEventListener('dragend', ()=>{
      dragSrcPath = null;
      $all('.json-tree-node.drag-src', root).forEach(n=> n.classList.remove('drag-src'));
      $all('.json-tree-node.drop-ok,.json-tree-node.drop-bad', root).forEach(n=> n.classList.remove('drop-ok','drop-bad'));
    });
    root.addEventListener('dragover', (e)=>{
      if (!dragSrcPath) return;
      const over = e.target.closest('.json-tree-node'); if (!over) return;
      const dst = JSON.parse(over.getAttribute('data-path'));
      if (!canMove(dragSrcPath, dst)) { over.classList.add('drop-bad'); return; }
      e.preventDefault(); over.classList.add('drop-ok'); over.classList.remove('drop-bad');
    });
    root.addEventListener('dragleave', (e)=>{
      const over = e.target.closest('.json-tree-node'); if (!over) return;
      over.classList.remove('drop-ok','drop-bad');
    });
    root.addEventListener('drop', async (e)=>{
      const over = e.target.closest('.json-tree-node'); if (!over) return;
      const dst = JSON.parse(over.getAttribute('data-path'));
      $all('.json-tree-node.drop-ok,.json-tree-node.drop-bad', root).forEach(n=> n.classList.remove('drop-ok','drop-bad'));
      if (!dragSrcPath || !canMove(dragSrcPath, dst)) return;
      e.preventDefault();

      const data = window.formularioJsonOriginal || {};
      const rootKey = dragSrcPath[0];
      let rootObj = deepClone(data[rootKey]);

      // extraer valor origen
      const srcParentPath = dragSrcPath.slice(1, -1), srcKey = dragSrcPath[dragSrcPath.length-1];
      let srcParent = srcParentPath.length ? getAtPath(rootObj, srcParentPath) : rootObj;
      const movingVal = deepClone(srcParent[srcKey]);
      // eliminar del origen
      if (Array.isArray(srcParent) && typeof srcKey==='number') srcParent.splice(srcKey,1);
      else delete srcParent[srcKey];

      // destino: si es array, push; si es objeto, pedir clave; si es hoja, insertar en su padre
      let dstVal = getAtPath(rootObj, dst.slice(1));
      let parentPath = null, asArray = false, insertIndex = null;
      if (Array.isArray(dstVal)) {
        parentPath = dst.slice(1); asArray = true;
      } else if (dstVal && typeof dstVal==='object') {
        parentPath = dst.slice(1);
      } else {
        parentPath = dst.slice(1, -1);
        const last = dst[dst.length-1];
        const parent = getAtPath(rootObj, parentPath);
        if (Array.isArray(parent) && typeof last==='number'){ asArray = true; insertIndex = last+1; }
      }

      if (asArray) {
        const arr = getAtPath(rootObj, parentPath) || [];
        const copy = arr.slice();
        if (insertIndex==null || insertIndex<0 || insertIndex>copy.length) copy.push(movingVal);
        else copy.splice(insertIndex, 0, movingVal);
        setAtPath(rootObj, parentPath, copy);
      } else {
        const obj = getAtPath(rootObj, parentPath) || {};
        let suggested = (typeof dragSrcPath[dragSrcPath.length-1]==='string') ? dragSrcPath[dragSrcPath.length-1] : 'nuevo';
        if (Object.prototype.hasOwnProperty.call(obj, suggested)) {
          suggested = window.prompt('Clave para nuevo hijo', suggested) || suggested + '_copia';
        }
        obj[suggested] = movingVal;
        setAtPath(rootObj, parentPath, obj);
      }

      await persistRootByPath(dragSrcPath, rootObj);
      buildTree();
    });
  }

  // Inicializador de estructura base (no destructivo)
  async function ensureBaseStructureInteractive(){
    await ensureJsonLoaded();
    const data = window.formularioJsonOriginal || {};
    const payload = {};
    if (!data.parametros || typeof data.parametros!=='object') payload.parametros = {};
    if (!data.layout || typeof data.layout!=='object'){
      payload.layout = {
        header: { type:'header', rows: [] },
        main: { type:'generic', rows: [ { columns: [ { width: 12 } ] } ] },
        footer: { type:'footer', rows: [] }
      };
    }
    if (!data.fieldsets || typeof data.fieldsets!=='object') payload.fieldsets = {};
    if (!Array.isArray(data.elementos_fuera)) payload.elementos_fuera = [];
    if (!Object.keys(payload).length) return alert('La estructura base ya existe.');
    await postGuardar(payload);
    window.formularioJsonOriginal = { ...data, ...payload };
    buildTree();
  }

  // Mostrar solo en modo diseño
  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    const panel = $('#json-tree-panel');
    const btn = $('#fd-tree-toggle-btn');
    if (panel) panel.style.display = on ? '' : 'none';
    if (btn) btn.style.display = on ? 'inline-flex' : 'none';
    if (on) ensureJsonLoaded().then(buildTree).catch(console.error);
  }

  // Boot
  window.addEventListener('load', async ()=>{
    injectStyles();
    ensurePanel();
    ensureToggleButton();
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
    if (shouldShow()) {
      try { await ensureJsonLoaded(); buildTree(); } catch(e){ console.error(e); }
    } else {
      const p = $('#json-tree-panel'); if (p) p.style.display = 'none';
      const b = $('#fd-tree-toggle-btn'); if (b) b.style.display = 'none';
    }
  });

})();
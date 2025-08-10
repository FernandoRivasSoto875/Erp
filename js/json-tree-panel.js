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
      .json-tree-panel{ position:fixed; top:60px; right:12px; width:460px; min-width:360px; max-width:95vw; height:72vh; z-index:1055; resize:both; }
      .json-tree-panel .card-body.scroll{ overflow:auto; height:calc(100% - 94px); }
      #fd-tree-toggle-btn{ position:fixed; top:60px; right:486px; z-index:1055; }
      /* Árbol jerárquico */
      #jsonTreeBody .json-tree-item{ }
      #jsonTreeBody .json-row{ display:flex; align-items:center; gap:.5rem; padding:.25rem .5rem; white-space:nowrap; }
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

  // Cargar mapa de tipos (iconos) desde json/form-types.json
  async function ensureFormTypesLoaded(){
    if (window.FORM_TYPES_MAP) return window.FORM_TYPES_MAP;
    try{
      const r = await fetch('json/form-types.json', { cache:'no-store' });
      if (!r.ok) throw new Error('HTTP '+r.status);
      window.FORM_TYPES_MAP = await r.json();
    }catch(err){
      console.warn('[json-tree] No se pudo cargar form-types.json:', err);
      window.FORM_TYPES_MAP = { field_types:{}, fieldset_types:{} };
    }
    return window.FORM_TYPES_MAP;
  }

  // Resolver definiciones de tipo (case-insensitive)
  function resolveTypeDef(group, key){
    if (!group || !key) return null;
    if (group[key]) return { key, def: group[key] };
    const low = String(key).toLowerCase();
    const foundKey = Object.keys(group).find(k => String(k).toLowerCase() === low);
    return foundKey ? { key: foundKey, def: group[foundKey] } : null;
  }

  // Helpers para obtener propiedades con alias y case-insensitive
  function getPropIgnoreCase(obj, wanted){
    if (!obj || typeof obj !== 'object') return undefined;
    const keys = Object.keys(obj);
    const wl = String(wanted).toLowerCase();
    const k = keys.find(x => String(x).toLowerCase() === wl);
    return k ? obj[k] : undefined;
  }
  function getFirstStringProp(obj, names){
    for (const n of names){
      const v = getPropIgnoreCase(obj, n);
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  }

  function getTypeIconFromKey(keyStr){
    const map = window.FORM_TYPES_MAP || {};
    const ft = resolveTypeDef(map.field_types, keyStr);
    if (ft && ft.def && ft.def.icon) return { iconClass: ft.def.icon, title: ft.key };
    const fs = resolveTypeDef(map.fieldset_types, keyStr);
    if (fs && fs.def && fs.def.icon) return { iconClass: fs.def.icon, title: fs.key };
    return null;
  }

  // Heurística para recuperar icono según valor y contexto (con alias)
  function getTypeIcon(nodeVal, path, key){
    const map = window.FORM_TYPES_MAP || {};
    // Aliases de propiedades para fields/containers
    const FIELD_KEYS = ['type','tipo','control','component','componente','widget','kind'];
    const SUBTYPE_KEYS = ['subtype','subtipo'];
    const CONTAINER_KEYS = ['type','layout','tipo'];

    // Si es propiedad "type/layout" (o alias) con string
    const keyLower = typeof key === 'string' ? key.toLowerCase() : '';
    if (['type','layout','tipo'].includes(keyLower) && typeof nodeVal === 'string' && nodeVal){
      const ico = getTypeIconFromKey(nodeVal);
      if (ico) return ico;
    }

    // Si es un objeto (field o fieldset)
    if (nodeVal && typeof nodeVal === 'object' && !Array.isArray(nodeVal)){
      // 1) Intenta como field contra field_types
      const fieldType = getFirstStringProp(nodeVal, FIELD_KEYS);
      if (fieldType){
        const r = resolveTypeDef(map.field_types, fieldType);
        if (r && r.def && r.def.icon) return { iconClass: r.def.icon, title: r.key };
      }
      // 2) Si es input, usa subtype/subtipo
      if (fieldType && String(fieldType).toLowerCase() === 'input'){
        const sub = getFirstStringProp(nodeVal, SUBTYPE_KEYS);
        if (sub){
          const rs = resolveTypeDef(map.field_types, sub);
          if (rs && rs.def && rs.def.icon) return { iconClass: rs.def.icon, title: rs.key };
        }
      }
      // 3) Intenta como contenedor/fieldset contra fieldset_types
      const contType = getFirstStringProp(nodeVal, CONTAINER_KEYS);
      if (contType){
        const rc = resolveTypeDef(map.fieldset_types, contType);
        if (rc && rc.def && rc.def.icon) return { iconClass: rc.def.icon, title: rc.key };
      }
    }

    return null; // sin icono
  }

  // NUEVO: resolver el nombre/etiqueta de tipo aunque no exista ícono
  function resolveTypeName(nodeVal, path, key){
    const FIELD_KEYS = ['type','tipo','control','component','componente','widget','kind'];
    const SUBTYPE_KEYS = ['subtype','subtipo'];
    const CONTAINER_KEYS = ['type','layout','tipo'];

    const keyLower = typeof key === 'string' ? key.toLowerCase() : '';
    if (['type','layout','tipo'].includes(keyLower) && typeof nodeVal === 'string' && nodeVal) return nodeVal;

    if (nodeVal && typeof nodeVal === 'object' && !Array.isArray(nodeVal)){
      const fieldType = getFirstStringProp(nodeVal, FIELD_KEYS);
      if (fieldType){
        if (String(fieldType).toLowerCase() === 'input'){
          const sub = getFirstStringProp(nodeVal, SUBTYPE_KEYS);
          if (sub) return sub;
        }
        return fieldType;
      }
      const contType = getFirstStringProp(nodeVal, CONTAINER_KEYS);
      if (contType) return contType;
    }
    return null;
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
        // NUEVO: auto width al abrir
        scheduleAutoWidth();
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

    const openPaths = (!resetState) ? captureOpenPaths() : [];

    const preferred = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = preferred.filter(k => Object.prototype.hasOwnProperty.call(data, k))
      .concat(Object.keys(data).filter(k => !preferred.includes(k)));

    body.innerHTML = keys.length
      ? keys.map(k => renderNode(k, data[k], [k], /*isRoot*/true)).join('')
      : `<div class="list-group-item text-muted py-2">JSON vacío</div>`;

    if (resetState){
      $all('#jsonTreeBody .json-children').forEach(c=> c.classList.remove('show'));
    } else {
      restoreOpenPaths(openPaths);
    }
    updatePanelTitle();

    bindCrudActions();
    initTreeDnD();
    updateSortablesDisabled();

    // NUEVO: ajustar ancho automáticamente tras render
    requestAnimationFrame(scheduleAutoWidth);
  }

  function hasChildrenValue(val){
    const t = typeOf(val);
    if (t==='object') return Object.keys(val||{}).length>0;
    if (t==='array') return (val||[]).length>0;
    return false;
  }

  // NUEVO: resolver etiqueta visible del nodo (field/fieldset)
  function resolveFieldLabel(nodeVal, path, key){
    if (!nodeVal || typeof nodeVal !== 'object' || Array.isArray(nodeVal)) return null;

    // posibles nombres de etiqueta
    const LABEL_KEYS = [
      'etiqueta','label','titulo','título','legend','caption',
      'nombre_mostrar','nombre','name','texto','text','descripcion','description'
    ];

    // etiqueta directa en el objeto
    let v = getFirstStringProp(nodeVal, LABEL_KEYS);
    if (v) return v;

    // etiqueta dentro de props/config/opciones
    const nestedKeys = ['props','config','opciones','options','ui'];
    for (const nk of nestedKeys){
      const sub = getPropIgnoreCase(nodeVal, nk);
      if (sub && typeof sub === 'object'){
        v = getFirstStringProp(sub, LABEL_KEYS);
        if (v) return v;
      }
    }
    return null;
  }

  function renderNode(key, val, path, isRoot){
    const t = typeOf(val);
    const meta = (t==='object') ? 'object' : (t==='array') ? `array(${(val||[]).length})` : renderValue(val);
    const canToggle = hasChildrenValue(val);

    // Icono por tipo (fields, fieldsets y propiedades type/layout)
    let iconInfo = getTypeIcon(val, path, key);
    if (!iconInfo && (key === 'type' || key === 'layout' || key === 'tipo') && typeof val === 'string'){
      iconInfo = getTypeIconFromKey(val);
    }
    const iconHtml = iconInfo
      ? `<i class="${esc(iconInfo.iconClass)} text-secondary" title="${esc(iconInfo.title)}" aria-hidden="true" style="min-width:1rem;"></i>`
      : '';

    // NUEVO: Etiqueta del elemento (antes del nombre/índice)
    const displayLabel = resolveFieldLabel(val, path, key);
    const labelHtml = displayLabel
      ? `<span class="json-node-label text-primary">${esc(displayLabel)}</span>`
      : '';

    let html = `<div class="json-tree-item" data-path='${esc(JSON.stringify(path))}'>`;
    html += `<div class="json-row list-group-item border-0 border-bottom">`;
    html += canToggle
      ? `<button class="json-toggle" aria-label="expandir"><i class="fas fa-chevron-right"></i></button>`
      : `<span style="display:inline-block;width:1.25rem;"></span>`;
    // Icono + Etiqueta antes del nombre (incluye índices [0], [1], ...)
    html += iconHtml;
    html += labelHtml ? labelHtml + ' ' : '';
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
        // NUEVO: ajustar ancho al expandir/colapsar
        scheduleAutoWidth();
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
      // NUEVO: re-ajustar ancho
      scheduleAutoWidth();
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
    // NUEVO: re-ajustar ancho tras filtrar
    scheduleAutoWidth();
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
      // Hijos por padre (objetos/arrays)
      $all('#jsonTreeBody .json-children').forEach((cont, idx)=>{
        if (cont.__jtSortable) return;
        const parentItem = cont.closest('.json-tree-item');
        const parentPathAttr = parentItem?.getAttribute('data-path') || '[]';
        const groupName = 'jt-' + parentPathAttr + '-' + idx;

        cont.__jtSortable = new Sortable(cont, {
          group: { name: groupName, put: false, pull: false }, // solo reordenar entre hermanos
          animation: 150,
          draggable: '.json-tree-item', // FIX: quitar :scope para compatibilidad
          handle: '.json-row, .json-node-key, .json-toggle',
          ghostClass: 'json-drag-ghost',
          onEnd: async (evt)=>{
            try{
              if (!evt || evt.from !== evt.to) return; // impedir mover entre padres
              const parentItem2 = evt.to.closest('.json-tree-item');

              // Reordenar en nivel raíz (sin parentItem)
              if (!parentItem2){
                await reorderRootByDom(evt.to);
                buildTree();
                return;
              }

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

      // DnD en nivel raíz (#jsonTreeBody)
      initRootDnDSortable();
      return;
    }

    // Fallback nativo (HTML5 DnD) si no hay SortableJS
    initNativeDnD();
  }

  // DnD Sortable en nivel raíz
  function initRootDnDSortable(){
    const root = document.getElementById('jsonTreeBody');
    if (!root || root.__jtSortableRoot) return;
    root.__jtSortableRoot = new Sortable(root, {
      group: { name: 'jt-root', put: false, pull: false },
      animation: 150,
      draggable: '.json-tree-item',
      handle: '.json-row, .json-node-key, .json-toggle',
      ghostClass: 'json-drag-ghost',
      onEnd: async (evt)=>{
        try{
          if (!evt || evt.from !== evt.to) return;
          await reorderRootByDom(evt.to);
          buildTree();
        }catch(err){
          console.error(err);
          alert('Error al reordenar raíz: ' + (err.message||err));
        }
      }
    });
  }

  // Reconstruye el objeto raíz según el orden DOM (solo vista; no se postea)
  async function reorderRootByDom(containerEl){
    const data = window.formularioJsonOriginal || {};
    const order = Array.from(containerEl.children)
      .map(el => {
        const p = JSON.parse(el.getAttribute('data-path')||'[]');
        return p[0];
      })
      .filter(k => k != null);
    const newRoot = {};
    order.forEach(k => { if (k in data) newRoot[k] = data[k]; });
    // Si quedan claves no renderizadas, las conservamos al final
    Object.keys(data).forEach(k => { if (!(k in newRoot)) newRoot[k] = data[k]; });
    window.formularioJsonOriginal = newRoot;
  }

  // NUEVO: DnD nativo (sin SortableJS)
  function initNativeDnD(){
    const root = $('#jsonTreeBody');
    if (!root) return;

    // Marca items arrastrables (hijos y raíz)
    setNativeDraggables(true);

    if (root.__nativeDnDBound) return;
    root.__nativeDnDBound = true;

    let dragItem = null;
    let dragContainer = null;

    root.addEventListener('dragstart', (e)=>{
      const row = e.target.closest('.json-tree-item > .json-row');
      if (!row) return;
      if (isDnDDisabled()) { e.preventDefault(); return; }
      dragItem = row.parentElement;          // .json-tree-item
      dragContainer = dragItem.parentElement; // .json-children o #jsonTreeBody
      // permitir también root
      if (!dragContainer || !(dragContainer.classList.contains('json-children') || dragContainer.id === 'jsonTreeBody')){
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
      if (overContainer !== dragContainer) return; // solo mismo padre (incluye raíz)
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    root.addEventListener('drop', async (e)=>{
      if (!dragItem) return;
      const overItem = e.target.closest('.json-tree-item');
      const overContainer = overItem?.parentElement;
      if (overContainer !== dragContainer) { cleanupDrag(); return; }
      e.preventDefault();

      const rect = overItem.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      if (before) overContainer.insertBefore(dragItem, overItem);
      else overContainer.insertBefore(dragItem, overItem.nextSibling);

      try{
        // Si es raíz
        if (overContainer.id === 'jsonTreeBody'){
          await reorderRootByDom(overContainer);
          buildTree();
          return;
        }

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
    // Hijos
    $all('#jsonTreeBody .json-children > .json-tree-item > .json-row').forEach(row=>{
      row.setAttribute('draggable', enabled ? 'true' : 'false');
    });
    // Raíz
    $all('#jsonTreeBody > .json-tree-item > .json-row').forEach(row=>{
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
    const root = document.getElementById('jsonTreeBody');
    if (root && root.__jtSortableRoot) root.__jtSortableRoot.option('disabled', hasFilter);
    // Nativo
    setNativeDraggables(!hasFilter);
  }

  // Observa #fd-root y emite 'design-mode-changed'
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
      // Estado inicial
      emit();
    });
  }

  // Mostrar/ocultar el botón/panel según modo diseño
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
    // Precargar tipos cuando entra a modo diseño
    try {
      Promise.all([ensureFormTypesLoaded()]);
    } catch(e){ console.error(e); }
  }

  // Helper: debounce
  function debounce(fn, wait=50){
    let t; return function(...args){ clearTimeout(t); t = setTimeout(()=> fn.apply(this, args), wait); };
  }

  // Calcular el ancho óptimo del panel considerando el string más largo del árbol
  function estimateMaxContentWidth(){
    const panel = $('#json-tree-panel');
    if (!panel) return 460;

    // 1) Medida real de filas visibles
    let maxRowScroll = 0;
    $all('#jsonTreeBody .json-row').forEach(r=> { maxRowScroll = Math.max(maxRowScroll, r.scrollWidth); });

    // 2) Estimación por texto para nodos colapsados
    const data = window.formularioJsonOriginal || {};
    const sample = $('#jsonTreeBody .json-row') || document.body;
    const cs = getComputedStyle(sample);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // Construir font CSS para measureText
    const font = `${cs.fontWeight || 'normal'} ${cs.fontSize || '14px'} ${cs.fontFamily || 'sans-serif'}`;
    ctx.font = font;

    let maxTextWidth = 0;
    function traverse(val, key, path){
      // etiqueta visible si existe
      let label = '';
      if (val && typeof val === 'object' && !Array.isArray(val)){
        const L = resolveFieldLabel ? resolveFieldLabel(val, path, key) : null;
        if (L) label = String(L);
      }
      const keyStr = key==null ? '' : String(key);
      const composed = (label ? label + ' ' : '') + keyStr;
      const w = ctx.measureText(composed).width;
      if (w > maxTextWidth) maxTextWidth = w;

      if (Array.isArray(val)){
        val.forEach((it, i)=> traverse(it, `[${i}]`, (path||[]).concat(i)));
      } else if (val && typeof val === 'object'){
        Object.keys(val).forEach(k=> traverse(val[k], k, (path||[]).concat(k)));
      }
    }
    Object.keys(data).forEach(k=> traverse(data[k], k, [k]));

    // Padding para chevrón, icono, acciones y márgenes
    const extras = 180;
    return Math.max(maxRowScroll, Math.ceil(maxTextWidth) + extras);
  }

  const scheduleAutoWidth = debounce(function(){
    const panel = $('#json-tree-panel');
    if (!panel || getComputedStyle(panel).display === 'none') return;
    const minW = 460;
    const maxW = Math.max(360, Math.min(window.innerWidth - 24, 1400));
    const wanted = estimateMaxContentWidth();
    const width = Math.max(minW, Math.min(maxW, wanted));
    panel.style.width = width + 'px';
  }, 50);

  // Boot
  window.addEventListener('load', ()=>{
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
    // NUEVO: re-ajustar al redimensionar ventana
    window.addEventListener('resize', scheduleAutoWidth);
  });
})();
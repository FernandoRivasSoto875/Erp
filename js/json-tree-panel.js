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
    $('#jsonTreeFilter').addEventListener('input', filterTree);
    $('#jsonTreeFilterClear').addEventListener('click', ()=>{ const i=$('#jsonTreeFilter'); if(i){ i.value=''; buildTree(true); }});
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

    const preferred = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = preferred.filter(k => Object.prototype.hasOwnProperty.call(data, k))
      .concat(Object.keys(data).filter(k => !preferred.includes(k)));

    body.innerHTML = keys.length
      ? keys.map(k => renderNode(k, data[k], [k], /*isRoot*/true)).join('')
      : `<div class="list-group-item text-muted py-2">JSON vacío</div>`;

    if (resetState){
      // Colapsar todo por defecto al reconstruir
      $all('#jsonTreeBody .json-children').forEach(c=> c.classList.remove('show'));
      // Opcional: podrías expandir el primer nivel si lo prefieres
      // $all('#jsonTreeBody > .json-tree-item > .json-children').forEach(c=> c.classList.add('show'));
    }
    updatePanelTitle();
    // Enlazar acciones CRUD tras render
    bindCrudActions();
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
    // Acciones (si las usas; no se enlazan aquí)
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
      const row = e.target.closest('.json-row');
      if (toggleBtn || keyEl){
        const item = (toggleBtn || keyEl)?.closest('.json-tree-item');
        if (!item) return;
        const children = item.querySelector(':scope > .json-children');
        if (!children) return;
        const isOpen = children.classList.toggle('show');
        // Actualiza el ícono
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
      // Restaurar: mostrar todo y colapsar
      $all('.json-tree-item', rootCont).forEach(it=> it.style.display = '');
      $all('.json-children', rootCont).forEach(c=> c.classList.remove('show'));
      // Reset de iconos
      $all('.json-toggle i', rootCont).forEach(i=> { i.classList.add('fa-chevron-right'); i.classList.remove('fa-chevron-down'); });
      updatePanelTitle();
      return;
    }

    // Recorrer recursivo bottom-up
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

        // Si hay match en hijos o en este nodo, abrir hijos (si existen)
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

    // Fuera de diseño: ocultar si existiera y no crear nada
    const panel = $('#json-tree-panel');
    const btn0 = $('#fd-tree-toggle-btn');
    if (!on){
      if (panel) panel.style.display = 'none';
      if (btn0) btn0.style.display = 'none';
      return;
    }

    // En diseño: crear on-demand
    ensureToggleButton();
    const btn = $('#fd-tree-toggle-btn'); // FIX: obtener referencia correcta
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
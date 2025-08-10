(function(){
  // Evita doble carga del script
  if (window.__JSON_TREE_PANEL_LOADED__) return;
  window.__JSON_TREE_PANEL_LOADED__ = true;

  const CONFIG = { showOnlyInDesignMode: true };
  let lastDesignOn = null;

  // Helpers
  const $ = (s, r)=> (r||document).querySelector(s);
  const $all = (s, r)=> Array.from((r||document).querySelectorAll(s));
  const typeOf = v => Array.isArray(v) ? 'array' : (v===null ? 'null' : (typeof v==='object' ? 'object' : typeof v));
  const esc = s => String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
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
  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }
  function hasBootstrap(){
    try {
      if (window.bootstrap) return true;
      const v = getComputedStyle(document.documentElement).getPropertyValue('--bs-body-font-family');
      return !!(v && v.trim().length);
    } catch { return false; }
  }

  // CSS mínimo (posicionamiento; el look lo da Bootstrap)
  function injectStyles(){
    if ($('#json-tree-panel-styles')) return;
    const css = `
      .json-tree-panel{ position:fixed; top:60px; right:12px; width:460px; height:72vh; z-index:1055; resize:both; }
      .json-tree-panel .card-body.scroll{ overflow:auto; height:calc(100% - 94px); }
      #fd-tree-toggle-btn{ position:fixed; top:60px; right:486px; z-index:1055; }
    `;
    const st = document.createElement('style'); st.id='json-tree-panel-styles'; st.textContent = css;
    document.head.appendChild(st);
  }

  // Carga JSON si no viene embebido
  async function ensureJsonLoaded(){
    if (window.formularioJsonOriginal && typeof window.formularioJsonOriginal === 'object') return window.formularioJsonOriginal;
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    if (!archivo) { window.formularioJsonOriginal = {}; return window.formularioJsonOriginal; }
    const url = 'json/' + archivo;
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar '+url+' ('+r.status+')');
    const txt = await r.text();
    let data;
    try { data = JSON.parse(txt); }
    catch {
      const noComments = txt.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'');
      const noTrailing = noComments.replace(/,\s*([}\]])/g, '$1');
      data = JSON.parse(noTrailing);
    }
    window.formularioJsonOriginal = data || {};
    return window.formularioJsonOriginal;
  }

  // Panel y botón (Bootstrap)
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
    $('#jsonTreeRefresh').addEventListener('click', buildTree);
    $('#jsonTreeFilter').addEventListener('input', filterTree);
    $('#jsonTreeFilterClear').addEventListener('click', ()=>{ const i=$('#jsonTreeFilter'); if(i){ i.value=''; buildTree(); }});
    $('#jsonTreeInit').addEventListener('click', ensureBaseStructureInteractive);
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
    btn.textContent = 'Árbol';
    btn.addEventListener('click', ()=>{
      const p = ensurePanel();
      const hidden = getComputedStyle(p).display === 'none';
      p.style.display = hidden ? '' : 'none';
      if (hidden) buildTree();
    });
    btn.style.display = 'none';
    document.body.appendChild(btn);
  }

  // Render (usa list-group de Bootstrap para los items)
  function buildTree(){
    if (!shouldShow()) return;
    const body = $('#jsonTreeBody'); if (!body) return;
    const data = window.formularioJsonOriginal || {};

    const preferred = ['parametros','layout','fieldsets','elementos_fuera'];
    const keys = preferred.filter(k => Object.prototype.hasOwnProperty.call(data, k))
      .concat(Object.keys(data).filter(k => !preferred.includes(k)));

    body.innerHTML = keys.length
      ? keys.map(k => renderNode(k, data[k], [k], 0)).join('')
      : `<div class="list-group-item text-muted py-2">JSON vacío</div>`;

    updatePanelTitle();
  }
  function renderNode(key, val, path, level){
    const pad = Math.max(0, level * 12);
    const t = typeOf(val);
    const meta = (t==='object') ? 'object' : (t==='array') ? `array(${(val||[]).length})` : renderValue(val);

    let html = `<div class="json-tree-node list-group-item d-flex align-items-center gap-2 py-1 px-2 border-0 border-bottom"
                    data-path='${esc(JSON.stringify(path))}' style="margin-left:${pad}px;">
      <span class="json-node-key">${esc(String(key))}</span>
      <small class="text-secondary ms-auto">${esc(meta)}</small>
      <span class="json-node-actions ms-2">
        <button class="btn btn-link btn-sm text-secondary p-0 act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn btn-link btn-sm text-secondary p-0 act-dup" title="Duplicar"><i class="fas fa-clone"></i></button>
        <button class="btn btn-link btn-sm text-secondary p-0 act-rename" title="Renombrar"><i class="fas fa-i-cursor"></i></button>
        <button class="btn btn-link btn-sm text-danger p-0 act-del" title="Eliminar"><i class="fas fa-trash"></i></button>
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

  // Opcional: inicializar estructura mínima
  async function ensureBaseStructureInteractive(){
    const data = window.formularioJsonOriginal || {};
    const payload = {};
    if (!data.parametros || typeof data.parametros!=='object') payload.parametros = {};
    if (!data.layout || typeof data.layout!=='object') payload.layout = { header:{type:'header',rows:[]}, main:{type:'generic',rows:[{columns:[{width:12}]}]}, footer:{type:'footer',rows:[]} };
    if (!data.fieldsets || typeof data.fieldsets!=='object') payload.fieldsets = {};
    if (!Array.isArray(data.elementos_fuera)) payload.elementos_fuera = [];
    if (!Object.keys(payload).length) return alert('La estructura base ya existe.');
    try{
      await postGuardar(payload);
      window.formularioJsonOriginal = { ...data, ...payload };
      buildTree();
    } catch(e){ console.error(e); }
  }

  // Guardado por raíz (si lo usas)
  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    ['parametros','layout','fieldsets','elementos_fuera'].forEach(k=>{
      if (Object.prototype.hasOwnProperty.call(blocks, k)) form.append(k, JSON.stringify(blocks[k]));
    });
    return fetch('guardar_layout.php', { method:'POST', body: form }).then(r=>r.json());
  }

  // Eventos
  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);

    // No crear nada si no está en modo diseño
    if (!on){
      const panel = $('#json-tree-panel');
      const btn = $('#fd-tree-toggle-btn');
      if (panel) panel.style.display = 'none';
      if (btn) btn.style.display = 'none';
      return;
    }

    // Modo diseño ON: crear on-demand
    injectStyles();
    let panel = $('#json-tree-panel');
    let btn = $('#fd-tree-toggle-btn');
    if (!panel) panel = ensurePanel();
    if (!btn) ensureToggleButton();

    panel.style.display = panel.style.display || 'none'; // cerrado por defecto
    btn.style.display = 'inline-flex';

    // Si el panel ya está abierto, refrescar
    if (getComputedStyle(panel).display !== 'none') buildTree();
  }

  // Boot: solo registrar listeners y sincronizar
  window.addEventListener('load', ()=>{
    window.addEventListener('design-mode-changed', onDesignModeChanged);
    onDesignModeChanged({ detail:{ on: shouldShow() } });
  });

})();
(function(){
  // Evita doble carga del script
  if (window.__JSON_TREE_PANEL_LOADED__) return;
  window.__JSON_TREE_PANEL_LOADED__ = true;

  const CONFIG = { showOnlyInDesignMode: true };

  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.from((r||document).querySelectorAll(s)); }
  function typeOf(v){ if (Array.isArray(v)) return 'array'; return v===null ? 'null' : typeof v==='object' ? 'object' : typeof v; }
  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  // Mostrar solo en modo diseño
  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }

  // Crear panel y botón solo al entrar a modo diseño
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
    $('#jsonTreeRefresh').addEventListener('click', buildTree);
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
    btn.style.display = shouldShow() ? 'inline-flex' : 'none';
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
    bindTreeDragAndDrop(body);
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
      Object.keys(val||{}).forEach(k=>{
        html += renderNode(k, val[k], path.concat(k), level+1);
      });
    } else if (t === 'array') {
      (val||[]).forEach((item, idx)=>{
        html += renderNode(`[${idx}]`, item, path.concat(idx), level+1);
      });
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

  // CRUD y DnD (tu implementación existente)
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
  // ...existing code (editNodeByPath, duplicateAtPath, deleteAtPath, renameAtPath, DnD helpers)...

  // Solo crear/mostrar en modo diseño
  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    let panel = $('#json-tree-panel');
    let btn = $('#fd-tree-toggle-btn');

    if (on) {
      if (!panel) panel = ensurePanel();
      if (!btn) ensureToggleButton();
      panel.style.display = '';
      btn.style.display = 'inline-flex';
      // Usa el JSON ya embebido por PHP; si no existe, no hace fetch
      if (!window.formularioJsonOriginal) {
        // fallback opcional si no fue embebido
        const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
        if (archivo) fetch('json/' + archivo, { cache:'no-store' })
          .then(r=>r.ok?r.text():Promise.reject(r.status))
          .then(txt=> JSON.parse(txt))
          .then(j=> { window.formularioJsonOriginal = j; buildTree(); })
          .catch(console.error);
      } else {
        buildTree();
      }
    } else {
      if (panel) panel.style.display = 'none';
      if (btn) btn.style.display = 'none';
    }
  }

  // Observa cambios de modo diseño y sincroniza estado inicial sin crear el panel fuera de diseño
  function watchDesignMode(){
    function bind(root){
      const emit = ()=> window.dispatchEvent(new CustomEvent('design-mode-changed', { detail:{ on: root.classList.contains('design-mode') } }));
      new MutationObserver(emit).observe(root, { attributes:true, attributeFilter:['class'] });
      emit(); // estado inicial
    }
    const rootNow = document.getElementById('fd-root');
    if (rootNow) return bind(rootNow);
    // Espera a que aparezca #fd-root si se renderiza tarde
    const mo = new MutationObserver(()=>{
      const r = document.getElementById('fd-root');
      if (r){ mo.disconnect(); bind(r); }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  // Boot mínimo: no crea panel ni carga JSON si no estás en diseño
  window.addEventListener('load', ()=>{
    // Opcional: estilos (si tienes injectStyles definido, descomenta)
    // injectStyles();
    watchDesignMode();
    window.addEventListener('design-mode-changed', onDesignModeChanged);
  });

})();
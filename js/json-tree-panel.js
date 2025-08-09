(function(){
  const CONFIG = {
    side: 'left', // 'left' | 'right'
    width: 340,
    showOnlyInDesignMode: true
  };

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s==null?'':s); }

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
          <h6 class="json-tree-title"><i class="fas fa-sitemap"></i> Estructura JSON</h6>
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

  function nodeActionsHtml(type){
    const editBtn = `<button class="btn-icon act-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>`;
    return `<span class="json-node-actions" data-node-type="${type}">${editBtn}</span>`;
  }

  function buildTree(){
    const data = window.formularioJsonOriginal || {};
    const body = $('#jsonTreeBody');
    if (!body) return;
    body.innerHTML = '';

    // NUEVO: bloque completo de parametros (recursivo)
    const parametrosRoot = (data.parametros || {});
    body.appendChild(renderObjectTree('parametros', parametrosRoot, ['parametros']));

    // Cabecera: Form/Parametros resumido (mantengo)
    const params = data.parametros || {};
    body.appendChild(createGroup('Formulario', [
      createLeaf('titulo', params.titulo ?? (data.titulo ?? '')),
      createLeaf('descripcion', data.descripcion ?? ''),
    ], { type: 'form' }));

    // Layout (igual que antes)
    const layout = data.layout || {};
    const layoutDetails = document.createElement('details');
    layoutDetails.open = true;
    layoutDetails.innerHTML = `<summary><span class="json-tree-node"><span class="json-node-key">layout</span></span></summary>`;
    const layoutWrap = document.createElement('div');

    // header
    if (layout.header){
      layoutWrap.appendChild(createRowsGroup('header', layout.header));
    }
    // main
    if (layout.main){
      const main = layout.main;
      if (main.type === 'tabs'){
        const d = document.createElement('details'); d.open = true;
        d.innerHTML = `<summary><span class="json-tree-node"><span class="json-node-key">main</span><span class="json-node-meta">tabs</span></span></summary>`;
        const tabsWrap = document.createElement('div');
        (main.tabs||[]).forEach((t,i)=>{
          const tabD = document.createElement('details'); tabD.open = false;
          const title = esc(t.title || `Pestaña ${i+1}`);
          tabD.innerHTML = `<summary><span class="json-tree-node"><i class="far fa-folder"></i><span class="json-node-key">tab[${i}]</span><span class="json-node-meta">${title}</span>${nodeActionsHtml('tab')}</span></summary>`;
          // rows
          (t.rows||[]).forEach((row, rIdx)=>{
            const rowD = document.createElement('details'); rowD.open = false;
            rowD.innerHTML = `<summary><span class="json-tree-node"><i class="far fa-list-alt"></i><span class="json-node-key">row[${rIdx}]</span></span></summary>`;
            const colsWrap = document.createElement('div');
            (row.columns||[]).forEach((col, cIdx)=>{
              const fs = col.fieldset ? `fieldset: ${col.fieldset}` : 'col';
              const colEl = document.createElement('div');
              colEl.innerHTML = `<div class="json-tree-node" data-fieldset="${esc(col.fieldset||'')}">
                <i class="far fa-square"></i><span class="json-node-key">col[${cIdx}]</span>
                <span class="json-node-meta">width: ${esc(col.width ?? 12)}${col.fieldset? ', '+fs:''}</span>
              </div>`;
              // click para resaltar fieldset
              const node = colEl.firstElementChild;
              if (col.fieldset){
                node.style.cursor='pointer';
                node.addEventListener('click', ()=> highlightFieldset(col.fieldset));
              }
              colsWrap.appendChild(colEl);
            });
            rowD.appendChild(colsWrap);
            tabD.appendChild(rowD);
          });
          tabsWrap.appendChild(tabD);
        });
        d.appendChild(tabsWrap);
        layoutWrap.appendChild(d);
      } else {
        layoutWrap.appendChild(createRowsGroup('main', main));
      }
    }
    // footer
    if (layout.footer){
      layoutWrap.appendChild(createRowsGroup('footer', layout.footer));
    }

    layoutDetails.appendChild(layoutWrap);
    body.appendChild(layoutDetails);

    // Fieldsets (igual que antes)
    const fsMap = data.fieldsets || {};
    const fsD = document.createElement('details'); fsD.open = true;
    fsD.innerHTML = `<summary><span class="json-tree-node"><span class="json-node-key">fieldsets</span></span></summary>`;
    const fsWrap = document.createElement('div');
    Object.keys(fsMap).forEach((name)=>{
      const def = fsMap[name] || {};
      const titulo = esc(def.titulo || name);
      const d = document.createElement('details'); d.open = false;
      d.innerHTML = `<summary><span class="json-tree-node"><i class="far fa-folder"></i><span class="json-node-key">${esc(name)}</span><span class="json-node-meta">${titulo}</span>${nodeActionsHtml('fieldset')}</span></summary>`;
      const campos = Array.isArray(def.campos) ? def.campos : [];
      const ul = document.createElement('ul'); ul.style.paddingLeft='18px';
      campos.forEach((c, idx)=>{
        const li = document.createElement('li');
        const etiqueta = esc(c.etiqueta || c.nombre || ('campo_'+idx));
        li.innerHTML = `<div class="json-tree-node" data-fs="${esc(name)}" data-field="${esc(c.nombre||'')}">
          <i class="far fa-file"></i>
          <span class="json-node-key">${esc(c.nombre || ('indice_'+idx))}</span>
          <span class="json-node-meta">${etiqueta} (${esc(c.tipo || 'text')})</span>
          ${nodeActionsHtml('field')}
        </div>`;
        // click para resaltar campo dentro del fieldset
        li.firstElementChild.style.cursor='pointer';
        li.firstElementChild.addEventListener('click', (e)=>{
          // evitar si clic en botón
          if (e.target.closest('.json-node-actions')) return;
          highlightFieldset(name);
        });
        ul.appendChild(li);
      });
      d.appendChild(ul);
      fsWrap.appendChild(d);
    });
    fsD.appendChild(fsWrap);
    body.appendChild(fsD);

    // NUEVO: otros nodos del JSON no cubiertos (elementos_fuera, etc.)
    const handled = new Set(['parametros','layout','fieldsets']);
    Object.keys(data).forEach(k=>{
      if (!handled.has(k)) {
        body.appendChild(renderAnyNode(k, data[k], [k]));
      }
    });

    bindEditActions(body);
  }

  function createGroup(title, leaves, meta){
    const d = document.createElement('details'); d.open = true;
    d.innerHTML = `<summary><span class="json-tree-node"><span class="json-node-key">${esc(title)}</span>${meta&&meta.type==='form'?nodeActionsHtml('form'):''}</span></summary>`;
    const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
    leaves.forEach(n => wrap.appendChild(n));
    d.appendChild(wrap);
    return d;
  }

  function createLeaf(key, value){
    const div = document.createElement('div');
    div.className = 'json-tree-node';
    div.innerHTML = `<i class="far fa-dot-circle"></i><span class="json-node-key">${esc(key)}</span><span class="json-node-meta">${esc(value)}</span>`;
    return div;
  }

  function createRowsGroup(name, block){
    const d = document.createElement('details'); d.open = true;
    d.innerHTML = `<summary><span class="json-tree-node"><span class="json-node-key">${esc(name)}</span><span class="json-node-meta">${esc(block.type||'generic')}</span></span></summary>`;
    const wrap = document.createElement('div');
    (block.rows||[]).forEach((row, rIdx)=>{
      const rd = document.createElement('details'); rd.open = false;
      rd.innerHTML = `<summary><span class="json-tree-node"><i class="far fa-list-alt"></i><span class="json-node-key">row[${rIdx}]</span></span></summary>`;
      const colsWrap = document.createElement('div');
      (row.columns||[]).forEach((col, cIdx)=>{
        const fs = col.fieldset ? `fieldset: ${col.fieldset}` : 'col';
        const colEl = document.createElement('div');
        colEl.innerHTML = `<div class="json-tree-node" data-fieldset="${esc(col.fieldset||'')}">
          <i class="far fa-square"></i><span class="json-node-key">col[${cIdx}]</span>
          <span class="json-node-meta">width: ${esc(col.width ?? 12)}${col.fieldset? ', '+fs:''}</span>
        </div>`;
        const node = colEl.firstElementChild;
        if (col.fieldset){
          node.style.cursor='pointer';
          node.addEventListener('click', ()=> highlightFieldset(col.fieldset));
        }
        colsWrap.appendChild(colEl);
      });
      rd.appendChild(colsWrap);
      wrap.appendChild(rd);
    });
    d.appendChild(wrap);
    return d;
  }

  function highlightFieldset(name){
    const el = document.querySelector(`[data-fieldset-name="${CSS.escape(name)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.add('json-highlight');
    setTimeout(()=> el.classList.remove('json-highlight'), 900);
  }

  function toggleAll(){
    const body = $('#jsonTreeBody');
    const details = $all('details', body);
    const hasAnyClosed = details.some(d=>!d.open);
    details.forEach(d => d.open = hasAnyClosed);
  }

  function filterTree(e){
    const q = (e.target.value || '').toLowerCase();
    const body = $('#jsonTreeBody');
    $all('.json-tree-node', body).forEach(n=>{
      const txt = n.textContent.toLowerCase();
      n.style.display = txt.includes(q) ? '' : 'none';
    });
  }

  // NUEVO: utilidades de render recursivo y edición de parametros
  function renderObjectTree(title, obj, path){
    const d = document.createElement('details'); d.open = true;
    d.innerHTML = `<summary><span class="json-tree-node">
      <span class="json-node-key">${esc(title)}</span>
      <span class="json-node-meta">object</span>
    </span></summary>`;
    const wrap = document.createElement('div');
    Object.keys(obj || {}).forEach(key=>{
      wrap.appendChild(renderAnyNode(key, obj[key], path.concat(key)));
    });
    d.appendChild(wrap);
    return d;
  }

  function renderAnyNode(key, val, path){
    const t = typeOf(val);
    if (t === 'object') {
      const det = document.createElement('details'); det.open = false;
      det.innerHTML = `<summary><span class="json-tree-node">
        <i class="far fa-folder"></i>
        <span class="json-node-key">${esc(key)}</span>
        <span class="json-node-meta">object</span>
      </span></summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      Object.keys(val || {}).forEach(k=>{
        wrap.appendChild(renderAnyNode(k, val[k], path.concat(k)));
      });
      det.appendChild(wrap);
      return det;
    }
    if (t === 'array') {
      const det = document.createElement('details'); det.open = false;
      det.innerHTML = `<summary><span class="json-tree-node">
        <i class="far fa-folder-open"></i>
        <span class="json-node-key">${esc(key)}</span>
        <span class="json-node-meta">array(${val.length})</span>
      </span></summary>`;
      const wrap = document.createElement('div'); wrap.style.paddingLeft='12px';
      val.forEach((item, idx)=>{
        wrap.appendChild(renderAnyNode(`[${idx}]`, item, path.concat(idx)));
      });
      det.appendChild(wrap);
      return det;
    }
    // leaf
    const div = document.createElement('div');
    div.className = 'json-tree-node';
    div.dataset.path = JSON.stringify(path);
    div.innerHTML = `
      <i class="far fa-dot-circle"></i>
      <span class="json-node-key">${esc(key)}</span>
      <span class="json-node-meta">${renderValueInline(val)}</span>
      ${nodeActionsHtml('param')}
    `;
    return div;
  }

  function typeOf(v){
    if (Array.isArray(v)) return 'array';
    if (v === null) return 'null';
    return typeof v === 'object' ? 'object' : typeof v;
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

  function getAtPath(obj, path){
    return path.reduce((acc, k)=> (acc==null?acc:acc[k]), obj);
  }
  function setAtPath(obj, path, value){
    let curr = obj;
    for (let i=0; i<path.length-1; i++){
      const k = path[i];
      if (curr[k] == null || typeof curr[k] !== 'object') curr[k] = (typeof path[i+1] === 'number' ? [] : {});
      curr = curr[k];
    }
    curr[path[path.length-1]] = value;
  }

  // Guardado de parametros completos
  function postGuardarParametros(nuevosParametros){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('parametros', JSON.stringify(nuevosParametros));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function bindEditActions(root){
    root.addEventListener('click', function(e){
      const btn = e.target.closest('.act-edit');
      if (!btn) return;
      const actions = btn.closest('.json-node-actions');
      const type = actions?.getAttribute('data-node-type');
      const node = actions.closest('.json-tree-node');
      if (!type || !node) return;
      if (type === 'form') return editForm();
      if (type === 'fieldset'){
        const name = node.querySelector('.json-node-key')?.textContent?.trim();
        if (name) editFieldset(name);
      }
      if (type === 'field'){
        const fs = node.getAttribute('data-fs');
        const field = node.getAttribute('data-field');
        if (fs && field) editField(fs, field);
      }
      if (type === 'tab'){
        const titleMeta = node.querySelector('.json-node-meta')?.textContent?.trim();
        editTab(titleMeta);
      }
      // NUEVO: edición de hojas de parametros (y otros leaves)
      if (type === 'param'){
        const pathStr = node.dataset.path || '';
        if (!pathStr) return;
        try {
          const path = JSON.parse(pathStr);
          editParametroLeaf(path, node);
        } catch(_){}
      }
    });
  }

  async function editForm(){
    const data = window.formularioJsonOriginal || {};
    const params = data.parametros || {};
    const { value: titulo } = await Swal.fire({
      title: 'Título del formulario', input:'text',
      inputValue: params.titulo ?? data.titulo ?? '', showCancelButton:true, confirmButtonText:'Guardar'
    });
    if (titulo == null) return;
    postEditar({
      tipo: 'form',
      titulo: String(titulo)
    }).then(()=>{ (params.titulo=data.parametros.titulo=titulo), buildTree(); $('#form-title') && ($('#form-title').textContent=titulo); })
      .catch(showAjaxError);
  }

  async function editFieldset(name){
    const data = window.formularioJsonOriginal || {};
    const fs = (data.fieldsets||{})[name] || {};
    const { value: formVals } = await Swal.fire({
      title: `Editar fieldset "${name}"`,
      html: `
        <input id="fs_title" class="swal2-input" placeholder="Título" value="${esc(fs.titulo||name)}">
        <input id="fs_desc" class="swal2-input" placeholder="Descripción" value="${esc(fs.descripcion||'')}">
      `,
      focusConfirm:false, showCancelButton:true,
      preConfirm: () => ({ titulo: $('#fs_title')?.value || '', descripcion: $('#fs_desc')?.value || '' })
    });
    if (!formVals) return;
    postEditar({
      tipo:'fieldset',
      fieldset: name,
      titulo: formVals.titulo,
      descripcion: formVals.descripcion
    }).then(()=>{ if (!data.fieldsets[name]) data.fieldsets[name]={}; data.fieldsets[name].titulo=formVals.titulo; data.fieldsets[name].descripcion=formVals.descripcion; buildTree(); syncLegend(name, formVals.titulo); })
      .catch(showAjaxError);
  }

  function syncLegend(fsName, nuevoTitulo){
    const el = document.querySelector(`[data-fieldset-name="${CSS.escape(fsName)}"] legend`);
    if (el) el.textContent = nuevoTitulo || fsName;
  }

  async function editField(fsName, fieldName){
    const data = window.formularioJsonOriginal || {};
    const fs = (data.fieldsets||{})[fsName] || {};
    const campo = (fs.campos||[]).find(c => c && c.nombre === fieldName) || { nombre: fieldName };
    const { value: vals } = await Swal.fire({
      title: `Editar campo "${fieldName}"`,
      html: `
        <input id="f_label" class="swal2-input" placeholder="Etiqueta" value="${esc(campo.etiqueta||'')}">
        <input id="f_placeholder" class="swal2-input" placeholder="Placeholder" value="${esc(campo.placeholder||'')}">
        <input id="f_tipo" class="swal2-input" placeholder="Tipo" value="${esc(campo.tipo||'text')}">
      `,
      focusConfirm:false, showCancelButton:true,
      preConfirm: () => ({ etiqueta: $('#f_label')?.value||'', placeholder: $('#f_placeholder')?.value||'', tipo: $('#f_tipo')?.value||'text' })
    });
    if (!vals) return;
    postEditar({
      tipo: 'field',
      fieldset: fsName,
      nombre: fieldName,
      etiqueta: vals.etiqueta,
      placeholder: vals.placeholder,
      tipo: vals.tipo
    }).then(()=>{
      const c = (fs.campos||[]).find(x=>x && x.nombre===fieldName);
      if (c){ c.etiqueta=vals.etiqueta; c.placeholder=vals.placeholder; c.tipo=vals.tipo; }
      buildTree();
    }).catch(showAjaxError);
  }

  async function editTab(currentTitle){
    const { value: newTitle } = await Swal.fire({
      title:'Renombrar pestaña', input:'text', inputValue: currentTitle||'', showCancelButton:true, confirmButtonText:'Guardar'
    });
    if (!newTitle || newTitle===currentTitle) return;
    try {
      const data = window.formularioJsonOriginal || {};
      const tabs = (((data||{}).layout||{}).main||{}).tabs || [];
      const t = tabs.find(tt => (tt.title||'') === (currentTitle||''));
      if (!t) throw new Error('Pestaña no encontrada');
      t.title = newTitle;
      // Guarda usando guardar_layout (solo layout)
      await postGuardarLayout({ layout: { main: { type:'tabs', tabs } } });
      buildTree();
      // También actualizar DOM de nav si existe
      const a = $(`#fd-root [data-block-type="tabs"] .nav .nav-link:contains("${CSS.escape(currentTitle)}")`);
      if (a) a.textContent = newTitle;
    } catch(err) {
      showAjaxError(err);
    }
  }

  function showAjaxError(err){
    const msg = (err && err.message) || 'Error';
    if (window.Swal) Swal.fire('Error', msg, 'error'); else alert(msg);
  }

  function postEditar(payload){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    Object.keys(payload).forEach(k=> form.append(k, payload[k]));
    return fetch('editar_propiedades.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function postGuardarLayout(partial){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('layout', JSON.stringify(partial));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function shouldShow(){
    if (!CONFIG.showOnlyInDesignMode) return true;
    const root = document.getElementById('fd-root');
    return !!(root && root.classList.contains('design-mode'));
  }

  function init(){
    injectStyles();
    const data = window.formularioJsonOriginal;
    if (!data) return;
    const panel = ensurePanel();
    panel.style.display = shouldShow() ? '' : 'none';
    buildTree();

    // NUEVO: reaccionar al cambio de modo
    window.addEventListener('design-mode-changed', (e)=>{
      panel.style.display = e.detail && e.detail.on ? '' : 'none';
      if (e.detail && e.detail.on) buildTree();
    });

    const toggle = document.getElementById('designModeToggle');
    if (toggle){
      toggle.addEventListener('change', ()=> { panel.style.display = shouldShow() ? '' : 'none'; });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
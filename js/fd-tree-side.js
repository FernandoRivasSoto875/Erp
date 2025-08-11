(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const $$= (s,r=document)=>Array.from(r.querySelectorAll(s));
  const root = $('#fd-root');
  const panel = $('#fd-tree-side');
  const treeDiv = $('#fd-tree');
  if (!root || !panel || !treeDiv) return;

  function isFieldWrapper(el){
    if (!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
    if (el.matches('fieldset,.card,.panel,.fd-fieldset')) return false;
    if (el.matches('.row,[class*="col-"],.col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  function groupTitle(g){
    return (g.querySelector(':scope > legend, :scope > .card-header')?.textContent||g.getAttribute('data-fieldset-name')||g.id||'Grupo').trim();
  }
  function rebuild(){
    if (panel.classList.contains('hidden')) return;
    treeDiv.innerHTML='';
    const groups = $$('#formulariodinamico fieldset, #formulariodinamico .card, #formulariodinamico .panel, #formulariodinamico .fd-fieldset');
    const ul = document.createElement('ul');
    groups.forEach(g=>{
      const gid = g.getAttribute('data-group-id') || g.id || ('g_'+Math.random().toString(36).slice(2,8));
      if (!g.getAttribute('data-group-id')) g.setAttribute('data-group-id', gid);
      const li = document.createElement('li');
      li.dataset.node='group'; li.dataset.id=gid;
      const title = document.createElement('div');
      title.className='g-title';
      title.innerHTML = `<span class="handle">⋮⋮</span><span class="txt">${groupTitle(g)}</span><span class="actions ms-auto">
          <button data-act="add-field" title="Añadir campo">＋</button>
          <button data-act="rename" title="Renombrar">✎</button>
          <button data-act="delete" title="Borrar">🗑</button>
      </span>`;
      li.appendChild(title);

      const body = g.querySelector(':scope > .card-body, :scope > .fd-fields-container') || g;
      const list = document.createElement('ul');
      Array.from(body.children).filter(isFieldWrapper).forEach(w=>{
        const fid = w.getAttribute('data-field-id') ||
          w.querySelector('[name]')?.name ||
          w.id || ('f_'+Math.random().toString(36).slice(2,8));
        if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);
        const fldLi = document.createElement('li');
        fldLi.dataset.node='field'; fldLi.dataset.id=fid;
        fldLi.className='f-item';
        const label = w.querySelector('label')?.textContent?.trim() || fid;
        fldLi.innerHTML = `<span class="handle">⋮⋮</span><span class="txt">${label}</span><span class="actions ms-auto">
            <button data-act="rename" title="Renombrar">✎</button>
            <button data-act="delete" title="Borrar">🗑</button>
        </span>`;
        list.appendChild(fldLi);
      });
      li.appendChild(list);
      ul.appendChild(li);
    });
    treeDiv.appendChild(ul);
    enableTreeDnD();
  }

  function enableTreeDnD(){
    if (!window.Sortable) return;
    treeDiv.querySelectorAll('ul').forEach(u=>{
      if (u.dataset.treeSortable) return;
      new Sortable(u,{
        group:'fd-tree',
        handle:'.handle',
        animation:150,
        draggable:'li',
        ghostClass:'fd-tree-ghost',
        onEnd: syncMove
      });
      u.dataset.treeSortable='1';
    });
  }

  function syncMove(evt){
    const item = evt.item;
    const isGroup = item.dataset.node==='group';
    if (isGroup){
      const groupsUl = treeDiv.querySelector('> ul');
      const orderIds = Array.from(groupsUl.children).map(li=>li.dataset.id);
      const liveGroups = orderIds.map(id=>$('#formulariodinamico [data-group-id="'+CSS.escape(id)+'"]'));
      const formParent = $('#formulariodinamico');
      liveGroups.forEach(g=> g && formParent.appendChild(g));
    } else {
      const fieldId = item.dataset.id;
      const groupLi = item.closest('li[data-node="group"]');
      const groupId = groupLi.dataset.id;
      const liveField = $('#formulariodinamico [data-field-id="'+CSS.escape(fieldId)+'"]');
      const liveGroup = $('#formulariodinamico [data-group-id="'+CSS.escape(groupId)+'"]');
      if (liveField && liveGroup){
        const body = liveGroup.querySelector(':scope > .card-body, :scope > .fd-fields-container') || liveGroup;
        // Reordenar según árbol
        const list = groupLi.querySelector('> ul');
        const order = Array.from(list.children).map(li=>li.dataset.id);
        order.forEach(fid=>{
          const wr = $('#formulariodinamico [data-field-id="'+CSS.escape(fid)+'"]');
            wr && body.appendChild(wr);
        });
      }
    }
    window.fdDndLiteRefresh && window.fdDndLiteRefresh();
    rebuild();
  }

  function addGroup(){
    const fs = document.createElement('fieldset');
    const gid = 'g_'+Date.now().toString(36);
    fs.setAttribute('data-group-id', gid);
    fs.innerHTML = `<legend>Nuevo Grupo</legend>`;
    $('#formulariodinamico').appendChild(fs);
    rebuild();
  }
  function addField(targetGroupId){
    const group = targetGroupId
      ? $('#formulariodinamico [data-group-id="'+CSS.escape(targetGroupId)+'"]')
      : $('#formulariodinamico fieldset, #formulariodinamico .fd-fieldset');
    const g = group || $('#formulariodinamico');
    const body = g.querySelector(':scope > .card-body, :scope > .fd-fields-container') || g;
    const id = 'campo_'+Date.now().toString(36);
    const wrap = document.createElement('div');
    wrap.className='mb-3 fd-field-wrapper';
    wrap.setAttribute('data-field-id',id);
    wrap.innerHTML = `<label class="form-label mb-1">Nuevo Campo</label><input name="${id}" class="form-control" type="text" placeholder="...">`;
    body.appendChild(wrap);
    rebuild();
  }
  function renameNode(li){
    const isGroup = li.dataset.node==='group';
    const current = li.querySelector('.txt').textContent.trim();
    const val = prompt('Nuevo nombre:', current);
    if (!val || !val.trim()) return;
    li.querySelector('.txt').textContent = val.trim();
    if (isGroup){
      const gid = li.dataset.id;
      const g = $('#formulariodinamico [data-group-id="'+CSS.escape(gid)+'"]');
      const lg = g?.querySelector(':scope > legend, :scope > .card-header');
      if (lg) lg.textContent = val.trim();
    } else {
      const fid = li.dataset.id;
      const w = $('#formulariodinamico [data-field-id="'+CSS.escape(fid)+'"]');
      const lab = w?.querySelector('label');
      if (lab) lab.textContent = val.trim();
    }
    rebuild();
  }
  function deleteNode(li){
    if (!confirm('Eliminar?')) return;
    if (li.dataset.node==='group'){
      const gid = li.dataset.id;
      $('#formulariodinamico [data-group-id="'+CSS.escape(gid)+'"]')?.remove();
    } else {
      const fid = li.dataset.id;
      $('#formulariodinamico [data-field-id="'+CSS.escape(fid)+'"]')?.remove();
    }
    rebuild();
  }

  // Toolbar
  $('#fd-tree-toolbar')?.addEventListener('click', e=>{
    const act = e.target.dataset.act;
    if (!act) return;
    const sel = treeDiv.querySelector('.selected');
    if (act==='add-group') addGroup();
    else if (act==='add-field') addField(sel?.dataset.node==='group' ? sel.dataset.id : null);
    else if (act==='rename' && sel) renameNode(sel);
    else if (act==='delete' && sel) deleteNode(sel);
  });

  // Selección
  treeDiv.addEventListener('click', e=>{
    const li = e.target.closest('li[data-node]');
    if (!li) return;
    if (e.target.closest('.actions')) return;
    treeDiv.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));
    li.classList.add('selected');
    if (li.dataset.node==='group'){
      const g = $('#formulariodinamico [data-group-id="'+CSS.escape(li.dataset.id)+'"]');
      g && g.scrollIntoView({behavior:'smooth',block:'center'});
    } else {
      const f = $('#formulariodinamico [data-field-id="'+CSS.escape(li.dataset.id)+'"]');
      f && f.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });

  // Acciones inline (rename/delete/add-field)
  treeDiv.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const li = e.target.closest('li[data-node]');
    const act = btn.dataset.act;
    if (act==='add-field' && li?.dataset.node==='group') addField(li.dataset.id);
    else if (act==='rename' && li) renameNode(li);
    else if (act==='delete' && li) deleteNode(li);
  });

  // Collapse groups
  treeDiv.addEventListener('dblclick', e=>{
    const title = e.target.closest('.g-title');
    if (!title) return;
    title.parentElement.classList.toggle('collapsed');
  });

  // Toggle panel
  $('#toggleTreeBtn')?.addEventListener('click', ()=>{
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) rebuild();
  });
  $('#closeTree')?.addEventListener('click', ()=> panel.classList.add('hidden'));

  // Design mode integration
  const modeToggle = $('#designModeToggle');
  modeToggle?.addEventListener('change', ()=>{
    const on = modeToggle.checked;
    root.classList.toggle('design-mode', on);
    if (on){
      panel.classList.remove('hidden');
      rebuild();
      window.fdDndLiteRefresh && window.fdDndLiteRefresh();
    } else {
      panel.classList.add('hidden');
    }
  });

  // Inicial
  if (root.classList.contains('design-mode')){
    panel.classList.remove('hidden');
    rebuild();
  } else {
    panel.classList.add('hidden');
  }

  window.fdTreeRebuild = rebuild;
})();
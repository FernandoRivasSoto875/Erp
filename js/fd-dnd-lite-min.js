(function(){
  const $  = (s,r=document)=> r.querySelector(s);
  const $$ = (s,r=document)=> Array.from(r.querySelectorAll(s));

  function isDesign(){ return $('#fd-root')?.classList.contains('design-mode'); }

  function injectCss(){
    if ($('#fd-lite-mini-css')) return;
    const st = document.createElement('style');
    st.id='fd-lite-mini-css';
    st.textContent = `
      #fd-root.design-mode .fd-dnd-grip{
        cursor:grab;display:inline-block;margin-right:6px;
        background:#198754;color:#fff;border-radius:4px;
        padding:0 6px;font-weight:600;line-height:1.2;
      }
      #fd-root.design-mode .fd-dnd-ghost{opacity:.6;background:#eef2ff!important;}
      #json-tree-panel .handle{
        cursor:grab;display:inline-block;margin-right:6px;
        background:#6f42c1;color:#fff;border-radius:4px;
        padding:0 6px;font-weight:600;line-height:1.2;
      }
      #json-tree-panel .fd-tree-ghost{opacity:.55;background:#eef2ff;}
      #json-tree-panel .node-fields-list{min-height:14px;padding:4px;border:1px dashed rgba(111,66,193,.35);border-radius:4px;}
    `;
    document.head.appendChild(st);
  }

  function markFieldWrapper(w){
    if (!w || w.dataset.fdFieldWrapped==='1') return;
    w.dataset.fdFieldWrapped='1';
    w.classList.add('fd-field-draggable');
    if (!w.querySelector(':scope > .fd-dnd-grip')){
      const g=document.createElement('span');
      g.className='fd-dnd-grip';
      g.textContent='⋮⋮';
      // insertar antes de label o legend si existe
      const ref = w.querySelector(':scope > label, :scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
      if (ref) ref.parentElement.insertBefore(g, ref);
      else w.insertBefore(g, w.firstChild);
    }
  }

  function isFieldWrapper(el){
    if (!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
    if (el.matches('fieldset, .card, .panel')) return false;
    if (el.matches('.row,[class*="col-"],.col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }

  function pickFieldsBody(group){
    if (!group) return null;
    const body = group.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .fd-fields-container, :scope > .accordion-body');
    return body || group;
  }

  function attachFieldsDnD(){
    if (!window.Sortable) return;
    const groups = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel');
    groups.forEach(g=>{
      const body = pickFieldsBody(g);
      if (!body || body.dataset.fdSortableFields==='1') return;
      // wrappers directos
      Array.from(body.children).filter(isFieldWrapper).forEach(markFieldWrapper);

      new Sortable(body, {
        animation:150,
        handle:'.fd-dnd-grip',
        draggable:'.fd-field-draggable',
        group:{ name:'fd-fields', pull:true, put:true },
        ghostClass:'fd-dnd-ghost',
        onAdd: fireChanged,
        onUpdate: fireChanged,
        onEnd: fireChanged
      });
      body.dataset.fdSortableFields='1';
    });
  }

  // ---- Árbol ----
  function buildTree(){
    const panel = $('#json-tree-panel');
    if (!panel) return;
    panel.innerHTML='';
    const ulRoot=document.createElement('ul');

    const groups = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel');
    groups.forEach(g=>{
      const gid = g.getAttribute('data-group-id') || g.id || autoIdGroup(g);
      if (!g.getAttribute('data-group-id')) g.setAttribute('data-group-id', gid);

      const liGroup = document.createElement('li');
      liGroup.setAttribute('data-node','group');
      liGroup.setAttribute('data-id',gid);
      const title = document.createElement('div');
      title.className='title';
      title.textContent = groupTitle(g);
      liGroup.appendChild(title);

      const wrap = document.createElement('div');
      wrap.setAttribute('data-node','fields');
      wrap.setAttribute('data-id', gid);
      const list = document.createElement('ul');
      list.className='node-fields-list';
      list.setAttribute('data-id',gid);

      const body = pickFieldsBody(g);
      const wrappers = body?Array.from(body.children).filter(isFieldWrapper):[];
      wrappers.forEach(w=>{
        const fid = w.getAttribute('data-field-id') || fieldIdFromWrapper(w);
        if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);
        const li = document.createElement('li');
        li.setAttribute('data-node','field');
        li.setAttribute('data-id', fid);
        const h = document.createElement('span');
        h.className='handle';
        h.textContent='⋮⋮';
        li.appendChild(h);
        li.appendChild(document.createTextNode(' '+fieldLabel(w)));
        list.appendChild(li);
      });
      wrap.appendChild(list);
      liGroup.appendChild(wrap);
      ulRoot.appendChild(liGroup);
    });
    panel.appendChild(ulRoot);
    attachTreeDnD(panel);
  }

  function groupTitle(g){
    const lg = g.querySelector(':scope > legend, :scope > .card-header, :scope > h5, :scope > h4');
    return (lg?.textContent||g.id||'Grupo').trim();
  }
  function autoIdGroup(g){ return 'g_' + Math.random().toString(36).slice(2,8); }
  function fieldIdFromWrapper(w){
    return w.querySelector('[name]')?.getAttribute('name') ||
           w.querySelector('[id]')?.getAttribute('id') ||
           'f_' + Math.random().toString(36).slice(2,8);
  }
  function fieldLabel(w){
    return (w.querySelector('label')?.textContent||fieldIdFromWrapper(w)).trim();
  }

  function attachTreeDnD(panel){
    if (!window.Sortable) return;
    panel.querySelectorAll('.node-fields-list').forEach(list=>{
      if (list.dataset.fdTreeSortable==='1') return;
      new Sortable(list, {
        animation:150,
        group:{ name:'fd-tree-fields', pull:true, put:true },
        draggable:'[data-node="field"]',
        handle:'.handle',
        ghostClass:'fd-tree-ghost',
        onAdd: e=> treeMove(e),
        onUpdate: e=> treeMove(e)
      });
      list.dataset.fdTreeSortable='1';
    });
  }

  function treeMove(evt){
    const item = evt.item;
    const fieldId = item.getAttribute('data-id');
    const targetGroupId = evt.to.getAttribute('data-id');
    if (!fieldId || !targetGroupId) return;

    const wrapper = document.querySelector('#fd-root [data-field-id="'+CSS.escape(fieldId)+'"]');
    const group = document.querySelector('#fd-root [data-group-id="'+CSS.escape(targetGroupId)+'"]');
    if (!wrapper || !group) return;

    const body = pickFieldsBody(group);
    if (!body) return;
    // calcular posición relativa
    const before = item.nextElementSibling ? item.nextElementSibling.getAttribute('data-id') : null;

    if (before){
      const beforeWrap = document.querySelector('#fd-root [data-field-id="'+CSS.escape(before)+'"]');
      if (beforeWrap && beforeWrap.parentElement===body){
        body.insertBefore(wrapper, beforeWrap);
      } else {
        body.appendChild(wrapper);
      }
    } else {
      body.appendChild(wrapper);
    }
    markFieldWrapper(wrapper);
    // reconstruir árbol para reflejar orden definitivo
    buildTree();
    fireChanged();
  }

  function fireChanged(){
    if (!isDesign()) return;
    // Aquí podrías disparar persistencia luego
    // console.log('[MiniDnD] cambio');
  }

  function init(){
    injectCss();
    if (!isDesign()){
      // limpiar grips visuales si quieres (no crítico)
      return;
    }
    attachFieldsDnD();
    buildTree();
  }

  window.addEventListener('design-mode-changed', init);
  document.addEventListener('DOMContentLoaded', init);
  window.fdDndLiteRefresh = init;
})();
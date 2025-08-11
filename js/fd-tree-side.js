(function(){
  // NUEVO: arranque diferido robusto
  let TYPE_META = { field_types:{}, fieldset_types:{} };
  let root, panel, treeEl, filterInput, form;
  let observer = null;

  function qs(){ // refresca referencias (por si el DOM cambia)
    root   = document.getElementById('fd-root');
    panel  = document.getElementById('fd-tree-side');
    treeEl = document.getElementById('fd-tree');
    filterInput = document.getElementById('fd-tree-filter');
    form   = document.getElementById('formulariodinamico');
  }

  function waitForDom(maxMs=6000){
    const t0 = Date.now();
    return new Promise(res=>{
      (function loop(){
        qs();
        if (root && panel && treeEl && form){
          return res(true);
        }
        if (Date.now()-t0 > maxMs) return res(false);
        requestAnimationFrame(loop);
      })();
    });
  }

  // ---- Helpers (migrados del cuerpo original) ----
  function pickBody(g){
    return g.querySelector(':scope > .card-body, :scope > .fd-fields-container, :scope > .tab-pane > .fd-fields-container') || g;
  }
  function isGroup(el){
    return !!el && el.matches('fieldset,.fd-fieldset,.card,.panel');
  }
  function isFieldWrapper(el){
    if(!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
    if(isGroup(el)) return false;
    if(el.matches('.row,[class*="col-"],.col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  function getTopGroups(){
    if(!form) return [];
    // fieldsets (u otros grupos) en cualquier profundidad pero filtrando los anidados
    const all = Array.from(form.querySelectorAll('fieldset,.fd-fieldset,.card,.panel'));
    return all.filter(g=> !g.parentElement.closest('fieldset,.fd-fieldset,.card,.panel'));
  }
  function groupTitle(g){
    return (g.querySelector(':scope > legend, :scope > .card-header')?.textContent ||
            g.getAttribute('data-fieldset-name') || g.id || 'Grupo').trim();
  }
  function ensureGroupId(g){
    let id = g.getAttribute('data-group-id') || g.id;
    if(!id){
      id = 'g_'+Math.random().toString(36).slice(2,8);
      g.setAttribute('data-group-id', id);
    } else g.setAttribute('data-group-id', id);
    return id;
  }
  function ensureFieldId(w){
    let id = w.getAttribute('data-field-id') ||
      w.querySelector('[name]')?.name ||
      w.id;
    if(!id){
      id = 'f_'+Math.random().toString(36).slice(2,8);
      w.setAttribute('data-field-id', id);
    } else w.setAttribute('data-field-id', id);
    return id;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function getFieldIcon(tipo){
    if(!tipo) return 'far fa-square';
    return (TYPE_META.field_types?.[tipo]?.icon) || iconFallbackField(tipo);
  }
  function getFieldsetIcon(tipo){
    if(!tipo) return 'fas fa-layer-group';
    return (TYPE_META.fieldset_types?.[tipo]?.icon) || iconFallbackGroup(tipo);
  }
  function iconFallbackField(t){
    if(['number','integer','decimal','currency','percent'].includes(t)) return 'fas fa-hashtag';
    if(['date','datetime','time'].includes(t)) return 'fas fa-calendar';
    if(['email'].includes(t)) return 'fas fa-envelope';
    if(['password'].includes(t)) return 'fas fa-key';
    if(['select','multiselect','select_remote','select2','select2_remote'].includes(t)) return 'fas fa-list';
    if(['checkbox','switch'].includes(t)) return 'far fa-check-square';
    if(['radio'].includes(t)) return 'far fa-dot-circle';
    if(['file','image','multifile'].includes(t)) return 'fas fa-file-upload';
    if(['textarea'].includes(t)) return 'fas fa-align-left';
    return 'far fa-square';
  }
  function iconFallbackGroup(t){
    if(['tabs'].includes(t)) return 'far fa-folder';
    if(['accordion'].includes(t)) return 'fas fa-bars';
    if(['row'].includes(t)) return 'fas fa-grip-horizontal';
    if(['column'].includes(t)) return 'fas fa-grip-vertical';
    if(['divider'].includes(t)) return 'fas fa-minus';
    if(['wizard','stepper','step','steps'].includes(t)) return 'fas fa-stream';
    return 'fas fa-layer-group';
  }

  function buildFieldNode(w){
    ensureFieldId(w);
    const fid = w.getAttribute('data-field-id');
    const tipo = (w.getAttribute('data-field-type') || w.getAttribute('data-field-tipo') ||
                  w.querySelector('input,select,textarea')?.type || 'text').toLowerCase();
    const icon = getFieldIcon(tipo);
    const label = (w.querySelector('label')?.textContent || fid).trim();
    const li = document.createElement('li');
    li.dataset.node='field';
    li.dataset.id=fid;
    li.className='fd-tree-field';
    li.innerHTML = `
      <div class="f-item">
        <span class="handle">⋮⋮</span>
        <i class="ico ${icon}" title="${escapeHtml(tipo)}"></i>
        <span class="txt">${escapeHtml(label)}</span>
        <span class="actions ms-auto">
          <button data-act="rename" title="Renombrar">✎</button>
          <button data-act="delete" title="Borrar">🗑</button>
        </span>
      </div>`;
    return li;
  }

  function buildGroupNode(g){
    ensureGroupId(g);
    const gid = g.getAttribute('data-group-id');
    const gtype = g.getAttribute('data-fieldset-type') || 'group';
    const icon = getFieldsetIcon(gtype);
    const li = document.createElement('li');
    li.dataset.node='group';
    li.dataset.id = gid;
    li.className='fd-tree-group';
    const titleDiv = document.createElement('div');
    titleDiv.className='g-title';
    titleDiv.innerHTML = `
      <span class="toggle" title="Colapsar/Expandir">▾</span>
      <span class="handle">⋮⋮</span>
      <i class="ico ${icon}" title="${escapeHtml(gtype)}"></i>
      <span class="txt">${escapeHtml(groupTitle(g))}</span>
      <span class="actions ms-auto">
        <button data-act="add-group" title="Nuevo sub-grupo">＋G</button>
        <button data-act="add-field" title="Nuevo campo">＋C</button>
        <button data-act="rename" title="Renombrar">✎</button>
        <button data-act="delete" title="Borrar">🗑</button>
      </span>`;
    li.appendChild(titleDiv);

    const body = pickBody(g);
    const childGroups = Array.from(body.children).filter(isGroup);
    const fields = Array.from(body.children).filter(isFieldWrapper);
    if(childGroups.length || fields.length){
      const cu = document.createElement('ul');
      cu.className='fd-tree-children';
      childGroups.forEach(ch=> cu.appendChild(buildGroupNode(ch)));
      fields.forEach(f=> cu.appendChild(buildFieldNode(f)));
      li.appendChild(cu);
    }
    return li;
  }

  function buildTree(){
    qs();
    if(!panel || panel.classList.contains('hidden') || !treeEl || !form) return;
    treeEl.innerHTML='';
    const topGroups = getTopGroups();
    if(!topGroups.length){
      treeEl.innerHTML = '<div class="text-muted small">Sin grupos</div>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className='fd-tree-root';
    topGroups.forEach(g=> ul.appendChild(buildGroupNode(g)));
    treeEl.appendChild(ul);
    enableDnD();
    applyFilter();
  }
  window.fdTreeRebuild = buildTree;

  // CRUD (idéntico a versión original) -----------------
  function addGroup(parentLi){
    let container;
    if(parentLi){
      const parentLive = form.querySelector('[data-group-id="'+CSS.escape(parentLi.dataset.id)+'"]');
      container = pickBody(parentLive);
    } else container = form;
    const fs = document.createElement('fieldset');
    fs.setAttribute('data-fieldset-type','group');
    fs.innerHTML = '<legend>Nuevo Grupo</legend>';
    container.appendChild(fs);
    buildTree();
  }
  function addField(targetGroupLi){
    let body = form;
    if(targetGroupLi){
      const glive=form.querySelector('[data-group-id="'+CSS.escape(targetGroupLi.dataset.id)+'"]');
      body = pickBody(glive);
    }
    const fid='campo_'+Math.random().toString(36).slice(2,8);
    const wrap=document.createElement('div');
    wrap.className='mb-3 fd-field-wrapper';
    wrap.setAttribute('data-field-id',fid);
    wrap.setAttribute('data-field-type','text');
    wrap.innerHTML=`<label class="form-label mb-1">Nuevo Campo</label><input name="${fid}" class="form-control" type="text" placeholder="...">`;
    body.appendChild(wrap);
    buildTree();
  }
  function renameNode(li){
    const current = li.querySelector('.txt')?.textContent?.trim() || '';
    const val = prompt('Nuevo nombre:', current);
    if(!val) return;
    li.querySelector('.txt').textContent = val;
    if(li.dataset.node==='group'){
      const live = form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]');
      const lg = live?.querySelector(':scope > legend, :scope > .card-header');
      if(lg) lg.textContent = val;
    } else {
      const live = form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]');
      const lab = live?.querySelector('label');
      if(lab) lab.textContent = val;
    }
    buildTree();
  }
  function deleteNode(li){
    if(!confirm('Eliminar?')) return;
    if(li.dataset.node==='group'){
      form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]')?.remove();
    } else {
      form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]')?.remove();
    }
    buildTree();
  }

  // Filtro
  function applyFilter(){
    if(!treeEl) return;
    const term = (filterInput?.value||'').toLowerCase().trim();
    if(!term){
      treeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
      return;
    }
    treeEl.querySelectorAll('li').forEach(li=>{
      const txt = li.querySelector('.txt')?.textContent.toLowerCase() || '';
      const hit = txt.includes(term);
      li.classList.toggle('fd-filter-hit', hit);
    });
    treeEl.querySelectorAll('li').forEach(li=>{
      if(li.classList.contains('fd-filter-hit')) { li.classList.remove('fd-filter-hide'); return; }
      const descHit = li.querySelector('.fd-filter-hit');
      li.classList.toggle('fd-filter-hide', !descHit);
    });
  }

  // DnD (fix: paréntesis incorrecto en original)
  function enableDnD(){
    if(!window.Sortable || !treeEl) return;
    treeEl.querySelectorAll('ul').forEach(u=>{
      if(u._fdSortable) return;
      u._fdSortable = new Sortable(u, {
        group:'fd-tree-nested',
        handle:'.handle',
        animation:150,
        fallbackOnBody:true,
        swapThreshold:0.65,
        draggable:'> li',
        ghostClass:'fd-tree-ghost',
        onEnd: syncMove
      });
    });
  }
  function syncMove(evt){
    const item = evt.item;
    const parentUl = item.parentElement;
    const parentGroupLi = parentUl.closest('li[data-node="group"]');
    if(item.dataset.node==='group'){
      const groupId = item.dataset.id;
      const liveGroup = form.querySelector('[data-group-id="'+CSS.escape(groupId)+'"]');
      let container;
      if(parentGroupLi){
        const liveParent = form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]');
        container = pickBody(liveParent);
      } else container = form;
      container.appendChild(liveGroup);
      reorderSiblings(parentUl);
    } else {
      const body = parentGroupLi
        ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]'))
        : form;
      reorderFields(parentUl, body);
    }
    buildTree();
  }
  function reorderSiblings(ul){
    const parentGroupLi = ul.closest('li[data-node="group"]');
    let targetBody;
    if(parentGroupLi){
      const liveParent=form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]');
      targetBody=pickBody(liveParent);
    } else targetBody=form;
    Array.from(ul.children).forEach(n=>{
      if(n.dataset.node==='group'){
        const live=form.querySelector('[data-group-id="'+CSS.escape(n.dataset.id)+'"]');
        live && targetBody.appendChild(live);
      } else {
        const live=form.querySelector('[data-field-id="'+CSS.escape(n.dataset.id)+'"]');
        live && targetBody.appendChild(live);
      }
    });
  }
  function reorderFields(ul, body){
    Array.from(ul.children).filter(li=>li.dataset.node==='field')
      .forEach(li=>{
        const w=form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]');
        w && body.appendChild(w);
      });
  }

  // Eventos panel
  function bindPanelEvents(){
    if(!treeEl) return;
    treeEl.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-act]');
      if(btn){
        const li = e.target.closest('li[data-node]');
        const act = btn.dataset.act;
        if(act==='add-group') addGroup(li);
        else if(act==='add-field') addField(li);
        else if(act==='rename') renameNode(li);
        else if(act==='delete') deleteNode(li);
        return;
      }
      const tgl = e.target.closest('.toggle');
      if(tgl){
        const li=e.target.closest('li[data-node="group"]');
        if(li){
          li.classList.toggle('collapsed');
          tgl.textContent = li.classList.contains('collapsed') ? '▸':'▾';
        }
      }
      const li = e.target.closest('li[data-node]');
      if(li && !e.target.closest('.actions')){
        treeEl.querySelectorAll('.selected').forEach(s=>s.classList.remove('selected'));
        li.classList.add('selected');
        scrollToLive(li);
      }
    });

    filterInput?.addEventListener('input', applyFilter);

    document.getElementById('toggleTreeBtn')?.addEventListener('click', ()=>{
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden')) buildTree();
    });
    document.getElementById('closeTree')?.addEventListener('click', ()=> panel.classList.add('hidden'));

    document.getElementById('designModeToggle')?.addEventListener('change', e=>{
      const on = e.target.checked;
      root.classList.toggle('design-mode', on);
      if(on){ panel.classList.remove('hidden'); buildTree(); }
      else panel.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('design-mode-changed',{detail:{on}}));
    });
  }

  function scrollToLive(li){
    if(!form) return;
    if(li.dataset.node==='group')
      form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});
    else
      form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function startObserver(){
    if(observer){ observer.disconnect(); observer=null; }
    if(!form) return;
    observer = new MutationObserver(()=>{
      // reconstruye si se agregan/eliminan grupos o campos
      buildTree();
    });
    observer.observe(form, { childList:true, subtree:true });
  }

  async function init(){
    const ok = await waitForDom();
    if(!ok){
      console.warn('[fd-tree-side] No se encontraron elementos requeridos.');
      return;
    }
    // Cargar metadatos de tipos
    try{
      const r = await fetch('json/form-types.json');
      if(r.ok){
        TYPE_META = await r.json();
      }
    }catch(e){}
    bindPanelEvents();
    if(root.classList.contains('design-mode')){
      panel.classList.remove('hidden');
    } else panel.classList.add('hidden');
    startObserver();
    buildTree();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
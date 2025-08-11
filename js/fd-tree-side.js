(function(){
  // -------------------- VARIABLES & INIT --------------------
  let TYPE_META = { field_types:{}, fieldset_types:{} };
  let root, panel, formTreeEl, filterInput, form, jsonTreeEl;
  let dirtyJson = false;
  let FORM_JSON_LOCAL = null;

  function qs(){
    root = document.getElementById('fd-root');
    panel = document.getElementById('fd-tree-side');
    formTreeEl = document.getElementById('fd-tree');
    filterInput = document.getElementById('fd-tree-filter');
    form = document.getElementById('formulariodinamico');
    jsonTreeEl = document.getElementById('fd-json-tree');
  }
  qs();

  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(init);

  async function init(){
    qs();
    if(!panel) return;
    // Copia editable del JSON cargado por PHP
    FORM_JSON_LOCAL = window.FORM_JSON ? JSON.parse(JSON.stringify(window.FORM_JSON)) : { parametros:{}, fieldsets:{}, layout:{} };
    // Carga tipos (no bloqueante)
    fetch('json/form-types.json').then(r=>r.ok?r.json():null)
      .then(j=>{ if(j) TYPE_META=j||TYPE_META; formBuildTree(); })
      .catch(()=> formBuildTree());

    bindUI();
    if(root?.classList.contains('design-mode')){
      panel.classList.remove('hidden');
      formBuildTree();
      jsonBuildTree();
    }
    observeFormMutations();
  }

  // -------------------- FORM STRUCTURE TREE (YA EXISTENTE / REFACTORED) --------------------
  function pickBody(g){
    return g.querySelector(':scope > .card-body, :scope > .fd-fields-container') || g;
  }
  function isGroup(el){ return !!el && el.matches('fieldset,.fd-fieldset,.card,.panel'); }
  function isFieldWrap(el){
    if(!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
    if(isGroup(el)) return false;
    if(el.matches('.row,[class*="col-"],.col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  function getTopGroups(){
    if(!form) return [];
    const all = Array.from(form.querySelectorAll('fieldset,.fd-fieldset,.card,.panel'));
    return all.filter(g=> !g.parentElement.closest('fieldset,.fd-fieldset,.card,.panel'));
  }
  function ensureGroupId(g){
    let id = g.getAttribute('data-group-id') || g.id;
    if(!id){ id='g_'+Math.random().toString(36).slice(2,8); g.setAttribute('data-group-id',id); }
    else g.setAttribute('data-group-id', id);
    return id;
  }
  function ensureFieldId(w){
    let id = w.getAttribute('data-field-id') || w.querySelector('[name]')?.name || w.id;
    if(!id){ id='f_'+Math.random().toString(36).slice(2,8); w.setAttribute('data-field-id',id); }
    else w.setAttribute('data-field-id', id);
    return id;
  }
  function groupTitle(g){
    return (g.querySelector(':scope > legend, :scope > .card-header')?.textContent ||
      g.getAttribute('data-fieldset-name') || g.id || 'Grupo').trim();
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function formBuildTree(){
    if(!formTreeEl || panel.classList.contains('hidden')) return;
    formTreeEl.innerHTML='';
    const top = getTopGroups();
    if(!top.length){ formTreeEl.innerHTML='<div class="text-muted small">Sin grupos</div>'; return; }
    const ul = document.createElement('ul'); ul.className='fd-tree-root';
    top.forEach(g=> ul.appendChild(buildGroupNode(g)));
    formTreeEl.appendChild(ul);
    enableDnDForm();
    applyFilterAll();
  }

  function buildGroupNode(g){
    ensureGroupId(g);
    const gid = g.getAttribute('data-group-id');
    const gtype = g.getAttribute('data-fieldset-type') || 'group';
    const icon = fieldsetIcon(gtype);
    const li=document.createElement('li');
    li.dataset.node='group'; li.dataset.id=gid; li.className='fd-tree-group';
    li.innerHTML = `
      <div class="g-title">
        <span class="toggle" title="Colapsar/Expandir">▾</span>
        <span class="handle">⋮⋮</span>
        <i class="ico ${icon}" title="${escapeHtml(gtype)}"></i>
        <span class="txt">${escapeHtml(groupTitle(g))}</span>
        <span class="actions ms-auto">
          <button data-act="add-group" title="Sub-grupo">＋G</button>
          <button data-act="add-field" title="Campo">＋C</button>
          <button data-act="rename" title="Renombrar">✎</button>
          <button data-act="delete" title="Borrar">🗑</button>
        </span>
      </div>`;
    const body = pickBody(g);
    const childGroups = Array.from(body.children).filter(isGroup);
    const fields = Array.from(body.children).filter(isFieldWrap);
    if(childGroups.length || fields.length){
      const cu=document.createElement('ul'); cu.className='fd-tree-children';
      childGroups.forEach(ch=> cu.appendChild(buildGroupNode(ch)));
      fields.forEach(f=> cu.appendChild(buildFieldNode(f)));
      li.appendChild(cu);
    }
    return li;
  }
  function buildFieldNode(w){
    ensureFieldId(w);
    const fid = w.getAttribute('data-field-id');
    const tipo = (w.getAttribute('data-field-type') || w.getAttribute('data-field-tipo') ||
      w.querySelector('input,select,textarea')?.type || 'text').toLowerCase();
    const icon = fieldIcon(tipo);
    const label = (w.querySelector('label')?.textContent || fid).trim();
    const li=document.createElement('li');
    li.dataset.node='field'; li.dataset.id=fid; li.className='fd-tree-field';
    li.innerHTML=`
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
  function fieldIcon(t){
    return (TYPE_META.field_types?.[t]?.icon) || fallbackField(t);
  }
  function fieldsetIcon(t){
    return (TYPE_META.fieldset_types?.[t]?.icon) || fallbackGroup(t);
  }
  function fallbackField(t){
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
  function fallbackGroup(t){
    if(['tabs'].includes(t)) return 'far fa-folder';
    if(['accordion'].includes(t)) return 'fas fa-bars';
    if(['row'].includes(t)) return 'fas fa-grip-horizontal';
    if(['column'].includes(t)) return 'fas fa-grip-vertical';
    if(['divider'].includes(t)) return 'fas fa-minus';
    if(['wizard','stepper','step','steps'].includes(t)) return 'fas fa-stream';
    return 'fas fa-layer-group';
  }

  // CRUD Form
  function formAddGroup(parentLi){
    let container;
    if(parentLi){
      const parentLive=form.querySelector('[data-group-id="'+CSS.escape(parentLi.dataset.id)+'"]');
      container=pickBody(parentLive);
    } else container=form;
    const fs=document.createElement('fieldset');
    fs.setAttribute('data-fieldset-type','group');
    fs.innerHTML='<legend>Nuevo Grupo</legend>';
    container.appendChild(fs);
    formBuildTree();
  }
  function formAddField(groupLi){
    let body=form;
    if(groupLi){
      const glive=form.querySelector('[data-group-id="'+CSS.escape(groupLi.dataset.id)+'"]');
      body=pickBody(glive);
    }
    const fid='campo_'+Math.random().toString(36).slice(2,8);
    const wrap=document.createElement('div');
    wrap.className='mb-3 fd-field-wrapper';
    wrap.setAttribute('data-field-id',fid);
    wrap.setAttribute('data-field-type','text');
    wrap.innerHTML=`<label class="form-label mb-1">Nuevo Campo</label><input name="${fid}" class="form-control" type="text">`;
    body.appendChild(wrap);
    formBuildTree();
  }
  function formRename(li){
    const current = li.querySelector('.txt')?.textContent?.trim() || '';
    const v=prompt('Nuevo nombre:', current);
    if(!v) return;
    li.querySelector('.txt').textContent=v;
    if(li.dataset.node==='group'){
      const live=form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]');
      const lg=live?.querySelector(':scope > legend, :scope > .card-header');
      if(lg) lg.textContent=v;
    } else {
      const live=form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]');
      const lab=live?.querySelector('label');
      if(lab) lab.textContent=v;
    }
    formBuildTree();
  }
  function formDelete(li){
    if(!confirm('Eliminar?')) return;
    if(li.dataset.node==='group')
      form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]')?.remove();
    else
      form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]')?.remove();
    formBuildTree();
  }

  // DnD Form
  function enableDnDForm(){
    if(!window.Sortable) return;
    formTreeEl.querySelectorAll('ul').forEach(u=>{
      if(u._fdSortable) return;
      u._fdSortable = new Sortable(u,{
        group:'fd-tree-nested',
        handle:'.handle',
        animation:150,
        draggable:'> li',
        swapThreshold:0.65,
        onEnd: syncMoveForm
      });
    });
  }
  function syncMoveForm(evt){
    const item=evt.item;
    const parentUl=item.parentElement;
    const parentGroupLi=parentUl.closest('li[data-node="group"]');
    if(item.dataset.node==='group'){
      const groupId=item.dataset.id;
      const live=form.querySelector('[data-group-id="'+CSS.escape(groupId)+'"]');
      let container;
      if(parentGroupLi){
        const liveParent=form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]');
        container=pickBody(liveParent);
      } else container=form;
      container.appendChild(live);
      reorderMixed(parentUl);
    } else {
      const body = parentGroupLi
        ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]'))
        : form;
      reorderFields(parentUl, body);
    }
    formBuildTree();
  }
  function reorderMixed(ul){
    const parentGroupLi = ul.closest('li[data-node="group"]');
    let targetBody = parentGroupLi
      ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]'))
      : form;
    Array.from(ul.children).forEach(li=>{
      if(li.dataset.node==='group'){
        const live=form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]');
        live && targetBody.appendChild(live);
      } else {
        const live=form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]');
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

  // -------------------- JSON TREE COMPLETO --------------------
  function jsonBuildTree(){
    if(!jsonTreeEl || panel.classList.contains('hidden')) return;
    jsonTreeEl.innerHTML='';
    const rootUl = document.createElement('ul');
    rootUl.className='fd-json-root';

    // Estructura esperada: parametros, fieldsets, layout
    const rootObj = {
      parametros: FORM_JSON_LOCAL.parametros || {},
      fieldsets : FORM_JSON_LOCAL.fieldsets  || {},
      layout    : FORM_JSON_LOCAL.layout     || {}
    };

    Object.keys(rootObj).forEach(k=>{
      const node = buildJsonNode(k, rootObj[k], FORM_JSON_LOCAL, k);
      rootUl.appendChild(node);
    });
    jsonTreeEl.appendChild(rootUl);
  }

  function buildJsonNode(key, value, parentRef, path){
    const li=document.createElement('li');
    let isObj = value && typeof value === 'object' && !Array.isArray(value);
    let isArr = Array.isArray(value);
    const hasChildren = isObj ? Object.keys(value).length>0 : (isArr ? value.length>0 : false);

    li.innerHTML = `
      <div class="fd-json-node ${isObj?'fd-json-type-object':''} ${isArr?'fd-json-type-array':''}" data-path="${escapeHtml(path)}">
        <span class="fd-json-toggle ${hasChildren?'':'empty'}">${hasChildren?'▾':''}</span>
        <span class="fd-json-key">${escapeHtml(key)}</span>
        ${(!isObj && !isArr) ? `<span class="fd-json-value ${valueClass(value)}" data-type="${valueType(value)}">${renderValue(value)}</span>` : `<span class="fd-json-badge">${isArr?('['+value.length+']'):'{'+Object.keys(value).length+'}'}</span>`}
        <span class="fd-json-actions ms-auto">
          ${(!isObj && !isArr)?'<button data-act="edit" title="Editar">✎</button>':''}
        </span>
      </div>
    `;
    if(hasChildren){
      const ul=document.createElement('ul');
      const entries = isArr ? value.map((v,i)=>[i,v]) : Object.entries(value);
      entries.forEach(([k2,v2])=>{
        const childPath = path + (isArr?`[${k2}]`:`.${k2}`);
        ul.appendChild(buildJsonNode(k2, v2, value, childPath));
      });
      li.appendChild(ul);
    }
    return li;
  }

  function valueType(v){
    if(v===null) return 'null';
    if(Array.isArray(v)) return 'array';
    return typeof v;
  }
  function valueClass(v){
    const t=valueType(v);
    return 'fd-type-'+t+(t==='string'?'':'');
  }
  function renderValue(v){
    const t=valueType(v);
    if(t==='boolean') return v?'true':'false';
    if(t==='null') return 'null';
    return String(v);
  }

  function markDirty(){
    if(dirtyJson) return;
    dirtyJson = true;
    document.getElementById('fd-json-save')?.removeAttribute('disabled');
    panel.classList.add('fd-json-dirty');
  }

  // Edit inline
  function startEdit(span){
    if(span.classList.contains('fd-editing')) return;
    const old=span.textContent;
    span.classList.add('fd-editing');
    const type=span.dataset.type;
    const input=document.createElement('input');
    input.type='text';
    input.value=(type==='string') ? old.replace(/^"|"$/g,'') : old;
    span.textContent='';
    span.appendChild(input);
    input.focus();
    input.select();
    const commit=()=>{
      const newValRaw=input.value;
      let newVal;
      if(type==='number'){
        newVal = Number(newValRaw);
        if(isNaN(newVal)) { cancel(); return; }
      } else if(type==='boolean'){
        newVal = (newValRaw.toLowerCase()==='true');
      } else if(type==='null'){
        newVal = null;
      } else {
        newVal = newValRaw;
      }
      // Actualiza objeto
      const path = span.closest('.fd-json-node').dataset.path;
      setJsonPathValue(path, newVal);
      span.classList.remove('fd-editing');
      span.dataset.type=valueType(newVal);
      span.className='fd-json-value '+valueClass(newVal);
      span.textContent=renderValue(newVal);
      markDirty();
    };
    const cancel=()=>{
      span.classList.remove('fd-editing');
      span.textContent=old;
    };
    input.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ commit(); }
      else if(e.key==='Escape'){ cancel(); }
    });
    input.addEventListener('blur', commit);
  }

  function setJsonPathValue(path, val){
    // path estilo: parametros.titulo  o fieldsets.datos_personales.campos[0].nombre
    try{
      const tokens = parsePath(path);
      if(!tokens.length) return;
      let obj = FORM_JSON_LOCAL;
      for(let i=0;i<tokens.length-1;i++){
        obj = obj[tokens[i]];
        if(obj===undefined) return;
      }
      obj[tokens[tokens.length-1]] = val;
    }catch(e){ /* noop */ }
  }

  function parsePath(p){
    // Convierte parametros.fieldsets[0].nombre => ['parametros','fieldsets',0,'nombre']
    const out=[];
    p.split('.').forEach(seg=>{
      let rest=seg;
      const m = rest.match(/^[^\[]+/);
      if(m) out.push(m[0]);
      const brackets = rest.match(/\[[0-9]+\]/g);
      if(brackets){
        brackets.forEach(b=>{
          out.push(Number(b.slice(1,-1)));
        });
      }
    });
    return out;
  }

  // Expand / Collapse JSON
  function jsonExpandAll(expand){
    jsonTreeEl.querySelectorAll('.fd-json-node .fd-json-toggle:not(.empty)').forEach(t=>{
      const li=t.closest('li');
      if(expand){
        li.classList.remove('collapsed');
        t.textContent='▾';
      } else {
        li.classList.add('collapsed');
        t.textContent='▸';
      }
    });
  }

  // Guardar JSON (placeholder)
  async function saveJson(){
    // TODO: Implementar endpoint PHP (ej: guardar_form_json.php)
    // Aquí solo mostramos y reseteamos flag.
    console.log('JSON a guardar:', FORM_JSON_LOCAL);
    dirtyJson=false;
    document.getElementById('fd-json-save')?.setAttribute('disabled','disabled');
    panel.classList.remove('fd-json-dirty');
    alert('Simulación guardado (implementa endpoint servidor).');
  }

  // -------------------- FILTER (aplica a ambas vistas) --------------------
  function applyFilterAll(){
    const term = (filterInput?.value||'').toLowerCase().trim();
    // Form tree
    if(formTreeEl){
      formTreeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
      if(term){
        formTreeEl.querySelectorAll('li').forEach(li=>{
          const txt=li.querySelector('.txt')?.textContent.toLowerCase()||'';
          const hit=txt.includes(term);
          li.classList.toggle('fd-filter-hit', hit);
        });
        formTreeEl.querySelectorAll('li').forEach(li=>{
          if(li.classList.contains('fd-filter-hit')) return;
            const descHit=li.querySelector('.fd-filter-hit');
            if(!descHit) li.classList.add('fd-filter-hide');
        });
      }
    }
    // JSON tree
    if(jsonTreeEl){
      jsonTreeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
      if(term){
        jsonTreeEl.querySelectorAll('.fd-json-node').forEach(nd=>{
          const txt = nd.querySelector('.fd-json-key')?.textContent.toLowerCase() || '';
          const vtxt = nd.querySelector('.fd-json-value')?.textContent.toLowerCase() || '';
          const li=nd.closest('li');
          const hit = txt.includes(term) || vtxt.includes(term);
          if(hit) li.classList.add('fd-filter-hit');
        });
        jsonTreeEl.querySelectorAll('li').forEach(li=>{
          if(li.classList.contains('fd-filter-hit')) return;
          if(li.querySelector('.fd-filter-hit')) return;
          li.classList.add('fd-filter-hide');
        });
      }
    }
  }

  // -------------------- EVENTS --------------------
  function bindUI(){
    // Tabs
    document.getElementById('fd-side-tabs')?.addEventListener('click', e=>{
      const btn = e.target.closest('[data-tab]');
      if(!btn) return;
      e.preventDefault();
      const tab = btn.dataset.tab;
      e.currentTarget.querySelectorAll('.nav-link').forEach(a=>a.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('fd-tree-wrapper-form')?.classList.toggle('d-none', tab!=='form');
      document.getElementById('fd-tree-wrapper-json')?.classList.toggle('d-none', tab!=='json');
      if(tab==='form') formBuildTree(); else jsonBuildTree();
      applyFilterAll();
    });

    filterInput?.addEventListener('input', applyFilterAll);

    // Form tree actions
    formTreeEl?.addEventListener('click', e=>{
      const btn=e.target.closest('button[data-act]');
      if(btn){
        const li=e.target.closest('li[data-node]');
        const act=btn.dataset.act;
        if(act==='add-group') formAddGroup(li);
        else if(act==='add-field') formAddField(li);
        else if(act==='rename') formRename(li);
        else if(act==='delete') formDelete(li);
        return;
      }
      const tgl=e.target.closest('.toggle');
      if(tgl){
        const li=e.target.closest('li[data-node="group"]');
        if(li){
          li.classList.toggle('collapsed');
          tgl.textContent=li.classList.contains('collapsed')?'▸':'▾';
        }
      }
    });

    // JSON tree actions
    jsonTreeEl?.addEventListener('click', e=>{
      const toggle = e.target.closest('.fd-json-toggle');
      if(toggle && !toggle.classList.contains('empty')){
        const li=toggle.closest('li');
        li.classList.toggle('collapsed');
        toggle.textContent = li.classList.contains('collapsed') ? '▸':'▾';
      }
      const editBtn = e.target.closest('button[data-act="edit"]');
      if(editBtn){
        const node = editBtn.closest('.fd-json-node');
        const valSpan = node.querySelector('.fd-json-value');
        if(valSpan) startEdit(valSpan);
      }
      const valSpan = e.target.closest('.fd-json-value');
      if(valSpan) startEdit(valSpan);
    });

    document.getElementById('fd-json-expand')?.addEventListener('click', ()=> jsonExpandAll(true));
    document.getElementById('fd-json-collapse')?.addEventListener('click', ()=> jsonExpandAll(false));
    document.getElementById('fd-json-save')?.addEventListener('click', saveJson);

    // Toggle panel
    document.getElementById('toggleTreeBtn')?.addEventListener('click', ()=>{
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden')){
        formBuildTree(); jsonBuildTree(); applyFilterAll();
      }
    });
    document.getElementById('closeTree')?.addEventListener('click', ()=> panel.classList.add('hidden'));

    // Design mode master toggle
    document.getElementById('designModeToggle')?.addEventListener('change', e=>{
      const on = e.target.checked;
      root.classList.toggle('design-mode', on);
      if(on){
        panel.classList.remove('hidden');
        formBuildTree(); jsonBuildTree();
      } else panel.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('design-mode-changed',{detail:{on}}));
    });
  }

  // Observa cambios del formulario (agregar/eliminar fieldsets/campos)
  function observeFormMutations(){
    if(!form) return;
    const mo = new MutationObserver(()=> formBuildTree());
    mo.observe(form, {childList:true, subtree:true});
  }

  // Exponer rebuild (opcional)
  window.fdTreeRebuild = function(){
    formBuildTree();
    jsonBuildTree();
  };
})();
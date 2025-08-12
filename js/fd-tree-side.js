(function(){
  let TYPE_META = { field_types:{}, fieldset_types:{} };
  let root, panel, formTreeEl, filterInput, form, jsonTreeEl, tabsEl;
  let FORM_JSON_LOCAL = null;
  let dirtyJson = false;

  function qs(){
    root = document.getElementById('fd-root');
    panel = document.getElementById('fd-tree-side');
    formTreeEl = document.getElementById('fd-tree');
    filterInput = document.getElementById('fd-tree-filter');
    form = document.getElementById('formulariodinamico');
    jsonTreeEl = document.getElementById('fd-json-tree');
    tabsEl = document.getElementById('fd-side-tabs');
  }
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(init);

  async function init(){
    qs();
    if(!panel) return;
    injectFilterStyles();
    FORM_JSON_LOCAL = await loadFormJson();
    try{ const r=await fetch('json/form-types.json'); if(r.ok) TYPE_META=await r.json(); }catch{}
    bindUI();

    // NUEVO: materializa todas las estructuras del JSON en el DOM antes del Encabezado
    materializeMissingStructures();

    if(root?.classList.contains('design-mode')) panel.classList.remove('hidden');
    observeFormMutations();
    formBuildTree();
    jsonBuildTree();
    applyFilterAll();
  }

  async function loadFormJson(){
    if (window.FORM_JSON && Object.keys(window.FORM_JSON).length) {
      return JSON.parse(JSON.stringify(window.FORM_JSON));
    }
    const url = (window.FORM_CONFIG?.archivo_json) || 'json/formulariogenerico2.json';
    try{ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw 0; return await r.json(); }
    catch{ return { parametros:{}, fieldsets:{}, layout:{} }; }
  }

  // ===== FORM tree (DOM actual) =====
  function pickBody(g){ return g.querySelector(':scope > .card-body, :scope > .fd-fields-container') || g; }
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
  function ensureGroupId(g){ let id=g.getAttribute('data-group-id')||g.id; if(!id){id='g_'+Math.random().toString(36).slice(2,8);} g.setAttribute('data-group-id',id); return id; }
  function ensureFieldId(w){ let id=w.getAttribute('data-field-id')||w.querySelector('[name]')?.name||w.id; if(!id){id='f_'+Math.random().toString(36).slice(2,8);} w.setAttribute('data-field-id',id); return id; }
  function groupTitle(g){
    return (g.querySelector(':scope > legend, :scope > .card-header')?.textContent ||
            g.getAttribute('data-fieldset-name') || g.getAttribute('data-fieldset-key') || g.id || 'Grupo').trim();
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fieldIcon(t){ return (TYPE_META.field_types?.[t]?.icon) || fallbackField(t); }
  function fieldsetIcon(t){ return (TYPE_META.fieldset_types?.[t]?.icon) || fallbackGroup(t); }
  function fallbackField(t){
    if(['number','integer','decimal','currency','percent'].includes(t)) return 'fas fa-hashtag';
    if(['date','datetime','time'].includes(t)) return 'fas fa-calendar';
    if(['email'].includes(t)) return 'fas fa-envelope';
    if(['password'].includes(t)) return 'fas fa-key';
    if(['select','multiselect','select_remote','select2','select2_remote','selectdata'].includes(t)) return 'fas fa-list';
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

  function formBuildTree(){
    if(!formTreeEl || panel.classList.contains('hidden')) return;
    formTreeEl.innerHTML='';
    const top=getTopGroups();
    if(!top.length){ formTreeEl.innerHTML='<div class="text-muted small">Sin grupos</div>'; return; }
    const ul=document.createElement('ul'); ul.className='fd-tree-root';
    top.forEach(g=> ul.appendChild(buildGroupNode(g)));
    formTreeEl.appendChild(ul);
    enableDnDForm();
  }
  function buildGroupNode(g){
    ensureGroupId(g);
    const gid=g.getAttribute('data-group-id');
    const gtype=g.getAttribute('data-fieldset-type')||'group';
    const icon=fieldsetIcon(gtype);
    const li=document.createElement('li');
    li.dataset.node='group'; li.dataset.id=gid; li.className='fd-tree-group';
    li.innerHTML=`
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
    const body=pickBody(g);
    const childGroups=Array.from(body.children).filter(isGroup);
    const fields=Array.from(body.children).filter(isFieldWrap);
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
    const fid=w.getAttribute('data-field-id');
    const tipo=(w.getAttribute('data-field-type')||w.getAttribute('data-field-tipo')||w.querySelector('input,select,textarea')?.type||'text').toLowerCase();
    const icon=fieldIcon(tipo);
    const label=(w.querySelector('label')?.textContent||fid).trim();
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
  function enableDnDForm(){
    if(!window.Sortable) return;
    formTreeEl.querySelectorAll('ul').forEach(u=>{
      if(u._fdSortable) return;
      u._fdSortable=new Sortable(u,{group:'fd-tree-nested',handle:'.handle',animation:150,draggable:'> li',swapThreshold:0.65,onEnd:syncMoveForm});
    });
  }
  function syncMoveForm(evt){
    const item=evt.item, parentUl=item.parentElement, parentGroupLi=parentUl.closest('li[data-node="group"]');
    if(item.dataset.node==='group'){
      const live=form.querySelector('[data-group-id="'+CSS.escape(item.dataset.id)+'"]');
      const container = parentGroupLi ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]')) : form;
      container.appendChild(live);
      reorderMixed(parentUl);
    } else {
      const body = parentGroupLi ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]')) : form;
      reorderFields(parentUl, body);
    }
    formBuildTree();
  }
  function reorderMixed(ul){
    const parentGroupLi=ul.closest('li[data-node="group"]');
    const targetBody = parentGroupLi ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(parentGroupLi.dataset.id)+'"]')) : form;
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
    Array.from(ul.children).filter(li=>li.dataset.node==='field').forEach(li=>{
      const w=form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]');
      w && body.appendChild(w);
    });
  }

  // ===== JSON tree (archivo completo) =====
  function jsonBuildTree(){
    if(!jsonTreeEl || panel.classList.contains('hidden')) return;
    jsonTreeEl.innerHTML='';
    const rootUl=document.createElement('ul'); rootUl.className='fd-json-root';

    // Usa las claves reales del JSON (parametros, fieldsets, layout)
    ['parametros','fieldsets','layout'].forEach(topKey=>{
      const val = FORM_JSON_LOCAL?.[topKey];
      const node = buildJsonNode(topKey, val, topKey, false, true);
      rootUl.appendChild(node);
    });

    jsonTreeEl.appendChild(rootUl);
  }

  function buildJsonNode(key, value, path, parentIsArray=false, isTop=false){
    const li=document.createElement('li');
    const isArr=Array.isArray(value);
    const isObj=value && typeof value==='object' && !isArr;
    const hasChildren = isArr ? value.length>0 : (isObj ? Object.keys(value).length>0 : false);

    const keyLabel = parentIsArray
      ? (typeof value==='object' && value && (value.nombre || value.etiqueta || value.titulo) ? `${key}: ${value.nombre||value.etiqueta||value.titulo}` : String(key))
      : String(key);

    li.innerHTML = `
      <div class="fd-json-node ${isObj?'fd-json-type-object':''} ${isArr?'fd-json-type-array':''}" data-path="${escapeHtml(path)}">
        <span class="fd-json-toggle ${hasChildren?'':'empty'}">${hasChildren?'▾':''}</span>
        <span class="fd-json-key">${escapeHtml(keyLabel)}</span>
        ${(!isObj && !isArr) ? `<span class="fd-json-value ${valueClass(value)}" data-type="${valueType(value)}">${renderValue(value)}</span>` : `<span class="fd-json-badge">${isArr?('['+value.length+']'):'{'+Object.keys(value).length+'}'}</span>`}
        <span class="fd-json-actions ms-auto">
          ${(!isObj && !isArr)?'<button data-act="edit" title="Editar">✎</button>':''}
        </span>
      </div>
    `;

    if(hasChildren){
      const ul=document.createElement('ul');
      if(isArr){
        value.forEach((v,i)=>{
          const childPath = `${path}[${i}]`;
          ul.appendChild(buildJsonNode(String(i), v, childPath, true, false));
        });
      } else {
        Object.keys(value).forEach(k=>{
          const childPath = `${path}.${k}`;
          ul.appendChild(buildJsonNode(k, value[k], childPath, false, false));
        });
      }
      li.appendChild(ul);
    }
    return li;
  }

  function valueType(v){ if(v===null) return 'null'; if(Array.isArray(v)) return 'array'; return typeof v; }
  function valueClass(v){ return 'fd-type-'+valueType(v); }
  function renderValue(v){ const t=valueType(v); if(t==='boolean') return v?'true':'false'; if(t==='null') return 'null'; return String(v); }

  function startEdit(span){
    if(span.classList.contains('fd-editing')) return;
    const old=span.textContent, type=span.dataset.type;
    span.classList.add('fd-editing');
    const input=document.createElement('input'); input.type='text';
    input.value=(type==='string')?old.replace(/^"|"$/g,''):old;
    span.textContent=''; span.appendChild(input); input.focus(); input.select();
    const commit=()=>{
      let raw=input.value, val;
      if(type==='number'){ val=Number(raw); if(isNaN(val)) return cancel(); }
      else if(type==='boolean'){ val = raw.toLowerCase()==='true'; }
      else if(type==='null'){ val=null; }
      else { val=raw; }
      const path = span.closest('.fd-json-node').dataset.path;
      setJsonPathValue(FORM_JSON_LOCAL, path, val);
      span.className='fd-json-value '+valueClass(val);
      span.dataset.type=valueType(val);
      span.classList.remove('fd-editing');
      span.textContent=renderValue(val);
      dirtyJson=true;
      document.getElementById('fd-json-save')?.removeAttribute('disabled');
    };
    const cancel=()=>{ span.classList.remove('fd-editing'); span.textContent=old; };
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') commit(); else if(e.key==='Escape') cancel(); });
    input.addEventListener('blur', commit);
  }

  function setJsonPathValue(rootObj, path, val){
    const tokens=[];
    path.split('.').forEach(seg=>{
      const head = seg.match(/^[^\[]+/); if(head) tokens.push(head[0]);
      const idxs = seg.match(/\[\d+\]/g); idxs?.forEach(b=> tokens.push(Number(b.slice(1,-1))));
    });
    let obj=rootObj;
    for(let i=0;i<tokens.length-1;i++){
      obj = obj[tokens[i]];
      if(obj===undefined) return;
    }
    obj[tokens[tokens.length-1]] = val;
  }

  // ===== Filter (ambas vistas) =====
  function injectFilterStyles(){
    if (document.getElementById('fd-tree-filter-styles')) return;
    const st=document.createElement('style'); st.id='fd-tree-filter-styles';
    st.textContent = `
      #fd-tree-side .fd-filter-hide{ display:none !important; }
      #fd-tree-side .fd-filter-hit > .g-title,
      #fd-tree-side .fd-filter-hit > .f-item,
      #fd-tree-side .fd-filter-hit > .fd-json-node{ background:#fff3cd; }
    `;
    document.head.appendChild(st);
  }
  function applyFilterAll(){
    const term=(filterInput?.value||'').toLowerCase().trim();
    function expandAncestors(li, stop){
      let cur=li;
      while(cur && cur!==stop){
        if(cur.classList.contains('collapsed')){
          cur.classList.remove('collapsed');
          const tgl=cur.querySelector(':scope > .g-title .toggle, :scope > .fd-json-node .fd-json-toggle');
          if(tgl) tgl.textContent='▾';
        }
        cur=cur.parentElement.closest('li');
      }
    }
    // Form
    if(formTreeEl){
      formTreeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
      if(term){
        formTreeEl.querySelectorAll('li').forEach(li=>{
          const txt=li.querySelector('.txt')?.textContent.toLowerCase()||''; if(txt.includes(term)) li.classList.add('fd-filter-hit');
        });
        formTreeEl.querySelectorAll('.fd-filter-hit').forEach(li=> expandAncestors(li, formTreeEl));
        formTreeEl.querySelectorAll('li').forEach(li=>{
          if(li.classList.contains('fd-filter-hit')) return;
          if(li.querySelector('.fd-filter-hit')) return;
          li.classList.add('fd-filter-hide');
        });
      } else {
        formTreeEl.querySelectorAll('li[data-node="group"]').forEach(li=>{
          li.classList.remove('collapsed');
          const t=li.querySelector(':scope > .g-title .toggle'); if(t) t.textContent='▾';
        });
      }
    }
    // JSON
    if(jsonTreeEl){
      jsonTreeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
      if(term){
        jsonTreeEl.querySelectorAll('.fd-json-node').forEach(nd=>{
          const key=nd.querySelector('.fd-json-key')?.textContent.toLowerCase()||'';
          const val=nd.querySelector('.fd-json-value')?.textContent.toLowerCase()||'';
          const hit = key.includes(term) || val.includes(term);
          if(hit) nd.closest('li')?.classList.add('fd-filter-hit');
        });
        jsonTreeEl.querySelectorAll('.fd-filter-hit').forEach(li=> expandAncestors(li, jsonTreeEl));
        jsonTreeEl.querySelectorAll('li').forEach(li=>{
          if(li.classList.contains('fd-filter-hit')) return;
          if(li.querySelector('.fd-filter-hit')) return;
          li.classList.add('fd-filter-hide');
        });
      } else {
        jsonTreeEl.querySelectorAll('li').forEach(li=>{
          li.classList.remove('collapsed');
          const tg=li.querySelector(':scope > .fd-json-node .fd-json-toggle'); if(tg && !tg.classList.contains('empty')) tg.textContent='▾';
        });
      }
    }
  }

  // ===== Eventos =====
  function bindUI(){
    tabsEl?.addEventListener('click', e=>{
      const btn=e.target.closest('[data-tab]'); if(!btn) return; e.preventDefault();
      tabsEl.querySelectorAll('.nav-link').forEach(a=>a.classList.remove('active'));
      btn.classList.add('active');
      const tab=btn.dataset.tab;
      document.getElementById('fd-tree-wrapper-form')?.classList.toggle('d-none', tab!=='form');
      document.getElementById('fd-tree-wrapper-json')?.classList.toggle('d-none', tab!=='json');
      if(tab==='form') formBuildTree(); else jsonBuildTree();
      applyFilterAll();
    });

    filterInput?.addEventListener('input', applyFilterAll);

    // Form actions
    formTreeEl?.addEventListener('click', e=>{
      const btn=e.target.closest('button[data-act]'); if(btn){
        const li=e.target.closest('li[data-node]'); const act=btn.dataset.act;
        if(act==='add-group'){ let container = li ? pickBody(form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]')) : form; const fs=document.createElement('fieldset'); fs.setAttribute('data-fieldset-type','group'); fs.innerHTML='<legend>Nuevo Grupo</legend>'; container.appendChild(fs); formBuildTree(); }
        else if(act==='add-field'){ let body=form; if(li){ const glive=form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]'); body=pickBody(glive); } const fid='campo_'+Math.random().toString(36).slice(2,8); const wrap=document.createElement('div'); wrap.className='mb-3 fd-field-wrapper'; wrap.setAttribute('data-field-id',fid); wrap.setAttribute('data-field-type','text'); wrap.innerHTML=`<label class="form-label mb-1">Nuevo Campo</label><input name="${fid}" class="form-control" type="text">`; body.appendChild(wrap); formBuildTree(); }
        else if(act==='rename'){ const current=li.querySelector('.txt')?.textContent?.trim()||''; const v=prompt('Nuevo nombre:', current); if(!v) return; li.querySelector('.txt').textContent=v; if(li.dataset.node==='group'){ const live=form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]'); const lg=live?.querySelector(':scope > legend, :scope > .card-header'); if(lg) lg.textContent=v; } else { const live=form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]'); const lab=live?.querySelector('label'); if(lab) lab.textContent=v; } formBuildTree(); }
        else if(act==='delete'){ if(!confirm('Eliminar?')) return; if(li.dataset.node==='group') form.querySelector('[data-group-id="'+CSS.escape(li.dataset.id)+'"]')?.remove(); else form.querySelector('[data-field-id="'+CSS.escape(li.dataset.id)+'"]')?.remove(); formBuildTree(); }
        return;
      }
      const tgl=e.target.closest('.toggle'); if(tgl){ const li=e.target.closest('li[data-node="group"]'); if(li){ li.classList.toggle('collapsed'); tgl.textContent=li.classList.contains('collapsed')?'▸':'▾'; } }
    });

    // JSON actions
    jsonTreeEl?.addEventListener('click', e=>{
      const tgl=e.target.closest('.fd-json-toggle');
      if(tgl && !tgl.classList.contains('empty')){ const li=tgl.closest('li'); li.classList.toggle('collapsed'); tgl.textContent=li.classList.contains('collapsed')?'▸':'▾'; }
      const editBtn=e.target.closest('button[data-act="edit"]'); if(editBtn){ const valSpan=editBtn.closest('.fd-json-node').querySelector('.fd-json-value'); if(valSpan) startEdit(valSpan); }
      const valSpan = e.target.closest('.fd-json-value'); if(valSpan) startEdit(valSpan);
    });

    document.getElementById('fd-json-expand')?.addEventListener('click', ()=> jsonExpandCollapse(true));
    document.getElementById('fd-json-collapse')?.addEventListener('click', ()=> jsonExpandCollapse(false));
    document.getElementById('fd-json-save')?.addEventListener('click', ()=>{
      console.log('JSON a guardar:', FORM_JSON_LOCAL);
      dirtyJson=false; document.getElementById('fd-json-save')?.setAttribute('disabled','disabled');
      alert('Simulación guardado. Implementa el endpoint en servidor.');
    });

    document.getElementById('toggleTreeBtn')?.addEventListener('click', ()=>{
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden')){ formBuildTree(); jsonBuildTree(); applyFilterAll(); }
    });
    document.getElementById('closeTree')?.addEventListener('click', ()=> panel.classList.add('hidden'));

    document.getElementById('designModeToggle')?.addEventListener('change', e=>{
      const on=e.target.checked;
      root.classList.toggle('design-mode', on);
      if(on){ panel.classList.remove('hidden'); formBuildTree(); jsonBuildTree(); applyFilterAll(); }
      else panel.classList.add('hidden');
    });
  }

  function jsonExpandCollapse(expand){
    jsonTreeEl?.querySelectorAll('.fd-json-node .fd-json-toggle:not(.empty)').forEach(t=>{
      const li=t.closest('li');
      if(expand){ li.classList.remove('collapsed'); t.textContent='▾'; }
      else { li.classList.add('collapsed'); t.textContent='▸'; }
    });
  }

  function observeFormMutations(){
    if(!form) return;
    const mo=new MutationObserver(()=> formBuildTree());
    mo.observe(form, {childList:true, subtree:true});
  }

  // ================== NUEVO: Materializar JSON en el DOM ==================
  function materializeMissingStructures(){
    if(!form || !FORM_JSON_LOCAL) return;

    // Inicializa estructuras si faltan
    FORM_JSON_LOCAL.parametros = FORM_JSON_LOCAL.parametros || {};
    FORM_JSON_LOCAL.fieldsets  = FORM_JSON_LOCAL.fieldsets  || {};
    if (!('layout' in FORM_JSON_LOCAL)) FORM_JSON_LOCAL.layout = {};

    // Evitar duplicados en re-render
    const prev = form.querySelector('#fd-materialized');
    if(prev) prev.remove();

    // Siempre insertar al inicio del form (antes del Layout)
    const container = document.createElement('div');
    container.id = 'fd-materialized';
    container.className = 'fd-materialized-block';

    // 1) Parametros (recursivo)
    buildParametrosBlock(container, FORM_JSON_LOCAL.parametros || {});

    // 2) Fieldsets (wrapper + lista)
    buildFieldsetsBlock(container, FORM_JSON_LOCAL.fieldsets || {});

    // 3) Layout (editor JSON sencillo)
    buildLayoutBlock(container, FORM_JSON_LOCAL.layout);

    form.prepend(container);

    // Delegación de eventos
    container.addEventListener('change', onMaterializedChange);
    container.addEventListener('input', onMaterializedInput);
    container.addEventListener('click', onMaterializedClick);
  }

  // ---------- Parametros ----------
  function buildParametrosBlock(wrapper, obj){
    const fs = document.createElement('fieldset');
    fs.className = 'mb-3';
    fs.setAttribute('data-fieldset-type', 'group');
    fs.setAttribute('data-group-id', 'g_parametros');
    fs.innerHTML = `<legend>Parametros</legend>`;
    const body = document.createElement('div');
    body.className = 'fd-fields-container';

    addParamEditors(body, obj, 'parametros');
    fs.appendChild(body);
    wrapper.appendChild(fs);
  }

  function addParamEditors(parent, obj, basePath){
    Object.keys(obj || {}).forEach(key=>{
      const val = obj[key];
      const path = `${basePath}.${key}`;
      if(Array.isArray(val)){
        const wrap = document.createElement('div');
        wrap.className = 'mb-2 fd-field-wrapper';
        wrap.setAttribute('data-field-id', 'f_'+path.replace(/[^\w]+/g,'_'));
        wrap.setAttribute('data-field-type','textarea');
        wrap.innerHTML = `
          <label class="form-label">${key}</label>
          <textarea class="form-control" data-json-path="${path}" rows="3">${escapeHtml(JSON.stringify(val))}</textarea>
          <small class="text-muted">Formato JSON</small>`;
        parent.appendChild(wrap);
      } else if(val !== null && typeof val === 'object'){
        const subFs = document.createElement('fieldset');
        subFs.className = 'mb-2';
        subFs.setAttribute('data-fieldset-type','group');
        subFs.setAttribute('data-group-id', 'g_'+path.replace(/[^\w]+/g,'_'));
        subFs.innerHTML = `<legend>${key}</legend>`;
        const subBody = document.createElement('div');
        subBody.className = 'fd-fields-container';
        addParamEditors(subBody, val, path);
        subFs.appendChild(subBody);
        parent.appendChild(subFs);
      } else {
        parent.appendChild(createPrimitiveEditor(path, key, val));
      }
    });
  }

  function createPrimitiveEditor(path, key, val){
    const t = typeof val;
    const wrap = document.createElement('div');
    wrap.className = 'mb-2 fd-field-wrapper';
    wrap.setAttribute('data-field-id', 'f_'+path.replace(/[^\w]+/g,'_'));
    wrap.innerHTML = `<label class="form-label">${key}</label>`;
    let inputHtml = '';
    if(t === 'boolean'){
      inputHtml = `<div class="form-check">
        <input class="form-check-input" type="checkbox" data-json-path="${path}" ${val?'checked':''}>
        <label class="form-check-label">Activo</label>
      </div>`;
      wrap.setAttribute('data-field-type','checkbox');
    } else if(t === 'number'){
      inputHtml = `<input class="form-control" type="number" step="any" data-json-path="${path}" value="${escapeHtml(val)}">`;
      wrap.setAttribute('data-field-type','number');
    } else {
      const v = (val===null)?'':String(val);
      const asTextarea = v.length > 120 || /\n/.test(v);
      if(asTextarea){
        inputHtml = `<textarea class="form-control" data-json-path="${path}" rows="3">${escapeHtml(v)}</textarea>`;
        wrap.setAttribute('data-field-type','textarea');
      } else {
        inputHtml = `<input class="form-control" type="text" data-json-path="${path}" value="${escapeHtml(v)}">`;
        wrap.setAttribute('data-field-type','text');
      }
    }
    wrap.insertAdjacentHTML('beforeend', inputHtml);
    return wrap;
  }

  // ---------- Fieldsets ----------
  function buildFieldsetsBlock(wrapper, fsObj){
    const fsWrap = document.createElement('fieldset');
    fsWrap.className = 'mb-3';
    fsWrap.setAttribute('data-fieldset-type','group');
    fsWrap.setAttribute('data-group-id','g_fieldsets');
    fsWrap.innerHTML = `
      <legend class="d-flex justify-content-between align-items-center">
        Fieldsets
        <button type="button" class="btn btn-sm btn-primary" data-action="add-fieldset">Agregar fieldset</button>
      </legend>`;
    const body = document.createElement('div');
    body.className = 'fd-fields-container';

    Object.keys(fsObj).forEach((fsKey, idx)=>{
      body.appendChild(buildFieldsetEditor(fsKey, fsObj[fsKey], idx));
    });

    fsWrap.appendChild(body);
    wrapper.appendChild(fsWrap);
  }

  function buildFieldsetEditor(fsKey, fsObj, idx){
    // contenedor del fieldset + propiedades + lista de campos
    const fs = document.createElement('fieldset');
    fs.className = 'mb-3 fd-fieldset';
    fs.setAttribute('data-fieldset-type', fsObj?.tipo || 'group');
    fs.setAttribute('data-group-id', 'fs_'+fsKey);
    fs.setAttribute('data-fieldset-key', fsKey);

    const titulo = fsObj?.titulo || fsObj?.legend || fsKey;
    fs.innerHTML = `
      <legend class="d-flex justify-content-between align-items-center">
        ${escapeHtml(titulo)}
        <span class="btn-group">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-action="add-field" data-fs="${escapeHtml(fsKey)}">Agregar campo</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-fieldset" data-fs="${escapeHtml(fsKey)}">Eliminar</button>
        </span>
      </legend>`;

    // Propiedades del fieldset (+ extra)
    const props = document.createElement('div');
    props.className = 'row g-2 mb-2 px-2';
    props.innerHTML = `
      <div class="col-4"><label class="form-label">key</label><input class="form-control" data-prop-path="__fieldset_key__:${escapeHtml(fsKey)}" value="${escapeHtml(fsKey)}"></div>
      <div class="col-4"><label class="form-label">titulo/legend</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.titulo" value="${escapeHtml(titulo)}"></div>
      <div class="col-4"><label class="form-label">tipo</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.tipo" value="${escapeHtml(fsObj?.tipo||'group')}"></div>
    `;
    // Propiedades extra del fieldset
    props.appendChild(renderExtraProps(fsObj, `fieldsets.${fsKey}`, ['titulo','legend','tipo','campos']));

    const body = document.createElement('div');
    body.className = 'fd-fields-container';

    const campos = Array.isArray(fsObj?.campos) ? fsObj.campos : [];
    campos.forEach((campo, i)=>{
      const fieldEl = buildFieldFromJson(fsKey, campo, i);
      body.appendChild(fieldEl);
    });

    fs.appendChild(props);
    fs.appendChild(body);
    return fs;
  }

  // ---------- Campo + editor de TODAS las propiedades ----------
  function buildFieldFromJson(fsKey, campo, idx){
    const tipo = String(campo?.tipo || campo?.type || 'text').toLowerCase();
    const nombre = campo?.nombre || campo?.name || ('campo_'+(idx+1));
    const etiqueta = campo?.etiqueta || campo?.label || nombre;
    const requerido = !!(campo?.requerido || campo?.required);
    const placeholder = campo?.placeholder || '';
    const value = (campo?.valor ?? campo?.value ?? '');
    const opciones = campo?.opciones || campo?.options || [];

    const wrap = document.createElement('div');
    wrap.className = 'mb-3 fd-field-wrapper';
    wrap.setAttribute('data-field-id', nombre);
    wrap.setAttribute('data-field-type', tipo);
    wrap.setAttribute('data-fs-key', fsKey);
    wrap.setAttribute('data-field-index', String(idx));

    const labelHtml = `<label class="form-label mb-1">${escapeHtml(etiqueta)}${requerido?'<span class="text-danger">*</span>':''}</label>`;
    let controlHtml = '';
    if(['textarea'].includes(tipo)){
      controlHtml = `<textarea name="${escapeHtml(nombre)}" class="form-control" placeholder="${escapeHtml(placeholder)}">${escapeHtml(String(value??''))}</textarea>`;
    } else if(['select','selectdata','select2','select_remote','select2_remote','multiselect'].includes(tipo)){
      const opts = Array.isArray(opciones) ? opciones : String(opciones||'').split(',').map(s=>s.trim()).filter(Boolean);
      const multiple = (tipo==='multiselect') ? ' multiple' : '';
      const optsHtml = opts.map(o=>{
        const ov = (typeof o==='object') ? (o.value ?? o.id ?? o.text ?? String(o)) : String(o);
        const ot = (typeof o==='object') ? (o.text ?? o.label ?? ov) : String(o);
        const sel = Array.isArray(value) ? (value.includes(ov)?' selected':'') : (String(value)===String(ov)?' selected':'');
        return `<option value="${escapeHtml(ov)}"${sel}>${escapeHtml(ot)}</option>`;
      }).join('');
      controlHtml = `<select name="${escapeHtml(nombre)}" class="form-select"${multiple}>${optsHtml}</select>`;
    } else if(['checkbox'].includes(tipo)){
      const checked = (value===true || value==='true') ? 'checked':'';
      controlHtml = `<div class="form-check">
        <input type="checkbox" class="form-check-input" name="${escapeHtml(nombre)}" ${checked}>
        <label class="form-check-label">${escapeHtml(placeholder || 'Seleccionar')}</label>
      </div>`;
    } else if(['radio'].includes(tipo)){
      const opts = Array.isArray(opciones) ? opciones : String(opciones||'').split(',').map(s=>s.trim()).filter(Boolean);
      controlHtml = opts.map((o,i)=>{
        const ov = (typeof o==='object') ? (o.value ?? o.id ?? o.text ?? String(o)) : String(o);
        const ot = (typeof o==='object') ? (o.text ?? o.label ?? ov) : String(o);
        const checked = String(value)===String(ov) ? 'checked':'';
        return `<div class="form-check">
          <input class="form-check-input" type="radio" name="${escapeHtml(nombre)}" value="${escapeHtml(ov)}" id="${escapeHtml(nombre)}_${i}" ${checked}>
          <label class="form-check-label" for="${escapeHtml(nombre)}_${i}">${escapeHtml(ot)}</label>
        </div>`;
      }).join('');
    } else if(['date','datetime','time','email','number','password','file','url','color','tel','range'].includes(tipo)){
      const typeAttr = (tipo==='datetime')?'datetime-local':tipo;
      const valAttr = (value!==undefined && value!==null) ? ` value="${escapeHtml(String(value))}"` : '';
      controlHtml = `<input name="${escapeHtml(nombre)}" class="form-control" type="${typeAttr}" placeholder="${escapeHtml(placeholder)}"${valAttr}${tipo==='number'?' step="any"':''}>`;
    } else {
      controlHtml = `<input name="${escapeHtml(nombre)}" class="form-control" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(String(value??''))}">`;
    }

    const propsKnown = `
      <div class="row g-2 mt-1">
        <div class="col-6"><label class="form-label">nombre</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.campos[${idx}].nombre" value="${escapeHtml(nombre)}"></div>
        <div class="col-6"><label class="form-label">etiqueta</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.campos[${idx}].etiqueta" value="${escapeHtml(etiqueta)}"></div>
        <div class="col-6"><label class="form-label">tipo</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.campos[${idx}].tipo" value="${escapeHtml(tipo)}"></div>
        <div class="col-6"><label class="form-label">placeholder</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.campos[${idx}].placeholder" value="${escapeHtml(placeholder)}"></div>
        <div class="col-6"><label class="form-label">valor</label><input class="form-control" data-prop-path="fieldsets.${fsKey}.campos[${idx}].valor" value="${escapeHtml(String(value??''))}"></div>
        <div class="col-3 form-check mt-4 ms-2"><input class="form-check-input" type="checkbox" data-prop-path="fieldsets.${fsKey}.campos[${idx}].requerido" ${requerido?'checked':''}> <label class="form-check-label">requerido</label></div>
        <div class="col-12"><label class="form-label">opciones (coma o JSON)</label><textarea class="form-control" rows="2" data-prop-path="fieldsets.${fsKey}.campos[${idx}].opciones">${escapeHtml(Array.isArray(opciones)?JSON.stringify(opciones):String(opciones||''))}</textarea></div>
      </div>
    `;

    // Propiedades extra (todo lo demás)
    const extras = renderExtraProps(campo, `fieldsets.${fsKey}.campos[${idx}]`, ['nombre','name','etiqueta','label','tipo','type','placeholder','valor','value','requerido','required','opciones','options']);

    const propsHtml = `
      <details class="mt-1">
        <summary>Propiedades</summary>
        ${propsKnown}
        <div class="mt-2">
          <div class="d-flex justify-content-between align-items-center">
            <strong>Propiedades extra</strong>
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="add-prop" data-path="fieldsets.${fsKey}.campos[${idx}]">Agregar propiedad</button>
          </div>
          ${extras.outerHTML}
          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-field" data-path="fieldsets.${fsKey}.campos[${idx}]">Eliminar campo</button>
          </div>
        </div>
      </details>`;

    wrap.innerHTML = `${labelHtml}${controlHtml}${propsHtml}`;
    return wrap;
  }

  // Renderiza pares clave/valor para props extra (objetos/arrays como JSON)
  function renderExtraProps(obj, basePath, excludeKeys){
    const known = new Set(excludeKeys || []);
    const frag = document.createElement('div');
    frag.className = 'row g-2 mt-1';
    Object.keys(obj || {}).filter(k=> !known.has(k)).forEach(k=>{
      const val = obj[k];
      const path = `${basePath}.${k}`;
      if(val !== null && typeof val === 'object'){
        const col = document.createElement('div');
        col.className = 'col-12';
        col.innerHTML = `<label class="form-label">${k}</label>
          <textarea class="form-control" rows="2" data-prop-path="${path}">${escapeHtml(JSON.stringify(val))}</textarea>
          <small class="text-muted">Formato JSON</small>`;
        frag.appendChild(col);
      } else {
        const col = document.createElement('div');
        col.className = 'col-6';
        col.innerHTML = `<label class="form-label">${k}</label>
          <input class="form-control" data-prop-path="${path}" value="${escapeHtml(String(val??''))}">`;
        frag.appendChild(col);
      }
    });
    return frag;
  }

  // ---------- Layout (JSON editor) ----------
  function buildLayoutBlock(wrapper, layout){
    const fs = document.createElement('fieldset');
    fs.className = 'mb-3';
    fs.setAttribute('data-fieldset-type','group');
    fs.setAttribute('data-group-id','g_layout');
    fs.innerHTML = `<legend>Layout</legend>`;
    const body = document.createElement('div');
    body.className = 'fd-fields-container';
    const wrap = document.createElement('div');
    wrap.className = 'mb-2 fd-field-wrapper';
    wrap.setAttribute('data-field-id','f_layout_json');
    wrap.setAttribute('data-field-type','textarea');
    wrap.innerHTML = `
      <label class="form-label">Estructura Layout (JSON)</label>
      <textarea class="form-control" rows="6" data-json-path="layout">${escapeHtml(JSON.stringify(layout??{}, null, 2))}</textarea>
      <small class="text-muted">Edita la estructura completa del layout</small>`;
    body.appendChild(wrap);
    fs.appendChild(body);
    wrapper.appendChild(fs);
  }

  // ---------- Delegación de clicks (agregar/eliminar) ----------
  function onMaterializedClick(e){
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action;

    if(action === 'add-fieldset'){
      addNewFieldset();
      return;
    }
    if(action === 'delete-fieldset'){
      const fsKey = btn.dataset.fs;
      if(!fsKey) return;
      if(confirm(`Eliminar fieldset "${fsKey}"?`)){
        delete FORM_JSON_LOCAL.fieldsets[fsKey];
        materializeMissingStructures();
        formBuildTree();
      }
      return;
    }
    if(action === 'add-field'){
      const fsKey = btn.dataset.fs;
      if(!fsKey) return;
      addNewField(fsKey);
      return;
    }
    if(action === 'add-prop'){
      const basePath = btn.dataset.path; // p.ej.: fieldsets.datos.campos[0]
      const key = prompt('Nombre de la propiedad:');
      if(!key) return;
      const fullPath = `${basePath}.${key}`;
      setJsonPathValue(FORM_JSON_LOCAL, fullPath, '');
      materializeMissingStructures();
      formBuildTree();
      return;
    }
    if(action === 'delete-field'){
      const basePath = btn.dataset.path; // fieldsets.X.campos[IDX]
      // Quitamos el índice del array
      const m = basePath.match(/^(.*\.campos)\[(\d+)\]$/);
      if(!m) return;
      const arrPath = m[1], idx = Number(m[2]);
      const arr = getJsonPathValue(FORM_JSON_LOCAL, arrPath);
      if(Array.isArray(arr)){
        if(confirm('Eliminar este campo?')){
          arr.splice(idx,1);
          materializeMissingStructures();
          formBuildTree();
        }
      }
      return;
    }
  }

  function addNewFieldset(){
    let key = prompt('Clave del fieldset (sin espacios):','nuevo_fieldset');
    if(!key) return;
    key = key.replace(/\s+/g,'_');
    if(FORM_JSON_LOCAL.fieldsets[key]){
      alert('Ya existe un fieldset con esa clave.');
      return;
    }
    FORM_JSON_LOCAL.fieldsets[key] = { titulo: key, tipo:'group', campos: [] };
    materializeMissingStructures();
    formBuildTree();
  }

  function addNewField(fsKey){
    const fs = FORM_JSON_LOCAL.fieldsets[fsKey];
    if(!fs) return;
    fs.campos = Array.isArray(fs.campos) ? fs.campos : [];
    const base = 'campo_'+(fs.campos.length+1);
    fs.campos.push({
      nombre: base, etiqueta: base, tipo:'text',
      placeholder:'', valor:'', requerido:false, opciones:[]
    });
    materializeMissingStructures();
    formBuildTree();
  }

  // Utilidad para leer un path JSON
  function getJsonPathValue(rootObj, path){
    try{
      const tokens=[];
      path.split('.').forEach(seg=>{
        const head = seg.match(/^[^\[]+/); if(head) tokens.push(head[0]);
        const idxs = seg.match(/\[\d+\]/g); idxs?.forEach(b=> tokens.push(Number(b.slice(1,-1))));
      });
      let obj=rootObj;
      for(let i=0;i<tokens.length;i++){
        obj = obj[tokens[i]];
        if(obj===undefined) return undefined;
      }
      return obj;
    }catch{return undefined;}
  }

  function onMaterializedChange(e){
    const t = e.target;

    // Parametros o Layout via data-json-path
    if(t.hasAttribute('data-json-path')){
      const path = t.getAttribute('data-json-path');
      let val = (t.type==='checkbox') ? t.checked : t.value;
      if(t.tagName==='TEXTAREA'){
        try{ val = JSON.parse(t.value); }catch{ /* queda string */ }
      }
      setJsonPathValue(FORM_JSON_LOCAL, path, coerceValue(val, t));
      return;
    }

    // Propiedades de fieldsets/campos via data-prop-path
    if(t.hasAttribute('data-prop-path')){
      const path = t.getAttribute('data-prop-path');

      // Cambio de key del fieldset
      if(path.startsWith('__fieldset_key__:')){
        const oldKey = path.split(':')[1];
        const newKey = (t.value||'').trim().replace(/\s+/g,'_');
        if(!newKey || newKey===oldKey) return;
        if(FORM_JSON_LOCAL.fieldsets[newKey]){
          alert('Ya existe un fieldset con esa clave.');
          t.value = oldKey;
          return;
        }
        FORM_JSON_LOCAL.fieldsets[newKey] = FORM_JSON_LOCAL.fieldsets[oldKey];
        delete FORM_JSON_LOCAL.fieldsets[oldKey];
        materializeMissingStructures();
        formBuildTree();
        return;
      }

      let val = (t.type==='checkbox') ? t.checked : t.value;
      // opciones como array si es JSON válido, si no, split por coma
      if(/\.opciones$|\.options$/.test(path)){
        try{ val = JSON.parse(val); }
        catch{ val = String(val).split(',').map(s=>s.trim()).filter(Boolean); }
      } else {
        // si editor extra es textarea y parece JSON, intenta parsear
        if(t.tagName==='TEXTAREA'){
          try{ val = JSON.parse(t.value); }catch{ /* queda string */ }
        }
      }
      setJsonPathValue(FORM_JSON_LOCAL, path, coerceValue(val, t));

      // Si cambia algo relevante, re-render
      if(/\.etiqueta$|\.label$|\.nombre$|\.name$|\.tipo$|\.type$|\.placeholder$|\.valor$|\.value$|\.requerido$|\.required$|\.opciones$|\.options$|^fieldsets\.[^.]+\.titulo$|^fieldsets\.[^.]+\.legend$/.test(path)){
        materializeMissingStructures();
        formBuildTree();
      }
    }
  }

  function onMaterializedInput(e){
    // opcional: live update
  }

  function coerceValue(val, el){
    if(el?.type==='number'){
      const n = Number(val);
      return isNaN(n) ? val : n;
    }
    return val;
  }
})();
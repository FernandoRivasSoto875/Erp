/* =========================================================
   FORMULARIO DINÁMICO - UNIFICADO
   - Complementa lógica existente (no sobreescribe si ya existe)
   - Prioriza funciones ya definidas en este archivo antes de cargar
   - Añade: modo diseño, árbol JSON (fallback), guardado layout, DnD, toasts
   ========================================================= */
(function(window, document){
  'use strict';

  const FD = window.FD || {};
  window.FD = FD;

  FD.state = Object.assign({
    designMode: false,
    saving: false,
    dirty: false
  }, FD.state || {});

  if(!FD.$) FD.$ = function(sel, root=document){ return root.querySelector(sel); };
  if(!FD.$all) FD.$all = function(sel, root=document){ return Array.from(root.querySelectorAll(sel)); };

  if(!FD.toast){
    FD.toast = function(msg, type='info'){
      const box = document.createElement('div');
      box.className = 'alert alert-'+mapType(type);
      box.textContent = msg;
      Object.assign(box.style, {
        position:'fixed',right:'12px',bottom:'12px',zIndex:99999,minWidth:'200px'
      });
      document.body.appendChild(box);
      setTimeout(()=>box.remove(), 4000);
      function mapType(t){
        switch(t){
          case 'success':return 'success';
          case 'danger': return 'danger';
          case 'warning':return 'warning';
          default: return 'secondary';
        }
      }
    };
  }

  if(!FD.markDirty){
    FD.markDirty = function(){ FD.state.dirty = true; document.body.classList.add('fd-layout-dirty'); };
  }

  if(!FD.setDesignMode){
    FD.setDesignMode = function(on){
      FD.state.designMode = !!on;
      document.body.classList.toggle('fd-design-mode', on);
      const saveBtn = FD.$('#saveLayoutBtn');
      if(saveBtn) saveBtn.toggleAttribute('disabled', !on);
      if(on && typeof FD.rebuildFormTree === 'function'){
        try{ FD.rebuildFormTree(); }catch(e){ console.warn(e); }
      }
    };
  }

  function bindDesignToggle(){
    const t = FD.$('#designModeToggle');
    if(!t) return;
    t.addEventListener('change', ()=> FD.setDesignMode(t.checked));
    if(t.checked) FD.setDesignMode(true);
  }

  function ensureJsonTree(){
    if(typeof FD.renderJsonTree === 'function') return;
    FD.renderJsonTree = function(){
      const container = FD.$('#fd-json-tree');
      if(!container) return;
      const DATA = window.FORM_JSON || readEmbeddedJson();
      if(!DATA){ container.textContent='Sin JSON'; return; }
      container.innerHTML = '';
      const rootUl = document.createElement('ul');
      rootUl.appendChild(buildNode('parametros', DATA.parametros||{}, 'parametros', true));
      rootUl.appendChild(buildNode('fieldsets', DATA.fieldsets||{}, 'fieldsets', false));
      rootUl.appendChild(buildNode('layout', DATA.layout||{}, 'layout', false));
      container.appendChild(rootUl);
      container.addEventListener('click', onTreeClick);
      const filt = FD.$('#fd-tree-filter');
      if(filt) filt.addEventListener('input', filterTree);
    };
  }

  function buildNode(key, value, path, editable){
    const li=document.createElement('li');
    const isArr=Array.isArray(value);
    const isObj=value && typeof value==='object' && !isArr;
    const hasCh = isArr ? value.length>0 : (isObj ? Object.keys(value).length>0 : false);
    li.innerHTML =
      '<div class="fd-json-node" data-path="'+escapeHtml(path)+'" data-editable="'+(editable?'1':'0')+'">'
      + '<span class="fd-json-toggle '+(hasCh?'':'empty')+'">'+(hasCh?'▾':'')+'</span>'
      + '<span class="fd-json-key">'+escapeHtml(key)+'</span>'
      + ( (!isObj && !isArr)
          ? '<span class="fd-json-value '+valClass(value)+'" data-type="'+valType(value)+'">'+renderVal(value)+'</span>'
          : '<span class="fd-json-badge">'+(isArr?'['+value.length+']':'{'+Object.keys(value).length+'}')+'</span>')
      + '</div>';
    if(hasCh){
      const ul=document.createElement('ul');
      if(isArr){
        value.forEach(function(v,i){ ul.appendChild(buildNode(String(i), v, path+'['+i+']', editable)); });
      } else {
        Object.keys(value).forEach(function(k){ ul.appendChild(buildNode(k, value[k], path+'.'+k, editable)); });
      }
      li.appendChild(ul);
    }
    return li;
  }

  function onTreeClick(e){
    const tg = e.target.closest('.fd-json-toggle');
    if(tg){
      if(tg.classList.contains('empty')) return;
      const li=tg.closest('li');
      li.classList.toggle('collapsed');
      tg.textContent = li.classList.contains('collapsed')?'▸':'▾';
      return;
    }
    const val = e.target.closest('.fd-json-value');
    if(!val) return;
    const node = val.closest('.fd-json-node');
    if(node.dataset.editable!=='1') return;
    inlineEdit(val, node.dataset.path);
  }

  function inlineEdit(span, path){
    if(span.classList.contains('fd-editing')) return;
    const old = span.textContent;
    const type = span.dataset.type;
    span.classList.add('fd-editing');
    const inp=document.createElement('input');
    inp.type='text';
    inp.value = type==='string'? old.replace(/^"|"$/g,''):old;
    span.textContent='';
    span.appendChild(inp);
    inp.focus(); inp.select();
    const commit=function(){
      let raw=inp.value, v;
      try{
        if(type==='number'){ v=Number(raw); if(isNaN(v)) throw 0; }
        else if(type==='boolean'){ v=/^true$/i.test(raw); }
        else if(type==='null'){ v=null; }
        else v=raw;
        setPath(window.FORM_JSON || readEmbeddedJson(), path, v);
        span.className='fd-json-value '+valClass(v);
        span.dataset.type=valType(v);
        span.textContent=renderVal(v);
        span.classList.remove('fd-editing');
        FD.markDirty();
      }catch(err){
        cancel();
      }
    };
    const cancel=function(){
      span.classList.remove('fd-editing');
      span.textContent=old;
    };
    inp.addEventListener('keydown', function(ev){
      if(ev.key==='Enter') commit();
      else if(ev.key==='Escape') cancel();
    });
    inp.addEventListener('blur', commit);
  }

  function filterTree(){
    const term = (this.value||'').toLowerCase().trim();
    const root = FD.$('#fd-json-tree'); if(!root) return;
    root.querySelectorAll('li').forEach(function(li){ li.classList.remove('fd-filter-hide','fd-filter-hit'); });
    if(!term) return;
    root.querySelectorAll('.fd-json-node').forEach(function(nd){
      const k = (nd.querySelector('.fd-json-key')||{}).textContent || '';
      const v = (nd.querySelector('.fd-json-value')||{}).textContent || '';
      const hit = k.toLowerCase().includes(term) || v.toLowerCase().includes(term);
      if(hit){
        const li = nd.closest('li');
        li.classList.add('fd-filter-hit');
        let cur=li;
        while(cur){
          cur.classList.remove('collapsed');
          const tog = cur.querySelector(':scope > .fd-json-node .fd-json-toggle');
            if(tog && !tog.classList.contains('empty')) tog.textContent='▾';
          cur = cur.parentElement && cur.parentElement.closest ? cur.parentElement.closest('li') : null;
        }
      }
    });
    root.querySelectorAll('li').forEach(function(li){
      if(li.classList.contains('fd-filter-hit')) return;
      if(li.querySelector('.fd-filter-hit')) return;
      li.classList.add('fd-filter-hide');
    });
  }

  function bindTreeToggle(){
    const btn = FD.$('#toggleTreeBtn');
    const panel = FD.$('#fd-tree-side');
    if(!btn || !panel) return;
    btn.addEventListener('click', function(){
      panel.style.display = (panel.style.display==='none' || !panel.style.display)?'block':'none';
    });
  }

  if(!FD.buildSavePayload){
    FD.buildSavePayload = function(){
      const base = window.FORM_JSON || readEmbeddedJson() || {};
      if(typeof FD.serializeLayoutFromDom === 'function'){
        try { base.layout = FD.serializeLayoutFromDom(); }
        catch(e){ console.warn('serializeLayoutFromDom error', e); }
      }
      return base;
    };
  }

  function bindSaveLayout(){
    const btn = FD.$('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', function(){
      if(FD.state.saving) return;
      const payload = FD.buildSavePayload();
      if(!payload){ FD.toast('Sin datos para guardar','warning'); return; }
      FD.state.saving = true;
      btn.disabled = true;
      fetch('ajax/guardar_layout.php',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      .then(function(r){ return r.json().catch(function(){ return {ok:false,error:'Respuesta no JSON'}; }); })
      .then(function(res){
        if(res.ok){ FD.toast('Layout guardado','success'); FD.state.dirty=false; }
        else FD.toast(res.error||'Error al guardar','danger');
      })
      .catch(function(err){
        console.error(err);
        FD.toast('Error de red','danger');
      })
      .finally(function(){
        FD.state.saving=false;
        btn.disabled=false;
      });
    });
  }

  function initDnD(){
    if(typeof Sortable==='undefined') return;
    FD.$all('[data-layout-container] .row').forEach(function(row){
      Sortable.create(row,{
        group:'fd-cols',
        draggable:'> [class*="col-"]',
        animation:150,
        onEnd: function(){ FD.markDirty(); }
      });
    });
  }

  function initSectionDnD(){
    if(typeof Sortable==='undefined') return;
    const container = FD.$('.fd-form-area form');
    if(!container) return;
    Sortable.create(container,{
      handle: '.fd-section',
      draggable: '.fd-section',
      animation: 150,
      onEnd(){ FD.markDirty(); if(FD.serializeLayoutFromDom) FD.serializeLayoutFromDom(); }
    });
  }
  FD.afterInit = (function(prev){
    return function(){
      prev && prev();
      if(FD.state.designMode) initSectionDnD();
    };
  })(FD.afterInit);

  function setPath(root, path, val){
    const toks=[];
    path.split('.').forEach(function(seg){
      const head=seg.match(/^[^\[]+/); if(head) toks.push(head[0]);
      const idxs=seg.match(/\[\d+\]/g); idxs && idxs.forEach(function(b){ toks.push(Number(b.slice(1,-1))); });
    });
    let o=root;
    for(var i=0;i<toks.length-1;i++){ if(o==null) return; o=o[toks[i]]; }
    if(o!=null) o[toks[toks.length-1]]=val;
  }
  function valType(v){ if(v===null) return 'null'; if(Array.isArray(v)) return 'array'; return typeof v; }
  function valClass(v){ return 'fd-type-'+valType(v); }
  function renderVal(v){ var t=valType(v); if(t==='boolean') return v?'true':'false'; if(t==='null') return 'null'; return String(v); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function readEmbeddedJson(){
    const node = FD.$('#fd-data');
    if(!node) return null;
    try { return JSON.parse(node.getAttribute('data-form-json')||'{}'); }
    catch(e){ return {}; }
  }
  FD.readEmbeddedJson = FD.readEmbeddedJson || readEmbeddedJson;

  function init(){
    bindDesignToggle();
    bindTreeToggle();
    ensureJsonTree();
    if(FD.renderJsonTree) FD.renderJsonTree();
    bindSaveLayout();
    initDnD();
    // sincroniza estado inicial si checkbox viene marcado
    const t = FD.$('#designModeToggle');
    if(t && t.checked) FD.setDesignMode(true);
    if(FD.state.designMode){
      const panel = FD.$('#fd-tree-side');
      if(panel) panel.style.display='block';
    }
    if(typeof FD.afterInit === 'function'){
      try { FD.afterInit(); } catch(e){ console.warn('afterInit error', e); }
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function ensureTreeApp(){
    const host = FD.$('#fd-json-tree-app');
    if(!host) return;
    if(host.querySelector('iframe')) {
      host.classList.toggle('d-none');
      return;
    }
    const ifr=document.createElement('iframe');
    ifr.src='arboljson/index.php';
    ifr.className='w-100 border-0';
    ifr.style.minHeight='450px';
    host.appendChild(ifr);
    window.addEventListener('message', e=>{
      if(!e.data || !e.data.fdTree) return;
      // sincronizar cambios del árbol
      if(e.data.type==='updateJSON' && e.data.payload){
         window.FORM_JSON = e.data.payload;
         FD.markDirty();
         // opcional: re-render
      }
    });
  }
  document.addEventListener('click', e=>{
    if(e.target.id==='toggleTreeBtn') ensureTreeApp();
  });

})(window, document);



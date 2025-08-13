/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Implementa Modo Diseño: al activarse muestra y monta el Árbol JSON y habilita controles.
   No elimina funcionalidades existentes; sólo complementa.
*/
(function(w,d){
  'use strict';

  const FD = w.FD || (w.FD={});
  FD.state = Object.assign({ designMode:false, dirty:false, treeLoaded:false, treeError:false, autoTreeOnFirstDesign:true }, FD.state||{});

  function getNode(){ return d.getElementById('fd-data'); }
  function getHost(){ return d.getElementById('fd-json-tree-app'); }
  function btnTree(){ return d.getElementById('toggleTreeBtn'); }
  function btnSave(){ return d.getElementById('saveLayoutBtn'); }
  function toggle(){ return d.getElementById('designModeToggle'); }

  function getJSON(){
    const n = getNode(); if(!n) return {};
    try{ return JSON.parse(n.getAttribute('data-form-json')||'{}'); }catch{ return {}; }
  }
  function setJSON(o){ const n=getNode(); if(n) n.setAttribute('data-form-json', JSON.stringify(o)); }
  FD.getFormJSON = FD.getFormJSON || getJSON;
  FD.setFormJSON = FD.setFormJSON || setJSON;
  FD.serializeLayoutFromDom = FD.serializeLayoutFromDom || function(){ return getJSON().layout || []; };
  FD.buildSavePayload = FD.buildSavePayload || function(){ const data=getJSON(); data.layout=FD.serializeLayoutFromDom(); return data; };
  FD.markDirty = FD.markDirty || function(){ FD.state.dirty=true; d.body.classList.add('fd-layout-dirty'); };
  w.addEventListener('beforeunload', e=>{ if(FD.state.dirty){ e.preventDefault(); e.returnValue=''; } });

  function updateControls(){
    const on=FD.state.designMode;
    const t=btnTree(), s=btnSave(), host=getHost();
    [t,s].forEach(b=>{ if(!b) return; b.classList.toggle('d-none',!on); b.toggleAttribute('disabled',!on); b.setAttribute('aria-hidden', on?'false':'true'); });
    if(host) host.classList.toggle('d-none', !on && !FD.state.treeLoaded);
  }

  FD.setDesignMode=function(on){
    on=!!on;
    if(FD.state.designMode && !on && FD.state.dirty){
      if(!w.confirm('Hay cambios sin guardar. ¿Salir igualmente?')){
        const cb=toggle(); if(cb) cb.checked=true; return;
      }
    }
    FD.state.designMode=on;
    d.body.classList.toggle('fd-design-mode', on);
    updateControls();
    if(on){
      try{ initDnD(); }catch(e){ console.warn('DnD init error', e); }
      if(FD.state.autoTreeOnFirstDesign){ mountTree(); FD.state.autoTreeOnFirstDesign=false; }
    } else {
      const host=getHost(); if(host) host.classList.add('d-none');
    }
  };

  function buildFallback(host){
    host.innerHTML = '<div class="small text-muted mb-2">Árbol no disponible. JSON actual:</div>'+
      '<pre style="max-height:420px;overflow:auto;font-size:11px">'+JSON.stringify(getJSON(),null,2)+'</pre>';
  }
  function mountTree(){
    const host = getHost(); if(!host) return;
    host.classList.remove('d-none');
    if(FD.state.treeLoaded || host.querySelector('iframe') || FD.state.treeError) return;

    host.innerHTML = '<div class="text-center py-3 text-secondary">Cargando árbol...</div>';
    const ifr = d.createElement('iframe');
    ifr.src='arboljson/index.php';
    ifr.className='fd-tree-iframe w-100 border';
    ifr.style.minHeight='480px';
    let loaded=false;

    ifr.addEventListener('load', ()=>{
      loaded=true; FD.state.treeLoaded=true;
      try{ ifr.contentWindow?.postMessage({fdTree:true,type:'setJSON',payload:getJSON()}, '*'); }catch{}
    });
    ifr.addEventListener('error', ()=>{
      FD.state.treeError=true; host.innerHTML=''; buildFallback(host);
    });
    setTimeout(()=>{ if(!loaded && !FD.state.treeError){ FD.state.treeError=true; host.innerHTML=''; buildFallback(host); } },8000);

    host.innerHTML=''; host.appendChild(ifr);
  }

  w.addEventListener('message', (e)=>{
    const m=e.data; if(!m||!m.fdTree) return;
    if(m.type==='ready'||m.type==='requestJSON'){
      try{ e.source?.postMessage({fdTree:true,type:'setJSON',payload:getJSON()}, '*'); }catch{}
      return;
    }
    if(m.type==='updateJSON' && m.payload){ setJSON(m.payload); w.FORM_JSON=m.payload; FD.markDirty(); }
  });

  function initDnD(){
    if(typeof Sortable==='undefined') return;
    d.querySelectorAll('#formulariodinamico .row').forEach(row=>{
      if(row.dataset.fdColsSortable) return;
      Sortable.create(row,{ group:'fd-cols', draggable:'> [class*="col-"]', animation:150, onEnd(){ FD.markDirty(); } });
      row.dataset.fdColsSortable='1';
    });
    d.querySelectorAll('#formulariodinamico fieldset').forEach(fs=>{
      if(fs.dataset.fdFieldsSortable) return;
      const selector='.fd-field-wrapper, .form-group, .mb-3';
      if(!fs.querySelector(selector)) return;
      Sortable.create(fs,{ group:'fd-fields', draggable:selector, filter:'legend', animation:120, onEnd(){ FD.markDirty(); } });
      fs.dataset.fdFieldsSortable='1';
    });
  }

  function init(){
    const cb=toggle();
    if(cb) cb.addEventListener('change',()=>FD.setDesignMode(cb.checked));
    const bt=btnTree(); if(bt) bt.addEventListener('click',()=>{ if(!FD.state.designMode) return; mountTree(); });
    const bs=btnSave(); if(bs) bs.addEventListener('click',()=>{ if(!FD.state.designMode) return; const payload=FD.buildSavePayload(); try{ JSON.stringify(payload); }catch{ alert('JSON inválido'); return; } alert('Guardado (simulado)'); FD.state.dirty=false; d.body.classList.remove('fd-layout-dirty'); });
    if(cb && cb.checked){ FD.setDesignMode(true); } else { updateControls(); }
  }
  if(d.readyState==='loading'){ d.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window,document);

/* Compat: define alias $/$all si no existen (sin jQuery) */
(function(w,d){
  if(typeof w.$ === 'undefined'){ w.$ = (sel,root)=> (root||d).querySelector(sel); }
  if(typeof w.$all === 'undefined'){ w.$all = (sel,root)=> Array.from((root||d).querySelectorAll(sel)); }
})(window,document);



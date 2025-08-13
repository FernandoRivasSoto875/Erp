/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Implementa Modo Diseño: al activarse muestra y monta el Árbol JSON y habilita controles.
   No elimina funcionalidades existentes; sólo complementa.
*/
(function(w,d){
  'use strict';
  const $=(s,r=d)=>r.querySelector(s);
  const $all=(s,r=d)=>Array.from(r.querySelectorAll(s));

  const FD = w.FD || (w.FD={});
  FD.state = Object.assign({
    designMode:false, dirty:false, saving:false,
    treeLoaded:false, treeError:false, autoTreeOnFirstDesign:true
  }, FD.state||{});

  // JSON en #fd-data
  function getJSON(){ try{ return JSON.parse(($('#fd-data')?.getAttribute('data-form-json'))||'{}'); }catch{ return {}; } }
  function setJSON(o){ const n=$('#fd-data'); if(n) n.setAttribute('data-form-json', JSON.stringify(o)); }
  FD.markDirty = ()=>{ FD.state.dirty=true; d.body.classList.add('fd-layout-dirty'); };
  w.addEventListener('beforeunload', e=>{ if(FD.state.dirty){ e.preventDefault(); e.returnValue=''; } });

  // Visibilidad controles
  function updateControls(){
    const on=FD.state.designMode;
    const btnTree=$('#toggleTreeBtn'), btnSave=$('#saveLayoutBtn');
    [btnTree,btnSave].forEach(b=>{ if(!b) return; b.classList.toggle('d-none',!on); b.toggleAttribute('disabled',!on); b.setAttribute('aria-hidden', on?'false':'true'); });
    $('#fd-json-tree-app')?.classList.toggle('d-none', !on && !FD.state.treeLoaded);
  }

  // Modo Diseño
  FD.setDesignMode=function(on){
    on=!!on;
    if(FD.state.designMode && !on && FD.state.dirty){
      if(!w.confirm('Hay cambios sin guardar. ¿Salir igualmente?')){ const cb=$('#designModeToggle'); if(cb) cb.checked=true; return; }
    }
    FD.state.designMode=on;
    d.body.classList.toggle('fd-design-mode', on);
    updateControls();
    if(on){
      try{ initDnD(); }catch(e){ console.warn('DnD init error', e); }
      if(FD.state.autoTreeOnFirstDesign){ mountTree(); FD.state.autoTreeOnFirstDesign=false; }
    }
  };

  // Montar árbol (iframe)
  function buildFallback(host){
    host.innerHTML = '<div class="small text-muted mb-2">Árbol no disponible. JSON actual:</div>' +
      '<pre style="max-height:420px;overflow:auto;font-size:11px">'+
      JSON.stringify(getJSON(),null,2)+'</pre>';
  }
  function mountTree(){
    const host = $('#fd-json-tree-app'); if(!host) return;
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

  // Mensajería con micro‑app
  w.addEventListener('message', (e)=>{
    const m=e.data; if(!m||!m.fdTree) return;
    if(m.type==='ready'||m.type==='requestJSON'){ try{ e.source?.postMessage({fdTree:true,type:'setJSON',payload:getJSON()}, '*'); }catch{} return; }
    if(m.type==='updateJSON' && m.payload){ setJSON(m.payload); w.FORM_JSON=m.payload; FD.markDirty(); }
  });

  // DnD básico
  function initDnD(){
    if(typeof Sortable==='undefined') return;
    $all('#formulariodinamico .row').forEach(row=>{
      if(row.dataset.fdColsSortable) return;
      Sortable.create(row,{ group:'fd-cols', draggable:'> [class*="col-"]', animation:150, onEnd(){ FD.markDirty(); } });
      row.dataset.fdColsSortable='1';
    });
    $all('#formulariodinamico fieldset').forEach(fs=>{
      if(fs.dataset.fdFieldsSortable) return;
      const selector='.fd-field-wrapper, .form-group, .mb-3';
      if(!fs.querySelector(selector)) return;
      Sortable.create(fs,{ group:'fd-fields', draggable:selector, filter:'legend', animation:120, onEnd(){ FD.markDirty(); } });
      fs.dataset.fdFieldsSortable='1';
    });
  }

  // Bind UI
  function init(){
    $('#designModeToggle')?.addEventListener('change',()=>FD.setDesignMode($('#designModeToggle').checked));
    $('#toggleTreeBtn')?.addEventListener('click',()=>{ if(!FD.state.designMode) return; mountTree(); });
    $('#saveLayoutBtn')?.addEventListener('click',()=>{
      if(!FD.state.designMode) return;
      const payload = (function(){ const dta=getJSON(); dta.layout = FD.serializeLayoutFromDom?FD.serializeLayoutFromDom(): (dta.layout||[]); return dta; })();
      try{ JSON.stringify(payload); }catch{ alert('JSON inválido'); return; }
      // TODO: POST real a ajax/guardar_layout.php
      alert('Guardado (simulado)');
      FD.state.dirty=false; d.body.classList.remove('fd-layout-dirty');
    });
    const cb=$('#designModeToggle'); if(cb && cb.checked){ FD.setDesignMode(true); } else { updateControls(); }
  }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',init):init();
})(window,document);



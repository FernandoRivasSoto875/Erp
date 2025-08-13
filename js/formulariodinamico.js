/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Implementa Modo Diseño: al activarse muestra y monta el Árbol JSON y habilita controles.
   No elimina funcionalidades existentes; sólo complementa.
*/
(function(window, document){
  'use strict';

  const FD = window.FD || (window.FD = {});
  FD.state = Object.assign({
    designMode: false,
    dirty: false,
    treeLoaded: false,
    treeError: false,
    autoTreeOnFirstDesign: true
  }, FD.state || {});

  // Utils
  const $ = (sel,root=document)=>root.querySelector(sel);
  const $all = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  function toast(msg,type='info',ms=2500){
    const map={info:'secondary',success:'success',warning:'warning',danger:'danger'};
    const el=document.createElement('div');
    el.className='alert alert-'+(map[type]||'secondary');
    el.textContent=msg;
    Object.assign(el.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:9999,minWidth:'220px'});
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),ms);
  }

  // JSON helpers
  function getFormJSON(){
    const n = $('#fd-data');
    if(!n) return {};
    try { return JSON.parse(n.getAttribute('data-form-json')||'{}'); }
    catch { return {}; }
  }
  function setFormJSON(obj){
    const n = $('#fd-data');
    if(n) n.setAttribute('data-form-json', JSON.stringify(obj));
  }
  FD.getFormJSON = FD.getFormJSON || getFormJSON;
  FD.setFormJSON = FD.setFormJSON || setFormJSON;

  // Dirty
  FD.markDirty = FD.markDirty || function(){
    FD.state.dirty = true;
    document.body.classList.add('fd-layout-dirty');
  };

  // Serializador (placeholder compatible con prompt)
  FD.serializeLayoutFromDom = FD.serializeLayoutFromDom || function(){
    // TODO: extraer layout real del DOM. De momento, conserva el existente.
    return getFormJSON().layout || [];
  };
  FD.buildSavePayload = FD.buildSavePayload || function(){
    const data = getFormJSON();
    data.layout = FD.serializeLayoutFromDom();
    return data;
  };

  // Visibilidad de controles según modo diseño
  function updateDesignControlsVisibility(){
    const on = FD.state.designMode;
    const btnTree = $('#toggleTreeBtn');
    const btnSave = $('#saveLayoutBtn');
    [btnTree, btnSave].forEach(b=>{
      if(!b) return;
      b.classList.toggle('d-none', !on);
      b.toggleAttribute('disabled', !on);
      b.setAttribute('aria-hidden', on?'false':'true');
    });
  }

  // Modo Diseño
  FD.setDesignMode = function(on){
    on = !!on;
    if(FD.state.designMode === on){ updateDesignControlsVisibility(); return; }
    if(FD.state.designMode && !on && FD.state.dirty){
      if(!window.confirm('Hay cambios sin guardar. ¿Salir igualmente?')){
        const cb = $('#designModeToggle'); if(cb) cb.checked = true; return;
      }
    }
    FD.state.designMode = on;
    document.body.classList.toggle('fd-design-mode', on);
    updateDesignControlsVisibility();
    if(on){
      // PROTEGE: si DnD falla, aún se monta el árbol
      try{ initDnD(); }catch(e){ console.warn('[FD] DnD init error', e); }
      if(FD.state.autoTreeOnFirstDesign){
        mountTreeApp(true);
        FD.state.autoTreeOnFirstDesign = false;
      }
    } else {
      const host = $('#fd-json-tree-app');
      if(host) host.classList.add('d-none');
    }
  };

  function bindDesignToggle(){
    const cb = $('#designModeToggle');
    if(!cb) return;
    cb.addEventListener('change', ()=> FD.setDesignMode(cb.checked));
  }

  // Árbol (micro‑app)
  function buildQuickTreeFallback(host){
    host.innerHTML = '<div class="small text-muted mb-2">Árbol no disponible. JSON actual:</div>';
    const pre=document.createElement('pre');
    pre.style.maxHeight='420px'; pre.style.overflow='auto'; pre.style.fontSize='11px';
    pre.textContent = JSON.stringify(getFormJSON(), null, 2);
    host.appendChild(pre);
  }

  function mountTreeApp(auto=false){
    const host = $('#fd-json-tree-app'); if(!host) return;
    host.classList.remove('d-none');

    if(FD.state.treeLoaded || host.querySelector('iframe') || FD.state.treeError){
      if(!auto) host.classList.toggle('d-none');
      return;
    }

    host.innerHTML = '<div class="text-center py-3 text-secondary">Cargando árbol...</div>';
    const iframe = document.createElement('iframe');
    iframe.src = 'arboljson/index.php';
    iframe.className = 'fd-tree-iframe w-100 border';
    iframe.style.minHeight = '480px';
    iframe.title = 'Árbol JSON';
    let loaded=false;

    iframe.addEventListener('load', ()=>{
      loaded=true; FD.state.treeLoaded=true; toast('Árbol cargado','success');
      try{ iframe.contentWindow?.postMessage({fdTree:true,type:'setJSON',payload:getFormJSON()}, '*'); }catch{}
    });
    iframe.addEventListener('error', ()=>{
      FD.state.treeError=true; host.innerHTML=''; toast('Error árbol. Fallback JSON.','danger'); buildQuickTreeFallback(host);
    });
    setTimeout(()=>{
      if(!loaded && !FD.state.treeError){
        FD.state.treeError=true; host.innerHTML=''; toast('Timeout árbol. Fallback.','warning'); buildQuickTreeFallback(host);
      }
    },8000);

    host.innerHTML=''; host.appendChild(iframe);
  }

  // Mensajería desde micro‑app árbol
  window.addEventListener('message', e=>{
    const msg = e.data; if(!msg || !msg.fdTree) return;
    if(msg.type==='ready' || msg.type==='requestJSON'){
      try{ e.source?.postMessage({fdTree:true,type:'setJSON',payload:getFormJSON()}, '*'); }catch{}
      return;
    }
    if(msg.type==='updateJSON' && msg.payload){
      setFormJSON(msg.payload); window.FORM_JSON = msg.payload; FD.markDirty(); toast('JSON actualizado','success');
    }
  });

  // Botones
  function bindTreeButton(){
    const btn = $('#toggleTreeBtn'); if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode){ toast('Activa el modo diseño para abrir el árbol','warning'); return; }
      mountTreeApp(false);
    });
  }
  function bindSave(){
    const btn = $('#saveLayoutBtn'); if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode) return;
      const payload = FD.buildSavePayload();
      try{ JSON.stringify(payload); }catch{ toast('JSON inválido','danger'); return; }
      // TODO: POST real a ajax/guardar_layout.php si aplica
      toast('Guardado (simulado)','info');
      FD.state.dirty=false; document.body.classList.remove('fd-layout-dirty');
    });
  }

  // DnD básico
  function initDnD(){
    if(typeof Sortable==='undefined') return;
    // Mover columnas dentro de filas
    $all('#formulariodinamico .row').forEach(row=>{
      if(row.dataset.fdColsSortable) return;
      // FIX: pasar el elemento como primer argumento
      Sortable.create(row, {
        group:'fd-cols',
        draggable:'> [class*="col-"]',
        animation:150,
        onEnd(){ FD.markDirty(); }
      });
      row.dataset.fdColsSortable='1';
    });
    // Reordenar campos dentro de fieldsets (si hay wrappers)
    $all('#formulariodinamico fieldset').forEach(fs=>{
      if(fs.dataset.fdFieldsSortable) return;
      const selector = '.fd-field-wrapper, .form-group';
      if(!fs.querySelector(selector)) return;
      // FIX: pasar el elemento como primer argumento
      Sortable.create(fs, {
        group:'fd-fields',
        draggable: selector,
        filter:'legend',
        animation:120,
        onEnd(){ FD.markDirty(); }
      });
      fs.dataset.fdFieldsSortable='1';
    });
  }

  // Fallback tabs si falta bootstrap.Tab
  (function tabsFallback(){
    if(typeof bootstrap !== 'undefined' && bootstrap.Tab) return;
    document.addEventListener('click', e=>{
      const btn = e.target.closest('[data-bs-toggle="tab"]'); if(!btn) return;
      e.preventDefault();
      const sel = btn.getAttribute('data-bs-target') || btn.getAttribute('href'); if(!sel) return;
      const tabs = btn.closest('.fd-tabs') || document;
      tabs.querySelectorAll('.nav-link').forEach(l=>{ l.classList.remove('active'); l.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      tabs.querySelectorAll('.tab-pane').forEach(p=> p.classList.remove('show','active'));
      const pane = tabs.querySelector(sel); if(pane) pane.classList.add('show','active');
    });
  })();

  // Init
  function init(){
    bindDesignToggle();
    bindTreeButton();
    bindSave();
    updateDesignControlsVisibility();
    const cb = $('#designModeToggle'); if(cb && cb.checked){ FD.setDesignMode(true); }
  }
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', init) : init();

})(window, document);



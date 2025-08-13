/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Implementa Modo Diseño: al activarse muestra y monta el Árbol JSON y habilita controles.
   No elimina funcionalidades existentes; sólo complementa.
*/
(function(window, document){
  'use strict';

  const FD = window.FD || (window.FD = {});

  // Estado
  FD.state = Object.assign({
    designMode: false,
    dirty: false,
    treeLoaded: false,
    treeError: false,
    autoTreeOnFirstDesign: true
  }, FD.state || {});

  // Utils
  FD.$    = FD.$    || ((sel,root=document)=>root.querySelector(sel));
  FD.$all = FD.$all || ((sel,root=document)=>Array.from(root.querySelectorAll(sel)));
  FD.toast = FD.toast || function(msg,type='info',ms=3000){
    const map={info:'secondary',success:'success',warning:'warning',danger:'danger'};
    const el=document.createElement('div');
    el.className='alert alert-'+(map[type]||'secondary');
    el.textContent=msg;
    Object.assign(el.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:9999,minWidth:'220px'});
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),ms);
  };

  // JSON helpers
  function getFormJSON(){
    const n = FD.$('#fd-data');
    if(!n) return {};
    try { return JSON.parse(n.getAttribute('data-form-json')||'{}'); }
    catch { return {}; }
  }
  function setFormJSON(obj){
    const n = FD.$('#fd-data');
    if(n) n.setAttribute('data-form-json', JSON.stringify(obj));
  }
  FD.getFormJSON = FD.getFormJSON || getFormJSON;
  FD.setFormJSON = FD.setFormJSON || setFormJSON;

  // Serialización layout (placeholder compatible)
  FD.serializeLayoutFromDom = FD.serializeLayoutFromDom || function(){
    return getFormJSON().layout || [];
  };
  FD.buildSavePayload = FD.buildSavePayload || function(){
    const data = getFormJSON();
    data.layout = FD.serializeLayoutFromDom();
    return data;
  };
  FD.markDirty = FD.markDirty || function(){
    FD.state.dirty = true;
    document.body.classList.add('fd-layout-dirty');
  };

  // Visibilidad controles según modo diseño
  function updateDesignControlsVisibility(){
    const btnTree = FD.$('#toggleTreeBtn');
    const btnSave = FD.$('#saveLayoutBtn');
    const on = FD.state.designMode;

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
    if(FD.state.designMode === on) {
      updateDesignControlsVisibility();
      return;
    }
    // Confirmación si hay cambios y se desactiva
    if(FD.state.designMode && !on && FD.state.dirty){
      const ok = window.confirm('Hay cambios sin guardar. ¿Salir del modo diseño igualmente?');
      if(!ok){
        const cb = FD.$('#designModeToggle');
        if(cb) cb.checked = true;
        return;
      }
    }
    FD.state.designMode = on;
    document.body.classList.toggle('fd-design-mode', on);
    updateDesignControlsVisibility();

    if(on){
      // Montar/mostrar árbol al entrar en modo diseño
      if(FD.state.autoTreeOnFirstDesign){
        mountTreeApp(true);
        FD.state.autoTreeOnFirstDesign = false;
      }
    } else {
      // Ocultar árbol al salir (opcional)
      const host = FD.$('#fd-json-tree-app');
      if(host) host.classList.add('d-none');
      document.body.classList.remove('fd-layout-dirty');
    }
  };

  // Bind toggle
  function bindDesignToggle(){
    const cb = FD.$('#designModeToggle');
    if(!cb) return;
    cb.addEventListener('change', ()=> FD.setDesignMode(cb.checked));
  }

  // Árbol JSON (micro‑app)
  function buildQuickTreeFallback(host){
    const pre=document.createElement('pre');
    pre.style.maxHeight='420px';
    pre.style.overflow='auto';
    pre.style.fontSize='11px';
    pre.textContent = JSON.stringify(getFormJSON(), null, 2);
    host.innerHTML = '<div class="small text-muted mb-2">Árbol no disponible. Mostrando JSON.</div>';
    host.appendChild(pre);
  }

  function mountTreeApp(auto=false){
    const host = FD.$('#fd-json-tree-app');
    if(!host) return;
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

    let loaded = false;
    iframe.addEventListener('load', ()=>{
      loaded = true;
      FD.state.treeLoaded = true;
      FD.toast('Árbol cargado','success');
      // Enviar JSON actual al árbol (si lo soporta)
      try {
        iframe.contentWindow?.postMessage({ fdTree:true, type:'setJSON', payload:getFormJSON() }, '*');
      } catch {}
    });
    iframe.addEventListener('error', ()=>{
      FD.state.treeError = true;
      host.innerHTML = '';
      FD.toast('No se pudo cargar el árbol. Fallback JSON.','danger');
      buildQuickTreeFallback(host);
    });

    // Timeout de seguridad
    setTimeout(()=>{
      if(!loaded && !FD.state.treeError){
        FD.state.treeError = true;
        host.innerHTML = '';
        FD.toast('Timeout cargando árbol. Fallback JSON.','warning');
        buildQuickTreeFallback(host);
      }
    }, 8000);

    host.innerHTML = '';
    host.appendChild(iframe);
  }

  // Comunicación con micro‑app
  window.addEventListener('message', e=>{
    const msg = e.data;
    if(!msg || !msg.fdTree) return;

    if(msg.type === 'ready' || msg.type === 'requestJSON'){
      // Responder con el JSON actual
      try { e.source?.postMessage({ fdTree:true, type:'setJSON', payload:getFormJSON() }, '*'); } catch {}
      return;
    }

    if(msg.type === 'updateJSON' && msg.payload){
      setFormJSON(msg.payload);
      window.FORM_JSON = msg.payload;
      FD.markDirty();
      FD.toast('JSON actualizado desde árbol','success');
    }
  });

  // Botones
  function bindTreeButton(){
    const btn = FD.$('#toggleTreeBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode){
        FD.toast('Activa el modo diseño para ver el árbol','warning');
        return;
      }
      mountTreeApp(false);
    });
  }
  function bindSave(){
    const btn = FD.$('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode) return;
      const payload = FD.buildSavePayload();
      try { JSON.stringify(payload); } catch { FD.toast('JSON inválido','danger'); return; }
      // TODO: Implementar persistencia real si corresponde
      FD.toast('Guardar (stub)','info');
      FD.state.dirty=false;
      document.body.classList.remove('fd-layout-dirty');
    });
  }

  // Init
  function init(){
    bindDesignToggle();
    bindTreeButton();
    bindSave();
    // Alinear visibilidad inicial de controles
    updateDesignControlsVisibility();
    // Si ya viene activo por query, aplicar
    const cb = FD.$('#designModeToggle');
    if(cb && cb.checked){
      FD.setDesignMode(true);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug hooks
  FD.debug = Object.assign(FD.debug||{},{
    mountTreeApp,
    serializeLayoutFromDom: FD.serializeLayoutFromDom
  });

})(window, document);



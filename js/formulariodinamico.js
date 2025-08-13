/* MASTER_PROMPT_REFERENCE
   Leer COPILOT_PROMPT en formulariodinamico.php antes de modificar.
   Rol: modo diseño, DnD, árbol JSON (micro‑app), UX y serialización layout.
   No eliminar funcionalidad futura; solo extender de forma compatible.
*/
(function(window, document){
  'use strict';

  const FD = window.FD || {};
  window.FD = FD;

  // ===== Estado =====
  FD.state = Object.assign({
    designMode: false,
    saving: false,
    dirty: false,
    treeLoaded: false,
    treeError: false
  }, FD.state || {});

  // ===== Utilidades =====
  FD.$    = FD.$    || ((sel,root=document)=>root.querySelector(sel));
  FD.$all = FD.$all || ((sel,root=document)=>Array.from(root.querySelectorAll(sel)));
  FD.log  = FD.log  || ((...m)=>console.debug('[FD]',...m));

  if(!FD.toast){
    FD.toast = function(msg,type='info'){
      const box=document.createElement('div');
      const map={info:'secondary',warning:'warning',success:'success',danger:'danger'};
      box.className='alert alert-'+(map[type]||'secondary');
      box.textContent=msg;
      Object.assign(box.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:9999,minWidth:'220px'});
      document.body.appendChild(box);
      setTimeout(()=>box.remove(),3500);
    };
  }

  if(!FD.markDirty){
    FD.markDirty = function(){
      FD.state.dirty = true;
      document.body.classList.add('fd-layout-dirty');
    };
  }

  // Obtener / set JSON (sin romper contrato)
  FD.getFormJSON = function(){
    const n = FD.$('#fd-data');
    if(!n) return {};
    try { return JSON.parse(n.getAttribute('data-form-json')||'{}'); }
    catch { return {}; }
  };
  FD.setFormJSON = function(obj){
    const n = FD.$('#fd-data');
    if(n) n.setAttribute('data-form-json', JSON.stringify(obj));
  };

  // ===== Serialización Layout (placeholder ampliable) =====
  if(!FD.serializeLayoutFromDom){
    FD.serializeLayoutFromDom = function(){
      // TODO: Implementar extracción real de layout
      return FD.getFormJSON().layout || [];
    };
  }

  // Construye payload para guardar
  FD.buildSavePayload = function(){
    const data = FD.getFormJSON();
    data.layout = FD.serializeLayoutFromDom();
    return data;
  };

  // ===== Modo Diseño =====
  FD.setDesignMode = function(on){
    on = !!on;
    if(FD.state.designMode && !on && FD.state.dirty){
      if(!window.confirm('Hay cambios sin guardar. ¿Salir del modo diseño igualmente?')){
        const cb = FD.$('#designModeToggle');
        if(cb) cb.checked = true;
        return;
      }
    }
    FD.state.designMode = on;
    document.body.classList.toggle('fd-design-mode', on);
    const saveBtn = FD.$('#saveLayoutBtn');
    if(saveBtn) saveBtn.disabled = !on;
    if(on){
      initDnD();
      highlightEditable();
    } else {
      removeEditableHighlights();
    }
  };

  function bindDesignToggle(){
    const cb = FD.$('#designModeToggle');
    if(!cb) return;
    cb.addEventListener('change', ()=> FD.setDesignMode(cb.checked));
  }

  function highlightEditable(){
    FD.$all('.fd-section').forEach(el=>{
      el.classList.add('fd-editable');
      el.setAttribute('draggable','false');
    });
  }
  function removeEditableHighlights(){
    FD.$all('.fd-section.fd-editable').forEach(el=>{
      el.classList.remove('fd-editable');
      el.removeAttribute('draggable');
    });
  }

  // Aviso al cerrar con cambios
  window.addEventListener('beforeunload', e=>{
    if(FD.state.dirty){
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ===== Árbol (micro‑app) =====
  function buildQuickTreeFallback(host){
    const data = FD.getFormJSON();
    host.innerHTML = '<div class="small text-muted mb-1">Micro‑app árbol no disponible (fallback).</div>';
    const pre=document.createElement('pre');
    pre.style.maxHeight='400px';
    pre.style.overflow='auto';
    pre.style.fontSize='11px';
    pre.textContent = JSON.stringify(data,null,2);
    host.appendChild(pre);
  }

  function mountTreeApp(){
    const host = FD.$('#fd-json-tree-app');
    if(!host) return;
    host.classList.remove('d-none');

    if(FD.state.treeLoaded || host.querySelector('iframe') || FD.state.treeError){
      host.classList.toggle('d-none');
      return;
    }

    host.innerHTML = '<div class="text-center py-3 text-secondary">Cargando árbol...</div>';
    const iframe = document.createElement('iframe');
    iframe.src = 'arboljson/index.php';
    iframe.className = 'fd-tree-iframe w-100 border';
    iframe.style.minHeight='480px';
    iframe.title='Árbol JSON';
    let loaded=false;

    iframe.addEventListener('load', ()=>{
      loaded=true;
      FD.state.treeLoaded=true;
      FD.toast('Árbol cargado','success');
    });
    iframe.addEventListener('error', ()=>{
      FD.state.treeError=true;
      host.innerHTML='';
      FD.toast('Error cargando árbol. Fallback.','danger');
      buildQuickTreeFallback(host);
    });
    setTimeout(()=>{
      if(!loaded && !FD.state.treeError){
        FD.state.treeError=true;
        host.innerHTML='';
        FD.toast('Timeout árbol. Fallback.','warning');
        buildQuickTreeFallback(host);
      }
    },8000);

    host.innerHTML='';
    host.appendChild(iframe);

    window.addEventListener('message', e=>{
      if(!e.data || !e.data.fdTree) return;
      const msg = e.data;
      if(msg.type==='updateJSON' && msg.payload){
        FD.setFormJSON(msg.payload);
        window.FORM_JSON = msg.payload;
        FD.markDirty();
        FD.toast('JSON actualizado','success');
        // TODO: Re-render dinámico si se implementa.
      }
    });
  }

  function bindTreeButton(){
    const btn = FD.$('#toggleTreeBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode){
        FD.toast('Activa modo diseño para abrir el árbol','warning');
        return;
      }
      mountTreeApp();
    });
  }

  // ===== Guardado =====
  function bindSave(){
    const btn = FD.$('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(FD.state.saving) return;
      const payload = FD.buildSavePayload();
      FD.state.saving=true;
      btn.disabled=true;

      fetch('ajax/guardar_layout.php',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      .then(r=>r.json().catch(()=>({ok:false,error:'Respuesta inválida'})))
      .then(res=>{
        if(res.ok){
          FD.toast('Guardado','success');
          FD.state.dirty=false;
          document.body.classList.remove('fd-layout-dirty');
        } else {
          FD.toast(res.error||'Error al guardar','danger');
        }
      })
      .catch(()=> FD.toast('Error de red','danger'))
      .finally(()=>{
        FD.state.saving=false;
        btn.disabled=!FD.state.designMode;
      });
    });
  }

  // ===== Drag & Drop =====
  function initDnD(){
    if(typeof Sortable==='undefined') return;
    // Permitir mover columnas dentro de cada .row
    FD.$all('#formulariodinamico .fd-section .row').forEach(row=>{
      if(row.dataset.fdSortableApplied) return;
      Sortable.create(row,{
        group:'fd-cols',
        draggable:'> [class*="col-"]',
        animation:150,
        onEnd(){ FD.markDirty(); }
      });
      row.dataset.fdSortableApplied='1';
    });
  }

  // ===== Tabs fallback (si falla bootstrap.Tab) =====
  (function tabsFallback(){
    if(typeof bootstrap !== 'undefined' && bootstrap.Tab) return;
    document.addEventListener('click', e=>{
      const btn = e.target.closest('[data-bs-toggle="tab"]');
      if(!btn) return;
      e.preventDefault();
      const targetSel = btn.getAttribute('data-bs-target') || btn.getAttribute('href');
      if(!targetSel) return;
      const tabsContainer = btn.closest('.fd-tabs');
      if(!tabsContainer) return;

      tabsContainer.querySelectorAll('.nav-link').forEach(l=>{
        l.classList.remove('active');
        l.setAttribute('aria-selected','false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');

      tabsContainer.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('show','active'));
      const pane = tabsContainer.querySelector(targetSel);
      if(pane) pane.classList.add('show','active');
    });
  })();

  // ===== Init =====
  function init(){
    bindDesignToggle();
    bindTreeButton();
    bindSave();
    // Estado inicial por query o checkbox
    const cb = FD.$('#designModeToggle');
    if(cb && cb.checked){
      FD.setDesignMode(true);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  // Exponer debug
  FD.debug = Object.assign(FD.debug||{},{
    mountTreeApp,
    initDnD
  });

})(window, document);



/* =========================================================
   FORMULARIO DINÁMICO CORE
   - Modo diseño con confirmación al salir si hay cambios
   - Montaje micro‑app árbol (iframe) on-demand
   - DnD básico (placeholder para layout)
   ========================================================= */
(function(window, document){
  'use strict';

  const FD = window.FD || {};
  window.FD = FD;

  // Estado
  FD.state = Object.assign({
    designMode: false,
    saving: false,
    dirty: false,
    treeLoaded: false
  }, FD.state || {});

  // Utils
  if(!FD.$) FD.$ = (sel,root=document)=>root.querySelector(sel);
  if(!FD.$all) FD.$all = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  if(!FD.toast){
    FD.toast = function(msg,type='info'){
      const box=document.createElement('div');
      box.className='alert alert-'+(type==='danger'?'danger':type==='success'?'success':type==='warning'?'warning':'secondary');
      box.textContent=msg;
      Object.assign(box.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:9999,minWidth:'200px'});
      document.body.appendChild(box);
      setTimeout(()=>box.remove(),4000);
    };
  }
  if(!FD.markDirty){
    FD.markDirty = function(){
      FD.state.dirty = true;
      document.body.classList.add('fd-layout-dirty');
    };
  }

  // Serializador placeholder
  if(!FD.serializeLayoutFromDom){
    FD.serializeLayoutFromDom = function(){
      // TODO: Implementar lectura real del DOM -> objeto layout
      // Retorna estructura vacía para no romper guardado
      return {};
    };
  }

  // Guardar payload
  if(!FD.buildSavePayload){
    FD.buildSavePayload = function(){
      const node = FD.$('#fd-data');
      let data = {};
      if(node){
        try{ data = JSON.parse(node.getAttribute('data-form-json')||'{}'); }catch{ data={}; }
      }
      data.layout = FD.serializeLayoutFromDom();
      return data;
    };
  }

  // Modo diseño
  FD.setDesignMode = function(on){
    on = !!on;
    // Confirmar salida
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
    }
  };

  function bindDesignToggle(){
    const cb = FD.$('#designModeToggle');
    if(!cb) return;
    cb.addEventListener('change', ()=> FD.setDesignMode(cb.checked));
  }

  // Confirmar abandonar página con cambios
  window.addEventListener('beforeunload', e=>{
    if(FD.state.dirty){
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Árbol (micro‑app iframe)
  function mountTreeApp(){
    const host = FD.$('#fd-json-tree-app');
    if(!host) return;
    if(!host.querySelector('iframe')){
      const iframe = document.createElement('iframe');
      iframe.src = 'arboljson/index.php';
      iframe.className='fd-tree-iframe w-100 border';
      iframe.style.minHeight='480px';
      host.appendChild(iframe);
      FD.state.treeLoaded = true;
      // Listener mensajes
      window.addEventListener('message', e=>{
        if(!e.data || !e.data.fdTree) return;
        const msg = e.data;
        if(msg.type === 'updateJSON' && msg.payload){
          // Reemplaza JSON global
            const dataNode = FD.$('#fd-data');
            if(dataNode){
              dataNode.setAttribute('data-form-json', JSON.stringify(msg.payload));
            }
            window.FORM_JSON = msg.payload;
            FD.markDirty();
            FD.toast('JSON actualizado desde árbol','success');
            // Opcional: re-render parcial
        }
      });
    } else {
      host.classList.toggle('d-none');
    }
  }

  function bindTreeButton(){
    const btn = FD.$('#toggleTreeBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(!FD.state.designMode){
        FD.toast('Activa modo diseño para ver el árbol','warning');
        return;
      }
      mountTreeApp();
    });
  }

  // Guardar
  function bindSave(){
    const btn = FD.$('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(FD.state.saving) return;
      const payload = FD.buildSavePayload();
      FD.state.saving = true;
      btn.disabled = true;
      fetch('ajax/guardar_layout.php',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      .then(r=>r.json().catch(()=>({ok:false,error:'Respuesta no válida'})))
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
        btn.disabled = !FD.state.designMode;
      });
    });
  }

  // DnD inicial (placeholder; ampliar según estructura)
  function initDnD(){
    if(typeof Sortable==='undefined') return;
    // Fieldsets movibles dentro del formulario
    FD.$all('#formulariodinamico .fd-section').forEach(sec=>{
      if(sec.dataset.fdSortableApplied) return;
      const rows = sec.querySelectorAll('.row');
      rows.forEach(row=>{
        if(row.dataset.fdSortableApplied) return;
        Sortable.create(row,{
          group:'fd-cols',
            draggable:'> [class*="col-"]',
            animation:150,
            onEnd(){ FD.markDirty(); }
        });
        row.dataset.fdSortableApplied = '1';
      });
      sec.dataset.fdSortableApplied='1';
    });
  }

  // Fallback manual para tabs si Bootstrap JS no inicializa (o falta)
  (function(){
    if(typeof bootstrap !== 'undefined' && bootstrap.Tab) return;
    document.addEventListener('click', function(e){
      const btn = e.target.closest('[data-bs-toggle="tab"]');
      if(!btn) return;
      e.preventDefault();
      const targetSel = btn.getAttribute('data-bs-target') || btn.getAttribute('href');
      if(!targetSel) return;
      const nav = btn.closest('.nav');
      if(nav){
        nav.querySelectorAll('.nav-link').forEach(l=>{
          l.classList.remove('active');
          l.setAttribute('aria-selected','false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
      }
      // Limit scope to same tab container
      const tabsContainer = btn.closest('.fd-tabs');
      if(!tabsContainer) return;
      tabsContainer.querySelectorAll('.tab-pane').forEach(p=> p.classList.remove('show','active'));
      const pane = tabsContainer.querySelector(targetSel);
      if(pane){
        pane.classList.add('show','active');
      }
    });
  })();

  function init(){
    bindDesignToggle();
    bindTreeButton();
    bindSave();
    // Estado inicial design
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

})(window, document);



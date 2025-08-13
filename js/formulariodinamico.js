/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Leer COPILOT_PROMPT y PROMPT_MODO_DISENO en formulariodinamico.php antes de modificar.
   Rol: Implementar Modo Diseño (árbol + DnD), serializar layout y sincronización bidireccional sin eliminar funcionalidades existentes.
*/
(function(window, document){
  'use strict';

  const FD = window.FD || (window.FD = {});
  // -------------------------------------------------------------------
  // Estado
  // -------------------------------------------------------------------
  FD.state = Object.assign({
    designMode: false,
    dirty: false,
    saving: false,
    treeLoaded: false,
    treeError: false,
    autoTreeOnFirstDesign: true
  }, FD.state || {});

  // -------------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------------
  FD.$    = FD.$    || ((sel,root=document)=>root.querySelector(sel));
  FD.$all = FD.$all || ((sel,root=document)=>Array.from(root.querySelectorAll(sel)));
  FD.log  = FD.log  || ((...m)=>console.debug('[FD]',...m));

  FD.toast = FD.toast || function(msg,type='info',ms=3500){
    const map={info:'secondary',warning:'warning',success:'success',danger:'danger'};
    const box=document.createElement('div');
    box.className='alert alert-'+(map[type]||'secondary');
    box.textContent=msg;
    Object.assign(box.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:9999,minWidth:'220px'});
    document.body.appendChild(box);
    setTimeout(()=>box.remove(),ms);
  };

  FD.markDirty = FD.markDirty || function(){
    FD.state.dirty = true;
    document.body.classList.add('fd-layout-dirty');
  };

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

  // -------------------------------------------------------------------
  // Serialización del layout desde el DOM
  // Lee .fd-section > .fd-row > .fd-col[data-fs]
  // -------------------------------------------------------------------
  FD.serializeLayoutFromDom = function(){
    const sections = [];
    FD.$all('.fd-section').forEach(sectionEl=>{
      // Tabs se mantienen sin modificar (futuro: soportar)
      if(sectionEl.classList.contains('fd-tabs')){
        // Placeholder: no re-serializamos tabs aún; conservar original
        const originalLayout = FD.getFormJSON().layout || [];
        // Intentar identificar sección tabs por data-tabs
        const tabsId = sectionEl.getAttribute('data-tabs');
        const found = (originalLayout||[]).find(s=> (s.type==='tabs' && tabsId));
        if(found){
          sections.push(found);
          return;
        }
      }
      const sec = { type: 'section', rows: [] };
      sectionEl.querySelectorAll('.fd-row').forEach(rowEl=>{
        const row = { cols: [] };
        rowEl.querySelectorAll('.fd-col').forEach(colEl=>{
          const fs = colEl.getAttribute('data-fs');
            if(fs){
              row.cols.push({ width: inferBootstrapWidth(colEl) || 12, fieldset: fs });
            }
        });
        if(row.cols.length) sec.rows.push(row);
      });
      if(sec.rows.length) sections.push(sec);
    });
    return sections;
  };

  function inferBootstrapWidth(colEl){
    // Busca clases col-md-X o col-X
    const cls = colEl.className.split(/\s+/);
    let width = 12;
    cls.forEach(c=>{
      let m = c.match(/^col(?:-md)?-(\d{1,2})$/);
      if(m){
        const v = parseInt(m[1],10);
        if(v>=1 && v<=12) width = v;
      }
    });
    return width;
  }

  FD.buildSavePayload = function(){
    const data = FD.getFormJSON();
    data.layout = FD.serializeLayoutFromDom();
    return data;
  };

  // -------------------------------------------------------------------
  // Modo Diseño
  // -------------------------------------------------------------------
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
      applyEditableMarkers();
      initDnD();
      if(FD.state.autoTreeOnFirstDesign) {
        mountTreeApp(true);
        FD.state.autoTreeOnFirstDesign = false;
      }
    } else {
      removeEditableMarkers();
    }
  };

  function applyEditableMarkers(){
    FD.$all('.fd-section').forEach(el=> el.classList.add('fd-editable'));
    FD.$all('.fd-fieldset').forEach(el=> el.classList.add('fd-editable'));
  }
  function removeEditableMarkers(){
    FD.$all('.fd-editable').forEach(el=> el.classList.remove('fd-editable'));
  }

  function bindDesignToggle(){
    const cb = FD.$('#designModeToggle');
    if(!cb) return;
    cb.addEventListener('change', ()=> FD.setDesignMode(cb.checked));
  }

  window.addEventListener('beforeunload', e=>{
    if(FD.state.dirty){
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // -------------------------------------------------------------------
  // Árbol (micro‑app)
  // -------------------------------------------------------------------
  function buildQuickTreeFallback(host){
    const data = FD.getFormJSON();
    host.innerHTML = '<div class="small text-muted mb-1">Árbol no disponible (fallback JSON plano).</div>';
    const pre=document.createElement('pre');
    pre.style.maxHeight='420px';
    pre.style.overflow='auto';
    pre.style.fontSize='11px';
    pre.textContent = JSON.stringify(data,null,2);
    host.appendChild(pre);
  }

  function mountTreeApp(auto=false){
    const host = FD.$('#fd-json-tree-app');
    if(!host) return;
    // Mostrar si venía oculto
    host.classList.remove('d-none');

    // Si ya cargado y se disparó manual (no auto) => toggle
    if(FD.state.treeLoaded && !auto){
      host.classList.toggle('d-none');
      return;
    }
    if(FD.state.treeLoaded || host.querySelector('iframe') || FD.state.treeError) return;

    host.innerHTML = '<div class="text-center py-3 text-secondary">Cargando árbol...</div>';
    const iframe = document.createElement('iframe');
    iframe.src = 'arboljson/index.php';
    iframe.className = 'fd-tree-iframe w-100 border';
    iframe.style.minHeight='480px';
    iframe.title='Árbol JSON';
    let loaded = false;

    iframe.addEventListener('load', ()=>{
      loaded = true;
      FD.state.treeLoaded = true;
      FD.toast('Árbol cargado','success');
    });
    iframe.addEventListener('error', ()=>{
      FD.state.treeError = true;
      host.innerHTML = '';
      FD.toast('Error al cargar árbol. Fallback.','danger');
      buildQuickTreeFallback(host);
    });
    setTimeout(()=>{
      if(!loaded && !FD.state.treeError){
        FD.state.treeError = true;
        host.innerHTML='';
        FD.toast('Timeout cargando árbol. Fallback.','warning');
        buildQuickTreeFallback(host);
      }
    }, 8000);

    host.innerHTML = '';
    host.appendChild(iframe);

    window.addEventListener('message', e=>{
      if(!e.data || !e.data.fdTree) return;
      const msg = e.data;
      if(msg.type === 'updateJSON' && msg.payload){
        FD.setFormJSON(msg.payload);
        window.FORM_JSON = msg.payload;
        FD.markDirty();
        FD.toast('JSON actualizado desde árbol','success');
        // (Opcional) Re-render parcial: requeriría reconstruir secciones
      }
    });
  }

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

  // -------------------------------------------------------------------
  // Guardado
  // -------------------------------------------------------------------
  function bindSave(){
    const btn = FD.$('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(FD.state.saving) return;
      const payload = FD.buildSavePayload();
      let valid = true;
      try { JSON.stringify(payload); } catch { valid = false; }
      if(!valid){
        FD.toast('JSON inválido. No se guarda.','danger');
        return;
      }
      FD.state.saving = true;
      btn.disabled = true;
      fetch('ajax/guardar_layout.php',{
        method: 'POST',
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

  // -------------------------------------------------------------------
  // Drag & Drop
  // -------------------------------------------------------------------
  function initDnD(){
    if(typeof Sortable==='undefined') return;
    // Reordenar columnas dentro de cada fila
    FD.$all('#formulariodinamico .fd-row').forEach(row=>{
      if(row.dataset.sortableCols) return;
      Sortable.create(row,{
        group:'fd-cols',
        draggable:'> .fd-col',
        animation:150,
        handle: null,
        onEnd(){ FD.markDirty(); }
      });
      row.dataset.sortableCols='1';
    });

    // Reordenar fieldsets entre columnas (mover campos entre fieldsets no trivial; se implementa mover fieldsets completos)
    FD.$all('#formulariodinamico .fd-section').forEach(section=>{
      if(section.dataset.sortableFieldsets) return;
      const cols = section.querySelectorAll('.fd-col');
      if(cols.length){
        Sortable.create(section,{
          group:'fd-fieldsets',
          draggable:'.fd-col',
          animation:150,
          onEnd(){ FD.markDirty(); }
        });
        section.dataset.sortableFieldsets='1';
      }
    });

    // Reordenar campos dentro de un fieldset (heurística: agrupar wrappers por .fd-field-wrapper si existe, si no usar inputs directos)
    FD.$all('#formulariodinamico fieldset.fd-fieldset').forEach(fs=>{
      if(fs.dataset.sortableFields) return;
      let candidates = fs.querySelectorAll('.fd-field-wrapper');
      let selector = '.fd-field-wrapper';
      if(!candidates.length){
        // fallback: inputs directos => envolver lógicamente
        candidates = fs.querySelectorAll('div, .form-group');
        selector = '> *:not(legend)';
      }
      if(candidates.length){
        Sortable.create(fs,{
          group:'fd-fields',
          draggable: selector,
          filter:'legend',
          animation:120,
          onEnd(){ FD.markDirty(); }
        });
        fs.dataset.sortableFields='1';
      }
    });
  }

  // -------------------------------------------------------------------
  // Tabs fallback
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------
  function init(){
    bindDesignToggle();
    bindTreeButton();
    bindSave();
    const cb = FD.$('#designModeToggle');
    if(cb && cb.checked){
      FD.setDesignMode(true);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  // Debug hooks
  FD.debug = Object.assign(FD.debug||{},{
    mountTreeApp,
    serializeLayoutFromDom: FD.serializeLayoutFromDom
  });

})(window, document);



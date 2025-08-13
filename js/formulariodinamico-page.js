// ======================= FORMULARIO DINÁMICO (Página) =======================
// Centraliza lógica que estaba inline en formulariodinamico.php
(function(){
  'use strict';

  // --------- Config / Estado ---------
  const state = {
    designMode: false,
    saving: false
  };

  // Externos esperados:
  // window.FORM_JSON  (inyectado por PHP)
  // window.FORM_CONFIG (ruta JSON, etc.)

  // --------- Helpers DOM ---------
  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  // --------- Init ---------
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    bindDesignToggle();
    bindTreeToggle();
    bindSaveLayout();
    initJsonTreeIfAvailable();
    initDnDIfNeeded();
    console.log('[fd] init OK');
  }

  // --------- Design Mode ---------
  function bindDesignToggle(){
    const toggle = $('#designModeToggle');
    if(!toggle) return;
    toggle.addEventListener('change', ()=> setDesignMode(toggle.checked));
    if(toggle.checked) setDesignMode(true);
  }

  function setDesignMode(on){
    state.designMode = !!on;
    document.getElementById('fd-root')?.classList.toggle('design-mode', on);
    document.body.classList.toggle('fd-design-mode', on);
    // Si hay funciones del árbol/form que dependen de modo diseño, llamarlas
    if(on){
      // Ej: rebuild form tree
      if(typeof window.formBuildTree === 'function') try{ window.formBuildTree(); }catch{}
    }
  }

  // --------- Árbol lateral (mostrar/ocultar) ---------
  function bindTreeToggle(){
    const btn = $('#toggleTreeBtn');
    const panel = $('#fd-tree-side');
    if(!btn || !panel) return;
    btn.addEventListener('click', ()=>{
      panel.classList.toggle('d-none');
    });
  }

  // --------- Guardar Layout ---------
  function bindSaveLayout(){
    const btn = $('#saveLayoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      if(state.saving) return;
      const payload = buildSavePayload();
      if(!payload) return;
      state.saving = true;
      btn.disabled = true;
      btn.classList.add('disabled');
      fetch('ajax/guardar_layout.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      .then(r=> r.json().catch(()=>({ok:false,error:'Respuesta no JSON'})))
      .then(res=>{
        if(res.ok){
          toast('Layout guardado','success');
        } else {
          toast(res.error || 'Error al guardar','danger');
        }
      })
      .catch(err=>{
        console.error(err);
        toast('Error de red','danger');
      })
      .finally(()=>{
        state.saving = false;
        btn.disabled = false;
        btn.classList.remove('disabled');
      });
    });
  }

  function buildSavePayload(){
    // TODO: serializar layout desde DOM (si tienes un serializador ya hecho, úsalo)
    // Ejemplo placeholder:
    if(!window.FORM_JSON){
      toast('No hay FORM_JSON para serializar','warning');
      return null;
    }
    const out = JSON.parse(JSON.stringify(window.FORM_JSON));
    // Si tienes un método que reconstruye layout desde el formulario, llámalo aquí:
    if(typeof window.serializeLayoutFromDom === 'function'){
      try { out.layout = window.serializeLayoutFromDom(); }
      catch(e){ console.warn('serializeLayoutFromDom falló', e); }
    }
    return out;
  }

  // --------- Árbol JSON ---------
  function initJsonTreeIfAvailable(){
    // Si tu árbol se genera por fd-tree-side.js, solo asegúrate de refrescar
    if(typeof window.renderJsonTree === 'function'){
      try { window.renderJsonTree(); } catch(e){ console.warn(e); }
    }
  }

  // --------- Drag & Drop (si aplica) ---------
  function initDnDIfNeeded(){
    // Ejemplo: inicializar Sortable en contenedores de filas/columnas
    // TODO: adapta a tus selectores reales
    if(typeof Sortable === 'undefined') return;
    $all('[data-layout-container] .row').forEach(row=>{
      Sortable.create(row, {
        group: 'fd-cols',
        draggable: '> [class*="col-"]',
        animation: 150,
        handle: '.fd-fieldset-handle, legend',
        onEnd: ()=> {
          if(state.designMode){
            // refresh internal structure / mark dirty
            markLayoutDirty();
          }
        }
      });
    });
  }

  function markLayoutDirty(){
    // TODO: marca estado sucio si quieres avisar antes de salir
    document.body.classList.add('fd-layout-dirty');
  }

  // --------- Utilidades UI ---------
  function toast(msg, type='info'){
    // Placeholder simple; integra con tu sistema de alertas
    console.log('[toast]['+type+']', msg);
    const box = document.createElement('div');
    box.className = 'fd-toast alert alert-'+mapType(type);
    box.textContent = msg;
    Object.assign(box.style,{
      position:'fixed',right:'12px',bottom:'12px',zIndex:99999, minWidth:'220px'
    });
    document.body.appendChild(box);
    setTimeout(()=>{ box.classList.add('show'); }, 20);
    setTimeout(()=>{ box.classList.add('fade'); }, 3500);
    setTimeout(()=>{ box.remove(); }, 4200);
  }
  function mapType(t){
    switch(t){
      case 'success':return 'success';
      case 'danger': return 'danger';
      case 'warning':return 'warning';
      default: return 'secondary';
    }
  }

  // Exponer API mínima si otra parte la necesita
  window.FDPage = {
    setDesignMode,
    markLayoutDirty,
    rebuildTree: initJsonTreeIfAvailable
  };

})();
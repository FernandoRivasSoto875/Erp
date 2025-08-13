/* =======================================================================
COPILOT_PROMPT (Resumen aplicado para este JS - derivado de formulariodinamico.php)

Objetivo global del proyecto:
- formulariodinamico.php es solo orquestador (vista mínima).
- Toda lógica dinámica, modo diseño, DnD, integración árbol JSON y mejoras UX van aquí (o en módulos JS separados importados aquí).
- No remover funciones existentes que funcionan sin análisis; ampliarlas de forma compatible.

Lineamientos clave (extraídos/adaptados):
1. No mover lógica de negocio al PHP principal; mantenerla en este archivo u otros JS.
2. Mantener IDs/clases usadas: #fd-data, #formulariodinamico, #fd-json-tree-app, .fd-section, .fd-tabs.
3. Modo diseño:
   - Toggle por #designModeToggle + clase body.fd-design-mode.
   - Debe soportar dos vías: (a) micro‑app árbol (iframe / montaje) y (b) edición directa Drag & Drop.
4. Drag & Drop: mover secciones/fieldsets/cols/campos preservando contrato JSON (parametros, fieldsets, layout).
5. Guardado: usar/extender FD.serializeLayoutFromDom y FD.buildSavePayload. No duplicar funciones con nombres distintos.
6. Si se añade nueva funcionalidad grande: modular (namespace FD.*) y marcar wrappers antiguos // DEPRECATED al reemplazar.
7. No introducir dependencias JS extra sin necesidad (Bootstrap ya cargado, Sortable ya cargado).
8. Accesibilidad: mantener atributos ARIA en tabs, focus consistente.
9. Embellecer UI solo mediante clases CSS definidas en css/formulariodinamico.css (no estilos inline aquí).
10. Comunicación con micro‑app árbol vía postMessage (e.data.fdTree) de forma tolerante (no romper si payload parcial).
11. Antes de eliminar código existente preguntar / justificar; si se depreca, comentar con fecha.
12. Validar errores silenciosos en try/catch con console.warn (no bloquear ejecución).
13. Siempre que se cambie el DOM que representa layout => FD.markDirty().
14. Mantener fallback para tabs si bootstrap.Tab no está disponible.
15. Evitar variables globales no namespaced; usar objeto FD.
16. Si se amplía serializeLayoutFromDom: retornar estructura coherente (layout array) preservando claves originales cuando sea posible.
17. No hardcodear rutas ni nombres de JSON; tomar de #fd-data (data-json-file / data-form-json) cuando aplique.

Checklist al terminar cambios:
- Sin errores en consola.
- Tabs navegables.
- DnD funcionando en modo diseño sin afectar modo normal.
- Guardado actualiza estado (quita fd-layout-dirty).
- Árbol: se monta / fallback muestra JSON si no carga.
- No se eliminaron funciones sin wrapper de compatibilidad.

Fin PROMPT JS
======================================================================= */

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
  ;(function(){
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



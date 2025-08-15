// 1. Mensajería con micro-app árbol
window.addEventListener('message', (e)=>{
  const m=e.data; if(!m||!m.fdTree) return;
  if(m.type==='updateJSON' && m.payload){
    FD.setFormJSON(m.payload);
    FD.markDirty();
  }
});

// 2. Inicialización de selects dinámicos
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('select[data-source]').forEach(function(sel) {
    let config;
    try { config = JSON.parse(sel.getAttribute('data-source')); } catch(e){ config = null; }
    if (!config || !config.tabla) return;

    // Si tiene filtro con placeholder, espera dependiente
    if(config.filtro && config.filtro.includes('{')) {
      const matches = config.filtro.match(/\{([a-zA-Z0-9_]+)\}/g);
      if(matches) {
        matches.forEach(function(ph){
          const depName = ph.replace(/[{}]/g,'');
          const depSel = document.querySelector(`[name="${depName}"]`);
          if(depSel) {
            depSel.addEventListener('change', function(){
              cargarSelectConFiltro(sel, config);
            });
            // Carga inicial si hay valor
            if(depSel.value) cargarSelectConFiltro(sel, config);
          }
        });
      }
    } else {
      cargarSelectConFiltro(sel, config);
    }
  });

  function cargarSelectConFiltro(sel, config) {
    let filtro = config.filtro || '1=1';
    filtro = filtro.replace(/\{([a-zA-Z0-9_]+)\}/g, function(_, name){
      const depSel = document.querySelector(`[name="${name}"]`);
      return depSel ? depSel.value : '';
    });

    fetch('ajax/selectdata.php?tabla=' + encodeURIComponent(config.tabla) +
          (config.campo_valor ? '&campo_valor=' + encodeURIComponent(config.campo_valor) : '') +
          (config.campo_etiqueta ? '&campo_etiqueta=' + encodeURIComponent(config.campo_etiqueta) : '') +
          (filtro ? '&filtro=' + encodeURIComponent(filtro) : '') +
          (config.order ? '&order=' + encodeURIComponent(config.order) : ''))
      .then(r => r.json())
      .then(data => {
        sel.innerHTML = '<option value="">Seleccione...</option>';
        data.forEach(opt => {
          sel.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
        });
      });
  }
});

// 3. Alias globales para selectores rápidos
(function(w,d){
  if(typeof w.$ === 'undefined'){ w.$ = (sel,root)=> (root||d).querySelector(sel); }
  if(typeof w.$all === 'undefined'){ w.$all = (sel,root)=> Array.from((root||d).querySelectorAll(sel)); }
})(window,document);
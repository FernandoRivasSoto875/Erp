(function(){
  if (typeof Sortable === 'undefined') return;

  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

  function postGuardarFieldsets(fieldsets){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('fieldsets', JSON.stringify(fieldsets));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function initFieldSortable(){
    const groups = {};
    $all('#fd-root fieldset.draggable-fieldset .sortable-fields-container').forEach(container=>{
      const fsEl = container.closest('fieldset.draggable-fieldset');
      if (!fsEl) return;
      const fsName = fsEl.getAttribute('data-fieldset-name');
      if (!fsName) return;

      groups[fsName] = new Sortable(container, {
        group: 'fd-fields',
        animation: 150,
        handle: '.form-group, .draggable-field',
        ghostClass: 'bg-light',
        onEnd: async (evt)=>{
          try {
            const fromFs = evt.from.closest('fieldset.draggable-fieldset')?.getAttribute('data-fieldset-name');
            const toFs   = evt.to.closest('fieldset.draggable-fieldset')?.getAttribute('data-fieldset-name');
            if (!fromFs || !toFs) return;

            const data = window.formularioJsonOriginal || {};
            const fieldsets = deepClone(data.fieldsets || {});
            const fromArr = fieldsets[fromFs]?.campos || [];
            const toArr   = fieldsets[toFs]?.campos || [];

            // Identificar campo por atributo data-field-name
            const draggedEl = evt.item;
            const fieldName = draggedEl.getAttribute('data-field-name');
            if (!fieldName) return;

            // Extraer objeto del origen
            const idxFrom = fromArr.findIndex(c => (c && (c.nombre||c.name)) === fieldName);
            if (idxFrom < 0) return;
            const [moved] = fromArr.splice(idxFrom, 1);

            // Insertar en destino en la posición indicada
            const idxTo = Array.prototype.indexOf.call(evt.to.children, evt.item);
            toArr.splice(idxTo, 0, moved);

            // Guardar y actualizar cache
            fieldsets[fromFs].campos = fromArr;
            fieldsets[toFs].campos   = toArr;
            await postGuardarFieldsets(fieldsets);
            window.formularioJsonOriginal.fieldsets = fieldsets;
          } catch(err){
            console.error('Reordenar campos:', err);
            if (window.Swal) Swal.fire('Error', String(err.message||err), 'error');
          }
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Inicializa tras render del formulario
    initFieldSortable();
    // Si re-renderizas el layout dinámicamente, vuelve a llamar initFieldSortable();
    window.addEventListener('design-mode-changed', ()=> setTimeout(initFieldSortable, 100));
  });
})();
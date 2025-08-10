(function(){
  if (window.__FORM_DND_LOADED__) return; window.__FORM_DND_LOADED__ = true;

  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

  function postGuardar(blocks){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    if (blocks.fieldsets) form.append('fieldsets', JSON.stringify(blocks.fieldsets));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r => r.ok ? r.json() : r.json().then(e=>Promise.reject(new Error(e.error||'Error HTTP'))))
      .then(j => { if (j.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function initFieldSortable(){
    if (typeof Sortable === 'undefined') return;
    $all('#fd-root fieldset.draggable-fieldset .sortable-fields-container').forEach(container=>{
      if (container.__fdSortable) return;
      container.__fdSortable = new Sortable(container, {
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

            const draggedEl = evt.item;
            const fieldName = draggedEl.getAttribute('data-field-name');
            if (!fieldName) return;

            const idxFrom = fromArr.findIndex(c => (c && (c.nombre||c.name)) === fieldName);
            if (idxFrom < 0) return;
            const [moved] = fromArr.splice(idxFrom, 1);

            const idxTo = Array.prototype.indexOf.call(evt.to.children, evt.item);
            toArr.splice(idxTo, 0, moved);

            fieldsets[fromFs].campos = fromArr;
            fieldsets[toFs].campos   = toArr;
            await postGuardar({ fieldsets });
            window.formularioJsonOriginal.fieldsets = fieldsets;
          } catch(err){
            console.error('Reordenar campos:', err);
            if (window.Swal) Swal.fire('Error', String(err.message||err), 'error');
          }
        }
      });
    });
  }

  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    if (on) setTimeout(initFieldSortable, 50);
  }

  window.addEventListener('load', ()=> {
    window.addEventListener('design-mode-changed', onDesignModeChanged);
    if (document.getElementById('fd-root')?.classList.contains('design-mode')) setTimeout(initFieldSortable, 50);
  });
})();
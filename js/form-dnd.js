(function(){
  if (window.__FORM_DND_LOADED__) return; window.__FORM_DND_LOADED__ = true;

  const $ = (s, r)=> (r||document).querySelector(s);
  const $all = (s, r)=> Array.from((r||document).querySelectorAll(s));
  const clone = v => JSON.parse(JSON.stringify(v));

  function postGuardarFieldsets(fieldsets){
    const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('fieldsets', JSON.stringify(fieldsets));
    return fetch('guardar_layout.php', { method:'POST', body: form })
      .then(r=>r.ok ? r.json() : Promise.reject(new Error('Error HTTP '+r.status)))
      .then(j=>{ if (j?.success===false) throw new Error(j.error||'Error'); return j; });
  }

  function initFieldDnD(){
    if (typeof Sortable === 'undefined') return;
    // Campos dentro de cada fieldset
    $all('fieldset[data-fieldset-name] .sortable-fields-container').forEach(container=>{
      if (container.__fdSortable) return;
      container.__fdSortable = new Sortable(container, {
        group: 'fd-fields',
        animation: 150,
        handle: '.fd-dnd-handle, .form-group, .draggable-field',
        ghostClass: 'bg-light',
        onEnd: async (evt)=>{
          try{
            const fromFs = evt.from.closest('fieldset[data-fieldset-name]')?.getAttribute('data-fieldset-name');
            const toFs   = evt.to.closest('fieldset[data-fieldset-name]')?.getAttribute('data-fieldset-name');
            if (!fromFs || !toFs) return;

            const data = window.formularioJsonOriginal || {};
            const fieldsets = clone(data.fieldsets || {});
            const fromArr = fieldsets[fromFs]?.campos || [];
            const toArr   = fieldsets[toFs]?.campos || [];

            const itemEl = evt.item;
            const fieldName = itemEl.getAttribute('data-field-name');
            if (!fieldName) return;

            const idxFrom = fromArr.findIndex(c => (c && (c.nombre||c.name)) === fieldName);
            if (idxFrom < 0) return;
            const [moved] = fromArr.splice(idxFrom, 1);

            // Posición destino basada en índice del DOM
            const idxTo = Array.prototype.indexOf.call(evt.to.children, itemEl);
            toArr.splice(idxTo, 0, moved);

            fieldsets[fromFs].campos = fromArr;
            fieldsets[toFs].campos   = toArr;

            await postGuardarFieldsets(fieldsets);
            window.formularioJsonOriginal.fieldsets = fieldsets;

            // Refresca árbol si está abierto
            if (window.FD_refreshTree) window.FD_refreshTree();
          }catch(err){
            console.error(err);
            if (window.Swal) Swal.fire('Error', String(err.message||err), 'error');
          }
        }
      });
    });

    // Orden de fieldsets (opcional)
    const fsWrap = document.querySelector('[data-fieldsets-wrapper]');
    if (fsWrap && !fsWrap.__fdFsSortable){
      fsWrap.__fdFsSortable = new Sortable(fsWrap, {
        group: 'fd-fieldsets',
        animation: 150,
        handle: '.fd-fieldset-dnd-handle, legend, .card-header',
        onEnd: async (evt)=>{
          try{
            const data = window.formularioJsonOriginal || {};
            const orderEls = $all('[data-fieldset-name]', fsWrap);
            const newOrder = orderEls.map(el => el.getAttribute('data-fieldset-name')).filter(Boolean);
            if (!newOrder.length) return;

            const fieldsets = clone(data.fieldsets || {});
            const reordered = {};
            newOrder.forEach(name => reordered[name] = fieldsets[name]);
            await postGuardarFieldsets(reordered);
            window.formularioJsonOriginal.fieldsets = reordered;

            if (window.FD_refreshTree) window.FD_refreshTree();
          }catch(err){
            console.error(err);
            if (window.Swal) Swal.fire('Error', String(err.message||err), 'error');
          }
        }
      });
    }
  }

  function onDesignModeChanged(e){
    const on = !!(e && e.detail && e.detail.on);
    if (!on) return;
    setTimeout(initFieldDnD, 50);
  }

  window.addEventListener('load', ()=>{
    window.addEventListener('design-mode-changed', onDesignModeChanged);
    // Si ya está en diseño al cargar
    if (document.getElementById('fd-root')?.classList.contains('design-mode')){
      setTimeout(initFieldDnD, 50);
    }
  });
})();
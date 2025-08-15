/* MASTER_PROMPT_REFERENCE + PROMPT_MODO_DISENO
   Implementa Modo Diseño: al activarse muestra y monta el Árbol JSON y habilita controles.
   No elimina funcionalidades existentes; sólo complementa.
*/
(function(w,d){
  'use strict';
  const FD = w.FD || (w.FD={});
  FD.state = Object.assign({ designMode:false, dirty:false, treeLoaded:false, treeError:false, autoTreeOnFirstDesign:true }, FD.state||{});

  function getNode(){ return d.getElementById('fd-data'); }
  function getHost(){ return d.getElementById('fd-json-tree-app'); }
  function btnTree(){ return d.getElementById('toggleTreeBtn'); }
  function btnSave(){ return d.getElementById('saveLayoutBtn'); }
  function toggle(){ return d.getElementById('designModeToggle'); }

  function updateControls(){
    const on=FD.state.designMode;
    [btnTree(), btnSave()].forEach(b=>{
      if(!b) return;
      b.classList.toggle('d-none',!on);
      b.toggleAttribute('disabled',!on);
      b.setAttribute('aria-hidden', on?'false':'true');
    });
    const host=getHost();
    if(host) host.classList.toggle('d-none', !on && !FD.state.treeLoaded);
  }

  FD.setDesignMode=function(on){
    on=!!on;
    FD.state.designMode=on;
    d.body.classList.toggle('fd-design-mode', on);
    updateControls();
    if(on){
      initDnD();
      if(FD.state.autoTreeOnFirstDesign){ mountTree(); FD.state.autoTreeOnFirstDesign=false; }
    } else {
      const host=getHost(); if(host) host.classList.add('d-none');
    }
  };

  function initDnD(){
    if(typeof Sortable==='undefined') return;
    d.querySelectorAll('#formulariodinamico .row').forEach(row=>{
      if(row.dataset.fdColsSortable) return;
      Sortable.create(row,{ group:'fd-cols', draggable:'> [class*="col-"]', animation:150, onEnd(){ FD.markDirty(); } });
      row.dataset.fdColsSortable='1';
    });
    d.querySelectorAll('#formulariodinamico fieldset').forEach(fs=>{
      if(fs.dataset.fdFieldsSortable) return;
      const selector='.fd-field-wrapper, .form-group, .mb-3';
      if(!fs.querySelector(selector)) return;
      Sortable.create(fs,{ group:'fd-fields', draggable:selector, filter:'legend', animation:120, onEnd(){ FD.markDirty(); } });
      fs.dataset.fdFieldsSortable='1';
    });
  }

  function mountTree(){
    const host = getHost(); if(!host) return;
    host.classList.remove('d-none');
    if(FD.state.treeLoaded || host.querySelector('iframe') || FD.state.treeError) return;
    host.innerHTML = '<div class="text-center py-3 text-secondary">Cargando árbol...</div>';
    const ifr = d.createElement('iframe');
    ifr.src='arboljson/index.php';
    ifr.className='fd-tree-iframe w-100 border';
    ifr.style.minHeight='480px';
    let loaded=false;
    ifr.addEventListener('load', ()=>{ loaded=true; FD.state.treeLoaded=true; });
    ifr.addEventListener('error', ()=>{ FD.state.treeError=true; host.innerHTML='Árbol no disponible.'; });
    setTimeout(()=>{ if(!loaded && !FD.state.treeError){ FD.state.treeError=true; host.innerHTML='Árbol no disponible.'; } },8000);
    host.innerHTML=''; host.appendChild(ifr);
  }

  function bindEvents(){
    const cb=toggle();
    if(cb) cb.addEventListener('change',()=>FD.setDesignMode(cb.checked));
    const bt=btnTree(); if(bt) bt.addEventListener('click',()=>{ if(!FD.state.designMode) return; mountTree(); });
    const bs=btnSave();
    if(bs) bs.addEventListener('click',()=>{
      if(!FD.state.designMode) return;
      const payload = FD.buildSavePayload();
      fetch('guardar_layout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r=>r.json())
      .then(data=>{ alert('Guardado correctamente'); FD.state.dirty=false; })
      .catch(()=>{ alert('Error al guardar'); });
    });
    if(cb && cb.checked){ FD.setDesignMode(true); } else { updateControls(); }
  }
  if(d.readyState==='loading'){ d.addEventListener('DOMContentLoaded', bindEvents); } else { bindEvents(); }
})(window,document);

/* Compat: define alias $/$all si no existen (sin jQuery) */
(function(w,d){
  if(typeof w.$ === 'undefined'){ w.$ = (sel,root)=> (root||d).querySelector(sel); }
  if(typeof w.$all === 'undefined'){ w.$all = (sel,root)=> Array.from((root||d).querySelectorAll(sel)); }
})(window,document);

window.addEventListener('message', (e)=>{
  const m=e.data; if(!m||!m.fdTree) return;
  if(m.type==='updateJSON' && m.payload){
    FD.setFormJSON(m.payload);
    // Aquí puedes refrescar el render si tienes lógica para ello
    FD.markDirty();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('select[data-source]').forEach(function(sel) {
    let config;
    try { config = JSON.parse(sel.getAttribute('data-source')); } catch(e){ config = null; }
    if (!config || !config.tabla) return;

    fetch('ajax/selectdata.php?tabla=' + encodeURIComponent(config.tabla) +
          (config.campo_valor ? '&campo_valor=' + encodeURIComponent(config.campo_valor) : '') +
          (config.campo_etiqueta ? '&campo_etiqueta=' + encodeURIComponent(config.campo_etiqueta) : '') +
          (config.filtro ? '&filtro=' + encodeURIComponent(config.filtro) : '') +
          (config.order ? '&order=' + encodeURIComponent(config.order) : ''))
      .then(r => r.json())
      .then(data => {
        sel.innerHTML = '<option value="">Seleccione...</option>';
        data.forEach(opt => {
          sel.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
        });
      });
  });
});

function renderField(field) {
  // ...otros tipos...
  if(field.tipo === 'datatable') {
    return renderDatatable(field);
  }
  // ...otros tipos...
}

function renderDatatable(field) {
  // Crea contenedor
  const container = document.createElement('div');
  container.className = 'fd-datatable-container mb-3';

  // Botón agregar
  const btnAdd = document.createElement('button');
  btnAdd.textContent = 'Agregar fila';
  btnAdd.className = 'btn btn-primary btn-sm mb-2';
  btnAdd.onclick = function() {
    // Lógica para agregar fila (puedes abrir un modal o agregar inputs en la tabla)
    const tr = document.createElement('tr');
    field.columnas.forEach(col => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control form-control-sm';
      td.appendChild(input);
      tr.appendChild(td);
    });
    // Acciones
    const tdAcc = document.createElement('td');
    const btnSave = document.createElement('button');
    btnSave.textContent = 'Guardar';
    btnSave.className = 'btn btn-success btn-sm';
    btnSave.onclick = function() {
      // Aquí puedes enviar los datos vía AJAX a datatable_crud.php?action=add
      tr.remove();
    };
    tdAcc.appendChild(btnSave);
    tr.appendChild(tdAcc);
    tbody.appendChild(tr);
  };

  // Tabla
  const table = document.createElement('table');
  table.className = 'table table-bordered table-sm';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const trHead = document.createElement('tr');
  field.columnas.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.etiqueta || col.nombre;
    trHead.appendChild(th);
  });
  const thAcc = document.createElement('th');
  thAcc.textContent = 'Acciones';
  trHead.appendChild(thAcc);
  thead.appendChild(trHead);
  table.appendChild(thead);
  table.appendChild(tbody);

  // Cargar datos existentes (AJAX)
  fetch('ajax/datatable_crud.php?tabla=' + encodeURIComponent(field.dataSource?.tabla || field.nombre) + '&action=list')
    .then(r => r.json())
    .then(resp => {
      (resp.data||[]).forEach(row => {
        const tr = document.createElement('tr');
        field.columnas.forEach(col => {
          const td = document.createElement('td');
          td.textContent = row[col.nombre] || '';
          tr.appendChild(td);
        });
        // Acciones
        const tdAcc = document.createElement('td');
        const btnEdit = document.createElement('button');
        btnEdit.textContent = 'Editar';
        btnEdit.className = 'btn btn-warning btn-sm me-1';
        btnEdit.onclick = function() {
          // Lógica para editar (puedes abrir modal o convertir celdas en inputs)
        };
        const btnDel = document.createElement('button');
        btnDel.textContent = 'Eliminar';
        btnDel.className = 'btn btn-danger btn-sm';
        btnDel.onclick = function() {
          // Lógica para eliminar (AJAX a datatable_crud.php?action=delete)
          tr.remove();
        };
        tdAcc.appendChild(btnEdit);
        tdAcc.appendChild(btnDel);
        tr.appendChild(tdAcc);
        tbody.appendChild(tr);
      });
    });

  container.appendChild(btnAdd);
  container.appendChild(table);
  return container;
}



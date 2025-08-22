// --- Funcionalidades avanzadas datatable ---
// Orden por columna
function makeTableSortable(table) {
  const thead = table.querySelector('thead');
  if (!thead) return;
  Array.from(thead.querySelectorAll('th')).forEach((th, idx) => {
    th.style.cursor = 'pointer';
    th.onclick = function() {
      const rows = Array.from(table.querySelector('tbody').rows);
      const asc = th.dataset.sortAsc === 'true';
      rows.sort((a, b) => {
        const va = a.cells[idx].querySelector('input')?.value || a.cells[idx].textContent;
        const vb = b.cells[idx].querySelector('input')?.value || b.cells[idx].textContent;
        return asc ? va.localeCompare(vb, undefined, {numeric:true}) : vb.localeCompare(va, undefined, {numeric:true});
      });
      rows.forEach(r => table.querySelector('tbody').appendChild(r));
      th.dataset.sortAsc = (!asc).toString();
    };
  });
}

// Paginación
function makeTablePaginated(dtWrap, table, pageSize=10) {
  const tbody = table.querySelector('tbody');
  let currentPage = 1;
  function renderPage() {
    const rows = Array.from(tbody.rows);
    rows.forEach((row, i) => {
      row.style.display = (i >= (currentPage-1)*pageSize && i < currentPage*pageSize) ? '' : 'none';
    });
    pageInfo.textContent = `Página ${currentPage} de ${Math.ceil(rows.length/pageSize)}`;
  }
  const pager = document.createElement('div');
  pager.className = 'fd-datatable-pager d-flex justify-content-end align-items-center gap-2 mb-2';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Anterior';
  prevBtn.className = 'btn btn-sm btn-secondary';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Siguiente';
  nextBtn.className = 'btn btn-sm btn-secondary';
  const pageInfo = document.createElement('span');
  pager.appendChild(prevBtn);
  pager.appendChild(pageInfo);
  pager.appendChild(nextBtn);
  dtWrap.insertBefore(pager, table);
  prevBtn.onclick = function(){ if(currentPage>1){currentPage--;renderPage();} };
  nextBtn.onclick = function(){ const rows = tbody.rows.length; if(currentPage<Math.ceil(rows/pageSize)){currentPage++;renderPage();} };
  renderPage();
}

// Exportar CSV/Excel
function makeTableExportable(dtWrap, table) {
  const exportBar = document.createElement('div');
  exportBar.className = 'fd-datatable-export mb-2 d-flex justify-content-end gap-2';
  const csvBtn = document.createElement('button');
  csvBtn.textContent = 'Exportar CSV';
  csvBtn.className = 'btn btn-sm btn-outline-primary';
  const excelBtn = document.createElement('button');
  excelBtn.textContent = 'Exportar Excel';
  excelBtn.className = 'btn btn-sm btn-outline-success';
  exportBar.appendChild(csvBtn);
  exportBar.appendChild(excelBtn);
  dtWrap.insertBefore(exportBar, table);
  csvBtn.onclick = function(){
    let csv = '';
    Array.from(table.querySelectorAll('thead th')).forEach(th => csv += th.textContent + ',');
    csv = csv.slice(0,-1)+'\n';
    Array.from(table.querySelector('tbody').rows).forEach(row => {
      Array.from(row.cells).forEach(td => {
        const inp = td.querySelector('input');
        csv += (inp ? inp.value : td.textContent) + ',';
      });
      csv = csv.slice(0,-1)+'\n';
    });
    const blob = new Blob([csv],{type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'datatable.csv';
    a.click();
  };
  excelBtn.onclick = function(){
    alert('Exportar a Excel: funcionalidad básica CSV implementada. Para Excel avanzado, usar librería externa.');
  };
}

// Selección múltiple de filas
function makeTableSelectable(table, config) {
  if (config.seleccion_multiple !== 'enable') return;
          // Agregar columna de selección múltiple al inicio
          const thSel = document.createElement('th');
          thSel.textContent = '';
          theadRow.insertBefore(thSel, theadRow.firstChild);
          // Agregar checkboxSel a cada fila
          Array.from(tbody.querySelectorAll('tr')).forEach(function(tr) {
            const tdSel = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'checkboxSel';
            cb.addEventListener('change', function() {
              tr.classList.toggle('selected', cb.checked);
            });
            tdSel.appendChild(cb);
            tr.insertBefore(tdSel, tr.firstChild);
          });
          // Doble click para seleccionar/deseleccionar
          tbody.addEventListener('dblclick', function(e) {
            if (e.target.tagName === 'TD' && e.target.querySelector('.checkboxSel')) {
              const cb = e.target.querySelector('.checkboxSel');
              cb.checked = !cb.checked;
              e.target.closest('tr').classList.toggle('selected', cb.checked);
            }
          });
  const thead = table.querySelector('thead');
  if (!thead) return;
  const toggleBar = document.createElement('div');
  toggleBar.className = 'fd-datatable-toggle mb-2 d-flex justify-content-end gap-2';
  Array.from(thead.querySelectorAll('th')).forEach((th, idx) => {
    const btn = document.createElement('button');
    btn.textContent = 'Columna: ' + th.textContent;
    btn.className = 'btn btn-sm btn-outline-dark';
    btn.onclick = function(){
      const show = th.style.display !== 'none';
      th.style.display = show ? 'none' : '';
      Array.from(table.querySelector('tbody').rows).forEach(row => {
        if(row.cells[idx]) row.cells[idx].style.display = show ? 'none' : '';
      });
      Array.from(table.querySelectorAll('tfoot td')).forEach((td, i) => {
        if(i===idx) td.style.display = show ? 'none' : '';
      });
    };
    toggleBar.appendChild(btn);
  });
  dtWrap.insertBefore(toggleBar, table);
}

// Resaltado condicional
function makeTableHighlight(table) {
  Array.from(table.querySelector('tbody').rows).forEach(row => {
    Array.from(row.cells).forEach(td => {
      const val = td.querySelector('input')?.value || td.textContent;
      if(!isNaN(val) && parseFloat(val)>1000) td.style.background='#ffe0e0';
    });
  });
}

// Tooltips en encabezados
function makeTableTooltips(table) {
  Array.from(table.querySelectorAll('thead th')).forEach(th => {
    th.title = 'Filtrar y ordenar por ' + th.textContent;
  });
}

// Agrupación de filas por valor de columna (simple)
function makeTableGrouped(table, groupColIdx=0) {
  // Agrupa por la columna indicada
  // Implementación simple: solo visual
  let lastVal = null;
  Array.from(table.querySelector('tbody').rows).forEach(row => {
    const val = row.cells[groupColIdx]?.querySelector('input')?.value || row.cells[groupColIdx]?.textContent;
    if(val!==lastVal){
      row.style.borderTop='2px solid #333';
      lastVal=val;
    }
  });
}

// Acciones masivas
function makeTableBulkActions(dtWrap, table) {
  const bulkBar = document.createElement('div');
  bulkBar.className = 'fd-datatable-bulk mb-2 d-flex justify-content-end gap-2';
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Eliminar seleccionados';
  delBtn.className = 'btn btn-sm btn-danger';
  bulkBar.appendChild(delBtn);
  dtWrap.insertBefore(bulkBar, table);
  delBtn.onclick = function(){
    Array.from(table.querySelector('tbody').rows).forEach(row => {
      const cb = row.querySelector('input[type="checkbox"]');
      if(cb && cb.checked) row.remove();
    });
  };
}

// Historial de cambios/deshacer
function makeTableHistory(table) {
  let history = [];
  function saveState() {
    const rows = Array.from(table.querySelector('tbody').rows).map(row =>
      Array.from(row.cells).map(td => td.querySelector('input')?.value || td.textContent)
    );
    history.push(JSON.stringify(rows));
    if(history.length>20) history.shift();
  }
  table.addEventListener('input', saveState);
  // Botón deshacer
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Deshacer';
  undoBtn.className = 'btn btn-sm btn-warning mb-2';
  table.parentElement.insertBefore(undoBtn, table);
  undoBtn.onclick = function(){
    if(history.length>1){
      history.pop();
      const last = JSON.parse(history[history.length-1]);
      Array.from(table.querySelector('tbody').rows).forEach((row,i) => {
        Array.from(row.cells).forEach((td,j) => {
          const inp = td.querySelector('input');
          if(inp) inp.value = last[i][j];
          else td.textContent = last[i][j];
        });
      });
    }
  };
  saveState();
}

// Aplicar todas las funcionalidades al datatable
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-tipo="datatable"]').forEach(function(dtWrap) {
    const table = dtWrap.querySelector('table');
    if(!table) return;
    const config = dtWrap.dataset.config ? JSON.parse(dtWrap.dataset.config) : {};
    makeTableSortable(table);
    makeTablePaginated(dtWrap, table, 10);
    makeTableExportable(dtWrap, table);
    makeTableSelectable(table, config);
    makeTableColumnToggle(dtWrap, table);
    makeTableHighlight(table);
    makeTableTooltips(table);
    makeTableGrouped(table, 0);
    makeTableBulkActions(dtWrap, table);
    makeTableHistory(table);
  });
});
// --- Funciones globales para diagnóstico ---
window.generarCampo = window.generarCampo || function(){ return null; };
window.generarLayout = window.generarLayout || function(){ return null; };
window.renderTabsBlock = window.renderTabsBlock || function(){ return null; };
// --- Lógica avanzada para datatables dinámicos ---
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-tipo="datatable"]').forEach(function(dtWrap) {
    const table = dtWrap.querySelector('table');
    const tbody = table.querySelector('tbody');
    const thead = table.querySelector('thead');
    // --- Propiedades dataSource y filtro siempre presentes ---
    const config = dtWrap.dataset.config ? JSON.parse(dtWrap.dataset.config) : {};
    const dataSource = config.dataSource || {};
    const filtro = config.filtro || '';

    // --- Contenedor superior para búsqueda y agregar ---
    const topBar = document.createElement('div');
    topBar.className = 'd-flex justify-content-end align-items-center mb-2 gap-2';

    // --- Búsqueda rápida ---
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'form-control form-control-sm';
    searchInput.style.maxWidth = '200px';
    searchInput.placeholder = 'Buscar...';
    topBar.appendChild(searchInput);
    searchInput.addEventListener('input', function() {
      const term = searchInput.value.toLowerCase();
      Array.from(tbody.rows).forEach(function(row) {
        row.style.display = Array.from(row.cells).some(td => {
          const txt = td.textContent.toLowerCase();
          const inp = td.querySelector('input');
          const val = inp ? (inp.value || '').toLowerCase() : '';
          return txt.includes(term) || val.includes(term);
        }) ? '' : 'none';
      });
    });

    // --- Botón para agregar fila ---
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Agregar';
      addBtn.className = 'btn btn-sm btn-primary';
      topBar.appendChild(addBtn);
      addBtn.addEventListener('click', function() {
        const row = document.createElement('tr');
        // Si seleccion_multiple está habilitado, agregar celda de checkbox al inicio
        if (config.seleccion_multiple === 'enable') {
          const selTd = document.createElement('td');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.setAttribute('data-nombre', 'checkboxSel');
          selTd.appendChild(cb);
          row.appendChild(selTd);
        }
        Array.from(thead.querySelectorAll('th')).forEach(function(th, thIdx) {
          // Si seleccion_multiple está habilitado y es la primera columna, saltar (ya agregada)
          if (config.seleccion_multiple === 'enable' && thIdx === 0) return;
          const colName = th.textContent;
          const td = document.createElement('td');
          // Buscar la columna en config.columnas para obtener propiedades extra
          let colDef = Array.isArray(config.columnas) ? config.columnas.find(c => (c.etiqueta || c.nombre) === colName) : null;
          if (!colDef) {
            console.log('[FD] No se encontró columna para:', colName, config.columnas);
          }
          let inputType = 'text';
          if (colName === 'Total' || (colDef && colDef.tipo === 'number')) inputType = 'number';
          let input = document.createElement('input');
          input.type = inputType;
          input.className = 'form-control form-control-sm';
          input.name = colDef ? colDef.nombre : colName.toLowerCase();
          if (colDef && colDef.formula) {
            input.setAttribute('data-formula', colDef.formula);
            console.log('[FD] data-formula agregado:', colDef.formula, 'a', input.name);
          }
          if (colName === 'Total') input.setAttribute('readonly', '');
          td.appendChild(input);
          row.appendChild(td);
        });
        // Botón eliminar
        const delTd = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.onclick = function(){ row.remove(); updateSum(); };
        delTd.appendChild(delBtn);
        row.appendChild(delTd);
        tbody.appendChild(row);
        // Actualización dinámica de fórmula total_linea
        const precioInput = row.querySelector('input[name="precio"]');
        const cantidadInput = row.querySelector('input[name="cantidad"]');
        const totalInput = row.querySelector('input[name="total_linea"]');
        function updateFormula() {
          // Soporte para sentencias SQL directas en la fórmula
          if (totalInput && totalInput.getAttribute('data-formula')) {
            const formula = totalInput.getAttribute('data-formula');
            if (/^SQL:/i.test(formula)) {
              // Extraer la sentencia SQL
              let sql = formula.replace(/^SQL:/i, '').trim();
              // Reemplazar {campo} en SQL por valores actuales del formulario
              sql = sql.replace(/\{(\w+)\}/g, function(_, campo){
                const el = document.querySelector(`[name='${campo}']`);
                return el ? el.value : '';
              });
              // AJAX para obtener el valor
              fetch(`ajax/sqlformula.php?sql=${encodeURIComponent(sql)}`)
                .then(r => r.json())
                .then(data => {
                  totalInput.value = data && data.valor ? data.valor : '';
                  updateSum();
                });
              return;
            }
          }
          // Soporte para BusquedaDato en la fórmula
          if (totalInput && totalInput.getAttribute('data-formula')) {
            const formula = totalInput.getAttribute('data-formula');
            if (/BusquedaDato\s*\(/.test(formula)) {
              // Extraer parámetros de BusquedaDato(tabla, valoratraer, filtro, order)
              const match = formula.match(/BusquedaDato\s*\(([^)]+)\)/);
              if (match) {
                const params = match[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                const [tabla, valoratraer, filtro, order] = params;
                // Reemplazar {campo} en filtro y order por valores actuales del formulario
                let filtroFinal = filtro ? filtro.replace(/\{(\w+)\}/g, function(_, campo){
                  const el = document.querySelector(`[name='${campo}']`);
                  return el ? el.value : '';
                }) : '';
                let orderFinal = order ? order.replace(/\{(\w+)\}/g, function(_, campo){
                  const el = document.querySelector(`[name='${campo}']`);
                  return el ? el.value : '';
                }) : '';
                // AJAX para obtener el valor, incluyendo order si existe
                let url = `ajax/busquedato.php?tabla=${encodeURIComponent(tabla)}&valor=${encodeURIComponent(valoratraer)}&filtro=${encodeURIComponent(filtroFinal)}`;
                if (orderFinal) url += `&order=${encodeURIComponent(orderFinal)}`;
                fetch(url)
                  .then(r => r.json())
                  .then(data => {
                    totalInput.value = data && data.valor ? data.valor : '';
                    updateSum();
                  });
                return;
              }
            }
          }
          // Fórmula estándar
          const precio = parseFloat(precioInput?.value || '0');
          const cantidad = parseFloat(cantidadInput?.value || '0');
          const total = precio * cantidad;
          if (totalInput) totalInput.value = isNaN(total) ? '' : total;
          updateSum();
        }
        if (precioInput) precioInput.addEventListener('input', updateFormula);
        if (cantidadInput) cantidadInput.addEventListener('input', updateFormula);
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', updateSum));
        updateFormula();
      });

      // Agregar columna de checkbox al thead si seleccion_multiple está habilitado
      if (config.seleccion_multiple === 'enable') {
        const theadRow = thead.querySelector('tr');
        if (theadRow && theadRow.querySelector('th[data-checkbox]') == null) {
          const selTh = document.createElement('th');
          selTh.setAttribute('data-checkbox', 'true');
          selTh.setAttribute('data-nombre', 'checkboxSel');
          selTh.textContent = '';
          theadRow.insertBefore(selTh, theadRow.firstChild);
          // Doble click para seleccionar/deseleccionar todos
          let seleccionados = false;
          selTh.addEventListener('dblclick', function() {
            seleccionados = !seleccionados;
            Array.from(tbody.querySelectorAll('input[type="checkbox"][data-nombre="checkboxSel"]')).forEach(cb => {
              cb.checked = seleccionados;
            });
          });
        }
      } else {
        // Si no está habilitado, eliminar columna de checkbox si existe
        const theadRow = thead.querySelector('tr');
        const selTh = theadRow && theadRow.querySelector('th[data-checkbox]');
        if (selTh) selTh.remove();
        // Eliminar celdas de checkbox en el tbody
        Array.from(tbody.rows).forEach(row => {
          const firstCell = row.cells[0];
          if (firstCell && firstCell.querySelector('input[type="checkbox"][data-nombre="checkboxSel"]')) {
            firstCell.remove();
          }
        });
      }
      dtWrap.insertBefore(topBar, table);
      // Scroll horizontal al final de la grilla, justificado a la izquierda
      if (!dtWrap.querySelector('.fd-datatable-scroll-x')) {
        const scrollDiv = document.createElement('div');
        scrollDiv.className = 'fd-datatable-scroll-x mt-2 d-flex justify-content-start';
        scrollDiv.style.overflowX = 'auto';
        scrollDiv.style.width = '100%';
        scrollDiv.appendChild(table);
        dtWrap.appendChild(scrollDiv);
      }
      // Línea en blanco al final del datatable, siempre visible
      function ensureBlankLine() {
        let blankRow = dtWrap.querySelector('.fd-datatable-blank-row');
        if (!blankRow) {
          blankRow = document.createElement('div');
          blankRow.className = 'fd-datatable-blank-row';
          blankRow.style.height = '32px';
          dtWrap.appendChild(blankRow);
        }
      }
      ensureBlankLine();
      // Reasegurar línea en blanco tras cambios
      const observer = new MutationObserver(ensureBlankLine);
      observer.observe(table, { childList: true, subtree: true });

    // --- Filtro avanzado con botón y panel ---
    const filterAdvancedBtn = document.createElement('button');
    filterAdvancedBtn.textContent = 'Filtro Avanzado';
    filterAdvancedBtn.className = 'btn btn-secondary btn-sm ms-2';
    topBar.appendChild(filterAdvancedBtn);

    const filterPanel = document.createElement('div');
    filterPanel.className = 'fd-advanced-filter-panel card p-3 mb-2';
    filterPanel.style.display = 'none';

    function addAdvancedFilterRow(col, parentName = '') {
      if (col.tipo === 'seleccion' || col.tipo === 'checkbox' || col.nombre === 'seleccion' || col.etiqueta?.toLowerCase() === 'seleccion') return;
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center gap-2 mb-1';
      // Campo
      const label = document.createElement('span');
      label.textContent = (parentName ? parentName + '.' : '') + (col.etiqueta || col.nombre);
      row.appendChild(label);
      // Operador
      const op = document.createElement('select');
      op.className = 'form-select form-select-sm';
      ['=', '!=', '>', '<', '>=', '<=', 'contiene', 'no contiene', 'y', 'o'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        op.appendChild(o);
      });
      row.appendChild(op);
      // Valor
      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.className = 'form-control form-control-sm';
      row.appendChild(valInput);
      filterPanel.appendChild(row);
    }

    if (Array.isArray(config.columnas)) {
      config.columnas.forEach(function(col) {
        if (col.tipo !== 'button' && col.tipo !== 'accion' && col.nombre !== 'acciones' && col.etiqueta?.toLowerCase() !== 'acciones') {
          addAdvancedFilterRow(col);
          if (Array.isArray(col.hijos)) {
            col.hijos.forEach(function(hijo) {
              if (hijo.tipo !== 'button' && hijo.tipo !== 'accion' && hijo.nombre !== 'acciones' && hijo.etiqueta?.toLowerCase() !== 'acciones') {
                addAdvancedFilterRow(hijo, col.nombre);
              }
            });
          }
        }
      });
    }
    dtWrap.insertBefore(filterPanel, table);

    filterAdvancedBtn.onclick = function() {
      filterPanel.style.display = filterPanel.style.display === 'none' ? '' : 'none';
    };

    // Lógica de filtrado avanzado (simplificada, puede expandirse para lógica compuesta)
    filterPanel.addEventListener('input', function() {
      Array.from(tbody.rows).forEach(function(row) {
        let show = true;
        Array.from(filterPanel.children).forEach(function(fRow) {
          const label = fRow.querySelector('span')?.textContent;
          const op = fRow.querySelector('select')?.value;
          const val = fRow.querySelector('input')?.value.toLowerCase();
          // Si hay columna de selección múltiple, sumar +1 al índice
          let idx = Array.from(thead.querySelectorAll('th')).findIndex(th => th.textContent === label.split('.').pop());
          if (config.seleccion_multiple === 'enable') idx += 1;
          let cellValue = '';
          if (idx >= 0) {
            const inp = row.cells[idx]?.querySelector('input');
            cellValue = inp ? (inp.value || '').toLowerCase() : (row.cells[idx]?.textContent || '').toLowerCase();
          }
          if (val) {
            switch(op) {
              case '=': show = show && cellValue === val; break;
              case '!=': show = show && cellValue !== val; break;
              case '>': show = show && parseFloat(cellValue) > parseFloat(val); break;
              case '<': show = show && parseFloat(cellValue) < parseFloat(val); break;
              case '>=': show = show && parseFloat(cellValue) >= parseFloat(val); break;
              case '<=': show = show && parseFloat(cellValue) <= parseFloat(val); break;
              case 'contiene': show = show && cellValue.includes(val); break;
              case 'no contiene': show = show && !cellValue.includes(val); break;
              // 'y' y 'o' pueden expandirse para lógica compuesta
            }
          }
        });
        row.style.display = show ? '' : 'none';
      });
    });

    // --- Suma de columnas ---
    function updateSum() {
      if (!Array.isArray(config.sumar_columnas)) return;
      // Eliminar fila de suma previa si existe
      let sumTr = table.querySelector('tfoot .fd-datatable-sum-row');
      if (sumTr) sumTr.remove();
      // Crear tfoot si no existe
      let tfoot = table.querySelector('tfoot');
      if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
      }
      const sumRow = document.createElement('tr');
      sumRow.className = 'fd-datatable-sum-row';
      Array.from(thead.querySelectorAll('th')).forEach(function(th) {
        const colName = th.textContent;
        const td = document.createElement('td');
        if (config.sumar_columnas.includes(colName.toLowerCase()) || config.sumar_columnas.includes(colName)) {
          let sum = 0;
          Array.from(tbody.rows).forEach(function(row) {
            const idx = Array.from(thead.querySelectorAll('th')).findIndex(th2 => th2.textContent === colName);
            if (idx >= 0) {
              const inp = row.cells[idx]?.querySelector('input');
              const val = inp ? parseFloat(inp.value || '0') : parseFloat(row.cells[idx]?.textContent || '0');
              if (!isNaN(val)) sum += val;
            }
          });
          td.textContent = sum;
          td.style.fontWeight = 'bold';
        }
        sumRow.appendChild(td);
      });
      tfoot.appendChild(sumRow);
      // Fila en blanco siempre al final
      let blankTr = table.querySelector('tfoot .fd-datatable-blank-row');
      if (blankTr) blankTr.remove();
      const blankRow = document.createElement('tr');
      blankRow.className = 'fd-datatable-blank-row';
      Array.from(thead.querySelectorAll('th')).forEach(function() {
        const td = document.createElement('td');
        blankRow.appendChild(td);
      });
      tfoot.appendChild(blankRow);
    }

    // --- Carga desde dataSource si tabla está definida ---
    if (dataSource.tabla) {
      // Aquí iría la lógica AJAX para cargar datos desde BD usando dataSource y filtro
      // Por ahora solo placeholder
      // fetch('ajax/selectdata.php?...')
    }
  });
});
// Renderiza el formulario completo desde el JSON
// Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
function renderForm(json, containerId = 'formulariodinamico') {
  // Diagnóstico visual: estado de Bootstrap y tabs
  var diagDiv = document.createElement('div');
  diagDiv.className = 'alert alert-info mb-2';
  var bsStatus = (window.bootstrap && window.bootstrap.Tab) ? 'Bootstrap 5 detectado' : 'Bootstrap 5 NO detectado';
  var tabsStatus = container.querySelector('.nav-tabs') ? 'Tabs HTML detectados' : 'Tabs HTML NO detectados';
  diagDiv.innerHTML = '<strong>Diagnóstico:</strong> ' + bsStatus + ' | ' + tabsStatus;
  container.prepend(diagDiv);
  const container = document.getElementById(containerId);
  if (!container || !json || !json.fieldsets) return;
  // Si ya existen tabs generados por PHP, solo inicializar interactividad
  if (container.querySelector('.nav-tabs')) {
    // Inicializa los tabs usando Bootstrap 5 (no manipular manualmente las clases)
    if (window.bootstrap && window.bootstrap.Tab) {
      var tabEls = container.querySelectorAll('.nav-tabs .nav-link');
      tabEls.forEach(function(tabEl) {
        tabEl.addEventListener('click', function(e) {
          e.preventDefault();
          var tab = new window.bootstrap.Tab(tabEl);
          tab.show();
        });
      });
    } else {
      // Fallback manual solo si Bootstrap no está disponible
      var tabEls = container.querySelectorAll('.nav-tabs .nav-link');
      tabEls.forEach(function(tabEl) {
        tabEl.addEventListener('click', function(e) {
          e.preventDefault();
          var target = container.querySelector(tabEl.getAttribute('data-bs-target'));
          if (!target) return;
          tabEls.forEach(function(t) { t.classList.remove('active'); });
          var panes = container.querySelectorAll('.tab-pane');
          panes.forEach(function(p) { p.classList.remove('show','active'); });
          tabEl.classList.add('active');
          target.classList.add('show','active');
        });
      });
    }
    // Inicializar campos especiales en el HTML generado por PHP
    // Embevido
    container.querySelectorAll('[data-tipo="embevido"], .fd-embed').forEach(function(el){
      if (el.dataset.embeddedInit) return;
      var url = el.dataset.url || el.getAttribute('data-url_embebido');
      var alto = el.dataset.alto || el.getAttribute('data-alto') || '400px';
      var ancho = el.dataset.ancho || el.getAttribute('data-ancho') || '100%';
      var mostrarBorde = el.dataset.mostrarBorde || el.getAttribute('data-mostrar_borde') ? '1px solid #ccc' : 'none';
      var permitirFS = el.dataset.permitirFullscreen || el.getAttribute('data-permitir_fullscreen') ? 'allowfullscreen' : '';
      if (url) {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = ancho;
        iframe.style.height = alto;
        iframe.style.border = mostrarBorde;
        if (permitirFS) iframe.setAttribute('allowfullscreen','true');
        el.innerHTML = '';
        el.appendChild(iframe);
        el.dataset.embeddedInit = '1';
      }
    });
    // Datatable
    container.querySelectorAll('[data-tipo="datatable"]').forEach(function(el){
      if (el.dataset.datatableInit) return;
      var nombre = el.getAttribute('data-nombre');
      var field = null;
      if (json && json.fieldsets) {
        Object.values(json.fieldsets).forEach(function(fs){
          if (fs.campos) {
            fs.campos.forEach(function(c){
              if (c.nombre === nombre && c.tipo === 'datatable') field = c;
            });
          }
        });
      }
      if (field) {
        var dt = renderDatatable(field);
        el.innerHTML = '';
        el.appendChild(dt);
        el.dataset.datatableInit = '1';
      }
    });
    return;
  }
  // Si no existen tabs, renderizar el formulario completo (modo fallback)
  function renderFieldsetRec(fieldset) {
    const fs = document.createElement('fieldset');
    if (fieldset.titulo) {
      const legend = document.createElement('legend');
      legend.textContent = fieldset.titulo;
      fs.appendChild(legend);
    }
    // ...existing code...
    if (Array.isArray(fieldset.layout)) {
      fieldset.layout.forEach(rowObj => {
        if (!rowObj.row || !Array.isArray(rowObj.row)) return;
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowObj.row.forEach(colObj => {
          const colDiv = document.createElement('div');
          colDiv.className = 'col-' + (colObj.col || 12);
          const campoKey = colObj.campo;
          const campoObj = Array.isArray(fieldset.campos)
            ? fieldset.campos.find(f => f.nombre === campoKey)
            : null;
          if (campoObj) {
            const fieldEl = renderField(campoObj);
            if (fieldEl) {
              const wrap = document.createElement('div');
              wrap.className = 'fd-field-wrapper mb-3';
              wrap.appendChild(fieldEl);
              colDiv.appendChild(wrap);
            }
          } else {
            colDiv.innerHTML = '<div class="alert alert-warning">Campo no encontrado: ' + campoKey + '</div>';
          }
          rowDiv.appendChild(colDiv);
        });
        fs.appendChild(rowDiv);
      });
    } else if (fieldset.campos) {
      if (!Array.isArray(fieldset.campos)) {
        fs.appendChild(document.createElement('div')).innerHTML = '<div class="alert alert-warning">Error: El fieldset no tiene un array de campos.</div>';
        return fs;
      }
      fieldset.campos.forEach(field => {
        if (field.tipo === 'fieldset' && field.fieldset_ref && json.fieldsets[field.fieldset_ref]) {
          fs.appendChild(renderFieldsetRec(json.fieldsets[field.fieldset_ref]));
        } else {
          const fieldEl = renderField(field);
          if (fieldEl) {
            const wrap = document.createElement('div');
            wrap.className = 'fd-field-wrapper mb-3';
            wrap.appendChild(fieldEl);
            fs.appendChild(wrap);
          }
        }
      });
    }
    return fs;
  }
  // Renderizar solo si no hay tabs
  if (!(json.layout && json.layout.main && json.layout.main.tabs)) {
    Object.values(json.fieldsets).forEach(fieldset => {
      container.appendChild(renderFieldsetRec(fieldset));
    });
  }
}
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
  // Renderiza el formulario principal y luego carga los selects
  function cargarSelectsDataSource() {
    // Diagnóstico para select de países
    var paisSel = document.querySelector('select[name="pais_db"]');
    if (!paisSel) {
      console.warn('No se encontró el select de países (pais_db) en el DOM');
      var diag = document.createElement('div');
      diag.className = 'alert alert-danger';
      diag.innerText = 'No se encontró el select de países (pais_db) en el DOM';
      document.getElementById('formulariodinamico').prepend(diag);
    } else {
      let config;
      try { config = JSON.parse(paisSel.getAttribute('data-source')); } catch(e){ config = null; }
      if (!config || !config.tabla) {
        console.warn('El select de países no tiene data-source válido');
        var diag = document.createElement('div');
        diag.className = 'alert alert-danger';
        diag.innerText = 'El select de países no tiene data-source válido';
        paisSel.parentNode.insertBefore(diag, paisSel);
      } else {
        fetch('ajax/selectdata.php?tabla=' + encodeURIComponent(config.tabla) +
              (config.campo_valor ? '&campo_valor=' + encodeURIComponent(config.campo_valor) : '') +
              (config.campo_etiqueta ? '&campo_etiqueta=' + encodeURIComponent(config.campo_etiqueta) : '') +
              (config.filtro ? '&filtro=' + encodeURIComponent(config.filtro) : '') +
              (config.order ? '&order=' + encodeURIComponent(config.order) : ''))
          .then(r => r.json())
          .then(data => {
            console.log('Respuesta AJAX países:', data);
            paisSel.innerHTML = '<option value="">Seleccione...</option>';
            if (!data || !Array.isArray(data) || data.length === 0) {
              console.warn('La respuesta de países está vacía');
              var diag = document.createElement('div');
              diag.className = 'alert alert-warning';
              diag.innerText = 'No hay países disponibles (respuesta vacía)';
              paisSel.parentNode.insertBefore(diag, paisSel);
            } else {
              data.forEach(opt => {
                paisSel.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
              });
            }
          })
          .catch(err => {
            console.error('Error al cargar países:', err);
            var diag = document.createElement('div');
            diag.className = 'alert alert-danger';
            diag.innerText = 'Error al cargar países: ' + err;
            paisSel.parentNode.insertBefore(diag, paisSel);
          });
      }
    }

    // Inicializa todos los selects con data-source (excepto país, ya cubierto)
    document.querySelectorAll('select[data-source]').forEach(function(sel) {
      if (sel.name === 'pais_db') return;
      let config;
      try { config = JSON.parse(sel.getAttribute('data-source')); } catch(e){ config = null; }
      if (!config || !config.tabla) return;
      // Si el filtro NO tiene patrón {campo}, carga normal (independiente)
      if (!config.filtro || !config.filtro.match(/\{\w+\}/)) {
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
      }
    });

    // Para selects dependientes, agrega listeners para actualizar cuando cambie el campo padre
    document.querySelectorAll('select[data-source]').forEach(function(sel) {
      let config;
      try { config = JSON.parse(sel.getAttribute('data-source')); } catch(e){ config = null; }
      if (!config || !config.tabla || !config.filtro) return;
      // Detecta patrón {campo}
      var matches = config.filtro.match(/\{(\w+)\}/g);
      if (matches) {
        matches.forEach(function(match) {
          var parentName = match.replace(/[{}]/g, '');
          var parentSel = document.querySelector('[name="'+parentName+'"]');
          if (parentSel) {
            parentSel.addEventListener('change', function() {
              let configActual = JSON.parse(sel.getAttribute('data-source'));
              // Reemplaza todos los {campo} por el valor actual
              var filtroActual = configActual.filtro.replace(/\{(\w+)\}/g, function(_, campo){
                var el = document.querySelector('[name="'+campo+'"]');
                return el ? el.value : '';
              });
              configActual.filtro = filtroActual;
              fetch('ajax/selectdata.php?tabla=' + encodeURIComponent(configActual.tabla) +
                    (configActual.campo_valor ? '&campo_valor=' + encodeURIComponent(configActual.campo_valor) : '') +
                    (configActual.campo_etiqueta ? '&campo_etiqueta=' + encodeURIComponent(configActual.campo_etiqueta) : '') +
                    (configActual.filtro ? '&filtro=' + encodeURIComponent(configActual.filtro) : '') +
                    (configActual.order ? '&order=' + encodeURIComponent(configActual.order) : ''))
                .then(r => r.json())
                .then(data => {
                  sel.innerHTML = '<option value="">Seleccione...</option>';
                  data.forEach(opt => {
                    sel.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
                  });
                });
            });
          } else {
            console.warn('Campo padre no encontrado para dependencia:', parentName, 'del select', sel.name);
          }
        });
      }
    });
  }

  function cargarSelectsCuandoExista() {
    var paisSel = document.querySelector('select[name="pais_db"]');
    if (paisSel) {
      cargarSelectsDataSource();
    } else {
      setTimeout(cargarSelectsCuandoExista, 100);
    }
  }

  if(window.formularioJsonOriginal){
    renderForm(window.formularioJsonOriginal, 'formulariodinamico');
    cargarSelectsCuandoExista();
  }
});

// --- Sección: Renderizado y lógica dinámica para campos tipo "datatable" ---
// Detecta campos con "tipo": "datatable" y arma una grilla dinámica con controles CRUD.

function renderField(field) {
  // ...otros tipos...
  if(field.tipo === 'datatable') {
    return renderDatatable(field);
  }
  if(field.tipo === 'embevido') {
    return renderEmbevido(field);
  }
function renderEmbevido(field) {
  const url = field.url_embebido || '';
  const params = field.parametros_embebido || {};
  const alto = field.alto || '400px';
  const ancho = field.ancho || '100%';
  const mostrarBorde = field.mostrar_borde ? '1px solid #ccc' : 'none';
  const permitirFS = field.permitir_fullscreen ? 'allowfullscreen' : '';
  // Construir query string
  let urlFinal = url;
  const paramStr = Object.keys(params).length ? '?' + Object.entries(params).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
  if(url && paramStr) urlFinal += paramStr;
  const iframe = document.createElement('iframe');
  iframe.src = urlFinal;
  iframe.style.width = ancho;
  iframe.style.height = alto;
  iframe.style.border = mostrarBorde;
  if(permitirFS) iframe.setAttribute('allowfullscreen','true');
  iframe.setAttribute('title', field.etiqueta || 'Contenido Embebido');
  return iframe;
}
  // ...otros tipos...
}

function renderDatatable(field) {
  const container = document.createElement('div');
  container.className = 'fd-datatable-container mb-3';

  // Controles de búsqueda y filtro avanzado
  const controlsRow = document.createElement('div');
  controlsRow.className = 'd-flex gap-2 mb-2';
  // Búsqueda simple
  if(field.busqueda_simple === 'enable') {
    const inputSearch = document.createElement('input');
    inputSearch.type = 'text';
    inputSearch.className = 'form-control form-control-sm';
    inputSearch.placeholder = 'Buscar...';
    inputSearch.oninput = function() {
      const term = inputSearch.value.toLowerCase();
      Array.from(tbody.children).forEach(tr => {
        tr.style.display = Array.from(tr.children).some(td => {
          const txt = td.textContent.toLowerCase();
          const inp = td.querySelector('input');
          const val = inp ? (inp.value || '').toLowerCase() : '';
          return txt.includes(term) || val.includes(term);
        }) ? '' : 'none';
      });
    };
    controlsRow.appendChild(inputSearch);
  }
  // Filtro avanzado
  if(field.filtro_avanzado === 'enable') {
    const btnFiltro = document.createElement('button');
              // Buscar el campo por nombre en todos los fieldsets
    btnFiltro.textContent = 'Filtro Avanzado';
    btnFiltro.className = 'btn btn-secondary btn-sm';
    btnFiltro.onclick = function() {
      alert('Aquí puedes implementar el filtro avanzado personalizado.');
    };
    controlsRow.appendChild(btnFiltro);
  }

  // Tabla
  const table = document.createElement('table');
  table.className = 'table table-bordered table-sm';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody'); // <-- Crear tbody antes
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

  // Botón agregar
  const btnAdd = document.createElement('button');
  btnAdd.textContent = 'Agregar fila';
  btnAdd.className = 'btn btn-primary btn-sm mb-2';
  if(!field._localData) field._localData = [];
  btnAdd.onclick = function() {
    const tr = document.createElement('tr');
    const inputs = [];
    field.columnas.forEach(col => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = col.tipo || 'text';
      input.className = 'form-control form-control-sm';
      td.appendChild(input);
      tr.appendChild(td);
      inputs.push(input);
    });
    // Acciones
    const tdAcc = document.createElement('td');
    const btnSave = document.createElement('button');
    btnSave.textContent = 'Guardar';
    btnSave.className = 'btn btn-success btn-sm';
    btnSave.onclick = function() {
      // Local: guarda en memoria y muestra en tabla
      const rowData = {};
      field.columnas.forEach((col, idx) => {
        rowData[col.nombre] = inputs[idx].value;
      });
      field._localData.push(rowData);
      renderLocalRows();
      tr.remove();
    };
    tdAcc.appendChild(btnSave);
    tr.appendChild(tdAcc);
    tbody.appendChild(tr);
  };

  // Render local rows
  function renderLocalRows() {
    tbody.innerHTML = '';
    field._localData.forEach((row, rowIdx) => {
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
        tr.innerHTML = '';
        const editInputs = [];
        field.columnas.forEach(col => {
          const td = document.createElement('td');
          const input = document.createElement('input');
          input.type = col.tipo || 'text';
          input.className = 'form-control form-control-sm';
          input.value = row[col.nombre] || '';
          td.appendChild(input);
          tr.appendChild(td);
          editInputs.push(input);
        });
        const tdAccEdit = document.createElement('td');
        const btnSaveEdit = document.createElement('button');
        btnSaveEdit.textContent = 'Guardar';
        btnSaveEdit.className = 'btn btn-success btn-sm';
        btnSaveEdit.onclick = function() {
          field.columnas.forEach((col, idx) => {
            field._localData[rowIdx][col.nombre] = editInputs[idx].value;
          });
          renderLocalRows();
        };
        tdAccEdit.appendChild(btnSaveEdit);
        tr.appendChild(tdAccEdit);
      };
      const btnDel = document.createElement('button');
      btnDel.textContent = 'Eliminar';
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.onclick = function() {
        field._localData.splice(rowIdx, 1);
        renderLocalRows();
      };
      tdAcc.appendChild(btnEdit);
      tdAcc.appendChild(btnDel);
      tr.appendChild(tdAcc);
      tbody.appendChild(tr);
    });
  }

  // Inicializa local si no hay tabla
  if(!(field.dataSource && field.dataSource.tabla)) {
    renderLocalRows();
  }

  container.appendChild(btnAdd);
    container.appendChild(controlsRow);
  container.appendChild(table);
  return container;
}
window.renderForm = renderForm;


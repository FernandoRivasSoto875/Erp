// Renderiza visualmente un campo según sus atributos data-*
function renderCampoVisual(elemento) {
    if (!elemento.classList.contains('draggable-campo')) return;
    let tipo = elemento.getAttribute('data-tipo') || 'text';
    let etiqueta = elemento.getAttribute('data-etiqueta') || elemento.innerText || '';
    let placeholder = elemento.getAttribute('data-placeholder') || '';
    let requerido = elemento.getAttribute('data-required') === 'true';
    let opciones = elemento.getAttribute('data-opciones') || '';
    let estilo = elemento.getAttribute('data-style') || '';
    let regex = elemento.getAttribute('data-regex') || '';
    let mensajeRegex = elemento.getAttribute('data-regex-msg') || '';
    let dataSource = elemento.getAttribute('data-source') || '';
    let dataSourceValue = elemento.getAttribute('data-source-value') || '';
    let dataSourceLabel = elemento.getAttribute('data-source-label') || '';

    let html = '';
    if (tipo === 'text' || tipo === 'email' || tipo === 'number' || tipo === 'date' || tipo === 'password') {
        html = `<label>${etiqueta}<input type='${tipo}' placeholder='${placeholder}' ${requerido ? 'required' : ''} style='${estilo}' ${regex ? `pattern='${regex}'` : ''}></label>`;
    } else if (tipo === 'file') {
        html = `<label>${etiqueta}<input type='file' style='${estilo}'></label>`;
    } else if (tipo === 'select') {
        let opts = opciones.split(',').map(o => `<option value='${o.trim()}'>${o.trim()}</option>`).join('');
        html = `<label>${etiqueta}<select style='${estilo}' ${requerido ? 'required' : ''}>${opts}</select></label>`;
    } else if (tipo === 'selectdata') {
        // Simulación visual, no consulta real
        html = `<label>${etiqueta}<select style='${estilo}' ${requerido ? 'required' : ''}><option>[dinámico: ${dataSourceLabel || 'etiqueta'}]</option></select></label>`;
    } else if (tipo === 'radio') {
        let opts = opciones.split(',').map(o => `<label><input type='radio' name='${etiqueta}'>${o.trim()}</label>`).join(' ');
        html = `<span style='${estilo}'>${etiqueta}: ${opts}</span>`;
    } else if (tipo === 'checkbox') {
        let opts = opciones.split(',').map(o => `<label><input type='checkbox' name='${etiqueta}'>${o.trim()}</label>`).join(' ');
        html = `<span style='${estilo}'>${etiqueta}: ${opts}</span>`;
    }
    elemento.innerHTML = html;
}

// Renderiza un fieldset con soporte de filas y columnas internas (grilla de campos)
function renderFieldsetVisual(elemento) {
    if (!elemento.classList.contains('draggable-fieldset')) return;
    let titulo = elemento.getAttribute('data-etiqueta') || elemento.querySelector('.fieldset-title')?.innerText || '';
    let rows = parseInt(elemento.getAttribute('data-rows')) || 1;
    let cols = parseInt(elemento.getAttribute('data-cols')) || 1;
    // Estructura: fieldset > .fieldset-title + .fieldset-grid (rows x cols)
    let html = `<div class='fieldset-title'>${titulo}</div><div class='fieldset-grid'></div>`;
    elemento.innerHTML = html;
    let grid = elemento.querySelector('.fieldset-grid');
    for (let r = 0; r < rows; r++) {
        let row = document.createElement('div');
        row.className = 'fieldset-row sortable-row';
        for (let c = 0; c < cols; c++) {
            let col = document.createElement('div');
            col.className = 'fieldset-col sortable-col';
            // Aquí pueden ir campos, fieldsets anidados, grillas, etc.
            row.appendChild(col);
        }
        grid.appendChild(row);
    }
    // Permitir drag & drop en cada celda
    setTimeout(() => {
        elemento.querySelectorAll('.fieldset-col').forEach(col => {
            new Sortable(col, {
                group: { name: 'formulario', pull: true, put: true },
                animation: 150,
                draggable: '.draggable-campo, .draggable-fieldset, .draggable-grilla',
                sort: true,
                onEnd: function(evt) { actualizarJsonDesdeUI(); }
            });
        });
    }, 100);
}
// KEEP: Panel lateral de edición de propiedades (moderno, tipo sidebar)
// Crea el panel lateral si no existe
function crearSidebarEdicion() {
    if (document.getElementById('sidebar-edicion')) return;
    let sidebar = document.createElement('div');
    sidebar.id = 'sidebar-edicion';
    sidebar.style.position = 'fixed';
    sidebar.style.top = '0';
    sidebar.style.right = '-400px';
    sidebar.style.width = '400px';
    sidebar.style.height = '100%';
    sidebar.style.background = '#fff';
    sidebar.style.boxShadow = '-2px 0 12px rgba(0,0,0,0.15)';
    sidebar.style.transition = 'right 0.3s';
    sidebar.style.zIndex = '9999';
    sidebar.innerHTML = `
        <div style="padding:16px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <span id="sidebar-edicion-titulo" style="font-weight:bold;font-size:1.2em;">Propiedades</span>
            <button id="sidebar-edicion-cerrar" style="background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
        </div>
        <div id="sidebar-edicion-body" style="padding:16px;overflow-y:auto;height:calc(100% - 56px);"></div>
    `;
    document.body.appendChild(sidebar);
    document.getElementById('sidebar-edicion-cerrar').onclick = function() {
        sidebar.style.right = '-400px';
    };
}

// Abre el panel lateral y muestra el formulario de edición de propiedades
function abrirSidebarEdicion(elemento) {
    crearSidebarEdicion();
    let sidebar = document.getElementById('sidebar-edicion');
    let body = document.getElementById('sidebar-edicion-body');
    let tipo = elemento.getAttribute('data-type');
    let nombre = elemento.getAttribute('data-name') || '';
    let html = '';
    if (tipo === 'field') {
        // Detección de propiedades existentes
        let etiqueta = elemento.innerText;
        let tipoCampo = elemento.getAttribute('data-tipo') || 'text';
        let placeholder = elemento.getAttribute('data-placeholder') || '';
        let requerido = elemento.getAttribute('data-required') === 'true';
        let opciones = elemento.getAttribute('data-opciones') || '';
        let estilo = elemento.getAttribute('data-style') || '';
        let regex = elemento.getAttribute('data-regex') || '';
        let mensajeRegex = elemento.getAttribute('data-regex-msg') || '';
        let dataSource = elemento.getAttribute('data-source') || '';
        let dataSourceValue = elemento.getAttribute('data-source-value') || '';
        let dataSourceLabel = elemento.getAttribute('data-source-label') || '';
        html += `<label>Nombre (ID):<input type='text' value='${nombre}' id='edit-nombre' class='input-edit'/></label><br>`;
        html += `<label>Etiqueta:<input type='text' value='${etiqueta}' id='edit-etiqueta' class='input-edit'/></label><br>`;
        html += `<label>Tipo:
            <select id='edit-tipo' class='input-edit'>
                <option value='text' ${tipoCampo==='text'?'selected':''}>Texto</option>
                <option value='email' ${tipoCampo==='email'?'selected':''}>Email</option>
                <option value='number' ${tipoCampo==='number'?'selected':''}>Número</option>
                <option value='date' ${tipoCampo==='date'?'selected':''}>Fecha</option>
                <option value='select' ${tipoCampo==='select'?'selected':''}>Select</option>
                <option value='selectdata' ${tipoCampo==='selectdata'?'selected':''}>Select (BD)</option>
                <option value='radio' ${tipoCampo==='radio'?'selected':''}>Radio</option>
                <option value='checkbox' ${tipoCampo==='checkbox'?'selected':''}>Checkbox</option>
                <option value='file' ${tipoCampo==='file'?'selected':''}>Archivo</option>
                <option value='password' ${tipoCampo==='password'?'selected':''}>Password</option>
            </select></label><br>`;
        html += `<label>Placeholder:<input type='text' value='${placeholder}' id='edit-placeholder' class='input-edit'/></label><br>`;
        html += `<label>Requerido: <input type='checkbox' id='edit-required' ${requerido?'checked':''}/></label><br>`;
        html += `<label>Opciones (para select/radio/checkbox, separadas por coma):<input type='text' value='${opciones}' id='edit-opciones' class='input-edit'/></label><br>`;
        html += `<label>Estilo CSS:<input type='text' value='${estilo}' id='edit-style' class='input-edit'/></label><br>`;
        html += `<label>Regex validación:<input type='text' value='${regex}' id='edit-regex' class='input-edit'/></label><br>`;
        html += `<label>Mensaje error regex:<input type='text' value='${mensajeRegex}' id='edit-regex-msg' class='input-edit'/></label><br>`;
        if (tipoCampo === 'selectdata') {
            html += `<label>Data Source (SQL):<input type='text' value='${dataSource}' id='edit-datasource' class='input-edit'/></label><br>`;
            html += `<label>Campo Valor:<input type='text' value='${dataSourceValue}' id='edit-datasource-value' class='input-edit'/></label><br>`;
            html += `<label>Campo Etiqueta:<input type='text' value='${dataSourceLabel}' id='edit-datasource-label' class='input-edit'/></label><br>`;
        }
    } else if (tipo === 'fieldset') {
        let titulo = elemento.querySelector('.fieldset-title')?.innerText || '';
        let filas = elemento.getAttribute('data-rows') || 1;
        let cols = elemento.getAttribute('data-cols') || 1;
        html += `<label>Nombre (ID):<input type='text' value='${nombre}' id='edit-nombre' class='input-edit'/></label><br>`;
        html += `<label>Título:<input type='text' value='${titulo}' id='edit-etiqueta' class='input-edit'/></label><br>`;
        html += `<label>Filas:<input type='number' value='${filas}' min='1' id='edit-rows' class='input-edit'/></label><br>`;
        html += `<label>Columnas:<input type='number' value='${cols}' min='1' id='edit-cols' class='input-edit'/></label><br>`;
    } else if (tipo === 'grid') {
        let filas = elemento.getAttribute('data-rows') || 2;
        let cols = elemento.getAttribute('data-cols') || 2;
        html += `<label>Nombre (ID):<input type='text' value='${nombre}' id='edit-nombre' class='input-edit'/></label><br>`;
        html += `<label>Filas:<input type='number' value='${filas}' min='1' id='edit-rows' class='input-edit'/></label><br>`;
        html += `<label>Columnas:<input type='number' value='${cols}' min='1' id='edit-cols' class='input-edit'/></label><br>`;
    }
    html += `<button id='guardar-propiedades' style='margin-top:16px;padding:8px 16px;'>Guardar</button>`;
    body.innerHTML = html;
    sidebar.style.right = '0';

    // Guardar cambios
    document.getElementById('guardar-propiedades').onclick = function() {
        let nuevoNombre = document.getElementById('edit-nombre').value;
        let nuevaEtiqueta = document.getElementById('edit-etiqueta')?.value;
        elemento.setAttribute('data-name', nuevoNombre);
        if (tipo === 'field') {
            // Actualiza atributos
            let nuevoTipo = document.getElementById('edit-tipo').value;
            let nuevoPlaceholder = document.getElementById('edit-placeholder').value;
            let nuevoRequerido = document.getElementById('edit-required').checked;
            let nuevasOpciones = document.getElementById('edit-opciones').value;
            let nuevoEstilo = document.getElementById('edit-style').value;
            let nuevoRegex = document.getElementById('edit-regex').value;
            let nuevoRegexMsg = document.getElementById('edit-regex-msg').value;
            elemento.setAttribute('data-tipo', nuevoTipo);
            elemento.setAttribute('data-placeholder', nuevoPlaceholder);
            elemento.setAttribute('data-required', nuevoRequerido);
            elemento.setAttribute('data-opciones', nuevasOpciones);
            elemento.setAttribute('data-style', nuevoEstilo);
            elemento.setAttribute('data-regex', nuevoRegex);
            elemento.setAttribute('data-regex-msg', nuevoRegexMsg);
            elemento.setAttribute('data-etiqueta', nuevaEtiqueta);
            if (nuevoTipo === 'selectdata') {
                let ds = document.getElementById('edit-datasource').value;
                let dsv = document.getElementById('edit-datasource-value').value;
                let dsl = document.getElementById('edit-datasource-label').value;
                elemento.setAttribute('data-source', ds);
                elemento.setAttribute('data-source-value', dsv);
                elemento.setAttribute('data-source-label', dsl);
            } else {
                elemento.removeAttribute('data-source');
                elemento.removeAttribute('data-source-value');
                elemento.removeAttribute('data-source-label');
            }
            renderCampoVisual(elemento);
        } else if (tipo === 'fieldset') {
            let titulo = elemento.querySelector('.fieldset-title');
            if (titulo) titulo.innerText = nuevaEtiqueta;
            let filas = document.getElementById('edit-rows').value;
            let cols = document.getElementById('edit-cols').value;
            elemento.setAttribute('data-rows', filas);
            elemento.setAttribute('data-cols', cols);
            // Redibujar fieldset con nueva grilla
            renderFieldsetVisual(elemento);
        } else if (tipo === 'grid') {
            let filas = document.getElementById('edit-rows').value;
            let cols = document.getElementById('edit-cols').value;
            elemento.setAttribute('data-rows', filas);
            elemento.setAttribute('data-cols', cols);
            // (Opcional) Redibujar la grilla si cambian filas/columnas
        }
        sidebar.style.right = '-400px';
        actualizarJsonDesdeUI();
        setTimeout(asignarEventosEdicion, 100); // Refresca eventos
    };
}

// Asigna evento click a todos los elementos editables del formulario
function asignarEventosEdicion() {
    document.querySelectorAll('.draggable-campo, .draggable-fieldset, .draggable-grilla').forEach(el => {
        el.onclick = function(e) {
            e.stopPropagation();
            abrirSidebarEdicion(this);
        };
        el.style.cursor = 'pointer';
    });
}

// Inicializar eventos de edición tras cada render/movimiento
const observer = new MutationObserver(function() {
    asignarEventosEdicion();
});
observer.observe(document.body, { childList: true, subtree: true });

// Inicializa al cargar
document.addEventListener('DOMContentLoaded', function() {
    asignarEventosEdicion();
    // Agregar botón + para añadir pestañas en modo diseño
    let tabsContainer = document.querySelector('.tabs-container');
    if (tabsContainer && !document.getElementById('btn-add-tab')) {
        let btnAddTab = document.createElement('button');
        btnAddTab.id = 'btn-add-tab';
        btnAddTab.innerText = '+';
        btnAddTab.title = 'Agregar pestaña';
        btnAddTab.style = 'margin-left:8px;font-size:1.5em;padding:0 10px;cursor:pointer;background:#e8f0fe;border:1px solid #b0c4de;border-radius:4px;';
        tabsContainer.parentNode.insertBefore(btnAddTab, tabsContainer.nextSibling);
        btnAddTab.onclick = function() {
            // Crear nueva pestaña visualmente
            let nuevaTab = document.createElement('div');
            nuevaTab.className = 'tab';
            let tabTitle = document.createElement('div');
            tabTitle.className = 'tab-title';
            tabTitle.innerText = 'Nueva Pestaña';
            tabTitle.contentEditable = 'true';
            tabTitle.style = 'outline:1px dashed #b0c4de;min-width:80px;display:inline-block;';
            nuevaTab.appendChild(tabTitle);
            let rows = document.createElement('div');
            rows.className = 'rows';
            nuevaTab.appendChild(rows);
            tabsContainer.appendChild(nuevaTab);
            actualizarJsonDesdeUI();
            asignarEventosEdicion();
        };
    }
    // Permitir editar el título de las pestañas (inline)
    document.querySelectorAll('.tab-title').forEach(function(tabTitle) {
        tabTitle.contentEditable = 'true';
        tabTitle.style = 'outline:1px dashed #b0c4de;min-width:80px;display:inline-block;';
        tabTitle.onblur = function() {
            actualizarJsonDesdeUI();
        };
    });
});
// KEEP: Drag & Drop flexible para campos y fieldsets en formularios dinámicos
// Requiere SortableJS (https://sortablejs.github.io/Sortable/)

// Inicializa drag & drop en todas las zonas droppables del formulario

// KEEP: Inicializa la paleta de objetos para clonar (campo, grupo, fila, columna, grilla)

// KEEP: Inicialización avanzada de drag & drop para máxima flexibilidad
document.addEventListener('DOMContentLoaded', function() {
    // Paleta de objetos (debe tener clase .sortable-paleta)
    var paleta = document.querySelector('.sortable-paleta');
    if (paleta) {
        new Sortable(paleta, {
            group: { name: 'formulario', pull: 'clone', put: false },
            sort: false,
            animation: 150,
            draggable: '.objeto-paleta'
        });
    }

    // Todas las zonas droppables posibles
    const zonas = [
        '.sortable-tab', '.sortable-row', '.sortable-col', '.sortable-fieldset', '.sortable-campo', '.sortable-fuera',
        '.sortable-grilla', '.grilla-row', '.grilla-col'
    ];
    zonas.forEach(selector => {
        document.querySelectorAll(selector).forEach(function(el) {
            new Sortable(el, {
                group: { name: 'formulario', pull: true, put: true },
                animation: 150,
                draggable: '.draggable-fieldset, .draggable-campo, .draggable-fila, .draggable-col, .draggable-grilla',
                sort: true,
                onAdd: function(evt) {
                    // Si el origen es la paleta, clonar y crear nuevo objeto
                    if (evt.from.classList.contains('sortable-paleta')) {
                        let tipo = evt.item.getAttribute('data-type');
                        if (tipo === 'field') {
                            evt.item.innerText = 'Nuevo Campo';
                            evt.item.setAttribute('data-name', 'nuevo_campo_' + Date.now());
                            evt.item.classList.add('draggable-campo');
                            renderCampoVisual(evt.item);
                        } else if (tipo === 'fieldset') {
                            evt.item.innerHTML = '';
                            evt.item.setAttribute('data-name', 'nuevo_fieldset_' + Date.now());
                            evt.item.classList.add('draggable-fieldset');
                            evt.item.setAttribute('data-rows', 1);
                            evt.item.setAttribute('data-cols', 2);
                            renderFieldsetVisual(evt.item);
                        } else if (tipo === 'row') {
                            evt.item.innerText = 'Nueva Fila';
                            evt.item.classList.add('draggable-fila');
                        } else if (tipo === 'col') {
                            evt.item.innerText = 'Nueva Columna';
                            evt.item.classList.add('draggable-col');
                        } else if (tipo === 'grid') {
                            let rows = evt.item.getAttribute('data-rows') || 2;
                            let cols = evt.item.getAttribute('data-cols') || 2;
                            evt.item.innerText = 'Grilla ' + rows + 'x' + cols;
                            evt.item.classList.add('draggable-grilla');
                            // Crear estructura DOM para la grilla
                            let grilla = document.createElement('div');
                            grilla.className = 'sortable-grilla';
                            for (let r = 0; r < rows; r++) {
                                let grillaRow = document.createElement('div');
                                grillaRow.className = 'grilla-row';
                                for (let c = 0; c < cols; c++) {
                                    let grillaCol = document.createElement('div');
                                    grillaCol.className = 'grilla-col';
                                    grillaRow.appendChild(grillaCol);
                                }
                                grilla.appendChild(grillaRow);
                            }
                            evt.item.appendChild(grilla);
                        }
                    }
                },
                onEnd: function (evt) {
                    actualizarJsonDesdeUI();
                }
            });
        });
    });
});

// KEEP: Actualiza el JSON global según la nueva estructura visual

// KEEP: Reconstruye el JSON de layout y elementos_fuera desde el DOM visual
function actualizarJsonDesdeUI() {
    let nuevoJson = JSON.parse(JSON.stringify(window.formularioJsonOriginal));


    // --- Reconstruir layout.main.tabs con soporte para filas, columnas, grillas, fieldsets con grilla interna y campos sueltos ---
    let tabs = [];
    document.querySelectorAll('.tabs-container > .tab').forEach(tabEl => {
        let tabObj = {
            title: tabEl.querySelector('.tab-title')?.innerText || 'Pestaña',
            rows: []
        };
        tabEl.querySelectorAll('.rows').forEach(rowEl => {
            let rowObj = { columns: [] };
            rowEl.querySelectorAll('.columns').forEach(colEl => {
                let colObj = {};
                // Fieldset con grilla interna
                let fieldset = colEl.querySelector('.draggable-fieldset');
                if (fieldset) {
                    let fsRows = parseInt(fieldset.getAttribute('data-rows')) || 1;
                    let fsCols = parseInt(fieldset.getAttribute('data-cols')) || 1;
                    let fsObj = {
                        name: fieldset.getAttribute('data-name'),
                        rows: []
                    };
                    let grid = fieldset.querySelector('.fieldset-grid');
                    if (grid) {
                        grid.querySelectorAll('.fieldset-row').forEach(fsRowEl => {
                            let fsRowObj = { columns: [] };
                            fsRowEl.querySelectorAll('.fieldset-col').forEach(fsColEl => {
                                let fsColObj = {};
                                let camp = fsColEl.querySelector('.draggable-campo');
                                if (camp) fsColObj.field = camp.getAttribute('data-name');
                                let fset = fsColEl.querySelector('.draggable-fieldset');
                                if (fset) fsColObj.fieldset = fset.getAttribute('data-name');
                                let gridInt = fsColEl.querySelector('.draggable-grilla');
                                if (gridInt) fsColObj.grid = { name: gridInt.getAttribute('data-name') };
                                fsRowObj.columns.push(fsColObj);
                            });
                            fsObj.rows.push(fsRowObj);
                        });
                    }
                    colObj.fieldset = fsObj;
                }
                // Campo suelto
                let campo = colEl.querySelector('.draggable-campo');
                if (campo && !fieldset) {
                    colObj.field = campo.getAttribute('data-name');
                }
                // Grilla
                let grilla = colEl.querySelector('.draggable-grilla');
                if (grilla) {
                    colObj.grid = { rows: [], name: grilla.getAttribute('data-name') || '' };
                    grilla.querySelectorAll('.grilla-row').forEach(grillaRow => {
                        let grillaRowObj = { columns: [] };
                        grillaRow.querySelectorAll('.grilla-col').forEach(grillaCol => {
                            let grillaColObj = {};
                            let fset = grillaCol.querySelector('.draggable-fieldset');
                            if (fset) grillaColObj.fieldset = fset.getAttribute('data-name');
                            let camp = grillaCol.querySelector('.draggable-campo');
                            if (camp && !fset) grillaColObj.field = camp.getAttribute('data-name');
                            grillaRowObj.columns.push(grillaColObj);
                        });
                        colObj.grid.rows.push(grillaRowObj);
                    });
                }
                rowObj.columns.push(colObj);
            });
            tabObj.rows.push(rowObj);
        });
        tabs.push(tabObj);
    });
    if (nuevoJson.layout && nuevoJson.layout.main && nuevoJson.layout.main.tabs) {
        nuevoJson.layout.main.tabs = tabs;
    }

    // --- Reconstruir elementos_fuera ---
    let elementosFuera = [];
    document.querySelectorAll('#elementos-fuera-container .draggable-fieldset, #elementos-fuera-container .draggable-campo').forEach(el => {
        let tipo = el.classList.contains('draggable-fieldset') ? 'fieldset' : 'field';
        elementosFuera.push({ type: tipo, name: el.getAttribute('data-name') });
    });
    nuevoJson.elementos_fuera = elementosFuera;

    // Puedes agregar aquí reconstrucción de filas, columnas, grillas, campos sueltos, etc.

    guardarJson(nuevoJson);
}

// KEEP: Guarda el JSON actualizado en el backend
function guardarJson(json) {
    try {
        const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) ? window.FORM_CONFIG.archivo_json : '';
        if (!archivo) {
            if (window.Swal) Swal.fire('Atención','No se detectó el archivo JSON a guardar.','warning'); else alert('No se detectó el archivo JSON a guardar.');
            return;
        }
        const payload = {
            archivo,
            layout: JSON.stringify(json.layout || {}),
            elementos_fuera: JSON.stringify(json.elementos_fuera || [])
        };
        fetch('guardar_layout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams(payload).toString()
        })
        .then(r => r.json())
        .then(resp => {
            if (resp && resp.success) {
                if (window.Swal) Swal.fire('OK','Diseño guardado.','success'); else alert('Diseño guardado');
            } else {
                if (window.Swal) Swal.fire('Error', (resp && resp.error) ? resp.error : 'No se pudo guardar.', 'error'); else alert('Error al guardar');
            }
        })
        .catch(() => {
            if (window.Swal) Swal.fire('Error','Error de red.','error'); else alert('Error de red');
        });
    } catch (e) {
        console.error(e);
        if (window.Swal) Swal.fire('Error','Excepción al guardar.','error'); else alert('Excepción al guardar');
    }
}

// KEEP: Marca visualmente los cambios KEEP en la UI (opcional)
function marcarKeepUI() {
    document.querySelectorAll('[data-keep]').forEach(el => {
        el.style.border = '2px solid orange';
        el.title = 'KEEP: Modificado';
    });
}

// Guardado del layout desde el botón "Guardar Diseño" (fallback por HTML)
$(function(){
    const saveBtn = $('#saveLayoutBtn');
    if (!saveBtn.length) return;

    function getArchivoJson() {
        return (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) ? window.FORM_CONFIG.archivo_json : '';
    }

    function serializeLayoutHtml() {
        const cont = document.querySelector('.layout-container');
        return cont ? cont.innerHTML : '';
    }

    saveBtn.on('click', function(){
        const archivo = getArchivoJson();
        if (!archivo) {
            Swal.fire('Atención','No se detectó el archivo JSON a guardar.','warning');
            return;
        }
        const layout_html = serializeLayoutHtml();
        $.post('guardar_layout.php', { archivo, layout_html })
            .done(function(resp){
                if (resp && resp.success) Swal.fire('OK','Diseño guardado.','success');
                else Swal.fire('Error', (resp && resp.error) ? resp.error : 'No se pudo guardar.', 'error');
            })
            .fail(function(xhr){
                Swal.fire('Error', xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error de red.', 'error');
            });
    });
});

// Modo Diseño: drag & drop entre columnas y tabs, edición de propiedades y guardado JSON
(function(){
    function inDesign() { return document.body.classList.contains('design-mode'); }
    function getArchivoJson() { return (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || ''; }

    // Sortable: campos dentro de fieldsets, fieldsets entre columnas/tabs y tabs nav
    function initSortable() {
        if (!inDesign() || typeof Sortable === 'undefined') return;

        // Campos (dentro y entre fieldsets)
        document.querySelectorAll('.sortable-fields-container').forEach(el => {
            Sortable.create(el, {
                group: { name: 'fields', pull: true, put: true },
                draggable: '.draggable-field',
                animation: 150,
                onEnd: () => window.__designHistory && window.__designHistory.saveState()
            });
        });

        // Fieldsets (entre columnas y panes de tab) + parking de fuera
        document.querySelectorAll('[data-col-width], [data-dropzone="tab-pane"], #elementos-fuera-container').forEach(el => {
            Sortable.create(el, {
                group: { name: 'fieldsets', pull: true, put: true },
                draggable: '.draggable-fieldset',
                animation: 150,
                handle: 'legend,[data-fieldset-title]',
                onEnd: () => window.__designHistory && window.__designHistory.saveState()
            });
        });

        // Reordenar tabs nav
        document.querySelectorAll('ul.nav[role="tablist"]').forEach(nav => {
            Sortable.create(nav, {
                group: 'tabs',
                animation: 150,
                draggable: '.nav-item:not(.add-tab-button)',
                handle: '.nav-link',
                filter: '.add-tab-button',
                onEnd: () => {
                    const block = nav.closest('[data-block-type="tabs"]');
                    const content = block && block.querySelector('.tab-content');
                    if (!content) return;
                    const ids = Array.from(nav.querySelectorAll('.nav-link')).map(a => (a.getAttribute('href')||'').replace('#','')).filter(Boolean);
                    ids.forEach(id => {
                        const pane = content.querySelector('#'+CSS.escape(id));
                        if (pane) content.appendChild(pane);
                    });
                    window.__designHistory && window.__designHistory.saveState();
                }
            });
        });
    }

    // Edición de propiedades (form, fieldset, field, tab title)
    function initPropertyEditors() {
        if (!inDesign()) return;

        // Título del formulario
        document.addEventListener('click', function(e){
            const icon = e.target.closest('[data-edit="form-title"]');
            if (!icon) return;
            const titleEl = document.getElementById('form-title');
            const current = titleEl ? titleEl.textContent.trim() : '';
            Swal.fire({ title: 'Título del formulario', input: 'text', inputValue: current, showCancelButton: true, confirmButtonText: 'Guardar' })
            .then(res => {
                if (!res.isConfirmed || !res.value) return;
                const archivo = getArchivoJson();
                $.post('editar_propiedades.php', { archivo, tipo:'form', titulo: res.value })
                 .done(resp => {
                    if (resp && resp.success) {
                        const iconEl = $(titleEl).find('.edit-icon').detach();
                        $(titleEl).text(res.value).append(iconEl);
                        Swal.fire('OK','Actualizado','success');
                    } else Swal.fire('Error', (resp && resp.error) || 'No se pudo actualizar', 'error');
                 })
                 .fail(xhr => Swal.fire('Error', (xhr.responseJSON && xhr.responseJSON.error) || 'Error de red', 'error'));
            });
        });

        // Renombrar pestaña
        document.addEventListener('click', async (e) => {
            const icon = e.target.closest('.edit-tab-icon');
            if (!icon) return;
            const li = icon.closest('.nav-item');
            const a = li && li.querySelector('.nav-link');
            if (!a) return;
            const { value: title } = await Swal.fire({ title: 'Título de pestaña', input: 'text', inputValue: a.textContent.trim(), showCancelButton: true, confirmButtonText: 'Guardar' });
            if (title) { a.textContent = title; window.__designHistory && window.__designHistory.saveState(); }
        });

        // Editar fieldset (título)
        document.addEventListener('click', async (e) => {
            const icon = e.target.closest('.edit-icon[data-edit="fieldset"]');
            if (!icon) return;
            const fieldsetName = icon.getAttribute('data-fieldset') || '';
            const wrapper = icon.closest('.draggable-fieldset');
            const legend = wrapper && wrapper.querySelector('[data-fieldset-title]');
            const current = legend ? legend.textContent.trim() : '';
            const { value: titulo } = await Swal.fire({ title: 'Título del grupo', input: 'text', inputValue: current, showCancelButton: true, confirmButtonText: 'Guardar' });
            if (!titulo || !fieldsetName) return;
            const archivo = getArchivoJson();
            $.post('editar_propiedades.php', { archivo, tipo:'fieldset', fieldset: fieldsetName, titulo })
             .done(resp => {
                if (resp && resp.success) { if (legend) legend.textContent = titulo; Swal.fire('OK','Actualizado','success'); }
                else Swal.fire('Error', (resp && resp.error) || 'No se pudo actualizar', 'error');
             })
             .fail(xhr => Swal.fire('Error', (xhr.responseJSON && xhr.responseJSON.error) || 'Error de red', 'error'));
        });

        // Editar campo (etiqueta y props básicas)
        document.addEventListener('click', async (e) => {
            const icon = e.target.closest('.edit-icon[data-edit="field"]');
            if (!icon) return;
            const fieldset = icon.getAttribute('data-fieldset') || '';
            const nombre   = icon.getAttribute('data-field') || '';
            const wrapper  = icon.closest('.draggable-field');
            const labelEl  = wrapper && wrapper.querySelector('label');
            const current  = labelEl ? labelEl.textContent.trim() : '';

            const { value: etiqueta } = await Swal.fire({ title: 'Etiqueta del campo', input: 'text', inputValue: current, showCancelButton: true, confirmButtonText: 'Guardar' });
            if (!etiqueta || !fieldset || !nombre) return;

            const archivo = getArchivoJson();
            $.post('editar_propiedades.php', { archivo, tipo:'field', fieldset, nombre, etiqueta })
             .done(resp => {
                if (resp && resp.success) { if (labelEl) labelEl.textContent = etiqueta; Swal.fire('OK','Actualizado','success'); }
                else Swal.fire('Error', (resp && resp.error) || 'No se pudo actualizar', 'error');
             })
             .fail(xhr => Swal.fire('Error', (xhr.responseJSON && xhr.responseJSON.error) || 'Error de red', 'error'));
        });
    }

    // Serialización para guardar
    function collectElementosFuera() {
        const out = document.querySelector('#elementos-fuera-container');
        if (!out) return [];
        const items = [];
        out.querySelectorAll('.draggable-fieldset[data-fieldset-name]').forEach(fs => {
            const name = fs.getAttribute('data-fieldset-name');
            if (name) items.push({ type:'fieldset', name });
        });
        out.querySelectorAll('.draggable-field[data-field-name]').forEach(f => {
            const name = f.getAttribute('data-field-name');
            if (name) items.push({ type:'field', name });
        });
        return items;
    }

    function reorderFieldsetsFromDOM(originalFieldsets) {
        const fsOut = JSON.parse(JSON.stringify(originalFieldsets || {}));
        document.querySelectorAll('.draggable-fieldset[data-fieldset-name]').forEach(fs => {
            const name = fs.getAttribute('data-fieldset-name');
            if (!name || !fsOut[name]) return;
            // Solo reorden de campos en contenedor clásico
            const fields = Array.from(fs.querySelectorAll('.sortable-fields-container .draggable-field[data-field-name]')).map(n => n.getAttribute('data-field-name'));
            if (!fields.length) return;
            const current = Array.isArray(fsOut[name].campos) ? fsOut[name].campos : [];
            const map = {}; current.forEach(c => { if (c && c.nombre) map[c.nombre] = c; });
            const reordered = [];
            fields.forEach(fname => { if (map[fname]) reordered.push(map[fname]); });
            current.forEach(c => { if (c && c.nombre && !reordered.find(rc => rc.nombre === c.nombre)) reordered.push(c); });
            fsOut[name].campos = reordered;
        });
        return fsOut;
    }

    function buildLayoutFromDOM() {
        const layout = [];
        const container = document.querySelector('[data-layout-container]');
        if (!container) return layout;

        // Tabs blocks
        container.querySelectorAll('[data-block-type="tabs"]').forEach(block => {
            const tabs = [];
            const navLinks = block.querySelectorAll('ul.nav .nav-link[href^="#"]');
            const idToTitle = {};
            navLinks.forEach(a => {
                const id = a.getAttribute('href')?.replace('#','');
                if (id) idToTitle[id] = a.textContent.trim();
            });
            const panes = block.querySelectorAll('.tab-content .tab-pane');
            panes.forEach(pane => {
                const id = pane.id;
                const title = idToTitle[id] || 'Pestaña';
                // Una fila col-12 con los fieldsets en orden
                const cols = [];
                const col = { width: 12, fieldsets: [] };
                pane.querySelectorAll('.draggable-fieldset[data-fieldset-name]').forEach(fs => {
                    const name = fs.getAttribute('data-fieldset-name'); if (name) col.fieldsets.push(name);
                });
                // Representar cada fieldset como columna col-12 (compat con render existente)
                const row = { columns: (col.fieldsets.length ? col.fieldsets.map(n => ({ width: 12, fieldset: n })) : [{ width: 12 }]) };
                tabs.push({ title, rows: [row] });
            });
            layout.push({ type: 'tabs', tabs });
        });

        // Otros bloques (gen/header/footer)
        container.querySelectorAll('[data-block-type="generic"],[data-block-type="header"],[data-block-type="footer"]').forEach(block => {
            const type = block.getAttribute('data-block-type') || 'generic';
            const rows = [];
            block.querySelectorAll('[data-row]').forEach(r => {
                const row = { columns: [] };
                r.querySelectorAll('[data-col-width]').forEach(colEl => {
                    const width = parseInt(colEl.getAttribute('data-col-width') || '12', 10);
                    // tomar todos los fieldsets en la columna como columnas de 12 (lineales)
                    const fsets = Array.from(colEl.querySelectorAll('.draggable-fieldset[data-fieldset-name]'));
                    if (fsets.length) {
                        fsets.forEach(fs => row.columns.push({ width: width, fieldset: fs.getAttribute('data-fieldset-name') || '' }));
                    } else {
                        row.columns.push({ width: width });
                    }
                });
                rows.push(row);
            });
            if (rows.length) layout.push({ type, rows });
        });

        return layout;
    }

    function saveDesign() {
        const archivo = getArchivoJson();
        if (!archivo) { if (window.Swal) Swal.fire('Atención','No se detectó el archivo JSON.','warning'); return; }

        const original = (window.formularioJsonOriginal && window.formularioJsonOriginal.fieldsets) || {};
        const fieldsets = reorderFieldsetsFromDOM(original);
        const layout = buildLayoutFromDOM();
        const elementos_fuera = collectElementosFuera();
        const layout_html = (document.querySelector('[data-layout-container]') || {}).innerHTML || '';

        const payload = {
            archivo,
            layout: JSON.stringify(layout),
            elementos_fuera: JSON.stringify(elementos_fuera),
            fieldsets: JSON.stringify(fieldsets),
            layout_html
        };

        $.post('guardar_layout.php', payload)
         .done(resp => {
            if (resp && resp.success) Swal.fire('OK','Diseño guardado.','success');
            else Swal.fire('Error', (resp && resp.error) || 'No se pudo guardar', 'error');
         })
         .fail(xhr => Swal.fire('Error', (xhr.responseJSON && xhr.responseJSON.error) || 'Error de red', 'error'));
    }

    document.addEventListener('DOMContentLoaded', function(){
        if (!inDesign()) return;
        initSortable();
        initPropertyEditors();
        const saveBtn = document.getElementById('saveLayoutBtn');
        if (saveBtn) { saveBtn.style.display = ''; saveBtn.addEventListener('click', saveDesign); }
    });

    // Exponer para otros scripts
    window.DnDFormBuilder = { saveDesign };
})();

// filepath: /form-dnd-builder/form-dnd-builder/public/js/dragdrop-formulariodinamico.js
// Implementa la funcionalidad de arrastrar y soltar para mover campos y grupos de campos dentro del formulario, incluyendo soporte para mover elementos entre pestañas.

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

    let html = '';
    if (tipo === 'text' || tipo === 'email' || tipo === 'number' || tipo === 'date' || tipo === 'password') {
        html = `<label>${etiqueta}<input type='${tipo}' placeholder='${placeholder}' ${requerido ? 'required' : ''} style='${estilo}' ${regex ? `pattern='${regex}'` : ''}></label>`;
    } else if (tipo === 'file') {
        html = `<label>${etiqueta}<input type='file' style='${estilo}'></label>`;
    } else if (tipo === 'select') {
        let opts = opciones.split(',').map(o => `<option value='${o.trim()}'>${o.trim()}</option>`).join('');
        html = `<label>${etiqueta}<select style='${estilo}' ${requerido ? 'required' : ''}>${opts}</select></label>`;
    } else if (tipo === 'radio') {
        let opts = opciones.split(',').map(o => `<label><input type='radio' name='${etiqueta}'>${o.trim()}</label>`).join(' ');
        html = `<span style='${estilo}'>${etiqueta}: ${opts}</span>`;
    } else if (tipo === 'checkbox') {
        let opts = opciones.split(',').map(o => `<label><input type='checkbox' name='${etiqueta}'>${o.trim()}</label>`).join(' ');
        html = `<span style='${estilo}'>${etiqueta}: ${opts}</span>`;
    }
    elemento.innerHTML = html;
}

function renderFieldsetVisual(elemento) {
    if (!elemento.classList.contains('draggable-fieldset')) return;
    let titulo = elemento.getAttribute('data-etiqueta') || elemento.querySelector('.fieldset-title')?.innerText || '';
    let rows = parseInt(elemento.getAttribute('data-rows')) || 1;
    let cols = parseInt(elemento.getAttribute('data-cols')) || 1;
    let html = `<div class='fieldset-title'>${titulo}</div><div class='fieldset-grid'></div>`;
    elemento.innerHTML = html;
    let grid = elemento.querySelector('.fieldset-grid');
    for (let r = 0; r < rows; r++) {
        let row = document.createElement('div');
        row.className = 'fieldset-row sortable-row';
        for (let c = 0; c < cols; c++) {
            let col = document.createElement('div');
            col.className = 'fieldset-col sortable-col';
            row.appendChild(col);
        }
        grid.appendChild(row);
    }
    setTimeout(() => {
        elemento.querySelectorAll('.fieldset-col').forEach(col => {
            new Sortable(col, {
                group: { name: 'formulario', pull: true, put: true },
                animation: 150,
                draggable: '.draggable-campo, .draggable-fieldset',
                sort: true,
                onEnd: function(evt) { actualizarJsonDesdeUI(); }
            });
        });
    }, 100);
}

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

function abrirSidebarEdicion(elemento) {
    crearSidebarEdicion();
    let sidebar = document.getElementById('sidebar-edicion');
    let body = document.getElementById('sidebar-edicion-body');
    let tipo = elemento.getAttribute('data-type');
    let nombre = elemento.getAttribute('data-name') || '';
    let html = '';
    if (tipo === 'field') {
        let etiqueta = elemento.innerText;
        let tipoCampo = elemento.getAttribute('data-tipo') || 'text';
        let placeholder = elemento.getAttribute('data-placeholder') || '';
        let requerido = elemento.getAttribute('data-required') === 'true';
        let opciones = elemento.getAttribute('data-opciones') || '';
        let estilo = elemento.getAttribute('data-style') || '';
        html += `<label>Nombre (ID):<input type='text' value='${nombre}' id='edit-nombre' class='input-edit'/></label><br>`;
        html += `<label>Etiqueta:<input type='text' value='${etiqueta}' id='edit-etiqueta' class='input-edit'/></label><br>`;
        html += `<label>Tipo:<select id='edit-tipo' class='input-edit'>
                    <option value='text' ${tipoCampo==='text'?'selected':''}>Texto</option>
                    <option value='email' ${tipoCampo==='email'?'selected':''}>Email</option>
                    <option value='number' ${tipoCampo==='number'?'selected':''}>Número</option>
                    <option value='date' ${tipoCampo==='date'?'selected':''}>Fecha</option>
                    <option value='select' ${tipoCampo==='select'?'selected':''}>Select</option>
                    <option value='radio' ${tipoCampo==='radio'?'selected':''}>Radio</option>
                    <option value='checkbox' ${tipoCampo==='checkbox'?'selected':''}>Checkbox</option>
                    <option value='file' ${tipoCampo==='file'?'selected':''}>Archivo</option>
                </select></label><br>`;
        html += `<label>Placeholder:<input type='text' value='${placeholder}' id='edit-placeholder' class='input-edit'/></label><br>`;
        html += `<label>Requerido: <input type='checkbox' id='edit-required' ${requerido?'checked':''}/></label><br>`;
        html += `<label>Opciones:<input type='text' value='${opciones}' id='edit-opciones' class='input-edit'/></label><br>`;
        html += `<label>Estilo CSS:<input type='text' value='${estilo}' id='edit-style' class='input-edit'/></label><br>`;
    } else if (tipo === 'fieldset') {
        let titulo = elemento.querySelector('.fieldset-title')?.innerText || '';
        let filas = elemento.getAttribute('data-rows') || 1;
        let cols = elemento.getAttribute('data-cols') || 1;
        html += `<label>Nombre (ID):<input type='text' value='${nombre}' id='edit-nombre' class='input-edit'/></label><br>`;
        html += `<label>Título:<input type='text' value='${titulo}' id='edit-etiqueta' class='input-edit'/></label><br>`;
        html += `<label>Filas:<input type='number' value='${filas}' min='1' id='edit-rows' class='input-edit'/></label><br>`;
        html += `<label>Columnas:<input type='number' value='${cols}' min='1' id='edit-cols' class='input-edit'/></label><br>`;
    }
    html += `<button id='guardar-propiedades' style='margin-top:16px;padding:8px 16px;'>Guardar</button>`;
    body.innerHTML = html;
    sidebar.style.right = '0';

    document.getElementById('guardar-propiedades').onclick = function() {
        let nuevoNombre = document.getElementById('edit-nombre').value;
        let nuevaEtiqueta = document.getElementById('edit-etiqueta')?.value;
        elemento.setAttribute('data-name', nuevoNombre);
        if (tipo === 'field') {
            let nuevoTipo = document.getElementById('edit-tipo').value;
            let nuevoPlaceholder = document.getElementById('edit-placeholder').value;
            let nuevoRequerido = document.getElementById('edit-required').checked;
            let nuevasOpciones = document.getElementById('edit-opciones').value;
            let nuevoEstilo = document.getElementById('edit-style').value;
            elemento.setAttribute('data-tipo', nuevoTipo);
            elemento.setAttribute('data-placeholder', nuevoPlaceholder);
            elemento.setAttribute('data-required', nuevoRequerido);
            elemento.setAttribute('data-opciones', nuevasOpciones);
            elemento.setAttribute('data-style', nuevoEstilo);
            elemento.setAttribute('data-etiqueta', nuevaEtiqueta);
            renderCampoVisual(elemento);
        } else if (tipo === 'fieldset') {
            let titulo = elemento.querySelector('.fieldset-title');
            if (titulo) titulo.innerText = nuevaEtiqueta;
            let filas = document.getElementById('edit-rows').value;
            let cols = document.getElementById('edit-cols').value;
            elemento.setAttribute('data-rows', filas);
            elemento.setAttribute('data-cols', cols);
            renderFieldsetVisual(elemento);
        }
        sidebar.style.right = '-400px';
        actualizarJsonDesdeUI();
    };
}

function asignarEventosEdicion() {
    document.querySelectorAll('.draggable-campo, .draggable-fieldset').forEach(el => {
        el.onclick = function(e) {
            e.stopPropagation();
            abrirSidebarEdicion(this);
        };
        el.style.cursor = 'pointer';
    });
}

const observer = new MutationObserver(function() {
    asignarEventosEdicion();
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', function() {
    asignarEventosEdicion();
    let tabsContainer = document.querySelector('.tabs-container');
    if (tabsContainer && !document.getElementById('btn-add-tab')) {
        let btnAddTab = document.createElement('button');
        btnAddTab.id = 'btn-add-tab';
        btnAddTab.innerText = '+';
        btnAddTab.title = 'Agregar pestaña';
        btnAddTab.style = 'margin-left:8px;font-size:1.5em;padding:0 10px;cursor:pointer;background:#e8f0fe;border:1px solid #b0c4de;border-radius:4px;';
        tabsContainer.parentNode.insertBefore(btnAddTab, tabsContainer.nextSibling);
        btnAddTab.onclick = function() {
            let nuevaTab = document.createElement('div');
            nuevaTab.className = 'tab';
            let tabTitle = document.createElement('div');
            tabTitle.className = 'tab-title';
            tabTitle.innerText = 'Nueva Pestaña';
            tabTitle.contentEditable = 'true';
            nuevaTab.appendChild(tabTitle);
            let rows = document.createElement('div');
            rows.className = 'rows';
            nuevaTab.appendChild(rows);
            tabsContainer.appendChild(nuevaTab);
            actualizarJsonDesdeUI();
            asignarEventosEdicion();
        };
    }
    document.querySelectorAll('.tab-title').forEach(function(tabTitle) {
        tabTitle.contentEditable = 'true';
        tabTitle.onblur = function() {
            actualizarJsonDesdeUI();
        };
    });
});

document.addEventListener('DOMContentLoaded', function() {
    var paleta = document.querySelector('.sortable-paleta');
    if (paleta) {
        new Sortable(paleta, {
            group: { name: 'formulario', pull: 'clone', put: false },
            sort: false,
            animation: 150,
            draggable: '.objeto-paleta'
        });
    }

    const zonas = [
        '.sortable-tab', '.sortable-row', '.sortable-col', '.sortable-fieldset', '.sortable-campo'
    ];
    zonas.forEach(selector => {
        document.querySelectorAll(selector).forEach(function(el) {
            new Sortable(el, {
                group: { name: 'formulario', pull: true, put: true },
                animation: 150,
                draggable: '.draggable-fieldset, .draggable-campo',
                sort: true,
                onAdd: function(evt) {
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

function actualizarJsonDesdeUI() {
    let nuevoJson = JSON.parse(JSON.stringify(window.formularioJsonOriginal));
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
                let campo = colEl.querySelector('.draggable-campo');
                if (campo) colObj.field = campo.getAttribute('data-name');
                let fieldset = colEl.querySelector('.draggable-fieldset');
                if (fieldset) {
                    colObj.fieldset = {
                        name: fieldset.getAttribute('data-name'),
                        rows: []
                    };
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
    guardarJson(nuevoJson);
}

function guardarJson(json) {
    try {
        const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) ? window.FORM_CONFIG.archivo_json : '';
        if (!archivo) {
            alert('No se detectó el archivo JSON a guardar.');
            return;
        }
        const payload = {
            archivo,
            layout: JSON.stringify(json.layout || {})
        };
        fetch('guardar_layout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams(payload).toString()
        })
        .then(r => r.json())
        .then(resp => {
            if (resp && resp.success) {
                alert('Diseño guardado.');
            } else {
                alert('Error al guardar.');
            }
        })
        .catch(() => {
            alert('Error de red.');
        });
    } catch (e) {
        console.error(e);
        alert('Excepción al guardar.');
    }
}
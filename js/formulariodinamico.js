// ===================== AGREGAR FILA A DATATABLE =====================
// ESTA FUNCIÓN SERÁ REEMPLAZADA POR UNA LÓGICA MÁS POTENTE EN LA SECCIÓN DE INICIALIZACIÓN
/*
function agregarFilaDatatable(tablaId) {
    // ... tu código antiguo ...
}
*/

// ===================== MOSTRAR ARCHIVOS SELECCIONADOS Y GUARDAR EN LOCALSTORAGE =====================
function mostrarArchivosSeleccionados(input) {
    var fileListDiv = document.getElementById('filelist_' + input.name.replace('[]',''));
    if (!fileListDiv) return;
    fileListDiv.innerHTML = '';
    let nombres = [];
    if (input.files && input.files.length > 0) {
        var ul = document.createElement('ul');
        for (var i = 0; i < input.files.length; i++) {
            var li = document.createElement('li');
            li.textContent = input.files[i].name;
            ul.appendChild(li);
            nombres.push(input.files[i].name);
        }
        fileListDiv.appendChild(ul);
    }
    // Guarda los nombres en localStorage
    localStorage.setItem(input.name + '_filenames', JSON.stringify(nombres));
}

// ===================== LIMPIAR CAMPOS DEL FORMULARIO =====================
function limpiarCamposFormulario(form) {
    Array.from(form.elements).forEach(field => {
        if (field.type === "checkbox" || field.type === "radio") {
            field.checked = false;
        } else if (field.type === "file") {
            field.value = '';
            var previewDiv = document.getElementById('filelist_' + field.name.replace('[]',''));
            if (previewDiv) previewDiv.innerHTML = '';
            localStorage.removeItem(field.name + '_filenames');
        } else if (field.tagName === "SELECT") {
            field.selectedIndex = 0;
        } else {
            field.value = '';
        }
        // Limpia errores visuales si existen
        const container = field.closest(".campo-container");
        if (container) {
            const errorSpan = container.querySelector(".mensaje-error");
            if (errorSpan) errorSpan.textContent = "";
        }
    });
    // Limpia localStorage de autosave
    Array.from(form.elements).forEach(field => localStorage.removeItem(field.name));
}

// ===================== PREVISUALIZAR IMAGENES SELECCIONADAS =====================
function previewImage(input) {
    var previewDiv = document.getElementById('filelist_' + input.name.replace('[]',''));
    if (!previewDiv) return;
    previewDiv.innerHTML = '';
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            if (file.type.startsWith('image/')) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '120px';
                    img.style.margin = '5px';
                    previewDiv.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// ===================== LIMPIAR VALOR NUMÉRICO PARA CÁLCULOS =====================
function limpiarNumero(valor) {
    if (typeof valor !== 'string') valor = String(valor); // Añadido para seguridad
    valor = valor.replace(/[^\d,.-]/g, '');
    valor = valor.replace(/\./g, '').replace(',', '.');
    return valor;
}

// ===================== APLICAR FORMATO DE NÚMERO (MONEDA, ETC) =====================
function aplicarFormato(input, formato) {
    let valor = input.value;
    if (!valor) return;
    valor = valor.replace(/[^\d,.-]/g, '');
    let num = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return;

    if (input.type === "number") {
        if (formato === "moneda" || formato === "#,##0.00" || formato === "0.00") {
            input.value = num.toFixed(2);
        } else if (formato === "0") {
            input.value = Math.round(num);
        } else {
            input.value = num;
        }
        return;
    }

    if (formato === "moneda") {
        input.value = num.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
    } else if (formato === "#,##0.00") {
        input.value = num.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (formato === "0") {
        input.value = num.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    } else if (formato === "0.00") {
        input.value = num.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

// ===================== CALCULAR FÓRMULA MATEMÁTICA =====================
// ESTA FUNCIÓN Y LA SIGUIENTE (buscarValor) SERÁN REEMPLAZADAS POR la nueva función 'activarLogicaFila'
/*
function calcularFormula(input, formulaData, campos) {
    // ... tu código antiguo ...
}
*/

// ===================== BUSCAR VALOR VÍA AJAX (PARA FÓRMULAS DE BÚSQUEDA) =====================
/*
function buscarValor(input, source, whereClause, valor) {
    // ... tu código antiguo ...
}
*/

// ===================== NUEVA LÓGICA DE FÓRMULAS UNIFICADA =====================
/**
 * Activa toda la lógica (fórmulas, lookups) para un contexto específico.
 * Reemplaza a calcularFormula y buscarValor.
 * @param {HTMLTableRowElement|Document} context - La fila (<tr>) o el documento entero.
 */
function activarLogicaFila(context) {
    const inputsConFormula = context.querySelectorAll('[data-formula]');
    const rowData = {};

    // 1. Recolectar datos del contexto (fila o formulario global)
    context.querySelectorAll('input, select, textarea').forEach(input => {
        let name = input.name;
        const nameMatch = name.match(/\[(\w+)\]$/); // Para datatables, extrae el nombre de la columna.
        if (nameMatch) {
            name = nameMatch[1];
        }
        rowData[name] = input.value;
    });

    // 2. Procesar cada campo con fórmula dentro del contexto
    inputsConFormula.forEach(input => {
        let formulaAttr = input.getAttribute('data-formula');
        let formulaData;
        try {
            // Permite que el JSON en el atributo use comillas simples o dobles
            formulaData = JSON.parse(formulaAttr.replace(/'/g, '"'));
        } catch (e) {
            formulaData = formulaAttr; // Si no es JSON, es una fórmula matemática string
        }

        // Lógica para Búsquedas (Lookup)
        if (typeof formulaData === 'object' && formulaData.type === 'lookup') {
            const placeholders = (formulaData.where.match(/\{(.+?)\}/g) || []);
            placeholders.forEach(placeholder => {
                const triggerFieldName = placeholder.replace(/[{}]/g, '');
                // Busca el campo disparador dentro del mismo contexto (fila) o globalmente
                const triggerInput = context.querySelector(`[name$="[${triggerFieldName}]"]`) || document.getElementsByName(triggerFieldName)[0];
                if (triggerInput && !triggerInput.dataset.lookupAttached) {
                    triggerInput.addEventListener('input', () => activarLogicaFila(context));
                    triggerInput.dataset.lookupAttached = 'true'; // Evita añadir el evento múltiples veces
                }
            });
            
            // Lógica de búsqueda AJAX
            let whereFinal = formulaData.where;
            for (const placeholder of placeholders) {
                const fieldName = placeholder.replace(/[{}]/g, '');
                const valor = rowData[fieldName] || '';
                if (valor === '') { input.value = ''; return; } // Si un campo clave está vacío, no buscar.
                whereFinal = whereFinal.replace(placeholder, `'${valor}'`);
            }
            fetch('ajax/busqueda_formula.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    tabla: formulaData.source.table,
                    campo: formulaData.source.field,
                    where: whereFinal
                })
            )
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { input.value = (data && data.resultado !== null) ? data.resultado : ''; })
            .catch(() => { input.value = ''; });
        
        // Lógica para Fórmulas Matemáticas
        } else if (typeof formulaData === 'string') {
            let expr = formulaData;
            for (const key in rowData) {
                const val = parseFloat(limpiarNumero(rowData[key])) || 0;
                expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
            }
            try {
                const resultado = eval(expr);
                input.value = Number.isFinite(resultado) ? resultado.toFixed(2) : '0.00';
            } catch (e) {
                input.value = 'Error';
            }
        }
    });
}


// ===================== AUTOSAVE Y VALIDACIÓN =====================

/**
 * Guarda el estado de una datatable en localStorage.
 * @param {HTMLElement} table - El elemento <table> de la datatable.
 */
// ===================== GUARDAR ESTADO DE DATATABLE EN LOCALSTORAGE =====================
function guardarEstadoDataTable(table) {
    if (!table) return;
    const fieldName = table.id.replace('datatable-', '');
    const data = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(tr => {
        const rowData = {};
        tr.querySelectorAll('input, textarea, select').forEach(cellInput => {
            const nameMatch = cellInput.name.match(/\[(\w+)\]$/);
            if (nameMatch) {
                const colName = nameMatch[1];
                switch (cellInput.type) {
                    case 'checkbox':
                        rowData[colName] = cellInput.checked;
                        break;
                    default:
                        rowData[colName] = cellInput.value;
                        break;
                }
            }
        });
        if (Object.keys(rowData).length > 0) {
            data.push(rowData);
        }
    });
    localStorage.setItem(fieldName, JSON.stringify(data));
}

// ===================== GUARDAR CAMPO INDIVIDUAL EN LOCALSTORAGE =====================
function guardarCampo(e) {
    const input = e.target;
    const table = input.closest('table.datatable-container');

    if (table) {
        guardarEstadoDataTable(table);
    } else {
        localStorage.setItem(input.name, input.value);
    }
}

// ===================== CARGAR TODOS LOS CAMPOS DESDE LOCALSTORAGE =====================
function cargarCampos() {
    // Se modifica para ignorar completamente los campos de datatable,
    // ya que su estado se carga en inicializarDataTables.
    document.querySelectorAll("#formulario input, #formulario textarea, #formulario select").forEach(field => {
        if (field.closest('table.datatable-container')) return; // IGNORAR CAMPOS DE DATATABLE

        if (field.type === "file") {
            field.value = '';
            var previewDiv = document.getElementById('filelist_' + field.name.replace('[]',''));
            if (previewDiv) {
                previewDiv.innerHTML = '';
                // Mostrar nombres guardados si existen
                let nombres = localStorage.getItem(field.name + '_filenames');
                if (nombres) {
                    try {
                        nombres = JSON.parse(nombres);
                        if (Array.isArray(nombres) && nombres.length > 0) {
                            var ul = document.createElement('ul');
                            nombres.forEach(function(nombre) {
                                var li = document.createElement('li');
                                li.textContent = nombre + " (selecciona nuevamente para enviar)";
                                ul.appendChild(li);
                            });
                            previewDiv.appendChild(ul);
                        }
                    } catch (e) {}
                }
            }
            return;
        }
        let saved = localStorage.getItem(field.name);
        if (saved) {
            field.value = saved;
            field.dispatchEvent(new Event('input'));
        }
    });
}


// ===================== VALIDAR INPUT AL PERDER FOCO =====================
function validarInput(e) {
    const field = e.target;
    if (field.validity && !field.validity.valid) {
        const container = field.closest(".campo-container");
        if (container) {
            const errorSpan = container.querySelector(".mensaje-error");
            if (errorSpan) {
                errorSpan.textContent = field.validationMessage;
                errorSpan.style.color = "red";
                errorSpan.setAttribute("role", "alert");
            }
        }
    } else {
        const container = field.closest(".campo-container");
        if (container) {
            const errorSpan = container.querySelector(".mensaje-error");
            if (errorSpan) {
                errorSpan.textContent = "";
            }
        }
    }
}

// ===================== AUTOCOMPLETAR =====================
function autocompleteField(e) {
    const query = e.target.value.toLowerCase();
    const suggestions = ["Santiago", "Valparaíso", "Concepción", "La Serena"];
    const filtered = suggestions.filter(item => item.toLowerCase().includes(query));
    const datalistId = e.target.getAttribute("list");
    if (datalistId) {
        const datalist = document.getElementById(datalistId);
        if (datalist) {
            datalist.innerHTML = "";
            filtered.forEach(item => {
                const option = document.createElement("option");
                option.value = item;
                datalist.appendChild(option);
            });
        }
    }
}

// ===================== CAMPOS CONDICIONALES =====================
function evaluarCondiciones() {
    document.querySelectorAll("[data-condicion]").forEach(element => {
        let cond = element.getAttribute("data-condicion");
        try {
            cond = JSON.parse(cond);
        } catch (e) {
            console.error("Error al parsear condición:", cond);
            return;
        }
        const parentField = document.getElementsByName(cond.campo)[0];
        if (parentField) {
            element.style.display = (parentField.value === cond.valor) ? "" : "none";
        }
    });
}

function configurarCondiciones() {
    const condicionadores = new Set();
    document.querySelectorAll("[data-condicion]").forEach(element => {
        let cond = element.getAttribute("data-condicion");
        try {
            cond = JSON.parse(cond);
        } catch (e) {}
        if (cond && cond.campo) {
            condicionadores.add(cond.campo);
        }
    });
    condicionadores.forEach(campoNombre => {
        const field = document.getElementsByName(campoNombre)[0];
        if (field) {
            field.addEventListener("input", evaluarCondiciones);
            field.addEventListener("change", evaluarCondiciones);
        }
    });
    evaluarCondiciones();
}

// ===================== CRUD Y REORDENAMIENTO =====================

let currentFieldType = null;
let currentFieldName = null;
let editingItem = null;

function createId(fieldName, value) {
    const safeValue = value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9\-_]/g, '');
    let id = fieldName + "_" + safeValue;
    if (!/^[a-z]/.test(id)) {
        id = "id_" + id;
    }
    if (!id || id === fieldName + "_") {
        id = fieldName + "_default";
    }
    return id;
}

function getFieldLabel(fieldName) {
    const container = document.getElementById(fieldName + "_container");
    if (container) {
        const campoContainer = container.closest(".campo-container");
        if (campoContainer) {
            return campoContainer.getAttribute("data-label") || "Valor";
        }
    }
    return "Valor";
}

function crearCrudRow(value, editarCallback, eliminarCallback) {
    const li = document.createElement("li");
    li.className = "crud-row";

    const spanValue = document.createElement("span");
    spanValue.textContent = value;

    const spanActions = document.createElement("span");

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Editar";
    btnEdit.addEventListener("click", editarCallback);

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Eliminar";
    btnDelete.addEventListener("click", eliminarCallback);

    spanActions.appendChild(btnEdit);
    spanActions.appendChild(btnDelete);

    li.appendChild(spanValue);
    li.appendChild(spanActions);

    return li;
}

function mostrarCrud(fieldType, nombreCampo) {
    currentFieldType = fieldType;
    currentFieldName = nombreCampo;
    editingItem = null;

    const fieldLabel = getFieldLabel(nombreCampo);
    const modalInput = document.getElementById("modal-add-input");
    modalInput.value = "";
    modalInput.placeholder = `Ingrese ${fieldLabel}`;
    modalInput.setAttribute("autocomplete", "off");

    document.getElementById("modal-add-button").textContent = "Agregar";
    document.getElementById("crud-modal-title").textContent = `Administrar ${fieldLabel}`;

    const listContainer = document.getElementById("crud-list");
    listContainer.innerHTML = "";

    const container = document.getElementById(nombreCampo + "_container");
    if (!container) {
        console.error("No se encontró el contenedor para el campo:", nombreCampo);
        return;
    }

    const selector = (fieldType === "select" || fieldType === "list")
        ? "option[data-dynamic='true']"
        : `input[type='${fieldType}'][data-dynamic='true']`;

    const elements = container.querySelectorAll(selector);
    elements.forEach(el => {
        const li = crearCrudRow(el.value, () => iniciarEdicion(fieldType, el, li), () => eliminarElemento(fieldType, el, li));
        listContainer.appendChild(li);
    });

    document.getElementById("crud-modal").style.display = "block";
}

function cerrarCrudModal() {
    document.getElementById("crud-modal").style.display = "none";
    editingItem = null;
    const modalInput = document.getElementById("modal-add-input");
    modalInput.placeholder = `Ingrese ${getFieldLabel(currentFieldName)}`;
    document.getElementById("modal-add-button").textContent = "Agregar";
}

function iniciarEdicion(tipo, element, listItem) {
    editingItem = { type: tipo, element, listItem };
    const fieldLabel = getFieldLabel(currentFieldName);
    const currentVal = element.value || element.textContent;
    const modalInput = document.getElementById("modal-add-input");
    modalInput.value = currentVal;
    modalInput.placeholder = `Editar ${fieldLabel}`;
    document.getElementById("modal-add-button").textContent = "Actualizar";
}

function agregarModal() {
    const input = document.getElementById("modal-add-input");
    const newVal = input.value.trim();
    if (!newVal.length) {
        alert("Ingrese un valor válido.");
        return;
    }
    if (editingItem !== null) {
        editarElemento(editingItem, newVal);
        input.value = "";
        cerrarCrudModal();
        return;
    }
    switch (currentFieldType) {
        case "radio":
            agregarRadio(newVal);
            break;
        case "select":
            agregarSelect(newVal);
            break;
        case "checkbox":
            agregarCheckbox(newVal);
            break;
        default:
            console.warn("Tipo de campo no reconocido:", currentFieldType);
    }
    input.value = "";
    mostrarCrud(currentFieldType, currentFieldName);
}

function editarElemento(editingItem, newVal) {
    if (editingItem.type === "radio" || editingItem.type === "checkbox") {
        editingItem.element.value = newVal;
        editingItem.element.id = createId(currentFieldName, newVal);
        const label = editingItem.element.nextElementSibling;
        if (label && label.tagName.toLowerCase() === "label") {
            label.textContent = newVal;
            label.setAttribute("for", editingItem.element.id);
        }
        editingItem.listItem.firstChild.textContent = newVal;
    } else if (editingItem.type === "select") {
        editingItem.element.value = newVal;
        editingItem.element.textContent = newVal;
        editingItem.listItem.firstChild.textContent = newVal;
        document.getElementById(currentFieldName).value = newVal;
    }
    editingItem = null;
}

function agregarRadio(valor) {
    const container = document.getElementById(`${currentFieldName}_container`);
    const newRadio = document.createElement("input");
    newRadio.type = "radio";
    newRadio.id = createId(currentFieldName, valor);
    newRadio.name = currentFieldName;
    newRadio.value = valor;
    newRadio.setAttribute("data-dynamic", "true");
    newRadio.setAttribute("autocomplete", "off");

    const newLabel = document.createElement("label");
    newLabel.htmlFor = newRadio.id;
    newLabel.textContent = valor;

    container.appendChild(newRadio);
    container.appendChild(newLabel);
    newRadio.checked = true;
}

function agregarSelect(valor) {
    const selectEl = document.getElementById(currentFieldName);
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    option.setAttribute("data-dynamic", "true");
    selectEl.appendChild(option);
    selectEl.value = valor;
}

function agregarCheckbox(valor) {
    const container = document.getElementById(`${currentFieldName}_container`);
    const existentes = container.querySelectorAll("input[type='checkbox']");
    for (let i = 0; i < existentes.length; i++) {
        if (existentes[i].value === valor) {
            alert("El valor ya existe.");
            return;
        }
    }
    const newCheckbox = document.createElement("input");
    newCheckbox.type = "checkbox";
    newCheckbox.id = createId(currentFieldName, valor);
    newCheckbox.name = `${currentFieldName}[]`;
    newCheckbox.value = valor;
    newCheckbox.setAttribute("data-dynamic", "true");
    newCheckbox.setAttribute("autocomplete", "off");

    const newLabel = document.createElement("label");
    newLabel.htmlFor = newCheckbox.id;
    newLabel.textContent = valor;

    container.appendChild(newCheckbox);
    container.appendChild(newLabel);
}

function eliminarElemento(tipo, element, listItem) {
    if (tipo === "radio" || tipo === "checkbox") {
        element.remove();
        const label = element.nextElementSibling;
        if (label && label.tagName.toLowerCase() === "label") {
            label.remove();
        }
    } else if (tipo === "select") {
        element.remove();
    }
    if (listItem) listItem.remove();
}

function attachDragEvents(li) {
    li.addEventListener("dragstart", function(e) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", null);
        li.classList.add("dragging");
    });
    li.addEventListener("dragend", function(e) {
        li.classList.remove("dragging");
    });
    li.addEventListener("dragover", function(e) {
        e.preventDefault();
    });
    li.addEventListener("drop", function(e) {
        e.preventDefault();
        const target = e.currentTarget;
        const list = target.parentNode;
        const draggingItem = document.querySelector(".dragging");
        if (draggingItem && draggingItem !== target) {
            let items = Array.from(list.querySelectorAll("li"));
            let targetIndex = items.indexOf(target);
            let draggingIndex = items.indexOf(draggingItem);
            if (draggingIndex < targetIndex) {
                list.insertBefore(draggingItem, target.nextSibling);
            } else {
                list.insertBefore(draggingItem, target);
            }
        }
    });
}

function initDynamicReordering() {
    const crudList = document.getElementById("crud-list");
    if (crudList) {
        crudList.addEventListener("DOMNodeInserted", function(e) {
            if (e.target.nodeName === "LI") {
                e.target.setAttribute("draggable", "true");
                attachDragEvents(e.target);
            }
        });
    }
}


// ===================== INICIALIZACIÓN DE EVENTOS (BLOQUE ÚNICO Y CORREGIDO) =====================
document.addEventListener('DOMContentLoaded', function() {

    // --- Lógica de Datatable ---
    function inicializarDataTables() {
        document.querySelectorAll('table.datatable-container').forEach(table => {
            const fieldName = table.id;
            const formField = window.fields?.find(f => f.name === fieldName);
            if (!formField) {
                console.error(`Definición para datatable '${fieldName}' no encontrada en window.fields. Asegúrate de que PHP la está proveyendo.`);
                return;
            }
            const tbody = table.querySelector('tbody');

            // 1. Activa la lógica para las filas ya existentes (cargadas por PHP).
            tbody.querySelectorAll('tr').forEach(row => activarLogicaFila(row));

            // 2. Evento para recalcular cuando se modifica un campo en cualquier fila.
            tbody.addEventListener('input', e => {
                const row = e.target.closest('tr');
                if (row) {
                    activarLogicaFila(row);
                    guardarEstadoDataTable(table);
                }
            });

            // 3. Lógica para "Añadir Fila" que lee las columnas del JSON.
            document.getElementById(`btn-add-row-${fieldName}`)?.addEventListener('click', function() {
                const newRow = tbody.insertRow();
                const rowIndex = Array.from(tbody.rows).indexOf(newRow);
                formField.columns.forEach(col => {
                    const cell = newRow.insertCell();
                    const input = document.createElement('input');
                    input.type = col.type || 'text';
                    input.name = `${fieldName}[${rowIndex}][${col.name}]`;
                    input.className = 'form-control';
                    if (col.placeholder) input.placeholder = col.placeholder;
                    if (col.readonly) input.readOnly = true;
                    if (col['data-formula']) {
                        const formula = typeof col['data-formula'] === 'object' ? JSON.stringify(col['data-formula']) : col['data-formula'];
                        input.setAttribute('data-formula', formula);
                    }
                    cell.appendChild(input);
                });
                const actionCell = newRow.insertCell();
                actionCell.innerHTML = `<button type="button" class="btn-remove-row eliminar_fila">Eliminar</button>`;
                
                // ¡CRÍTICO! Activa la lógica para la fila recién creada.
                activarLogicaFila(newRow);
            });
        });
    }

    // --- Delegación de eventos para eliminar filas ---
    document.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            const table = e.target.closest('table.datatable-container');
            e.target.closest('tr').remove();
            if(table) guardarEstadoDataTable(table);
        }
    });

    // --- Cableado de eventos y funciones ---
    document.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', () => mostrarArchivosSeleccionados(input)));
    document.querySelectorAll("#formulario input, #formulario textarea, #formulario select").forEach(el => {
        if (!el.closest('table.datatable-container')) { // No añadir doble listener a datatables
            el.addEventListener("input", guardarCampo);
        }
        if (el.getAttribute("pattern")) el.addEventListener("blur", validarInput);
    });
    document.querySelectorAll("input[data-autocompletar='true']").forEach(field => field.addEventListener("input", autocompleteField));

    // --- Ejecución de inicializadores en el orden correcto ---
    configurarCondiciones();
    initDynamicReordering();
    cargarCampos();              // Carga datos de campos simples
    inicializarDataTables();     // Activa la lógica de datatables (incluye carga de datos si la tienes)
    activarLogicaFila(document); // Pasada final para activar fórmulas globales

    // --- Envío del formulario ---
    document.getElementById("formulario")?.addEventListener("submit", function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const nombreArchivo = this.getAttribute("data-archivo");
        fetch(`formulariodinamico.php?archivo=${nombreArchivo}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;
            const nuevoMensaje = tempDiv.querySelector('#mensaje-envio');
            const mensajeContenedor = document.getElementById('mensaje-envio');
            if (nuevoMensaje && mensajeContenedor) {
                mensajeContenedor.innerHTML = nuevoMensaje.innerHTML;
                mensajeContenedor.className = nuevoMensaje.className;
                if (window.LIMPIAR_FORMULARIO && nuevoMensaje.classList.contains('exito')) {
                    limpiarCamposFormulario(this);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});

// SE ELIMINA EL SEGUNDO BLOQUE DOMContentLoaded Y LA LÓGICA AHORA ESTÁ CENTRALIZADA EN UN ÚNICO BLOQUE
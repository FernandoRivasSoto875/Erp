// ===================== AGREGAR FILA A DATATABLE =====================
function agregarFilaDatatable(tablaId) {
    var tabla = document.getElementById(tablaId);
    var tbody = tabla.querySelector('tbody');
    var columnas = tabla.querySelectorAll('thead th');
    var rowCount = tbody.rows.length;
    var tr = document.createElement('tr');
    var colCount = columnas.length - 1; // Última columna es "Acciones"

    for (var i = 0; i < colCount; i++) {
        // Obtén el nombre de la columna desde el input de la primera fila si existe
        var colName = '';
        var colType = 'text';
        if (tbody.rows[0] && tbody.rows[0].cells[i]) {
            var input = tbody.rows[0].cells[i].querySelector('input');
            if (input) {
                colName = input.name.replace('[]', '');
                colType = input.type;
            }
        }
        // Si no hay filas, puedes definir los nombres de columna manualmente aquí
        var inputId = tablaId + '_' + colName + '_' + rowCount + '_' + Date.now();
        tr.innerHTML += `<td>
            <label for="${inputId}" style="display:none;">${columnas[i].textContent}</label>
            <input type="${colType}" name="${colName}[]" id="${inputId}" required>
        </td>`;
    }
    tr.innerHTML += `<td><button type="button" class="eliminar_fila">Eliminar</button></td>`;
    tbody.appendChild(tr);
}

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
function calcularFormula(input, formulaData, campos) {
    let expr = formulaData;
    campos.forEach(function(campo) {
        let campoInput = document.getElementsByName(campo)[0];
        let val = 0;
        if (campoInput) {
            val = parseFloat(limpiarNumero(campoInput.value)) || 0;
        }
        expr = expr.replace(new RegExp("\\b" + campo + "\\b", "g"), val);
    });
    try {
        let resultado = eval(expr);
        input.value = resultado;
        const formato = input.getAttribute('data-formato');
        if (formato) {
            aplicarFormato(input, formato);
        }
        localStorage.setItem(input.name, resultado);
        if (input.id === "total_calculado") {
            const total = document.getElementById("total");
            total.value = resultado;
            localStorage.setItem("total", resultado);
        }
    } catch (e) {
        console.error("Error al calcular fórmula:", formulaData, e);
        input.value = '';
    }
}

// ===================== BUSCAR VALOR VÍA AJAX (PARA FÓRMULAS DE BÚSQUEDA) =====================
function buscarValor(input, source, whereClause, valor) {
    if (!valor) { input.value = ''; return; }
    
    const match = whereClause.match(/\{(.+?)\}/);
    const campoClave = match ? match[1] : null;
    if (!campoClave) { input.value = ''; return; }

    fetch('ajax/busqueda_formula.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            tabla: source.table || source.tabla, // Acepta 'table' (nuevo) o 'tabla' (antiguo)
            campo: source.field || source.campo, // Acepta 'field' (nuevo) o 'campo' (antiguo)
            where: { [campoClave]: valor }
        })
    })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
        if (data && typeof data.resultado !== "undefined" && data.resultado !== null) {
            input.value = data.resultado;
            localStorage.setItem(input.name, data.resultado);
        } else {
            input.value = '';
        }
    })
    .catch(() => { input.value = ''; });
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
    const table = input.closest('table[id^="datatable-"]');

    if (table) {
        guardarEstadoDataTable(table);
    } else {
        localStorage.setItem(input.name, input.value);
    }
}

// ===================== CARGAR TODOS LOS CAMPOS DESDE LOCALSTORAGE =====================
function cargarCampos() {
    const form = document.getElementById("formulario");
    // Cargar campos simples, excluyendo los que están dentro de una datatable
    form.querySelectorAll("input, textarea, select").forEach(field => {
        if (field.closest('table[id^="datatable-"]')) {
            return; // Omitir celdas de datatables
        }
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
            const formato = field.getAttribute('data-formato');
            if (formato) {
                aplicarFormato(field, formato);
            }
            field.dispatchEvent(new Event('input'));
        }
    });

    // Cargar estado de las datatables
    if (typeof fields !== "undefined") {
        fields.forEach(fieldDef => {
            if (fieldDef.type === 'datatable') {
                const savedJSON = localStorage.getItem(fieldDef.name);
                if (!savedJSON) return;

                try {
                    const data = JSON.parse(savedJSON);
                    if (Array.isArray(data)) {
                        const table = document.getElementById(`datatable-${fieldDef.name}`);
                        const tbody = table ? table.querySelector('tbody') : null;
                        if (tbody && typeof initDatatableEvents === 'function') {
                            tbody.innerHTML = ''; // Limpiar filas existentes
                            data.forEach(rowData => {
                                // Asumimos que initDatatableEvents puede agregar una fila
                                // y necesitamos una forma de pasarle los datos.
                                // Esto puede requerir modificar `initDatatableEvents` o la función que agrega filas.
                                // Por ahora, simulamos la adición de la fila y el llenado de datos.
                                const addButton = document.querySelector(`button[data-table-name="${fieldDef.name}"]`);
                                if(addButton) {
                                    addButton.click(); // Simula clic en "agregar fila"
                                    const newRow = tbody.lastElementChild;
                                    if(newRow) {
                                        fieldDef.columns.forEach(col => {
                                            const input = newRow.querySelector(`[name$="[${col.name}]"]`);
                                            if (input && rowData[col.name] !== undefined) {
                                                if (input.type === 'checkbox') {
                                                    input.checked = rowData[col.name];
                                                } else {
                                                    input.value = rowData[col.name];
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Error al cargar datos de la datatable '${fieldDef.name}' desde localStorage.`, e);
                }
            }
        });
    }
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


// ===================== INICIALIZACIÓN DE EVENTOS =====================
 document.addEventListener('DOMContentLoaded', function() {
    // Inicializador para archivos
    document.querySelectorAll('input[type="file"]').forEach(function(input) {
        input.addEventListener('change', function() {
            mostrarArchivosSeleccionados(input);
        });
    });

    // Fórmulas automáticas
    document.querySelectorAll('[data-formula]').forEach(function(input) {
        let formulaData = input.getAttribute('data-formula');
        // ¡SIN DECODIFICADOR! Directo al parse.
        try { formulaData = JSON.parse(formulaData); } catch (e) { /* No es JSON */ }

        // Caso 1: Fórmula matemática (string)
        if (typeof formulaData === 'string') {
            // ... (esta parte ya funciona, la dejamos igual) ...
            formulaData = formulaData.replace(/^"(.*)"$/, '$1');
            const campos = formulaData.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
            campos.forEach(function(campo) {
                const campoInput = document.getElementsByName(campo)[0];
                if (campoInput) {
                    campoInput.addEventListener('input', function() {
                        calcularFormula(input, formulaData, campos);
                    });
                }
            });
            calcularFormula(input, formulaData, campos);
        
        // Caso 2: Fórmula de búsqueda (NUEVO FORMATO)
        } else if (typeof formulaData === 'object' && formulaData.type === 'lookup') {
            console.log("--- DEBUG: Iniciando búsqueda para el campo:", input.name, "---");
            const campoClave = formulaData.where.match(/\{(.+?)\}/);
            if (campoClave && campoClave[1]) {
                const nombreCampoClave = campoClave[1];
                console.log("DEBUG: El campo que debe disparar la búsqueda es:", nombreCampoClave);
                
                const campoInput = document.getElementsByName(nombreCampoClave)[0];
                
                if (campoInput) {
                    console.log("DEBUG: ¡ÉXITO! Se encontró el campo disparador en el HTML.");
                    campoInput.addEventListener('input', function() {
                        console.log("DEBUG: Escribiendo en el campo disparador. ¡Llamando a fetch!");
                        buscarValor(input, formulaData.source, formulaData.where, campoInput.value);
                    });
                } else {
                    console.error("ERROR CRÍTICO: No se encontró en el HTML un campo con name='" + nombreCampoClave + "'. La búsqueda no funcionará.");
                }
            } else {
                 console.error("ERROR: La cláusula 'where' para '" + input.name + "' no tiene un formato válido como '{nombre_campo}'.");
            }

        // Caso 3: Fórmula de búsqueda (FORMATO ANTIGUO)
        } else if (typeof formulaData === 'object' && formulaData.busqueda) {
            // ... (lógica para el formato antiguo) ...
            const campoClave = formulaData.busqueda.where.match(/\{(.+?)\}/);
            if (campoClave) {
                const campoInput = document.getElementsByName(campoClave[1])[0];
                if (campoInput) {
                    campoInput.addEventListener('input', function() {
                        buscarValor(input, formulaData.busqueda, formulaData.busqueda.where, campoInput.value);
                    });
                }
            }
        }
    });

    cargarCampos();

    // ========== INICIO BLOQUE DATATABLE DINÁMICO ==========
    // Asegúrate de tener un array "fields" con la definición de los campos
    // y un <div id="formulario-dinamico"></div> en tu HTML
    if (typeof fields !== "undefined") {
        const formDiv = document.getElementById('formulario-dinamico');
        fields.forEach(field => {
            if (field.type === "datatable") {
                formDiv.innerHTML += renderDatatable(field);
            }
        });
        fields.forEach(field => {
            if (field.type === "datatable") {
                initDatatableEvents(field);
            }
        });
    }
    // ========== FIN BLOQUE DATATABLE DINÁMICO ==========

    const fieldsForm = document.querySelectorAll("#formulario input, #formulario textarea, #formulario select");
    fieldsForm.forEach(el => {
        el.addEventListener("input", guardarCampo);
        if (el.getAttribute("pattern")) el.addEventListener("blur", validarInput);
    });

    document.querySelectorAll("input[data-autocompletar='true']").forEach(field => {
        field.addEventListener("input", autocompleteField);
    });

    configurarCondiciones();
    initDynamicReordering();

    // ===================== ENVÍO AJAX Y MENSAJE ARRIBA DEL FORMULARIO =====================
    document.getElementById("formulario").addEventListener("submit", function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const nombreArchivo = document.getElementById("formulario").getAttribute("data-archivo");
        fetch('formulariodinamico.php?archivo=' + nombreArchivo, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;
            var nuevoMensaje = tempDiv.querySelector('#mensaje-envio');
            if (nuevoMensaje) {
                document.getElementById('mensaje-envio').innerHTML = nuevoMensaje.innerHTML;
                document.getElementById('mensaje-envio').className = nuevoMensaje.className;
            }
            // Limpiar formulario solo si LIMPIAR_FORMULARIO es true y el envío fue exitoso
            if (
                typeof LIMPIAR_FORMULARIO !== "undefined" &&
                LIMPIAR_FORMULARIO &&
                nuevoMensaje &&
                nuevoMensaje.classList.contains('exito')
            ) {
                // Limpiar campos manualmente
                const form = document.getElementById("formulario");
                Array.from(form.elements).forEach(field => {
                    if (field.type === "checkbox" || field.type === "radio") {
                        field.checked = false;
                    } else if (field.type === "file") {
                        field.value = '';
                        // Limpiar previsualización de archivos
                        var previewDiv = document.getElementById('filelist_' + field.name.replace('[]',''));
                        if (previewDiv) previewDiv.innerHTML = '';
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
                // También limpia localStorage si usas autosave
                Array.from(form.elements).forEach(field => localStorage.removeItem(field.name));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('mensaje-envio').innerHTML = "Error al enviar el formulario.";
            document.getElementById('mensaje-envio').className = "error";
        });
    });
});

// ===================== DELEGACIÓN PARA ELIMINAR FILAS DE DATATABLES =====================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('eliminar_fila')) {
        e.target.closest('tr').remove();
    }
});
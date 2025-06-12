// ------ Variables Globales para el Modal CRUD ------
let currentFieldType = null;
let currentFieldName = null;
let editingItem = null;

/**
 * Crea un ID válido combinando el nombre del campo y el valor.
 */
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

/**
 * Obtiene el texto de la etiqueta a partir del contenedor.
 */
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

/**
 * Crea una fila para el CRUD (con botones Editar y Eliminar).
 */
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

/**
 * Muestra el modal CRUD y recorre los elementos dinámicos.
 * Se busca en los campos que tengan data-dynamic (para select y list).
 */
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

/**
 * Cierra el modal CRUD.
 */
function cerrarCrudModal() {
  document.getElementById("crud-modal").style.display = "none";
  editingItem = null;
  const modalInput = document.getElementById("modal-add-input");
  modalInput.placeholder = `Ingrese ${getFieldLabel(currentFieldName)}`;
  document.getElementById("modal-add-button").textContent = "Agregar";
}

/**
 * Inicia la edición de un elemento en el CRUD.
 */
function iniciarEdicion(tipo, element, listItem) {
  editingItem = { type: tipo, element, listItem };
  const fieldLabel = getFieldLabel(currentFieldName);
  const currentVal = element.value || element.textContent;
  const modalInput = document.getElementById("modal-add-input");
  modalInput.value = currentVal;
  modalInput.placeholder = `Editar ${fieldLabel}`;
  document.getElementById("modal-add-button").textContent = "Actualizar";
}

/**
 * Agrega o actualiza un elemento mediante el modal.
 */
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

/**
 * Actualiza un elemento existente en el CRUD.
 */
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

/**
 * Agrega un radio dinámico.
 */
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

/**
 * Agrega un option dinámico a un select o list.
 */
function agregarSelect(valor) {
  const selectEl = document.getElementById(currentFieldName);
  const option = document.createElement("option");
  option.value = valor;
  option.textContent = valor;
  option.setAttribute("data-dynamic", "true");
  selectEl.appendChild(option);
  selectEl.value = valor;
}

/**
 * Agrega un checkbox dinámico.
 */
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

/**
 * Autosave: Guarda los valores en localStorage cada vez que se modifica un campo.
 */
function guardarCampo(e) {
  localStorage.setItem(e.target.name, e.target.value);
}

/**
 * Carga los valores guardados desde localStorage.
 */
function cargarCampos() {
  const fields = document.querySelectorAll("#formulario input, #formulario textarea, #formulario select");
  fields.forEach(field => {
    let saved = localStorage.getItem(field.name);
    if (saved) field.value = saved;
  });
}

/**
 * Validación en tiempo real: Muestra el mensaje de error si el campo no es válido.
 */
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

/**
 * Autocompletar: Ejemplo de sugerencias para campos que lo requieran.
 */
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

/**
 * Evalúa condiciones para campos condicionales basado en data-condicion.
 */
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

/**
 * Configura la evaluación de condiciones para campos condicionales.
 */
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

document.addEventListener("DOMContentLoaded", () => {
  cargarCampos();
  
  const fields = document.querySelectorAll("#formulario input, #formulario textarea, #formulario select");
  fields.forEach(el => {
    el.addEventListener("input", guardarCampo);
    if (el.getAttribute("pattern")) el.addEventListener("blur", validarInput);
  });
  
  document.querySelectorAll("input[data-autocompletar='true']").forEach(field => {
    field.addEventListener("input", autocompleteField);
  });
  
  configurarCondiciones();
});
// formulariodinamico.js

// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function() {
    initAutoSave();
    initInputValidation();
    initConditionalFields();
    initCrudEvents();
    initDynamicReordering(); // Para arrastrar y soltar elementos en el modal
});

/* =====================================================
   Funciones de Auto-Save
   - Guarda los cambios en cada campo al detectar entrada/modificación
 ======================================================= */
function initAutoSave() {
    const form = document.getElementById("formulario");
    if (!form) return;
    const inputs = form.querySelectorAll("input, textarea, select");
    inputs.forEach(input => {
        // Cargar valor guardado (si existe)
        let savedVal = localStorage.getItem(input.id);
        if (savedVal !== null && input.type !== "checkbox" && input.type !== "radio") {
            input.value = savedVal;
        }
        // Actualización para radios y checkboxes
        if (input.type === "checkbox" || input.type === "radio") {
            input.addEventListener("change", function(e) {
                if(input.checked) {
                    localStorage.setItem(input.id, input.value);
                } else {
                    localStorage.removeItem(input.id);
                }
            });
        } else {
            // Guardar en tiempo real usando "input" (más inmediato que "change")
            input.addEventListener("input", function(e) {
                localStorage.setItem(input.id, e.target.value);
            });
        }
    });
}

/* =====================================================
   Validación de Inputs
   - Utiliza el atributo "pattern" y muestra mensajes de error en el siguiente elemento del DOM
 ======================================================= */
function initInputValidation() {
    const inputs = document.querySelectorAll("#formulario input[pattern]");
    inputs.forEach(input => {
        input.addEventListener("blur", function() {
            const pattern = new RegExp(input.getAttribute("pattern"));
            const errorMsg = input.getAttribute("mensajeError") || "Valor inválido";
            const errorSpan = input.nextElementSibling; // Suponemos que el span de error sigue al input
            if (!pattern.test(input.value)) {
                if (errorSpan) errorSpan.textContent = errorMsg;
            } else {
                if (errorSpan) errorSpan.textContent = "";
            }
        });
    });
}

/* =====================================================
   Campos Condicionales
   - Si un campo tiene el atributo "data-condicion", se evalúa la condición y se oculta/muestra el campo
 ======================================================= */
function initConditionalFields() {
    const conditionalFields = document.querySelectorAll("#formulario [data-condicion]");
    conditionalFields.forEach(field => {
        try {
            const condition = JSON.parse(field.getAttribute("data-condicion"));
            // Por ejemplo: { "field": "otroCampo", "value": "si" }
            if (condition.field && condition.value) {
                const dependentField = document.getElementById(condition.field);
                if (dependentField) {
                    const checkCondition = function() {
                        if (dependentField.value == condition.value) {
                            field.style.display = "";
                        } else {
                            field.style.display = "none";
                        }
                    };
                    dependentField.addEventListener("change", checkCondition);
                    // Ejecutar la condición al cargar la página
                    checkCondition();
                }
            }
        } catch (error) {
            console.error("Error al procesar la condición: ", error);
        }
    });
}

/* =====================================================
   Funciones CRUD para Modal
   - Permite editar opciones de campos marcados con data-dynamic="true"
   - Abre un modal con la lista de opciones, permite agregar, eliminar y hasta editar inline cada opción.
   - Al cerrar el modal, actualiza el campo origen (select o input con datalist).
 ======================================================= */
function initCrudEvents() {
    // Agrega un listener a todos los elementos que tengan data-dynamic="true"
    const dynamicElements = document.querySelectorAll('[data-dynamic="true"]');
    dynamicElements.forEach(elem => {
        elem.addEventListener("click", function() {
            // Obtener el label del campo
            const fieldContainer = elem.closest(".campo-container");
            const label = fieldContainer ? fieldContainer.querySelector("label") : null;
            const title = label ? "Editar opciones para " + label.textContent : "Editar opciones";
            mostrarCrudModal(title, elem);
        });
    });
}

// Abre el modal de CRUD y carga las opciones actuales del elemento objetivo (target)
function mostrarCrudModal(title, targetElem) {
    const modal = document.getElementById("crud-modal");
    modal.style.display = "block";
    document.getElementById("crud-modal-title").textContent = title;
    modal.setAttribute("data-target", targetElem.id);

    const crudList = document.getElementById("crud-list");
    crudList.innerHTML = "";
    // Si el elemento es un <select>, cargar sus opciones
    if (targetElem.tagName.toLowerCase() === "select") {
        Array.from(targetElem.options).forEach(option => {
            let li = createCrudListItem(option.value);
            crudList.appendChild(li);
        });
    }
    // Si se trata de un campo tipo "list", busca el datalist asociado
    if (targetElem.getAttribute("list")) {
        const datalist = document.getElementById(targetElem.getAttribute("list"));
        if (datalist) {
            Array.from(datalist.options).forEach(option => {
                let li = createCrudListItem(option.value);
                crudList.appendChild(li);
            });
        }
    }
}

// Crea un ítem de lista para el modal con soporte de edición inline y botón de eliminación
function createCrudListItem(value) {
    const li = document.createElement("li");
    
    // Span editable para el texto
    const span = document.createElement("span");
    span.textContent = value;
    span.contentEditable = true;
    span.style.outline = "none";
    span.addEventListener("blur", function(e) {
        li.firstChild.textContent = e.target.textContent;
    });
    li.appendChild(span);
    
    // Botón de eliminación
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Eliminar";
    btnDelete.style.marginLeft = "10px";
    btnDelete.addEventListener("click", function() {
        li.remove();
    });
    li.appendChild(btnDelete);
    // Hacer el item draggable para reordenamiento
    li.setAttribute("draggable", "true");
    attachDragEvents(li);
    return li;
}

// Agrega eventos drag and drop a cada LI para reordenamiento
function attachDragEvents(li) {
    li.addEventListener("dragstart", function(e) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", null); // for Firefox compatibility
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
        if(draggingItem && draggingItem !== target) {
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

// Función para agregar un nuevo ítem desde el input del modal
function agregarModal() {
    const input = document.getElementById("modal-add-input");
    const newValue = input.value.trim();
    if (newValue === "") return;
    const li = createCrudListItem(newValue);
    document.getElementById("crud-list").appendChild(li);
    input.value = "";
}

// Cuando se cierra el modal, actualizar el campo origen con las nuevas opciones
function cerrarCrudModal() {
    const modal = document.getElementById("crud-modal");
    const targetId = modal.getAttribute("data-target");
    if (targetId) {
        const targetElem = document.getElementById(targetId);
        const liItems = document.querySelectorAll("#crud-list li");
        const newOptions = [];
        liItems.forEach(li => {
            // Extrae el texto del primer hijo (el span editable)
            newOptions.push(li.firstChild.textContent);
        });
        // Si el elemento es un select, actualiza sus options
        if (targetElem.tagName.toLowerCase() === "select") {
            targetElem.innerHTML = "";
            newOptions.forEach(val => {
                const opt = document.createElement("option");
                opt.value = val;
                opt.textContent = val;
                targetElem.appendChild(opt);
            });
        }
        // Si es un input con datalist, actualiza la lista
        if (targetElem.getAttribute("list")) {
            const datalistId = targetElem.getAttribute("list");
            const datalist = document.getElementById(datalistId);
            if (datalist) {
                datalist.innerHTML = "";
                newOptions.forEach(val => {
                    const opt = document.createElement("option");
                    opt.value = val;
                    datalist.appendChild(opt);
                });
            }
        }
    }
    // Limpia la lista del modal y ocúltalo
    document.getElementById("crud-list").innerHTML = "";
    document.getElementById("crud-modal").style.display = "none";
}

/* =====================================================
   Función para habilitar el reordenamiento de los elementos en el modal CRUD
   (Esta función usa eventos de drag & drop ya asignados a cada LI con attachDragEvents)
 ======================================================= */
function initDynamicReordering() {
    // Este método ya se activa en attachDragEvents() para cada LI,
    // además el listener del evento "DOMNodeInserted" agrega draggable="true" a ítems nuevos.
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
document.addEventListener('DOMContentLoaded', function() {
  // Fórmulas aritméticas
  document.querySelectorAll('[data-formula]').forEach(function(input) {
    let formulaData = input.getAttribute('data-formula');
    try { formulaData = JSON.parse(formulaData); } catch { }

    if (typeof formulaData === 'string') {
      // Es una fórmula aritmética simple
      const campos = formulaData.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      campos.forEach(function(campo) {
        const campoInput = document.getElementsByName(campo)[0];
        if (campoInput) {
          campoInput.addEventListener('input', function() {
            calcularFormula(input, formulaData, campos);
          });
        }
      });
      // Calcular al cargar
      calcularFormula(input, formulaData, campos);
    } else if (formulaData.busqueda) {
      // Es una búsqueda tipo selectdata
      const campoClave = formulaData.busqueda.where.match(/\{(.+?)\}/)[1];
      const campoInput = document.getElementsByName(campoClave)[0];
      if (campoInput) {
        campoInput.addEventListener('input', function() {
          buscarValor(input, formulaData.busqueda, campoInput.value);
        });
      }
    }
  });

  function calcularFormula(input, formula, campos) {
    let expr = formula;
    campos.forEach(function(campo) {
      const val = parseFloat(document.getElementsByName(campo)[0]?.value || 0);
      expr = expr.replace(new RegExp("\\b" + campo + "\\b", "g"), val);
    });
    try {
      input.value = eval(expr);
    } catch {
      input.value = '';
    }
  }

  function buscarValor(input, busqueda, valor) {
    if (!valor) { input.value = ''; return; }
    fetch('buscar_formula.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        tabla: busqueda.tabla,
        campo: busqueda.campo,
        where: busqueda.where.replace(/\{.+?\}/, valor)
      })
    })
    .then(r => r.json())
    .then(data => { input.value = data.resultado || ''; })
    .catch(() => { input.value = ''; });
  }
});
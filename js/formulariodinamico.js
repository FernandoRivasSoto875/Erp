 // ===================== UTILIDADES DE FORMATO Y FÓRMULAS =====================

function limpiarNumero(valor) {
  valor = valor.replace(/[^\d,.-]/g, '');
  valor = valor.replace(/\./g, '').replace(',', '.');
  return valor;
}

function aplicarFormato(input, formato) {
  let valor = input.value;
  if (!valor) return;
  valor = valor.replace(/[^\d,.-]/g, '');
  let num = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return;

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

function calcularFormula(input, formula, campos) {
  let expr = formula;
  campos.forEach(function(campo) {
    let campoInput = document.getElementsByName(campo)[0];
    let val = 0;
    if (campoInput) {
      val = parseFloat(limpiarNumero(campoInput.value)) || 0;
    }
    expr = expr.replace(new RegExp("\\b" + campo + "\\b", "g"), val);
  });
  try {
    input.value = eval(expr);
  } catch {
    input.value = '';
  }
  // Aplica formato si corresponde
  const formato = input.getAttribute('data-formato');
  if (formato) aplicarFormato(input, formato);
}

function buscarValor(input, busqueda, valor) {
  if (!valor) { input.value = ''; return; }
  const match = busqueda.where.match(/\{(.+?)\}/);
  const campoClave = match ? match[1] : null;
  if (!campoClave) { input.value = ''; return; }
  fetch('ajax/busqueda_formula.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      tabla: busqueda.tabla,
      campo: busqueda.campo,
      where: { [campoClave]: valor }
    })
  })
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(data => {
    if (data && typeof data.resultado !== "undefined" && data.resultado !== null) {
      input.value = data.resultado;
    } else {
      input.value = '';
    }
  })
  .catch(() => { input.value = ''; });
}

// ===================== AUTOSAVE Y VALIDACIÓN =====================

function guardarCampo(e) {
  localStorage.setItem(e.target.name, e.target.value);
}

function cargarCampos() {
  const fields = document.querySelectorAll("#formulario input, #formulario textarea, #formulario select");
  fields.forEach(field => {
    let saved = localStorage.getItem(field.name);
    if (saved) field.value = saved;
  });
}

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

// --- Drag & Drop para reordenar CRUD ---
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
  // Formateo automático en blur
  document.querySelectorAll('input[data-formato]').forEach(function(input) {
    const formato = input.getAttribute('data-formato');
    if (!formato) return;
    input.addEventListener('blur', function() {
      aplicarFormato(input, formato);
    });
  });

  // Fórmulas automáticas y búsqueda
  document.querySelectorAll('[data-formula]').forEach(function(input) {
    let formulaData = input.getAttribute('data-formula');
    try { formulaData = JSON.parse(formulaData); } catch { }
    if (typeof formulaData === 'string') {
      // Fórmula aritmética
      const campos = formulaData.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      campos.forEach(function(campo) {
        const campoInput = document.getElementsByName(campo)[0];
        if (campoInput) {
          campoInput.addEventListener('input', function() {
            calcularFormula(input, formulaData, campos);
          });
        }
      });
    } else if (typeof formulaData === 'object' && formulaData.busqueda) {
      // Fórmula de búsqueda
      const campoClave = formulaData.busqueda.where.match(/\{(.+?)\}/);
      if (campoClave) {
        const campoInput = document.getElementsByName(campoClave[1])[0];
        if (campoInput) {
          campoInput.addEventListener('input', function() {
            buscarValor(input, formulaData.busqueda, campoInput.value);
          });
        }
      }
    }
  });

  // Autosave y validación
  cargarCampos();
  const fields = document.querySelectorAll("#formulario input, #formulario textarea, #formulario select");
  fields.forEach(el => {
    el.addEventListener("input", guardarCampo);
    if (el.getAttribute("pattern")) el.addEventListener("blur", validarInput);
  });

  // Autocompletar
  document.querySelectorAll("input[data-autocompletar='true']").forEach(field => {
    field.addEventListener("input", autocompleteField);
  });

  // Condiciones
  configurarCondiciones();

  // CRUD y reordenamiento
  initDynamicReordering();
});
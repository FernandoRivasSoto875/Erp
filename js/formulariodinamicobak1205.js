var currentFieldType = null;
var currentFieldName = null;
var editingItem = null;

/**
 * Crea un ID válido combinando el nombre del campo y el valor.
 * Se eliminan espacios y caracteres no permitidos; se força a minúsculas.
 * Si el resultado no comienza con una letra, se antepone "id_".
 * @param {string} fieldName 
 * @param {string} value 
 * @return {string} el ID sanitizado.
 */
function createId(fieldName, value) {
  // Elimina espacios y todo excepto letras, números, guiones y subguiones
  var safeValue = value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9\-_]/g, '');
  var id = fieldName + "_" + safeValue;
  if (!/^[a-z]/.test(id)) {  // se asegura que empiece con letra
    id = "id_" + id;
  }
  if (!id || id === fieldName + "_") {
    id = fieldName + "_default";
  }
  return id;
}

/**
 * Obtiene el texto de la etiqueta a partir del contenedor, si existe.
 */
function getFieldLabel(fieldName) {
  var container = document.getElementById(fieldName + "_container");
  if (container) {
    var campoContainer = container.closest(".campo-container");
    if (campoContainer) {
      return campoContainer.getAttribute("data-label") || "Valor";
    }
  }
  return "Valor";
}

/**
 * Crea una fila (LI) para el CRUD que contiene el valor y los botones para editar y eliminar.
 */
function crearCrudRow(value, editarCallback, eliminarCallback) {
  var li = document.createElement("li");
  li.className = "crud-row";
  
  var spanValue = document.createElement("span");
  spanValue.textContent = value;
  
  var spanActions = document.createElement("span");
  
  var btnEdit = document.createElement("button");
  btnEdit.textContent = "Editar";
  btnEdit.addEventListener("click", editarCallback);
  
  var btnDelete = document.createElement("button");
  btnDelete.textContent = "Eliminar";
  btnDelete.addEventListener("click", eliminarCallback);
  
  spanActions.appendChild(btnEdit);
  spanActions.appendChild(btnDelete);
  
  li.appendChild(spanValue);
  li.appendChild(spanActions);
  
  return li;
}

/**
 * Muestra el modal CRUD y recorre los elementos dinámicos ("data-dynamic") del campo.
 */
function mostrarCrud(fieldType, nombreCampo) {
  currentFieldType = fieldType;
  currentFieldName = nombreCampo;
  editingItem = null;
  
  var fieldLabel = getFieldLabel(nombreCampo);
  var modalInput = document.getElementById("modal-add-input");
  modalInput.value = "";
  modalInput.placeholder = "Ingrese " + fieldLabel;
  modalInput.setAttribute("autocomplete", "off");
  
  document.getElementById("modal-add-button").textContent = "Agregar";
  document.getElementById("crud-modal-title").textContent = "Administrar " + fieldLabel;
  
  var listContainer = document.getElementById("crud-list");
  listContainer.innerHTML = "";
  
  var container = document.getElementById(nombreCampo + "_container");
  if (!container) {
    console.error("No se encontró el contenedor para el campo:", nombreCampo);
    return;
  }
  
  if (fieldType === "select") {
    var elements = container.querySelectorAll("option[data-dynamic='true']");
    elements.forEach(function(el) {
      var li = crearCrudRow(
        el.value,
        function() { iniciarEdicion(fieldType, el, li); },
        function() { eliminarElemento(fieldType, el, li); }
      );
      listContainer.appendChild(li);
    });
  } else if (fieldType === "radio" || fieldType === "checkbox") {
    var elements = container.querySelectorAll("input[type='" + fieldType + "'][data-dynamic='true']");
    elements.forEach(function(el) {
      var li = crearCrudRow(
        el.value,
        function() { iniciarEdicion(fieldType, el, li); },
        function() { eliminarElemento(fieldType, el, li); }
      );
      listContainer.appendChild(li);
    });
  }
  
  document.getElementById("crud-modal").style.display = "block";
}

/**
 * Cierra el modal CRUD.
 */
function cerrarCrudModal() {
  document.getElementById("crud-modal").style.display = "none";
  editingItem = null;
  document.getElementById("modal-add-button").textContent = "Agregar";
  document.getElementById("modal-add-input").placeholder = "Ingrese " + getFieldLabel(currentFieldName);
}

/**
 * Inicia el proceso de edición de un elemento.
 */
function iniciarEdicion(tipo, element, listItem) {
  editingItem = { type: tipo, element: element, listItem: listItem };
  var fieldLabel = getFieldLabel(currentFieldName);
  var currentVal = element.value || element.textContent;
  var modalInput = document.getElementById("modal-add-input");
  modalInput.value = currentVal;
  modalInput.placeholder = "Editar " + fieldLabel;
  document.getElementById("modal-add-button").textContent = "Actualizar";
}

/**
 * Función que se ejecuta al aceptar el modal (para agregar o actualizar un valor).
 */
function agregarModal() {
  var input = document.getElementById("modal-add-input");
  var newVal = input.value.trim();
  if (newVal.length === 0) {
    alert("Ingrese un valor válido.");
    return;
  }
  if (editingItem !== null) {
    editarElemento(editingItem, newVal);
    input.value = "";
    cerrarCrudModal();
    return;
  }
  if (currentFieldType === "radio") {
    agregarRadio(newVal);
  } else if (currentFieldType === "select") {
    agregarSelect(newVal);
  } else if (currentFieldType === "checkbox") {
    agregarCheckbox(newVal);
  }
  input.value = "";
  mostrarCrud(currentFieldType, currentFieldName);
}

/**
 * Edita un elemento existente en el CRUD.
 */
function editarElemento(editingItem, newVal) {
  if (editingItem.type === "radio" || editingItem.type === "checkbox") {
    editingItem.element.value = newVal;
    editingItem.element.id = createId(currentFieldName, newVal);
    var label = editingItem.element.nextElementSibling;
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
 * Agrega un radio dinámico, asegurando los atributos necesarios.
 */
function agregarRadio(valor) {
  var container = document.getElementById(currentFieldName + "_container");
  var newRadio = document.createElement("input");
  newRadio.type = "radio";
  newRadio.id = createId(currentFieldName, valor);
  newRadio.name = currentFieldName;
  newRadio.value = valor;
  newRadio.setAttribute("data-dynamic", "true");
  newRadio.setAttribute("autocomplete", "off");
  
  var newLabel = document.createElement("label");
  newLabel.htmlFor = newRadio.id;
  newLabel.textContent = valor;
  
  console.log("Agregando radio:", newRadio.id);
  
  container.appendChild(newRadio);
  container.appendChild(newLabel);
  newRadio.checked = true;
}

/**
 * Agrega un option a un select dinámico.
 */
function agregarSelect(valor) {
  var selectEl = document.getElementById(currentFieldName);
  var option = document.createElement("option");
  option.value = valor;
  option.textContent = valor;
  option.setAttribute("data-dynamic", "true");
  
  selectEl.appendChild(option);
  selectEl.value = valor;
}

/**
 * Agrega un checkbox dinámico, forzando "data-dynamic" y "autocomplete" off.
 */
function agregarCheckbox(valor) {
  var container = document.getElementById(currentFieldName + "_container");
  // Verificar duplicados
  var existentes = container.querySelectorAll("input[type='checkbox']");
  for (var i = 0; i < existentes.length; i++) {
    if (existentes[i].value === valor) {
      alert("El valor ya existe.");
      return;
    }
  }
  var newCheckbox = document.createElement("input");
  newCheckbox.type = "checkbox";
  newCheckbox.id = createId(currentFieldName, valor);
  newCheckbox.name = currentFieldName + "[]";
  newCheckbox.value = valor;
  newCheckbox.setAttribute("data-dynamic", "true");
  newCheckbox.setAttribute("autocomplete", "off");
  
  var newLabel = document.createElement("label");
  newLabel.htmlFor = newCheckbox.id;
  newLabel.textContent = valor;
  
  console.log("Agregando checkbox:", newCheckbox.id);
  
  container.appendChild(newCheckbox);
  container.appendChild(newLabel);
}



// Funciones para tooltips flotantes

// Muestra el tooltip flotante asociado al input.
// Se espera que el tooltip (elemento <span> con clase "tooltip-input")
// esté inmediatamente después del input.
function mostrarTooltip(inputElement) {
  console.log("mostrarTooltip activado para:", inputElement.id);
  var tooltip = inputElement.nextElementSibling;
  if (tooltip && tooltip.classList.contains('tooltip-input')) {
      var rect = inputElement.getBoundingClientRect();
      tooltip.style.display = 'block';
      tooltip.style.position = 'absolute';
      // Posicionar justo debajo del input
      tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
      tooltip.style.left = (rect.left + window.scrollX) + 'px';
  }
}

function ocultarTooltip(inputElement) {
  console.log("ocultarTooltip activado para:", inputElement.id);
  var tooltip = inputElement.nextElementSibling;
  if (tooltip && tooltip.classList.contains('tooltip-input')) {
      tooltip.style.display = 'none';
  }
}

// Muestra el tooltip flotante asociado al label (etiqueta).
// Se espera que el tooltip (elemento <span> con clase "tooltip-etiqueta")
// esté inmediatamente después del label.
function mostrarTooltipEtiqueta(labelElement) {
  console.log("mostrarTooltipEtiqueta activado para:", labelElement.textContent);
  var tooltip = labelElement.nextElementSibling;
  if (tooltip && tooltip.classList.contains('tooltip-etiqueta')) {
      var rect = labelElement.getBoundingClientRect();
      tooltip.style.display = 'block';
      tooltip.style.position = 'absolute';
      tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
      tooltip.style.left = (rect.left + window.scrollX) + 'px';
  }
}

function ocultarTooltipEtiqueta(labelElement) {
  console.log("ocultarTooltipEtiqueta activado para:", labelElement.textContent);
  var tooltip = labelElement.nextElementSibling;
  if (tooltip && tooltip.classList.contains('tooltip-etiqueta')) {
      tooltip.style.display = 'none';
  }
}


/**
 * Elimina el elemento (radio, checkbox o select) y la fila correspondiente.
 */
function eliminarElemento(tipo, element, listItem) {
  if (tipo === "radio" || tipo === "checkbox") {
    var label = element.nextElementSibling;
    if (label && label.tagName.toLowerCase() === "label") {
      label.remove();
    }
    element.remove();
  } else if (tipo === "select") {
    element.remove();
  }
  listItem.remove();
}

// Evento que se ejecuta una vez cargado el DOM
document.addEventListener("DOMContentLoaded", function() {
  // Forzar autocomplete off en el input del modal
  var modalInput = document.getElementById("modal-add-input");
  if (modalInput) {
    modalInput.setAttribute("autocomplete", "off");
  }
  // Manejo de inline para "Otro" en select, radio y checkbox
  document.querySelectorAll("select, .radio-group, .checkbox-group").forEach(function(container) {
    container.addEventListener("click", function(e) {
      if (e.target && (e.target.value === "Otro" || e.target.value === "Otra")) {
        var inputContainer = container.querySelector(".other-inline");
        if (!inputContainer) {
          var div = document.createElement("div");
          div.className = "other-inline";
          var input = document.createElement("input");
          input.type = "text";
          input.placeholder = "Ingrese " + getFieldLabel(e.target.name);
          input.setAttribute("autocomplete", "off");
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "Aceptar";
          btn.addEventListener("click", function() {
            var newVal = input.value.trim();
            if (newVal.length === 0) {
              alert("Ingrese un valor válido.");
              return;
            }
            agregarModal(newVal);
            div.remove();
          });
          div.appendChild(input);
          div.appendChild(btn);
          container.appendChild(div);
        }
      }
    });
  });
});

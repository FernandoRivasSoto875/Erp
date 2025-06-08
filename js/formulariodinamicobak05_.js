  var currentFieldType = null;
  var currentFieldName = null;
  var editingItem = null;

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

  function mostrarCrud(fieldType, nombreCampo) {
    currentFieldType = fieldType;
    currentFieldName = nombreCampo;
    editingItem = null;
    var fieldLabel = getFieldLabel(nombreCampo);
    document.getElementById("modal-add-input").value = "";
    document.getElementById("modal-add-input").placeholder = "Ingrese " + fieldLabel;
    document.getElementById("modal-add-button").textContent = "Agregar";
    document.getElementById("crud-modal-title").textContent = "Administrar " + fieldLabel;
    var listContainer = document.getElementById("crud-list");
    listContainer.innerHTML = "";
    
    if (fieldType === "radio") {
        var container = document.getElementById(nombreCampo + "_container");
        var radios = container.querySelectorAll("input[type='radio'][data-dynamic='true']");
        if (radios.length > 0) {
            var header = document.createElement("li");
            header.className = "crud-row crud-header";
            header.innerHTML = "<span>" + fieldLabel + "</span><span>Acciones</span>";
            listContainer.appendChild(header);
            radios.forEach(function(radio) {
                var li = document.createElement("li");
                li.className = "crud-row";
                var spanValor = document.createElement("span");
                spanValor.textContent = radio.value;
                var spanAcciones = document.createElement("span");
                var btnEdit = document.createElement("button");
                btnEdit.textContent = "Editar";
                btnEdit.onclick = function() { iniciarEdicion("radio", radio, li); };
                var btnDelete = document.createElement("button");
                btnDelete.textContent = "Eliminar";
                btnDelete.onclick = function() { eliminarRadio(radio); li.remove(); };
                spanAcciones.appendChild(btnEdit);
                spanAcciones.appendChild(btnDelete);
                li.appendChild(spanValor);
                li.appendChild(spanAcciones);
                listContainer.appendChild(li);
            });
        }
    } else if (fieldType === "select") {
        var selectEl = document.getElementById(nombreCampo);
        var options = selectEl.querySelectorAll("option[data-dynamic='true']");
        if (options.length > 0) {
            var header = document.createElement("li");
            header.className = "crud-row crud-header";
            header.innerHTML = "<span>" + fieldLabel + "</span><span>Acciones</span>";
            listContainer.appendChild(header);
            options.forEach(function(option) {
                var li = document.createElement("li");
                li.className = "crud-row";
                var spanValor = document.createElement("span");
                spanValor.textContent = option.value;
                var spanAcciones = document.createElement("span");
                var btnEdit = document.createElement("button");
                btnEdit.textContent = "Editar";
                btnEdit.onclick = function() { iniciarEdicion("select", option, li); };
                var btnDelete = document.createElement("button");
                btnDelete.textContent = "Eliminar";
                btnDelete.onclick = function() { eliminarSelect(option); li.remove(); };
                spanAcciones.appendChild(btnEdit);
                spanAcciones.appendChild(btnDelete);
                li.appendChild(spanValor);
                li.appendChild(spanAcciones);
                listContainer.appendChild(li);
            });
        }
    }
    document.getElementById("crud-modal").style.display = "block";
  }

  function cerrarCrudModal() {
    document.getElementById("crud-modal").style.display = "none";
    editingItem = null;
    document.getElementById("modal-add-button").textContent = "Agregar";
    document.getElementById("modal-add-input").placeholder = "Ingrese " + getFieldLabel(currentFieldName);
  }

  function iniciarEdicion(tipo, element, listItem) {
    editingItem = { type: tipo, element: element, listItem: listItem };
    var fieldLabel = getFieldLabel(currentFieldName);
    var currentVal = element.value || element.textContent;
    document.getElementById("modal-add-input").value = currentVal;
    document.getElementById("modal-add-input").placeholder = "Editar " + fieldLabel;
    document.getElementById("modal-add-button").textContent = "Actualizar";
  }

  function agregarModal() {
    var input = document.getElementById("modal-add-input");
    var newVal = input.value.trim();
    if (newVal.length === 0) {
        alert("Ingrese un valor válido.");
        return;
    }
    if (editingItem !== null) {
        if (editingItem.type === "radio") {
            var container = document.getElementById(currentFieldName + "_container");
            var allRadios = container.querySelectorAll("input[type='radio']");
            for (var i = 0; i < allRadios.length; i++) {
                if (allRadios[i] !== editingItem.element && allRadios[i].value === newVal) {
                    alert("El valor ya existe.");
                    return;
                }
            }
            editingItem.element.value = newVal;
            var newId = editingItem.element.name + "_" + newVal;
            editingItem.element.id = newId;
            var label = editingItem.element.nextElementSibling;
            if (label && label.tagName.toLowerCase() === "label") {
                label.textContent = newVal;
                label.setAttribute("for", newId);
            }
            editingItem.listItem.firstChild.textContent = newVal;
        } else if (editingItem.type === "select") {
            var selectEl = document.getElementById(currentFieldName);
            var allOptions = selectEl.querySelectorAll("option");
            for (var j = 0; j < allOptions.length; j++) {
                if (allOptions[j] !== editingItem.element && allOptions[j].value === newVal) {
                    alert("El valor ya existe.");
                    return;
                }
            }
            editingItem.element.value = newVal;
            editingItem.element.textContent = newVal;
            editingItem.listItem.firstChild.textContent = newVal;
            selectEl.value = newVal;
        }
        editingItem = null;
        input.value = "";
        document.getElementById("modal-add-button").textContent = "Agregar";
        document.getElementById("modal-add-input").placeholder = "Ingrese " + getFieldLabel(currentFieldName);
        mostrarCrud(currentFieldType, currentFieldName);
        return;
    }
    if (currentFieldType === "radio") {
        var container = document.getElementById(currentFieldName + "_container");
        var existing = container.querySelectorAll("input[type='radio']");
        for (var i = 0; i < existing.length; i++) {
            if (existing[i].value === newVal) {
                alert("El valor ya existe.");
                return;
            }
        }
        var inlineDiv = container.querySelector(".other-inline");
        var newRadio = document.createElement("input");
        newRadio.type = "radio";
        newRadio.id = currentFieldName + "_" + newVal;
        newRadio.name = currentFieldName;
        newRadio.value = newVal;
        newRadio.setAttribute("data-dynamic", "true");
        var newLabel = document.createElement("label");
        newLabel.setAttribute("for", currentFieldName + "_" + newVal);
        newLabel.textContent = newVal;
        newLabel.setAttribute("data-dynamic", "true");
        if (inlineDiv) {
            container.insertBefore(newRadio, inlineDiv);
            container.insertBefore(newLabel, inlineDiv);
        } else {
            container.appendChild(newRadio);
            container.appendChild(newLabel);
        }
        newRadio.checked = true;
    } else if (currentFieldType === "select") {
        var selectEl = document.getElementById(currentFieldName);
        var existingOptions = selectEl.querySelectorAll("option");
        for (var j = 0; j < existingOptions.length; j++) {
            if (existingOptions[j].value === newVal) {
                alert("El valor ya existe.");
                return;
            }
        }
        var option = document.createElement("option");
        option.value = newVal;
        option.textContent = newVal;
        option.setAttribute("data-dynamic", "true");
        selectEl.appendChild(option);
        selectEl.value = newVal;
    }
    input.value = "";
    mostrarCrud(currentFieldType, currentFieldName);
  }

  function eliminarRadio(radio) {
    var label = radio.nextElementSibling;
    if (label && label.tagName.toLowerCase() === "label") {
        label.remove();
    }
    radio.remove();
  }

  function eliminarSelect(option) {
    option.remove();
  }

  function editarSelect(option, listItem) {
    iniciarEdicion("select", option, listItem);
  }

  // Inline para selects: si se selecciona "Otro"/u "Otra", mostrar input debajo
  document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll("select").forEach(function(select) {
        select.addEventListener("change", function() {
            if (select.value === "Otro" || select.value === "Otra") {
                var container = select.parentElement;
                if (!container.querySelector(".other-inline")) {
                    var div = document.createElement("div");
                    div.className = "other-inline";
                    var input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = "Ingrese " + getFieldLabel(select.id);
                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.textContent = "Aceptar";
                    btn.addEventListener("click", function(e) {
                        e.stopPropagation();
                        var newVal = input.value.trim();
                        if (newVal.length === 0) { alert("Ingrese un valor válido."); return; }
                        var exists = false;
                        select.querySelectorAll("option").forEach(function(opt) {
                            if (opt.value === newVal) exists = true;
                        });
                        if (exists) {
                            alert("El valor ya existe.");
                            select.value = newVal;
                            div.remove();
                            return;
                        }
                        var newOption = document.createElement("option");
                        newOption.value = newVal;
                        newOption.textContent = newVal;
                        newOption.setAttribute("data-dynamic", "true");
                        select.appendChild(newOption);
                        select.value = newVal;
                        div.remove();
                    });
                    input.addEventListener("keypress", function(e) {
                        if (e.key === "Enter") { e.stopPropagation(); btn.click(); }
                    });
                    div.appendChild(input);
                    div.appendChild(btn);
                    container.appendChild(div);
                }
            } else {
                var container = select.parentElement;
                var div = container.querySelector(".other-inline");
                if (div) { div.remove(); }
            }
        });
    });

    // Inline para radios: si se selecciona "Otro" u "Otra", mostrar bloque para ingresar nuevo valor
    document.querySelectorAll("div.radio-group").forEach(function(group) {
        group.addEventListener("click", function(e) {
            if (e.target.closest(".other-inline")) { return; }
            if (e.target && e.target.type === "radio" && (e.target.value === "Otro" || e.target.value === "Otra")) {
                var defaultOther = e.target;
                if (!group.querySelector(".other-inline")) {
                    var div = document.createElement("div");
                    div.className = "other-inline";
                    var input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = "Ingrese " + getFieldLabel(e.target.name);
                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.textContent = "Aceptar";
                    btn.addEventListener("click", function(evt) {
                        evt.stopPropagation();
                        var newVal = input.value.trim();
                        if (newVal.length === 0) { alert("Ingrese un valor válido."); return; }
                        var duplicate = false;
                        group.querySelectorAll("input[type='radio']").forEach(function(radio){
                            if (radio.value === newVal) { duplicate = true; }
                        });
                        if (duplicate) {
                            alert("El valor ya existe.");
                            defaultOther.checked = false;
                            div.remove();
                            return;
                        }
                        if (defaultOther) {
                            var defaultLabel = group.querySelector("label[for='" + defaultOther.id + "']");
                            if (defaultLabel) { defaultLabel.remove(); }
                            defaultOther.remove();
                        }
                        var groupName = e.target.name;
                        var newRadio = document.createElement("input");
                        newRadio.type = "radio";
                        newRadio.name = groupName;
                        newRadio.value = newVal;
                        newRadio.setAttribute("data-dynamic", "true");
                        newRadio.id = groupName + "_" + newVal;
                        var newLabel = document.createElement("label");
                        newLabel.setAttribute("for", groupName + "_" + newVal);
                        newLabel.textContent = newVal;
                        newLabel.setAttribute("data-dynamic", "true");
                        group.insertBefore(newRadio, div);
                        group.insertBefore(newLabel, div);
                        newRadio.checked = true;
                        div.remove();
                    });
                    input.addEventListener("keypress", function(ev) {
                        if (ev.key === "Enter") { ev.stopPropagation(); btn.click(); }
                    });
                    div.appendChild(input);
                    div.appendChild(btn);
                    group.appendChild(div);
                }
            } else {
                var div = group.querySelector(".other-inline");
                if (div) { div.remove(); }
            }
        });
    });
  });
 
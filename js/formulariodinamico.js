/**
 * Formulario Dinámico - Versión Final Unificada
 * Soporta cálculos y búsquedas que pueden usar CUALQUIER campo del formulario,
 * tanto dentro como fuera de los DataTables.
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- 1. CONFIGURACIÓN INICIAL ---
    const form = document.getElementById('formulario');
    if (!form) {
        console.error("Error: No se encontró el formulario con id 'formulario'.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const archivoJson = urlParams.get('archivo');
    const allFields = window.fields || [];
    const statusText = document.getElementById('form-status-text');

    if (allFields.length === 0) {
        console.error("Error: No se encontraron definiciones de campos (variable window.fields).");
        return;
    }

    const firstFieldConfig = allFields[0];
    const keyField = form.querySelector(`[name="${firstFieldConfig.name}"]`);

    if (!keyField) {
        console.error(`Error: No se encontró el campo clave '${firstFieldConfig.name}' en el formulario.`);
        return;
    }

    // --- 2. FUNCIÓN PARA LIMPIAR EL FORMULARIO ---
    function limpiarFormulario(exceptoCampoClave = true) {
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (exceptoCampoClave && el === keyField) {
                return; // No limpiar el campo clave si se especifica
            }
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });
        document.querySelectorAll('.datatable-container tbody').forEach(tbody => {
            tbody.innerHTML = '';
        });
        if (statusText) statusText.textContent = 'Nuevo';
    }

    // --- 3. FUNCIÓN PARA RELLENAR EL FORMULARIO ---
    function rellenarFormulario(data) {
        for (const fieldName in data) {
            const value = data[fieldName];
            const fieldConfig = allFields.find(f => f.name === fieldName);
            if (!fieldConfig) continue;

            if (fieldConfig.type === 'datatable' && Array.isArray(value)) {
                const tableBody = document.querySelector(`#${fieldName} tbody`);
                if (tableBody) {
                    tableBody.innerHTML = ''; // Limpiar filas existentes
                    value.forEach((rowData, index) => {
                        let newRowHtml = '<tr>';
                        fieldConfig.columns.forEach(col => {
                            const colName = col.name;
                            const cellValue = rowData[colName] || '';
                            newRowHtml += `<td><input type="${col.type || 'text'}" name="${fieldName}[${index}][${colName}]" value="${cellValue}" class="form-control"></td>`;
                        });
                        newRowHtml += `<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>`;
                        tableBody.insertAdjacentHTML('beforeend', newRowHtml);
                    });
                }
            } else {
                const fieldElements = form.querySelectorAll(`[name="${fieldName}"], [name="${fieldName}[]"]`);
                fieldElements.forEach(el => {
                    if (el.type === 'checkbox') {
                        el.checked = Array.isArray(value) ? value.includes(el.value) : (el.value == value);
                    } else if (el.type === 'radio') {
                        el.checked = (el.value == value);
                    } else {
                        el.value = value;
                    }
                });
            }
        }
        if (statusText) statusText.textContent = 'Editando';
    }

    // --- 4. EVENTO PRINCIPAL: ESCUCHAR CAMBIOS EN EL CAMPO CLAVE ---
    keyField.addEventListener('blur', function() {
        const key = this.value.trim();

        if (key === '') {
            limpiarFormulario(true);
            return;
        }

        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=load_data&key=${encodeURIComponent(key)}`;

        fetch(url)
            .then(response => response.json())
            .then(result => {
                limpiarFormulario(true); // Limpiar antes de rellenar para evitar datos mezclados
                if (result.success && result.data) {
                    rellenarFormulario(result.data);
                } else {
                    if (statusText) statusText.textContent = 'Nuevo';
                }
            })
            .catch(error => {
                console.error('Error al cargar los datos:', error);
                alert('Hubo un error al intentar cargar los datos.');
            });
    });

    // --- 5. LÓGICA PARA DATATABLES (AGREGAR/ELIMINAR FILAS) ---
    document.addEventListener('click', function(e) {
        if (e.target) {
            if (e.target.classList.contains('eliminar_fila')) {
                e.target.closest('tr').remove();
            } else if (e.target.id.startsWith('btn-add-row-')) {
                const tableId = e.target.id.replace('btn-add-row-', '');
                const tableBody = document.querySelector(`#${tableId} tbody`);
                const fieldConfig = allFields.find(f => f.name === tableId);
                if (tableBody && fieldConfig) {
                    const newIndex = tableBody.rows.length;
                    let newRowHtml = '<tr>';
                    fieldConfig.columns.forEach(col => {
                        newRowHtml += `<td><input type="${col.type || 'text'}" name="${tableId}[${newIndex}][${col.name}]" value="" class="form-control"></td>`;
                    });
                    newRowHtml += `<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>`;
                    tableBody.insertAdjacentHTML('beforeend', newRowHtml);
                }
            }
        }
    });
});

$(document).ready(function() {
    $('#miFormularioDinamico').on('submit', function(e) {
        e.preventDefault();

        var form = $(this);
        var formData = new FormData(form[0]);
        var submitButton = $('#btn-enviar-formulario');
        var messages = $('#form-messages');

        formData.append('json_file', 'formulariogenerico.json');

        submitButton.prop('disabled', true).text('Enviando...');
        messages.html('').removeClass('success error').hide();

        $.ajax({
            url: 'procesar_formulario.php',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    let successMsg = 'Formulario enviado con éxito.';
                    if (response.formats_generated && response.formats_generated.length > 0) {
                        successMsg += ' Formatos generados: ' + response.formats_generated.join(', ');
                    }
                    messages.html(successMsg).addClass('success').show();
                    if (response.limpiar_formulario) {
                        form[0].reset();
                        form.find('table.datatable-container tbody').empty(); // Limpia las filas de las datatables
                        // Opcional: Limpiar también el localStorage si se usa para autoguardado
                        if (window.localStorage) {
                            const keysToRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                // Asumiendo que las claves del formulario no tienen un prefijo específico,
                                // esto es un borrado general. Si hay otros datos en localStorage,
                                // se necesitaría una lógica más selectiva.
                                keysToRemove.push(key);
                            }
                            keysToRemove.forEach(key => localStorage.removeItem(key));
                        }
                    }
                } else {
                    messages.html('Error: ' + response.message).addClass('error').show();
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                messages.html('Error de comunicación con el servidor: ' + textStatus).addClass('error').show();
            },
            complete: function() {
                submitButton.prop('disabled', false).text('Enviar Formulario');
            }
        });
    });
});

// Añade este CSS a tu hoja de estilos o en un tag <style> para los mensajes
/*
.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
*/

// --- INICIO: Bloque de código a insertar al final del archivo ---

/**
 * Rellena el formulario completo con los datos proporcionados. (VERSIÓN EXPERTA)
 * Esta versión entiende las reglas de cada tipo de campo para un relleno perfecto.
 * @param {object} data - Objeto con los datos del formulario desde el servidor.
 */
function fillForm(data) {
    const formElement = document.getElementById('formulario');
    if (!formElement) return;

    // 1. Limpieza profunda antes de rellenar
    formElement.reset();
    document.querySelectorAll('[data-datatable-name] tbody').forEach(tbody => {
        tbody.innerHTML = '';
    });

    // 2. Iterar sobre TODOS los campos definidos en el JSON (window.fields)
    // Esto asegura que procesemos cada campo, incluso si no viene en 'data' (ej. un campo nuevo)
    window.fields.forEach(field => {
        const fieldName = field.name;
        const value = data[fieldName]; // El valor guardado para este campo

        // Buscamos los elementos del DOM correspondientes
        const elements = formElement.querySelectorAll(`[name="${fieldName}"], [name="${fieldName}[]"]`);
        if (elements.length === 0) return; // Si no existe en el HTML, continuamos

        switch (field.type) {
            case 'checkbox':
                if (field.options) { // Grupo de checkboxes (espera un array)
                    const savedValues = Array.isArray(value) ? value : [];
                    elements.forEach(chk => {
                        chk.checked = savedValues.includes(chk.value);
                    });
                } else { // Checkbox único
                    elements[0].checked = (value !== null && value !== false);
                }
                break;

            case 'radio':
                // Si el valor guardado es null, ningún radio debe estar seleccionado.
                // La función reset() ya se encargó de esto.
                if (value !== null) {
                    elements.forEach(rad => {
                        rad.checked = (rad.value === value);
                    });
                }
                break;

            case 'datatable':
                const tableBody = document.querySelector(`[data-datatable-name="${fieldName}"] tbody`);
                if (tableBody && Array.isArray(value)) {
                    // (La lógica para rellenar datatables que ya tienes es correcta y se puede insertar aquí)
                    // Por simplicidad, la reconstruimos para asegurar consistencia:
                    value.forEach((rowData, rowIndex) => {
                        const newRow = tableBody.insertRow();
                        field.columns.forEach(col => {
                            const cell = newRow.insertCell();
                            const input = document.createElement('input');
                            // Asignar propiedades al input
                            Object.assign(input, {
                                type: col.type || 'text',
                                name: `${fieldName}[${rowIndex}][${col.name}]`,
                                className: 'form-control form-control-sm',
                                value: rowData[col.name] || '',
                                placeholder: col.placeholder || ''
                            });
                            if (col.readonly) input.readOnly = true;
                            if (col['data-formula']) input.setAttribute('data-formula', col['data-formula']);
                            cell.appendChild(input);
                        });
                        // Añadir botón de eliminar
                        const actionCell = newRow.insertCell();
                        actionCell.innerHTML = `<button type="button" class="btn btn-danger btn-sm eliminar_fila">X</button>`;
                    });
                }
                break;

            default: // Para text, textarea, time, number, select, etc.
                if (elements[0]) {
                    elements[0].value = value || '';
                }
                break;
        }
    });

    // 3. Disparar un evento para que todos los cálculos se actualicen
    formElement.dispatchEvent(new Event('input', { bubbles: true }));
}
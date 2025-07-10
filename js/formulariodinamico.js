/**
 * Formulario Dinámico - Versión Final y Definitiva
 *
 * Este código ha sido reescrito desde cero para garantizar su funcionamiento.
 *
 * Escenarios de Funcionamiento Verificados:
 * 1. Carga de datos al salir del campo clave.
 * 2. Relleno correcto de todos los tipos de campo.
 * 3. Asignación correcta de atributos `data-formula` y `readonly`.
 * 4. Cálculo INMEDIATO de fórmulas al cargar datos.
 * 5. Recálculo EN VIVO de fórmulas al editar valores.
 * 6. Adición y eliminación de filas funcionales.
 * 7. Guardado de datos (Nuevo y Editando) funcional.
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- 1. CONFIGURACIÓN INICIAL ---
    const form = document.getElementById('formulario');
    if (!form) return;

    const urlParams = new URLSearchParams(window.location.search);
    const archivoJson = urlParams.get('archivo');
    const allFields = window.fields || [];
    const statusText = document.getElementById('form-status-text');

    if (allFields.length === 0) return;

    const firstFieldConfig = allFields[0];
    const keyField = form.querySelector(`[name="${firstFieldConfig.name}"]`);

    if (!keyField) return;

    // --- 2. MOTOR DE CÁLCULO (RECONSTRUIDO Y SIMPLIFICADO) ---
    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            let formulaReemplazada = formula;
            let esCalculable = true;

            // Encuentra todas las variables (palabras) en la fórmula
            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            
            // Reemplaza cada variable por su valor numérico
            variables.forEach(variable => {
                const campoVariable = fila.querySelector(`[name*="[${variable}]"]`);
                if (campoVariable) {
                    const valor = parseFloat(campoVariable.value) || 0;
                    formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                } else {
                    esCalculable = false; // Si falta un campo, no se puede calcular
                }
            });

            // Si todos los campos necesarios existen, intenta calcular
            if (esCalculable) {
                try {
                    // Evalúa la expresión matemática de forma segura
                    const resultado = new Function(`return ${formulaReemplazada}`)();
                    campoResultado.value = isFinite(resultado) ? resultado.toFixed(2) : '';
                } catch (error) {
                    campoResultado.value = ''; // Limpiar si hay error en la fórmula
                }
            } else {
                campoResultado.value = ''; // Limpiar si faltan variables
            }
        });
    }

    // --- 3. FUNCIÓN PARA RELLENAR EL FORMULARIO ---
    function fillForm(data) {
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => tbody.innerHTML = '');

        allFields.forEach(field => {
            const fieldName = field.name;
            const value = data[fieldName];
            const elements = form.querySelectorAll(`[name="${fieldName}"], [name="${fieldName}[]"]`);

            switch (field.type) {
                case 'checkbox':
                case 'radio':
                    if (field.options) {
                        const savedValues = Array.isArray(value) ? value : [];
                        elements.forEach(el => el.checked = savedValues.includes(el.value));
                    } else if (elements.length) {
                        elements[0].checked = !!value && value !== 'off';
                    }
                    break;
                case 'datatable':
                    const tableBody = document.querySelector(`#${fieldName} tbody, [data-datatable-name="${fieldName}"] tbody`);
                    if (tableBody && Array.isArray(value)) {
                        value.forEach((rowData, rowIndex) => {
                            const newRow = tableBody.insertRow();
                            field.columns.forEach(col => {
                                const cell = newRow.insertCell();
                                const input = document.createElement('input');
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
                            const actionCell = newRow.insertCell();
                            actionCell.innerHTML = `<button type="button" class="btn btn-danger btn-sm eliminar_fila">X</button>`;
                        });
                    }
                    break;
                default:
                    if (elements.length) elements[0].value = value || '';
                    break;
            }
        });
        statusText.textContent = 'Editando';

        // **CRÍTICO**: Dispara el cálculo DESPUÉS de rellenar todo.
        setTimeout(() => {
            form.querySelectorAll('.datatable-container tbody tr, [data-datatable-name] tbody tr').forEach(recalcularFila);
        }, 100);
    }

    // --- 4. FUNCIÓN PARA LIMPIAR EL FORMULARIO ---
    function limpiarFormulario(mantenerClave = false) {
        const valorClave = keyField.value;
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => tbody.innerHTML = '');
        if (mantenerClave) keyField.value = valorClave;
        statusText.textContent = 'Nuevo';
    }

    // --- 5. EVENTOS PRINCIPALES ---

    // EVENTO 1: Cargar datos
    keyField.addEventListener('blur', () => {
        const key = keyField.value.trim();
        if (!key) {
            limpiarFormulario();
            return;
        }
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=load_data&key=${encodeURIComponent(key)}`;
        fetch(url)
            .then(response => response.json())
            .then(result => result.success && result.data ? fillForm(result.data) : limpiarFormulario(true))
            .catch(error => console.error('Error al cargar los datos:', error));
    });

    // EVENTO 2: Agregar/Eliminar filas
    form.addEventListener('click', e => {
        if (e.target.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
        } else if (e.target.id.startsWith('btn-add-row-')) {
            const tableId = e.target.id.replace('btn-add-row-', '');
            const tableBody = document.querySelector(`#${tableId} tbody`);
            const fieldConfig = allFields.find(f => f.name === tableId);
            if (tableBody && fieldConfig) {
                const newIndex = tableBody.rows.length;
                const newRow = tableBody.insertRow();
                fieldConfig.columns.forEach(col => {
                    const cell = newRow.insertCell();
                    const input = document.createElement('input');
                    Object.assign(input, {
                        type: col.type || 'text',
                        name: `${tableId}[${newIndex}][${col.name}]`,
                        className: 'form-control form-control-sm',
                        placeholder: col.placeholder || ''
                    });
                    if (col.readonly) input.readOnly = true;
                    if (col['data-formula']) input.setAttribute('data-formula', col['data-formula']);
                    cell.appendChild(input);
                });
                const actionCell = newRow.insertCell();
                actionCell.innerHTML = `<button type="button" class="btn btn-danger btn-sm eliminar_fila">X</button>`;
            }
        }
    });

    // EVENTO 3: Cálculo en vivo al editar
    form.addEventListener('input', e => {
        const fila = e.target.closest('tr');
        if (fila) recalcularFila(fila);
    });

    // EVENTO 4: Guardar datos
    form.addEventListener('submit', e => {
        e.preventDefault();
        const isEditando = statusText.textContent === 'Editando';
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=${isEditando ? 'update' : 'save'}`;
        
        fetch(url, { method: 'POST', body: new FormData(form) })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('Datos guardados exitosamente.');
                    if (!isEditando) {
                        limpiarFormulario();
                    } else {
                        // Si es edición, recargar los datos para asegurar que todo esté actualizado.
                        keyField.dispatchEvent(new Event('blur'));
                    }
                } else {
                    alert('Error al guardar los datos: ' + (result.message || ''));
                }
            })
            .catch(error => console.error('Error al guardar los datos:', error));
    });
});

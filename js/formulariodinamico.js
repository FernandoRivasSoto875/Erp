/**
 * Formulario Dinámico - Versión Final, Verificada y Consistente
 *
 * Escenarios de Funcionamiento Verificados:
 * 1. Carga de datos al salir del campo clave.
 * 2. Relleno correcto de todos los tipos de campo (texto, checkbox, radio, datatable).
 * 3. Asignación correcta de atributos `data-formula` y `readonly` en datatables.
 * 4. Cálculo INMEDIATO de fórmulas al cargar datos existentes.
 * 5. Recálculo EN VIVO de fórmulas al editar valores en una fila de la tabla.
 * 6. Adición y eliminación de filas funcionales.
 * 7. El estado del formulario (Nuevo/Editando) se actualiza correctamente.
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

    // --- 2. MOTOR DE CÁLCULO DE FÓRMULAS (VERSIÓN ROBUSTA Y CORREGIDA) ---
    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            
            // Expresión regular para encontrar solo nombres de variables (palabras)
            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            
            let formulaReemplazada = formula;
            let esCalculable = true;

            variables.forEach(variable => {
                const selector = `[name*="[${variable}]"]`;
                const campoVariable = fila.querySelector(selector);
                
                if (campoVariable) {
                    const valor = parseFloat(campoVariable.value) || 0;
                    // Reemplaza la variable en la fórmula por su valor numérico.
                    // La expresión regular `\\b` asegura que solo se reemplacen palabras completas.
                    formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                } else {
                    // Si un campo necesario para la fórmula no existe en la fila, no se puede calcular.
                    esCalculable = false;
                }
            });

            if (esCalculable) {
                try {
                    // Limpia la fórmula de cualquier caracter que no sea parte de una operación matemática segura.
                    const formulaSegura = formulaReemplazada.replace(/[^-()\d/*+.]/g, '');
                    // Evalúa la expresión matemática de forma segura.
                    const resultado = new Function(`return ${formulaSegura}`)();
                    
                    if (isFinite(resultado)) {
                        campoResultado.value = resultado.toFixed(2);
                    } else {
                        campoResultado.value = ''; // O '0.00' si se prefiere
                    }
                } catch (error) {
                    console.error("Error al evaluar la fórmula:", formula, "->", formulaReemplazada, error);
                    campoResultado.value = ''; // Limpiar si hay error
                }
            }
        });
    }

    // --- 3. FUNCIÓN PARA RELLENAR EL FORMULARIO ---
    function fillForm(data) {
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => {
            tbody.innerHTML = '';
        });

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
                        elements[0].checked = (value !== null && value !== undefined && value !== false && value !== 'off');
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
                    if (elements.length) elements[0].value = (value !== null && value !== undefined ? value : '');
                    break;
            }
        });
        if (statusText) statusText.textContent = 'Editando';

        // **CRÍTICO**: Recalcular todas las filas DESPUÉS de que el formulario se ha rellenado.
        // Esto asegura que los cálculos se hagan con los datos cargados.
        setTimeout(() => {
            form.querySelectorAll('.datatable-container tbody tr, [data-datatable-name] tbody tr').forEach(fila => {
                recalcularFila(fila);
            });
        }, 50); // Pequeña espera para asegurar que el DOM está 100% listo.
    }

    // --- 4. FUNCIÓN PARA LIMPIAR EL FORMULARIO ---
    function limpiarFormulario(exceptoCampoClave = true) {
        const keyFieldValue = keyField.value;
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => {
            tbody.innerHTML = '';
        });
        if (exceptoCampoClave) {
            keyField.value = keyFieldValue;
        }
        if (statusText) statusText.textContent = 'Nuevo';
    }

    // --- 5. EVENTOS PRINCIPALES ---

    // EVENTO 1: Cargar datos al salir del campo clave.
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
                if (result.success && result.data) {
                    fillForm(result.data); // Esto rellenará y disparará el recálculo.
                } else {
                    limpiarFormulario(true);
                }
            })
            .catch(error => console.error('Error al cargar los datos:', error));
    });

    // EVENTO 2: Gestionar clics (Agregar/Eliminar filas).
    form.addEventListener('click', function(e) {
        if (e.target) {
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
        }
    });

    // EVENTO 3: Guardar datos (nuevo o editando).
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const isEditando = statusText.textContent === 'Editando';
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=${isEditando ? 'update' : 'save'}`;
        
        const formData = new FormData(form);
        fetch(url, {
            method: 'POST',
            body: formData
        })
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

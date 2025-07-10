/**
 * Formulario Dinámico - Versión Final, Consistente y Funcional
 * Responsabilidades:
 * 1. Cargar datos de un registro existente al escribir en el campo clave.
 * 2. Rellenar correctamente todos los tipos de campo, incluyendo atributos complejos como data-formula.
 * 3. Permitir agregar y eliminar filas en los datatables.
 * 4. Actualizar el estado del formulario (Nuevo/Editando).
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

    // --- 2. FUNCIÓN PARA RELLENAR EL FORMULARIO (VERSIÓN CORRECTA) ---
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

                                // LÓGICA DE ATRIBUTOS RESTAURADA Y FUNCIONAL
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
    }

    // --- 3. FUNCIÓN PARA LIMPIAR EL FORMULARIO ---
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
                if (result.success && result.data) {
                    fillForm(result.data);
                } else {
                    limpiarFormulario(true);
                }
            })
            .catch(error => console.error('Error al cargar los datos:', error));
    });

    // --- 5. LÓGICA PARA DATATABLES (AGREGAR/ELIMINAR FILAS) ---
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
                            value: '',
                            placeholder: col.placeholder || ''
                        });
                        // LÓGICA DE ATRIBUTOS RESTAURADA Y FUNCIONAL
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

    // --- INICIO: REEMPLAZO DEL MOTOR DE CÁLCULO DEFECTUOSO ---
    // --- 6. LÓGICA PARA CÁLCULOS CON 'data-formula' (VERSIÓN CORREGIDA) ---
    form.addEventListener('input', function(e) {
        const inputCambiado = e.target;
        const fila = inputCambiado.closest('tr');
        if (!fila) return;

        // Disparamos el recálculo para toda la fila
        recalcularFila(fila);
    });

    // También recalculamos cuando se carga el formulario
    keyField.addEventListener('blur', function() {
        // Damos un pequeño respiro para que el DOM se actualice
        setTimeout(() => {
            form.querySelectorAll('.datatable-container tbody tr, [data-datatable-name] tbody tr').forEach(fila => {
                recalcularFila(fila);
            });
        }, 100);
    });

    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            
            // BUG CORREGIDO: Esta expresión solo busca palabras (variables), no números.
            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            
            let formulaCalculable = formula;
            let calculoPosible = true;

            variables.forEach(variable => {
                const campoVariable = fila.querySelector(`[name*="[${variable}]"]`);
                
                if (campoVariable) {
                    const valor = parseFloat(campoVariable.value) || 0;
                    // Usamos una RegExp para reemplazar todas las ocurrencias de la variable
                    formulaCalculable = formulaCalculable.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                } else {
                    // Si una variable no se encuentra, no se puede calcular
                    calculoPosible = false;
                }
            });

            if (calculoPosible) {
                try {
                    // Se eliminan caracteres que no sean parte de una fórmula segura
                    const formulaSegura = formulaCalculable.replace(/[^-()\d/*+.]/g, '');
                    const resultado = new Function(`return ${formulaSegura}`)();
                    
                    if (!isNaN(resultado) && isFinite(resultado)) {
                        campoResultado.value = resultado.toFixed(2);
                    } else {
                        campoResultado.value = ''; // O '0.00' si se prefiere
                    }
                } catch (error) {
                    console.error("Error al evaluar la fórmula:", formula, "->", formulaCalculable);
                    campoResultado.value = ''; // Limpiar si hay error
                }
            }
        });
    }
    // --- FIN: REEMPLAZO DEL MOTOR DE CÁLCULO ---

});
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

    // --- 2. MOTOR DE CÁLCULO (VERSIÓN ROBUSTA) ---
    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            // Si la fórmula es un objeto (ej: [object Object]), no intentes evaluarla
            if (!formula || formula.startsWith('{') || formula === '[object Object]') return;

            let formulaReemplazada = formula;
            let esCalculable = true;

            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            if (!variables) return;

            variables.forEach(variable => {
                const campoVariable = fila.querySelector(`[name*="[${variable}]"]`);
                if (campoVariable) {
                    const valor = parseFloat(campoVariable.value) || 0;
                    formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                } else {
                    esCalculable = false;
                }
            });

            if (esCalculable) {
                try {
                    const resultado = new Function(`return ${formulaReemplazada}`)();
                    campoResultado.value = isFinite(resultado) ? resultado.toFixed(2) : '';
                } catch (error) {
                    campoResultado.value = '';
                }
            } else {
                campoResultado.value = '';
            }
        });
    }

    function recalcularCamposSimples() {
        allFields.forEach(field => {
            if (typeof field['data-formula'] === 'string') {
                const formula = field['data-formula'];
                const input = form.querySelector(`[name="${field.name}"]`);
                if (!input) return;

                let formulaReemplazada = formula;
                let esCalculable = true;
                const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                variables.forEach(variable => {
                    const campoVariable = form.querySelector(`[name="${variable}"]`);
                    if (campoVariable) {
                        const valor = parseFloat(campoVariable.value) || 0;
                        formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                    } else {
                        esCalculable = false;
                    }
                });
                if (esCalculable) {
                    try {
                        const resultado = new Function(`return ${formulaReemplazada}`)();
                        input.value = isFinite(resultado) ? resultado.toFixed(2) : '';
                        console.log('Calculando', field.name, '=', formula, '->', formulaReemplazada, '->', input.value);
                    } catch (error) {
                        input.value = '';
                        console.error('Error al calcular', field.name, formula, error);
                    }
                } else {
                    input.value = '';
                }
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

        setTimeout(() => {
            form.querySelectorAll('.datatable-container tbody tr, [data-datatable-name] tbody tr').forEach(recalcularFila);
            recalcularCamposSimples();
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

    // EVENTO 3: Guardar datos
    form.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(form);
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=save_data`;
        fetch(url, {
            method: 'POST',
            body: formData // No pongas headers, deja que el navegador lo maneje
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                Swal.fire('Guardado', 'Los datos se han guardado correctamente.', 'success');
                fillForm(result.data);
            } else {
                Swal.fire('Error', 'Ha ocurrido un error al guardar los datos.', 'error');
            }
        })
        .catch(error => console.error('Error al guardar los datos:', error));
    });

    // EVENTO 4: Cambio en campos de texto (para fórmulas en vivo)
    form.addEventListener('input', e => {
        const fila = e.target.closest('tr');
        if (fila) {
            recalcularFila(fila);
        }
        recalcularCamposSimples();
    });

    // --- FUNCIÓN PARA LOOKUP AUTOMÁTICO ---
    function procesarLookups() {
        allFields.forEach(field => {
            if (typeof field['data-formula'] === 'object' && field['data-formula'].type === 'lookup') {
                const formula = field['data-formula'];
                const targetInput = form.querySelector(`[name="${field.name}"]`);
                if (!targetInput) return;

                // Detecta el/los campos usados en el where (ej: {ComId})
                const matches = formula.where.match(/{([^}]+)}/g) || [];
                // Ejecuta el lookup tanto al cargar como al cambiar el campo clave
                function ejecutarLookup() {
                    let where = formula.where;
                    matches.forEach(m => {
                        const n = m.replace(/[{}]/g, '');
                        const v = form.querySelector(`[name="${n}"]`)?.value || '';
                        where = where.replace(m, v);
                    });
                    fetch(`formulariodinamicologica.php?action=lookup&table=${encodeURIComponent(formula.source.table)}&field=${encodeURIComponent(formula.source.field)}&where=${encodeURIComponent(where)}`)
                        .then(r => r.json())
                        .then(result => {
                            if (result.success) {
                                targetInput.value = result.value;
                            } else {
                                targetInput.value = '';
                            }
                        });
                }
                // Ejecutar lookup al cargar
                ejecutarLookup();
                // Ejecutar lookup al cambiar el campo clave
                matches.forEach(match => {
                    const fieldName = match.replace(/[{}]/g, '');
                    const sourceInput = form.querySelector(`[name="${fieldName}"]`);
                    if (sourceInput) {
                        sourceInput.addEventListener('blur', ejecutarLookup);
                        sourceInput.addEventListener('input', ejecutarLookup);
                    }
                });
            }
        });
    }

    procesarLookups();
});
// Fin del archivo JS
<?php
ob_clean();
header('Content-Type: application/json');
// ...conexión y lógica...

if ($_GET['action'] === 'lookup') {
    // ...tu lógica de búsqueda...
    echo json_encode(['success' => true, 'value' => $valor]);
    exit;
}

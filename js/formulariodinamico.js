// Encapsulamos toda la inicialización en una función global
window.inicializarFormularioDinamico = function() {
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

    // --- 2. MOTOR DE CÁLCULO (ROBUSTO Y UNIVERSAL) ---
    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            // Si la fórmula es un objeto (ej: [object Object]), no intentes evaluarla
            if (!formula || formula.startsWith('{') || formula === '[object Object]') return;
            try {
                // Si la fórmula viene serializada como JSON, intenta parsear y descartar si es objeto
                let parsed = null;
                try { parsed = JSON.parse(formula); } catch(e){}
                if (parsed && typeof parsed === 'object') return;
            } catch(e){}
            let formulaReemplazada = formula;
            let esCalculable = true;
            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            variables.forEach(variable => {
                // Busca en la fila y en el formulario global
                let campoVariable = fila.querySelector(`[name*="[${variable}]"]`) || form.querySelector(`[name="${variable}"]`);
                if (campoVariable) {
                    let valor = parseFloat(campoVariable.value) || 0;
                    formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                } else {
                    esCalculable = false;
                }
            });
            if (esCalculable) {
                try {
                    const resultado = new Function(`return ${formulaReemplazada}`)();
                    campoResultado.value = isFinite(resultado) ? resultado : '';
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
                let formula = field['data-formula'];
                // Si la fórmula es un objeto serializado, ignorar
                try { let parsed = JSON.parse(formula); if (parsed && typeof parsed === 'object') return; } catch(e){}
                const input = form.querySelector(`[name="${field.name}"]`);
                if (!input) return;
                // DEPURACIÓN: Mostrar en consola cada campo con fórmula
                console.log('Depuración fórmula:', field.name, 'formula:', formula, 'valor actual:', input.value);
                let formulaReemplazada = formula;
                let esCalculable = true;
                const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                variables.forEach(variable => {
                    let campoVariable = form.querySelector(`[name="${variable}"]`);
                    if (campoVariable) {
                        let valor = parseFloat(campoVariable.value) || 0;
                        formulaReemplazada = formulaReemplazada.replace(new RegExp(`\\b${variable}\\b`, 'g'), valor);
                    } else {
                        esCalculable = false;
                    }
                });
                if (esCalculable) {
                    try {
                        const resultado = new Function(`return ${formulaReemplazada}`)();
                        console.log('Resultado calculado para', field.name, ':', resultado);
                        input.value = isFinite(resultado) ? resultado : '';
                    } catch (error) {
                        input.value = '';
                    }
                } else {
                    input.value = '';
                }
            }
        });
    }
    // --- NUEVO: Recalculo global de todas las filas de todas las tablas y campos simples ---
    function recalcularTodo() {
        // Recalcula todos los datatables
        document.querySelectorAll('.datatable-container tbody tr').forEach(recalcularFila);
        // Recalcula todos los campos simples
        recalcularCamposSimples();
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
        statusText.textContent = 'Modificando';
        statusText.style.color = '#d35400'; // Naranja para destacar
        // Mensaje visual destacado (opcional, puedes quitar si no quieres alert)
        if (!document.getElementById('alert-modificando')) {
            const alertDiv = document.createElement('div');
            alertDiv.id = 'alert-modificando';
            alertDiv.className = 'alert alert-warning';
            alertDiv.innerHTML = '<b>Modificando:</b> Estás editando un registro existente.';
            statusText.parentNode.insertBefore(alertDiv, statusText.nextSibling);
        }
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
            .then(result => {
                if (result.success && result.data) {
                    fillForm(result.data);
                } else {
                    limpiarFormulario(true);
                    // Mostrar mensaje visual si no se encuentra el registro
                    if (!document.getElementById('alert-no-encontrado')) {
                        const alertDiv = document.createElement('div');
                        alertDiv.id = 'alert-no-encontrado';
                        alertDiv.className = 'alert alert-info';
                        alertDiv.innerHTML = '<b>No encontrado:</b> No existe un registro con ese valor.';
                        statusText.parentNode.insertBefore(alertDiv, statusText.nextSibling);
                        setTimeout(() => {
                            if (alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
                        }, 3000);
                    }
                }
            })
            .catch(error => console.error('Error al cargar los datos:', error));
    });

    // EVENTO 2: Agregar/Eliminar filas
    form.addEventListener('click', e => {
        if (e.target.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            recalcularTodo(); // Recalcula tras eliminar fila
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
                recalcularTodo(); // Recalcula tras agregar fila
            }
        }
    });

    // EVENTO 3: Guardar datos
    form.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(form);
        // El backend espera POST sin action=save_data, solo con ?archivo=...
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}`;
        fetch(url, {
            method: 'POST',
            body: formData // No pongas headers, deja que el navegador lo maneje
        })
        .then(response => {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                // Si no es JSON, probablemente es una redirección, recarga la página
                window.location.reload();
                return null;
            }
        })
        .then(result => {
            if (!result) return;
            if (result.success) {
                if (window.validacionesJSON && window.validacionesJSON.post_envio && window.validacionesJSON.post_envio.redireccion) {
                    window.location.href = window.validacionesJSON.post_envio.redireccion;
                } else if (window.validacionesJSON && window.validacionesJSON.post_envio && window.validacionesJSON.post_envio.mostrar_resumen) {
                    Swal.fire('Resumen', '¡Formulario enviado correctamente!', 'success');
                } else {
                    Swal.fire('Guardado', 'Los datos se han guardado correctamente.', 'success');
                }
                limpiarFormulario();
            } else {
                Swal.fire('Error', 'Ha ocurrido un error al guardar los datos.', 'error');
            }
        })
        .catch(error => console.error('Error al guardar los datos:', error));
    });

    // EVENTO 4: Cambio en campos de texto (para fórmulas en vivo)
    form.addEventListener('input', e => {
        recalcularTodo(); // Recalcula todo en cada input
    });

    // Al cargar la página, recalcula todo
    window.addEventListener('DOMContentLoaded', function() {
        recalcularTodo();
        // DEPURACIÓN: Mostrar todos los campos con fórmula encontrados
        allFields.forEach(field => {
            if (typeof field['data-formula'] === 'string') {
                console.log('[Depuración] Campo con fórmula:', field.name, '->', field['data-formula']);
            }
        });
    });

    // Refuerzo: recalcular también al hacer focusout (por si hay campos que no disparan input)
    form.addEventListener('change', e => {
        recalcularTodo();
    });
    form.addEventListener('blur', e => {
        recalcularTodo();
    }, true);

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
                    let camposCompletos = true;
                    matches.forEach(m => {
                        const n = m.replace(/[{}]/g, '');
                        const v = form.querySelector(`[name="${n}"]`)?.value || '';
                        if (!v) camposCompletos = false;
                        where = where.replace(m, v);
                    });
                    if (!camposCompletos) {
                        targetInput.value = '';
                        return;
                    }
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
                // Ejecutar lookup al cargar SOLO si todos los campos requeridos existen y tienen valor
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

    // --- VALIDACIÓN POR REGEX DESDE JSON ---
    function validarCamposPorRegex(campos, validaciones) {
        let errores = [];
        const mensajeUniversal = 'Por favor, ingrese un valor válido en este campo.';
        for (const campo of campos) {
            const nombre = campo.name;
            const valor = campo.value;
            if (validaciones[nombre]) {
                const regex = new RegExp(validaciones[nombre].regex);
                if (!regex.test(valor)) {
                    errores.push({
                        campo: nombre,
                        mensaje: mensajeUniversal
                    });
                }
            }
        }
        return errores;
    }

    // --- VALIDACIÓN EN TIEMPO REAL Y FEEDBACK VISUAL UNIVERSAL ---
    function mostrarErrorCampo(input, mensaje) {
        let errorDiv = input.parentNode.querySelector('.error-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-feedback text-danger';
            input.parentNode.appendChild(errorDiv);
        }
        // Mensaje universal de error
        const mensajeUniversal = 'Por favor, ingrese un valor válido en este campo.';
        errorDiv.textContent = mensajeUniversal;
        input.classList.add('is-invalid');
        // Popup flotante universal
        if (input._swalTimeout) clearTimeout(input._swalTimeout);
        input._swalTimeout = setTimeout(() => {
            if (input.classList.contains('is-invalid')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    text: mensajeUniversal,
                    timer: 2500,
                    timerProgressBar: true,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false
                });
            }
        }, 500);
    }
    function limpiarErrorCampo(input) {
        let errorDiv = input.parentNode.querySelector('.error-feedback');
        if (errorDiv) errorDiv.textContent = '';
        input.classList.remove('is-invalid');
        if (input._swalTimeout) clearTimeout(input._swalTimeout);
    }
    function validarCampoIndividual(input, validaciones) {
        const nombre = input.name.replace(/\[.*\]$/, '');
        const valor = input.value;
        if (validaciones[nombre]) {
            const regex = new RegExp(validaciones[nombre].regex);
            if (!regex.test(valor)) {
                mostrarErrorCampo(input, validaciones[nombre].mensaje || '');
                return false;
            }
        }
        limpiarErrorCampo(input);
        return true;
    }
    // Hook para validación en tiempo real (incluye campos agregados dinámicamente)
    $(document).ready(function() {
        let validaciones = window.validacionesJSON || {};
        $(document).on('input blur', '#formulario input, #formulario textarea, #formulario select', function() {
            validarCampoIndividual(this, validaciones);
        });
    });

    // Hook al submit del formulario
    $(document).ready(function() {
        const validaciones = (window.fields && window.fields.length && window.fields[0].validaciones) ? window.fields[0].validaciones : (window.validacionesJSON || {});
        $('#formulario').on('submit', function(e) {
            // Obtener validaciones desde variable global pasada por PHP
            let validaciones = window.validacionesJSON || {};
            let campos = this.elements;
            let errores = validarCamposPorRegex(campos, validaciones);
            if (errores.length > 0) {
                e.preventDefault();
                // Mensaje universal de error para todos los campos
                const mensajeUniversal = 'Por favor, ingrese un valor válido en este campo.';
                let mensajes = errores.map(err => `<li>${mensajeUniversal}</li>`).join('');
                $('#mensaje-envio').html(`<div class='alert alert-danger'><b>Error:</b> Por favor, revise los campos marcados en rojo y corrija los datos antes de enviar el formulario.<ul>${mensajes}</ul></div>`);
                return false;
            }
        });
    });

    // --- SPINNER DE CARGA EN ENVÍO ---
    $(document).ready(function() {
        $('#formulario').on('submit', function() {
            $('#form-spinner').fadeIn(200);
        });
        // Ocultar spinner si hay error de validación
        $('#formulario').on('invalid', function() {
            $('#form-spinner').fadeOut(200);
        }, true);
    });

    // --- GUARDAR ARCHIVO PHP LLAMADOR Y LÓGICA POST-ENVÍO ---
    if (!form.querySelector('[name="archivo_llamador"]')) {
        let hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'archivo_llamador';
        hidden.value = window.location.pathname.split('/').pop();
        form.appendChild(hidden);
    }
    // La lógica post-envío ya está correctamente dentro del .then() del submit principal, no se debe duplicar aquí

};

// Autoejecutar si el DOM ya está listo (modo directo o iframe)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.inicializarFormularioDinamico);
} else {
    window.inicializarFormularioDinamico();
}
// Fin del archivo JS


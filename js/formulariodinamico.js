// Versión 2.0 - Refactorizada para mayor estabilidad y predictibilidad.
// Se elimina el uso de múltiples $(document).ready() para evitar race conditions.
// Toda la lógica del formulario se encapsula en una única función de inicialización.

window.inicializarFormularioDinamico = function() {
    // --- 1. CONFIGURACIÓN INICIAL Y VALIDACIONES PREVIAS ---
    const form = document.getElementById('formulario');
    if (!form) {
        console.error("Error crítico: No se encontró el elemento #formulario. El script no puede continuar.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const archivoJson = urlParams.get('archivo');
    // `window.fields` es la configuración de campos inyectada por PHP.
    const allFields = window.fields || [];
    const validaciones = window.validacionesJSON || {};
    const statusText = document.getElementById('form-status-text');

    if (allFields.length === 0) {
        console.warn("Advertencia: La configuración `window.fields` está vacía. El formulario no tendrá campos dinámicos.");
        // No retornamos, para permitir que un formulario estático aún funcione.
    }

    const firstFieldConfig = allFields.length > 0 ? allFields[0] : null;
    const keyField = firstFieldConfig ? form.querySelector(`[name="${firstFieldConfig.name}"]`) : null;

    if (!keyField) {
        console.warn("Advertencia: No se encontró el campo clave del formulario.");
    }

    // --- 2. MOTOR DE CÁLCULO (ROBUSTO Y UNIVERSAL) ---
    function recalcularFila(fila) {
        const camposConFormula = fila.querySelectorAll('[data-formula]');
        camposConFormula.forEach(campoResultado => {
            let formula = campoResultado.getAttribute('data-formula');
            if (!formula || typeof formula !== 'string' || formula.startsWith('{')) return;

            let formulaReemplazada = formula;
            let esCalculable = true;
            const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];

            variables.forEach(variable => {
                const campoVariable = fila.querySelector(`[name*="[${variable}]"]`) || form.querySelector(`[name="${variable}"]`);
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
                    } catch (error) {
                        input.value = '';
                    }
                } else {
                    input.value = '';
                }
            }
        });
    }

    function recalcularTodo() {
        document.querySelectorAll('.datatable-container tbody tr').forEach(recalcularFila);
        recalcularCamposSimples();
    }

    // --- 3. FUNCIONES DE MANIPULACIÓN DEL FORMULARIO ---
    function fillForm(data) {
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => tbody.innerHTML = '');

        allFields.forEach(field => {
            const fieldName = field.name;
            const value = data[fieldName];
            const elements = form.querySelectorAll(`[name="${fieldName}"], [name="${fieldName}[]"]`);

            if (!elements.length) return;

            switch (field.type) {
                case 'checkbox':
                case 'radio':
                    if (field.options) {
                        const savedValues = Array.isArray(value) ? value : [];
                        elements.forEach(el => el.checked = savedValues.includes(el.value));
                    } else {
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
                    elements[0].value = value || '';
                    break;
            }
        });

        if (statusText) {
            statusText.textContent = 'Modificando';
            statusText.style.color = '#d35400';
        }
        recalcularTodo();
    }

    function limpiarFormulario(mantenerClave = false) {
        const valorClave = keyField ? keyField.value : '';
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => tbody.innerHTML = '');
        if (mantenerClave && keyField) keyField.value = valorClave;
        if (statusText) statusText.textContent = 'Nuevo';
        recalcularTodo();
    }

    // --- 4. INICIALIZACIÓN DE COMPONENTES ESPECIALES ---

    function inicializarSelect2() {
        console.log('[Select2] Iniciando inicialización de campos .select2-field');
        if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
            console.error('Error crítico: jQuery o Select2 no están cargados. No se pueden inicializar los campos.');
            return;
        }

        $('.select2-field').each(function() {
            const $this = $(this);
            const fieldName = $this.attr('name').replace(/\[\]$/, '');
            const fieldConfig = allFields.find(f => f.name === fieldName);

            console.log(`[Select2] Procesando campo: ${fieldName}`);

            if (!fieldConfig) {
                console.warn(`[Select2] No se encontró configuración para el campo "${fieldName}". Se inicializará sin AJAX.`);
            }

            let ajaxConfig = null;
            if (fieldConfig && fieldConfig.data && fieldConfig.data.tabla) {
                console.log(`[Select2] Configurando AJAX para ${fieldName} con tabla ${fieldConfig.data.tabla}`);
                ajaxConfig = {
                    url: 'ajax/busqueda_select2.php',
                    dataType: 'json',
                    delay: 250,
                    data: function(params) {
                        return {
                            q: params.term,
                            tabla: fieldConfig.data.tabla,
                            campo: fieldConfig.data.campo,
                            filtro: fieldConfig.data.filtro || '1=1'
                        };
                    },
                    processResults: function(data) {
                        // El backend ya debe devolver { results: [...] }
                        return data;
                    },
                    cache: true
                };
            }

            $this.select2({
                theme: "bootstrap",
                placeholder: $this.attr('placeholder') || 'Seleccione una opción',
                allowClear: true,
                ajax: ajaxConfig, // Será null si no hay config, deshabilitando AJAX
                language: "es"
            });
        });
        console.log('[Select2] Inicialización completada.');
    }

    function procesarLookups() {
        allFields.forEach(field => {
            if (typeof field['data-formula'] === 'object' && field['data-formula'].type === 'lookup') {
                const formula = field['data-formula'];
                const targetInput = form.querySelector(`[name="${field.name}"]`);
                if (!targetInput) return;

                const matches = formula.where.match(/{([^}]+)}/g) || [];
                
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
                            targetInput.value = result.success ? result.value : '';
                        });
                }

                matches.forEach(match => {
                    const fieldName = match.replace(/[{}]/g, '');
                    const sourceInput = form.querySelector(`[name="${fieldName}"]`);
                    if (sourceInput) {
                        sourceInput.addEventListener('blur', ejecutarLookup);
                    }
                });
            }
        });
    }

    // --- 5. VALIDACIÓN EN TIEMPO REAL ---
    function mostrarErrorCampo(input, mensaje) {
        const universalMessage = 'Valor inválido.';
        let errorDiv = input.parentNode.querySelector('.error-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-feedback text-danger';
            input.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = universalMessage;
        input.classList.add('is-invalid');
    }

    function limpiarErrorCampo(input) {
        let errorDiv = input.parentNode.querySelector('.error-feedback');
        if (errorDiv) errorDiv.textContent = '';
        input.classList.remove('is-invalid');
    }

    function validarCampoIndividual(input) {
        const nombre = input.name.replace(/\[.*\]$/, '');
        if (validaciones[nombre]) {
            const regex = new RegExp(validaciones[nombre].regex);
            if (!regex.test(input.value)) {
                mostrarErrorCampo(input, validaciones[nombre].mensaje);
                return false;
            }
        }
        limpiarErrorCampo(input);
        return true;
    }

    // --- 6. ASIGNACIÓN DE EVENTOS ---
    
    // Evento para cargar datos al cambiar el campo clave
    if (keyField) {
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
                    }
                })
                .catch(error => console.error('Error al cargar los datos:', error));
        });
    }

    // Eventos de clicks en todo el formulario (delegados)
    form.addEventListener('click', e => {
        // Eliminar fila de un datatable
        if (e.target.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            recalcularTodo();
        }
        // Agregar fila a un datatable
        if (e.target.id.startsWith('btn-add-row-')) {
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
                recalcularFila(newRow);
            }
        }
    });

    // Evento para recalcular fórmulas y validar en tiempo real
    form.addEventListener('input', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            recalcularTodo();
            validarCampoIndividual(e.target);
        }
    });

    // Evento de envío del formulario
    form.addEventListener('submit', e => {
        e.preventDefault();
        
        // Validación final
        let esValido = true;
        form.querySelectorAll('input, textarea, select').forEach(input => {
            if (!validarCampoIndividual(input)) {
                esValido = false;
            }
        });

        if (!esValido) {
            Swal.fire('Error de Validación', 'Por favor, revise los campos marcados en rojo.', 'error');
            return;
        }

        // Spinner y envío
        const spinner = document.getElementById('form-spinner');
        if (spinner) spinner.style.display = 'block';

        const formData = new FormData(form);
        const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}`;

        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            if (spinner) spinner.style.display = 'none';
            if (result.success) {
                Swal.fire('Guardado', 'Los datos se han guardado correctamente.', 'success');
                limpiarFormulario();
            } else {
                Swal.fire('Error', result.message || 'Ha ocurrido un error al guardar los datos.', 'error');
            }
        })
        .catch(error => {
            if (spinner) spinner.style.display = 'none';
            console.error('Error en el envío:', error);
            Swal.fire('Error de Conexión', 'No se pudo comunicar con el servidor.', 'error');
        });
    });

    // --- 7. EJECUCIÓN INICIAL ---
    
    // Añadir campo oculto con el nombre del archivo llamador si no existe
    if (!form.querySelector('[name="archivo_llamador"]')) {
        let hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'archivo_llamador';
        hidden.value = window.location.pathname.split('/').pop();
        form.appendChild(hidden);
    }

    // Inicializar todos los componentes y cálculos
    procesarLookups();
    inicializarSelect2();
    recalcularTodo();

    console.log("Formulario dinámico inicializado correctamente.");
};

// --- PUNTO DE ENTRADA ---
// Se asegura de que el DOM esté listo antes de ejecutar el script.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.inicializarFormularioDinamico);
} else {
    // El DOM ya está listo
    window.inicializarFormularioDinamico();
}


// --- MODO DISEÑO: Hacer etiquetas editables y sincronizar con JSON ---
$(document).ready(function() {
    function toggleEditableLabels(isDesignMode) {
        $('.editable-label').each(function() {
            if (isDesignMode) {
                $(this).attr('contenteditable', 'true');
                $(this).addClass('editable-label-active');
            } else {
                $(this).attr('contenteditable', 'false');
                $(this).removeClass('editable-label-active');
            }
        });
        // Mostrar/ocultar elementos solo de diseño
        if (isDesignMode) {
            $('.solo-modo-diseno').show();
        } else {
            $('.solo-modo-diseno').hide();
        }
    }

    // Detectar cambio de modo diseño
    $('#designModeToggle').on('change', function() {
        toggleEditableLabels(this.checked);
    });
    // Inicializar según el estado inicial
    toggleEditableLabels($('#designModeToggle').is(':checked'));

    // Guardar cambios de etiquetas en el JSON en memoria
    $(document).on('blur', '.editable-label[contenteditable="true"]', function() {
        var $el = $(this);
        var newText = $el.text().trim();
        // Determinar el tipo de elemento editable
        if ($el.data('edit-type') === 'tab') {
            // Actualizar el título de la pestaña en el JSON (requiere lógica extra si hay tabs en el JSON global)
            // Aquí deberías actualizar el objeto JSON correspondiente
        } else if ($el.data('edit-type') === 'fieldset') {
            // Actualizar el título del fieldset en el JSON
        } else if ($el.closest('label').length > 0) {
            // Es una etiqueta de campo
            // Actualizar el campo correspondiente en el JSON
        }
        // Marcar el formulario como modificado (puedes agregar lógica extra aquí)
    });
});
// *** CAMBIO REALIZADO: El script ahora se envuelve en una función para ser llamado explícitamente ***
// No se auto-ejecuta, permitiendo que `formulariodinamico.php` decida cuándo inicializar la lógica.
function inicializarFormularioDinamico(config) {
    console.log("Inicializando lógica del formulario normal...");
    // --- 1. CONFIGURACIÓN INICIAL Y VALIDACIONES PREVIAS ---
    const form = document.getElementById('formulariodinamico'); // ID del formulario principal
    if (!form) {
        console.error("Error crítico: No se encontró el elemento #formulariodinamico. El script no puede continuar.");
        return;
    }

    const archivoJson = config.archivo_json;
    // *** CAMBIO REALIZADO: Se obtiene la configuración de campos desde una variable global inyectada por PHP ***
    // Esta variable `window.fieldsConfig` debe ser creada en `formulariodinamicologica.php`.
    const allFields = window.fieldsConfig || []; 
    const validaciones = window.validacionesJSON || {};
    const statusText = document.getElementById('form-status-text');

    if (allFields.length === 0) {
        console.warn("Advertencia: La configuración `window.fieldsConfig` está vacía. El formulario no tendrá campos dinámicos.");
    }

    // *** CAMBIO REALIZADO: Búsqueda del campo clave (PK) más robusta ***
    const firstFieldConfig = allFields.length > 0 ? allFields.find(f => f.es_pk) : null;
    const keyField = firstFieldConfig ? form.querySelector(`[name="${firstFieldConfig.nombre}"]`) : null;

    if (!keyField) {
        console.warn("Advertencia: No se encontró un campo definido como clave primaria (es_pk) en el JSON.");
    }

    // --- 2. MOTOR DE CÁLCULO (SIN CAMBIOS, PERO VERIFICADO) ---
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
                const input = form.querySelector(`[name="${field.nombre}"]`);
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

    // --- 3. FUNCIONES DE MANIPULACIÓN DEL FORMULARIO (CON AJUSTES) ---
    function fillForm(data) {
        form.reset();
        document.querySelectorAll('.datatable-container tbody, [data-datatable-name] tbody').forEach(tbody => tbody.innerHTML = '');

        allFields.forEach(field => {
            // *** CAMBIO REALIZADO: Se usa `field.nombre` y `field.tipo` para alinear con el JSON ***
            const fieldName = field.nombre;
            const value = data[fieldName];
            const elements = form.querySelectorAll(`[name="${fieldName}"], [name="${fieldName}[]"]`);

            if (!elements.length) return;

            switch (field.tipo) {
                case 'checkbox':
                case 'radio':
                    if (field.opciones) {
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
                            // *** CAMBIO REALIZADO: Se usa `field.columnas` ***
                            field.columnas.forEach(col => {
                                const cell = newRow.insertCell();
                                const input = document.createElement('input');
                                Object.assign(input, {
                                    type: col.tipo || 'text',
                                    name: `${fieldName}[${rowIndex}][${col.nombre}]`,
                                    className: 'form-control form-control-sm',
                                    value: rowData[col.nombre] || '',
                                    placeholder: col.placeholder || ''
                                });
                                if (col.solo_lectura) input.readOnly = true;
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

    // --- 4. INICIALIZACIÓN DE COMPONENTES ESPECIALES (CON AJUSTES) ---

    function inicializarSelect2() {
        console.log('[Select2] Iniciando inicialización de campos select');
        if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
            console.error('Error crítico: jQuery o Select2 no están cargados.');
            return;
        }

        $('select.form-control').each(function() {
            const $this = $(this);
            const fieldName = $this.attr('name').replace(/\[\]$/, '');
            const fieldConfig = allFields.find(f => f.nombre === fieldName);

            console.log(`[Select2] Procesando campo: ${fieldName}`);

            if (!fieldConfig) {
                console.warn(`[Select2] No se encontró config para "${fieldName}".`);
            }

            let ajaxConfig = null;
            // *** CAMBIO REALIZADO: Se ajusta a la estructura `origen_datos` del JSON ***
            if (fieldConfig && fieldConfig.origen_datos && fieldConfig.origen_datos.tabla) {
                console.log(`[Select2] Configurando AJAX para ${fieldName} con tabla ${fieldConfig.origen_datos.tabla}`);
                ajaxConfig = {
                    url: 'ajax/busqueda_formula.php', // URL del backend para búsquedas
                    dataType: 'json',
                    delay: 250,
                    data: function(params) {
                        return {
                            q: params.term,
                            tabla: fieldConfig.origen_datos.tabla,
                            campo_valor: fieldConfig.origen_datos.campo_valor,
                            campo_etiqueta: fieldConfig.origen_datos.campo_etiqueta,
                            filtro: fieldConfig.origen_datos.filtro || '1=1'
                        };
                    },
                    processResults: function(data) {
                        return {
                            results: data.items // Se espera que el backend devuelva un objeto con una clave `items`
                        };
                    },
                    cache: true
                };
            }

            $this.select2({
                width: '100%',
                placeholder: $this.attr('placeholder') || 'Seleccione una opción',
                allowClear: true,
                ajax: ajaxConfig,
                language: "es"
            });
        });
        console.log('[Select2] Inicialización completada.');
    }

    function procesarLookups() {
        allFields.forEach(field => {
            if (typeof field['data-formula'] === 'object' && field['data-formula'].type === 'lookup') {
                const formula = field['data-formula'];
                const targetInput = form.querySelector(`[name="${field.nombre}"]`);
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

    // --- 5. VALIDACIÓN EN TIEMPO REAL (SIN CAMBIOS) ---
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

    // --- 6. ASIGNACIÓN DE EVENTOS (CON AJUSTES) ---
    
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
            const fieldConfig = allFields.find(f => f.nombre === tableId);
            if (tableBody && fieldConfig) {
                const newIndex = tableBody.rows.length;
                const newRow = tableBody.insertRow();
                // *** CAMBIO REALIZADO: Se usa `fieldConfig.columnas` ***
                fieldConfig.columnas.forEach(col => {
                    const cell = newRow.insertCell();
                    const input = document.createElement('input');
                    Object.assign(input, {
                        type: col.tipo || 'text',
                        name: `${tableId}[${newIndex}][${col.nombre}]`,
                        className: 'form-control form-control-sm',
                        placeholder: col.placeholder || ''
                    });
                    if (col.solo_lectura) input.readOnly = true;
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

    // Evento de envío del formulario (sin cambios)
    form.addEventListener('submit', e => {
        e.preventDefault();
        
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
}

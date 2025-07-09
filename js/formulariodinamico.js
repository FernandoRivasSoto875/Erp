/**
 * Formulario Dinámico - Versión Final Unificada
 * Este archivo contiene toda la lógica para el funcionamiento del formulario,
 * eliminando duplicados y conflictos.
 */
document.addEventListener('DOMContentLoaded', function() {

    // ===================== FUNCIONES AUXILIARES =====================

    /**
     * Muestra los nombres de los archivos seleccionados en un input de tipo 'file'.
     */
    function mostrarArchivosSeleccionados(input) {
        const fileListDiv = document.getElementById('filelist_' + input.name.replace('[]', ''));
        if (!fileListDiv) return;
        fileListDiv.innerHTML = '';
        if (input.files && input.files.length > 0) {
            const ul = document.createElement('ul');
            Array.from(input.files).forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.name;
                ul.appendChild(li);
            });
            fileListDiv.appendChild(ul);
        }
    }

    /**
     * Limpia todos los campos de un formulario.
     */
    function limpiarCamposFormulario(form) {
        Array.from(form.elements).forEach(field => {
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = false;
            } else if (field.type === "file") {
                field.value = '';
                const previewDiv = document.getElementById('filelist_' + field.name.replace('[]', ''));
                if (previewDiv) previewDiv.innerHTML = '';
            } else if (field.tagName === "SELECT") {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
        });
        // Limpia también los datatables
        document.querySelectorAll('table.datatable-container tbody').forEach(tbody => {
            tbody.innerHTML = '';
        });
    }

    // ===================== LÓGICA DE CÁLCULO DE FÓRMULAS (ÚNICA Y CENTRALIZADA) =====================

    /**
     * Calcula todas las fórmulas dentro de un contexto dado (una fila de tabla o todo el formulario).
     * @param {HTMLElement} context - El elemento (<tr> o <form>) dentro del cual buscar y calcular fórmulas.
     */
    function calcularFormulas(context) {
        const formulasEnContexto = context.querySelectorAll('[data-formula]');
        if (formulasEnContexto.length === 0) return;

        const ambitoBusqueda = context.tagName === 'TR' ? context : document.getElementById('formulario');
        const valores = {};

        ambitoBusqueda.querySelectorAll('input, select, textarea').forEach(input => {
            const nombre = input.name.match(/\[(\w+)\]$/)?.[1] || input.name;
            if (nombre) {
                valores[nombre] = input.value;
            }
        });

        formulasEnContexto.forEach(campoFormula => {
            const formulaAttr = campoFormula.getAttribute('data-formula');
            try {
                let expr = formulaAttr;
                Object.keys(valores).forEach(key => {
                    const regex = new RegExp(`\\b${key}\\b`, 'g');
                    if (expr.match(regex)) {
                        const valor = parseFloat(String(valores[key]).replace(/,/g, '.')) || 0;
                        expr = expr.replace(regex, valor);
                    }
                });

                if (!/[a-zA-Z]/.test(expr)) {
                    const resultado = eval(expr);
                    if (Number.isFinite(resultado)) {
                        campoFormula.value = resultado.toFixed(2);
                    }
                }
            } catch (e) {
                try {
                    const formulaObj = JSON.parse(formulaAttr.replace(/'/g, '"'));
                    if (formulaObj.type === 'lookup') {
                        let whereFinal = formulaObj.where;
                        const placeholders = whereFinal.match(/\{(.+?)\}/g) || [];
                        let canExecute = true;
                        placeholders.forEach(ph => {
                            const fieldName = ph.replace(/[{}]/g, '');
                            const valor = valores[fieldName] || '';
                            if (valor === '') canExecute = false;
                            whereFinal = whereFinal.replace(ph, `'${valor}'`);
                        });

                        if (canExecute) {
                            fetch('ajax/busqueda_formula.php', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ tabla: formulaObj.source.table, campo: formulaObj.source.field, where: whereFinal })
                            })
                            .then(r => r.ok ? r.json() : Promise.resolve({resultado: ''}))
                            .then(data => { campoFormula.value = data.resultado ?? ''; })
                            .catch(() => { campoFormula.value = ''; });
                        } else {
                            campoFormula.value = '';
                        }
                    }
                } catch (jsonError) { /* No es ni matemática ni JSON válido */ }
            }
        });
    }

    // ===================== PUNTO DE ENTRADA PRINCIPAL =====================

    /**
     * Inicializa toda la lógica del formulario. Se llama una sola vez.
     */
    function inicializarFormulario() {
        const formulario = document.getElementById('formulario');
        if (!formulario) return;

        // --- 1. Lógica para DataTable ---
        document.querySelectorAll('table.datatable-container').forEach(table => {
            const tbody = table.querySelector('tbody');
            const fieldName = table.id;

            tbody.querySelectorAll('tr').forEach(row => calcularFormulas(row));

            document.getElementById(`btn-add-row-${fieldName}`)?.addEventListener('click', function() {
                const formField = window.fields?.find(f => f.name === fieldName);
                if (!formField || !formField.columns) return;

                const newRow = tbody.insertRow();
                const rowIndex = tbody.rows.length - 1;

                formField.columns.forEach(col => {
                    const cell = newRow.insertCell();
                    const input = document.createElement('input');
                    input.type = col.type || 'text';
                    input.name = `${fieldName}[${rowIndex}][${col.name}]`;
                    input.className = 'form-control';
                    if (col.placeholder) input.placeholder = col.placeholder;
                    if (col.readonly) input.readOnly = true;
                    if (col['data-formula']) {
                        const formula = col['data-formula'];
                        input.setAttribute('data-formula', typeof formula === 'object' ? JSON.stringify(formula) : formula);
                    }
                    cell.appendChild(input);
                });

                const actionCell = newRow.insertCell();
                actionCell.innerHTML = `<button type="button" class="eliminar_fila btn btn-danger btn-sm">Eliminar</button>`;
            });
        });

        // --- 2. Lógica de Cálculo Global y Eventos ---
        formulario.addEventListener('input', function(e) {
            const fila = e.target.closest('tr');
            if (fila) {
                calcularFormulas(fila);
            }
            calcularFormulas(formulario); // Recalcula siempre todo para totales generales
        });

        formulario.addEventListener('click', function(e) {
            if (e.target?.classList.contains('eliminar_fila')) {
                e.target.closest('tr').remove();
                calcularFormulas(formulario);
            }
        });
        
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', () => mostrarArchivosSeleccionados(input));
        });

        // --- 3. Envío del Formulario ---
        formulario.addEventListener("submit", function(event) {
            event.preventDefault();
            const formData = new FormData(this);
            const nombreArchivo = this.getAttribute("data-archivo");
            fetch(`formulariodinamico.php?archivo=${nombreArchivo}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data;
                const nuevoMensaje = tempDiv.querySelector('#mensaje-envio');
                const mensajeContenedor = document.getElementById('mensaje-envio');
                if (nuevoMensaje && mensajeContenedor) {
                    mensajeContenedor.innerHTML = nuevoMensaje.innerHTML;
                    mensajeContenedor.className = nuevoMensaje.className;
                    if (window.LIMPIAR_FORMULARIO && nuevoMensaje.classList.contains('exito')) {
                        limpiarCamposFormulario(this);
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }

    inicializarFormulario();
});
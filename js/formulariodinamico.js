/**
 * Formulario Dinámico - Versión Final Unificada
 * Soporta cálculos y búsquedas que pueden usar CUALQUIER campo del formulario,
 * tanto dentro como fuera de los DataTables.
 */
document.addEventListener('DOMContentLoaded', function() {

    // --- INICIO: MODIFICACIÓN ---
    // Crear una copia profunda de la configuración para poder manipularla sin afectar el original.
    const fieldsConfig = JSON.parse(JSON.stringify(window.fields || []));
    // --- FIN: MODIFICACIÓN ---

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

    // Usar la copia 'fieldsConfig' en lugar de 'window.fields' para la lógica inicial.
    const firstField = fieldsConfig.length > 0 ? fieldsConfig[0] : null;

    let isCalculating = false;
    let debounceTimer;

    async function recalculateAll() {
        const allPromises = [];

        // --- PASO 1: RECOLECTAR TODOS LOS VALORES Y EJECUTAR TODAS LAS BÚSQUEDAS ---

        // Obtener todos los valores del formulario una sola vez al inicio.
        const allFormValues = new FormData(formulario);
        const globalValues = Object.fromEntries(allFormValues.entries());

        // Procesar todas las búsquedas (lookups) de una sola vez.
        formulario.querySelectorAll('[data-formula*="lookup"]').forEach(field => {
            let context = globalValues;
            const row = field.closest('tr');

            // Si el campo está en una fila, crear un contexto combinado para esa fila.
            if (row) {
                const rowValues = {};
                row.querySelectorAll('input, select, textarea').forEach(input => {
                    const name = input.name.match(/\[(\w+)\]$/)?.[1];
                    if (name) rowValues[name] = input.value;
                });
                context = { ...globalValues, ...rowValues }; // <-- CLAVE: Unifica el contexto
            }

            try {
                const formulaObj = JSON.parse(field.getAttribute('data-formula'));
                let whereClause = formulaObj.where;
                const placeholders = whereClause.match(/\{(.+?)\}/g) || [];
                let isReady = true;

                placeholders.forEach(ph => {
                    const fieldName = ph.replace(/[{}]/g, '');
                    const value = context[fieldName]; // Busca en el contexto unificado
                    if (value === null || value === '' || value === undefined) {
                        isReady = false;
                    }
                    whereClause = whereClause.replace(ph, `'${value}'`);
                });

                if (isReady) {
                    const promise = fetch('ajax/busqueda_formula.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tabla: formulaObj.source.table, campo: formulaObj.source.field, where: whereClause })
                    })
                    .then(r => r.ok ? r.json() : { resultado: '' })
                    .then(data => { field.value = data.resultado || 'no encontrado'; });
                    allPromises.push(promise);
                } else {
                    field.value = '';
                }
            } catch (e) { /* Ignorar */ }
        });

        // Esperar a que TODAS las búsquedas terminen.
        await Promise.all(allPromises);

        // --- PASO 2: EJECUTAR TODOS LOS CÁLCULOS MATEMÁTICOS ---
        // Se ejecuta después de que las búsquedas hayan actualizado los valores.

        const finalFormValues = new FormData(formulario);
        const finalGlobalValues = Object.fromEntries(finalFormValues.entries());

        // Cálculos dentro de DataTables
        document.querySelectorAll('table.datatable-container tbody tr').forEach(row => {
            const rowValues = {};
            row.querySelectorAll('input, select, textarea').forEach(input => {
                const name = input.name.match(/\[(\w+)\]$/)?.[1];
                if (name) rowValues[name] = input.value;
            });
            const context = { ...finalGlobalValues, ...rowValues }; // Contexto unificado

            row.querySelectorAll('[data-formula]').forEach(fieldInRow => {
                const formulaStr = fieldInRow.getAttribute('data-formula');
                if (formulaStr.includes('lookup')) return; // Ya se procesaron

                let expr = formulaStr;
                try {
                    Object.keys(context).forEach(key => {
                        const value = parseFloat(context[key]) || 0;
                        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                    });
                    const result = eval(expr);
                    if (Number.isFinite(result)) fieldInRow.value = result.toFixed(2);
                } catch (e) { /* Ignorar */ }
            });
        });

        // Cálculos globales y de agregación (SUM)
        formulario.querySelectorAll('[data-formula]').forEach(field => {
            if (field.closest('table.datatable-container')) return; // Ya procesados
            const formulaStr = field.getAttribute('data-formula');
            if (formulaStr.includes('lookup')) return; // Ya procesados

            let expr = formulaStr;
            try {
                // Lógica para SUM(items[][subtotal])
                const sumMatch = expr.match(/SUM\(([^[]+)\[\]\[([^\]]+)\]\)/);
                if (sumMatch) {
                    const datatableName = sumMatch[1];
                    const fieldToSum = sumMatch[2];
                    const sumValues = finalFormValues.getAll(`${datatableName}[][${fieldToSum}]`);
                    const totalSum = sumValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                    expr = expr.replace(sumMatch[0], totalSum);
                }

                Object.keys(finalGlobalValues).forEach(key => {
                    const value = parseFloat(finalGlobalValues[key]) || 0;
                    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                });

                const result = eval(expr);
                if (Number.isFinite(result)) field.value = result.toFixed(2);
            } catch (e) { /* Ignorar */ }
        });
    }

    const handleRecalculate = async () => {
        if (isCalculating) return;
        isCalculating = true;
        try {
            await recalculateAll();
        } catch (error) {
            console.error("Error durante el recálculo:", error);
        } finally {
            isCalculating = false;
        }
    };

    formulario.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleRecalculate, 300);
    });

    formulario.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            handleRecalculate();
        }
    });

    // Lógica para agregar filas (sin cambios)
    document.querySelectorAll('table.datatable-container').forEach(table => {
        document.getElementById(`btn-add-row-${table.id}`)?.addEventListener('click', function() {
            const tbody = table.querySelector('tbody');
            const formField = window.fields?.find(f => f.name === table.id);
            if (!formField || !formField.columns) return;
            const newRow = tbody.insertRow();
            const rowIndex = tbody.rows.length - 1;
            formField.columns.forEach(col => {
                const cell = newRow.insertCell();
                const input = document.createElement('input');
                input.type = col.type || 'text';
                input.name = `${table.id}[${rowIndex}][${col.name}]`;
                if (col.placeholder) input.placeholder = col.placeholder;
                if (col.readonly) input.readOnly = true;
                if (col['data-formula']) input.setAttribute('data-formula', col['data-formula']);
                cell.appendChild(input);
            });
            const actionCell = newRow.insertCell();
            actionCell.innerHTML = `<button type="button" class="eliminar_fila btn btn-danger btn-sm">Eliminar</button>`;
        });
    });

    handleRecalculate();
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
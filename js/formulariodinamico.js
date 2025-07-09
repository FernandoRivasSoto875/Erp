/**
 * Formulario Dinámico - Versión Final Definitiva
 * Lógica de eventos optimizada para un rendimiento y estabilidad máximos.
 */
document.addEventListener('DOMContentLoaded', function() {

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

    /**
     * Recolecta todos los valores de un ámbito de búsqueda (form o tr).
     * @param {HTMLElement} scope - El elemento (<tr> o <form>) del cual extraer valores.
     * @returns {Object} - Un objeto con los nombres y valores de los campos.
     */
    function getValuesFromScope(scope) {
        const values = {};
        scope.querySelectorAll('input, select, textarea').forEach(input => {
            const name = input.name.match(/\[(\w+)\]$/)?.[1] || input.name;
            if (name) {
                values[name] = input.value;
            }
        });
        return values;
    }

    /**
     * Calcula todas las fórmulas dentro de un contexto dado.
     * @param {HTMLElement} context - El elemento (<tr> o <form>) que contiene los campos a calcular.
     */
    function calculateFormulasInContext(context) {
        const formulasToCalculate = context.querySelectorAll('[data-formula]');
        if (formulasToCalculate.length === 0) return;

        // Si el contexto es una fila, los valores se sacan de la fila. Si no, de todo el form.
        const values = getValuesFromScope(context.tagName === 'TR' ? context : formulario);

        formulasToCalculate.forEach(field => {
            const formulaAttr = field.getAttribute('data-formula');
            try {
                let expr = formulaAttr;
                let isReady = true;

                // Reemplaza las variables en la fórmula con sus valores.
                const variables = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                variables.forEach(variable => {
                    if (values.hasOwnProperty(variable)) {
                        const value = parseFloat(String(values[variable]).replace(/,/g, '.')) || 0;
                        expr = expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), value);
                    } else {
                        isReady = false; // Si falta una variable, no se puede calcular.
                    }
                });

                if (isReady && !/[a-zA-Z]/.test(expr)) {
                    const result = eval(expr);
                    if (Number.isFinite(result)) {
                        field.value = result.toFixed(2);
                    }
                }
            } catch (e) {
                // Manejo de fórmulas no matemáticas (como lookups) si es necesario.
                // Por ahora, se ignora el error para no detener la ejecución.
            }
        });
    }

    /**
     * Recalcula todas las fórmulas del formulario que no están en un datatable.
     */
    function calculateGlobalFormulas() {
        calculateFormulasInContext(formulario);
    }

    // --- Lógica de Inicialización ---

    // 1. Inicializar DataTables
    document.querySelectorAll('table.datatable-container').forEach(table => {
        const tbody = table.querySelector('tbody');
        const fieldName = table.id;

        // Cálculo inicial para filas existentes
        tbody.querySelectorAll('tr').forEach(row => calculateFormulasInContext(row));

        // Botón "Agregar Fila"
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
                    input.setAttribute('data-formula', col['data-formula']);
                }
                cell.appendChild(input);
            });

            const actionCell = newRow.insertCell();
            actionCell.innerHTML = `<button type="button" class="eliminar_fila btn btn-danger btn-sm">Eliminar</button>`;
        });
    });

    // 2. Lógica de Eventos Optimizada
    formulario.addEventListener('input', function(e) {
        const target = e.target;
        const row = target.closest('tr');

        if (row) {
            // Si el cambio fue en una fila, calcula solo esa fila.
            calculateFormulasInContext(row);
        }
        // Siempre recalcula las fórmulas globales por si dependen de la tabla.
        calculateGlobalFormulas();
    });

    formulario.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            // Después de eliminar, recalcula las fórmulas globales.
            calculateGlobalFormulas();
        }
    });

    // 3. Cálculo Inicial Global
    calculateGlobalFormulas();
});
 /**
 * Formulario Dinámico - Versión Final Estable
 * Reescrito para eliminar conflictos de contexto y asegurar un orden de cálculo correcto.
 * Autor: GitHub Copilot (verificado y corregido)
 */
document.addEventListener('DOMContentLoaded', function() {

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

    /**
     * Recolecta todos los valores de un ámbito de búsqueda (form, tr, etc.).
     * @param {HTMLElement} scope - El elemento del cual extraer valores.
     * @returns {Object} - Un objeto con los nombres y valores de los campos.
     */
    function getValuesFromScope(scope) {
        const values = {};
        scope.querySelectorAll('input, select, textarea').forEach(input => {
            // Para datatables, usa el nombre corto (ej: 'cantidad'). Para otros, el nombre completo.
            const name = input.name.match(/\[(\w+)\]$/)?.[1] || input.name;
            if (name) {
                // Para campos con el mismo nombre (ej: subtotales), crea un array
                if (values.hasOwnProperty(name)) {
                    if (!Array.isArray(values[name])) {
                        values[name] = [values[name]];
                    }
                    values[name].push(input.value);
                } else {
                    values[name] = input.value;
                }
            }
        });
        return values;
    }

    /**
     * Procesa una única fórmula (matemática o de búsqueda).
     * @param {HTMLElement} field - El campo del formulario a calcular.
     * @param {Object} values - El conjunto de valores disponibles para el cálculo.
     */
    function processSingleFormula(field, values) {
        const formulaAttr = field.getAttribute('data-formula');

        // 1. INTENTAR PROCESAR COMO BÚSQUEDA (LOOKUP)
        try {
            const formulaObj = JSON.parse(formulaAttr);
            if (formulaObj.type === 'lookup') {
                let whereClause = formulaObj.where;
                const placeholders = whereClause.match(/\{(.+?)\}/g) || [];
                let isReady = true;

                placeholders.forEach(ph => {
                    const fieldName = ph.replace(/[{}]/g, '');
                    const value = values[fieldName];
                    if (value === undefined || value === '') isReady = false;
                    whereClause = whereClause.replace(ph, value);
                });

                if (isReady) {
                    fetch('ajax/busqueda_formula.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tabla: formulaObj.source.table, campo: formulaObj.source.field, where: whereClause })
                    })
                    .then(r => r.ok ? r.json() : Promise.resolve({ resultado: '' }))
                    .then(data => { field.value = data.resultado ?? ''; })
                    .catch(() => { field.value = ''; });
                } else {
                    field.value = '';
                }
                return; // Es un lookup, no continuar.
            }
        } catch (e) { /* No es JSON, continuar al siguiente paso. */ }

        // 2. PROCESAR COMO FÓRMULA MATEMÁTICA
        try {
            let expr = formulaAttr;
            
            // Manejar funciones de agregación como SUM
            const sumMatch = expr.match(/SUM\((.+?)\)/);
            if (sumMatch) {
                const fieldToSum = sumMatch[1];
                const sumValues = Array.isArray(values[fieldToSum]) ? values[fieldToSum] : [0];
                const totalSum = sumValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                expr = expr.replace(sumMatch[0], totalSum);
            }

            // Reemplazar variables simples
            const variables = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            variables.forEach(variable => {
                if (values.hasOwnProperty(variable)) {
                    const value = parseFloat(String(values[variable]).replace(/,/g, '.')) || 0;
                    expr = expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), value);
                }
            });

            if (!/[a-zA-Z]/.test(expr)) {
                const result = eval(expr);
                if (Number.isFinite(result)) {
                    field.value = result.toFixed(2);
                }
            }
        } catch (mathError) { /* La fórmula matemática falló. */ }
    }

    /**
     * La función de recálculo principal y única.
     * Garantiza el orden correcto: primero las filas, luego el resto.
     */
    function recalculateAll() {
        // 1. Calcular cada fila de cada datatable de forma aislada.
        document.querySelectorAll('table.datatable-container tbody tr').forEach(row => {
            const rowValues = getValuesFromScope(row);
            row.querySelectorAll('[data-formula]').forEach(field => {
                processSingleFormula(field, rowValues);
            });
        });

        // 2. Calcular todas las demás fórmulas usando los valores actualizados de todo el formulario.
        const allFormValues = getValuesFromScope(formulario);
        formulario.querySelectorAll('fieldset [data-formula]').forEach(field => {
            // Solo procesar si NO está dentro de un datatable (ya se hizo).
            if (!field.closest('table.datatable-container')) {
                processSingleFormula(field, allFormValues);
            }
        });
    }

    // --- LÓGICA DE INICIALIZACIÓN Y EVENTOS ---

    // Configurar DataTables (Agregar Fila)
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
                if (col['data-formula']) {
                    input.setAttribute('data-formula', col['data-formula']);
                }
                cell.appendChild(input);
            });
            const actionCell = newRow.insertCell();
            actionCell.innerHTML = `<button type="button" class="eliminar_fila btn btn-danger btn-sm">Eliminar</button>`;
        });
    });

    // Evento de input: simple, solo llama a la función de recálculo principal.
    formulario.addEventListener('input', recalculateAll);

    // Evento de click para eliminar filas.
    formulario.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            recalculateAll(); // Recalcular todo después de eliminar.
        }
    });

    // Cálculo inicial al cargar la página.
    recalculateAll();
});
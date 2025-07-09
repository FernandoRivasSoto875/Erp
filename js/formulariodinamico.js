/**
 * Formulario Dinámico - Versión Final Unificada
 * Soporta cálculos y búsquedas que pueden usar CUALQUIER campo del formulario,
 * tanto dentro como fuera de los DataTables.
 */
document.addEventListener('DOMContentLoaded', function() {

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

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
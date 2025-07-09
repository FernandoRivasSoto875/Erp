/**
 * Formulario Dinámico - Versión Final Estable y Simplificada
 * Reescrito desde cero para garantizar el orden de ejecución y la estabilidad.
 * Autor: GitHub Copilot (verificado y corregido)
 */
document.addEventListener('DOMContentLoaded', function() {

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

    /**
     * Recolecta todos los valores del formulario en un objeto simple.
     * @returns {Object} Un objeto donde las claves son los nombres de los campos.
     */
    function getFormValues() {
        const values = {};
        const formData = new FormData(formulario);
        for (const [name, value] of formData.entries()) {
            // Para campos que pueden tener múltiples valores (como checkboxes o subtotales de datatable)
            if (values.hasOwnProperty(name)) {
                if (!Array.isArray(values[name])) {
                    values[name] = [values[name]];
                }
                values[name].push(value);
            } else {
                values[name] = value;
            }
        }
        return values;
    }

    /**
     * La función de recálculo principal. Orquesta todo en el orden correcto.
     */
    async function recalculateAll() {
        // Paso 1: Calcular todas las filas de los datatables de forma aislada.
        document.querySelectorAll('table.datatable-container tbody tr').forEach(row => {
            const rowValues = {};
            row.querySelectorAll('input, select, textarea').forEach(input => {
                const name = input.name.match(/\[(\w+)\]$/)?.[1];
                if (name) rowValues[name] = input.value;
            });

            row.querySelectorAll('[data-formula]').forEach(field => {
                let expr = field.getAttribute('data-formula');
                try {
                    // Reemplazar variables dentro de la fila
                    Object.keys(rowValues).forEach(key => {
                        const value = parseFloat(rowValues[key]) || 0;
                        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                    });
                    const result = eval(expr);
                    if (Number.isFinite(result)) {
                        field.value = result.toFixed(2);
                    }
                } catch (e) { /* Ignorar errores de cálculo en fila */ }
            });
        });

        // Paso 2: Ejecutar todas las búsquedas (lookups) y esperar a que terminen.
        const lookupPromises = [];
        const allFormValues = getFormValues();
        
        formulario.querySelectorAll('[data-formula*="lookup"]').forEach(field => {
            try {
                const formulaObj = JSON.parse(field.getAttribute('data-formula'));
                if (formulaObj.type === 'lookup') {
                    let whereClause = formulaObj.where;
                    const placeholders = whereClause.match(/\{(.+?)\}/g) || [];
                    let isReady = true;

                    placeholders.forEach(ph => {
                        const fieldName = ph.replace(/[{}]/g, '');
                        const value = allFormValues[fieldName];
                        if (value === undefined || value === '') isReady = false;
                        whereClause = whereClause.replace(ph, value);
                    });

                    if (isReady) {
                        const promise = fetch('ajax/busqueda_formula.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tabla: formulaObj.source.table, campo: formulaObj.source.field, where: whereClause })
                        })
                        .then(r => r.ok ? r.json() : { resultado: '' })
                        .then(data => { field.value = data.resultado ?? ''; });
                        lookupPromises.push(promise);
                    } else {
                        field.value = '';
                    }
                }
            } catch (e) { /* No es un JSON de lookup válido */ }
        });
        
        // Esperar a que TODAS las búsquedas se completen antes de continuar.
        await Promise.all(lookupPromises);

        // Paso 3: Calcular todas las fórmulas matemáticas restantes (globales y de agregación).
        const finalValues = getFormValues(); // Obtener valores actualizados después de los lookups.
        formulario.querySelectorAll('[data-formula]').forEach(field => {
            // Solo procesar si NO es un lookup (ya se hizo) y NO está en un datatable (ya se hizo).
            if (!field.getAttribute('data-formula').includes('lookup') && !field.closest('table')) {
                let expr = field.getAttribute('data-formula');
                try {
                    // Manejar SUMA
                    const sumMatch = expr.match(/SUM\((.+?)\)/);
                    if (sumMatch) {
                        const fieldToSum = sumMatch[1]; // ej: "items[subtotal]"
                        const sumValues = Array.isArray(finalValues[fieldToSum]) ? finalValues[fieldToSum] : [finalValues[fieldToSum] || 0];
                        const totalSum = sumValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                        expr = expr.replace(sumMatch[0], totalSum);
                    }

                    // Reemplazar variables simples
                    Object.keys(finalValues).forEach(key => {
                        if (typeof finalValues[key] === 'string') {
                             const value = parseFloat(finalValues[key]) || 0;
                             expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                        }
                    });

                    const result = eval(expr);
                    if (Number.isFinite(result)) {
                        field.value = result.toFixed(2);
                    }
                } catch (e) { /* Ignorar errores de cálculo final */ }
            }
        });
    }

    // --- LÓGICA DE INICIALIZACIÓN Y EVENTOS ---
    document.querySelectorAll('table.datatable-container').forEach(table => {
        document.getElementById(`btn-add-row-${table.id}`)?.addEventListener('click', function() {
            const tbody = table.querySelector('tbody');
            const formField = window.fields?.find(f => f.name === table.id);
            if (!formField || !formField.columns) return;
            const newRow = tbody.insertRow();
            const rowIndex = newRow.rowIndex - 1;
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

    formulario.addEventListener('input', recalculateAll);
    formulario.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            recalculateAll();
        }
    });

    recalculateAll();
});
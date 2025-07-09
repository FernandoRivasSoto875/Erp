/**
 * Formulario Dinámico - Versión Final Estable y Robusta
 * Incluye una corrección para evitar conflictos en la ejecución de las fórmulas.
 */
document.addEventListener('DOMContentLoaded', function() {

    const formulario = document.getElementById('formulario');
    if (!formulario) return;

    let isCalculating = false; // Semáforo para evitar ejecuciones simultáneas
    let debounceTimer;         // Temporizador para el "debounce"

    /**
     * La función de recálculo principal. Orquesta todo en el orden correcto.
     */
    async function recalculateAll() {
        // --- PASO 1: EJECUTAR TODAS LAS BÚSQUEDAS (LOOKUPS) Y ESPERAR A QUE TERMINEN ---
        const lookupPromises = [];
        const currentFormValues = new FormData(formulario);

        formulario.querySelectorAll('[data-formula*="lookup"]').forEach(field => {
            try {
                const formulaObj = JSON.parse(field.getAttribute('data-formula'));
                if (formulaObj.type === 'lookup') {
                    let whereClause = formulaObj.where;
                    const placeholders = whereClause.match(/\{(.+?)\}/g) || [];
                    let isReady = true;

                    placeholders.forEach(ph => {
                        const fieldName = ph.replace(/[{}]/g, '');
                        const value = currentFormValues.get(fieldName); // Usar valores actuales
                        if (value === null || value === '') {
                            isReady = false;
                        }
                        whereClause = whereClause.replace(ph, `'${value}'`); // Importante: añadir comillas para el SQL
                    });

                    if (isReady) {
                        const promise = fetch('ajax/busqueda_formula.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tabla: formulaObj.source.table, campo: formulaObj.source.field, where: whereClause })
                        })
                        .then(r => r.ok ? r.json() : { resultado: '' })
                        .then(data => {
                            field.value = data.resultado ?? '';
                        });
                        lookupPromises.push(promise);
                    } else {
                        field.value = ''; // Limpiar si no está listo
                    }
                }
            } catch (e) { /* Ignorar errores de parseo */ }
        });
        
        // Esperar a que TODAS las búsquedas se completen antes de continuar.
        await Promise.all(lookupPromises);

        // --- PASO 2: CALCULAR TODAS LAS FÓRMULAS MATEMÁTICAS ---
        // Se ejecuta DESPUÉS de que los lookups hayan terminado.
        
        // Filas de los datatables
        document.querySelectorAll('table.datatable-container tbody tr').forEach(row => {
            const rowValues = {};
            row.querySelectorAll('input, select, textarea').forEach(input => {
                const name = input.name.match(/\[(\w+)\]$/)?.[1];
                if (name) rowValues[name] = input.value;
            });

            row.querySelectorAll('[data-formula]').forEach(field => {
                if (!field.getAttribute('data-formula').includes('lookup')) {
                    let expr = field.getAttribute('data-formula');
                    try {
                        Object.keys(rowValues).forEach(key => {
                            const value = parseFloat(rowValues[key]) || 0;
                            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                        });
                        const result = eval(expr);
                        if (Number.isFinite(result)) field.value = result.toFixed(2);
                    } catch (e) { /* Ignorar */ }
                }
            });
        });

        // Fórmulas globales y de agregación (SUM).
        const finalFormValues = new FormData(formulario);
        const finalValues = Object.fromEntries(finalFormValues.entries());

        formulario.querySelectorAll('[data-formula]').forEach(field => {
            if (!field.getAttribute('data-formula').includes('lookup') && !field.closest('table')) {
                let expr = field.getAttribute('data-formula');
                try {
                    const sumMatch = expr.match(/SUM\((.+?)\)/);
                    if (sumMatch) {
                        const fieldToSum = sumMatch[1];
                        const sumValues = finalFormValues.getAll(fieldToSum);
                        const totalSum = sumValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                        expr = expr.replace(sumMatch[0], totalSum);
                    }

                    Object.keys(finalValues).forEach(key => {
                        const value = parseFloat(finalValues[key]) || 0;
                        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                    });

                    const result = eval(expr);
                    if (Number.isFinite(result)) field.value = result.toFixed(2);
                } catch (e) { /* Ignorar */ }
            }
        });
    }

    /**
     * Función controladora que se encarga de llamar a recalculateAll de forma segura.
     */
    const handleRecalculate = async () => {
        if (isCalculating) return; // Si ya está calculando, no hacer nada.
        
        isCalculating = true;
        try {
            await recalculateAll();
        } catch (error) {
            console.error("Error durante el recálculo:", error);
        } finally {
            isCalculating = false;
        }
    };

    // --- LÓGICA DE EVENTOS MEJORADA ---
    formulario.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleRecalculate, 250); // Espera 250ms después de la última entrada para calcular
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

    // Cálculo inicial al cargar la página.
    handleRecalculate();
});
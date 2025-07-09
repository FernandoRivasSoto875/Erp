/**
 * Formulario Dinámico - Versión Final Definitiva
 * Restaura la funcionalidad de lookup en data-formula y mantiene la estabilidad.
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
            // Para datatables, extrae el nombre corto (ej: 'cantidad'). Para otros, usa el nombre completo.
            const name = input.name.match(/\[(\w+)\]$/)?.[1] || input.name;
            if (name) {
                values[name] = input.value;
            }
        });
        return values;
    }

    /**
     * Calcula el valor de un campo que tiene un atributo data-formula.
     * @param {HTMLElement} field - El campo del formulario a calcular.
     * @param {Object} values - El conjunto de valores disponibles para el cálculo.
     */
    function processFormula(field, values) {
        const formulaAttr = field.getAttribute('data-formula');

        // --- INICIO DE LA LÓGICA RESTAURADA Y CORREGIDA ---
        // Primero, intenta procesar como un objeto JSON (para lookups)
        try {
            const formulaObj = JSON.parse(formulaAttr);
            if (formulaObj.type === 'lookup') {
                let whereClause = formulaObj.where;
                const placeholders = whereClause.match(/\{(.+?)\}/g) || [];
                let isReadyForLookup = true;

                placeholders.forEach(ph => {
                    const fieldName = ph.replace(/[{}]/g, '');
                    const value = values[fieldName];
                    if (value === undefined || value === '') {
                        isReadyForLookup = false;
                    }
                    // Reemplaza el placeholder con el valor escapado para la consulta
                    whereClause = whereClause.replace(ph, value);
                });

                if (isReadyForLookup) {
                    // Crea un path relativo para el archivo ajax.
                    // Esto asume que la carpeta 'ajax' está al mismo nivel que el archivo PHP que se ejecuta.
                    const ajaxPath = 'ajax/busqueda_formula.php';
                    fetch(ajaxPath, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tabla: formulaObj.source.table,
                            campo: formulaObj.source.field,
                            where: whereClause
                        })
                    })
                    .then(response => {
                        if (!response.ok) return Promise.reject('Respuesta de red no fue ok');
                        return response.json();
                    })
                    .then(data => {
                        field.value = data.resultado ?? 'No encontrado';
                    })
                    .catch(error => {
                        console.error('Error en lookup:', error);
                        field.value = ''; // Limpia el campo si hay un error
                    });
                } else {
                    field.value = ''; // Limpia si los campos para el 'where' no están listos
                }
                return; // Termina la ejecución para este campo, ya que es un lookup
            }
        } catch (e) {
            // No es un JSON válido, se asume que es una fórmula matemática.
        }

        // Si no es un lookup, procesa como fórmula matemática.
        try {
            let expr = formulaAttr;
            const variables = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            variables.forEach(variable => {
                const value = parseFloat(String(values[variable]).replace(/,/g, '.')) || 0;
                expr = expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), value);
            });

            if (!/[a-zA-Z]/.test(expr)) {
                const result = eval(expr);
                if (Number.isFinite(result)) {
                    field.value = result.toFixed(2);
                }
            }
        } catch (mathError) {
            // La fórmula matemática falló, no hacer nada.
        }
        // --- FIN DE LA LÓGICA RESTAURADA Y CORREGIDA ---
    }

    /**
     * Dispara el cálculo de fórmulas para un contexto específico.
     * @param {HTMLElement} context - El elemento (<tr> o <form>) que contiene los campos a calcular.
     */
    function calculateFormulasInContext(context) {
        const formulasToCalculate = context.querySelectorAll('[data-formula]');
        if (formulasToCalculate.length === 0) return;

        const values = getValuesFromScope(context.tagName === 'TR' ? context : formulario);
        formulasToCalculate.forEach(field => processFormula(field, values));
    }

    /**
     * Recalcula todas las fórmulas del formulario que no están en un datatable.
     */
    function calculateGlobalFormulas() {
        const globalContext = formulario;
        const formulasToCalculate = globalContext.querySelectorAll('fieldset [data-formula]');
        const values = getValuesFromScope(globalContext);
        formulasToCalculate.forEach(field => processFormula(field, values));
    }

    // --- Lógica de Inicialización y Eventos (Sin cambios) ---
    document.querySelectorAll('table.datatable-container').forEach(table => {
        const tbody = table.querySelector('tbody');
        tbody.querySelectorAll('tr').forEach(row => calculateFormulasInContext(row));
        // Botón "Agregar Fila"
        document.getElementById(`btn-add-row-${table.id}`)?.addEventListener('click', function() {
            const formField = window.fields?.find(f => f.name === table.id);
            if (!formField || !formField.columns) return;

            const newRow = tbody.insertRow();
            const rowIndex = tbody.rows.length - 1;

            formField.columns.forEach(col => {
                const cell = newRow.insertCell();
                const input = document.createElement('input');
                input.type = col.type || 'text';
                input.name = `${table.id}[${rowIndex}][${col.name}]`;
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

    formulario.addEventListener('input', function(e) {
        const row = e.target.closest('tr');
        if (row) {
            calculateFormulasInContext(row);
        }
        calculateGlobalFormulas();
    });

    formulario.addEventListener('click', function(e) {
        if (e.target?.classList.contains('eliminar_fila')) {
            e.target.closest('tr').remove();
            calculateGlobalFormulas();
        }
    });

    calculateGlobalFormulas();
});
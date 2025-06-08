function initializeDataTable() {
    if ($.fn.DataTable.isDataTable("#dynamicTable")) {
        $("#dynamicTable").DataTable().destroy();
    }
 
    let table = $("#dynamicTable").DataTable({
        data: window.tableData,
        columns: window.dtColumns,
        responsive: {
            details: {
                display: $.fn.dataTable.Responsive.display.modal({
                    header: function(row) {
                        var data = row.data();
                        var primaryKey = Object.keys(data)[0];
                        return 'Detalles de ' + data[primaryKey];
                    }
                }),
                renderer: $.fn.dataTable.Responsive.renderer.tableAll({
                    tableClass: 'table'
                })
            }
        },
        colReorder: {
            realtime: false,
            order: localStorage.getItem('columnOrder') ? JSON.parse(localStorage.getItem('columnOrder')) : undefined
        },
        stateSave: false,
        destroy: true, // 💡 Evita conflictos si la tabla ya estaba inicializada
        scrollX: true,
        scrollY: '50vh',
        paging: true,
        lengthMenu: [10, 25, 50, 100],
        stateSave: true,
        dom: '<"top"fBQr>rt<"bottom"><"clear">',
        buttons: [
            { extend: 'searchBuilder', text: '<i class="fa fa-filter  style="color: #007bff; "></i>', config: { depthLimit: 2 } },
            { extend: 'print', text: '<i class="fas fa-print style="color: #007bff;></i>', titleAttr: 'Imprimir' },
            { extend: 'colvis', text: '<i class="fas fa-columnsstyle="color: #007bff; "></i>', titleAttr: 'Visibilidad de Columnas' }
        ],
        language: {
            search: "<i class='fas fa-search'></i>",
            paginate: {
                previous: "<i class='fas fa-chevron-left'></i>",
                next: "<i class='fas fa-chevron-right'></i>"
            },
            info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
            lengthMenu: "Mostrar _MENU_ registros",
            zeroRecords: "No se encontraron coincidencias",
            infoEmpty: "No hay registros disponibles",
            infoFiltered: "(filtrado de _MAX_ registros)",
            searchBuilder: {
                button: '<i class="fa fa-filter"></i>',
                title: { 0: '   Cf :', _: '(%d)' },
                conditions: {
                  string: {
                    contains: 'Contiene',
                    empty: 'Vacío',
                    endsWith: 'Finaliza con',
                    equals: 'Igual a',
                    not: 'No es igual a',
                    notEmpty: 'No está vacío',
                    startsWith: 'Comienza con'
                  },
                  number: {
                    equals: 'Igual a',
                    not: 'Diferente de',
                    greaterThan: 'Mayor que',
                    lessThan: 'Menor que',
                    empty: 'Vacío'
                  },
                  date: {
                    equals: 'Igual a',
                    not: 'Diferente de',
                    before: 'Antes de',
                    after: 'Después de',
                    empty: 'Vacío'
                  },
                  array: {
                    equals: 'Igual a',
                    not: 'Diferente de',
                    empty: 'Vacío',
                    contains: 'Contiene'
                  }
                },
                add: '<i class="fa fa-plus"></i>',
                clearAll: '<i class="fa fa-times"></i>',
                deleteTitle: 'Eliminar condición',
                logicAnd: 'Y',
                logicOr: 'O',
                value: 'Valor'
              }
          }
    });

    // 🔥 Guardar el orden de columnas cuando se modifique
    table.on('column-reorder', function(e, settings, details) {
        // Guarda el nuevo orden en localStorage
        localStorage.setItem('columnOrder', JSON.stringify(details.mapping));
        // Fuerza el ajuste de columnas para que el layout se actualice correctamente
        table.columns.adjust().draw();
    });
    $("#dynamicTable tbody").on("click", "tr", function () {
        let data = table.row(this).data();
        if (!data) return;
        let primerValor = typeof data === "object" ? Object.values(data)[0] : data[0];
        $("#firstValueDisplay").text(primerValor);
        $("#displayValueBtn").show();
    });
}

// 💡 Solo inicializar si los datos existen
if (window.tableData && window.dtColumns && window.tableData.length > 0) {
    initializeDataTable();
} else {
    $(document).one('dataLoaded', initializeDataTable);
}

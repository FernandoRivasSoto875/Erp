// MantencionGrillaFuncionesGenerales.js

// Declarar variables globales para usarlas en el frontend y otros scripts (como exportación).
window.tableData = [];
window.tableColumns = [];
window.baseColumns = [];

$(document).ready(function () {
    var tableName = "";
    // Obtener el nombre de la tabla desde la variable global definida en MantencionGrilla.php o de la URL.
    if (typeof tableNameGlobal !== "undefined" && tableNameGlobal) {
        tableName = tableNameGlobal;
    } else {
        tableName = new URLSearchParams(window.location.search).get("table_name");
    }
    if (!tableName) {
        alert("Error: No se especificó una tabla válida.");
        return;
    }
  
    // Cargar la grilla vía AJAX.
    $.ajax({
        url: "MantencionGrillaFetch.php",
        data: { table_name: tableName },
        dataType: "json",
        success: function (response) {
            if (response.error) {
                alert(response.error);
                return;
            }
            // Asignar los datos recibidos a las variables globales.
            window.tableData = response.data;
            window.tableColumns = response.columns;
            window.baseColumns = response.baseColumns; // El primer elemento de este arreglo es la clave primaria real.
            
            // Configuramos DataTables.
            var dtColumns = [];
            $.each(window.tableColumns, function (i, col) {
                dtColumns.push({ title: col, data: col });
            });
            // Agregar columna "Acciones" con botones "Editar" y "Eliminar".
            dtColumns.push({
                title: "Acciones",
                data: null,
                orderable: false,
                searchable: false,
                render: function (data, type, row, meta) {
                    // Se asume que el primer campo (window.tableColumns[0]) es la clave primaria.
                    var id = row[window.tableColumns[0]];
                    return '<button class="editBtn" data-id="' + id + '">Editar</button> ' +
                           '<button class="deleteBtn" data-id="' + id + '">Eliminar</button>';
                }
            });
            
            // Inicializar DataTable.
            $("#dynamicTable").DataTable({
                data: window.tableData,
                columns: dtColumns,
                responsive: true,
                paging: true,
                searching: true,
                ordering: true,
                pageLength: 5,
                scrollX: true,
                autoWidth:  true,
                scrollCollapse: true,
                lengthMenu: [10, 25, 50, 100],
                stateSave: true,
                language: {
                    processing: "Procesando...",
                    search: "Buscar..:",
                    lengthMenu: "Mostrar _MENU_ registros",
                    info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
                    infoEmpty: "Mostrando 0 a 0 de 0 registros",
                    infoFiltered: "(filtrado de _MAX_ registros en total)",
                    loadingRecords: "Cargando registros...",
                    zeroRecords: "No se encontraron resultados",
                    emptyTable: "No hay datos disponibles en la tabla",
                    paginate: {
                        first: "|<",
                        previous: "<",
                        next: ">",
                        last: "<|"
                    }
                }


                ,
                dom: 'Bfrtip',
                searchPanes: {
                    viewTotal: true
                },
    
                buttons: [
               //     { extend: 'excel', text: 'Exportar a Excel' },
                //    { extend: 'pdf', text: 'Exportar a PDF' },
                  // { extend: 'csv', text: 'Exportar a CSV' },
                   { extend: 'csv', text: 'Exportar a CSV' },
                    

        


                    { extend: 'print', text: 'Imprimir' }
                ],
                columnDefs: [
                    { targets: [0], orderable: false }, // Desactiva ordenación en la primera columna
                    { targets: [1], visible: false } // Oculta la segunda columna
                ],
                rowCallback: function(row, data) {
                    if (data[3] > 100) { // Si el valor de la columna 3 es mayor a 100
                        $(row).css("background-color", "#FFDDDD"); // Pinta la fila de rojo claro
                    }
                }
 

            });
            

            
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar datos:", error);
            alert("Error al cargar datos: " + error);
        }
    });
  
    // Botón "Agregar Nuevo": Crea el formulario para insertar un nuevo registro (omitiendo el campo de la clave primaria).
    $("#addBtn").on("click", function () {
        $("#form-title").text("Crear Registro");
        $("#dynamicForm").empty();
        $.each(window.baseColumns, function (i, col) {
            if (i !== 0) { // Omitir la clave primaria.
                $("#dynamicForm").append(
                    '<label for="' + col + '">' + col + ":</label> " +
                    '<input type="text" name="' + col + '" id="' + col + '"><br>'
                );
            }
        });
        // Campos ocultos para indicar la tabla y la acción.
        $("#dynamicForm").append('<input type="hidden" name="table_name" value="' + tableName + '">');
        $("#dynamicForm").append('<input type="hidden" name="action" value="create">');
        $("#form-container").modal();
    });
  
    // Botón "Editar": Al hacer clic, carga en el formulario el registro seleccionado para editar.
    $("#dynamicTable").on("click", ".editBtn", function () {
        var id = $(this).data("id");
        // Buscar el registro usando el valor de la clave primaria (primer campo de window.tableColumns).
        var record = window.tableData.find(function (r) {
            return r[window.tableColumns[0]] == id;
        });
        if (record) {
            $("#form-title").text("Editar Registro");
            $("#dynamicForm").empty();
            // Para la edición: crear un input oculto para la clave primaria usando el nombre real (window.baseColumns[0]).
            $.each(window.baseColumns, function (i, col) {
                if (i === 0) {
                    // Usar el nombre real del campo primario en lugar de "id".
                    $("#dynamicForm").append('<input type="hidden" name="' + col + '" value="' + record[col] + '">');
                } else {
                    $("#dynamicForm").append(
                        '<label for="' + col + '">' + col + ":</label> " +
                        '<input type="text" name="' + col + '" id="' + col + '" value="' + record[col] + '"><br>'
                    );
                }
            });
            $("#dynamicForm").append('<input type="hidden" name="table_name" value="' + tableName + '">');
            $("#dynamicForm").append('<input type="hidden" name="action" value="update">');
            $("#form-container").modal();
        }
    });
  
    // Botón "Guardar": Envía el formulario (para create o update) vía AJAX.
    $("#saveBtn").on("click", function () {
        var formData = $("#dynamicForm").serialize();
        console.log("Datos enviados:", formData);
        $.post("MantencionGrillaCrud.php", formData, function (resp) {
            console.log("Respuesta del servidor:", resp);
            alert(resp.success || resp.error);
            $.modal.close();
            location.reload();
        }, "json").fail(function (xhr, status, error) {
            console.error("Error al guardar:", xhr.responseText, status, error);
            alert("Error al guardar: " + error);
        });
    });
  
    // Botón "Eliminar": Envía la solicitud de eliminación vía AJAX.
    $("#dynamicTable").on("click", ".deleteBtn", function () {
        var id = $(this).data("id");
        if (confirm("¿Está seguro de eliminar el registro con ID " + id + "?")) {
            var requestData = {
                table_name: tableName,
                action: "delete"
            };
            // Usar el nombre del campo primario real (primer elemento de window.tableColumns) para la eliminación.
            requestData[window.tableColumns[0]] = id;
            $.post("MantencionGrillaCrud.php", requestData, function (resp) {
                alert(resp.success || resp.error);
                location.reload();
            }, "json").fail(function (xhr, status, error) {
                alert("Error al eliminar: " + error);
            });
        }
    });
});

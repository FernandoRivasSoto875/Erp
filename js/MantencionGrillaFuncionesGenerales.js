// MantencionGrillaFuncionesGenerales.js

// Declarar variables globales para utilizarlas en el front-end.
window.tableData    = [];
window.tableColumns = [];
window.baseColumns  = [];

 

$(document).ready(function () {
    var tableName = "";
    if (typeof tableNameGlobal !== "undefined" && tableNameGlobal) {
        tableName = tableNameGlobal;
    } else {
        tableName = new URLSearchParams(window.location.search).get("table_name");
    }
    if (!tableName) {
        alert("Error: No se especificó una tabla válida.");
        return;
    }
  
    // Cargar datos vía AJAX para la grilla.
    $.ajax({
        url: "MantencionGrillaFetch.php",
        data: { table_name: tableName },
        dataType: "json",
        success: function (response) {
            if (response.error) {
                alert(response.error);
                return;
            }
            
            console.log("Respuesta AJAX:", response);
            window.tableData    = response.data;  
            window.tableColumns = response.columns;
            window.baseColumns  = response.baseColumns;
            
            // Construir el arreglo de columnas para DataTables usando window.tableColumns
            window.dtColumns = [];
            $.each(window.tableColumns, function (i, col) {
                window.dtColumns.push({ title: col, data: col });
            });
            // Añadir la columna de "Acciones"
            window.dtColumns.push({
                title: "Acciones",
                data: null,
                orderable: false,
                searchable: false,
                render: function (data, type, row, meta) {
                    var id = row[window.tableColumns[0]];
                    return '<div style="display: flex; gap: 5px;">' + 
                    '<button class="editBtn" data-id="' + id + '" style="background-color: #007bff; border: none; color: white; padding: 5px 10px; border-radius: 5px;">' +
                        '<i class="fas fa-edit" style="color: white;"></i>' +
                    '</button>' +
                    '<button class="deleteBtn" data-id="' + id + '" style="background-color: #dc3545; border: none; color: white; padding: 5px 10px; border-radius: 5px;">' +
                        '<i class="fas fa-trash-alt" style="color: white;"></i>' +
                    '</button>' +
                '</div>';
         
                }
            });
            
            // Disparar el evento 'dataLoaded' para que se inicialice la DataTable
            $(document).trigger('dataLoaded');
        },
        error: function (xhr, status, error) {
            alert("Error al cargar datos: " + error);
        }
    });
  
    // Eventos CRUD:
    $(document).on("click", "#addBtn", function (e) {
        e.preventDefault();
        $("#form-title").text("Crear Registro");
        $("#dynamicForm").empty();
        $.each(window.baseColumns, function (i, col) {
            if (i !== 0) {  // Se omite la clave primaria
                $("#dynamicForm").append(
                    '<label for="' + col + '">' + col + ":</label> " +
                    '<input type="text" name="' + col + '" id="' + col + '"><br>'
                );
            }
        });
        $("#dynamicForm").append('<input type="hidden" name="table_name" value="' + tableName + '">');
        $("#dynamicForm").append('<input type="hidden" name="action" value="create">');
        $("#form-container").modal();
    });
    
    $(document).on("click", ".editBtn", function (e) {
        e.preventDefault();
        var id = $(this).data("id");
        var record = window.tableData.find(function (r) {
            return r[window.tableColumns[0]] == id;
        });
        if (record) {
            $.modal.close();
            setTimeout(function(){
                $("#form-title").text("Editar Registro");
                $("#dynamicForm").empty();
                $.each(window.baseColumns, function (i, col) {
                    if (i === 0) {
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
            }, 500);
        }
    });
    
    $(document).on("click", "#saveBtn", function (e) {
        e.preventDefault();
        var formData = $("#dynamicForm").serialize();
        $.post("MantencionGrillaCrud.php", formData, function (resp) {
            alert(resp.success || resp.error);
            $.modal.close();
            location.reload();
        }, "json").fail(function (xhr, status, error) {
            alert("Error al guardar: " + error);
        });
    });
    
    $(document).on("click", ".deleteBtn", function (e) {
        e.preventDefault();
        var id = $(this).data("id");
        if (confirm("¿Está seguro de eliminar el registro con ID " + id + "?")) {
            var requestData = { table_name: tableName, action: "delete" };
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

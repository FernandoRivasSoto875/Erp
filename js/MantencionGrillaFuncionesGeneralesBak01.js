// MantencionGrillaFuncionesGenerales.js

// Declarar variables globales para usarlas en el frontend.
window.tableData    = [];
window.tableColumns = [];
window.baseColumns  = [];

$(document).ready(function () {
    var tableName = "";
    
    // Obtener el nombre de la tabla desde la variable global o la URL.
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
            
            console.log("Respuesta AJAX:", response);
            
            // Asignar la respuesta a las variables globales.
            window.tableData    = response.data;  
            window.tableColumns = response.columns;
            window.baseColumns  = response.baseColumns; // Se asume que el primer elemento es la clave primaria.
            
            console.log("window.tableData:", window.tableData);
            console.log("window.tableColumns:", window.tableColumns);
            console.log("window.baseColumns:", window.baseColumns);
            
            // Construir el arreglo de columnas para DataTables usando directamente window.tableColumns.
            window.dtColumns = [];
            $.each(window.tableColumns, function (i, col) {
                window.dtColumns.push({ title: col, data: col });
            });
            
            // Agregar la columna de "Acciones" con botones para editar y eliminar.
            window.dtColumns.push({
                title: "Acciones",
                data: null,
                orderable: false,
                searchable: false,
                render: function (data, type, row, meta) {
                    // Se asume que la clave primaria es el primer elemento definido en window.tableColumns.
                    var id = row[window.tableColumns[0]];
                    return '<button class="editBtn" data-id="' + id + '">Editar</button> ' +
                           '<button class="deleteBtn" data-id="' + id + '">Eliminar</button>';
                }
            });
            
            console.log("window.dtColumns final:", window.dtColumns);
            
            // Disparar el evento para que se inicie la DataTable.
            $(document).trigger('dataLoaded');
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar datos:", error);
            alert("Error al cargar datos: " + error);
        }
    });
  
    // --- Manejo de eventos CRUD ---

    // Usamos delegación a nivel de documento para que los eventos se mantengan tras redraws:
    
    // Botón "Agregar Nuevo": abre el formulario para crear un nuevo registro (omitirá la clave primaria).
    $(document).on("click", "#addBtn", function () {
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
        $("#dynamicForm").append('<input type="hidden" name="table_name" value="' + tableName + '">');
        $("#dynamicForm").append('<input type="hidden" name="action" value="create">');
        $("#form-container").modal();
    });
    
    // Botón "Editar": carga en el formulario el registro seleccionado para editar.
    $(document).on("click", ".editBtn", function () {
        var id = $(this).data("id");
        // Se busca el registro comparando usando la clave primaria definida en window.tableColumns[0].
        var record = window.tableData.find(function (r) {
            return r[window.tableColumns[0]] == id;
        });
        if (record) {
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
        }
    });
    
    // Botón "Guardar": envía el formulario vía AJAX (para crear o actualizar).
    $(document).on("click", "#saveBtn", function () {
        var formData = $("#dynamicForm").serialize();
        $.post("MantencionGrillaCrud.php", formData, function (resp) {
            alert(resp.success || resp.error);
            $.modal.close();
            location.reload();
        }, "json").fail(function (xhr, status, error) {
            console.error("Error al guardar:", xhr.responseText, status, error);
            alert("Error al guardar: " + error);
        });
    });
    
    // Botón "Eliminar": envía la solicitud de eliminación vía AJAX.
    $(document).on("click", ".deleteBtn", function () {
        var id = $(this).data("id");
        if (confirm("¿Está seguro de eliminar el registro con ID " + id + "?")) {
            var requestData = {
                table_name: tableName,
                action: "delete"
            };
            // Se utiliza la clave primaria definida en window.tableColumns[0].
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

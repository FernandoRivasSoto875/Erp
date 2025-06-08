<?php
// Incluir el archivo que contiene las funciones SQL
include 'funcionessql.php';

// Configuración de conexión
$conn = conexionBd();

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Obtener el nombre de la tabla desde el parámetro GET
$table_name = $_GET['table_name'] ?? null;

if (!$table_name) {
    die("Error: No se proporcionó el parámetro 'table_name'.");
}

// Cerrar conexión
$conn->close();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRUD Dinámico - <?php echo htmlspecialchars($table_name); ?></title>
    <!-- Enlaces CSS y JS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
 
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js"></script>


 
    <!-- Inclusión de librerías JavaScript necesarias -->
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- DataTables -->
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <!-- jQuery Modal -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js"></script>
    <!-- SheetJS para exportar a Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
    <!-- jsPDF (UMD) para exportar a PDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <!-- jsPDF-AutoTable plugin -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"></script>
    <!-- Librería de API de Google (para exportar a Google Sheets) -->
    <script src="https://apis.google.com/js/api.js"></script>

















</head>
<body>
    <h1>CRUD Dinámico - Tabla <?php echo htmlspecialchars($table_name); ?></h1>

    <button id="addBtn" style="margin-bottom: 20px;">Agregar Nuevo</button>


    <!-- Botones de exportación -->
    <button id="exportExcelBtn" style="margin-bottom:20px;">Exportar a Excel</button>
    <button id="exportPdfBtn" style="margin-bottom:20px;">Exportar a PDF</button>
    <button id="exportJsonBtn" style="margin-bottom:20px;">Exportar a JSON</button>
    <button id="exportCsvBtn" style="margin-bottom:20px;">Exportar a CSV</button>
    <button id="exportXmlBtn" style="margin-bottom:20px;">Exportar a XML</button>
    <button id="exportGSheetsBtn" style="margin-bottom:20px;">Exportar a Google Sheets</button>

    <table id="dynamicTable" class="display" style="width: 100%;">
        <thead>
            <tr id="tableHeaders"></tr>
        </thead>
    </table>

    <!-- Popup Modal para el formulario -->
    <div id="form-container" class="modal">
        <h3 id="form-title">Crear/Editar Registro</h3>
        <form id="dynamicForm"></form>
        <button type="button" id="saveBtn">Guardar</button>
        <button type="button" id="cancelBtn" class="close-modal">Cancelar</button>
    </div>


  <!-- Inyección de la variable global para el nombre de la tabla, que se usará en JavaScript -->
  <script>
        var tableNameGlobal = "<?php echo htmlspecialchars($table_name); ?>";
        console.log("MantencionGrilla.php: tableNameGlobal =", tableNameGlobal);
    </script>
    
    <!-- Inclusión del archivo JavaScript externo con la lógica de la grilla y exportación -->
    <script src="js/MantencionGrillaFunciones.js"></script>





    <script>
        const tableName = "<?php echo htmlspecialchars($table_name); ?>";

        $(document).ready(function () {
            // Cargar configuración de tabla y datos dinámicos
            $.get("MantencionGrillaFetch.php", { table_name: tableName }, function (response) {
                if (!response || response.error) {
                    alert(response.error || "Error desconocido al cargar datos.");
                    return;
                }

                const { columns, data } = response;

                // Generar encabezados de tabla dinámicos
                columns.forEach(column => {
                    $('#tableHeaders').append(`<th>${column}</th>`);
                });
                $('#tableHeaders').append('<th>Acciones</th>');

                // Inicializar DataTables con datos dinámicos
                const table = $('#dynamicTable').DataTable({
                    data: data,
                    columns: columns.map(column => ({ data: column })).concat({
                        data: null,
                        render: function (data, type, row) {
                            return `
                                <button onclick="editRecord(${row[columns[0]]})">Editar</button>
                                <button onclick="deleteRecord(${row[columns[0]]})">Eliminar</button>
                            `;
                        }
                    }),
                    language: {
                        emptyTable: "No hay datos disponibles en la tabla"
                    }
                });

                // Botón "Agregar Nuevo"
                $('#addBtn').on('click', function () {
                    $('#form-title').text('Crear Registro');
                    $('#dynamicForm').empty();
                    columns.forEach(column => {
                        if (column !== columns[0]) { // Ignorar el campo de ID
                            $('#dynamicForm').append(`
                                <label for="${column}">${column}:</label>
                                <input type="text" id="${column}" name="${column}">
                                <br>
                            `);
                        }
                    });
                    $('#dynamicForm').append(`<input type="hidden" name="table_name" value="${tableName}">`);
                    $('#dynamicForm').append(`<input type="hidden" name="action" value="create">`);
                    $('#form-container').modal(); // Mostrar popup
                });

                // Guardar el registro
                $('#saveBtn').on('click', function () {
                    const data = $('#dynamicForm').serialize();
                    $.post("MantencionGrillaCrud.php", data, function (response) {
                        alert(response.success || response.error);
                        $.modal.close(); // Cerrar popup
                        table.ajax.reload(); // Recargar tabla
                    }, "json").fail(function (xhr, status, error) {
                        alert("Error al guardar datos: " + error);
                    });
                });

                // Función para editar un registro
                window.editRecord = function (id) {
                    const rowData = data.find(row => row[columns[0]] == id);
                    $('#form-title').text('Editar Registro');
                    $('#dynamicForm').empty();
                    columns.forEach(column => {
                        $('#dynamicForm').append(`
                            <label for="${column}">${column}:</label>
                            <input type="text" id="${column}" name="${column}" value="${rowData[column] || ''}" ${column === columns[0] ? 'readonly' : ''}>
                            <br>
                        `);
                    });
                    $('#dynamicForm').append(`<input type="hidden" name="table_name" value="${tableName}">`);
                    $('#dynamicForm').append(`<input type="hidden" name="action" value="update">`);
                    $('#form-container').modal(); // Mostrar popup
                };

                // Función para eliminar un registro
                window.deleteRecord = function (id) {
                    if (confirm('¿Estás seguro de eliminar este registro?')) {
                        $.post("MantencionGrillaCrud.php", { table_name: tableName, action: 'delete', [columns[0]]: id }, function (response) {
                            alert(response.success || response.error);
                            table.ajax.reload(); // Recargar tabla
                        }, "json").fail(function (xhr, status, error) {
                            alert("Error al eliminar el registro: " + error);
                        });
                    }
                };
            }).fail(function (xhr, status, error) {
                alert("Error al cargar datos desde el servidor: " + error);
            });
        });
    </script>
</body>
</html>

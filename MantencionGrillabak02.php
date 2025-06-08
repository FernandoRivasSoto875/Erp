<?php
// Incluir el archivo que contiene las funciones SQL (por ejemplo, para la conexión a la base de datos)
include 'funcionessql.php';

// Conectar a la base de datos mediante una función personalizada
$conn = conexionBd();

// Verificar si se produjo un error en la conexión y, en ese caso, detener la ejecución
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Obtener el parámetro 'table_name' de la URL; si no se envía, se asigna null
$table_name = $_GET['table_name'] ?? null;

// Si no se ha proporcionado 'table_name', se detiene la ejecución con un mensaje de error
if (!$table_name) {
    die("Error: No se proporcionó el parámetro 'table_name'.");
}

// Cerrar la conexión, ya que no es necesaria para la generación del HTML
$conn->close();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- Metaetiquetas básicas para la configuración del documento -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- El título de la página incorpora el nombre de la tabla -->
    <title>CRUD Dinámico - <?php echo htmlspecialchars($table_name); ?></title>
    
    <!-- Hojas de estilo para DataTables y jQuery Modal -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css">
    
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
    <!-- Encabezado principal -->
    <h1>CRUD Dinámico - Tabla <?php echo htmlspecialchars($table_name); ?></h1>
    
    <!-- Botón para agregar un registro nuevo -->
    <button id="addBtn" style="margin-bottom:20px;">Agregar Nuevo</button>
    
    <!-- Tabla generada dinámicamente por DataTables -->
    <table id="dynamicTable" class="display" style="width:100%;">
        <thead>
            <tr id="tableHeaders"></tr>
        </thead>
    </table>
    
    <!-- Modal para el formulario de creación/edición de registros -->
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
</body>
</html>

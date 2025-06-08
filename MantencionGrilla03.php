<?php
// MantencionGrilla.php
// Incluir el archivo de funciones SQL para la conexión a la base de datos.
include 'funcionessql.php';

// Conectar a la base de datos mediante una función personalizada.
$conn = conexionBd();
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Obtener el parámetro "table_name" desde la URL.
$table_name = $_GET['Parametros'] ?? null;
if (!$table_name) {
    die("Error: No se proporcionó el parámetro 'table_name'.");
}

// Cerramos la conexión (los datos se cargarán vía AJAX en otro script).
$conn->close();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRUD Dinámico - <?php echo htmlspecialchars($table_name); ?></title>
  
  <link rel="stylesheet" href="css/SearchBuilderStyles.css">
  <!-- DataTables y Responsive -->
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
  <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.4.1/css/responsive.dataTables.min.css">
  
  <!-- CSS para SearchBuilder (versión base de DataTables) -->
  <link rel="stylesheet" href="https://cdn.datatables.net/searchbuilder/1.4.2/css/searchBuilder.dataTables.min.css">
  
  <!-- jQuery Modal -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css">
  
  <!-- jQuery -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- DataTables -->
  <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
  <!-- DataTables Responsive Extension -->
  <script src="https://cdn.datatables.net/responsive/2.4.1/js/dataTables.responsive.min.js"></script>
  <!-- jQuery Modal -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js"></script>
  
  <!-- JSZip (para exportación a Excel) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  
  <!-- Librerías para exportación: XLSX, jsPDF, etc. -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"></script>
  <script src="https://apis.google.com/js/api.js"></script>
  
  <!-- Biblioteca para SearchBuilder (versión base, sin Bootstrap) -->
  <script src="https://cdn.datatables.net/searchbuilder/1.4.2/js/dataTables.searchBuilder.min.js"></script>
  
  <!-- Extensiones para Botones de Exportación -->
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/dataTables.buttons.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.html5.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.print.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.colVis.min.js"></script>
  
  <!-- Reglas CSS Personalizadas -->

  <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"></script>



  <style>
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <h1>Mantención- Tabla <?php echo htmlspecialchars($table_name); ?></h1>

  <!-- Botón para abrir Filtro Avanzado (Popup para SearchBuilder) -->
  <!--//<button id="advancedSearchBtn1" style="float: right; margin-left: 10px;">Filtro Avanzado</button>-->
  <!-- Botón para agregar nuevos registros -->
  <button id="addBtn" style="float: right;">++</button>
  <!-- Contenedor de la grilla -->


<!-- Botón dinámico que mostrará el primer valor de la fila seleccionada -->
<button id="displayValueBtn" class="btn btn-primary mt-3" style="display: none;">
    Primer Valor: <span id="firstValueDisplay"></span>
</button>








  <table id="dynamicTable" class="display" style="width:100%;">
    <thead>
      <tr id="tableHeaders"></tr>
    </thead>
    <tbody></tbody>
  </table>
  
  <!-- Botones adicionales de exportación -->
  <button id="exportExcelBtn">Excel</button>
  <button id="exportPdfBtn">Pdf</button>
  <button id="exportJsonBtn">Json</button>
  <button id="exportCsvBtn">Csv</button>
  <button id="exportXmlBtn">Xml</button>
  <button id="exportGSheetsBtn">G.Sheets</button>

  <!-- Modal para el formulario dinámico (Crear/Editar Registro) -->
  <div id="form-container" class="modal">
    <h3 id="form-title">Crear/Editar Registro</h3>
    <form id="dynamicForm"></form>
    <button type="button" id="saveBtn">Guardar</button>
    <button type="button" id="cancelBtn" class="close-modal">Cancelar</button>
  </div>
  
  <!-- Modal para SearchBuilder (Filtro Avanzado) -->
  <div id="searchPopup" class="modal">
    <h2>Filtro Avanzado</h2>
    <!-- Se asigna un tamaño mínimo y bordes para que el contenedor sea visible -->
    <div id="searchBuilderContainer" style="min-height:300px; border:1px solid #ccc; padding:5px; display:block;"></div>
    <button onclick="$.modal.close()">Cerrar</button>
  </div>
  
  <!-- Modal para Mostrar Mensajes de Depuración -->
  <div id="debugPopup" class="modal">
    <h2>Información de Depuración</h2>
    <div id="debugContent" style="padding:10px; border:1px solid #ccc; background:#f9f9f9;"></div>
    <button onclick="$.modal.close()">Cerrar</button>
  </div>

  <!-- Definir variable global para el nombre de la tabla -->
  <script>
    var tableNameGlobal = "<?php echo htmlspecialchars($table_name); ?>";
    window.tableNameGlobal = tableNameGlobal;
  </script>

  <!-- Incluir archivos JS personalizados (CRUD, DataTable, Exportación) -->
  <script src="js/MantencionGrillaFuncionesGenerales.js"></script>
  <script src="js/MantencionGrillaDataTable.js"></script>
  <script src="js/MantencionGrillaFuncionesExport.js"></script>

  <!-- Función para mostrar mensajes de depuración en un popup -->
  <script>
    function showDebugPopup(message) {
      $('#debugContent').empty().append('<p>' + message + '</p>');
      $('#debugPopup').modal();
    }
  </script>

 
  
</body>
</html>


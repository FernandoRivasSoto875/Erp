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
<?php include 'MantencionGrillaHead.php'; ?>
</head>
<body>
  <div class="container mt-4">
    <!-- Encabezado elegante justificado a la izquierda y compacto -->
    <header class="text-start my-2">
      <h4 style="font-size: 1.5rem; font-weight: 300; border-bottom: 1px solid #ddd; display: inline-block; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">
        <?php echo htmlspecialchars($table_name); ?>
      </h4>
    </header>
    
    <!-- Viñetas (Tabs) con iconos -->
    <ul class="nav nav-tabs" id="mainTabs" role="tablist">
      <!-- Tab 1: DataTable con icono de tabla -->
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tabla-tab" data-bs-toggle="tab" data-bs-target="#tabla" type="button" role="tab" aria-selected="true">
        <i class="fas fa-table" style="color: #007bff;"></i>
        </button>
      </li>
      <!-- Tab 2: Ficha con icono de formulario -->
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="datos-tab" data-bs-toggle="tab" data-bs-target="#datos" type="button" role="tab" aria-selected="false">
        <i class="fas fa-edit" style="color: #007bff;"></i>
        </button>



      </li>
      <!-- Tab 3: Informes con icono de reportes -->
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="informes-tab" data-bs-toggle="tab" data-bs-target="#informes" type="button" role="tab" aria-selected="false">
          <i class="fas fa-chart-bar"></i>
        </button>
      </li>
      <!-- Tab 4: Exportar con icono de exportación -->
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="exportar-tab" data-bs-toggle="tab" data-bs-target="#exportar" type="button" role="tab" aria-selected="false">
          <i class="fas fa-file-export"></i>
        </button>
      </li>
    </ul>
    
    
    <div class="tab-content mt-3" id="mainTabsContent">
      <!-- Tab 1: DataTable -->
      <div class="tab-pane fade show active" id="tabla" role="tabpanel" aria-labelledby="tabla-tab">
        <button id="displayValueBtn" class="btn btn-primary mt-3" style="display: none;">
          Primer Valor: <span id="firstValueDisplay"></span>
        </button>
        <table id="dynamicTable" class="display" style="width:100%;">
          <thead>
            <tr id="tableHeaders"></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      
      <!-- Tab 2: Ficha -->
      <div class="tab-pane fade" id="datos" role="tabpanel" aria-labelledby="datos-tab">
        <div id="form-container">
          <!-- Encabezado de ficha: título y botones (iconos) alineados en la parte superior -->
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h3 id="form-title" class="mb-0">Crear Registro</h3>
            <div id="buttonContainer">
              <button type="button" id="saveBtn" class="btn btn-success me-2" title="Guardar">
                <i class="fas fa-save"></i>
              </button>
              <button type="button" id="deleteBtn" class="btn btn-danger" title="Eliminar">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          <form id="dynamicForm"></form>
        </div>
      </div>
      
      <!-- Tab 3: Informes -->
      <div class="tab-pane fade" id="informes" role="tabpanel" aria-labelledby="informes-tab">
        <h3>Informes</h3>
        <p>Aquí se mostrarán los informes.</p>
      </div>
      
      <!-- Tab 4: Exportar -->
      <div class="tab-pane fade" id="exportar" role="tabpanel" aria-labelledby="exportar-tab">
        <h3>Exportar</h3>
        <button id="exportExcelBtn" class="btn btn-outline-secondary me-2" title="Exportar a Excel">
          <i class="fas fa-file-excel"></i>
        </button>
        <button id="exportPdfBtn" class="btn btn-outline-secondary me-2" title="Exportar a PDF">
          <i class="fas fa-file-pdf"></i>
        </button>
        <button id="exportJsonBtn" class="btn btn-outline-secondary me-2" title="Exportar a JSON">
          <i class="fas fa-file-code"></i>
        </button>
        <button id="exportCsvBtn" class="btn btn-outline-secondary me-2" title="Exportar a CSV">
          <i class="fas fa-file-csv"></i>
        </button>
        <button id="exportXmlBtn" class="btn btn-outline-secondary me-2" title="Exportar a XML">
          <i class="fas fa-file-code"></i>
        </button>
        <button id="exportGSheetsBtn" class="btn btn-outline-secondary" title="Exportar a Google Sheets">
          <i class="fab fa-google"></i>
        </button>
      </div>
    
    </div>
  </div>
  
  <!-- Botón "Add" flotante (visible solo en el tab DataTable) -->
  <button id="addBtn" class="btn btn-primary floating-add" title="Agregar">
    <i class="fas fa-plus"></i>
  </button>
  
  <!-- Modal para SearchBuilder -->
  <div id="searchPopup" class="modal">
    <h2>Filtro Avanzado</h2>
    <div id="searchBuilderContainer" style="min-height:300px; border:1px solid #ccc; padding:5px; display:block;"></div>
    <button onclick="$.modal.close()">Cerrar</button>
  </div>
  
  <!-- Modal para Depuración -->
  <div id="debugPopup" class="modal">
    <h2>Información de Depuración</h2>
    <div id="debugContent" style="padding:10px; border:1px solid #ccc; background:#f9f9f9;"></div>
    <button onclick="$.modal.close()">Cerrar</button>
  </div>
  
  <!-- Variable global para el nombre de la tabla -->
  <script>
    var tableNameGlobal = "<?php echo htmlspecialchars($table_name); ?>";
    window.tableNameGlobal = tableNameGlobal;
  </script>
  
  <!-- Inclusión de archivos JS personalizados -->
  <script src="js/MantencionGrillaFuncionesGenerales.js"></script>
  <script src="js/MantencionGrillaDataTable.js"></script>
  <script src="js/MantencionGrillaDataTableAdicionales.js"></script>
  <script src="js/MantencionGrillaFuncionesExport.js"></script>
  </body>
</html>

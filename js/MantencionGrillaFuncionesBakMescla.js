/*
  MantencionGrillaFunciones.js
  ====================================
  Funcionalidades:
  - Obtener el nombre de la tabla (tableName) desde la variable global (o la URL).
  - Cargar la grilla (columnas y datos) vía GET a la API (MantencionGrillaFetch.php).
  - Inicializar DataTables sin columna extra de "Acciones".
  - Mostrar el formulario (modal) para crear/editar registros y guardar mediante POST.
  - Exportar la grilla en formatos: Excel, PDF, JSON, CSV, XML y a Google Sheets.
  
  IMPORTANTE:
  Para Google Sheets deberás incluir en el HTML:
    <script src="https://apis.google.com/js/api.js"></script>
  Y configurar las credenciales: CLIENT_ID y API_KEY, obtenerlas en Google Cloud Console.
*/

// ----------------- INICIO: Configuración de la Exportación a Google Sheets -----------------
// Configuraciones para utilizar el API de Google Sheets
// Sustituye los valores de CLIENT_ID y API_KEY por los obtenidos de tu proyecto en Google Cloud Console.
var CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
var API_KEY = 'YOUR_API_KEY';
// Discovery doc URL para la API de Google Sheets.
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
// El alcance requerido para editar hojas de cálculo.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";








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
                




















// Función para inicializar el cliente de Google API.
function initClient(callback) {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Si no está autenticado, forzar el proceso de inicio de sesión.
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      gapi.auth2.getAuthInstance().signIn().then(callback);
    } else {
      callback();
    }
  }, function(error) {
    console.error("Error al inicializar gapi:", error);
    alert("Error al inicializar Google API Client: " + JSON.stringify(error, null, 2));
  });
}

// Función para crear y luego actualizar una hoja de cálculo con los datos.
function exportToGoogleSheets(tableName, tableColumns, tableData) {
  // Crear una nueva hoja de cálculo con el título basado en tableName.
  gapi.client.sheets.spreadsheets.create({
    properties: {
      title: tableName
    }
  }).then(function(response) {
    var spreadsheetId = response.result.spreadsheetId;
    // Formatear los datos: la primera fila serán las columnas; luego cada registro.
    var values = [tableColumns].concat(tableData.map(function(row) {
      return tableColumns.map(function(col) {
        return row[col];
      });
    }));
    var body = { values: values };
    // Actualizar la hoja de cálculo (por defecto la hoja se llama "Sheet1").
    gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: "Sheet1",
      valueInputOption: "USER_ENTERED",
      resource: body
    }).then(function(res) {
      alert("Datos exportados a Google Sheets.\nAccede al documento aquí:\nhttps://docs.google.com/spreadsheets/d/" + spreadsheetId);
    }, function(err) {
      console.error("Error al actualizar la hoja:", err);
      alert("Error al actualizar la hoja: " + err.result.error.message);
    });
  }, function(err) {
    console.error("Error al crear la hoja de cálculo:", err);
    alert("Error al crear la hoja de cálculo: " + err.result.error.message);
  });
}
// ----------------- FIN: Configuración de Exportación a Google Sheets -----------------

// ----------------- INICIO: Funcionalidades de la Grilla y Exportaciones -----------------

$(document).ready(function () {
    // Variables para almacenar el nombre de la tabla, los datos y las columnas.
    var tableName = "";
    var tableData = [];    // Datos obtenidos de la API.
    var tableColumns = []; // Nombres de columnas obtenidos de la API.

    // Se intenta obtener tableName desde la variable global "tableNameGlobal" inyectada en el HTML.
    if (typeof tableNameGlobal !== 'undefined' && tableNameGlobal) {
        tableName = tableNameGlobal;
        console.log("tableName obtenido de tableNameGlobal:", tableName);
    } else {
        // Como respaldo, se extrae el parámetro "table_name" de la URL.
        tableName = new URLSearchParams(window.location.search).get("table_name");
        console.log("tableName obtenido de la URL:", tableName);
    }

    // Verificar que tableName no esté vacío
    if (!tableName) {
        alert("Error: No se especificó una tabla válida.");
        return;
    }

    // Cargar la grilla mediante GET a la API (MantencionGrillaFetch.php)
    $.get("MantencionGrillaFetch.php", { table_name: tableName }, function (response) {
        console.log("Respuesta de la API:", response);
        if (!response || response.error) {
            alert(response.error || "Error desconocido al cargar datos.");
            return;
        }
        
        // Guardar columnas y datos en las variables globales.
        tableColumns = response.columns;
        tableData = response.data;

        // Generar dinámicamente los encabezados de la tabla.
        $('#tableHeaders').empty();
        $.each(tableColumns, function (i, column) {
            $('#tableHeaders').append("<th>" + column + "</th>");
        });
        // Se elimina la columna de "Acciones" para dejar solo los datos.

        // Inicializar DataTables con los datos.
        var dt = $('#dynamicTable').DataTable({
            data: tableData,
            columns: tableColumns.map(function (col) {
                return { data: col };
            }),
            language: {
                emptyTable: "No hay datos disponibles en la tabla"
            }
        });
        
        // --- Botón "Agregar Nuevo" ---
        $('#addBtn').on('click', function () {
            $('#form-title').text('Crear Registro');
            $('#dynamicForm').empty();
            // Genera un input para cada columna excepto la primera (asumida como ID).
            $.each(tableColumns, function (i, col) {
                if (i !== 0) {
                    $('#dynamicForm').append(
                        '<label for="' + col + '">' + col + ':</label> ' +
                        '<input type="text" id="' + col + '" name="' + col + '"><br>'
                    );
                }
            });
            // Campos ocultos para enviar el nombre de la tabla y la acción "create".
            $('#dynamicForm').append('<input type="hidden" name="table_name" value="' + tableName + '">');
            $('#dynamicForm').append('<input type="hidden" name="action" value="create">');
            $('#form-container').modal(); // Muestra el modal.
        });
        
        // --- Botón "Guardar" ---
        $('#saveBtn').on('click', function () {
            var formData = $('#dynamicForm').serialize();
            $.post("MantencionGrillaCrud.php", formData, function (resp) {
                alert(resp.success || resp.error);
                $.modal.close(); // Cierra el modal.
                dt.ajax.reload(); // Recargar la grilla (si se ha configurado ajax).
            }, "json").fail(function (xhr, status, error) {
                alert("Error al guardar datos: " + error);
            });
        });
        
    }).fail(function (xhr, status, error) {
        alert("Error al cargar datos desde el servidor: " + error);
    });
    
    // --- Exportar a Excel ---
    $('#exportExcelBtn').on('click', function () {
        var tableElement = document.getElementById("dynamicTable");
        var wb = XLSX.utils.table_to_book(tableElement, { sheet: tableName });
        XLSX.writeFile(wb, tableName + ".xlsx");
    });
    
    // --- Exportar a PDF ---
    $('#exportPdfBtn').on('click', function () {
        console.log("Iniciando exportación a PDF...");
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("Error: La librería jsPDF no se ha cargado correctamente.");
            console.error("window.jspdf o window.jspdf.jsPDF no está definido.");
            return;
        }
        var doc = new window.jspdf.jsPDF();
        console.log("Documento PDF creado.");
        var head = [tableColumns];
        var body = tableData.map(function(row) {
            return tableColumns.map(function(col) {
                return row[col];
            });
        });
        console.log("Head para PDF:", head);
        console.log("Body para PDF:", body);
        doc.autoTable({
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
            margin: { top: 20 },
            didDrawPage: function (data) {
                doc.text(tableName, data.settings.margin.left, 10);
            }
        });
        console.log("Tabla agregada al PDF. Iniciando descarga...");
        doc.save(tableName + ".pdf");
        console.log("Exportación a PDF completada.");
    });
    
    // --- Exportar a JSON ---
    $('#exportJsonBtn').on('click', function () {
        var jsonStr = JSON.stringify(tableData, null, 2);
        var blob = new Blob([jsonStr], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = tableName + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // --- Exportar a CSV ---
    $('#exportCsvBtn').on('click', function () {
        if (!tableColumns.length || !tableData.length) {
            alert("No hay datos para exportar");
            return;
        }
        var csvContent = tableColumns.join(",") + "\n";
        tableData.forEach(function (row) {
            var rowArray = tableColumns.map(function (col) {
                var cell = (row[col] !== undefined) ? row[col] : "";
                cell = cell.toString().replace(/"/g, '""');
                return '"' + cell + '"';
            });
            csvContent += rowArray.join(",") + "\n";
        });
        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = tableName + ".csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // --- Exportar a XML ---
    $('#exportXmlBtn').on('click', function () {
        // Construir el XML como cadena, con una raíz y elementos para cada registro.
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<records>\n';
        tableData.forEach(function(row) {
            xml += "\t<record>\n";
            tableColumns.forEach(function(col) {
                var value = (row[col] !== undefined) ? row[col] : "";
                xml += "\t\t<" + col + ">" + value + "</" + col + ">\n";
            });
            xml += "\t</record>\n";
        });
        xml += '</records>';
        
        // Crear un Blob con el contenido XML y descargarlo.
        var blob = new Blob([xml], { type: "application/xml" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = tableName + ".xml";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // --- Exportar a Google Sheets ---
    $('#exportGSheetsBtn').on('click', function () {
        // Verificar que la librería gapi esté cargada.
        if (typeof gapi === 'undefined') {
            alert("La librería Google API (gapi) no se ha cargado. Asegúrate de incluir <script src='https://apis.google.com/js/api.js'></script> en el HTML.");
            return;
        }
        // Cargar los módulos client y auth2, y luego iniciar el cliente.
        gapi.load('client:auth2', function() {
            initClient(function() {
                exportToGoogleSheets(tableName, tableColumns, tableData);
            });
        });
    });
});

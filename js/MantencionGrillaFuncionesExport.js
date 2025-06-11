/*
  MantencionGrillaFuncionesExport.js
  ====================================
  Funcionalidades:
  - Exportar la grilla en formatos: Excel, PDF, JSON, CSV, XML y Google Sheets.
  Se basa en las variables globales:
      window.tableNameGlobal (string)
      window.tableColumns    (array)
      window.tableData       (array)
*/

$(document).ready(function () {
    // Exportar a Excel (usando el DOM de la tabla)
    $('#exportExcelBtn').on('click', function () {
        var tableElement = document.getElementById("dynamicTable");
        if (!tableElement) {
            alert("No se encontró la tabla para exportar a Excel.");
            return;
        }
        var wb = XLSX.utils.table_to_book(tableElement, { sheet: window.tableNameGlobal });
        XLSX.writeFile(wb, window.tableNameGlobal + ".xlsx");
    });

    // Exportar a PDF
    $('#exportPdfBtn').on('click', function () {
        if (!window.tableColumns || !window.tableData) {
            alert("No hay datos para exportar a PDF.");
            return;
        }
        var doc = new window.jspdf.jsPDF();
        var head = [window.tableColumns];
        var body = window.tableData.map(function (row) {
            return window.tableColumns.map(function (col) {
                return row[col];
            });
        });
        doc.autoTable({
            head: head,
            body: body,
            theme: 'grid',
            margin: { top: 20 }
        });
        doc.save(window.tableNameGlobal + ".pdf");
    });

    // Exportar a JSON
    $('#exportJsonBtn').on('click', function () {
        if (!window.tableData) {
            alert("No hay datos para exportar a JSON.");
            return;
        }
        var jsonStr = JSON.stringify(window.tableData, null, 2);
        var blob = new Blob([jsonStr], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = window.tableNameGlobal + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Exportar a CSV
    $('#exportCsvBtn').on('click', function () {
        // Verificar que existan los datos necesarios
        if (!window.tableColumns || !Array.isArray(window.tableColumns) || window.tableColumns.length === 0 ||
            !window.tableData || !Array.isArray(window.tableData) || window.tableData.length === 0) {
            alert("No hay datos para exportar a CSV.");
            return;
        }
        // Generar la línea de encabezado (CSV)
        var csvContent = window.tableColumns.join(",") + "\r\n";
        // Generar una línea por cada registro
        window.tableData.forEach(function (row) {
            var rowArray = window.tableColumns.map(function (col) {
                var cell = (row[col] !== undefined && row[col] !== null) ? row[col].toString() : "";
                // Escapar las comillas
                cell = cell.replace(/"/g, '""');
                return '"' + cell + '"';
            });
            csvContent += rowArray.join(",") + "\r\n";
        });
        console.log("CSV Content:\n" + csvContent);
        
        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        // Soporte para IE
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, window.tableNameGlobal + ".csv");
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) {
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", window.tableNameGlobal + ".csv");
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                window.open(URL.createObjectURL(blob));
            }
        }
    });

    // Exportar a XML
    $('#exportXmlBtn').on('click', function () {
        if (!window.tableData || !window.tableColumns) {
            alert("No hay datos para exportar a XML.");
            return;
        }
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
        window.tableData.forEach(function (row) {
            xml += "\t<record>\n";
            window.tableColumns.forEach(function (col) {
                var value = (row[col] !== undefined) ? row[col] : "";
                xml += "\t\t<" + col + ">" + value + "</" + col + ">\n";
            });
            xml += "\t</record>\n";
        });
        xml += '</records>';
        var blob = new Blob([xml], { type: "application/xml" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = window.tableNameGlobal + ".xml";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Exportar a Google Sheets
    $('#exportGSheetsBtn').on('click', function () {
        if (typeof gapi === 'undefined') {
            alert("La librería Google API (gapi) no se ha cargado.");
            return;
        }
        gapi.load('client:auth2', function () {
            initClient(function () {
                exportToGoogleSheets(window.tableNameGlobal, window.tableColumns, window.tableData);
            });
        });
    });
});

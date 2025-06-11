 
  function showDebugPopup(message) {
    $('#debugContent').empty().append('<p>' + message + '</p>');
    $('#debugPopup').modal();
  }
   
   $(document).ready(function() {
    // Modo "add": Al pulsar el botón "Add" flotante
    $("#addBtn").on("click", function() {
      var mode = "add";
      $('#dynamicForm').empty();
      if (window.dtColumns) {
        window.dtColumns.forEach(function(col, index) {
          var key = (col.data !== undefined) ? col.data : index;
          $('#dynamicForm').append(
            '<div class="mb-3 d-flex align-items-center">' +
            '<label class="form-label me-2" style="min-width:100px;">' + key + ':</label>' +
            '<input type="text" class="form-control" name="' + key + '" value="" style="flex: 1;">' +
            '</div>'
          );
        });
      } else {
        $('#dynamicForm').html('');
      }
      $("#deleteBtn").hide();
      $("#form-title").text("Crear Registro");
      var fichaTabEl = document.querySelector("#datos-tab");
      var tab = new bootstrap.Tab(fichaTabEl);
      tab.show();
    });
    
    // Modo "editar": Al hacer clic en una fila del DataTable
    $("#dynamicTable tbody").on("click", "tr", function() {
      var mode = "edit";
      var table = $("#dynamicTable").DataTable();
      var data = table.row(this).data();
      if (!data) return;
      $('#dynamicForm').empty();
      if (window.dtColumns) {
        window.dtColumns.forEach(function(col, index) {
          var key = (col.data !== undefined) ? col.data : index;
          var value = (data[key] !== undefined) ? data[key] : "";
          if (window.baseColumns && window.baseColumns.indexOf(key) > -1) {
            $('#dynamicForm').append(
              '<div class="mb-3 d-flex align-items-center">' +
              '<label class="form-label me-2" style="min-width:100px;">' + key + ':</label>' +
              '<input type="text" class="form-control" name="' + key + '" value="' + value + '" style="flex: 1;">' +
              '</div>'
            );
          } else {
            $('#dynamicForm').append(
              '<div class="mb-3 d-flex align-items-center">' +
              '<label class="form-label me-2" style="min-width:100px;">' + key + ':</label>' +
              '<p class="form-control-plaintext mb-0" style="flex: 1;">' + value + '</p>' +
              '</div>'
            );
          }
        });
      } else {
        $.each(data, function(i, val) {
          $('#dynamicForm').append(
            '<div class="mb-3 d-flex align-items-center">' +
            '<label class="form-label me-2" style="min-width:100px;">Campo ' + (i+1) + ':</label>' +
            '<p class="form-control-plaintext mb-0" style="flex: 1;">' + val + '</p>' +
            '</div>'
          );
        });
      }
      $("#deleteBtn").show();
      $("#form-title").text("Editar Registro");
    });
    
    // Botón "Eliminar"
    $("#deleteBtn").on("click", function() {
      alert("Funcionalidad de eliminación pendiente de implementación.");
    });
    
    // Mostrar u ocultar el botón "Add" flotante dependiendo del tab activo
    $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
      if(e.target.id === 'tabla-tab') {
        $('#addBtn').show();
      } else {
        $('#addBtn').hide();
      }
    });
    
    if ($('#tabla').hasClass('active')) {
      $('#addBtn').show();
    } else {
      $('#addBtn').hide();
    }
  });
 


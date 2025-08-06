// File: js/FormularioContacto.js
$(document).ready(function() {
    // Inicializar todos los campos Select2
    $('.select2-field').each(function() {
        const tabla = $(this).data('tabla');
        const campo = $(this).data('campo');
        
        $(this).select2({
            placeholder: $(this).data('placeholder') || 'Seleccione una opción',
            allowClear: true,
            ajax: {
                url: 'ajax/busqueda_select2.php',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        q: params.term, // término de búsqueda
                        tabla: tabla,
                        campo: campo
                    };
                },
                processResults: function (data) {
                    // Transforma la data al formato que Select2 espera
                    return {
                        results: data
                    };
                },
                cache: true
            },
            minimumInputLength: 1,
            language: "es" // Asegúrate de tener el archivo de idioma de Select2 si es necesario
        });
    });

    // Activar tooltips de Bootstrap
    $('[data-toggle="tooltip"]').tooltip();
});

<?php
// =============================
// FORMULARIO GENÉRICO UNIVERSAL EMBEBIDO (CON INCLUDES)
// =============================
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Genérico Embebido</title>
    <link rel="stylesheet" href="css/estilos.css">
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const main = document.getElementById('formulario-dinamico-main');
        if (main) {
            fetch('https://saludenterreno.cl/ErpQa/formulariodinamico.php?archivo=json/formulariogenerico2.json')
                .then(resp => resp.text())
                .then(html => {
                    // Extraer y evaluar los bloques <script> con window.fields y window.validacionesJSON usando regex
                    const regex = /<script[^>]*>([\s\S]*?window\.(fields|validacionesJSON)[\s\S]*?)<\/script>/gi;
                    let match;
                    while ((match = regex.exec(html)) !== null) {
                        try { eval(match[1]); } catch(e) { console.error('Error evaluando script:', e); }
                    }
                    main.innerHTML = html;
                    // Esperar a que el JS esté cargado si es necesario
                    if (window.inicializarFormularioDinamico) {
                        window.inicializarFormularioDinamico();
                    } else {
                        var intv = setInterval(function() {
                            if (window.inicializarFormularioDinamico) {
                                clearInterval(intv);
                                window.inicializarFormularioDinamico();
                            }
                        }, 100);
                    }
                })
                .catch(err => { main.innerHTML = '<p style="color:red">No se pudo cargar el formulario dinámico embebido.</p>'; });
        }
    });
    </script>
    <!-- Cargar los JS necesarios para el formulario dinámico -->
    <script src="https://saludenterreno.cl/ErpQa/js/formulariodinamico.js"></script>
    <!-- Agrega aquí otros JS necesarios si el formulario los requiere -->
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
    <main id="formulario-dinamico-main">
        <iframe src="https://saludenterreno.cl/ErpQa/formulariodinamico.php?archivo=json/formulariogenerico2.json" width="100%" height="900" frameborder="0" style="border:none;min-height:600px;"></iframe>
    </main>
    <?php include 'footer.php'; ?>
</body>
</html>

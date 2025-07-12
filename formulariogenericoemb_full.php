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
            fetch('https://saludenterreno.cl/ErpQa/formulariodinamico.php?archivo=formulariogenerico2.json')
                .then(resp => resp.text())
                .then(html => { main.innerHTML = html; })
                .catch(err => { main.innerHTML = '<p style=\"color:red\">No se pudo cargar el formulario dinámico embebido.</p>'; });
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
        <div style="text-align:center;padding:2em;">
            <span>Cargando formulario embebido...</span>
        </div>
    </main>
    <?php include 'footer.php'; ?>
</body>
</html>

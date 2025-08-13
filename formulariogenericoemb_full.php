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
    <!-- Cargar los JS necesarios para el formulario dinámico -->
    <script src="https://saludenterreno.cl/ErpQa/js/formulariodinamico.js"></script>
    <!-- Agrega aquí otros JS necesarios si el formulario los requiere -->
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
    <main id="formulario-dinamico-main">
        <iframe src="https://saludenterreno.cl/ErpQa/formulariodinamico.php?archivo=json/formulariogenerico2.json"
            style="width:100%;min-height:400px;max-height:90vh;border:none;overflow:auto;"
            allowfullscreen
            loading="lazy"
            title="Formulario Dinámico Embebido"></iframe>
    </main>
    <?php include 'footer.php'; ?>
</body>
</html>

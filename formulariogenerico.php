<?php
// Autor: Fernando Rivas S.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\contacto.php
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Contactos</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>

    <main>
        <?php
        // Solo el nombre del archivo JSON
        $_GET['archivo'] = 'formulariogenerico.json';

        if (file_exists('formulariodinamico.php')) {
            include 'formulariodinamico.php';
        } else {
            echo "<p>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</p>";
        }
        ?>
    </main>

    <?php include 'footer.php'; ?>
</body>
</html> 
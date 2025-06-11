<?php
// Autor: Fernando Rivas S.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\contacto.php
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
        // Leer el archivo JSON de parámetros
        $parametros = json_decode(file_get_contents(__DIR__ . '/json/parametro.json'), true);
        if (isset($parametros['NombreSitio'])) {
            echo '<div style="text-align:center; font-weight:bold; margin-bottom:20px;">' . htmlspecialchars($parametros['NombreSitio']) . '</div>';
        }
        // Ruta absoluta del archivo JSON para el formulario dinámico
        $_GET['archivo'] = __DIR__ . '/json/contactoformulario.json';
        if (file_exists('formulario_dinamico.php')) {
            include 'formulario_dinamico.php';
        } else {
            echo "<p>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</p>";
        }
        ?>
    </main>
cosa
    <?php include 'footer.php'; ?>
</body>
</html>
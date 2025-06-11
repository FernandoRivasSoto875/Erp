<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Contactos</title>
    <link rel="stylesheet" href="css/estilos.css"> <!-- Enlace al archivo de estilos -->
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
      <main>
          <?php
        // Ruta absoluta del archivo JSON
        $_GET['archivo'] = __DIR__ . '/json/contactoFormulario.json';
        // Verificar si formulario_dinamico.php existe
        if (file_exists('formulario_dinamico.php')) {
            // Pasar el archivo JSON como parámetro
          //  $_GET['archivo'] = $archivoJson;
            include 'formulario_dinamico.php';
        } else {
            echo "<p>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</p>";
        }
        ?>
    </main>

    <?php include 'footer.php'; ?>
</body>
</html>


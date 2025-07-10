<!DOCTYPE html>
<html lang="es">
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
    <main>
          <?php
        // Ruta absoluta del archivo JSON
        $_GET['archivo'] = __DIR__ . '/json/formulariogenerico.json';

        // Verificar si formulario_dinamico.php existe
        if (file_exists('formulariodinamico.php')) {
            // Pasar el archivo JSON como parámetro
          //  $_GET['archivo'] = $archivoJson;
            include 'formulariodinamico.php';
        } else {
            echo "<p>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</p>";
        }
        ?>
    </main>
    <?php include 'footer.php'; ?>
</body>
</html>


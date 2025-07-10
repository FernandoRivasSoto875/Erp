<?php
// =============================
// FORMULARIO GENÉRICO UNIVERSAL
// =============================
// Definir el archivo JSON antes de cualquier salida
$_GET['archivo'] = __DIR__ . '/json/FormularioContacto.json';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- ... -->
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
    <main>
        <?php
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


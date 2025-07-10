<?php
// Autor: Fernando Rivas S.

// --- PASO 1: CONFIGURACIÓN Y LÓGICA DE NEGOCIO ---
// Forzamos al sistema a usar el archivo JSON que queremos para esta página.
$_GET['archivo'] = 'formulariogenerico.json';

// Incluimos el "motor" del formulario. Este archivo contiene session_start(),
// procesa los datos del POST y prepara todas las variables necesarias.
// Como se ejecuta ANTES de cualquier HTML, session_start() funcionará.
require_once 'formulariodinamicologica.php';

// --- PASO 2: INICIO DE LA PÁGINA HTML ---
// Ahora que toda la lógica ha terminado, podemos empezar a enviar la página.
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Contactos</title>
    <link rel="stylesheet" href="css/estilos.css">
    <?php
        // Incluimos los assets (CSS/JS) que el formulario dinámico pueda necesitar.
        // Esto se hace aquí para mantener el <head> limpio.
        if (function_exists('imprimir_assets_formulario')) {
            imprimir_assets_formulario();
        }
    ?>
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>

    <main>
        <?php
        // --- PASO 3: RENDERIZADO DEL FORMULARIO ---
        // Incluimos el archivo que se encarga de DIBUJAR el formulario.
        // Este archivo usará las variables que ya fueron preparadas en el PASO 1.
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
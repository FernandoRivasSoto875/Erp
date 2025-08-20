<?php
// =============================
// FORMULARIO GENÉRICO UNIVERSAL
// =============================
// Definir el archivo JSON antes de cualquier salida
$_GET['archivo'] = __DIR__ . '/json/FormularioContacto.json';
require_once __DIR__ . '/formulariodinamicofunciones.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Genérico</title>
    <link rel="stylesheet" href="css/estilos.css">
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const main = document.getElementById('formulario-dinamico-main');
        if (main) {
            fetch('formulariodinamico.php?archivo=formulariogenerico.json')
                .then(resp => resp.text())
                .then(html => { main.innerHTML = html; })
                .catch(err => { main.innerHTML = '<p style="color:red">No se pudo cargar el formulario dinámico.</p>'; });
        }
    });
    </script>
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>
    <main id="formulario-dinamico-main">
        <div style="text-align:center;padding:2em;">
            <span>Cargando formulario...</span>
        </div>
    </main>
    <?php include 'footer.php'; ?>
</body>
</html>


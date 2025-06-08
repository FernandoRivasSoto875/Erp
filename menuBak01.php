<?php
// Leer el archivo JSON del menú
$menu_json = file_get_contents('json/menu.json');
$menu_items = json_decode($menu_json, true);

// Leer el archivo JSON de parámetros
$parametro_json = file_get_contents('json/parametro.json');
$parametros = json_decode($parametro_json, true);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú</title>
    <link rel="stylesheet" href="css/style.css"> <!-- Enlace a estilos generales -->
</head>
<body> 
    



    <!-- Botón hamburguesa para móviles/tabletas -->
    <div class="menu-toggle">
        <img src="imagenes/icono.png" alt="Menú" class="icono-menu">
    </div>

    <!-- Menú -->
    <nav class="menu">
        <!-- Generación dinámica del menú desde menu.json -->
        <ul>
            <?php foreach ($menu_items as $item): ?>
                <li class="menu-item">
                    <a href="<?php echo htmlspecialchars($item['enlace']); ?>">
                        <?php echo htmlspecialchars($item['titulo']); ?>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </nav>

   

    <!-- JavaScript para funcionalidad del menú -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const menuToggle = document.querySelector(".menu-toggle");
            const menuNav = document.querySelector(".menu");

            if (menuToggle && menuNav) {
                menuToggle.addEventListener("click", function() {
                    menuNav.classList.toggle("active"); // Mostrar/ocultar menú
                });
            }
        });
    </script>
</body>
</html>


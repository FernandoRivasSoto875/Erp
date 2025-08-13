<?php
// Cargar las opciones del menú desde el archivo JSON
$menu_items = [];
if (file_exists('json/menuintranet.json')) {
    $menu_items = json_decode(file_get_contents('json/menuintranet.json'), true);
}

// Cargar las descargas desde el archivo JSON
$descargables = [];
if (file_exists('json/Descargable.json')) {
    $descargables = json_decode(file_get_contents('json/Descargable.json'), true);
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Descargables</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <?php include 'header.php'; ?>

    <!-- Menú dinámico desde menuintranet.json -->
    <nav style="display: flex; justify-content: center; background-color: #007bff; padding: 10px 0;">
        <?php foreach ($menu_items as $item): ?>
            <a href="<?php echo htmlspecialchars($item['enlace']); ?>" 
               style="text-decoration: none; color: white; padding: 10px 20px; font-weight: bold; transition: background-color 0.3s ease;">
               <?php echo htmlspecialchars($item['titulo']); ?>
            </a>
        <?php endforeach; ?>
    </nav>

    <!-- Contenido principal -->
    <main>
        <h2>Descargas Disponibles</h2>
        <?php if (!empty($descargables)): ?>
            <ul style="list-style-type: none; padding: 0;">
                <?php foreach ($descargables as $descarga): ?>
                    <li style="margin-bottom: 10px;">
                        <a href="<?php echo htmlspecialchars($descarga['archivo']); ?>" download style="text-decoration: none; color: #007bff; font-weight: bold;">
                            📄 <?php echo htmlspecialchars($descarga['titulo']); ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php else: ?>
            <p style="color: red; text-align: center;">No hay archivos disponibles para descargar.</p>
        <?php endif; ?>
    </main>

    <?php include 'footer.php'; ?>
</body>
</html>

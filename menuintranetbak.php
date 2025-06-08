<?php
// Leer el archivo JSON del menú
$menu_json = file_get_contents('json/menuintranet.json');
$menu_items = json_decode($menu_json, true);
?>

<nav style="display: flex; justify-content: center; background-color: #007bff; padding: 10px 0;">
    <?php foreach ($menu_items as $item): ?>
        <a href="<?php echo htmlspecialchars($item['enlace']); ?>" 
           style="text-decoration: none; color: white; padding: 10px 20px; font-weight: bold; transition: background-color 0.3s ease;">
           <?php echo htmlspecialchars($item['titulo']); ?>
        </a>
    <?php endforeach; ?>
    
</nav>

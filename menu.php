<?php
include 'funcionessql.php'; // Archivo que contiene la función conexionBd()

// 1. Conexión a la base de datos y lectura de datos del menú
$conn = conexionBd();
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

$sql = "SELECT MenuId, MenuOrden, MenuTitulo, MenuEnlace, MenuPadreId 
        FROM Menu where MenuGrupo=1
        ORDER BY MenuPadreId, MenuOrden";
$result = $conn->query($sql);

$menu_items = array();
if ($result->num_rows > 0) {
    // Almacenar resultados en un array
    while ($row = $result->fetch_assoc()) {
        $menu_items[] = $row;
    }
} else {
    die("No se encontraron ítems en la tabla Menu.");
}

// 2. Convertir los datos a formato JSON
$jsonData = json_encode($menu_items);

// Si en un futuro deseas usar un JSON externo, puedes comentar la parte anterior y descomentar la siguiente línea:
// $jsonData = file_get_contents('menu.json');

// 3. Decodificar el JSON para trabajar con él (como array asociativo)
$menuArray = json_decode($jsonData, true);

/* FUNCIÓN PARA GENERAR EL MENÚ DE FORMA RECURSIVA A PARTIR DEL ARRAY obtenido del JSON */
function construirMenu($items, $padreId = 0) {
    $html = '';

    // Filtrar los elementos que tienen como padre el id proporcionado
    $subItems = array_filter($items, function ($item) use ($padreId) {
        return $item['MenuPadreId'] == $padreId;
    });

    // Si hay subelementos, construir el HTML
    if (!empty($subItems)) {
        $html .= '<ul>'; // Abrimos el nivel del menú
        foreach ($subItems as $subItem) {
            $html .= '<li>';
            $html .= '<a href="' . htmlspecialchars($subItem['MenuEnlace']) . '">'
                   . htmlspecialchars($subItem['MenuTitulo']) . '</a>';
            // Llamada recursiva para construir submenús
            $html .= construirMenu($items, $subItem['MenuId']);
            $html .= '</li>';
        }
        $html .= '</ul>'; // Cerramos el nivel del menú
    }

    return $html;
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú Dinámico desde JSON</title>
    <style>
        /* Estilos básicos para el menú */
        nav.menu {
            background-color: #4169E1;
            padding: 10px;
        }

        nav.menu ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        nav.menu > ul {
            display: flex;
            justify-content: center;
        }

        nav.menu li {
            position: relative;
            margin: 0 10px;
        }

        nav.menu a {
            text-decoration: none;
            color: white;
            padding: 5px 10px;
            display: block;
        }

        /* Los submenús se ocultan por defecto */
        nav.menu ul ul {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background-color: #556B2F;
            padding: 10px;
            z-index: 1000;
        }

        /* Al pasar el mouse sobre un elemento padre, se despliega su submenú */
        nav.menu li:hover > ul {
            display: block;
        }
    </style>
</head>
<body>

    <nav class="menu">
        <?php
        // Generar el menú dinámico a partir del array obtenido del JSON
        echo construirMenu($menuArray);
        ?>
    </nav>

</body>
</html>

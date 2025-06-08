<?php
// Leer el archivo JSON del menú
$menu_json = file_get_contents('json/menu.json');
$menu_items = json_decode($menu_json, true);

// Leer el archivo JSON de parámetros
$parametro_json = file_get_contents('json/parametro.json');
$parametros = json_decode($parametro_json, true);

// Validación de datos
if (!isset($parametros['NumeroWhatsApp'])) {
    die('Error: No se encontró el campo NumeroWhatsApp en parametro.json.');
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú Dinámico</title>
    <style>
        /* Menú principal */
        nav {
            display: flex;
            justify-content: center; /* Centrar en pantallas grandes */
            align-items: center;
            background-color: #007bff;
            padding: 10px 0;
            position: relative; /* Posición relativa para el botón de WhatsApp */
        }

        nav a {
            text-decoration: none;
            color: white;
            padding: 10px 20px;
            font-weight: bold;
            transition: background-color 0.3s ease;
        }

        nav a:hover {
            background-color: #0056b3;
            border-radius: 5px;
        }

        /* Botón de WhatsApp */
        .whatsapp-button {
            position: absolute;
            right: 20px; /* Alinear al lado derecho del menú */
            top: 45px; /* Espaciado hacia abajo */
            width: 70px;
            height: 70px;
            border-radius: 50%;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
            animation: girar 1.5s infinite ease-in-out;
        }

        @keyframes girar {
            0% {
                transform: rotate(0deg);
            }
            50% {
                transform: rotate(15deg);
            }
            100% {
                transform: rotate(-15deg);
            }
        }

        /* Ajustes para dispositivos móviles */
        @media screen and (max-width: 768px) {
            nav {
                justify-content: flex-start; /* Justificar a la izquierda en móviles */
                padding-left: 10px; /* Espaciado desde el borde izquierdo */
            }

            nav a {
                padding: 5px 10px; /* Reducir espacio en dispositivos móviles */
                font-size: 14px; /* Reducir tamaño de fuente */
            }

            .whatsapp-button {
                width: 60px;
                height: 60px;
            }
        }

        @media screen and (max-width: 480px) {
            nav a {
                font-size: 12px;
                padding: 5px;
            }

            .whatsapp-button {
                width: 50px;
                height: 50px;
            }
        }
    </style>
</head>
<body>
    <!-- Menú Horizontal -->
    <nav>
        <!-- Generación dinámica del menú -->
        <?php foreach ($menu_items as $item): ?>
            <a href="<?php echo htmlspecialchars($item['enlace']); ?>">
                <?php echo htmlspecialchars($item['titulo']); ?>
            </a>
        <?php endforeach; ?>

        <!-- Botón de WhatsApp al lado derecho con un espacio hacia abajo -->
        <a href="https://wa.me/<?php echo $parametros['NumeroWhatsApp']; ?>?text=<?php echo urlencode($parametros['MensajeWhatsApp'] ?? 'Hola, estoy interesado en obtener más información.'); ?>" 
           target="_blank" title="Conéctate con nosotros en WhatsApp">
            <img src="imagenes/whatsapp_iconTransparente.png" alt="WhatsApp" class="whatsapp-button">
        </a>
    </nav>
</body>
</html>

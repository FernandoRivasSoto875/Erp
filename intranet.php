<?php
$valid_user = "Intranet";
$valid_password = "Set777";
$email_destino = "FernandoRivasSoto@Gmail.com";
$email_copia = "Gestion@saludenterreno.cl";

$is_authenticated = false;

// Función para enviar correos
function enviarCorreo($usuario, $estado, $ip, $destino, $copia) {
    $asunto = "Registro de acceso a Intranet";
    $mensaje = "Detalles del intento de acceso:\n\n";
    $mensaje .= "Usuario ingresado: $usuario\n";
    $mensaje .= "Estado: $estado\n";
    $mensaje .= "IP de conexión: $ip\n";
    $cabeceras = "From: Intranet@saludenterreno.cl\r\n";
    $cabeceras .= "Cc: $copia\r\n";
    mail($destino, $asunto, $mensaje, $cabeceras);
}

// Manejar inicio de sesión
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = htmlspecialchars(trim($_POST['username']));
    $password = htmlspecialchars(trim($_POST['password']));
    $user_ip = $_SERVER['REMOTE_ADDR'];
    
    if ($username === $valid_user && $password === $valid_password) {
        $is_authenticated = true;
        enviarCorreo($username, "Acceso exitoso", $user_ip, $email_destino, $email_copia);
    } else {
        enviarCorreo($username, "Acceso fallido", $user_ip, $email_destino, $email_copia);
        echo "<p style='color: red; text-align: center;'>Usuario o contraseña inválidos.</p>";
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Intranet</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <!-- Mantener el menú externo activo -->
    <?php include !$is_authenticated ? 'menu.php' : 'menuintranet.php'; ?>

    <!-- Contenido principal -->
    <main>
        <?php if (!$is_authenticated): ?>
            <!-- Formulario de inicio de sesión -->
            <form method="POST" action="intranet.php" style="max-width: 400px; margin: auto; padding: 20px; background: rgba(255, 255, 255, 0.9); border-radius: 10px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="text-align: center;">Intranet - Inicio de Sesión</h2>
                <label for="username" style="display: block; margin-bottom: 5px; font-weight: bold;">Usuario:</label>
                <input type="text" id="username" name="username" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                <label for="password" style="display: block; margin-bottom: 5px; font-weight: bold;">Contraseña:</label>
                <input type="password" id="password" name="password" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                <button type="submit" style="width: 100%; padding: 10px; background-color: #007bff; color: white; font-weight: bold; border: none; border-radius: 5px; cursor: pointer;">Ingresar</button>
            </form>
        <?php else: ?>
            <!-- Mensaje de bienvenida después de autenticación -->
            <div style="text-align: center; margin: 20px;">
                <h2 style="color: #0056b3;">Bienvenido a la Intranet</h2>
                <p style="font-size: 1.2em;">Navega por el menú para acceder a las diferentes opciones.</p>
            </div>
        <?php endif; ?>
    </main>

    <?php include 'footer.php'; ?>
</body>
</html>

 

<?php
// Leer el archivo JSON desde la carpeta "config"
$parametros = json_decode(file_get_contents('json/parametro.json'), true);

// Iniciar sesión
session_start();

// Revisar si el usuario ya está autenticado
$user_photo = isset($_SESSION['user_photo']) ? $_SESSION['user_photo'] : 'imagenes/user-default.png';
$user_name = isset($_SESSION['user_name']) ? $_SESSION['user_name'] : '';
$user_email = isset($_SESSION['user_email']) ? $_SESSION['user_email'] : '';
?>

<header>
    <!-- Contenedor para el logo y el título -->
    <div class="header-container">
        <!-- Logo -->
        <img src="imagenes/logo_empresa.png" alt="Logo de la Empresa" class="header-logo" 
             onclick="window.location.href='<?php echo $parametros['IntranetUrl']; ?>';"> <!-- Redirigir al URL al hacer clic -->
        
        <!-- Título al lado derecho del logo -->
        <h1 class="header-title">
            <?php echo $parametros['TituloHeader']; ?>
        </h1>
    </div>

    <!-- Botones de conexión o ícono de usuario -->
    <div id="login-buttons" style="position: absolute; top: 10px; right: 10px;">
        <?php if (empty($_SESSION['user_photo'])) { ?>
            <!-- Mostrar botones solo si el usuario no está conectado -->
            <button onclick="window.location.href='login-google.php'" 
                style="margin-right: 10px; cursor: pointer; padding: 10px; background-color: #DB4437; color: #fff; border: none; border-radius: 5px;">
                Conectar con Google
            </button>
            <button onclick="window.location.href='login-facebook.php'" 
                style="cursor: pointer; padding: 10px; background-color: #4267B2; color: #fff; border: none; border-radius: 5px;">
                Conectar con Facebook
            </button>
        <?php } else { ?>
            <!-- Mostrar la foto de perfil si el usuario ya está conectado -->
            <img src="<?php echo $user_photo; ?>" id="profile-pic" alt="Usuario" 
                 style="width: 50px; height: 50px; border-radius: 50%; cursor: pointer;">
            <p style="color: #333; font-size: 12px; margin-top: 5px; text-align: center;">
                <?php echo $user_name; ?>
            </p>
        <?php } ?>
    </div>
</header>

<script>
    // Al hacer clic en el ícono de usuario conectado
    document.getElementById("profile-pic")?.addEventListener("click", function () {
        alert("¡Hola, estás conectado como <?php echo $user_name; ?>!");
    });
</script>

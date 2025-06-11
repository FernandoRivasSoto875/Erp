<?php
// Leer el archivo JSON desde la carpeta "config"
$parametros = json_decode(file_get_contents('json/parametro.json'), true);
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

    <!-- Contenedor para el texto adicional -->
    <div class="header-extra-text">
        <p class="header-text">
            "<?php echo $parametros['TextoHeader']; ?>"
        </p>
    </div>
</header>

<style>
    /* Estilo dinámico aplicado directamente en los elementos del header */
    .header-title {
        color: <?php echo $parametros['ColorTituloHeader']; ?>; /* Color dinámico del TituloHeader */
    }

    .header-text {
        color: <?php echo $parametros['ColorTextoHeader']; ?>; /* Color dinámico del TextoHeader */
    }
</style>

 


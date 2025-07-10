<?php
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA. NI ESPACIOS, NI LÍNEAS EN BLANCO.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Paso 1: Incluir toda la lógica de negocio desde el archivo PHP dedicado.
require_once 'formulariodinamicologica.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Dinámico</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/formulariodinamico.css">
</head>
<body>
<div class="container mt-4">
        <!-- INICIO: MODIFICACIÓN -->
    <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <h2 class="mb-0 mr-3"><?php 
                // Mostrar el título desde el JSON de parámetros si existe
                echo htmlspecialchars($json['parametros']['titulo'] ?? basename($archivo_json)); 
            ?></h2>
            <?php if (!empty($json['parametros']['tituloimagen'])): ?>
                <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen']); ?>" alt="Imagen título" style="max-height:48px; margin-left:12px;">
            <?php endif; ?>
        </div>
        <div id="form-status-container" class="alert alert-secondary p-2">
            Estado: <span id="form-status-text" class="font-weight-bold">Nuevo</span>
        </div>
    </div>
    <!-- FIN: MODIFICACIÓN -->

    <!-- El action del formulario apunta a este mismo archivo de vista. -->
    <form id="formulario" method="post" action="formulariodinamico.php?archivo=<?php echo urlencode($archivo_json); ?>" enctype="multipart/form-data" autocomplete="off">
        
        <?php 
        // Muestra el mensaje de éxito o error preparado por la lógica.
        if (!empty($mensaje_envio)) { 
            echo "<div id='mensaje-envio'>{$mensaje_envio}</div>"; 
        } 
        ?>
        
        <?php 
        // Genera los campos del formulario usando las variables preparadas.
        echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); 
        ?>
        
        <button type="submit" class="btn btn-success mt-3">Guardar</button>
    </form>
</div>

<!-- Pasamos los campos de PHP a una variable global de JavaScript. -->
<script>window.fields = <?php echo json_encode($all_fields); ?>;</script>

<!-- Incluimos los scripts de JavaScript al final por buenas prácticas. -->
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="js/formulariodinamico.js"></script>
</body>
</html>

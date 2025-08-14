<?php
if (!headers_sent()) {
    header('Content-Type: text/html; charset=UTF-8');
}
// File: FormularioContactoEngine.php
// Engine to render forms based on the 'grupos'/'campos' JSON structure.

// 1. --- CONFIGURACIÓN Y CARGA DE DATOS ---
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/html; charset=UTF-8');

require_once 'FormularioContactoEngineFunciones.php'; // Helper functions for rendering.
require_once 'funcionessql.php'; // Database functions.

// Determine the JSON file to use.
$archivo_json_param = $_GET['archivo'] ?? 'json/contactoformulario02.json';
if (!file_exists($archivo_json_param)) {
    die("<div class='alert alert-danger'>Error: El archivo de configuración del formulario no se encuentra: " . htmlspecialchars($archivo_json_param) . "</div>");
}
$json_str = file_get_contents($archivo_json_param);
$json = json_decode($json_str, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die("<div class='alert alert-danger'>Error de sintaxis en el archivo JSON: " . json_last_error_msg() . "</div>");
}

// 2. --- LÓGICA DE PROCESAMIENTO DE FORMULARIO (POST) ---
$mensaje_envio = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // (Aquí irá la lógica para procesar los datos, enviar correos, guardar en DB, etc.)
    // Por ahora, mostraremos un mensaje de éxito simple.
    $mensaje_envio = "<div class='alert alert-success'>Formulario recibido con éxito.</div>";
}

// 3. --- RENDERIZADO DEL FORMULARIO ---
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario'); ?></title>
    <!-- Bootstrap y dependencias -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <!-- Select2 -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <style>
        /* Estilos básicos para el contenedor del formulario */
        .form-container {
            margin: 20px auto;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-width: 900px;
        }
        .form-group-custom {
            margin-bottom: 1.5rem;
        }
        .form-group-title {
            font-size: 1.5em;
            margin-bottom: 1rem;
            border-bottom: 2px solid #007bff;
            padding-bottom: 0.5rem;
            color: #007bff;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="form-container" style="<?php echo htmlspecialchars($json['parametros']['estilo'] ?? ''); ?>">
        
        <div class="text-center mb-4">
            <?php if (!empty($json['parametros']['tituloimagen'])): ?>
                <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen']); ?>" alt="Imagen Título" style="max-height: 80px;">
            <?php endif; ?>
            <h2 class="mt-3"><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario'); ?></h2>
            <p class="lead"><?php echo htmlspecialchars($json['parametros']['comentario'] ?? ''); ?></p>
        </div>

        <?php if ($mensaje_envio) echo $mensaje_envio; ?>

        <form id="contactoForm" method="POST" action="" enctype="multipart/form-data" autocomplete="off">
            
            <?php echo generarGrupos($json['grupos'] ?? []); ?>

            <div class="text-center mt-4">
                <button type="submit" class="btn btn-primary btn-lg">Enviar Formulario</button>
            </div>
        </form>
        
        <footer class="text-center mt-4 text-muted">
            <p><?php echo htmlspecialchars($json['parametros']['pie'] ?? ''); ?></p>
        </footer>

    </div>
</div>

<!-- jQuery y Scripts de Bootstrap -->
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<!-- Select2 JS -->
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<!-- JS Personalizado -->
<script src="js/FormularioContacto.js"></script>

</body>
</html>

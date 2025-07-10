<?php
// =============================
// FORMULARIO GENÉRICO UNIVERSAL
// =============================
// Forzar el archivo JSON correcto (solo el nombre, no la ruta absoluta)
$_GET['archivo'] = 'formulariogenerico.json';
// --- PREVENCIÓN DE HEADERS ENVIADOS ANTES DE TIEMPO ---
if (headers_sent($file, $line)) {
    $msg = '<div style="color:red;font-weight:bold">Error: No se puede iniciar sesión porque los headers ya fueron enviados.';
    $msg .= '<br>Archivo: <b>' . htmlspecialchars($file) . '</b> línea <b>' . $line . '</b>.';
    $msg .= '<br>Revisa que no haya espacios, saltos de línea, <code>echo</code>, <code>print</code>, <code>var_dump</code> o <code>?&gt;</code> fuera de lugar antes de este archivo.';
    $msg .= '<br>Consejo: Busca en tu código <code>echo</code>, <code>print</code>, <code>var_dump</code>, <code>?&gt;</code> y espacios antes de <code>&lt;?php</code>.';
    $msg .= '</div>';
    error_log("[HEADERS_SENT] Headers enviados antes de tiempo en $file línea $line");
    die($msg);
}
?>
<!DOCTYPE html>
<html lang="es" aria-label="Formulario genérico">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Formulario de contacto y gestión universal, adaptable y seguro.">
    <title>Formulario Universal | Óptica en Terreno</title>
    <link rel="stylesheet" href="css/estilos.css">
    <style>
        body { background: #f4f8fb; }
        .main-form-container { max-width: 700px; margin: 2rem auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 2rem 2.5rem; position: relative; }
        .main-form-container .spinner-border { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 10; display: none; }
        .main-form-container .error-block { color: #dc3545; background: #fff0f0; border: 1px solid #dc3545; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.7em; font-size: 1.1em; }
        .main-form-container .error-block svg { width: 1.5em; height: 1.5em; }
    </style>
</head>
<body>
    <?php if (file_exists('header.php')) include 'header.php'; ?>
    <?php if (file_exists('menu.php')) include 'menu.php'; ?>
    <?php if (file_exists('redes.php')) include 'redes.php'; ?>
    <main>
        <div class="main-form-container" id="main-form-container">
            <div class="spinner-border text-primary" id="main-form-spinner" role="status"><span class="sr-only">Cargando...</span></div>
            <?php
            // Verificar si formulariodinamico.php existe
            if (file_exists('formulariodinamico.php')) {
                include 'formulariodinamico.php';
            } else {
                echo '<div class="error-block">'
                    .'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>'
                    ."<span>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</span>"
                    .'</div>';
            }
            ?>
        </div>
    </main>
    <?php if (file_exists('footer.php')) include 'footer.php'; ?>
    <script>
    // Spinner de carga para experiencia fluida
    document.addEventListener('DOMContentLoaded', function() {
        var spinner = document.getElementById('main-form-spinner');
        var cont = document.getElementById('main-form-container');
        if (spinner && cont) {
            spinner.style.display = 'block';
            setTimeout(function() { spinner.style.display = 'none'; }, 800); // Simula carga
        }
    });
    </script>
</body>
</html>
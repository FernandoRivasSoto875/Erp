<?php
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA. NI ESPACIOS, NI LÍNEAS EN BLANCO.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Paso 1: Incluir toda la lógica de negocio desde el archivo PHP dedicado.
require_once 'formulariodinamicologica.php';
header('Content-Type: text/html; charset=UTF-8');
?>
<?php
$cssDefault = $json['parametros']['CssDefault'] ?? 'formulariodinamico.css';
?>
<link rel="stylesheet" href="css/<?php echo htmlspecialchars($cssDefault); ?>">
<div class="container mt-4">
    <!-- INICIO: MODIFICACIÓN -->
    <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <h2 class="mb-0 mr-3">
                <?php 
                    // Mostrar el título desde el JSON de parámetros si existe
                    echo htmlspecialchars($json['parametros']['titulo'] ?? basename($archivo_json), ENT_QUOTES, 'UTF-8'); 
                ?>
                <span id="form-status-text" class="font-weight-bold" style="font-size:0.7em; margin-left:12px; color:#6c757d;">Nuevo</span>
            </h2>
            <?php if (!empty($json['parametros']['tituloimagen'])): ?>
                <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen']); ?>" alt="Imagen título" style="max-height:48px; margin-left:12px;">
            <?php endif; ?>
        </div>
    </div>
    <!-- FIN: MODIFICACIÓN -->
    <form id="formulario" method="post" action="formulariodinamico.php?archivo=<?php echo urlencode($archivo_json); ?>" enctype="multipart/form-data" autocomplete="off">
        <div id="form-spinner" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);z-index:10;justify-content:center;align-items:center;"><div class="spinner-border text-primary" role="status"><span class="sr-only">Cargando...</span></div></div>
        <?php 
        // Muestra el mensaje de éxito o error preparado por la lógica.
        if (!empty($mensaje_envio)) { 
            echo "<div id='mensaje-envio'>".mb_convert_encoding($mensaje_envio, 'UTF-8', 'auto')."</div>"; 
        } 
        ?>
        <?php 
        // Genera los campos del formulario usando las variables preparadas.
        echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); 
        ?>
        <?php
        // --- NUEVO: Generar botones desde JSON si existen ---
        if (!empty($json['parametros']['botones'])) {
            foreach ($json['parametros']['botones'] as $btn) {
                $tipo = $btn['accion'] === 'reset' ? 'reset' : 'submit';
                $clase = htmlspecialchars($btn['clase'] ?? 'btn-primary');
                $texto = htmlspecialchars($btn['texto'] ?? 'Enviar', ENT_QUOTES, 'UTF-8');
                echo "<button type='$tipo' class='btn $clase mt-3'>$texto</button> ";
            }
        } else {
            echo "<button type='submit' class='btn btn-success mt-3'>Guardar</button>";
        }
        ?>
    </form>
</div>

<?php
// --- Asegurar que $all_fields contenga todos los campos de todos los fieldsets ---
$all_fields = array();
if (!empty($json['fieldsets'])) {
    foreach ($json['fieldsets'] as $fs) {
        if (!empty($fs['fields']) && is_array($fs['fields'])) {
            foreach ($fs['fields'] as $f) {
                $all_fields[] = $f;
            }
        }
    }
}
?>
<script>
window.fields = <?php echo json_encode($all_fields, JSON_UNESCAPED_UNICODE); ?>;
window.validacionesJSON = <?php echo json_encode($json['parametros']['validaciones'] ?? [], JSON_UNESCAPED_UNICODE); ?>;
</script>
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<!-- Select2 -->
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="js/formulariodinamico.js?v=<?php echo time(); ?>"></script>

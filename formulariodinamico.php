<?php
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA. NI ESPACIOS, NI LÍNEAS EN BLANCO.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Paso 1: Incluir toda la lógica de negocio desde el archivo PHP dedicado.
require_once 'formulariodinamico.funciones.php';
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
        // echo generarFieldsets($json['fieldsets'] ?? [], $valores, $soloLectura); 
        // --- INICIO: Llamada al nuevo motor de renderizado de Layout ---
        echo generarLayout($json['layout'] ?? [], $json['fieldsets'] ?? [], $valores, $soloLectura);
        // --- FIN: Llamada al nuevo motor de renderizado de Layout ---
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
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<!-- Select2 -->
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ttskch/select2-bootstrap4-theme@1.5.2/dist/select2-bootstrap4.min.css">
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/i18n/es.js"></script>
<script src="js/formulariodinamico.js?v=<?php echo time(); ?>"></script>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario Dinámico'); ?></title>
    
    <!-- Librerías de Estilos -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2-bootstrap4-theme@1.0.0/dist/select2-bootstrap4.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    
    <!-- Estilos del Formulario Dinámico -->
    <link rel="stylesheet" href="css/<?php echo htmlspecialchars($json['parametros']['CssDefault'] ?? 'estilos.css'); ?>">
    <link rel="stylesheet" href="css/formularariodinamico.css">

    <style>
        /* --- ESTILOS PARA EL MODO DISEÑO Y PESTAÑAS --- */
        
        /* Estilo para resaltar las zonas donde se pueden soltar los fieldsets */
        .design-mode .draggable-column, 
        .design-mode .tab-pane-content {
            border: 2px dashed #007bff;
            background-color: #f0f8ff;
            min-height: 100px; /* Asegura que haya espacio para soltar */
            padding: 10px;
            margin-bottom: 15px;
        }

        /* Estilo para los fieldsets cuando se están arrastrando */
        .draggable-fieldset {
            cursor: move;
            border: 1px solid #ccc;
            margin-bottom: 10px;
            background-color: #fff;
            transition: box-shadow 0.2s ease-in-out;
        }
        .draggable-fieldset:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .sortable-ghost {
            opacity: 0.4;
            background: #c8ebfb;
        }

        /* Mejoras visuales para las pestañas (nav-pills) */
        .nav-pills .nav-link {
            border: 1px solid #dee2e6;
            margin-right: 5px;
            background-color: #f8f9fa;
            color: #495057;
        }
        .nav-pills .nav-link.active {
            color: #fff;
            background-color: #007bff;
            border-color: #007bff;
        }
        .tab-content > .tab-pane {
            /* Mantiene el borde solo en el contenido */
            background-color: #fff;
        }
        .tab-content > .active {
            display: block;
        }
        .tab-pane-content {
            border-radius: 0 0.25rem 0.25rem 0.25rem;
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h2 class="mb-0"><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario'); ?></h2>
                    <button id="design-mode-toggle" class="btn btn-outline-primary">Activar Modo Diseño</button>
                </div>
                <?php if (!empty($json['parametros']['comentario'])): ?>
                    <p class="text-muted"><?php echo htmlspecialchars($json['parametros']['comentario']); ?></p>
                <?php endif; ?>
            </div>
            <div class="card-body">
                <?php if (!empty($mensaje_envio)) echo $mensaje_envio; ?>
                <form id="formulariodinamico" method="post" enctype="multipart/form-data">
                    <?php 
                        // Llama al nuevo motor de layout
                        echo generarLayout($json['layout'] ?? [], $json['fieldsets'] ?? [], $valores, $soloLectura); 
                    ?>
                    <div class="mt-4">
                        <?php foreach (($json['parametros']['botones'] ?? []) as $boton): ?>
                            <button type="<?php echo htmlspecialchars($boton['accion']); ?>" class="btn <?php echo htmlspecialchars($boton['clase']); ?>">
                                <?php echo htmlspecialchars($boton['texto']); ?>
                            </button>
                        <?php endforeach; ?>
                        <button id="save-design-button" class="btn btn-success" style="display:none;">Guardar Diseño</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Librerías de JavaScript -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Librería para Drag & Drop -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>

    <!-- Lógica del Formulario Dinámico -->
    <script src="js/formulariodinamico.js"></script>
    
    <script>
        // --- LÓGICA PARA EL MODO DISEÑO (DRAG & DROP) ---
        document.addEventListener('DOMContentLoaded', function () {
            const designModeToggle = document.getElementById('design-mode-toggle');
            const saveDesignButton = document.getElementById('save-design-button');
            const formContainer = document.querySelector('.card-body');
            let sortableInstances = [];

            function enableDesignMode() {
                formContainer.classList.add('design-mode');
                saveDesignButton.style.display = 'inline-block';
                designModeToggle.textContent = 'Desactivar Modo Diseño';
                designModeToggle.classList.remove('btn-outline-primary');
                designModeToggle.classList.add('btn-danger');

                // Inicializar SortableJS en todas las columnas y paneles de pestañas
                const containers = document.querySelectorAll('.draggable-column, .tab-pane-content');
                containers.forEach(container => {
                    let sortable = new Sortable(container, {
                        group: 'shared', // Permite mover elementos entre contenedores
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        draggable: '.draggable-fieldset', // Especifica qué elementos son arrastrables
                    });
                    sortableInstances.push(sortable);
                });
            }

            function disableDesignMode() {
                formContainer.classList.remove('design-mode');
                saveDesignButton.style.display = 'none';
                designModeToggle.textContent = 'Activar Modo Diseño';
                designModeToggle.classList.remove('btn-danger');
                designModeToggle.classList.add('btn-outline-primary');

                // Destruir todas las instancias de SortableJS para quitar la funcionalidad
                sortableInstances.forEach(sortable => sortable.destroy());
                sortableInstances = [];
            }

            designModeToggle.addEventListener('click', function() {
                if (formContainer.classList.contains('design-mode')) {
                    disableDesignMode();
                } else {
                    enableDesignMode();
                }
            });

            // Lógica para guardar (se implementará en la siguiente fase)
            saveDesignButton.addEventListener('click', function() {
                alert('La funcionalidad de guardar el diseño se implementará en la siguiente fase.');
                // Aquí irá la lógica para reconstruir el JSON y enviarlo al servidor
            });
        });
    </script>
</body>
</html>

<?php
// KEEP: Revisado y listo para commit. Archivo principal del formulario dinámico.
// KEEP: Revisado y listo para commit. Cambios recientes validados.
// KEEP: Revisado y listo para commit. Cambios de diagnóstico y mejoras de visibilidad en modo diseño.
// KEEP: Revisado y listo para commit. Cambios de diagnóstico y mejoras de visibilidad en modo diseño.
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA. NI ESPACIOS, NI LÍNEAS EN BLANCO.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Paso 1: Incluir toda la lógica de negocio desde el archivo PHP dedicado.

// Activar modo diseño para que se rendericen los elementos interactivos (tabs, lápiz, drag handles, etc.)
$modoDiseno = true;
require_once 'formulariodinamicofunciones.php';
// --- INICIO DE LA LÓGICA DEL FORMULARIO ---
require_once 'formulariodinamicologica.php';
// --- FIN DE LA LÓGICA DEL FORMULARIO ---

// Cargar la configuración del formulario desde el archivo JSON
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$json_path = __DIR__ . "/json/" . basename($archivo_json);

if (!file_exists($json_path)) {
    die("<div class='alert alert-danger'>Error: El archivo de configuración '$json_path' no existe.</div>");
}

$json_data = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("<div class='alert alert-danger'>Error: El archivo JSON contiene errores. " . json_last_error_msg() . "</div>");
}

$titulo_formulario = $json_data['titulo'] ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion'] ?? '';
$fieldsets = $json_data['fieldsets'] ?? [];
$layout = $json_data['layout'] ?? [];
$valores = []; // Aquí se cargarían los datos de un registro existente si fuera necesario
$soloLectura = false;

// --- LÓGICA PARA LA PALETA DE COMPONENTES (asegura que esté disponible en formulariodinamico.php) ---
if (!isset($fieldsets_disponibles)) {
    $todos_los_fieldsets = array_keys($fieldsets);
    $fieldsets_usados = [];
    array_walk_recursive($layout, function($item, $key) use (&$fieldsets_usados) {
        if (is_string($item) && $key !== 'type' && $key !== 'width' && !in_array($item, $fieldsets_usados)) {
            $fieldsets_usados[] = $item;
        }
        if ($key === 'tabs') {
            foreach ($item as $tab) {
                if (isset($tab['content']) && is_array($tab['content'])) {
                    foreach ($tab['content'] as $componente) {
                        if (is_string($componente) && !in_array($componente, $fieldsets_usados)) {
                            $fieldsets_usados[] = $componente;
                        }
                    }
                }
            }
        }
    });
    $fieldsets_disponibles = array_diff($todos_los_fieldsets, $fieldsets_usados);
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($json_data['parametros']['titulo'] ?? $titulo_formulario); ?></title>

    <!-- Dependencias de Estilos -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <?php
    // Aplica CssDefault si está definido en parametros
    if (!empty($json_data['parametros']['CssDefault'])) {
        $cssDefault = htmlspecialchars($json_data['parametros']['CssDefault']);
        echo '<link rel="stylesheet" href="css/' . $cssDefault . '">';
    } else {
        echo '<link rel="stylesheet" href="css/formularariodinamico.css">';
    }
    ?>

    <!-- Estilos para el Modo Diseño (Drag and Drop) -->
    <style>
        /* Estilos que solo se aplican en modo diseño */
        body.design-mode .draggable-fieldset,
        body.design-mode .draggable-field {
            cursor: move;
            border: 2px dashed #007bff !important;
            background-color: rgba(0, 123, 255, 0.05);
            transition: background-color 0.3s, border 0.3s;
            margin-bottom: 10px; /* Espacio para que se vea la separación */
        }
        body.design-mode .draggable-fieldset:hover,
        body.design-mode .draggable-field:hover {
            background-color: rgba(0, 123, 255, 0.1);
        }
        /* Placeholder que muestra dónde se soltará el elemento */
        .sortable-ghost {
            background-color: #cce5ff;
            border: 2px dashed #007bff;
            opacity: 0.7;
        }
        /* Contenedor donde se pueden soltar elementos */
        body.design-mode .tab-pane,
        body.design-mode .sortable-fields-container, /* Fieldsets son contenedores de campos */
        body.design-mode [data-col-width], /* Columnas son contenedores de fieldsets */
        body.design-mode #elementos-fuera-container { /* Área exterior es un contenedor */
            min-height: 100px; /* Asegura que haya espacio para soltar */
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: .25rem;
            padding: 1rem;
            margin-top: 10px;
        }
        /* Estilos para el interruptor de modo diseño */
        .design-mode-switch {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1050;
            background-color: #fff;
            padding: 10px;
            border-radius: 50px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
        }
        .design-mode-switch .custom-control-label::before,
        .design-mode-switch .custom-control-label::after {
            cursor: pointer;
        }

        /* Paleta de Componentes */
        .paleta-componentes {
            border: 2px dashed #6c757d;
            border-radius: 8px;
            background: #f8f9fa;
            margin-bottom: 24px;
        }
        .paleta-componentes .draggable-fieldset {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            transition: box-shadow 0.2s;
        }
        .paleta-componentes .draggable-fieldset:hover {
            box-shadow: 0 4px 12px rgba(0,123,255,0.10);
        }
        .paleta-componentes .handle {
            cursor: grab;
            color: #007bff;
        }

        /* Paleta de Tipos de Control */
        #paleta-tipos-control {
            border: 2px dashed #17a2b8;
            border-radius: 8px;
            background: #f8f9fa;
            margin-bottom: 24px;
        }
        #paleta-tipos-control .draggable-tipo {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            transition: box-shadow 0.2s;
        }
        #paleta-tipos-control .draggable-tipo:hover {
            box-shadow: 0 4px 12px rgba(23,162,184,0.10);
        }
        #paleta-tipos-control .handle {
            cursor: grab;
            color: #17a2b8;
        }

        /* Modal Editor de Propiedades */
        #editorPropiedadesModal .modal-body label {
            font-weight: 500;
        }
        #editorPropiedadesModal input, #editorPropiedadesModal select, #editorPropiedadesModal textarea {
            margin-bottom: 12px;
        }
        #editorPropiedadesModal .form-group {
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>


    <!-- PALETAS SOLO EN MODO DISEÑO -->
    <?php
    // Recalcular SIEMPRE los fieldsets disponibles antes de mostrar la paleta
    $todos_los_fieldsets = array_keys($fieldsets);
    $fieldsets_usados = [];
    array_walk_recursive($layout, function($item, $key) use (&$fieldsets_usados) {
        if (is_string($item) && $key !== 'type' && $key !== 'width' && !in_array($item, $fieldsets_usados)) {
            $fieldsets_usados[] = $item;
        }
        if ($key === 'tabs') {
            foreach ($item as $tab) {
                if (isset($tab['content']) && is_array($tab['content'])) {
                    foreach ($tab['content'] as $componente) {
                        if (is_string($componente) && !in_array($componente, $fieldsets_usados)) {
                            $fieldsets_usados[] = $componente;
                        }
                    }
                }
            }
        }
    });
    $fieldsets_disponibles = array_diff($todos_los_fieldsets, $fieldsets_usados);
    ?>
    <div id="paletas-modo-diseno" style="display:none; border: 2px solid red; background: #fffbe6; padding: 10px; margin-bottom: 20px;">
        <div style="color: #b94a48; font-weight: bold; margin-bottom: 8px;">[Diagnóstico] Paletas modo diseño: Si ves este mensaje, el contenedor se está generando y mostrando correctamente.</div>
        <?php 
            $paletaTipos = trim(generarPaletaTiposControl());
            $paletaComponentes = trim(generarPaletaComponentes($fieldsets_disponibles, $fieldsets));
            if (empty($paletaTipos) && empty($paletaComponentes)) {
                echo '<div style="color: #a94442;">[Diagnóstico] Las funciones PHP de paleta están retornando vacío. Revisa la generación de fieldsets y tipos de control.</div>';
            } else {
                // Envolver la paleta de tipos de control con el ID esperado por JS
                if (!empty($paletaTipos)) {
                    echo '<div id="paleta-tipos-control">' . $paletaTipos . '</div>';
                }
                // Envolver la paleta de componentes con el ID esperado por JS
                if (!empty($paletaComponentes)) {
                    echo '<div id="paleta-componentes">' . $paletaComponentes . '</div>';
                }
            }
        ?>
    </div>


    <div class="container mt-5 mb-5">
        <div id="outside-drop-area" class="mb-3">
            <!-- Este contenedor se renderizará con PHP -->
            <?php
                $elementos_fuera = $json_data['elementos_fuera'] ?? [];
                echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, $valores, $soloLectura);
            ?>
        </div>

        <div class="card">
            <div class="card-header" style="<?php echo htmlspecialchars($json_data['parametros']['estilo'] ?? ''); ?>">
                <?php if (!empty($json_data['parametros']['tituloimagen'])): ?>
                    <img src="<?php echo htmlspecialchars($json_data['parametros']['tituloimagen']); ?>" alt="Imagen Título" style="max-height: 80px; display:block; margin:0 auto 10px;">
                <?php endif; ?>
                <h2><?php echo htmlspecialchars($json_data['parametros']['titulo'] ?? $titulo_formulario); ?></h2>
                <?php if (!empty($json_data['parametros']['comentario'])): ?>
                    <p class="lead"><?php echo htmlspecialchars($json_data['parametros']['comentario']); ?></p>
                <?php endif; ?>
                <?php if (!empty($json_data['parametros']['fecha_creacion'])): ?>
                    <div style="font-size:0.9em;color:#888;">Creado: <?php echo htmlspecialchars($json_data['parametros']['fecha_creacion']); ?></div>
                <?php endif; ?>
            </div>
            <div class="card-body">
                <?php if (!empty($mensaje_envio)) echo $mensaje_envio; ?>
                <form id="formulariodinamico" method="POST" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]) . '?archivo=' . urlencode($archivo_json); ?>" enctype="multipart/form-data">
                    <?php
                    // El nuevo motor de renderizado se encarga de todo el layout
                    echo generarLayout($layout, $fieldsets, $valores, $soloLectura);
                    ?>
                    <div class="form-footer mt-4">
                        <?php if (!empty($json_data['parametros']['pie'])): ?>
                            <div class="mb-2 text-muted"><?php echo htmlspecialchars($json_data['parametros']['pie']); ?></div>
                        <?php endif; ?>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                        <button type="button" class="btn btn-secondary" onclick="window.history.back();">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Interruptor para activar/desactivar el Modo Diseño -->
    <div class="design-mode-switch">
        <!-- CAMBIO: Añadir botones Undo/Redo con sus IDs -->
        <button id="undoBtn" class="btn btn-secondary btn-sm mr-2" style="display: none;" title="Deshacer"><i class="fas fa-undo"></i></button>
        <button id="redoBtn" class="btn btn-secondary btn-sm mr-2" style="display: none;" title="Rehacer"><i class="fas fa-redo"></i></button>
        <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="designModeToggle">
            <label class="custom-control-label" for="designModeToggle">Modo Diseño</label>
        </div>
        <button id="saveLayoutBtn" class="btn btn-success btn-sm ml-3" style="display: none;">Guardar Diseño</button>
    </div>

    <!-- MODAL EDITOR DE PROPIEDADES (reutilizable para campo, fieldset o pestaña) -->
    <div class="modal fade" id="editorPropiedadesModal" tabindex="-1" role="dialog" aria-labelledby="editorPropiedadesLabel" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editorPropiedadesLabel">Editar Propiedades</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Cerrar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <form id="formEditorPropiedades">
            <div class="modal-body" id="editorPropiedadesBody">
              <!-- Aquí se inyectará dinámicamente el formulario de propiedades -->
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Dependencias de JavaScript -->
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- SortableJS para Drag and Drop -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js"></script>

    <!-- *** CAMBIO REALIZADO: Se ha vuelto a incluir el script principal del formulario *** -->
    <!-- Este archivo contiene toda la lógica de cálculos, datatables, lookups, etc. -->
    <script src="js/formulariodinamico.js"></script>


    <!-- Pasar variable PHP a JS para configuración global -->
    <script>
    window.FORM_CONFIG = { archivo_json: '<?php echo addslashes($archivo_json); ?>' };
    </script>

</body>

</html>

<?php
// NO DEBE HABER NADA ANTES DE ESTA LÍNEA. NI ESPACIOS, NI LÍNEAS EN BLANCO.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Paso 1: Incluir toda la lógica de negocio desde el archivo PHP dedicado.
require_once 'formulariodinamico.funciones.php';
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

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($titulo_formulario); ?></title>
    
    <!-- Dependencias de Estilos -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="stylesheet" href="css/formularariodinamico.css">

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
    </style>
</head>
<body>

    <div class="container mt-5 mb-5">
        <div id="outside-drop-area" class="mb-3">
            <!-- Este contenedor se renderizará con PHP -->
            <?php
                $elementos_fuera = $json_data['elementos_fuera'] ?? [];
                echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, $valores, $soloLectura);
            ?>
        </div>

        <div class="card">
            <div class="card-header">
                <h2><?php echo htmlspecialchars($titulo_formulario); ?></h2>
                <p><?php echo htmlspecialchars($descripcion_formulario); ?></p>
            </div>
            <div class="card-body">
                <?php if (!empty($mensaje_envio)) echo $mensaje_envio; ?>
                
                <form id="formulariodinamico" method="POST" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]) . '?archivo=' . urlencode($archivo_json); ?>" enctype="multipart/form-data">
                    
                    <?php
                    // El nuevo motor de renderizado se encarga de todo el layout
                    echo generarLayout($layout, $fieldsets, $valores, $soloLectura);
                    ?>

                    <div class="form-footer mt-4">
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

    <script>
    $(document).ready(function() {
        // --- LÓGICA DEL MODO DISEÑO (CORREGIDA Y MEJORADA) ---
        const designModeToggle = $('#designModeToggle');
        const saveLayoutBtn = $('#saveLayoutBtn');
        const undoBtn = $('#undoBtn');
        const redoBtn = $('#redoBtn');
        const body = $('body');
        let sortableInstances = [];

        // --- Sistema de Historial para Undo/Redo ---
        let history = [];
        let historyIndex = -1;
        const formContainer = document.getElementById('formulariodinamico');

        function saveState() {
            const currentState = formContainer.innerHTML;
            if (historyIndex > -1 && history[historyIndex] === currentState) return;
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            history.push(currentState);
            historyIndex++;
            updateUndoRedoButtons();
        }

        function restoreState(index) {
            if (index >= 0 && index < history.length) {
                formContainer.innerHTML = history[index];
                disableDesignMode(false);
                enableDesignMode(false);
            }
        }

        function undo() {
            if (historyIndex > 0) {
                historyIndex--;
                restoreState(historyIndex);
            }
        }

        function redo() {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                restoreState(historyIndex);
            }
        }

        function updateUndoRedoButtons() {
            undoBtn.prop('disabled', historyIndex <= 0);
            redoBtn.prop('disabled', historyIndex >= history.length - 1);
        }

        undoBtn.on('click', undo);
        redoBtn.on('click', redo);

        // --- Lógica Principal del Modo Diseño ---

        function enableDesignMode(doSaveState = true) {
            body.addClass('design-mode');
            saveLayoutBtn.show();
            undoBtn.show();
            redoBtn.show();
            $('.edit-icon, .tab-block-handle, .edit-tab-icon, .add-tab-button').show();

            if ($('select.form-control').data('select2')) {
                $('select.form-control').select2('destroy');
            }

            // 1. Contenedores que aceptan GRUPOS (Fieldsets y Bloque de Pestañas)
            document.querySelectorAll('[data-col-width], #elementos-fuera-container').forEach(container => {
                sortableInstances.push(Sortable.create(container, {
                    group: 'shared-blocks',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    draggable: '.draggable-fieldset, .draggable-tab-block',
                    handle: '.handle',
                    onEnd: () => saveState()
                }));
            });

            // 2. Contenedores que aceptan CAMPOS individuales
            document.querySelectorAll('.sortable-fields-container, #elementos-fuera-container').forEach(container => {
                sortableInstances.push(Sortable.create(container, {
                    group: 'shared-fields',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    draggable: '.draggable-field',
                    onEnd: () => saveState()
                }));
            });

            // 3. Contenedor para REORDENAR PESTAÑAS
            document.querySelectorAll('.sortable-tabs').forEach(tabsList => {
                sortableInstances.push(Sortable.create(tabsList, {
                    animation: 150,
                    draggable: '.nav-item:not(.add-tab-button)',
                    onEnd: () => saveState()
                }));
            });

            if (doSaveState) {
                saveState();
            }
            updateUndoRedoButtons();
        }

        function disableDesignMode(reinitNormal = true) {
            body.removeClass('design-mode');
            saveLayoutBtn.hide();
            undoBtn.hide();
            redoBtn.hide();
            $('.edit-icon, .tab-block-handle, .edit-tab-icon, .add-tab-button').hide();
            sortableInstances.forEach(s => s.destroy());
            sortableInstances = [];
            if (reinitNormal) {
                inicializarLogicaFormulario();
            }
        }
        
        // --- Eventos de los Botones ---

        designModeToggle.on('change', function() {
            if (this.checked) {
                enableDesignMode();
            } else {
                disableDesignMode();
            }
        });

        // Lógica para editar el nombre de la pestaña
        $(document).on('click', '.edit-tab-icon', function() {
            if (!body.hasClass('design-mode')) return;
            const navLink = $(this).closest('.nav-item').find('a.nav-link');
            const oldTitle = navLink.text();
            
            Swal.fire({
                title: 'Editar nombre de la pestaña',
                input: 'text',
                inputValue: oldTitle,
                showCancelButton: true,
                confirmButtonText: 'Guardar',
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const newTitle = result.value;
                    navLink.text(newTitle);
                    const paneId = navLink.attr('href');
                    $(paneId).attr('data-tab-title', newTitle);
                    saveState();
                }
            });
        });

        // Lógica para añadir una nueva pestaña
        $(document).on('click', '.add-tab-button', function(e) {
            e.preventDefault();
            if (!body.hasClass('design-mode')) return;

            Swal.fire({
                title: 'Nueva pestaña',
                input: 'text',
                inputPlaceholder: 'Nombre de la nueva pestaña',
                showCancelButton: true,
                confirmButtonText: 'Crear',
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const newTitle = result.value;
                    const tabList = $(this).closest('.nav-tabs');
                    const tabContent = tabList.next('.tab-content');
                    const newId = 'tab-' + Date.now();

                    // Crear el link de la pestaña
                    const newTabLink = `
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="${newId}-link" data-toggle="tab" href="#${newId}-pane" role="tab">${newTitle}</a>
                            <span class="edit-tab-icon edit-icon" style="display:inline-block;"><i class="fas fa-pencil-alt"></i></span>
                        </li>`;
                    
                    // Crear el panel de contenido de la pestaña
                    const newTabPane = `
                        <div class="tab-pane fade" id="${newId}-pane" role="tabpanel" data-tab-title="${newTitle}">
                            <!-- Área para soltar elementos -->
                        </div>`;

                    $(this).before(newTabLink);
                    tabContent.append(newTabPane);

                    // Reiniciar el modo diseño para que el nuevo contenedor sea funcional
                    disableDesignMode(false);
                    enableDesignMode(true);
                }
            });
        });

        // *** CAMBIO REALIZADO: Nueva función para inicializar la lógica del formulario normal ***
        // Esta función llama al código que está en `js/formulariodinamico.js`.
        function inicializarLogicaFormulario() {
            // Verificamos si la función `inicializarFormularioDinamico` existe en el script que acabamos de incluir.
            if (typeof inicializarFormularioDinamico === 'function') {
                const config = {
                    archivo_json: '<?php echo addslashes($archivo_json); ?>'
                };
                // Ejecutamos la inicialización del formulario pasándole la configuración necesaria.
                inicializarFormularioDinamico(config);
            } else {
                console.warn('La función `inicializarFormularioDinamico` no se encontró en `js/formulariodinamico.js`. La funcionalidad interactiva puede no estar disponible.');
                // Fallback por si el otro script falla: inicializa al menos los Select2 básicos.
                 $('.form-control').each(function() {
                    if ($(this).is('select')) {
                        $(this).select2({
                            width: '100%'
                        });
                    }
                });
            }
        }

        // *** CAMBIO REALIZADO: Se llama a la lógica del formulario al cargar la página ***
        // Esto asegura que el formulario sea funcional desde el principio.
        inicializarLogicaFormulario();
    });
    </script>

</body>
</html>

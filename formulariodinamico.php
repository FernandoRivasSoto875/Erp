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

    <script>
    $(document).ready(function() {
        // Inicializar Select2 en todos los selects
        $('.form-control').each(function() {
            if ($(this).is('select')) {
                $(this).select2({
                    width: '100%'
                });
            }
        });

        // --- LÓGICA DEL MODO DISEÑO ---
        const designModeToggle = $('#designModeToggle');
        const saveLayoutBtn = $('#saveLayoutBtn');
        const body = $('body');
        let sortableInstances = [];

        designModeToggle.on('change', function() {
            if (this.checked) {
                enableDesignMode();
            } else {
                disableDesignMode();
            }
        });

        function enableDesignMode() {
            body.addClass('design-mode');
            saveLayoutBtn.show();
            $('.edit-icon').show();
            
            // 1. Contenedores de FIELDSETS (columnas, pestañas y el área exterior)
            const fieldsetContainers = document.querySelectorAll('[data-col-width], .tab-pane, #elementos-fuera-container');
            fieldsetContainers.forEach(container => {
                let sortable = Sortable.create(container, {
                    group: {
                        name: 'shared-fieldsets',
                        put: function (to) {
                            // Solo permite soltar fieldsets, no campos individuales
                            return !to.el.classList.contains('sortable-fields-container');
                        }
                    },
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    draggable: '.draggable-fieldset',
                    onEnd: function(evt) {
                        console.log('Fieldset drag ended.');
                    }
                });
                sortableInstances.push(sortable);
            });

            // 2. Contenedores de CAMPOS (los fieldsets y el área exterior)
            const fieldContainers = document.querySelectorAll('.sortable-fields-container, #elementos-fuera-container');
            fieldContainers.forEach(container => {
                let sortable = Sortable.create(container, {
                    group: 'shared-fields', // Un grupo separado para los campos
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    draggable: '.draggable-field', // Solo los campos son arrastrables aquí
                    onEnd: function(evt) {
                        console.log('Field drag ended.');
                    }
                });
                sortableInstances.push(sortable);
            });
        }

        function disableDesignMode() {
            body.removeClass('design-mode');
            saveLayoutBtn.hide();
            $('.edit-icon').hide();
            // Destruir todas las instancias de SortableJS para restaurar el comportamiento normal
            sortableInstances.forEach(sortable => sortable.destroy());
            sortableInstances = [];
        }

        // --- LÓGICA PARA GUARDAR EL DISEÑO ---
        saveLayoutBtn.on('click', function() {
            const nuevoLayout = buildLayoutFromDOM();
            const elementosFuera = buildOutsideElementsFromDOM();
            const archivoJson = '<?php echo addslashes($archivo_json); ?>';

            Swal.fire({
                title: '¿Guardar el nuevo diseño?',
                text: "Esto sobrescribirá la estructura del formulario actual.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('guardar_layout.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            archivo_json: archivoJson,
                            layout: nuevoLayout,
                            elementos_fuera: elementosFuera
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.estado === 'exito') {
                            Swal.fire(
                                '¡Guardado!',
                                'El diseño ha sido actualizado. La página se recargará.',
                                'success'
                            ).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire(
                                'Error',
                                'No se pudo guardar el diseño: ' + data.mensaje,
                                'error'
                            );
                        }
                    })
                    .catch(error => {
                        console.error('Error en la petición:', error);
                        Swal.fire(
                            'Error de Red',
                            'Hubo un problema al conectar con el servidor.',
                            'error'
                        );
                    });
                }
            });
        });

        function buildLayoutFromDOM() {
            const layout = {};
            document.querySelectorAll('[data-layout-container] > [data-block-name]').forEach(blockElement => {
                const blockName = blockElement.dataset.blockName;
                const blockType = blockElement.dataset.blockType;
                
                const blockData = { type: blockType };

                if (blockType === 'tabs') {
                    blockData.tabs = [];
                    blockElement.querySelectorAll('.tab-pane[data-tab-title]').forEach(tabElement => {
                        const tabTitle = tabElement.dataset.tabTitle;
                        const tab = { title: tabTitle, rows: [] };
                        tabElement.querySelectorAll('[data-row]').forEach(rowElement => {
                            const row = { columns: [] };
                            rowElement.querySelectorAll('[data-col-width]').forEach(colElement => {
                                const width = colElement.dataset.colWidth;
                                // Un fieldset puede estar directamente en una columna
                                const fieldsetElement = colElement.querySelector('[data-fieldset-name]');
                                if (fieldsetElement) {
                                    const fieldsetName = fieldsetElement.dataset.fieldsetName;
                                    row.columns.push({ width: width, fieldset: fieldsetName });
                                }
                            });
                            if (row.columns.length > 0) {
                                tab.rows.push(row);
                            }
                        });
                        blockData.tabs.push(tab);
                    });
                } else { // header, footer, generic
                    blockData.rows = [];
                    blockElement.querySelectorAll('[data-row]').forEach(rowElement => {
                        const row = { columns: [] };
                        rowElement.querySelectorAll('[data-col-width]').forEach(colElement => {
                            const width = colElement.dataset.colWidth;
                            const fieldsetElement = colElement.querySelector('[data-fieldset-name]');
                            if (fieldsetElement) {
                                const fieldsetName = fieldsetElement.dataset.fieldsetName;
                                row.columns.push({ width: width, fieldset: fieldsetName });
                            }
                        });
                        if (row.columns.length > 0) {
                            blockData.rows.push(row);
                        }
                    });
                }
                layout[blockName] = blockData;
            });
            console.log('Layout reconstruido:', layout);
            return layout;
        }

        function buildOutsideElementsFromDOM() {
            const outsideElements = [];
            const container = document.getElementById('elementos-fuera-container');
            
            // Buscar fieldsets
            container.querySelectorAll('.draggable-fieldset').forEach(el => {
                outsideElements.push({
                    type: 'fieldset',
                    name: el.dataset.fieldsetName
                });
            });

            // Buscar campos individuales
            container.querySelectorAll('.draggable-field').forEach(el => {
                outsideElements.push({
                    type: 'field',
                    name: el.dataset.fieldName
                });
            });
            
            console.log('Elementos fuera reconstruidos:', outsideElements);
            return outsideElements;
        }

        // --- LÓGICA PARA EDITAR PROPIEDADES ---
        $(document).on('click', '.edit-icon', function() {
            const editType = $(this).data('edit-type');
            const itemName = $(this).data('edit-type') === 'fieldset' ? $(this).data('fieldset-name') : $(this).data('field-name');
            const archivoJson = '<?php echo addslashes($archivo_json); ?>';
            const allData = <?php echo json_encode($json_data); ?>;

            if (editType === 'fieldset') {
                const fieldsetData = allData.fieldsets[itemName];
                Swal.fire({
                    title: `Editando Grupo: ${fieldsetData.titulo}`,
                    html:
                        `<input id="swal-input-titulo" class="swal2-input" value="${fieldsetData.titulo}">`,
                    focusConfirm: false,
                    preConfirm: () => {
                        return {
                            titulo: document.getElementById('swal-input-titulo').value
                        }
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        saveProperties(archivoJson, editType, itemName, result.value);
                    }
                });
            } else if (editType === 'field') {
                let fieldData;
                for (const fs in allData.fieldsets) {
                    const found = allData.fieldsets[fs].campos.find(f => f.nombre === itemName);
                    if (found) {
                        fieldData = found;
                        break;
                    }
                }
                
                if (fieldData) {
                    Swal.fire({
                        title: `Editando Campo: ${fieldData.etiqueta}`,
                        html:
                            `<input id="swal-input-etiqueta" class="swal2-input" placeholder="Etiqueta" value="${fieldData.etiqueta || ''}">` +
                            `<input id="swal-input-placeholder" class="swal2-input" placeholder="Texto de ejemplo" value="${fieldData.placeholder || ''}">`,
                        focusConfirm: false,
                        preConfirm: () => {
                            return {
                                etiqueta: document.getElementById('swal-input-etiqueta').value,
                                placeholder: document.getElementById('swal-input-placeholder').value
                            }
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            saveProperties(archivoJson, editType, itemName, result.value);
                        }
                    });
                }
            }
        });

        function saveProperties(archivoJson, editType, itemName, properties) {
            fetch('editar_propiedades.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    archivo_json: archivoJson,
                    edit_type: editType,
                    item_name: itemName,
                    properties: properties
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.estado === 'exito') {
                    Swal.fire('¡Guardado!', 'Las propiedades han sido actualizadas. La página se recargará.', 'success')
                    .then(() => location.reload());
                } else {
                    Swal.fire('Error', 'No se pudo guardar: ' + data.mensaje, 'error');
                }
            })
            .catch(error => {
                console.error('Error en la petición:', error);
                Swal.fire('Error de Red', 'Hubo un problema al conectar con el servidor.', 'error');
            });
        }
    });
    </script>

</body>
</html>

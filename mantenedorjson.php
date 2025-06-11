<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Mantenedor de Configuración</title>
    <!-- Enlace al archivo de estilos consolidado -->
    <link rel="stylesheet" href="css/estilos.css">
    <!-- Enlace a DataTables -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
</head>
<body>
    <!-- Fondo para el modal -->
    <div class="fondo-overlay" id="fondoModal"></div>

    <!-- Popup de mensajes -->
    <div id="modalAccion" class="mensaje-popup">
        <p id="modalContenido">Cargando...</p>
        <button id="cerrarModal">Cerrar</button>
    </div>
    <!-- Encabezado fijo -->
    <?php include 'header.php'; ?>
    <!-- Menú fijo -->
    <?php include 'menuintranet.php'; ?>
    <!-- Contenido desplazable -->
    <main>
        <h2>Mantenedor de Archivos JSON</h2>
        <p>En esta sección puedes visualizar, editar y gestionar los archivos JSON almacenados en la carpeta <code>/config</code>.</p>
        
        <!-- Mostrar mensajes dinámicos -->
        <?php if (isset($_GET['mensaje'])): ?>
            <p class="mensaje <?php echo strpos($_GET['mensaje'], 'Error') !== false ? 'mensaje-error' : 'mensaje-exito'; ?>">
                <?php echo htmlspecialchars($_GET['mensaje'], ENT_QUOTES, 'UTF-8'); ?>
                <?php if (isset($_GET['archivoOriginal'])): ?>
                    <br>
                    Archivo original: <a href="<?php echo htmlspecialchars($_GET['archivoOriginal'], ENT_QUOTES, 'UTF-8'); ?>" target="_blank"><?php echo basename($_GET['archivoOriginal']); ?></a>
                <?php endif; ?>
            </p>
        <?php endif; ?>

        <!-- Tabla con DataTables -->
        <table id="archivosJsonTable" class="display">
            <thead>
                <tr>
                    <th>Nombre del Archivo</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $rutaConfig = __DIR__ . '/json';
                $archivosJson = glob($rutaConfig . '/*.json'); // Obtener todos los archivos JSON de la carpeta /config

                if (count($archivosJson) > 0):
                    foreach ($archivosJson as $archivo): ?>
                        <tr>
                            <td><?php echo basename($archivo); ?></td>
                            <td>
                                <button class="btn-ver" data-url="ver_json.php" data-archivo="<?php echo urlencode($archivo); ?>">Ver</button>
                                <button class="btn-editar" data-url="editar_json.php" data-archivo="<?php echo urlencode($archivo); ?>">Editar</button>
                                <button class="btn-copiar" data-url="copiar_json.php" data-archivo="<?php echo urlencode($archivo); ?>">Copiar</button>
                                <button class="btn-eliminar" data-url="eliminar_json.php" data-archivo="<?php echo urlencode($archivo); ?>">Eliminar</button>
                            </td>
                        </tr>
                    <?php endforeach;
                else: ?>
                    <tr>
                        <td colspan="2">No se encontraron archivos JSON en la carpeta <code>/config</code>.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </main>
    <!-- Pie de página fijo -->
    <?php include 'footer.php'; ?>
    <!-- Scripts de DataTables -->
    <script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script>
        $(document).ready(function() {
            const nombreArchivoPHP = "MantenedorDeConfiguracion.php"; // Nombre del archivo actual

            // Función para abrir el modal
            function abrirModal(mensaje) {
                $('#modalContenido').html(mensaje); // Mostrar mensaje en el modal
                $('#fondoModal').fadeIn();
                $('#modalAccion').fadeIn();
            }

            // Función para cerrar el modal
            function cerrarModal() {
                $('#fondoModal').fadeOut();
                $('#modalAccion').fadeOut();
            }

            // Asignar eventos a los botones de acción
            $('.btn-ver, .btn-editar, .btn-copiar, .btn-eliminar').click(function() {
                const url = $(this).data('url'); // URL del archivo PHP
                const archivo = $(this).data('archivo'); // Nombre del archivo JSON

                abrirModal('Cargando...'); // Mostrar mensaje mientras se realiza la solicitud

                // Realizar la solicitud AJAX
                $.ajax({
                    url: url,
                    method: 'GET',
                    data: { archivo: archivo },
                    success: function(response) {
                        abrirModal(response); // Mostrar respuesta en el modal
                    },
                    error: function() {
                        abrirModal('Hubo un error al cargar la información.'); // Mostrar error en el modal
                    }
                });
            });

            // Cerrar el modal al hacer clic en el botón "Cerrar"
            $('#cerrarModal').click(function() {
                cerrarModal();
            });

            // Inicializar DataTable
            $.getJSON('./json/datatable.json', function(config) {
                abrirModal('Configuración cargada correctamente desde /config'); // Mostrar mensaje de éxito en el modal

                // Validar si el nombre del DataTable coincide con el archivo actual
                if (config.NombreDatable === nombreArchivoPHP) {
                    $('#archivosJsonTable').DataTable(config.DataTablesConfig);
                    cerrarModal(); // Cierra el popup después de cargar la configuración
                } else {
                    abrirModal('El NombreDatable no coincide con el archivo actual');
                }
            }).fail(function() {
                abrirModal('No se pudo cargar el archivo datatable.json desde /config');
            });
        });
    </script>
</body>
</html>

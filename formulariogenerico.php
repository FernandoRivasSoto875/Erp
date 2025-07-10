<?php
// Autor: Fernando Rivas S.

// --- PASO 1: CONFIGURACIÓN Y LÓGICA DE NEGOCIO ---
// Forzamos al sistema a usar el archivo JSON que queremos para esta página.
$_GET['archivo'] = 'formulariogenerico.json';

// Incluimos el "motor" del formulario. Este archivo contiene session_start(),
// procesa los datos del POST y prepara todas las variables necesarias.
// Como se ejecuta ANTES de cualquier HTML, session_start() funcionará.
require_once 'formulariodinamicologica.php';

// --- PASO 2: INICIO DE LA PÁGINA HTML ---
// Ahora que toda la lógica ha terminado, podemos empezar a enviar la página.
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Óptica en Terreno - Contactos</title>
    <link rel="stylesheet" href="css/estilos.css">
    <?php
        // Incluimos los assets (CSS/JS) que el formulario dinámico pueda necesitar.
        // Esto se hace aquí para mantener el <head> limpio.
        if (function_exists('imprimir_assets_formulario')) {
            imprimir_assets_formulario();
        }
    ?>
</head>
<body>
    <?php include 'header.php'; ?>
    <?php include 'menu.php'; ?>
    <?php include 'redes.php'; ?>

    <main>
        <?php
        // --- PASO 3: RENDERIZADO DEL FORMULARIO ---
        // Incluimos el archivo que se encarga de DIBUJAR el formulario.
        // Este archivo usará las variables que ya fueron preparadas en el PASO 1.
        if (file_exists('formulariodinamico.php')) {
            include 'formulariodinamico.php';
        } else {
            echo "<p>Error: No se pudo cargar el formulario dinámico. Verifica la configuración.</p>";
        }
        ?>
    </main>

    <?php include 'footer.php'; ?>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('main-form');
        if (!form) return;

        const allFields = <?php echo json_encode($all_fields); ?>;
        const firstField = allFields.length > 0 ? allFields[0] : null;

        if (!firstField) return;

        const keyField = form.querySelector(`[name="${firstField.name}"]`);
        const archivoJson = '<?php echo $archivo_json; ?>';

        if (!keyField) return;

        keyField.addEventListener('blur', function() {
            const key = this.value.trim();

            // Si el campo clave está vacío, limpiar el formulario (excepto el campo clave)
            if (key === '') {
                form.querySelectorAll('input, select, textarea').forEach(el => {
                    if (el !== keyField) {
                        if (el.type === 'checkbox' || el.type === 'radio') {
                            el.checked = false;
                        } else {
                            el.value = '';
                        }
                    }
                });
                // Limpiar también las tablas dinámicas
                document.querySelectorAll('.datatable-container tbody').forEach(tbody => {
                    tbody.innerHTML = '';
                });
                return;
            }

            // Si hay una clave, buscar los datos
            const url = `formulariodinamicologica.php?archivo=${encodeURIComponent(archivoJson)}&action=load_data&key=${encodeURIComponent(key)}`;

            fetch(url)
                .then(response => response.json())
                .then(result => {
                    if (result.success && result.data) {
                        const data = result.data;
                        // Rellenar cada campo con los datos recibidos
                        for (const fieldName in data) {
                            const value = data[fieldName];
                            const fieldElement = form.querySelector(`[name="${fieldName}"]`);
                            
                            if (fieldElement) {
                                if (fieldElement.type === 'checkbox' || fieldElement.type === 'radio') {
                                    fieldElement.checked = (fieldElement.value == value);
                                } else {
                                    fieldElement.value = value;
                                }
                            }
                        }
                        alert('Datos cargados correctamente.');
                    } else {
                        alert('No se encontraron datos para la clave introducida. Puede crear un nuevo registro.');
                    }
                })
                .catch(error => {
                    console.error('Error al cargar los datos:', error);
                    alert('Hubo un error al intentar cargar los datos.');
                });
        });
    });
    </script>
</body>
</html>
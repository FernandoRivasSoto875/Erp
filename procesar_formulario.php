 <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Dinámico</title>
    <link rel="stylesheet" href="css/estilos.css"> <!-- Enlace al archivo de estilos -->
    <style>
        /* Estilo para el contenedor del popup */
        .mensaje-popup {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            z-index: 1000;
            text-align: center;
            max-width: 300px;
        }
        .mensaje-popup button {
            background-color: #007BFF;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 5px;
        }
        .mensaje-popup button:hover {
            background-color: #0056b3;
        }
        .fondo-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        }
    </style>
</head>
<body>
    <?php
    // Ruta del archivo JSON
    $archivoJson = $_GET['archivo'] ?? null;

    if (!$archivoJson || !file_exists($archivoJson)) {
        echo "<script>mostrarPopup('Error: No se ha especificado un archivo JSON válido o no se encuentra.', false);</script>";
        exit;
    }

    // Decodificar el archivo JSON
    $json = json_decode(file_get_contents($archivoJson), true);

    if (!$json) {
        echo "<script>mostrarPopup('Error: No se pudo decodificar el archivo JSON.', false);</script>";
        exit;
    }
    ?>

    <div class="fondo-overlay" id="fondo-overlay"></div>
    <div class="mensaje-popup" id="mensaje-popup">
        <p id="texto-popup"></p>
        <button onclick="cerrarPopup()">Cerrar</button>
    </div>

    <main>
        <!-- Título y comentario del formulario -->
        <h2><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario Dinámico'); ?></h2>
        <p><?php echo htmlspecialchars($json['parametros']['comentario'] ?? ''); ?></p>

        <!-- Generar formulario -->
        <form id="formulario" action="procesar_formulario.php" method="POST" enctype="multipart/form-data" onsubmit="return manejarEnvio(event)">
            <?php foreach ($json['campos'] as $campo): ?>
                <label for="<?php echo $campo['nombre']; ?>"><?php echo htmlspecialchars($campo['etiqueta']); ?>:</label>
                <?php if ($campo['tipo'] === 'textarea'): ?>
                    <textarea id="<?php echo $campo['nombre']; ?>" name="<?php echo $campo['nombre']; ?>" rows="<?php echo $campo['filas'] ?? 4; ?>" <?php echo $campo['requerido'] ? 'required' : ''; ?>></textarea>
                <?php elseif ($campo['tipo'] === 'file' && isset($campo['descripcion'])): ?>
                    <!-- Campos de archivo adjunto y descripción -->
                    <?php foreach ($campo['descripcion'] as $index => $descripcion): ?>
                        <label for="archivo_<?php echo $index; ?>"><?php echo htmlspecialchars($descripcion['etiqueta']); ?>:</label>
                        <input type="file" id="archivo_<?php echo $index; ?>" name="archivo_<?php echo $index; ?>" required>
                        <input type="text" id="descripcion_archivo_<?php echo $index; ?>" name="descripcion_archivo_<?php echo $index; ?>" placeholder="<?php echo htmlspecialchars($descripcion['etiqueta']); ?>" <?php echo $descripcion['requerido'] ? 'required' : ''; ?>>
                    <?php endforeach; ?>
                <?php else: ?>
                    <input type="<?php echo $campo['tipo']; ?>" id="<?php echo $campo['nombre']; ?>" name="<?php echo $campo['nombre']; ?>" <?php echo $campo['requerido'] ? 'required' : ''; ?>>
                <?php endif; ?>
            <?php endforeach; ?>
            <button type="submit">Enviar</button>
        </form>

        <!-- Pie del formulario -->
        <footer>
            <p><?php echo htmlspecialchars($json['parametros']['pie'] ?? ''); ?></p>
        </footer>
    </main>

    <script>
        // Manejar el envío del formulario
        async function manejarEnvio(event) {
            event.preventDefault(); // Prevenir el envío normal del formulario

            const formulario = document.getElementById('formulario');
            const datos = new FormData(formulario);

            try {
                const respuesta = await fetch('procesar_formulario.php', {
                    method: 'POST',
                    body: datos,
                });

                const resultado = await respuesta.json();

                // Mostrar mensaje en popup según el estado
                if (resultado.status === 'success') {
                    mostrarPopup(resultado.mensaje, true);
                } else if (resultado.status === 'error') {
                    mostrarPopup(resultado.mensaje, false);
                }
            } catch (error) {
                mostrarPopup("Hubo un error inesperado. Por favor, inténtelo nuevamente.", false);
            }
        }

        // Mostrar mensaje en popup
        function mostrarPopup(mensaje, exito) {
            const popup = document.getElementById('mensaje-popup');
            const overlay = document.getElementById('fondo-overlay');
            const textoPopup = document.getElementById('texto-popup');

            textoPopup.textContent = mensaje;
            popup.style.display = 'block';
            overlay.style.display = 'block';

            // Cambiar colores según estado
            popup.style.backgroundColor = exito ? '#d4edda' : '#f8d7da'; // Éxito: verde claro, Error: rojo claro
            popup.style.borderColor = exito ? '#c3e6cb' : '#f5c6cb';
            textoPopup.style.color = exito ? '#155724' : '#721c24';
        }

        // Cerrar popup
        function cerrarPopup() {
            const popup = document.getElementById('mensaje-popup');
            const overlay = document.getElementById('fondo-overlay');

            popup.style.display = 'none';
            overlay.style.display = 'none';
        }
    </script>
</body>
</html>

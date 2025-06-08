<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario Dinámico'); ?></title>
    <link rel="stylesheet" href="css/estilos.css"> <!-- Enlace a los estilos generales -->
    <script src="js/formulariodinamico.js"></script> <!-- Enlace al archivo JavaScript externo -->
    <style>
        /* Estilos para asegurar etiquetas a la izquierda */
        #formulario {
            display: flex;
            flex-direction: column; /* Columnas verticales */
            gap: 15px; /* Espaciado uniforme entre campos */
        }

        .campo-container {
            display: flex; /* Flex para mantener etiqueta y campo juntos */
            align-items: center; /* Centrar verticalmente etiqueta y campo */
            gap: 10px; /* Espaciado entre etiqueta y campo */
        }

        label {
            width: 200px; /* Ancho fijo para las etiquetas */
            text-align: left; /* Justificación a la izquierda */
            font-weight: bold; /* Destacar etiquetas */
        }

        input, select, textarea {
            flex-grow: 1; /* Los campos ocupan el resto del espacio */
            max-width: 500px; /* Limitar el ancho máximo de los campos */
            padding: 5px; /* Espaciado interno */
        }

        button {
            align-self: flex-start; /* Botón alineado a la izquierda */
            padding: 10px 20px; /* Ajustar tamaño del botón */
            background-color: #4169E1; /* Color de fondo para el botón */
            color: #ffffff; /* Color de texto */
            border: none;
            cursor: pointer;
        }

        button:hover {
            background-color: #324ebc; /* Color hover */
        }
    </style>
</head>
<body>
    <?php
    /* ====== SECCIÓN: Funciones ====== */

    function mostrarPopup($mensaje, $exito = false) {
        $colorFondo = $exito ? '#d4edda' : '#f8d7da';
        $colorBorde = $exito ? '#c3e6cb' : '#f5c6cb';
        $colorTexto = $exito ? '#155724' : '#721c24';

        echo "<div class='fondo-overlay' style='display: block;'></div>";
        echo "<div class='mensaje-popup' style='display: block; background-color: {$colorFondo}; border: 1px solid {$colorBorde}; color: {$colorTexto};'>";
        echo "<p>{$mensaje}</p>";
        echo "<button onclick='cerrarPopup()'>Cerrar</button>";
        echo "</div>";
    }

    function generarFormulario($json) {
        $cantidadMaximaAdjuntos = $json['parametros']['cantidadMaximaAdjuntos'] ?? 0;

        foreach ($json['campos'] as $campo) {
            if (isset($campo['activo']) && !$campo['activo']) {
                continue;
            }

            if ($campo['tipo'] === 'Adjuntos' && $cantidadMaximaAdjuntos === 0) {
                continue;
            }

            $etiqueta = htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8');
            echo "<div class='campo-container'>";
            echo "<label for='{$campo['nombre']}'>$etiqueta:</label>";

            $validacion = isset($campo['validacion']) ? $campo['validacion'] : '';
            $onInput = $validacion ? "oninput='validarInput(event, \"$validacion\")'" : '';

            if ($campo['tipo'] === 'radio') {
                echo "<div class='radio-group'>";
                foreach ($campo['opciones'] as $opcion) {
                    $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                    echo "<input type='radio' id='{$campo['nombre']}_{$opcion}' name='{$campo['nombre']}' value='{$opcion}'>";
                    echo "<label for='{$campo['nombre']}_{$opcion}'>$opcionTexto</label>";
                }
                echo "</div>";
            } elseif ($campo['tipo'] === 'select') {
                echo "<select id='{$campo['nombre']}' name='{$campo['nombre']}'>";
                foreach ($campo['opciones'] as $opcion) {
                    $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                    echo "<option value='{$opcion}'>$opcionTexto</option>";
                }
                echo "</select>";
            } elseif ($campo['tipo'] === 'textarea') {
                $filas = $campo['filas'] ?? 3;
                echo "<textarea id='{$campo['nombre']}' name='{$campo['nombre']}' rows='{$filas}' $onInput></textarea>";
            } else {
                echo "<input type='{$campo['tipo']}' id='{$campo['nombre']}' name='{$campo['nombre']}' $onInput " . ($campo['requerido'] ? 'required' : '') . ">";
            }

            echo "</div>"; // Cierra el contenedor del campo
            echo "<span class='mensaje-error' style='color: red; display: none;'></span>";
        }
    }

    $archivoJson = __DIR__ . '/json/contacto_form.json';
    if (file_exists($archivoJson)) {
        $json = json_decode(mb_convert_encoding(file_get_contents($archivoJson), 'UTF-8', 'auto'), true);
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            procesarFormulario($json);
        }
    } else {
        mostrarPopup("Error: No se encontró el archivo de configuración JSON.", false);
    }
    ?>

    <main>
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0;">
                <?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?>
            </h2>
            <?php if (!empty($json['parametros']['tituloimagen'])): ?>
                <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen'], ENT_QUOTES, 'UTF-8'); ?>" 
                     alt="Título Imagen" style="width: 50px; height: auto;"> <!-- Tamaño ajustado -->
            <?php endif; ?>
        </div>

        <p><?php echo htmlspecialchars($json['parametros']['comentario'], ENT_QUOTES, 'UTF-8'); ?></p>
        <form id="formulario" method="POST" enctype="multipart/form-data">
            <?php generarFormulario($json); ?>
            <button type="submit">Enviar</button>
        </form>
        <footer>
            <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
        </footer>
    </main>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($json['parametros']['titulo'] ?? 'Formulario Dinámico'); ?></title>
    <link rel="stylesheet" href="css/estilos.css"> <!-- Mantener el archivo de estilos -->
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
                continue; // Ignorar campos inactivos
            }

            if ($campo['tipo'] === 'Adjuntos' && $cantidadMaximaAdjuntos === 0) {
                continue; // Ignorar si no se permiten adjuntos
            }

            $etiqueta = htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8');
            echo "<div class='campo-container'>";
            echo "<label for='{$campo['nombre']}'>$etiqueta:</label>";

            $validacion = isset($campo['validacion']) ? $campo['validacion'] : '';

            if ($campo['tipo'] === 'radio') {
                echo "<div class='radio-group' id='{$campo['nombre']}_container'>";
                foreach ($campo['opciones'] as $opcion) {
                    $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                    echo "<input type='radio' id='{$campo['nombre']}_{$opcion}' name='{$campo['nombre']}' value='{$opcion}'>";
                    echo "<label for='{$campo['nombre']}_{$opcion}'>$opcionTexto</label>";
                }
                // Input para agregar nuevas opciones dinámicas
                echo "<input type='text' id='{$campo['nombre']}_add' placeholder='Agregar nueva opción'>";
                echo "<button type='button' onclick='agregarRadio(\"{$campo['nombre']}\")'>Añadir</button>";
                echo "</div>";
            } elseif ($campo['tipo'] === 'select') {
                echo "<div id='{$campo['nombre']}_container'>";
                echo "<select id='{$campo['nombre']}' name='{$campo['nombre']}'>";
                foreach ($campo['opciones'] as $opcion) {
                    $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                    echo "<option value='{$opcion}'>$opcionTexto</option>";
                }
                echo "</select>";
                // Input para agregar nuevas opciones dinámicas
                echo "<input type='text' id='{$campo['nombre']}_add' placeholder='Agregar nueva opción'>";
                echo "<button type='button' onclick='agregarSelect(\"{$campo['nombre']}\")'>Añadir</button>";
                echo "</div>";
            } elseif ($campo['tipo'] === 'textarea') {
                $filas = $campo['filas'] ?? 3;
                echo "<textarea id='{$campo['nombre']}' name='{$campo['nombre']}' rows='{$filas}'></textarea>";
            } else {
                echo "<input type='{$campo['tipo']}' id='{$campo['nombre']}' name='{$campo['nombre']}'>";
            }

            echo "</div>"; // Cierra el contenedor del campo
            echo "<span class='mensaje-error' style='color: red; display: none;'></span>";
        }
    }

    $archivoJson= $_GET['archivo'] ;

    // Validar que el archivo JSON fue recibido correctamente
    if (!isset($archivoJson)) {
        echo "<p>Error: No se recibió el archivo JSON correctamente.</p>";
        exit;
    }

    // Comprobar si el archivo existe
    if (file_exists($archivoJson)) {
        $json = json_decode(mb_convert_encoding(file_get_contents($archivoJson), 'UTF-8', 'auto'), true);
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            procesarFormulario($json); // Procesar formulario si hay datos enviados por POST
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
                     alt="Título Imagen" style="width: 50px; height: auto;">
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

    <!-- Script para agregar opciones dinámicas -->
    <script>
        // Función para agregar opciones en campos "radio"
        function agregarRadio(nombreCampo) {
            const container = document.getElementById(`${nombreCampo}_container`); // Contenedor del radio
            const inputAdd = document.getElementById(`${nombreCampo}_add`); // Input para agregar
            const valorNuevo = inputAdd.value.trim(); // Valor ingresado por el usuario

            if (valorNuevo) {
                // Crear el nuevo radio button
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.id = `${nombreCampo}_${valorNuevo}`;
                radio.name = nombreCampo;
                radio.value = valorNuevo;

                // Crear el label para el nuevo radio button
                const label = document.createElement('label');
                label.setAttribute('for', `${nombreCampo}_${valorNuevo}`);
                label.textContent = valorNuevo;

                // Insertar el nuevo radio y su label antes del input de agregar
                container.insertBefore(radio, inputAdd);
                container.insertBefore(label, inputAdd);

                // Refrescar visualmente seleccionando el nuevo valor
                radio.checked = true;

                // Limpiar el campo de texto después de añadir
                inputAdd.value = '';
            } else {
                alert("Por favor, ingresa un valor válido."); // Mostrar alerta si el valor está vacío
            }
        }

        // Función para agregar opciones en campos "select"
        function agregarSelect(nombreCampo) {
            const select = document.getElementById(nombreCampo); // Select dinámico
            const inputAdd = document.getElementById(`${nombreCampo}_add`); // Input para agregar
            const valorNuevo = inputAdd.value.trim(); // Valor ingresado por el usuario

            if (valorNuevo) {
                // Crear la nueva opción
                const option = document.createElement('option');
                option.value = valorNuevo;
                option.textContent = valorNuevo;

                // Agregar la opción al select y seleccionarla
                select.appendChild(option);
                select.value = valorNuevo;

                // Limpiar el campo de texto después de añadir
                inputAdd.value = '';
            } else {
                alert("Por favor, ingresa un valor válido."); // Mostrar alerta si el valor está vacío
            }
        }
    </script>
</body>
</html>

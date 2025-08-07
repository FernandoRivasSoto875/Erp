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
<?php
header('Content-Type: application/json');

// --- FUNCIONES AUXILIARES ---
function getFieldLabel($fieldName, $fieldsets) {
    foreach ($fieldsets as $fieldset) {
        foreach ($fieldset['fields'] as $field) {
            if ($field['name'] === $fieldName) {
                return $field['label'] ?? ucfirst($fieldName);
            }
        }
    }
    return ucfirst($fieldName);
}

$response = ['success' => false, 'message' => 'Error desconocido.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['json_file'])) {
    $jsonFile = basename($_POST['json_file']);
    $jsonPath = 'json/' . $jsonFile;

    if (!file_exists($jsonPath)) {
        $response['message'] = 'Archivo de configuración no encontrado.';
        echo json_encode($response);
        exit;
    }

    $config = json_decode(file_get_contents($jsonPath), true);
    $params = $config['parametros'] ?? [];
    $formData = $_POST;
    // --- MANEJO DE ARCHIVOS ADJUNTOS ---
    $archivosAdjuntos = [];
    if (!empty($_FILES)) {
        $tiposPermitidos = $params['adjuntos']['tipos_permitidos'] ?? [];
        $tamanoMaximoMB = $params['adjuntos']['tamano_maximo_mb'] ?? 5;
        $tamanoMaximoBytes = $tamanoMaximoMB * 1024 * 1024;
        foreach ($_FILES as $campo => $archivo) {
            if ($archivo['error'] === UPLOAD_ERR_OK) {
                $tipo = $archivo['type'];
                $tamano = $archivo['size'];
                if ((!empty($tiposPermitidos) && !in_array($tipo, $tiposPermitidos)) || $tamano > $tamanoMaximoBytes) {
                    continue; // Salta archivos no válidos
                }
                $nombreSeguro = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($archivo['name']));
                $rutaDestino = $uploadsDir . uniqid('adj_') . '_' . $nombreSeguro;
                if (move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
                    $archivosAdjuntos[] = $rutaDestino;
                    $formData[$campo] = $nombreSeguro;
                }
            }
        }
    }
    $fieldsets = $config['fieldsets'] ?? [];
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    try {
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $formatosGenerados = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');

        // --- Preparar contenido común ---
        $datosParaArchivos = [];
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1><table border='1' cellpadding='5' cellspacing='0' style='border-collapse:collapse; width:100%;'>";
        foreach ($formData as $key => $value) {
            if ($key === 'json_file') continue;
            $label = getFieldLabel($key, $fieldsets);
            $displayValue = is_array($value) ? implode(', ', $value) : nl2br(htmlspecialchars($value));
            $datosParaArchivos[] = ['label' => $label, 'value' => is_array($value) ? implode(', ', $value) : $value];
            $cuerpoHtml .= "<tr><td style='width:30%;'><strong>" . htmlspecialchars($label) . "</strong></td><td>{$displayValue}</td></tr>";
        }
        $cuerpoHtml .= "</table><hr><p>" . htmlspecialchars($params['pie'] ?? '') . "</p>";

        // --- Generar Formatos ---
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\n";
            $headers .= 'From: <' . ($params['mailDe'] ?? 'noreply@example.com') . ">\r\n";
            // Adjuntar archivos si existen
            if (!empty($archivosAdjuntos)) {
                $boundary = md5(uniqid(time()));
                $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
                $mensaje = "--$boundary\r\n";
                $mensaje .= "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n";
                $mensaje .= $cuerpoHtml . "\r\n";
                foreach ($archivosAdjuntos as $rutaAdj) {
                    $nombreAdj = basename($rutaAdj);
                    $contenidoAdj = chunk_split(base64_encode(file_get_contents($rutaAdj)));
                    $tipoAdj = mime_content_type($rutaAdj);
                    $mensaje .= "--$boundary\r\n";
                    $mensaje .= "Content-Type: $tipoAdj; name=\"$nombreAdj\"\r\n";
                    $mensaje .= "Content-Disposition: attachment; filename=\"$nombreAdj\"\r\n";
                    $mensaje .= "Content-Transfer-Encoding: base64\r\n\r\n";
                    $mensaje .= $contenidoAdj . "\r\n";
                }
                $mensaje .= "--$boundary--";
                mail($params['destinatario'], $params['subject'], $mensaje, $headers);
            } else {
                mail($params['destinatario'], $params['subject'], $cuerpoHtml, $headers);
            }
            $formatosGenerados[] = 'Correo (htmlc)';
        }
        if (in_array('html', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.html', $cuerpoHtml);
            $formatosGenerados[] = 'HTML';
        }
        if (in_array('json', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.json', json_encode($formData, JSON_PRETTY_PRINT));
            $formatosGenerados[] = 'JSON';
        }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { // Corregido 'cvs'
            $fp = fopen($baseFilename . '.csv', 'w');
            fputcsv($fp, ['Campo', 'Valor']); // Cabeceras
            foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); }
            fclose($fp);
            $formatosGenerados[] = 'CSV';
        }
        // --- Simuladores para formatos complejos ---
        if (in_array('pdf', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.pdf.txt', "Aquí se generaría el PDF con los datos.\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'PDF (simulado)';
        }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.xlsx.txt', "Aquí se generaría el Excel con los datos.\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'XLSX (simulado)';
        }
        if (in_array('doc', $formatosAgenerar)) {
            file_put_contents($baseFilename . '.doc.txt', "Aquí se generaría el DOC con los datos.\n\n" . print_r($datosParaArchivos, true));
            $formatosGenerados[] = 'DOC (simulado)';
        }
        if (in_array('xml', $formatosAgenerar)) {
            $xml = new SimpleXMLElement('<formulario/>');
            foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); }
            $xml->asXML($baseFilename . '.xml');
            $formatosGenerados[] = 'XML';
        }

        $response['success'] = true;
        $response['message'] = 'Procesado correctamente.';
        $response['formats_generated'] = $formatosGenerados;
        $response['limpiar_formulario'] = $params['limpiar'] ?? false;

    } catch (Exception $e) {
        $response['message'] = 'Excepción: ' . $e->getMessage();
    }
} else {
    $response['message'] = 'Método no permitido o falta archivo de configuración.';
}

echo json_encode($response);

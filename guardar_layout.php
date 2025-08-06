<?php
// guardar_layout.php
header('Content-Type: application/json');

// --- Validación de Seguridad Básica ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$nombreArchivoJson = $input['archivo_json'] ?? null;
$nuevoLayout = $input['layout'] ?? null;

if (!$nombreArchivoJson || !$nuevoLayout) {
    http_response_code(400); // Bad Request
    echo json_encode(['estado' => 'error', 'mensaje' => 'Faltan datos necesarios (archivo_json o layout).']);
    exit;
}

// --- Medida de seguridad: Evitar Path Traversal ---
// Asegurarse de que el archivo esté dentro del directorio 'json/'
$baseDir = __DIR__ . '/json/';
$rutaCompleta = realpath($baseDir . basename($nombreArchivoJson));

if (!$rutaCompleta || strpos($rutaCompleta, $baseDir) !== 0 || !file_exists($rutaCompleta)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Archivo JSON no válido o no encontrado.']);
    exit;
}

// --- Lógica para Actualizar el JSON ---
try {
    // Leer el contenido actual del archivo
    $contenidoJson = file_get_contents($rutaCompleta);
    if ($contenidoJson === false) {
        throw new Exception('No se pudo leer el archivo JSON.');
    }

    $datos = json_decode($contenidoJson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error al decodificar el JSON: ' . json_last_error_msg());
    }

    // Reemplazar la sección de layout
    $datos['layout'] = $nuevoLayout;

    // Guardar el archivo con el nuevo layout
    // JSON_PRETTY_PRINT para que sea legible
    // JSON_UNESCAPED_UNICODE para no convertir caracteres como 'ñ' o 'á' a \uXXXX
    $resultado = file_put_contents($rutaCompleta, json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($resultado === false) {
        throw new Exception('No se pudo escribir en el archivo JSON. Verifique los permisos.');
    }

    echo json_encode(['estado' => 'exito', 'mensaje' => 'El diseño ha sido guardado correctamente.']);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['estado' => 'error', 'mensaje' => $e->getMessage()]);
}
?>

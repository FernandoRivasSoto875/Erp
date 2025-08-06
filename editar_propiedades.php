<?php
// editar_propiedades.php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$nombreArchivoJson = $input['archivo_json'] ?? null;
$editType = $input['edit_type'] ?? null;
$itemName = $input['item_name'] ?? null;
$newProperties = $input['properties'] ?? null;

if (!$nombreArchivoJson || !$editType || !$itemName || !$newProperties) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Faltan datos necesarios.']);
    exit;
}

// --- Medida de seguridad: Evitar Path Traversal ---
$baseDir = __DIR__ . '/json/';
$rutaCompleta = realpath($baseDir . basename($nombreArchivoJson));

if (!$rutaCompleta || strpos($rutaCompleta, $baseDir) !== 0 || !file_exists($rutaCompleta)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Archivo JSON no válido o no encontrado.']);
    exit;
}

try {
    $contenidoJson = file_get_contents($rutaCompleta);
    $datos = json_decode($contenidoJson, true);

    if ($editType === 'fieldset') {
        if (isset($datos['fieldsets'][$itemName])) {
            // Actualizamos solo el título por ahora
            $datos['fieldsets'][$itemName]['titulo'] = $newProperties['titulo'];
        } else {
            throw new Exception("Fieldset '{$itemName}' no encontrado.");
        }
    } elseif ($editType === 'field') {
        $encontrado = false;
        foreach ($datos['fieldsets'] as &$fieldset) {
            foreach ($fieldset['campos'] as &$campo) {
                if ($campo['nombre'] === $itemName) {
                    // Actualizamos las propiedades del campo
                    $campo['etiqueta'] = $newProperties['etiqueta'];
                    $campo['placeholder'] = $newProperties['placeholder'];
                    // Aquí se podrían añadir más propiedades
                    $encontrado = true;
                    break 2;
                }
            }
        }
        if (!$encontrado) {
            throw new Exception("Campo '{$itemName}' no encontrado.");
        }
    } else {
        throw new Exception("Tipo de edición '{$editType}' no soportado.");
    }

    $resultado = file_put_contents($rutaCompleta, json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($resultado === false) {
        throw new Exception('No se pudo escribir en el archivo JSON.');
    }

    echo json_encode(['estado' => 'exito', 'mensaje' => 'Propiedades actualizadas correctamente.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => $e->getMessage()]);
}
?>

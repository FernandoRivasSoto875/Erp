<?php
// guardar_layout.php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new RuntimeException('Método no permitido');
    }

    $archivo = isset($_POST['archivo']) ? basename((string)$_POST['archivo']) : '';
    if ($archivo === '') throw new RuntimeException('Falta "archivo"');

    $ruta = __DIR__ . '/json/' . $archivo;
    if (!is_file($ruta)) {
        // si no existe, parte de un JSON vacío
        $json = [];
    } else {
        $raw = file_get_contents($ruta);
        $json = json_decode($raw, true);
        if (!is_array($json)) $json = [];
    }

    // Decodificar bloques entrantes (si vienen)
    $updates = [];
    foreach (['parametros','layout','fieldsets','elementos_fuera'] as $k) {
        if (isset($_POST[$k])) {
            $val = json_decode((string)$_POST[$k], true);
            if ($val === null && $_POST[$k] !== 'null') {
                throw new RuntimeException('JSON inválido en "' . $k . '"');
            }
            $updates[$k] = $val;
        }
    }

    if (!$updates) throw new RuntimeException('Nada para guardar');

    // Reemplazo directo por bloque
    foreach ($updates as $k => $val) {
        $json[$k] = $val;
    }

    // Guardar con pretty print
    $jsonStr = json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($jsonStr === false) throw new RuntimeException('No se pudo codificar JSON');

    // Backup simple
    if (is_file($ruta)) {
        @copy($ruta, $ruta . '.bak');
    }

    $ok = file_put_contents($ruta, $jsonStr, LOCK_EX);
    if ($ok === false) throw new RuntimeException('No se pudo escribir el archivo');

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}


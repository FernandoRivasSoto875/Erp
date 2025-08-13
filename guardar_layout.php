<?php
// guardar_layout.php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('Método no permitido');

    $archivo = isset($_POST['archivo']) ? trim((string)$_POST['archivo']) : '';
    if ($archivo === '') throw new RuntimeException('Falta parámetro "archivo".');

    $baseDir = __DIR__ . DIRECTORY_SEPARATOR . 'json';
    if (!is_dir($baseDir)) throw new RuntimeException('Carpeta json no existe.');
    $file = $baseDir . DIRECTORY_SEPARATOR . basename($archivo);

    // Carga actual
    $current = [];
    if (is_file($file)) {
        $txt = file_get_contents($file);
        $current = json_decode($txt, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($current)) $current = [];
    }

    // Decodifica solo lo que llega
    $keys = ['parametros','layout','fieldsets','elementos_fuera'];
    $updates = [];
    foreach ($keys as $k) {
        if (array_key_exists($k, $_POST)) {
            $val = $_POST[$k];
            if ($val === '' || $val === null) continue;
            $updates[$k] = json_decode($val, true, 512, JSON_THROW_ON_ERROR);
        }
    }
    if (!$updates) throw new RuntimeException('Sin cambios para guardar.');

    // Merge no destructivo
    $merged = $current;
    foreach ($updates as $k => $v) {
        $merged[$k] = $v;
    }

    // Backup
    if (is_file($file)) {
        $bak = $file . '.' . date('Ymd_His') . '.bak';
        @copy($file, $bak);
    }

    // Escribe con lock
    $json = json_encode($merged, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
    if ($json === false) throw new RuntimeException('Error al codificar JSON.');
    $ok = file_put_contents($file, $json, LOCK_EX);
    if ($ok === false) throw new RuntimeException('No se pudo escribir el archivo.');

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}


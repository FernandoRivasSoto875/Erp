<?php
// guardar_layout.php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('Método no permitido');
    $archivo = $_POST['archivo'] ?? '';
    if (!$archivo) throw new InvalidArgumentException('Falta archivo');

    $base = basename($archivo);
    if (stripos($base, '.json') === false) $base .= '.json';
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $base;
    if (!is_file($path)) throw new RuntimeException('JSON no encontrado');

    $json = json_decode(file_get_contents($path), true);
    if (!is_array($json)) $json = [];

    if (isset($_POST['layout'])) {
        $layout = json_decode((string)$_POST['layout'], true);
        if (json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('layout inválido');
        $json['layout'] = $layout;
    }
    if (isset($_POST['elementos_fuera'])) {
        $out = json_decode((string)$_POST['elementos_fuera'], true);
        if (json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('elementos_fuera inválido');
        $json['elementos_fuera'] = $out;
    }
    if (isset($_POST['fieldsets'])) {
        $fs = json_decode((string)$_POST['fieldsets'], true);
        if (json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('fieldsets inválido');
        $json['fieldsets'] = $fs;
    }
    if (isset($_POST['layout_html'])) {
        $json['layout_html'] = (string)$_POST['layout_html'];
    }

    $backup = $path.'.bak-'.date('Ymd_His');
    @copy($path, $backup);
    file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));

    echo json_encode(['success'=>true, 'message'=>'Layout guardado', 'backup'=>basename($backup)]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
}


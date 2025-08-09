<?php
// editar_propiedades.php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('Método no permitido');
    $archivo  = $_POST['archivo']  ?? '';
    $tipo     = $_POST['tipo']     ?? ''; // 'fieldset' | 'field'
    $fieldset = $_POST['fieldset'] ?? '';
    $nombre   = $_POST['nombre']   ?? '';

    if (!$archivo || !$tipo) throw new InvalidArgumentException('Parámetros insuficientes');

    $base = basename($archivo);
    if (stripos($base, '.json') === false) $base .= '.json';
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $base;
    if (!is_file($path)) throw new RuntimeException('JSON no encontrado');

    $json = json_decode(file_get_contents($path), true);
    if (!is_array($json)) $json = [];
    $fieldsets = $json['fieldsets'] ?? [];

    // Normalizar a mapa por name si viene lista
    if (array_keys($fieldsets) === range(0, count($fieldsets)-1)) {
        $map = [];
        foreach ($fieldsets as $fs) {
            if (!empty($fs['name'])) $map[$fs['name']] = $fs;
        }
        if ($map) $fieldsets = $map;
    }

    if ($tipo === 'fieldset') {
        if (!$fieldset || !isset($fieldsets[$fieldset])) throw new InvalidArgumentException('Fieldset no encontrado');
        if (isset($_POST['titulo'])) $fieldsets[$fieldset]['titulo'] = (string)$_POST['titulo'];
    } elseif ($tipo === 'field') {
        if (!$fieldset || !isset($fieldsets[$fieldset])) throw new InvalidArgumentException('Fieldset no encontrado');
        if (!$nombre) throw new InvalidArgumentException('Falta nombre del campo');
        $campos = $fieldsets[$fieldset]['campos'] ?? [];
        foreach ($campos as &$c) {
            if (($c['nombre'] ?? null) === $nombre) {
                foreach (['etiqueta','placeholder','valor_predeterminado','tipo','query','data-formula'] as $k) {
                    if (isset($_POST[$k])) $c[$k] = (string)$_POST[$k];
                }
                if (isset($_POST['opciones'])) {
                    $opts = json_decode((string)$_POST['opciones'], true);
                    if (json_last_error() === JSON_ERROR_NONE) $c['opciones'] = $opts;
                }
                if (isset($_POST['atributos'])) {
                    $attrs = json_decode((string)$_POST['atributos'], true);
                    if (json_last_error() === JSON_ERROR_NONE) $c['atributos'] = $attrs;
                }
                break;
            }
        }
        $fieldsets[$fieldset]['campos'] = $campos;
    } else {
        throw new InvalidArgumentException('Tipo no soportado');
    }

    $json['fieldsets'] = $fieldsets;

    $backup = $path.'.bak-'.date('Ymd_His');
    @copy($path, $backup);
    file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));

    echo json_encode(['success'=>true,'message'=>'Propiedades actualizadas','backup'=>basename($backup)]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
?>

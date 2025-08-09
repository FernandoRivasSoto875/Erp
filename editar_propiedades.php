<?php
// editar_propiedades.php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('Método no permitido');

    $archivo  = $_POST['archivo']  ?? '';
    $tipo     = $_POST['tipo']     ?? ''; // 'form' | 'fieldset' | 'field'
    $fieldset = $_POST['fieldset'] ?? '';
    $nombre   = $_POST['nombre']   ?? '';

    if ($archivo === '' || $tipo === '') throw new InvalidArgumentException('Parámetros insuficientes');

    $base = basename($archivo);
    if (stripos($base, '.json') === false) $base .= '.json';
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $base;
    if (!is_file($path)) throw new RuntimeException('JSON no encontrado');

    $json = json_decode(file_get_contents($path), true);
    if (!is_array($json)) $json = [];
    $json['parametros'] = $json['parametros'] ?? [];
    $fieldsets = $json['fieldsets'] ?? [];

    // Normalizar fieldsets a mapa si vienen como lista
    if (is_array($fieldsets) && array_keys($fieldsets) === range(0, count($fieldsets)-1)) {
        $map = [];
        foreach ($fieldsets as $fs) {
            if (!is_array($fs)) continue;
            $key = $fs['name'] ?? $fs['nombre'] ?? null;
            if ($key) $map[$key] = $fs;
        }
        if ($map) $fieldsets = $map;
    }

    switch ($tipo) {
        case 'form':
            foreach (['titulo','comentario','pie','tituloimagen'] as $k) {
                if (array_key_exists($k, $_POST)) $json['parametros'][$k] = (string)$_POST[$k];
            }
            break;

        case 'fieldset':
            if ($fieldset === '' || !isset($fieldsets[$fieldset])) throw new InvalidArgumentException('Fieldset no encontrado');
            if (isset($_POST['titulo'])) $fieldsets[$fieldset]['titulo'] = (string)$_POST['titulo'];
            break;

        case 'field':
            if ($fieldset === '' || !isset($fieldsets[$fieldset])) throw new InvalidArgumentException('Fieldset no encontrado');
            if ($nombre === '') throw new InvalidArgumentException('Falta nombre del campo');

            $campos = $fieldsets[$fieldset]['campos'] ?? [];
            $idx = -1;
            foreach ($campos as $i => $c) {
                if (($c['nombre'] ?? null) === $nombre) { $idx = $i; break; }
            }
            if ($idx < 0) throw new InvalidArgumentException('Campo no encontrado en el fieldset');

            if (isset($_POST['opciones'])) {
                $opts = json_decode((string)$_POST['opciones'], true);
                if (json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('Opciones JSON inválido');
                $campos[$idx]['opciones'] = $opts;
            }
            if (isset($_POST['atributos'])) {
                $attrs = json_decode((string)$_POST['atributos'], true);
                if (json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('Atributos JSON inválido');
                $campos[$idx]['atributos'] = $attrs;
            }

            $reservadas = ['archivo','tipo','fieldset','nombre','opciones','atributos'];
            foreach ($_POST as $k => $v) {
                if (in_array($k, $reservadas, true)) continue;
                $campos[$idx][$k] = (string)$v;
            }

            $fieldsets[$fieldset]['campos'] = $campos;
            $json['fieldsets'] = $fieldsets;

            $backup = $path.'.bak-'.date('Ymd_His');
            @copy($path, $backup);
            file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX);

            echo json_encode([
                'success'=>true,
                'message'=>'Campo actualizado',
                'backup'=>basename($backup),
                'field'=>$json['fieldsets'][$fieldset]['campos'][$idx] ?? null
            ], JSON_UNESCAPED_UNICODE);
            return;

        default:
            throw new InvalidArgumentException('Tipo no soportado');
    }

    $json['fieldsets'] = $fieldsets;
    $backup = $path.'.bak-'.date('Ymd_His');
    @copy($path, $backup);
    file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX);

    echo json_encode(['success'=>true,'message'=>'Propiedades actualizadas','backup'=>basename($backup)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>

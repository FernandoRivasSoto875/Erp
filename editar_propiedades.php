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

    // Normalizar fieldsets a mapa por clave de array o por 'name'
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
            $encontrado = false;
            foreach ($campos as &$c) {
                if (($c['nombre'] ?? null) !== $nombre) continue;
                $encontrado = true;

                // 2.1) Props JSON específicas
                if (isset($_POST['opciones'])) {
                    $opts = json_decode((string)$_POST['opciones'], true);
                    if (json_last_error() === JSON_ERROR_NONE) $c['opciones'] = $opts;
                    else throw new InvalidArgumentException('Opciones JSON inválido');
                }
                if (isset($_POST['atributos'])) {
                    $attrs = json_decode((string)$_POST['atributos'], true);
                    if (json_last_error() === JSON_ERROR_NONE) $c['atributos'] = $attrs;
                    else throw new InvalidArgumentException('Atributos JSON inválido');
                }

                // 2.2) Cualquier otra propiedad enviada (genérica)
                $reservadas = ['archivo','tipo','fieldset','nombre','opciones','atributos'];
                foreach ($_POST as $k => $v) {
                    if (in_array($k, $reservadas, true)) continue;
                    // Mantener strings; el front valida/parsea donde corresponda
                    $c[$k] = (string)$v;
                }
                break;
            }
            unset($c);

            if (!$encontrado) throw new InvalidArgumentException('Campo no encontrado en el fieldset');
            $fieldsets[$fieldset]['campos'] = $campos;
            $json['fieldsets'] = $fieldsets;

            // Guardar con backup y lock
            $backup = $path.'.bak-'.date('Ymd_His');
            @copy($path, $backup);
            file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX);

            // Devolver el campo actualizado
            $campoActualizado = null;
            foreach ($json['fieldsets'][$fieldset]['campos'] as $c2) {
                if (($c2['nombre'] ?? null) === $nombre) { $campoActualizado = $c2; break; }
            }
            echo json_encode(['success'=>true,'message'=>'Campo actualizado','backup'=>basename($backup),'field'=>$campoActualizado], JSON_UNESCAPED_UNICODE);
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

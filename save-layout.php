<?php
<?php
header('Content-Type: application/json; charset=utf-8');

try {
  $raw = file_get_contents('php://input');
  if (!$raw) throw new Exception('Payload vacío');
  $data = json_decode($raw, true);
  if (!$data) throw new Exception('JSON inválido');

  $archivo = isset($data['archivo']) ? basename($data['archivo']) : 'formulariogenerico2.json';
  $target  = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $archivo;

  // Cargar JSON existente para mantener otros atributos
  $base = file_exists($target) ? json_decode(file_get_contents($target), true) : [];
  if (!is_array($base)) $base = [];

  // Actualizamos solo estructura (tabs + fieldsets + orden de campos)
  $base['tabs'] = $data['tabs'] ?? [];
  $base['fieldsets'] = array_map(function($g){
    return [
      'id'     => $g['id'],
      'titulo' => $g['title'] ?? $g['id'],
      'tab'    => $g['tab'],
      'fields' => array_map(fn($f)=> $f['id'], $g['fields'] ?? [])
    ];
  }, $data['groups'] ?? []);

  $base['ultimaActualizacion'] = date('c');

  if (!is_dir(dirname($target))) {
    if (!mkdir(dirname($target), 0775, true)) throw new Exception('No se pudo crear directorio json');
  }

  if (false === file_put_contents($target, json_encode($base, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE))) {
    throw new Exception('No se pudo escribir JSON');
  }

  echo json_encode(['ok'=>true,'file'=>$archivo,'grupos'=>count($base['fieldsets'])]);
} catch (Exception $e){
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
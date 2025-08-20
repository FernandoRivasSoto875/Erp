<?php
// Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
header('Content-Type: application/json');
$result = [
    'ok' => true,
    'msg' => '',
    'missing' => []
];
$funcs = [
    'fd_render_rows_fallback',
    'fd_render_tabs_section',
    'fd_render_layout_fallback',
    'fd_render_fieldset_fallback',
    'generarCampo',
    'generarLayout',
    'generarFieldsetContenido'
];
foreach ($funcs as $f) {
    if (!function_exists($f)) {
        $result['ok'] = false;
        $result['missing'][] = $f;
    }
}
if (!$result['ok']) {
    $result['msg'] = 'Faltan funciones PHP requeridas.';
} else {
    $result['msg'] = 'Todas las funciones PHP requeridas están presentes.';
}
echo json_encode($result);

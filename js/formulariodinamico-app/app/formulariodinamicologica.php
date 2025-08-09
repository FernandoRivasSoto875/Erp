<?php
// filepath: formulariodinamico-app/app/formulariodinamicologica.php

if (session_status() === PHP_SESSION_NONE) session_start();

function cargarJson($archivo_json) {
    $json_path = __DIR__ . '/../json/' . basename($archivo_json);
    if (!is_file($json_path)) {
        return [];
    }
    $json_data_raw = file_get_contents($json_path);
    return json_decode($json_data_raw, true) ?: [];
}

function generarArbolJson($data, $parentKey = '') {
    $html = '<ul>';
    foreach ($data as $key => $value) {
        $currentKey = $parentKey ? $parentKey . '.' . $key : $key;
        $html .= '<li>';
        if (is_array($value)) {
            $html .= '<span class="json-key" data-key="' . htmlspecialchars($currentKey) . '">' . htmlspecialchars($key) . '</span>';
            $html .= generarArbolJson($value, $currentKey);
        } else {
            $html .= '<span class="json-key" data-key="' . htmlspecialchars($currentKey) . '">' . htmlspecialchars($key) . '</span>: <span class="json-value" contenteditable="true" data-key="' . htmlspecialchars($currentKey) . '">' . htmlspecialchars($value) . '</span>';
        }
        $html .= '</li>';
    }
    $html .= '</ul>';
    return $html;
}

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$json_data = cargarJson($archivo_json);
?>

<div id="json-tree-panel" class="border p-3">
    <h5>Árbol de JSON</h5>
    <div id="json-tree">
        <?php echo generarArbolJson($json_data); ?>
    </div>
</div>

<script>
document.querySelectorAll('.json-value').forEach(function(element) {
    element.addEventListener('blur', function() {
        const key = this.getAttribute('data-key');
        const newValue = this.textContent;
        // Aquí puedes agregar lógica para guardar el nuevo valor en el JSON
        console.log('Key:', key, 'New Value:', newValue);
    });
});
</script>
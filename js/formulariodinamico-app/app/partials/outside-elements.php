<?php
// filepath: /formulariodinamico-app/app/partials/outside-elements.php

if (session_status() === PHP_SESSION_NONE) session_start();

$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$json_path = __DIR__ . '/../json/' . basename($archivo_json);

if (!is_file($json_path)) {
    die("<div class='alert alert-danger'>No existe el archivo: " . htmlspecialchars($json_path) . "</div>");
}

$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true) ?: [];

function renderJsonTree($data, $parentKey = '') {
    $html = '<ul>';
    foreach ($data as $key => $value) {
        $currentKey = $parentKey ? $parentKey . '.' . $key : $key;
        if (is_array($value)) {
            $html .= '<li>' . htmlspecialchars($key) . renderJsonTree($value, $currentKey) . '</li>';
        } else {
            $html .= '<li>' . htmlspecialchars($key) . ': <span class="editable" data-key="' . htmlspecialchars($currentKey) . '">' . htmlspecialchars($value) . '</span></li>';
        }
    }
    $html .= '</ul>';
    return $html;
}
?>

<div id="json-tree-panel" class="container mt-3">
    <h5>Árbol de JSON</h5>
    <div id="json-tree">
        <?php echo renderJsonTree($json_data); ?>
    </div>
</div>

<script>
document.querySelectorAll('.editable').forEach(function(element) {
    element.addEventListener('click', function() {
        const key = this.dataset.key;
        const currentValue = this.textContent;
        const newValue = prompt('Edit value for ' + key, currentValue);
        if (newValue !== null) {
            this.textContent = newValue;
            // Here you would typically send the updated value back to the server via AJAX
            console.log('Updated ' + key + ' to ' + newValue);
        }
    });
});
</script>
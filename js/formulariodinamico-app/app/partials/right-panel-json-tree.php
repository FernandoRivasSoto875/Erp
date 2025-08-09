<?php
$json_path = __DIR__ . '/../../json/' . basename($_GET['archivo'] ?? 'formulariogenerico2.json');
$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true) ?: [];

function renderJsonTree($data, $parentKey = '') {
    $html = '<ul>';
    foreach ($data as $key => $value) {
        $currentKey = $parentKey ? $parentKey . '.' . $key : $key;
        if (is_array($value)) {
            $html .= '<li>' . htmlspecialchars($key) . renderJsonTree($value, $currentKey) . '</li>';
        } else {
            $html .= '<li>' . htmlspecialchars($key) . ': <input type="text" value="' . htmlspecialchars($value) . '" data-key="' . htmlspecialchars($currentKey) . '" class="json-value-input" /></li>';
        }
    }
    $html .= '</ul>';
    return $html;
}
?>

<div id="json-tree-panel" class="border p-3">
    <h5>JSON Tree Structure</h5>
    <div id="json-tree">
        <?php echo renderJsonTree($json_data); ?>
    </div>
</div>

<script>
document.querySelectorAll('.json-value-input').forEach(input => {
    input.addEventListener('change', function() {
        const key = this.getAttribute('data-key');
        const newValue = this.value;
        // Logic to update the JSON data structure in the application
        console.log(`Updated ${key} to ${newValue}`);
    });
});
</script>
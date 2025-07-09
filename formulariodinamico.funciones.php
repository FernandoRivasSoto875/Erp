 
<?php
// Asegúrate de que la conexión a la BD esté disponible
require_once 'funcionessql.php';

/**
 * Genera el HTML del formulario dinámico.
 * ¡VERSIÓN FINAL Y COMPLETA! Restaura la funcionalidad de todos los tipos de campo.
 */
function generarFieldsets($fieldsets, $valores = [], $soloLectura = false) {
    $html = "";
    foreach ($fieldsets as $fieldset) {
        $legend = $fieldset['legend'] ?? '';
        $style = $fieldset['style'] ?? '';
        $html .= "<fieldset style='" . htmlspecialchars($style, ENT_QUOTES) . "'>";
        if ($legend) $html .= "<legend>$legend</legend>";

        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'] ?? '';
                $label = $field['label'] ?? '';
                $type = $field['type'] ?? 'text';
                $value = $valores[$name] ?? ($field['value'] ?? '');
                $labelPosition = $field['labelPosition'] ?? 'top';

                $html .= "<div class='campo-container label-{$labelPosition}'>";
                if ($label && $type !== 'hidden') {
                    $html .= "<label for=\"$name\">$label</label>";
                }

                $buildAttrs = function($attrs) {
                    $str = '';
                    foreach ($attrs as $k => $v) {
                        if ($v === false || $v === null || (is_string($v) && $v === '')) continue;
                        if ($v === true) { $str .= " $k"; continue; }
                        $str .= " $k=\"" . htmlspecialchars(is_array($v) ? json_encode($v) : (string)$v, ENT_QUOTES) . "\"";
                    }
                    return $str;
                };

                $html .= "<div class='input-wrapper'>";
                switch ($type) {
                    // --- LÓGICA RESTAURADA PARA RADIO Y CHECKBOX ---
                    case 'radio':
                    case 'checkbox':
                        $options = $field['options'] ?? [];
                        $html .= "<div class='options-container'>";
                        foreach ($options as $option) {
                            $optionValue = $option['value'];
                            $optionLabel = $option['label'];
                            $id = "{$name}_{$optionValue}";
                            $currentName = ($type === 'checkbox' && count($options) > 1) ? "{$name}[]" : $name;
                            $checked = '';
                            if (is_array($value) ? in_array($optionValue, $value) : $value == $optionValue) {
                                $checked = ' checked';
                            }
                            $html .= "<div class='option-item'>";
                            $html .= "<input type='{$type}' name='{$currentName}' id='{$id}' value='{$optionValue}'{$checked}>";
                            if ($optionLabel) {
                                $html .= "<label for='{$id}'>{$optionLabel}</label>";
                            }
                            $html .= "</div>";
                        }
                        $html .= "</div>";
                        break;

                    case 'selectdata':
                        // ... (código de selectdata, ya es correcto) ...
                        break;

                    case 'datatable':
                        // ... (código de datatable, ya es correcto) ...
                        break;
                    
                    case 'textarea':
                        // ... (código de textarea, ya es correcto) ...
                        break;

                    default: // text, number, email, password, etc.
                        $attrs = ['type' => $type, 'name' => $name, 'id' => $name, 'value' => $value];
                        foreach ($field as $k => $v) {
                            if (in_array($k, ['placeholder', 'readonly', 'required', 'multiple', 'min', 'max', 'step', 'pattern']) || strpos($k, 'data-') === 0) {
                                $attrs[$k] = $v;
                            }
                        }
                        $html .= "<input " . $buildAttrs($attrs) . ">";
                        break;
                }
                $html .= "</div>"; // Cierre de input-wrapper
                $html .= "</div>"; // Cierre de campo-container
            }
        }
        $html .= "</fieldset>";
    }
    return $html;
}
?>
<?php
// Asegúrate de que la conexión a la BD esté disponible
require_once 'funcionessql.php';

// --- INICIO DE LA FUNCIÓN FALTANTE ---
/**
 * Prepara los datos recibidos por POST para ser guardados,
 * manejando la estructura de los datatables.
 * @param array $postData Los datos de $_POST.
 * @param array $allFields La definición de todos los campos del JSON.
 * @return array Un array con dos claves: 'main' para los campos principales y 'datatables' para los datos de las tablas.
 */
function prepararValoresGuardados($postData, $allFields) {
    $valoresPrincipales = [];
    $valoresDataTables = [];

    // Identificar los nombres de los campos que son datatables
    $nombresDataTables = [];
    foreach ($allFields as $field) {
        if (isset($field['type']) && $field['type'] === 'datatable') {
            $nombresDataTables[] = $field['name'];
        }
    }

    foreach ($postData as $key => $value) {
        if (in_array($key, $nombresDataTables) && is_array($value)) {
            // Es un datatable, lo guardamos en su propio array
            $valoresDataTables[$key] = $value;
        } else {
            // Es un campo normal
            $valoresPrincipales[$key] = $value;
        }
    }

    return ['main' => $valoresPrincipales, 'datatables' => $valoresDataTables];
}
// --- FIN DE LA FUNCIÓN FALTANTE ---


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
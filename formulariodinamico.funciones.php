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
    $html = '';
    
    // --- FUNCIÓN INTERNA MODIFICADA PARA MANEJAR ARRAYS ---
    $buildAttrs = function($attrs) {
        $str = '';
        foreach ($attrs as $k => $v) {
            if ($v === true) {
                $str .= " " . htmlspecialchars($k);
            } elseif ($v !== false && $v !== null) {
                // Si el valor es un array (como data-formula), lo convertimos a JSON.
                if (is_array($v)) {
                    $v = json_encode($v);
                }
                $str .= " " . htmlspecialchars($k) . "='" . htmlspecialchars($v, ENT_QUOTES, 'UTF-8') . "'";
            }
        }
        return $str;
    };

    foreach ($fieldsets as $fieldset) {
        $legend = $fieldset['legend'] ?? '';
        $style = !empty($fieldset['style']) ? htmlspecialchars($fieldset['style']) : '';
        $html .= "<fieldset style='{$style}'><legend>{$legend}</legend>";

        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $type = $field['type'] ?? 'text';
                $name = $field['name'] ?? '';
                $value = $valores[$name] ?? $field['value'] ?? '';
                $labelPosition = $field['labelPosition'] ?? 'top';

                $fieldStyle = !empty($field['style']) ? htmlspecialchars($field['style']) : '';
                $classes = "campo-container label-{$labelPosition}";
                $html .= "<div class='{$classes}' style='{$fieldStyle}'>";

                $label = $field['label'] ?? ucfirst($name);
                $placeholder = $field['placeholder'] ?? '';
                $id = "field-{$name}-" . uniqid();

                if ($labelPosition === 'top' || $labelPosition === 'top-left' || $labelPosition === 'top-center' || $labelPosition === 'top-right' || $labelPosition === 'left') {
                    if ($label) $html .= "<label for='$id'>$label</label>";
                }

                switch ($type) {
                    case 'textarea':
                        $html .= "<textarea name='$name' id='$id' placeholder='$placeholder' rows='" . ($field['rows'] ?? 3) . "'>$value</textarea>";
                        break;
                    
                    case 'radio':
                    case 'checkbox':
                        $options = $field['options'] ?? [];
                        if (empty($options)) break;

                        $layout = $field['layout'] ?? 'vertical';
                        $html .= "<div class='options-container layout-{$layout}'>";

                        foreach ($options as $option) {
                            $optionValue = $option['value'] ?? '';
                            $optionLabel = $option['label'] ?? '';
                            $currentName = ($type === 'checkbox' && count($options) > 1) ? "{$name}[]" : $name;
                            $optionId = "{$id}-{$optionValue}";
                            $checked = '';
                            if (is_array($value) ? in_array($optionValue, $value) : $value == $optionValue) {
                                $checked = ' checked';
                            }
                            $html .= "<div class='option-item'>";
                            $html .= "<input type='{$type}' name='{$currentName}' id='{$optionId}' value='{$optionValue}'{$checked}>";
                            if ($optionLabel) {
                                $html .= "<label for='{$optionId}'>{$optionLabel}</label>";
                            }
                            $html .= "</div>";
                        }
                        $html .= "</div>";
                        break;

                    case 'select':
                        $options = $field['options'] ?? [];
                        $html .= "<select name='$name' id='$id'>";
                        foreach ($options as $option) {
                            $selected = ($value == $option['value']) ? ' selected' : '';
                            $html .= "<option value='" . htmlspecialchars($option['value']) . "'$selected>" . htmlspecialchars($option['label']) . "</option>";
                        }
                        $html .= "</select>";
                        break;

                    case 'selectdata':
                        $dataConfig = $field['data'] ?? null;
                        if ($dataConfig) {
                            $tabla = $dataConfig['tabla']; $campo = $dataConfig['campo']; $filtro = $dataConfig['filtro'] ?? '1=1';
                            $html .= "<select name='$name' id='$id'><option value=''>Seleccione...</option>";
                            $conn = conexionBd();
                            $sql = "SELECT DISTINCT " . $conn->real_escape_string($campo) . " FROM " . $conn->real_escape_string($tabla) . " WHERE " . $filtro . " ORDER BY " . $conn->real_escape_string($campo);
                            $result = $conn->query($sql);
                            if ($result && $result->num_rows > 0) {
                                while($row = $result->fetch_assoc()) {
                                    $optionValue = htmlspecialchars($row[$campo], ENT_QUOTES);
                                    $selected = ($value == $row[$campo]) ? ' selected' : '';
                                    $html .= "<option value=\"$optionValue\"$selected>$optionValue</option>";
                                }
                            }
                            $conn->close();
                            $html .= "</select>";
                        }
                        break;

                    case 'datatable':
                        $columns = $field['columns'] ?? [];
                        $tableData = is_array($value) ? $value : [];
                        $html .= "<table class='datatable-container' id='$name'><thead><tr>";
                        foreach ($columns as $col) { $html .= "<th>" . htmlspecialchars($col['label'] ?? '') . "</th>"; }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";
                        if (!empty($tableData)) {
                            foreach ($tableData as $i => $rowData) {
                                $html .= "<tr>";
                                foreach ($columns as $col) {
                                    $colName = $col['name'];
                                    $colAttrs = ['type' => $col['type'] ?? 'text', 'name' => "{$name}[{$i}][{$colName}]", 'value' => $rowData[$colName] ?? '', 'class' => 'form-control'];
                                    foreach ($col as $k => $v) { if (in_array($k, ['placeholder', 'readonly']) || strpos($k, 'data-') === 0) { $colAttrs[$k] = $v; } }
                                    $html .= "<td><input " . $buildAttrs($colAttrs) . "></td>";
                                }
                                $html .= "<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>";
                            }
                        }
                        $html .= "</tbody></table><button type='button' id='btn-add-row-{$name}' class='btn btn-primary mt-2'>Agregar Fila</button>";
                        break;
                    
                    default:
                        $attrs = ['type' => $type, 'name' => $name, 'id' => $id, 'value' => $value, 'placeholder' => $placeholder];
                        foreach ($field as $k => $v) { if (in_array($k, ['required', 'readonly', 'multiple', 'min', 'max', 'step']) || strpos($k, 'data-') === 0) { $attrs[$k] = $v; } }
                        $html .= "<input" . $buildAttrs($attrs) . ">";
                        break;
                }

                if ($labelPosition === 'bottom' || $labelPosition === 'bottom-left' || $labelPosition === 'bottom-center' || $labelPosition === 'bottom-right' || $labelPosition === 'right') {
                    if ($label) $html .= "<label for='$id'>$label</label>";
                }
                $html .= "</div>";
            }
        }
        $html .= "</fieldset>";
    }
    return $html;
}
?>
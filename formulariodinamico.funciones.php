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
                        $dataConfig = $field['data'] ?? null;
                        if ($dataConfig) {
                            $tabla = $dataConfig['tabla']; $campo = $dataConfig['campo']; $filtro = $dataConfig['filtro'] ?? '1=1';
                            $html .= "<select name='$name' id='$name'><option value=''>Seleccione...</option>";
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

                    // --- LÓGICA DEL DATATABLE RESTAURADA ---
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

                    case 'textarea':
                        $attrs = ['name' => $name, 'id' => $name];
                        foreach ($field as $k => $v) { if (in_array($k, ['placeholder', 'rows', 'readonly', 'required'])) { $attrs[$k] = $v; } }
                        $html .= "<textarea " . $buildAttrs($attrs) . ">" . htmlspecialchars($value) . "</textarea>";
                        break;

                    default:
                        $attrs = ['type' => $type, 'name' => $name, 'id' => $name, 'value' => $value];
                        foreach ($field as $k => $v) { if (in_array($k, ['placeholder', 'readonly', 'required', 'multiple', 'min', 'max', 'step', 'pattern']) || strpos($k, 'data-') === 0) { $attrs[$k] = $v; } }
                        $html .= "<input " . $buildAttrs($attrs) . ">";
                        break;
                }
                $html .= "</div></div>";
            }
        }
        $html .= "</fieldset>";
    }
    return $html;
}
?>
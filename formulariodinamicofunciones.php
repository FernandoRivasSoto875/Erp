<?php
/**
 * =================================================================================
 *  BLOQUE DE PROTECCIÓN CONTRA DOBLE INCLUSIÓN
 * =================================================================================
 * Si la función 'generarFieldsets' ya fue definida, significa que este archivo
 * ya fue incluido, por lo que no se procesará de nuevo.
 */
if (!function_exists('generarFieldsets')) {

    // require_once 'funcionessql.php'; // Esta línea debe estar comentada o eliminada
                                         // para seguir la estructura que ya funciona.

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
                    $str .= " " . htmlspecialchars($k) . "='" . htmlspecialchars($v, ENT_QUOTES) . "'";
                }
            }
            return $str;
        };

        // --- FUNCIÓN PARA DETECTAR SI UN STRING ES UNA FÓRMULA ARITMÉTICA ---
        $esFormulaAritmetica = function($str) {
            if (!is_string($str) || trim($str) === '') return false;
            // Solo acepta strings con números, letras, paréntesis y operadores aritméticos
            // y debe contener al menos un operador aritmético
            return preg_match('/^[\d\w\s\+\-\*\/\(\)\.]+$/', $str) && preg_match('/[\+\-\*\/]/', $str);
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
                    $id = "field-{$name}-" . uniqid();

                    // --- INICIO DE LA CORRECCIÓN ---
                    // La etiqueta siempre se imprime primero en el HTML. El CSS se encargará de la posición.
                    if ($label) {
                        $html .= "<label for='$id'>$label</label>";
                    }

                    $inputHtml = ''; // Generamos el input por separado
                    switch ($type) {
                        case 'select2':
                            // Preparamos los atributos básicos
                            $attrs = [
                                'id' => $id,
                                'name' => $name . (!empty($field['multiple']) ? '[]' : ''), // Añadir [] si es múltiple
                                'class' => 'form-control select2-field',
                                'style' => 'width: 100%;'
                            ];

                            // Añadir atributos desde el JSON (placeholder, multiple, etc.)
                            $allowed_attrs = ['placeholder', 'multiple', 'required', 'disabled'];
                            foreach ($allowed_attrs as $attr) {
                                if (isset($field[$attr])) {
                                    $attrs[$attr] = $field[$attr];
                                }
                            }
                            
                            // Añadir atributos data-* para la configuración de AJAX
                            if (isset($field['data']) && is_array($field['data'])) {
                                foreach ($field['data'] as $key => $val) {
                                    $attrs['data-' . $key] = $val;
                                }
                            }

                            $inputHtml .= "<select " . $buildAttrs($attrs) . ">";
                            
                            // Si hay un valor predefinido, creamos la opción para que Select2 la muestre
                            if (!empty($value)) {
                                // Para selección múltiple, $value puede ser un array
                                if (is_array($value)) {
                                    foreach ($value as $singleValue) {
                                        $inputHtml .= "<option value='" . htmlspecialchars($singleValue) . "' selected>" . htmlspecialchars($singleValue) . "</option>";
                                    }
                                } else {
                                    $inputHtml .= "<option value='" . htmlspecialchars($value) . "' selected>" . htmlspecialchars($value) . "</option>";
                                }
                            }
                            
                            $inputHtml .= "</select>";
                            break;

                        case 'date':
                        case 'datetime-local':
                        case 'month':
                        case 'week':
                        case 'time':
                            $attrs = $field;
                            $attrs['type'] = $type;
                            $attrs['name'] = $name;
                            $attrs['id'] = $id;
                            $attrs['value'] = $value;
                            $attrs['class'] = 'form-control';
                            $inputHtml = "<input " . $buildAttrs($attrs) . ">";
                            break;

                        case 'textarea':
                            $inputHtml = "<textarea name='$name' id='$id' placeholder='" . ($field['placeholder'] ?? '') . "' rows='" . ($field['rows'] ?? 3) . "'>$value</textarea>";
                            break;
                        
                        case 'radio':
                        case 'checkbox':
                            $options = $field['options'] ?? [];
                            if (!empty($options)) {
                                $layout = $field['layout'] ?? 'vertical';
                                $inputHtml .= "<div class='options-container layout-{$layout}'>";
                                foreach ($options as $option) {
                                    $optionValue = $option['value'] ?? '';
                                    $optionLabel = $option['label'] ?? '';
                                    $currentName = ($type === 'checkbox' && count($options) > 1) ? "{$name}[]" : $name;
                                    $optionId = "{$id}-{$optionValue}";
                                    $checked = is_array($value) ? (in_array($optionValue, $value) ? ' checked' : '') : ($value == $optionValue ? ' checked' : '');
                                    $inputHtml .= "<div class='option-item'><input type='{$type}' name='{$currentName}' id='{$optionId}' value='{$optionValue}'{$checked}><label for='{$optionId}'>{$optionLabel}</label></div>";
                                }
                                $inputHtml .= "</div>";
                            }
                            break;

                        case 'select':
                            $options = $field['options'] ?? [];
                            $inputHtml .= "<select name='$name' id='$id'>";
                            foreach ($options as $option) {
                                $selected = ($value == $option['value']) ? ' selected' : '';
                                $inputHtml .= "<option value='" . htmlspecialchars($option['value']) . "'$selected>" . htmlspecialchars($option['label']) . "</option>";
                            }
                            $inputHtml .= "</select>";
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
                                        foreach ($col as $k => $v) {
                                            if (in_array($k, ['placeholder', 'readonly']) || strpos($k, 'data-') === 0) {
                                                if ($k === 'data-formula') {
                                                    if ($esFormulaAritmetica($v)) {
                                                        $colAttrs[$k] = $v;
                                                    }
                                                } else {
                                                    $colAttrs[$k] = $v;
                                                }
                                            }
                                        }
                                        $html .= "<td><input " . $buildAttrs($colAttrs) . "></td>";
                                    }
                                    $html .= "<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>";
                                }
                            }
                            $html .= "</tbody></table><button type='button' id='btn-add-row-{$name}' class='btn btn-primary mt-2'>Agregar Fila</button>";
                            break;
                        
                        case 'file':
                            $attrs = ['type' => 'file', 'name' => $name, 'id' => $id];
                            if (!empty($field['multiple'])) {
                                $attrs['multiple'] = true;
                                // Asegura que el nombre termine en [] para múltiples archivos
                                if (substr($name, -2) !== '[]') {
                                    $attrs['name'] = $name . '[]';
                                }
                            }
                            foreach ($field as $k => $v) {
                                if (in_array($k, ['required', 'readonly', 'accept']) || strpos($k, 'data-') === 0) {
                                    // Si es data-formula, solo agregar si es string aritmético
                                    if ($k === 'data-formula') {
                                        if ($esFormulaAritmetica($v)) {
                                            $attrs[$k] = $v;
                                        }
                                        // Si no es fórmula aritmética, no agregar nada
                                    } else {
                                        $attrs[$k] = $v;
                                    }
                                }
                            }
                            $inputHtml = "<input" . $buildAttrs($attrs) . ">";
                            break;

                        default: // Para text, number, email, password, etc.
                            $attrs = $field;
                            unset($attrs['label']); // Evitar atributos no estándar
                            $attrs['type'] = $type;
                            $attrs['name'] = $name;
                            $attrs['id'] = $id;
                            $attrs['value'] = $value;
                            $attrs['class'] = 'form-control';
                            
                            $inputHtml = "<input" . $buildAttrs($attrs) . ">";
                            break;
                    }
                    
                    $html .= $inputHtml; // Añadimos el input al HTML
                    // --- FIN DE LA CORRECCIÓN ---

                    $html .= "</div>";
                }
            }
            $html .= "</fieldset>";
        }
        return $html;
    }
    // Aquí podrían ir otras funciones futuras de este archivo.

} // <-- FIN DEL BLOQUE DE PROTECCIÓN
?>

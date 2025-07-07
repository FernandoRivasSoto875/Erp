<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Renderiza los fieldsets y sus campos en modo de solo lectura.
 * Ideal para correos, PDFs o vistas de resumen.
 */
function renderFieldsetsReadOnly($fieldsets, $valores, $baseUrl = '', $modo = 'mail') {
    global $imagenesInline;
    $html = '';
    foreach ($fieldsets as $fieldset) {
        if (isset($fieldset['legend'])) {
            $html .= "<fieldset><legend>" . htmlspecialchars($fieldset['legend']) . "</legend>";
        }
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'] ?? '';
                $label = $field['label'] ?? $name;
                $value = $valores[$name] ?? '';
                $html .= "<div class='campo-container'>";
                $html .= "<label>" . htmlspecialchars($label) . ":</label> ";

                // --- SOPORTE PARA DATATABLE EN SOLO LECTURA ---
                if ($field['type'] === 'datatable') {
                    $tableData = $value;
                    $columns = $field['columns'] ?? [];
                    $html .= "<table border='1' cellpadding='4' cellspacing='0' style='margin:10px 0; border-collapse: collapse; width: 100%;'>";
                    $html .= "<thead><tr style='background-color: #f2f2f2;'>";
                    foreach ($columns as $col) {
                        $html .= "<th style='padding: 8px; text-align: left;'>" . htmlspecialchars($col['label'] ?? $col['name']) . "</th>";
                    }
                    $html .= "</tr></thead>";
                    $html .= "<tbody>";
                    if (is_array($tableData) && count($tableData) > 0) {
                        foreach ($tableData as $row) {
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $cellValue = $row[$colName] ?? '';
                                $html .= "<td style='padding: 8px; border-top: 1px solid #ddd;'>" . htmlspecialchars($cellValue) . "</td>";
                            }
                            $html .= "</tr>";
                        }
                    } else {
                        $html .= "<tr><td colspan='" . count($columns) . "' style='text-align:center; padding: 8px;'>Sin datos</td></tr>";
                    }
                    $html .= "</tbody></table>";
                    $html .= "</div>";
                    continue; // Pasa al siguiente campo
                }
                // --- FIN SOPORTE DATATABLE ---

                if ($field['type'] === 'file') {
                    $files = is_array($value) ? $value : ($value ? [$value] : []);
                    foreach ($files as $file) {
                        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                        if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                            if ($modo === 'mail' && isset($imagenesInline[$file])) {
                                $html .= "<img src='cid:{$imagenesInline[$file]}' alt='Imagen adjunta' style='max-width:200px; display:block; margin-top:5px;'>";
                            } else {
                                $src = $baseUrl ? $baseUrl . basename($file) : $file;
                                $html .= "<img src='$src' alt='Imagen adjunta' style='max-width:200px; display:block; margin-top:5px;'>";
                            }
                        } else {
                            $src = $baseUrl ? $baseUrl . basename($file) : $file;
                            $html .= "<a href='$src' target='_blank' style='display:block; margin-top:5px;'>Descargar archivo</a>";
                        }
                    }
                } else {
                    $displayValue = is_array($value) ? implode(', ', $value) : $value;
                    $html .= htmlspecialchars($displayValue);
                }
                $html .= "</div>";
            }
        }
        if (isset($fieldset['fieldsets'])) {
            $html .= renderFieldsetsReadOnly($fieldset['fieldsets'], $valores, $baseUrl, $modo);
        }
        if (isset($fieldset['legend'])) {
            $html .= "</fieldset>";
        }
    }
    return $html;
}

/**
 * Obtiene datos de una tabla para poblar campos como 'selectdata'.
 */
function obtenerDatosTabla($data) {
    global $conn;
    $tabla  = $data['tabla'];
    $campo  = $data['campo'];
    $filtro = isset($data['filtro']) && $data['filtro'] ? "WHERE " . $data['filtro'] : "";
    $consulta = "SELECT $campo FROM $tabla $filtro";
    $stmt = $conn->prepare($consulta);
    if ($stmt === false) return [];
    $stmt->execute();
    $campos = array_map('trim', explode(',', $campo));
    $result = [];
    if (count($campos) == 2) {
        $stmt->bind_result($id, $nombre);
        while ($stmt->fetch()) {
            $result[] = ['value' => $id, 'label' => $nombre];
        }
    } else {
        $stmt->bind_result($valor);
        while ($stmt->fetch()) {
            $result[] = ['value' => $valor, 'label' => $valor];
        }
    }
    $stmt->close();
    return $result;
}

/**
 * Normaliza los datos del formulario (ej. $_POST) para guardarlos en la BD.
 * Crucial para manejar datatables y checkboxes.
 */
function normalizaValores($formData, $json, $paraJson = false) {
    $result = [];
    foreach ($json['fieldsets'] as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'];
                $type = $field['type'];

                if ($type === 'datatable') {
                    $columns = $field['columns'] ?? [];
                    $numRows = 0;
                    // Calcula el número de filas basado en el primer campo de la tabla
                    if (!empty($columns) && isset($formData[$columns[0]['name']])) {
                        $numRows = count($formData[$columns[0]['name']]);
                    }
                    
                    $rows = [];
                    for ($i = 0; $i < $numRows; $i++) {
                        $row = [];
                        $isEmptyRow = true;
                        foreach ($columns as $col) {
                            $colName = $col['name'];
                            $cellValue = isset($formData[$colName][$i]) ? trim($formData[$colName][$i]) : '';
                            $row[$colName] = $cellValue;
                            if ($cellValue !== '') {
                                $isEmptyRow = false;
                            }
                        }
                        // Solo agrega la fila si no está completamente vacía
                        if (!$isEmptyRow) {
                            $rows[] = $row;
                        }
                    }
                    $result[$name] = $rows;

                } elseif ($type === 'checkbox') {
                    $valor = $formData[$name] ?? [];
                    $result[$name] = $paraJson ? $valor : implode(', ', $valor);

                } else {
                    $valor = $formData[$name] ?? '';
                    $result[$name] = is_array($valor) ? implode(', ', $valor) : $valor;
                }
            }
        }
        if (isset($fieldset['fieldsets'])) {
            $result = array_merge($result, normalizaValores($formData, ['fieldsets' => $fieldset['fieldsets']], $paraJson));
        }
    }
    return $result;
}

/**
 * Prepara los valores guardados para mostrarlos en el formulario.
 * Principalmente para formatear checkboxes y radios.
 */
function prepararValoresGuardados($json, $valoresGuardados) {
    foreach ($json['fieldsets'] as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'];
                $type = $field['type'];
                if ($type === 'checkbox' && isset($valoresGuardados[$name]) && !is_array($valoresGuardados[$name])) {
                    $valoresGuardados[$name] = array_map('trim', explode(',', $valoresGuardados[$name]));
                }
            }
        }
        if (isset($fieldset['fieldsets'])) {
            $valoresGuardados = prepararValoresGuardados(['fieldsets' => $fieldset['fieldsets']], $valoresGuardados);
        }
    }
    return $valoresGuardados;
}

/**
 * Genera el HTML del formulario dinámico para ser llenado por el usuario.
 */
function generarFieldsets($fieldsets, $valores = [], $soloLectura = false) {
    $html = "";
    foreach ($fieldsets as $fieldset) {
        $legend = $fieldset['legend'] ?? '';
        $style = $fieldset['style'] ?? '';
        $class = $fieldset['class'] ?? '';
        $fieldsetAttrs = ($class ? ' class="' . htmlspecialchars($class) . '"' : '') . ($style ? ' style="' . htmlspecialchars($style) . '"' : '');

        $html .= "<fieldset$fieldsetAttrs>";
        if ($legend) $html .= "<legend>$legend</legend>";

        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'] ?? '';
                $label = $field['label'] ?? '';
                $type = $field['type'] ?? 'text';
                $value = $valores[$name] ?? ($field['value'] ?? '');
                $required = !empty($field['required']) ? 'required' : '';
                $placeholder = $field['placeholder'] ?? '';
                $classField = isset($field['class']) ? 'class="'.$field['class'].'"' : '';
                $styleField = isset($field['style']) ? 'style="'.$field['style'].'"' : '';
                $readonly = !empty($field['readonly']) || $soloLectura ? 'readonly' : '';
                $disabled = !empty($field['disabled']) || $soloLectura ? 'disabled' : '';

                $attrs = [
                    'maxlength' => $field['maxlength'] ?? null, 'minlength' => $field['minlength'] ?? null,
                    'min' => $field['min'] ?? null, 'max' => $field['max'] ?? null, 'step' => $field['step'] ?? null,
                    'pattern' => $field['pattern'] ?? null, 'accept' => $field['accept'] ?? null,
                    'autocomplete' => $field['autocomplete'] ?? null, 'autofocus' => !empty($field['autofocus']) ? 'autofocus' : null,
                    'rows' => $field['rows'] ?? null, 'cols' => $field['cols'] ?? null
                ];

                $dataAttrs = '';
                foreach ($field as $k => $v) {
                    if (strpos($k, 'data-') === 0) {
                        if (is_array($v) || is_object($v)) {
                            // Usamos htmlspecialchars para evitar problemas con el HTML
                            $dataAttrs .= ' ' . $k . '="' . htmlspecialchars(json_encode($v), ENT_QUOTES, 'UTF-8') . '"';
                        } else {
                            $dataAttrs .= ' ' . $k . '="' . htmlspecialchars($v, ENT_QUOTES, 'UTF-8') . '"';
                        }
                    }
                }

                $commonAttrs = "$placeholder $required $readonly $disabled $classField $styleField $dataAttrs";
                foreach ($attrs as $attr => $val) {
                    if ($val !== null) $commonAttrs .= " $attr=\"$val\"";
                }

                $html .= "<div class='campo-container'>";
                if ($label && $type !== 'hidden') $html .= "<label for=\"$name\">$label</label>";

                switch ($type) {
                    case 'textarea':
                        $html .= "<textarea name=\"$name\" id=\"$name\" $commonAttrs>" . htmlspecialchars($value) . "</textarea>";
                        break;

                    case 'select':
                    case 'selectdata':
                        $options = $field['options'] ?? [];
                        if ($type === 'selectdata' && isset($field['data'])) {
                            $options = obtenerDatosTabla($field['data']);
                        }
                        $html .= "<select name=\"$name\" id=\"$name\" $commonAttrs>";
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? ($opt['value'] ?? '') : $opt;
                            $opt_label = is_array($opt) ? ($opt['label'] ?? '') : $opt;
                            $sel = ($value == $opt_val) ? 'selected' : '';
                            $html .= "<option value=\"" . htmlspecialchars($opt_val) . "\" $sel>" . htmlspecialchars($opt_label) . "</option>";
                        }
                        $html .= "</select>";
                        break;

                    case 'checkbox':
                    case 'radio':
                        $options = $field['options'] ?? [];
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? $opt['value'] : $opt;
                            $opt_label = is_array($opt) ? $opt['label'] : $opt;
                            $is_checked = ($type === 'checkbox' && is_array($value) && in_array($opt_val, $value)) || ($value == $opt_val);
                            $html .= "<label><input type=\"$type\" name=\"$name" . ($type === 'checkbox' ? '[]' : '') . "\" value=\"" . htmlspecialchars($opt_val) . "\" " . ($is_checked ? 'checked' : '') . " $commonAttrs> " . htmlspecialchars($opt_label) . "</label> ";
                        }
                        break;

                    case 'hidden':
                        $html .= "<input type=\"hidden\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\" $dataAttrs />";
                        break;

                    case 'datatable':
                        $columns = $field['columns'] ?? [];
                        $minRows = $field['minRows'] ?? 1;
                        $tableData = is_array($value) ? $value : [];
                        $numRows = max($minRows, count($tableData));

                        $html .= "<table class='datatable' id='dt_$name'><thead><tr>";
                        foreach ($columns as $col) {
                            $html .= "<th>" . htmlspecialchars($col['label']) . "</th>";
                        }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";
                        
                        for ($i = 0; $i < $numRows; $i++) {
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $cellValue = $tableData[$i][$colName] ?? '';
                                $html .= "<td><input type='" . htmlspecialchars($col['type']) . "' name='" . htmlspecialchars($colName) . "[]' class='form-control' value='" . htmlspecialchars($cellValue) . "'></td>";
                            }
                            $html .= "<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td>";
                            $html .= "</tr>";
                        }
                        $html .= "</tbody></table>";
                        $html .= "<button type='button' onclick='agregarFilaDatatable(\"dt_$name\")' class='btn btn-primary mt-2'>Agregar Fila</button>";
                        break;
 
                    case 'file':
                        $multiple = !empty($field['multiple']);
                        $nameAttr = $multiple ? $name . '[]' : $name;
                        $html .= "<input type=\"file\" name=\"$nameAttr\" id=\"$name\" " . ($multiple ? 'multiple' : '') . " $commonAttrs onchange=\"mostrarArchivosSeleccionados(this);previewImage(this);\" />";
                        $html .= "<div id=\"filelist_$name\" class=\"file-list mt-2\"></div>";
                        if ($value && !$soloLectura) {
                            $files = is_array($value) ? $value : [$value];
                            foreach ($files as $fileToShow) {
                                $ext = strtolower(pathinfo($fileToShow, PATHINFO_EXTENSION));
                                $html .= "<div class='mt-2'>";
                                if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                                    $html .= "<img src=\"" . htmlspecialchars($fileToShow) . "\" style=\"max-width:200px;\">";
                                } else {
                                    $html .= "<a href=\"" . htmlspecialchars($fileToShow) . "\">Archivo actual</a>";
                                }
                                $html .= "</div>";
                            }
                        }
                        break;

                    default:
                        $html .= "<input type=\"$type\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\" $commonAttrs />";
                        break;
                }
                $html .= "</div>";
            }
        }

        if (isset($fieldset['fieldsets'])) {
            $html .= generarFieldsets($fieldset['fieldsets'], $valores, $soloLectura);
        }
        $html .= "</fieldset>";
    }
    return $html;
}
<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Renderiza los fieldsets en modo de solo lectura (para correos, PDFs).
 * Refactorizado para ser más robusto.
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
                $html .= "<div class='campo-container' style='margin-bottom: 10px;'>";
                $html .= "<label style='font-weight: bold;'>" . htmlspecialchars($label) . ":</label> ";

                if (($field['type'] ?? '') === 'datatable') {
                    $tableData = is_array($value) ? $value : [];
                    $columns = $field['columns'] ?? [];
                    $html .= "<table border='1' cellpadding='5' cellspacing='0' style='margin-top: 5px; border-collapse: collapse; width: 100%; font-size: 0.9em;'>";
                    $html .= "<thead style='background-color: #f2f2f2;'><tr>";
                    foreach ($columns as $col) {
                        $html .= "<th style='padding: 8px; text-align: left;'>" . htmlspecialchars($col['label'] ?? '') . "</th>";
                    }
                    $html .= "</tr></thead><tbody>";
                    if (!empty($tableData)) {
                        foreach ($tableData as $row) {
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $cellValue = $row[$col['name']] ?? '';
                                $html .= "<td style='padding: 8px; border-top: 1px solid #ddd;'>" . htmlspecialchars($cellValue) . "</td>";
                            }
                            $html .= "</tr>";
                        }
                    } else {
                        $html .= "<tr><td colspan='" . count($columns) . "' style='text-align:center; padding: 8px;'> (Sin datos) </td></tr>";
                    }
                    $html .= "</tbody></table>";
                } elseif (($field['type'] ?? '') === 'file') {
                    $files = is_array($value) ? $value : ($value ? [$value] : []);
                    if (empty($files)) {
                        $html .= "<span>(No se adjuntó archivo)</span>";
                    } else {
                        foreach ($files as $file) {
                            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                            if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                                $src = ($modo === 'mail' && isset($imagenesInline[$file])) ? "cid:{$imagenesInline[$file]}" : ($baseUrl ? $baseUrl . basename($file) : $file);
                                $html .= "<img src='$src' alt='Imagen adjunta' style='max-width:200px; display:block; margin-top:5px;'>";
                            } else {
                                $src = $baseUrl ? $baseUrl . basename($file) : $file;
                                $html .= "<a href='$src' target='_blank' style='display:block; margin-top:5px;'>Descargar " . htmlspecialchars(basename($file)) . "</a>";
                            }
                        }
                    }
                } else {
                    $displayValue = is_array($value) ? implode(', ', $value) : (string)$value;
                    $html .= "<span>" . ($displayValue !== '' ? htmlspecialchars($displayValue) : '(No especificado)') . "</span>";
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
 * Normaliza los datos del formulario (ej. $_POST) para guardarlos.
 * ¡CORREGIDO para manejar datatables correctamente!
 */
function normalizaValores($formData, $json, $paraJson = false) {
    $result = [];
    foreach ($json['fieldsets'] as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'];
                $type = $field['type'];

                if ($type === 'datatable') {
                    $result[$name] = [];
                    // Los datos del datatable llegan como un array anidado: $formData['items']
                    if (isset($formData[$name]) && is_array($formData[$name])) {
                        foreach ($formData[$name] as $row) {
                            $isEmptyRow = true;
                            $processedRow = [];
                            // Procesa cada columna de la fila
                            foreach ($field['columns'] as $col) {
                                $colName = $col['name'];
                                $cellValue = isset($row[$colName]) ? trim($row[$colName]) : '';
                                $processedRow[$colName] = $cellValue;
                                if ($cellValue !== '') {
                                    $isEmptyRow = false;
                                }
                            }
                            // Solo agrega la fila si al menos un campo tiene valor
                            if (!$isEmptyRow) {
                                $result[$name][] = $processedRow;
                            }
                        }
                    }
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
 * Genera el HTML del formulario dinámico.
 * ¡VERSIÓN CORREGIDA Y REFACTORIZADA!
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
                
                $labelPosition = $field['labelPosition'] ?? 'top';
                $containerClass = "campo-container label-pos-" . htmlspecialchars($labelPosition);
                $html .= "<div class='$containerClass'>";

                if ($label && $type !== 'hidden' && $labelPosition !== 'none') {
                    $html .= ($type === 'checkbox' || $type === 'radio') 
                        ? "<div class=\"grupo-label\">$label</div>" 
                        : "<label for=\"$name\">$label</label>";
                }

                if ($type === 'checkbox' || $type === 'radio') {
                    $html .= "<div class='opciones-container'>";
                }

                // Atributos base para todos los campos
                $baseAttrs = [
                    'name' => $name, 'id' => $name,
                    'class' => $field['class'] ?? null, 'style' => $field['style'] ?? null,
                    'required' => !empty($field['required']), 'readonly' => !empty($field['readonly']) || $soloLectura,
                    'disabled' => !empty($field['disabled']) || $soloLectura,
                ];

                // Atributos específicos del tipo de campo
                $specificAttrs = [
                    'placeholder' => $field['placeholder'] ?? null, 'maxlength' => $field['maxlength'] ?? null,
                    'minlength' => $field['minlength'] ?? null, 'min' => $field['min'] ?? null,
                    'max' => $field['max'] ?? null, 'step' => $field['step'] ?? null,
                    'pattern' => $field['pattern'] ?? null, 'autocomplete' => $field['autocomplete'] ?? null,
                    'autofocus' => !empty($field['autofocus']), 'rows' => $field['rows'] ?? null,
                    'cols' => $field['cols'] ?? null,
                ];

                // Atributos de datos (data-*)


                // Función auxiliar para construir la cadena de atributos HTML
                $buildAttrs = function($attrs) {
                    $str = '';
                    foreach ($attrs as $k => $v) {
                        if ($v === false || $v === null) continue;
                        if ($v === true) { $str .= " $k"; continue; }
                        if (is_array($v) || is_object($v)) {
                            $str .= " $k='" . json_encode($v) . "'";
                        } else {
                            $str .= " $k=\"" . htmlspecialchars($v) . "\"";
                        }
                    }
                    return $str;
                };

                $commonAttrs = $buildAttrs(array_merge($baseAttrs, $specificAttrs));

                switch ($type) {
                    case 'textarea':
                        $html .= "<textarea $commonAttrs>" . htmlspecialchars($value) . "</textarea>";
                        break;

                    case 'select':
                    case 'selectdata':
                        $options = $field['options'] ?? [];
                        if ($type === 'selectdata' && isset($field['data'])) {
                            $options = obtenerDatosTabla($field['data']);
                        }
                        $html .= "<select $commonAttrs>";
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
                            $inputName = $name . ($type === 'checkbox' ? '[]' : '');
                            $html .= "<label class='opcion-label'><input type=\"$type\" name=\"$inputName\" value=\"" . htmlspecialchars($opt_val) . "\" " . ($is_checked ? 'checked' : '') . "> " . htmlspecialchars($opt_label) . "</label> ";
                        }
                        break;

                    case 'hidden':
                        $html .= "<input type=\"hidden\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\">";
                        break;

                    case 'datatable':
                        $columns = $field['columns'] ?? [];
                        $tableData = is_array($value) ? $value : [];
                        $numRowsToRender = max(count($tableData), $field['minRows'] ?? 0);

                        $html .= "<table class='datatable-container' id='$name'><thead><tr>";
                        foreach ($columns as $col) {
                            $html .= "<th>" . htmlspecialchars($col['label'] ?? '') . "</th>";
                        }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";

                        for ($i = 0; $i < $numRowsToRender; $i++) {
                            $rowData = $tableData[$i] ?? [];
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $colAttrs = [
                                    'type' => $col['type'] ?? 'text',
                                    'name' => "{$name}[{$i}][{$colName}]",
                                    'value' => $rowData[$colName] ?? '',
                                    'class' => 'form-control',
                                    'placeholder' => $col['placeholder'] ?? null,
                                    'readonly' => !empty($col['readonly']),
                                    'data-formula' => $col['data-formula'] ?? null,
                                ];
                                $html .= "<td><input " . $buildAttrs($colAttrs) . "></td>";
                            }
                            $html .= "<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>";
                        }
                        
                        $html .= "</tbody></table>";
                        $html .= "<button type='button' id='btn-add-row-{$name}' class='btn btn-primary mt-2'>Agregar Fila</button>";
                        break;

                    case 'file':
                        $multiple = !empty($field['multiple']);
                        $fileAttrs = $buildAttrs(array_merge($baseAttrs, ['name' => $name . ($multiple ? '[]' : ''), 'multiple' => $multiple]));
                        $html .= "<input type=\"file\" $fileAttrs onchange=\"mostrarArchivosSeleccionados(this);previewImage(this);\">";
                        $html .= "<div id=\"filelist_$name\" class=\"file-list mt-2\"></div>";
                        // ... (lógica para mostrar archivos existentes) ...
                        break;

                    default:
                        $html .= "<input type=\"$type\" value=\"" . htmlspecialchars($value) . "\" $commonAttrs>";
                        break;
                }

                if ($type === 'checkbox' || $type === 'radio') {
                    $html .= "</div>";
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
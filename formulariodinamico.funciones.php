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
 * ¡MEJORADO para soportar minRows en datatables!
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
                
                // --- ESTA ES LA LÍNEA A CORREGIR ---
                $placeholder = isset($field['placeholder']) ? 'placeholder="' . htmlspecialchars($field['placeholder'], ENT_QUOTES, 'UTF-8') . '"' : '';
                
                $classField = isset($field['class']) ? 'class="'.$field['class'].'"' : '';
                $styleField = isset($field['style']) ? 'style="'.$field['style'].'"' : '';
                $readonly = !empty($field['readonly']) || $soloLectura ? 'readonly' : '';
                $disabled = !empty($field['disabled']) || $soloLectura ? 'disabled' : '';

                $attrs = [
                    'maxlength' => $field['maxlength'] ?? null, 'minlength' => $field['minlength'] ?? null,
                    'min' => $field['min'] ?? null, 'max' => $field['max'] ?? null, 'step' => $field['step'] ?? null,
                    'pattern' => $field['pattern'] ?? null,
                    'autocomplete' => $field['autocomplete'] ?? null, 'autofocus' => !empty($field['autofocus']) ? 'autofocus' : null,
                    'rows' => $field['rows'] ?? null, 'cols' => $field['cols'] ?? null
                ];

                $dataAttrs = '';
                foreach ($field as $k => $v) {
                    if (strpos($k, 'data-') === 0) {
                        if (is_array($v) || is_object($v)) {
                            // Usamos comillas simples para el atributo, así el JSON interno no necesita escaparse.
                            $dataAttrs .= " " . $k . "='" . json_encode($v) . "'";
                        } else {
                            $dataAttrs .= ' ' . $k . '="' . htmlspecialchars($v, ENT_QUOTES, 'UTF-8') . '"';
                        }
                    }
                }

                $commonAttrs = "$placeholder $required $readonly $disabled $classField $styleField $dataAttrs";
                foreach ($attrs as $attr => $val) {
                    if ($val !== null) $commonAttrs .= " $attr=\"$val\"";
                }

                // Gestiona la posición de la etiqueta añadiendo una clase CSS al contenedor.
                $labelPosition = $field['labelPosition'] ?? 'top'; // 'top' es el valor por defecto.
                $containerClass = "campo-container label-pos-" . htmlspecialchars($labelPosition);

                $html .= "<div class='$containerClass'>";

                // Renderiza la etiqueta, a menos que se especifique 'none' o sea un campo oculto.
                // Para 'checkbox' y 'radio', la etiqueta principal es un título de grupo.
                if ($label && $type !== 'hidden' && $labelPosition !== 'none') {
                    if ($type === 'checkbox' || $type === 'radio') {
                        $html .= "<div class=\"grupo-label\">$label</div>";
                    } else {
                        $html .= "<label for=\"$name\">$label</label>";
                    }
                }

                // Para 'checkbox' y 'radio', se crea un sub-contenedor para las opciones.
                if ($type === 'checkbox' || $type === 'radio') {
                    $html .= "<div class='opciones-container'>";
                }

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
                            // Se añade una clase al label de la opción para poder darle estilo si es necesario
                            $html .= "<label class='opcion-label'><input type=\"$type\" name=\"$name" . ($type === 'checkbox' ? '[]' : '') . "\" value=\"" . htmlspecialchars($opt_val) . "\" " . ($is_checked ? 'checked' : '') . " $commonAttrs> " . htmlspecialchars($opt_label) . "</label> ";
                        }
                        break;

                    case 'hidden':
                        $html .= "<input type=\"hidden\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\" $dataAttrs />";
                        break;

                    case 'datatable':
                        $columns = $field['columns'] ?? [];
                        $tableData = is_array($value) ? $value : [];
                        $minRows = $field['minRows'] ?? 0;
                        $numRowsToRender = max(count($tableData), $minRows);

                        $html .= "<table class='datatable-container' id='$name'><thead><tr>";
                        foreach ($columns as $col) {
                            $html .= "<th>" . htmlspecialchars($col['label'] ?? '') . "</th>";
                        }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";

                        // Bucle unificado para renderizar todas las filas necesarias (con datos o vacías)
                        for ($i = 0; $i < $numRowsToRender; $i++) {
                            $rowData = $tableData[$i] ?? []; // Obtiene datos si existen para esta fila
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $cellValue = $rowData[$colName] ?? ''; // Usa el valor del dato o vacío
                                $colType = $col['type'] ?? 'text';
                                $colReadonly = !empty($col['readonly']) ? 'readonly' : '';
                                $colPlaceholder = isset($col['placeholder']) ? 'placeholder="' . htmlspecialchars($col['placeholder']) . '"' : '';
                                
                                // ¡CORRECCIÓN CRÍTICA! Se asegura de que data-formula se aplique a TODAS las filas
                                $colDataFormula = '';
                                if (isset($col['data-formula'])) {
                                    $formula = $col['data-formula'];
                                    // Usa comillas simples para el atributo para que el JSON interno no cause problemas
                                    $colDataFormula = "data-formula='" . (is_array($formula) ? json_encode($formula) : htmlspecialchars($formula)) . "'";
                                }
                                
                                $inputName = "{$name}[{$i}][{$colName}]";
                                $html .= "<td><input type='$colType' name='$inputName' value='" . htmlspecialchars($cellValue) . "' class='form-control' $colReadonly $colPlaceholder $colDataFormula></td>";
                            }
                            $html .= "<td><button type='button' class='eliminar_fila btn btn-danger btn-sm'>Eliminar</button></td></tr>";
                        }
                        
                        $html .= "</tbody></table>";
                        $html .= "<button type='button' id='btn-add-row-{$name}' class='btn btn-primary mt-2'>Agregar Fila</button>";
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

                // Cerramos el contenedor de opciones si fue abierto
                if ($type === 'checkbox' || $type === 'radio') {
                    $html .= "</div>"; // Cierre de .opciones-container
                }

                $html .= "</div>"; // Cierre de .campo-container
            }
        }

        if (isset($fieldset['fieldsets'])) {
            $html .= generarFieldsets($fieldset['fieldsets'], $valores, $soloLectura);
        }
        $html .= "</fieldset>";
    }
    return $html;
}
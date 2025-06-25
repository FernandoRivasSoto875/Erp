<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
                    $html .= "<table border='1' cellpadding='4' cellspacing='0' style='margin:10px 0;'>";
                    // Encabezados
                    $html .= "<tr>";
                    foreach ($columns as $col) {
                        $html .= "<th>" . htmlspecialchars($col['label'] ?? $col['name']) . "</th>";
                    }
                    $html .= "</tr>";
                    // Filas
                    if (is_array($tableData) && count($tableData)) {
                        foreach ($tableData as $row) {
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $html .= "<td>" . htmlspecialchars($row[$colName] ?? '') . "</td>";
                            }
                            $html .= "</tr>";
                        }
                    } else {
                        $html .= "<tr><td colspan='" . count($columns) . "' style='text-align:center;'>Sin datos</td></tr>";
                    }
                    $html .= "</table>";
                    $html .= "</div>";
                    continue;
                }
                // --- FIN SOPORTE DATATABLE ---

                if ($field['type'] === 'file') {
                    $files = $value;
                    if (!is_array($files)) $files = [$files];
                    foreach ($files as $idx => $file) {
                        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                        if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                            if ($modo === 'mail') {
                                $cid = $imagenesInline[$file] ?? null;
                                if ($cid) {
                                    $html .= "<img src=\"cid:$cid\" alt=\"Imagen adjunta\" style=\"max-width:200px;\">";
                                } else {
                                    $src = $baseUrl ? $baseUrl . basename($file) : $file;
                                    $html .= "<img src=\"$src\" alt=\"Imagen adjunta\" style=\"max-width:200px;\">";
                                }
                            } else { // PDF u otro
                                $src = $baseUrl ? $baseUrl . basename($file) : $file;
                                $html .= "<img src=\"$src\" alt=\"Imagen adjunta\" style=\"max-width:200px;\">";
                            }
                        } else {
                            $src = $baseUrl ? $baseUrl . basename($file) : $file;
                            $html .= "<a href=\"$src\" target=\"_blank\">Descargar archivo</a>";
                        }
                    }
                } else {
                    $html .= htmlspecialchars(is_array($value) ? implode(', ', $value) : $value);
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

function normalizaValores($formData, $json, $paraJson = false) {
    $result = [];
    foreach ($json['fieldsets'] as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'];
                $type = $field['type'];
                if ($type === 'checkbox') {
                    if (isset($formData[$name])) {
                        $valor = $formData[$name];
                        if (!is_array($valor)) {
                            $valor = array_map('trim', explode(',', $valor));
                        }
                    } else {
                        $valor = [];
                    }
                    $result[$name] = $paraJson ? $valor : implode(', ', $valor);
                } elseif ($type === 'radio') {
                    $valor = isset($formData[$name]) ? $formData[$name] : '';
                    $result[$name] = is_array($valor) ? implode(', ', $valor) : $valor;
                } else {
                    $valor = isset($formData[$name]) ? $formData[$name] : '';
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

function prepararValoresGuardados($json, $valoresGuardados) {
    foreach ($json['fieldsets'] as $fieldset) {
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'];
                $type = $field['type'];
                if ($type === 'checkbox') {
                    if (!isset($valoresGuardados[$name])) {
                        $valoresGuardados[$name] = [];
                    } elseif (!is_array($valoresGuardados[$name])) {
                        $valoresGuardados[$name] = array_map('trim', explode(',', $valoresGuardados[$name]));
                    }
                } elseif ($type === 'radio') {
                    if (!isset($valoresGuardados[$name])) {
                        $valoresGuardados[$name] = '';
                    } elseif (is_array($valoresGuardados[$name])) {
                        $valoresGuardados[$name] = implode(', ', $valoresGuardados[$name]);
                    }
                }
            }
        }
        if (isset($fieldset['fieldsets'])) {
            $valoresGuardados = prepararValoresGuardados(['fieldsets' => $fieldset['fieldsets']], $valoresGuardados);
        }
    }
    return $valoresGuardados;
}

function generarFieldsets($fieldsets, $valores = [], $soloLectura = false) {
    $html = "";
    foreach ($fieldsets as $fieldset) {
        $legend = $fieldset['legend'] ?? '';
        $style = $fieldset['style'] ?? '';
        $class = $fieldset['class'] ?? '';
        $fieldsetAttrs = '';
        if ($class) $fieldsetAttrs .= ' class="' . htmlspecialchars($class) . '"';
        if ($style) $fieldsetAttrs .= ' style="' . htmlspecialchars($style) . '"';

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
                $maxlength = isset($field['maxlength']) ? 'maxlength="'.$field['maxlength'].'"' : '';
                $minlength = isset($field['minlength']) ? 'minlength="'.$field['minlength'].'"' : '';
                $min = isset($field['min']) ? 'min="'.$field['min'].'"' : '';
                $max = isset($field['max']) ? 'max="'.$field['max'].'"' : '';
                $step = isset($field['step']) ? 'step="'.$field['step'].'"' : '';
                $pattern = isset($field['pattern']) ? 'pattern="'.$field['pattern'].'"' : '';
                $accept = isset($field['accept']) ? 'accept="'.$field['accept'].'"' : '';
                $autocomplete = isset($field['autocomplete']) ? 'autocomplete="'.$field['autocomplete'].'"' : '';
                $autofocus = !empty($field['autofocus']) ? 'autofocus' : '';
                $classField = isset($field['class']) ? 'class="'.$field['class'].'"' : '';
                $styleField = isset($field['style']) ? 'style="'.$field['style'].'"' : '';
                $readonly = !empty($field['readonly']) || $soloLectura ? 'readonly' : '';
                $disabled = !empty($field['disabled']) || $soloLectura ? 'disabled' : '';

                $dataAttrs = '';
                foreach ($field as $k => $v) {
                    if (strpos($k, 'data-') === 0) {
                        $dataAttrs .= ' ' . $k . '="' . htmlspecialchars($v) . '"';
                    }
                }

                $options = $field['options'] ?? [];

                $html .= "<div class='campo-container'>";
                if ($label && $type !== 'hidden') $html .= "<label for=\"$name\">$label</label>";

                switch ($type) {
                    case 'textarea':
                        $rows = isset($field['rows']) ? 'rows="'.$field['rows'].'"' : '';
                        $cols = isset($field['cols']) ? 'cols="'.$field['cols'].'"' : '';
                        $html .= "<textarea name=\"$name\" id=\"$name\" $rows $cols $placeholder $required $maxlength $minlength $autocomplete $autofocus $readonly $disabled $classField $styleField $dataAttrs>" . htmlspecialchars($value) . "</textarea>";
                        break;

                    case 'select':
                        $html .= "<select name=\"$name\" id=\"$name\" $required $readonly $disabled $classField $styleField $dataAttrs>";
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? $opt['value'] : $opt;
                            $opt_label = is_array($opt) ? $opt['label'] : $opt;
                            $sel = ($value == $opt_val) ? 'selected' : '';
                            $html .= "<option value=\"$opt_val\" $sel>$opt_label</option>";
                        }
                        $html .= "</select>";
                        break;

                    case 'selectdata':
                        $options = [];
                        if (isset($field['data'])) {
                            $options = obtenerDatosTabla($field['data']);
                        }
                        $html .= "<select name=\"$name\" id=\"$name\" $required $readonly $disabled $classField $styleField $dataAttrs>";
                        foreach ($options as $opt) {
                            $opt_val = $opt['value'] ?? ($opt['id'] ?? '');
                            $opt_label = $opt['label'] ?? ($opt['nombre'] ?? '');
                            $sel = ($value == $opt_val) ? 'selected' : '';
                            $html .= "<option value=\"$opt_val\" $sel>$opt_label</option>";
                        }
                        $html .= "</select>";
                        break;

                    case 'checkbox':
                    case 'radio':
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? $opt['value'] : $opt;
                            $opt_label = is_array($opt) ? $opt['label'] : $opt;
                            $is_checked = ($type === 'checkbox' && is_array($value) && in_array($opt_val, $value)) ||
                                          ($type === 'checkbox' && $value == $opt_val) ||
                                          ($type === 'radio' && $value == $opt_val) ? 'checked' : '';
                            $html .= "<label><input type=\"$type\" name=\"$name" . ($type === 'checkbox' ? '[]' : '') . "\" value=\"$opt_val\" $is_checked $required $readonly $disabled $classField $styleField $dataAttrs> $opt_label</label> ";
                        }
                        break;

                    case 'hidden':
                        $html .= "<input type=\"hidden\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\" $dataAttrs />";
                        break;

                    case 'datatable':
                        $columns = $field['columns'] ?? [];
                        $minRows = $field['minRows'] ?? 1; // <-- Agrega esta línea
                        $numRows = 0;
                        // Calcula el número de filas
                        foreach ($columns as $col) {
                            $colName = $col['name'];
                            if (isset($formData[$colName]) && is_array($formData[$colName])) {
                                $numRows = max($numRows, count($formData[$colName]));
                            }
                        }
                        $rows = [];
                        for ($i = 0; $i < $numRows; $i++) {
                            $row = [];
                            foreach ($columns as $col) {
                                $colName = $col['name'];
                                $row[$colName] = isset($formData[$colName][$i]) ? $formData[$colName][$i] : '';
                            }
                            $rows[] = $row;
                        }
                        $result[$name] = $rows;

                        $html .= "<table class='datatable' id='dt_$name'><thead><tr>";
                        foreach ($columns as $col) {
                            $html .= "<th>" . htmlspecialchars($col['label']) . "</th>";
                        }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";
                        // Genera filas iniciales con ids y labels únicos
                        for ($row = 0; $row < $minRows; $row++) {
                            $html .= "<tr>";
                            foreach ($columns as $col) {
                                $inputId = "dt_{$name}_{$col['name']}_{$row}_" . uniqid();
                                $html .= "<td>";
                                $html .= "<label for='$inputId' style='display:none;'>" . htmlspecialchars($col['label']) . "</label>";
                                $html .= "<input type='" . htmlspecialchars($col['type']) . "' name='" . htmlspecialchars($col['name']) . "[]' id='$inputId' required>";
                                $html .= "</td>";
                            }
                            $html .= "<td><button type='button' class='eliminar_fila'>Eliminar</button></td>";
                            $html .= "</tr>";
                        }
                        $html .= "</tbody></table>";
                        $html .= "<button type='button' onclick='agregarFilaDatatable(\"dt_$name\")'>Agregar fila</button>";
                        break;
 
                    case 'file':
                        $multiple = !empty($field['multiple']) ? 'multiple' : '';
                        $nameAttr = !empty($field['multiple']) ? $name . '[]' : $name;
                        $html .= "<input type=\"file\" name=\"$nameAttr\" id=\"$name\" $accept $multiple $required $readonly $disabled $classField $styleField $dataAttrs onchange=\"mostrarArchivosSeleccionados(this);previewImage(this);\" />";
                        $html .= "<div id=\"filelist_$name\" class=\"file-list\"></div>";
                        if ($value && !$soloLectura) {
                            $files = is_array($value) ? $value : [$value];
                            foreach ($files as $fileToShow) {
                                $ext = strtolower(pathinfo($fileToShow, PATHINFO_EXTENSION));
                                if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                                    $html .= "<br><img src=\"" . htmlspecialchars($fileToShow) . "\" style=\"max-width:200px;\">";
                                } else {
                                    $html .= "<br><a href=\"" . htmlspecialchars($fileToShow) . "\">Archivo actual</a>";
                                }
                            }
                        }
                        break;

                    default:
                        $html .= "<input type=\"$type\" name=\"$name\" id=\"$name\" value=\"" . htmlspecialchars($value) . "\" placeholder=\"$placeholder\" $required $maxlength $minlength $min $max $step $pattern $accept $autocomplete $autofocus $readonly $disabled $classField $styleField $dataAttrs />";
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

function generarFieldsetsantiguo($fieldsets, $valores = [], $soloLectura = false) {
    // ...sin cambios, igual que tu versión original...
}
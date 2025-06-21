<?php
 
 function renderFieldsetsReadOnly($fieldsets, $valores = []) {
    $html = "";
    foreach ($fieldsets as $fieldset) {
        if (!empty($fieldset['legend'])) {
            $html .= "<h3 style='margin-top:20px;'>" . htmlspecialchars($fieldset['legend']) . "</h3>";
        }
        $html .= "<table style='width:100%;border-collapse:collapse;margin-bottom:15px;'>";
        if (isset($fieldset['fields'])) {
            foreach ($fieldset['fields'] as $field) {
                $name = $field['name'] ?? '';
                $label = $field['label'] ?? $name;
                $type = $field['type'] ?? 'text';
                $value = $valores[$name] ?? ($field['value'] ?? '');
                $displayValue = '';

                // Manejo especial para checkbox, radio y select
                if ($type === 'checkbox' || $type === 'radio' || $type === 'select' || $type === 'selectdata') {
                    $options = $field['options'] ?? [];
                    // Para selectdata, obtener opciones desde la base si es necesario
                    if ($type === 'selectdata' && isset($field['data'])) {
                        $options = obtenerDatosTabla($field['data']);
                    }
                    $selectedLabels = [];
                    if ($type === 'checkbox') {
                        $vals = is_array($value) ? $value : (strlen($value) ? array_map('trim', explode(',', $value)) : []);
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? ($opt['value'] ?? $opt['label'] ?? $opt) : $opt;
                            $opt_label = is_array($opt) ? ($opt['label'] ?? $opt['value'] ?? $opt) : $opt;
                            if (in_array($opt_val, $vals)) {
                                $selectedLabels[] = $opt_label;
                            }
                        }
                        $displayValue = $selectedLabels ? implode(', ', $selectedLabels) : '-';
                    } elseif ($type === 'radio' || $type === 'select' || $type === 'selectdata') {
                        foreach ($options as $opt) {
                            $opt_val = is_array($opt) ? ($opt['value'] ?? $opt['label'] ?? $opt) : $opt;
                            $opt_label = is_array($opt) ? ($opt['label'] ?? $opt['value'] ?? $opt) : $opt;
                            if ($value == $opt_val) {
                                $selectedLabels[] = $opt_label;
                            }
                        }
                        $displayValue = $selectedLabels ? implode(', ', $selectedLabels) : '-';
                    }
                } elseif ($type === 'textarea') {
                    $displayValue = nl2br(htmlspecialchars($value));
                } elseif ($type === 'file') {
                    if ($value) {
                        $ext = strtolower(pathinfo($value, PATHINFO_EXTENSION));
                        if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                            $displayValue = "<img src='" . htmlspecialchars($value) . "' style='max-width:200px;'>";
                        } else {
                            $displayValue = "<a href='" . htmlspecialchars($value) . "'>Descargar archivo</a>";
                        }
                    } else {
                        $displayValue = '-';
                    }
                } elseif ($type === 'hidden') {
                    continue; // No mostrar campos ocultos
                } else {
                    $displayValue = htmlspecialchars($value);
                }

                $html .= "<tr style='border-bottom:1px solid #eee;'>";
                $html .= "<td style='padding:6px 10px;font-weight:bold;width:30%;vertical-align:top;'>" . htmlspecialchars($label) . "</td>";
                $html .= "<td style='padding:6px 10px;'>" . ($displayValue !== '' ? $displayValue : '-') . "</td>";
                $html .= "</tr>";
            }
        }
        $html .= "</table>";

        // Sub-fieldsets
        if (isset($fieldset['fieldsets'])) {
            $html .= renderFieldsetsReadOnly($fieldset['fieldsets'], $valores);
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
                        $minRows = $field['minRows'] ?? 1;
                        $maxRows = $field['maxRows'] ?? 10;
                        $html .= "<table class='datatable' id='dt_$name'><thead><tr>";
                        foreach ($columns as $col) {
                            $html .= "<th>" . htmlspecialchars($col['label']) . "</th>";
                        }
                        $html .= "<th>Acciones</th></tr></thead><tbody>";
                        // Aquí puedes generar filas iniciales según $minRows
                        $html .= "</tbody></table>";
                        $html .= "<button type='button' onclick='agregarFilaDatatable(\"dt_$name\")'>Agregar fila</button>";
                        // Agrega el JS necesario para manejar la tabla
                        break;
                    case 'file':
                        $multiple = !empty($field['multiple']) ? 'multiple' : '';
                        $html .= "<input type=\"file\" name=\"$name" . (!empty($field['multiple']) ? '[]' : '') . "\" id=\"$name\" $accept $multiple $required $readonly $disabled $classField $styleField $dataAttrs onchange=\"previewImage(this)\" />";
                        if (!$soloLectura) {
                            $html .= "<img id=\"preview_$name\" style=\"max-width:200px;display:none;\">";
                        }
                        if ($value && !$soloLectura) {
                            $ext = strtolower(pathinfo(is_array($value) ? $value[0] : $value, PATHINFO_EXTENSION));
                            if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                                $html .= "<br><img src=\"" . htmlspecialchars(is_array($value) ? $value[0] : $value) . "\" style=\"max-width:200px;\">";
                            } else {
                                $html .= "<br><a href=\"" . htmlspecialchars(is_array($value) ? $value[0] : $value) . "\">Archivo actual</a>";
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
                        $html .= "<textarea name=\"$name\" id=\"$name\" $placeholder $required $maxlength $minlength $autocomplete $autofocus $readonly $disabled $classField $styleField $dataAttrs>" . htmlspecialchars($value) . "</textarea>";
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

                    case 'file':
                        $html .= "<input type=\"file\" name=\"$name\" id=\"$name\" $accept $required $readonly $disabled $classField $styleField $dataAttrs onchange=\"previewImage(this)\" />";
                        if (!$soloLectura) {
                            $html .= "<img id=\"preview_$name\" style=\"max-width:200px;display:none;\">";
                        }
                        if ($value && !$soloLectura) {
                            $ext = strtolower(pathinfo($value, PATHINFO_EXTENSION));
                            if (in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                                $html .= "<br><img src=\"" . htmlspecialchars($value) . "\" style=\"max-width:200px;\">";
                            } else {
                                $html .= "<br><a href=\"" . htmlspecialchars($value) . "\">Archivo actual</a>";
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
?>
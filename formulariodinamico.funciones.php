<?php
// --- FUNCIONES PRINCIPALES ---

function obtenerDatosTabla($data) {
    global $conn;
    $tabla  = $data['tabla'];
    $campo  = $data['campo'];
    $filtro = isset($data['filtro']) ? "WHERE " . $data['filtro'] : "";
    $consulta = "SELECT $campo FROM $tabla $filtro";
    $stmt = $conn->prepare($consulta);
    if ($stmt === false) return [];
    $stmt->execute();
    $campos = array_map('trim', explode(',', $campo));
    $result = [];
    if (count($campos) == 2) {
        $stmt->bind_result($id, $nombre);
        while ($stmt->fetch()) $result[] = ['id' => $id, 'nombre' => $nombre];
    } else {
        $stmt->bind_result($valor);
        while ($stmt->fetch()) $result[] = $valor;
    }
    $stmt->close();
    return $result;
}

// Normaliza los valores para adjuntos y visualización
function normalizaValores($formData, $json, $paraJson = false) {
    $result = [];
    foreach ($json['grupos'] as $grupo) {
        if (isset($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $nombre = $campo['nombre'];
                $tipo = $campo['tipo'];
                $valor = isset($formData[$nombre]) ? $formData[$nombre] : '';
                if ($tipo === 'checkbox') {
                    // Siempre array
                    if (!is_array($valor)) {
                        if (is_string($valor) && strlen($valor)) {
                            $valor = array_map('trim', explode(',', $valor));
                        } else {
                            $valor = [];
                        }
                    }
                    if ($paraJson) {
                        $result[$nombre] = $valor;
                    } else {
                        $result[$nombre] = implode(', ', $valor);
                    }
                } else {
                    $result[$nombre] = is_array($valor) ? implode(', ', $valor) : $valor;
                }
            }
        }
        if (isset($grupo['hijos'])) {
            $result = array_merge($result, normalizaValores($formData, ['grupos' => $grupo['hijos']], $paraJson));
        }
    }
    return $result;
}

// Prepara los valores guardados para que los checkbox sean arrays y radio sean strings
function prepararValoresGuardados($json, $valoresGuardados) {
    foreach ($json['grupos'] as $grupo) {
        if (isset($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $nombre = $campo['nombre'];
                $tipo = $campo['tipo'];
                if (isset($valoresGuardados[$nombre])) {
                    if ($tipo === 'checkbox') {
                        if (!is_array($valoresGuardados[$nombre])) {
                            if (is_string($valoresGuardados[$nombre]) && strlen($valoresGuardados[$nombre])) {
                                $valoresGuardados[$nombre] = array_map('trim', explode(',', $valoresGuardados[$nombre]));
                            } else {
                                $valoresGuardados[$nombre] = [];
                            }
                        }
                    }
                }
            }
        }
        if (isset($grupo['hijos'])) {
            $valoresGuardados = prepararValoresGuardados(['grupos' => $grupo['hijos']], $valoresGuardados);
        }
    }
    return $valoresGuardados;
}

// Genera el HTML de los campos
function generarContenidoCampo($campo, $valor = '', $soloLectura = false) {
    $tipo = isset($campo['tipo']) ? $campo['tipo'] : 'text';
    $nombre = isset($campo['nombre']) ? $campo['nombre'] : '';
    $readonly = $soloLectura ? " readonly" : "";
    $disabled = $soloLectura ? " disabled" : "";
    $dataFormato = isset($campo['formato']) ? " data-formato='" . htmlspecialchars($campo['formato'], ENT_QUOTES, 'UTF-8') . "'" : "";

    // Opciones dinámicas
    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }

    if ($soloLectura) {
        if ($tipo === 'checkbox') {
            $valores = is_array($valor) ? $valor : (strlen($valor) ? array_map('trim', explode(',', $valor)) : []);
            return htmlspecialchars(implode(', ', $valores), ENT_QUOTES, 'UTF-8');
        } elseif ($tipo === 'radio' || $tipo === 'select' || $tipo === 'selectdata') {
            return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
        }
        return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
    }

    $dataFormula = "";
    if (isset($campo['formula'])) {
        $dataFormula = " data-formula='" . htmlspecialchars(is_array($campo['formula']) ? json_encode($campo['formula']) : $campo['formula'], ENT_QUOTES, 'UTF-8') . "'";
    }

    $html = '';
    switch ($tipo) {
        case 'radio':
            $html .= "<div class='radio-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars(is_array($opcion) ? $opcion['nombre'] : $opcion, ENT_QUOTES, 'UTF-8');
                $checked = ($valor == $opcionTexto) ? " checked" : "";
                $html .= "<span class='radio-item' style='margin-right:15px;'>";
                $html .= "<input type='radio' id='{$nombre}_{$opcionTexto}' name='{$nombre}' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}{$dataFormula}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'checkbox':
            $html .= "<div class='checkbox-group' id='{$nombre}_container'>";
            $valorArr = is_array($valor) ? $valor : (strlen($valor) ? array_map('trim', explode(',', $valor)) : []);
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars(is_array($opcion) ? $opcion['nombre'] : $opcion, ENT_QUOTES, 'UTF-8');
                $checked = (in_array($opcionTexto, $valorArr)) ? " checked" : "";
                $html .= "<span class='checkbox-item' style='margin-right:10px;'>";
                $html .= "<input type='checkbox' id='{$nombre}_{$opcionTexto}' name='{$nombre}[]' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}{$dataFormula}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'select':
        case 'selectdata':
            $html .= "<select name='{$nombre}' id='{$nombre}'{$readonly}{$disabled}{$dataFormato}{$dataFormula}>";
            foreach ($opciones as $opcion) {
                $opcionTexto = is_array($opcion) ? htmlspecialchars($opcion['nombre'], ENT_QUOTES, 'UTF-8') : htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $selected = ($valor == $opcionTexto) ? " selected" : "";
                $html .= "<option value='{$opcionTexto}'{$selected}>{$opcionTexto}</option>";
            }
            $html .= "</select>";
            break;
        case 'list':
            $html .= "<input type='text' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$dataFormato}{$dataFormula}>";
            break;
        case 'textarea':
            $html .= "<textarea name='{$nombre}' id='{$nombre}'{$readonly}{$dataFormato}{$dataFormula}>" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "</textarea>";
            break;
        default:
            $html .= "<input type='{$tipo}' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$disabled}{$dataFormato}{$dataFormula}>";
            break;
    }
    return $html;
}

// ...puedes agregar aquí las funciones de generarCampo y generarGruposRecursivos si lo deseas...
<?php

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

function normalizaValores($formData, $json, $paraJson = false) {
    $result = [];
    foreach ($json['grupos'] as $grupo) {
        if (isset($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $nombre = $campo['nombre'];
                $tipo = $campo['tipo'];
                if ($tipo === 'checkbox') {
                    if (isset($formData[$nombre])) {
                        $valor = $formData[$nombre];
                        if (!is_array($valor)) {
                            $valor = array_map('trim', explode(',', $valor));
                        }
                    } else {
                        $valor = [];
                    }
                    $result[$nombre] = $paraJson ? $valor : implode(', ', $valor);
                } else {
                    $valor = isset($formData[$nombre]) ? $formData[$nombre] : '';
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

function prepararValoresGuardados($json, $valoresGuardados) {
    foreach ($json['grupos'] as $grupo) {
        if (isset($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $nombre = $campo['nombre'];
                $tipo = $campo['tipo'];
                if ($tipo === 'checkbox') {
                    if (!isset($valoresGuardados[$nombre])) {
                        $valoresGuardados[$nombre] = [];
                    } elseif (!is_array($valoresGuardados[$nombre])) {
                        $valoresGuardados[$nombre] = array_map('trim', explode(',', $valoresGuardados[$nombre]));
                    }
                } elseif ($tipo === 'radio') {
                    if (!isset($valoresGuardados[$nombre])) {
                        $valoresGuardados[$nombre] = '';
                    } elseif (is_array($valoresGuardados[$nombre])) {
                        $valoresGuardados[$nombre] = implode(', ', $valoresGuardados[$nombre]);
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

function generarContenidoCampo($campo, $valor = '', $soloLectura = false) {
    $tipo = $campo['tipo'];
    $nombre = $campo['nombre'];
    $readonly = $soloLectura ? " readonly" : "";
    $disabled = $soloLectura ? " disabled" : "";
    $dataFormato = isset($campo['formato']) ? " data-formato='" . htmlspecialchars($campo['formato'], ENT_QUOTES, 'UTF-8') . "'" : "";

    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }

    if ($soloLectura) {
        if ($tipo === 'checkbox') {
            $valores = is_array($valor) ? $valor : (strlen($valor) ? array_map('trim', explode(',', $valor)) : []);
            return htmlspecialchars(implode(', ', $valores), ENT_QUOTES, 'UTF-8');
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

function generarCampo($campo, $valores = [], $soloLectura = false) {
    $estiloCampo = isset($campo['estilo']) ? " style='" . htmlspecialchars($campo['estilo'], ENT_QUOTES, 'UTF-8') . "'" : "";
    $etiqueta = isset($campo['etiqueta']) ? htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8') : '';
    $posicion = isset($campo['posicionetiqueta']) ? strtolower($campo['posicionetiqueta']) : 'arriba';

    $clasePosicion = '';
    $alinearDiv = '';
    switch ($posicion) {
        case 'izquierdo':
            $clasePosicion = 'label-izquierdo';
            break;
        case 'derecho':
            $clasePosicion = 'label-derecho';
            break;
        case 'arriba.izquierdo':
        case 'abajo.izquierdo':
            $alinearDiv = 'alinear-izquierdo';
            break;
        case 'arriba.derecho':
        case 'abajo.derecho':
            $alinearDiv = 'alinear-derecho';
            break;
        case 'arriba.centro':
        case 'abajo.centro':
            $alinearDiv = 'alinear-centro';
            break;
    }

    $nombreCampo = isset($campo['nombre']) ? $campo['nombre'] : '';
    $valor = isset($valores[$nombreCampo]) ? $valores[$nombreCampo] : '';

    $html  = "<div class='campo-container $clasePosicion'{$estiloCampo}>";
    switch ($posicion) {
        case 'izquierdo':
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
        case 'derecho':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label>";
            break;
        case 'arriba.izquierdo':
        case 'arriba.derecho':
        case 'arriba.centro':
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label><br>";
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            $html .= "</div>";
            break;
        case 'abajo':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$nombreCampo}'>{$etiqueta}</label>";
            break;
        case 'abajo.izquierdo':
        case 'abajo.derecho':
        case 'abajo.centro':
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$nombreCampo}'>{$etiqueta}</label>";
            $html .= "</div>";
            break;
        case 'oculto':
        case 'none':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
        case 'arriba':
        default:
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label><br>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
    }
    $html .= "<span class='mensaje-error'></span>";
    $html .= "</div>";
    return $html;
}

function generarGruposRecursivos($grupos, $valores = [], $soloLectura = false) {
    $html = "";
    foreach ($grupos as $grupo) {
        if (isset($grupo['activo']) && !$grupo['activo']) continue;
        $grupoNombre = isset($grupo['grupoNombre']) ? htmlspecialchars($grupo['grupoNombre'], ENT_QUOTES, 'UTF-8') : "Grupo";
        $estiloGrupo = isset($grupo['estilo']) ? $grupo['estilo'] : "";
        $html .= "<fieldset style='{$estiloGrupo}'><legend>{$grupoNombre}</legend>";
        if (isset($grupo['campos']) && is_array($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $html .= generarCampo($campo, $valores, $soloLectura);
            }
        }
        if (isset($grupo['hijos']) && is_array($grupo['hijos'])) {
            $html .= generarGruposRecursivos($grupo['hijos'], $valores, $soloLectura);
        }
        $html .= "</fieldset>";
    }
    return $html;
}
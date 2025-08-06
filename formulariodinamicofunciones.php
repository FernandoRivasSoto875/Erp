<?php
/**
 * ========================================================================
 *  ARCHIVO FINALIZADO Y CORREGIDO - VERSIÓN PARA PRODUCCIÓN
 * ========================================================================
 *  - Contiene las funciones para generar cada tipo de campo del formulario.
 *  - SOLUCIONA EL ERROR "Couldn't fetch mysqli" en la función de 'selectdata'.
 *  - Mantiene la lógica para los demás campos.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- Función principal para generar un campo ---
function generarCampo($campo, $valor, $soloLectura) {
    $tipo = $campo['tipo'] ?? 'text';
    $nombre = $campo['nombre'] ?? 'campo_' . uniqid();
    $etiqueta = $campo['etiqueta'] ?? '';
    $placeholder = $campo['placeholder'] ?? '';
    $clase = $campo['clase'] ?? 'form-control';
    $atributos = $campo['atributos'] ?? [];
    $opciones = $campo['opciones'] ?? [];
    $valor_predeterminado = $campo['valor_predeterminado'] ?? '';
    $columnas_datatable = $campo['columnas'] ?? [];

    // Determinar el valor final a usar
    $valor_final = $valor !== '' ? $valor : $valor_predeterminado;

    $html_atributos = '';
    if ($soloLectura) {
        $atributos['readonly'] = true;
    }
    foreach ($atributos as $attr => $val) {
        if (is_bool($val)) {
            if ($val) $html_atributos .= " $attr";
        } else {
            $html_atributos .= " $attr=\"" . htmlspecialchars($val) . "\"";
        }
    }

    $html = "<div class='form-group'>";
    if ($etiqueta && $tipo !== 'hidden') {
        $html .= "<label for='" . htmlspecialchars($nombre) . "'>" . htmlspecialchars($etiqueta) . "</label>";
    }

    switch ($tipo) {
        case 'textarea':
            $html .= "<textarea name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' class='$clase' placeholder='$placeholder'$html_atributos>" . htmlspecialchars($valor_final) . "</textarea>";
            break;
        case 'select':
            $html .= "<select name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' class='$clase'$html_atributos>";
            foreach ($opciones as $opt_val => $opt_label) {
                $selected = ($opt_val == $valor_final) ? ' selected' : '';
                $html .= "<option value='" . htmlspecialchars($opt_val) . "'$selected>" . htmlspecialchars($opt_label) . "</option>";
            }
            $html .= "</select>";
            break;
        case 'selectdata':
            // --- ESTA ES LA SECCIÓN CRÍTICA CORREGIDA ---
            $html .= "<select name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' class='$clase'$html_atributos>";
            $config_path = __DIR__ . '/config/conexion.json';
            
            if (file_exists($config_path)) {
                $config = json_decode(file_get_contents($config_path), true);
                $conn = new mysqli($config['host'], $config['user'], $config['password'], $config['database']);

                // ¡CORRECCIÓN IMPORTANTE!
                // Primero, verificar si no hay un error de conexión.
                if ($conn && !$conn->connect_error) {
                    $query = $campo['query'] ?? '';
                    if ($query) {
                        $stmt = $conn->prepare($query);
                        if ($stmt) {
                            $stmt->execute();
                            $result = $stmt->get_result();
                            while ($row = $result->fetch_assoc()) {
                                $val = $row['valor'];
                                $lab = $row['etiqueta'];
                                $selected = ($val == $valor_final) ? ' selected' : '';
                                $html .= "<option value='" . htmlspecialchars($val) . "'$selected>" . htmlspecialchars($lab) . "</option>";
                            }
                            $stmt->close();
                        } else {
                             $html .= "<option value=''>Error preparando la consulta</option>";
                        }
                    }
                    $conn->close();
                } else {
                    // Si la conexión falla, mostrar un mensaje claro en el select.
                    $error_msg = $conn->connect_error ? $conn->connect_error : 'Error desconocido';
                    $html .= "<option value=''>Error de conexión a BD: " . htmlspecialchars($error_msg) . "</option>";
                }
            } else {
                $html .= "<option value=''>Falta config/conexion.json</option>";
            }
            $html .= "</select>";
            break;
        case 'checkbox':
            foreach ($opciones as $cb_val => $cb_label) {
                // Para checkboxes, el valor puede ser un array
                $checked = (is_array($valor_final) && in_array($cb_val, $valor_final)) || $cb_val == $valor_final ? ' checked' : '';
                $html .= "<div class='form-check'>";
                $html .= "<input type='checkbox' name='" . htmlspecialchars($nombre) . "[]' value='" . htmlspecialchars($cb_val) . "' class='form-check-input'$checked$html_atributos>";
                $html .= "<label class='form-check-label'>" . htmlspecialchars($cb_label) . "</label>";
                $html .= "</div>";
            }
            break;
        case 'radio':
            foreach ($opciones as $rb_val => $rb_label) {
                $checked = ($rb_val == $valor_final) ? ' checked' : '';
                $html .= "<div class='form-check'>";
                $html .= "<input type='radio' name='" . htmlspecialchars($nombre) . "' value='" . htmlspecialchars($rb_val) . "' class='form-check-input'$checked$html_atributos>";
                $html .= "<label class='form-check-label'>" . htmlspecialchars($rb_label) . "</label>";
                $html .= "</div>";
            }
            break;
        case 'datatable':
            $html .= "<div id='dt-container-" . htmlspecialchars($nombre) . "'>";
            $html .= "<table id='" . htmlspecialchars($nombre) . "' class='table table-striped table-bordered' style='width:100%'>";
            $html .= "<thead><tr>";
            foreach ($columnas_datatable as $col) {
                $html .= "<th>" . htmlspecialchars($col['etiqueta']) . "</th>";
            }
            $html .= "<th>Acciones</th>";
            $html .= "</tr></thead><tbody></tbody>";
            $html .= "</table>";
            $html .= "<button type='button' class='btn btn-primary btn-sm mt-2' onclick=\"abrirModalDatatable('" . htmlspecialchars($nombre) . "')\">Agregar Fila</button>";
            $html .= "</div>";
            // El input hidden almacenará los datos del datatable como JSON
            $html .= "<input type='hidden' name='" . htmlspecialchars($nombre) . "' id='hidden-" . htmlspecialchars($nombre) . "' value='" . htmlspecialchars(is_array($valor_final) ? json_encode($valor_final) : '[]') . "'>";
            break;
        case 'file':
             $html .= "<input type='file' name='" . htmlspecialchars($nombre) . "[]' id='" . htmlspecialchars($nombre) . "' class='$clase'$html_atributos multiple>";
             break;
        case 'hidden':
            $html .= "<input type='hidden' name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' value='" . htmlspecialchars($valor_final) . "'$html_atributos>";
            break;
        case 'password':
            $html .= "<input type='password' name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' class='$clase' placeholder='$placeholder' value='" . htmlspecialchars($valor_final) . "'$html_atributos>";
            break;
        default: // text, email, number, date, etc.
            $html .= "<input type='" . htmlspecialchars($tipo) . "' name='" . htmlspecialchars($nombre) . "' id='" . htmlspecialchars($nombre) . "' class='$clase' placeholder='$placeholder' value='" . htmlspecialchars($valor_final) . "'$html_atributos>";
            break;
    }

    $html .= "</div>";
    return $html;
}
?>

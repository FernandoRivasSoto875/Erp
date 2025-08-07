<?php
/*
====================================================================================
  KEEP: UNIFICADO
  Este archivo contiene TODAS las funciones de generación de campos y paleta.
  NO debe ser sobrescrito ni fragmentado. Mantener siempre esta versión unificada.
  Si se actualiza, conservar este bloque y toda la lógica unificada.
====================================================================================
*/
// KEEP: UNIFICADO. Incluye funciones de paleta y de generación de campos.
// ========================================================================
//  - Contiene las funciones para generar cada tipo de campo del formulario.
//  - Incluye funciones para la paleta de componentes y tipos de control.
//  - SOLUCIONA EL ERROR "Couldn't fetch mysqli" en la función de 'selectdata'.
//  - Mantiene la lógica para los demás campos.
// ========================================================================
// --- PALETA DE COMPONENTES ---
function generarPaletaComponentes($fieldsets_disponibles, $fieldsets) {
    $html = "<div id='paleta-componentes' class='paleta-componentes bg-light p-3 mb-3 solo-modo-diseno'>";
    $html .= "<h5 class='mb-3'><i class='fas fa-toolbox'></i> Paleta de Componentes</h5>";
    if (empty($fieldsets_disponibles)) {
        $html .= "<div class='text-muted'>No hay componentes disponibles para agregar.</div>";
    } else {
        $html .= "<div class='d-flex flex-wrap'>";
        foreach ($fieldsets_disponibles as $fs_name) {
            $titulo = htmlspecialchars($fieldsets[$fs_name]['titulo'] ?? $fs_name);
            $html .= "<div class='draggable-fieldset card m-2 p-2 text-center' data-fieldset='$fs_name' style='min-width:180px;cursor:grab;'>";
            $html .= "<div class='handle mb-2'><i class='fas fa-grip-vertical'></i></div>";
            $html .= "<strong>$titulo</strong><br><span class='badge badge-secondary'>$fs_name</span>";
            $html .= "</div>";
        }
        $html .= "</div>";
    }
    $html .= "</div>";
    return $html;
}

// --- PALETA DE TIPOS DE CONTROL (para crear nuevos campos desde cero) ---
function generarPaletaTiposControl() {
    $tipos = [
        'text' => 'Texto',
        'textarea' => 'Área de texto',
        'number' => 'Número',
        'email' => 'Email',
        'password' => 'Contraseña',
        'select' => 'Select (Opciones)',
        'selectdata' => 'Select (BD)',
        'radio' => 'Radio',
        'checkbox' => 'Checkbox',
        'file' => 'Archivo',
        'date' => 'Fecha',
        'datatable' => 'Datatable',
        'hidden' => 'Oculto'
    ];
    $html = "<div id='paleta-tipos-control' class='paleta-componentes bg-light p-3 mb-3 solo-modo-diseno'>";
    $html .= "<h5 class='mb-3'><i class='fas fa-plus-square'></i> Crear Nuevo Campo</h5>";
    $html .= "<div class='d-flex flex-wrap'>";
    foreach ($tipos as $tipo => $label) {
        $html .= "<div class='draggable-tipo card m-2 p-2 text-center' data-tipo='$tipo' style='min-width:120px;cursor:grab;'>";
        $html .= "<div class='handle mb-2'><i class='fas fa-grip-vertical'></i></div>";
        $html .= "<strong>$label</strong><br><span class='badge badge-info'>$tipo</span>";
        $html .= "</div>";
    }
    $html .= "</div></div>";
    return $html;
}

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
        // Etiqueta editable solo en modo diseño (detectado por JS con la clase editable-label)
        $html .= "<label for='" . htmlspecialchars($nombre) . "' class='editable-label' data-field-name='" . htmlspecialchars($nombre) . "' contenteditable='false'>" . htmlspecialchars($etiqueta) . "</label>";
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

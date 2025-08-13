<?php
// KEEP: Revisado y listo para commit. Funciones auxiliares para renderizado y utilidades del formulario dinámico.
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
function generarPaletaTiposControl(): string {
    $tipos = ['text','textarea','number','email','password','select','selectdata','radio','checkbox','file','date','datatable','hidden'];
    $html = '<div class="p-3"><h5 class="mb-3">Tipos de control</h5><div class="row">';
    foreach ($tipos as $t) {
        $html .= '<div class="col-6 col-md-4 mb-2">';
        $html .= '<div class="draggable-tipo border rounded p-2 bg-white">';
        $html .= '<div class="d-flex align-items-center"><span class="handle mr-2"><i class="fas fa-grip-vertical"></i></span>';
        $html .= '<span>'.htmlspecialchars($t, ENT_QUOTES, 'UTF-8').'</span></div>';
        $html .= '</div></div>';
    }
    $html .= '</div></div>';
    return $html;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- Función principal para generar un campo ---
function generarCampo($campo, $valor, $soloLectura): string {
    $tipo   = $campo['tipo'] ?? 'text';
    $nombre = $campo['nombre'] ?? 'sin_nombre';
    $label  = $campo['etiqueta'] ?? $nombre;
    $attrs  = $campo['atributos'] ?? [];
    $disabled = $soloLectura ? ' disabled' : '';
    $attrStr = '';
    foreach ((array)$attrs as $k => $v) {
        $attrStr .= ' '.htmlspecialchars($k, ENT_QUOTES, 'UTF-8').'="'.htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8').'"';
    }
    $hLabel = '<label class="form-label">'.htmlspecialchars($label, ENT_QUOTES, 'UTF-8').'</label>';
    $hName  = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');

    switch ($tipo) {
        case 'textarea':
            return "<div class='form-group mb-2'>{$hLabel}<textarea name='{$hName}' class='form-control'{$disabled}{$attrStr}>".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."</textarea></div>";
        case 'number':
        case 'email':
        case 'password':
        case 'date':
        case 'hidden': {
            $inputType = $tipo === 'hidden' ? 'text' : $tipo;
            $cls = $tipo === 'hidden' ? 'form-control d-none' : 'form-control';
            return "<div class='form-group mb-2'>".($tipo==='hidden'?'':$hLabel)."<input type='{$inputType}' name='{$hName}' value='".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."' class='{$cls}'{$disabled}{$attrStr}></div>";
        }
        case 'file':
            return "<div class='form-group mb-2'>{$hLabel}<input type='file' name='{$hName}".(isset($attrs['multiple'])?'[]':'')."' class='form-control'{$disabled}{$attrStr}></div>";
        case 'select':
        case 'selectdata': {
            $options = $campo['opciones'] ?? [];
            $opts = '';
            foreach ((array)$options as $key => $text) {
                $sel = ((string)$valor === (string)$key) ? ' selected' : '';
                $opts .= "<option value='".htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8')."'{$sel}>".htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8')."</option>";
            }
            return "<div class='form-group mb-2'>{$hLabel}<select name='{$hName}' class='form-control'{$disabled}{$attrStr}>{$opts}</select></div>";
        }
        case 'radio': {
            $options = $campo['opciones'] ?? [];
            $html = "<div class='form-group mb-2'>{$hLabel}<div>";
            foreach ((array)$options as $key => $text) {
                $id = $hName.'_'.preg_replace('/[^A-Za-z0-9_]/','', (string)$key);
                $chk = ((string)$valor === (string)$key) ? ' checked' : '';
                $html .= "<div class='form-check form-check-inline'><input class='form-check-input' type='radio' id='{$id}' name='{$hName}' value='".htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8')."'{$chk}{$disabled}{$attrStr}><label class='form-check-label' for='{$id}'>".htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8')."</label></div>";
            }
            return $html."</div></div>";
        }
        case 'checkbox': {
            $checked = !empty($valor) ? ' checked' : '';
            return "<div class='form-group form-check mb-2'><input class='form-check-input' type='checkbox' id='{$hName}' name='{$hName}' value='1'{$checked}{$disabled}{$attrStr}><label class='form-check-label' for='{$hName}'>".htmlspecialchars($label, ENT_QUOTES, 'UTF-8')."</label></div>";
        }
        case 'datatable': {
            $cols = $campo['columnas'] ?? $campo['columns'] ?? [];
            $head = '';
            foreach ((array)$cols as $col) {
                $head .= '<th>'.htmlspecialchars($col['etiqueta'] ?? $col['label'] ?? '', ENT_QUOTES, 'UTF-8').'</th>';
            }
            return "<div class='form-group mb-2'>{$hLabel}<div data-tipo='datatable' data-nombre='{$hName}' class='table-responsive'><table class='table table-sm table-bordered mb-0'><thead><tr>{$head}</tr></thead><tbody><!-- filas dinámicas --></tbody></table></div></div>";
        }
        default:
            return "<div class='form-group mb-2'>{$hLabel}<input type='text' name='{$hName}' value='".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."' class='form-control'{$disabled}{$attrStr}></div>";
    }
}

// Info de campo para back (búsqueda segura)
function getFieldInfo($name, array $all_fields) {
    foreach ($all_fields as $f) if (($f['name'] ?? null) === $name) return $f;
    return ['label' => ucfirst((string)$name), 'type' => 'text', 'columns' => []];
}

function fd_count_fields_por_fieldset(array $fieldsets): array {
    $out=[];
    foreach($fieldsets as $k=>$fs){
        $campos = $fs['fields'] ?? ($fs['campos'] ?? []);
        $out[$k] = is_array($campos) ? count($campos) : 0;
    }
    return $out;
}
?>

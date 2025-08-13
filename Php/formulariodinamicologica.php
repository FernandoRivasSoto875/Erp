<?php
/* MASTER_PROMPT_REFERENCE
   Leer COPILOT_PROMPT en formulariodinamico.php.
   Rol: lógica adicional (validaciones / serialización avanzada) fuera de la vista.
   Evitar duplicar helpers ya definidos. */
// Helpers
if (!function_exists('fd_escape')) {
    function fd_escape($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('generarCampo')) {
    function generarCampo(array $c, $v = null, bool $ro = false): string {
        $nombre = (string)($c['nombre'] ?? $c['name'] ?? '');
        $etq    = (string)($c['etiqueta'] ?? $c['label'] ?? $nombre);
        $tipo   = strtolower((string)($c['tipo'] ?? $c['type'] ?? 'text'));
        $attrs  = (string)($c['attrs'] ?? '');
        $dis    = $ro ? 'readonly disabled' : '';
        $val    = (string)($v ?? $c['valor_predeterminado'] ?? $c['default'] ?? '');
        $ph     = (string)($c['placeholder'] ?? '');

        $html = '<div class="form-group mb-2" data-field="'.$nombre.'">';
        if ($tipo !== 'checkbox') $html .= '<label class="form-label">'.fd_escape($etq).'</label>';

        switch ($tipo) {
            case 'textarea':
                $html .= '<textarea name="'.fd_escape($nombre).'" class="form-control" '.$dis.' '.$attrs.'>'.fd_escape($val).'</textarea>';
                break;
            case 'select':
                $ops = $c['opciones'] ?? $c['options'] ?? [];
                $html .= '<select name="'.fd_escape($nombre).'" class="form-control" '.$dis.' '.$attrs.'>';
                foreach ($ops as $k => $txt) {
                    $sel = ((string)$k === (string)$val) ? 'selected' : '';
                    $html .= '<option value="'.fd_escape($k).'" '.$sel.'>'.fd_escape(is_array($txt)?($txt['texto']??$txt['label']??$k):$txt).'</option>';
                }
                $html .= '</select>';
                break;
            case 'checkbox':
                $chk = (!empty($c['checked']) || $val==='1' || $val===1 || $val===true) ? 'checked' : '';
                $html .= '<div class="form-check"><input type="checkbox" class="form-check-input" name="'.fd_escape($nombre).'" value="1" '.$chk.' '.$dis.' '.$attrs.'>';
                $html .= '<label class="form-check-label">'.fd_escape($etq).'</label></div>';
                break;
            default:
                $html .= '<input type="'.fd_escape($tipo).'" name="'.fd_escape($nombre).'" value="'.fd_escape($val).'" placeholder="'.fd_escape($ph).'" class="form-control" '.$dis.' '.$attrs.' />';
        }

        $html .= '</div>';
        return $html;
    }
}

// Fieldset
if (!function_exists('generarFieldsetContenido')) {
    function generarFieldsetContenido(string $fsName, array $fieldsets, array $valores = [], bool $soloLectura = false): string {
        $fs = $fieldsets[$fsName] ?? null;
        if (!$fs) return '<div class="alert alert-warning mb-2">Fieldset no encontrado: '.fd_escape($fsName).'</div>';

        $titulo = $fs['titulo'] ?? $fsName;
        $campos = is_array($fs['campos'] ?? null) ? $fs['campos'] : [];

        $html  = '<fieldset class="draggable-fieldset mb-3 p-2" data-fieldset-name="'.fd_escape($fsName).'" data-fieldset-title="'.fd_escape($titulo).'">';
        $html .= '<legend class="small text-muted d-flex align-items-center">'.fd_escape($titulo);
        $html .= ' <span class="edit-icon" data-edit="fieldset" data-fs="'.fd_escape($fsName).'" title="Editar fieldset"><i class="fas fa-pencil-alt"></i></span>';
        $html .= '</legend>';

        $html .= '<div class="sortable-fields-container">';
        foreach ($campos as $c) {
            if (!is_array($c)) continue;
            $nombre = (string)($c['nombre'] ?? $c['name'] ?? '');
            if ($nombre === '') continue;
            $valor = $valores[$nombre] ?? ($c['valor_predeterminado'] ?? $c['default'] ?? '');
            $html .= '<div class="draggable-field mb-2" data-field-name="'.fd_escape($nombre).'">';
            $html .= generarCampo($c, $valor, $soloLectura);
            $html .= ' <span class="edit-icon" data-edit="field" data-fs="'.fd_escape($fsName).'" data-field="'.fd_escape($nombre).'" title="Editar campo"><i class="fas fa-pencil-alt"></i></span>';
            $html .= '</div>';
        }
        $html .= '</div></fieldset>';
        return $html;
    }
}

// Column rendering (fieldset, tabset, group)
if (!function_exists('renderColumnContent')) {
    function renderColumnContent(array $col, array $fieldsets, array $valores = [], bool $soloLectura = false, string $colPath = ''): string {
        if (!empty($col['fieldset'])) {
            $fsName = (string)$col['fieldset'];
            return $fsName !== '' ? generarFieldsetContenido($fsName, $fieldsets, $valores, $soloLectura) : '';
        }
        if (isset($col['tabset']) && is_array($col['tabset'])) {
            return renderTabsBlock($col['tabset'], $fieldsets, $valores, $soloLectura, $colPath === '' ? '' : $colPath.'.tabset');
        }
        if (isset($col['group']) && is_array($col['group'])) {
            return renderFieldsetGroup($col['group'], $fieldsets, $valores, $soloLectura, $colPath === '' ? '' : $colPath.'.group');
        }
        return '';
    }
}

if (!function_exists('renderFieldsetGroup')) {
    function renderFieldsetGroup(array $group, array $fieldsets, array $valores = [], bool $soloLectura = false, string $groupPath = ''): string {
        $title = (string)($group['title'] ?? 'Grupo');
        $items = is_array($group['items'] ?? null) ? $group['items'] : [];
        // ...continúa la lógica para renderizar el grupo...
        return '';
    }
}

// Puedes agregar aquí más funciones auxiliares según las necesidades del formulario dinámico.

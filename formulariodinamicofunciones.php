<?php
// Encabezado para forzar UTF-8 en la salida HTML
//   Leer COPILOT_PROMPT en Leer COPILOT_PROMPT en formulariodinamicoprompt.txt (fuente única de lineamientos).
if (!headers_sent()) {
    header('Content-Type: text/html; charset=UTF-8');
}
   
 // --- PALETA DE COMPONENTES ---
function generarPaletaComponentes($fieldsets_disponibles, $fieldsets) {
    ob_start();
    echo "<div id='paleta-componentes' class='paleta-componentes bg-light p-3 mb-3 solo-modo-diseno'>";
    echo "<h5 class='mb-3'><i class='fas fa-toolbox'></i> Paleta de Componentes</h5>";
    if (empty($fieldsets_disponibles)) {
        echo "<div class='text-muted'>No hay componentes disponibles para agregar.</div>";
    } else {
        echo "<div class='d-flex flex-wrap'>";
        foreach ($fieldsets_disponibles as $fs_name) {
            $titulo = htmlspecialchars($fieldsets[$fs_name]['titulo'] ?? $fs_name);
            echo "<div class='draggable-fieldset card m-2 p-2 text-center' data-fieldset='$fs_name' style='min-width:180px;cursor:grab;'>";
            echo "<div class='handle mb-2'><i class='fas fa-grip-vertical'></i></div>";
            echo "<strong>$titulo</strong><br><span class='badge badge-secondary'>$fs_name</span>";
            echo "</div>";
        }
        echo "</div>";
    }
    echo "</div>";
    return ob_get_clean();
}

// --- PALETA DE TIPOS DE CONTROL (para crear nuevos campos desde cero) ---
function generarPaletaTiposControl(): string {
    $tipos = ['text','textarea','number','email','password','select','selectdata','radio','checkbox','file','date','datatable','hidden'];
    ob_start();
    echo '<div class="p-3"><h5 class="mb-3">Tipos de control</h5><div class="row">';
    foreach ($tipos as $t) {
        echo '<div class="col-6 col-md-4 mb-2">';
        echo '<div class="draggable-tipo border rounded p-2 bg-white">';
        echo '<div class="d-flex align-items-center"><span class="handle mr-2"><i class="fas fa-grip-vertical"></i></span>';
        echo '<span>'.htmlspecialchars($t, ENT_QUOTES, 'UTF-8').'</span></div>';
        echo '</div></div>';
    }
    echo '</div></div>';
    return ob_get_clean();
}

// --- Función principal para generar un campo ---
function generarCampo($campo, $valor, $soloLectura): string {
    $attrs = $campo['attrs'] ?? [];
    $tipo = strtolower($campo['tipo'] ?? 'text');
    $hLabel = htmlspecialchars($campo['etiqueta'] ?? $campo['label'] ?? '', ENT_QUOTES, 'UTF-8');
    $inputType = $tipo;
    $hName = htmlspecialchars($campo['nombre'] ?? $campo['name'] ?? '', ENT_QUOTES, 'UTF-8');
    $disabled = $soloLectura ? ' disabled readonly' : '';
    $label = $campo['etiqueta'] ?? $campo['label'] ?? '';
    $attrStr = '';
    if (!empty($attrs)) {
        $attrStr = implode(' ', array_map(
            function($k, $v) {
                return htmlspecialchars($k, ENT_QUOTES, 'UTF-8')."=\"".htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8')."\"";
            },
            array_keys($attrs),
            $attrs
        ));
        $attrStr = ' ' . $attrStr;
    }
    switch ($tipo) {
        case 'embevido':
        /* Leer COPILOT_PROMPT en formulariodinamicoprompt.txt */
            $ancho = $campo['ancho'] ?? '100%';
            $alto = $campo['alto'] ?? '400px';
            $borde = !empty($campo['mostrar_borde']) ? '1' : '0';
            $fullscreen = !empty($campo['permitir_fullscreen']) ? 'allowfullscreen' : '';
            $params = $campo['parametros_embebido'] ?? [];
            $url = isset($url) ? $url : '';
            if (!empty($params) && is_array($params)) {
                $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($params);
            }
            $iframe = "<iframe src='".htmlspecialchars($url, ENT_QUOTES, 'UTF-8')."' width='".htmlspecialchars($ancho, ENT_QUOTES, 'UTF-8')."' height='".htmlspecialchars($alto, ENT_QUOTES, 'UTF-8')."' frameborder='".htmlspecialchars($borde, ENT_QUOTES, 'UTF-8')."' style='border:1px solid #ccc;' $fullscreen></iframe>";
                $alto = isset($alto) ? $alto : '400px';
            return "<div class='form-group mb-2'>{$hLabel}{$iframe}</div>";
        case 'email':
        case 'password':
        case 'text':
        case 'number':
        case 'date':
        case 'hidden':
            $cls = $tipo === 'hidden' ? 'form-control d-none' : 'form-control';
            return "<div class='form-group mb-2'>".($tipo==='hidden'?'':$hLabel)."<input type='{$inputType}' name='{$hName}' value='".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."' class='{$cls}'{$disabled}{$attrStr}></div>";
        case 'textarea':
            return "<div class='form-group mb-2'>{$hLabel}<textarea name='{$hName}' class='form-control'{$disabled}{$attrStr}>".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."</textarea></div>";
        case 'file':
            return "<div class='form-group mb-2'>{$hLabel}<input type='file' name='{$hName}".(isset($attrs['multiple'])?'[]':'')."' class='form-control'{$disabled}{$attrStr}></div>";
        case 'select':
            // Si tiene data-source, renderiza el select vacío con atributo data-source
            if (!empty($campo['data-source'])) {
                return "<div class='form-group mb-2'>{$hLabel}<select name='{$hName}' class='form-control' data-source='" . htmlspecialchars(json_encode($campo['data-source']), ENT_QUOTES, 'UTF-8') . "'{$disabled}{$attrStr}></select></div>";
            }
            // Si tiene opciones estáticas
            $options = $campo['opciones'] ?? [];
            $opts = '';
            foreach ((array)$options as $key => $text) {
                $sel = ((string)$valor === (string)$key) ? ' selected' : '';
                $opts .= "<option value='".htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8')."'{$sel}>".htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8')."</option>";
            }
            return "<div class='form-group mb-2'>{$hLabel}<select name='{$hName}' class='form-control'{$disabled}{$attrStr}>{$opts}</select></div>";
        case 'selectdata':
            // Si tiene data, renderiza el select vacío con atributo data-selectdata
            if (!empty($campo['data'])) {
                return "<div class='form-group mb-2'>{$hLabel}<select name='{$hName}' class='form-control' data-selectdata='" . htmlspecialchars(json_encode($campo['data']), ENT_QUOTES, 'UTF-8') . "'{$disabled}{$attrStr}></select></div>";
            }
            // Si tiene opciones estáticas
            $options = $campo['opciones'] ?? [];
            $opts = '';
            foreach ((array)$options as $key => $text) {
                $sel = ((string)$valor === (string)$key) ? ' selected' : '';
                $opts .= "<option value='".htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8')."'{$sel}>".htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8')."</option>";
            }
            return "<div class='form-group mb-2'>{$hLabel}<select name='{$hName}' class='form-control'{$disabled}{$attrStr}>{$opts}</select></div>";
        case 'radio':
            $options = $campo['opciones'] ?? [];
            $html = "<div class='form-group mb-2'>{$hLabel}<div>";
            foreach ((array)$options as $key => $text) {
                $html .= "<div class='form-check form-check-inline'><input class='form-check-input' type='radio' id='{$hName}_{$key}' name='{$hName}' value='".htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8')."'".(((string)$valor === (string)$key)?' checked':'')."{$disabled}{$attrStr}><label class='form-check-label' for='{$hName}_{$key}'>".htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8')."</label></div>";
            }
            return $html."</div></div>";
        case 'checkbox':
            return "<div class='form-group form-check mb-2'><input class='form-check-input' type='checkbox' id='{$hName}' name='{$hName}' value='1'".(($valor)?' checked':'')."{$disabled}{$attrStr}><label class='form-check-label' for='{$hName}'>".htmlspecialchars($label ?: $hLabel, ENT_QUOTES, 'UTF-8')."</label></div>";
        case 'datatable':
            $cols = $campo['columnas'] ?? $campo['columns'] ?? [];
            $head = '';
            foreach ($cols as $col) {
                $head .= "<th>".htmlspecialchars($col['label'] ?? $col['nombre'] ?? $col['name'] ?? '', ENT_QUOTES, 'UTF-8')."</th>";
            }
            return "<div class='form-group mb-2'>{$hLabel}<div data-tipo='datatable' data-nombre='{$hName}' class='table-responsive'><table class='table table-sm table-bordered mb-0'><thead><tr>{$head}</tr></thead><tbody><!-- filas dinámicas --></tbody></table></div></div>";
        default:
            return "<div class='form-group mb-2'>{$hLabel}<input type='{$inputType}' name='{$hName}' value='".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."' class='form-control'{$disabled}{$attrStr}></div>";
    }

}

function fd_count_fields_por_fieldset(array $fieldsets) {
    $out = [];
    foreach ($fieldsets as $key => $fs) {
        $out[$key] = isset($fs['campos']) && is_array($fs['campos']) ? count($fs['campos']) : 0;
    }
    return $out;
}
function fd_count_fieldsets($fieldsets) {
    return is_array($fieldsets) ? count($fieldsets) : 0;
}

/* ========================================================================
   RENDER LAYOUT FALLBACK
   Añade las funciones de render de layout/fieldsets que faltaban para evitar:
   "Helper fd_render_layout_fallback no disponible."
   No elimina nada existente. Compatible con estructuras:
   - layout: array de secciones (sección puede tener 'rows' o ser 'tabs')
   - sección 'tabs': ['type'=>'tabs','tabs'=>[ ['title'=>'..','rows'=>[]], ... ]]
   - row: ['cols'=>[ { 'width'=>6,'fieldset'=>'datosBasicos' }, ... ]]
   - col: 'width' (1..12, default 12), 'fieldset' => clave en $fieldsets
   - fieldset: ['titulo'=>'','fields'=>[ campoDef,... ]]
   ======================================================================== */
if (!function_exists('fd_is_assoc')) {
    function fd_is_assoc(array $arr): bool {
        return $arr !== [] && array_keys($arr) !== range(0, count($arr) - 1);
    }
}

if (!function_exists('fd_render_layout_fallback')) {

    function fd_render_layout_fallback($layout, array $fieldsets): string {
        if (!$layout || !is_array($layout)) return '';
        // Normalizar secciones
        $sections = fd_is_assoc($layout)
            ? array_map(function($k,$v){ if(is_array($v)) $v['_section_key']=$k; return $v; }, array_keys($layout), $layout)
            : $layout;

        $html = '';
        foreach ($sections as $section) {
            if (!is_array($section)) continue;
            $type = $section['type'] ?? 'section';

            if ($type === 'tabs') {
                $html .= fd_render_tabs_section($section, $fieldsets);
                continue;
            }

            $rows = $section['rows'] ?? [];
            $secKey = $section['_section_key'] ?? null;
            $cls = 'fd-section fd-section-'.preg_replace('/[^a-z0-9_\-]+/i','-', $type);
            $html .= '<div class="'.$cls.'"'.($secKey?' data-section="'.$secKey.'"':'').'>';
            $html .= fd_render_rows_fallback($rows, $fieldsets);
            $html .= '</div>';
        }
        return $html;
    }
}

if (!function_exists('fd_render_tabs_section')) {
    function fd_render_tabs_section(array $section, array $fieldsets, $modoBotones = false): string {
        $tabs = $section['tabs'] ?? [];
        if (!$tabs || !is_array($tabs)) return '';
        $uid = 'fd_tabs_'.substr(md5(json_encode(array_keys($tabs)).microtime(true)),0,8);
        $navClass = $modoBotones ? 'nav-pills' : 'nav-tabs';
        $html = '<div class="fd-section fd-tabs-bootstrap" data-tabs="'.$uid.'">';
        // Nav tabs (ahora pueden ser nav-pills)
        $html .= '<ul class="nav '.$navClass.'" id="'.$uid.'_nav" role="tablist">';
        foreach ($tabs as $i => $tab) {
            $isActive = $i === 0;
            $paneId = $uid.'_pane_'.$i;
            $title = htmlspecialchars($tab['title'] ?? $tab['titulo'] ?? ('Tab '.($i+1)), ENT_QUOTES, 'UTF-8');
            $html .= '<li class="nav-item" role="presentation">';
            $html .= '<button class="nav-link'.($isActive?' active':'').'" id="'.$paneId.'-tab" data-bs-toggle="tab" data-bs-target="#'.$paneId.'" type="button" role="tab" aria-controls="'.$paneId.'" aria-selected="'.($isActive?'true':'false').'">'.$title.'</button>';
            $html .= '</li>';
        }
        $html .= '</ul>';
        // Tab content
        $html .= '<div class="tab-content" id="'.$uid.'_content">';
        foreach ($tabs as $i => $tab) {
            $isActive = $i === 0;
            $paneId = $uid.'_pane_'.$i;
            $rows = $tab['rows'] ?? [];
            $html .= '<div class="tab-pane fade'.($isActive?' show active':'').'" id="'.$paneId.'" role="tabpanel" aria-labelledby="'.$paneId.'-tab">';
            $html .= fd_render_rows_fallback($rows, $fieldsets);
            $html .= '</div>';
        }
        $html .= '</div>';
        $html .= '</div>';
        return $html;
    }
} else {
    // Mejora accesibilidad/IDs si ya existía (wrapper opcional)
    if (!function_exists('fd_render_tabs_section_a11y')) {
        function fd_render_tabs_section_a11y(array $section, array $fieldsets): string {
            return fd_render_tabs_section($section,$fieldsets); // Placeholder si ya declarada
        }
    }
}

// --- Renderiza el layout completo (fallback global) ---
if (!function_exists('fd_render_layout_fallback')) {
    function fd_render_layout_fallback($layout, array $fieldsets): string {
        if (!$layout || !is_array($layout)) return '';
        $sections = fd_is_assoc($layout)
            ? array_map(function($k,$v){ if(is_array($v)) $v['_section_key']=$k; return $v; }, array_keys($layout), $layout)
            : $layout;
        $html = '';
        foreach ($sections as $section) {
            if (!is_array($section)) continue;
            $sectionKey = $section['_section_key'] ?? '';
            $rows = $section['rows'] ?? [];
            $html .= '<div class="fd-section mb-4">';
            foreach ($rows as $row) {
                $columns = $row['columns'] ?? [];
                $html .= '<div class="row">';
                foreach ($columns as $col) {
                    $width = intval($col['width'] ?? 12);
                    $fsKey = $col['fieldset'] ?? null;
                    $html .= '<div class="col-md-' . $width . '">';
                    if ($fsKey && isset($fieldsets[$fsKey])) {
                        $html .= fd_render_fieldset_fallback($fsKey, $fieldsets[$fsKey]);
                    }
                    $html .= '</div>';
                }
                $html .= '</div>';
            }
            $html .= '</div>';
        }
        return $html;
    }
}
            $colCount = count($cols);
            $widths = array_map(function($col) { return isset($col['width']) || isset($col['col']); }, $cols);
            $anyWidth = in_array(true, $widths);
            $defaultW = $anyWidth ? null : ($colCount > 0 ? intdiv($autoWidth, $colCount) : 12);
            foreach ($cols as $col) {
                if (!is_array($col)) continue;
                $w = (int)($col['width'] ?? $col['col'] ?? $defaultW ?? 12);
                if ($w < 1 || $w > 12) $w = 12;
                $fieldsetKey = $col['fieldset'] ?? $col['fs'] ?? null;
                $html .= '<div class="col-md-'.$w.' fd-col"'.($fieldsetKey?' data-fs="'.$fieldsetKey.'"':'').'>';
                if ($fieldsetKey && isset($fieldsets[$fieldsetKey])) {
                        // Renderizar el fieldset completo con sus campos
                        $html .= fd_render_fieldset_fallback($fieldsetKey, $fieldsets[$fieldsetKey]);
                }
                $html .= '</div>';
            }
            $html .= '</div>';
        }
        return $html;
    }
}

if (!function_exists('fd_render_fieldset_fallback')) {
    function fd_render_fieldset_fallback(string $key, array $fieldset): string {
        $titulo = htmlspecialchars($fieldset['titulo'] ?? $key, ENT_QUOTES, 'UTF-8');
        // Buscar tanto 'fields' como 'campos' para máxima compatibilidad
        $fields = [];
        if (isset($fieldset['fields']) && is_array($fieldset['fields'])) {
            $fields = $fieldset['fields'];
        } elseif (isset($fieldset['campos']) && is_array($fieldset['campos'])) {
            $fields = $fieldset['campos'];
        }
        $html = '<fieldset class="fd-fieldset" data-fs="'.$key.'"><legend>'.$titulo.'</legend>';
        // Si existe layout, renderizar en filas y columnas
        if (isset($fieldset['layout']) && is_array($fieldset['layout'])) {
            foreach ($fieldset['layout'] as $row) {
                // Compatibilidad: aceptar tanto 'row' como 'columns'/'cols'
                $cols = [];
                if (isset($row['row']) && is_array($row['row'])) {
                    $cols = $row['row'];
                } elseif (isset($row['columns']) && is_array($row['columns'])) {
                    $cols = $row['columns'];
                } elseif (isset($row['cols']) && is_array($row['cols'])) {
                    $cols = $row['cols'];
                }
                if (!is_array($cols) || !$cols) continue;
                $html .= '<div class="row fd-row">';
                foreach ($cols as $col) {
                    $colW = (int)($col['col'] ?? $col['width'] ?? 12);
                    $campoKey = $col['campo'] ?? null;
                    $campoObj = null;
                    foreach ($fields as $f) {
                        if (isset($f['nombre']) && $f['nombre'] === $campoKey) {
                            $campoObj = $f;
                            break;
                        }
                    }
                    if ($campoObj) {
                        $html .= '<div class="col-md-'.$colW.' fd-col">'.generarCampo($campoObj, '', false).'</div>';
                    }
                }
                $html .= '</div>';
            }
        } else {
            // Render simple si no hay layout
            if (!empty($fields)) {
                foreach ($fields as $campo) {
                    if (!is_array($campo)) continue;
                    $html .= generarCampo($campo, '', false);
                }
            }
        }
        $html .= '</fieldset>';
        return $html;
    }
}
// ========================================================================
// FIN RENDER LAYOUT FALLBACK
?>


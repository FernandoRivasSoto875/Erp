// --- INTEGRACIÓN DE LIBRERÍAS ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require_once __DIR__ . '/fpdf/fpdf.php';
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// --- FUNCIÓN AUXILIAR getFieldInfo ---
if (!function_exists('getFieldInfo')) {
    function getFieldInfo($key, $all_fields) {
        foreach ($all_fields as $field) {
            if (($field['name'] ?? $field['nombre'] ?? null) === $key) {
                return $field;
            }
        }
        return [];
    }
}
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
        $html  = '<div class="fd-block mb-3 p-2 border rounded" data-block-type="fieldset-group"';
        $html .= ($groupPath ? ' data-group-items-path="'.fd_escape($groupPath).'.items"' : '');
        $html .= '>';
        $html .= '<div class="small text-muted mb-2">'.fd_escape($title).'</div>';
        $html .= '<div class="fd-group-items">';
        foreach ($items as $idx => $it) {
            if (!is_array($it)) continue;
            $type = $it['type'] ?? '';
            $html .= '<div class="fd-group-item" data-group-item-index="'.$idx.'">';
            if ($type === 'fieldset') {
                $name = (string)($it['name'] ?? '');
                if ($name !== '') $html .= generarFieldsetContenido($name, $fieldsets, $valores, $soloLectura);
            } elseif ($type === 'tabs') {
                $html .= renderTabsBlock($it, $fieldsets, $valores, $soloLectura, $groupPath === '' ? '' : $groupPath.'.items.'.$idx);
            } elseif ($type === 'group') {
                $html .= renderFieldsetGroup($it, $fieldsets, $valores, $soloLectura, $groupPath === '' ? '' : $groupPath.'.items.'.$idx);
            }
            $html .= '</div>';
        }
        $html .= '</div></div>';
        return $html;
    }
}

// Blocks
if (!function_exists('renderGenericBlock')) {
    function renderGenericBlock(array $block, array $fieldsets, array $valores = [], bool $soloLectura = false, string $basePath = ''): string {
        $type = $block['type'] ?? 'generic';
        $html = '<div class="fd-block" data-block-type="'.fd_escape($type).'">';
        $rows = $block['rows'] ?? [];
        foreach (array_values($rows) as $ri => $row) {
            $rowPath = $basePath !== '' ? $basePath.'.rows.'.$ri : '';
            $html .= '<div class="row" data-row>';
            $cols = $row['columns'] ?? [];
            foreach (array_values($cols) as $ci => $col) {
                $w = (int)($col['width'] ?? 12);
                $w = max(1, min(12, $w));
                $colPath = $rowPath !== '' ? $rowPath.'.columns.'.$ci : '';
                $html .= '<div class="col-md-'.$w.'" data-col-width="'.$w.'">';
                $html .= renderColumnContent($col, $fieldsets, $valores, $soloLectura, $colPath);
                $html .= '</div>';
            }
            $html .= '</div>';
        }
        $html .= '</div>';
        return $html;
    }
}

if (!function_exists('renderTabsBlock')) {
    function renderTabsBlock(array $tabset, array $fieldsets, array $valores = [], bool $soloLectura = false, string $tabsetPath = ''): string {
        $tabs = $tabset['tabs'] ?? [];
        $tabsPathAttr = $tabsetPath ? $tabsetPath.'.tabs' : '';
        $html = '<div class="fd-block" data-block-type="tabs" data-tabset="1"';
        $html .= ($tabsPathAttr ? ' data-json-tabs-path="'.fd_escape($tabsPathAttr).'"' : '');
        $html .= '>';
        // Nav
        $html .= '<ul class="nav nav-tabs" role="tablist">';
        foreach (array_values($tabs) as $i => $t) {
            $title  = (string)($t['title'] ?? ('Pestaña '.($i+1)));
            $paneId = 'tab_'.md5(($tabsetPath?:'root').'_'.($title).'_'.$i);
            $active = $i === 0 ? 'active' : '';
            $sel    = $i === 0 ? 'true' : 'false';
            $html .= '<li class="nav-item" data-tab-index="'.$i.'">';
            $html .= '<a id="nav_'.$paneId.'" class="nav-link '.$active.'" href="#'.$paneId.'" role="tab" aria-controls="'.$paneId.'" aria-selected="'.$sel.'" data-toggle="tab" data-bs-toggle="tab">'.fd_escape($title).'</a>';
            $html .= '</li>';
        }
        $html .= '</ul>';
        // Panes
        $html .= '<div class="tab-content">';
        foreach (array_values($tabs) as $i => $t) {
            $title  = (string)($t['title'] ?? ('Pestaña '.($i+1)));
            $paneId = 'tab_'.md5(($tabsetPath?:'root').'_'.($title).'_'.$i);
            $show   = $i === 0 ? 'show active' : '';
            $html .= '<div class="tab-pane fade '.$show.'" id="'.fd_escape($paneId).'" role="tabpanel" aria-labelledby="nav_'.$paneId.'" data-dropzone="tab-pane" data-tab-index="'.$i.'">';
            foreach (($t['rows'] ?? []) as $ri => $row) {
                $html .= '<div class="row" data-row>';
                foreach (($row['columns'] ?? []) as $ci => $col) {
                    $w = (int)($col['width'] ?? 12); $w = max(1, min(12, $w));
                    $colPath = ($tabsetPath ? $tabsetPath.'.tabs.'.$i.'.rows.'.$ri.'.columns.'.$ci : '');
                    $html .= '<div class="col-md-'.$w.'" data-col-width="'.$w.'">';
                    $html .= renderColumnContent($col, $fieldsets, $valores, $soloLectura, $colPath);
                    $html .= '</div>';
                }
                $html .= '</div>';
            }
            $html .= '</div>';
        }
        $html .= '</div></div>';
        return $html;
    }
}

// Layout
if (!function_exists('generarLayout')) {
    function generarLayout(array $layout, array $fieldsets, array $valores = [], bool $soloLectura = false): string {
        $html = '<div data-layout-container>';
        if (!empty($layout['header']) && (($layout['header']['type'] ?? '') === 'header')) {
            $html .= renderGenericBlock($layout['header'], $fieldsets, $valores, $soloLectura, 'layout.header');
        }
        if (!empty($layout['main'])) {
            $main = $layout['main'];
            if (($main['type'] ?? '') === 'tabs') $html .= renderTabsBlock($main, $fieldsets, $valores, $soloLectura, 'layout.main');
            else $html .= renderGenericBlock($main, $fieldsets, $valores, $soloLectura, 'layout.main');
        }
        if (!empty($layout['footer']) && (($layout['footer']['type'] ?? '') === 'footer')) {
            $html .= renderGenericBlock($layout['footer'], $fieldsets, $valores, $soloLectura, 'layout.footer');
        }
        $html .= '</div>';
        return $html;
    }
}

// Elementos fuera del formulario (modo diseño)
if (!function_exists('generarContenedorFueraDelFormulario')) {
    function generarContenedorFueraDelFormulario(array $elementosFuera = null, array $fieldsets = [], array $valores = [], bool $soloLectura = false): string {
        $html = '<div class="fd-out-items">';
        if (!$elementosFuera) {
            foreach (array_keys($fieldsets) as $fs) {
                $html .= '<div class="draggable-fieldset mb-2 p-2 border rounded bg-white" data-fieldset-name="'.fd_escape($fs).'" data-fieldset-title="'.fd_escape($fs).'">['.fd_escape($fs).']</div>';
            }
        } else {
            foreach ($elementosFuera as $it) {
                if (($it['type'] ?? '') === 'fieldset') {
                    $fs = (string)($it['name'] ?? '');
                    if ($fs === '') continue;
                    $html .= '<div class="draggable-fieldset mb-2 p-2 border rounded bg-white" data-fieldset-name="'.fd_escape($fs).'" data-fieldset-title="'.fd_escape($fs).'">['.fd_escape($fs).']</div>';
                } elseif (($it['type'] ?? '') === 'field') {
                    $f = (string)($it['name'] ?? '');
                    if ($f === '') continue;
                    $html .= '<div class="draggable-field mb-2 p-2 border rounded bg-white" data-field-name="'.fd_escape($f).'">'.fd_escape($f).'</div>';
                }
            }
        }
        $html .= '</div>';
        return $html;
    }
}

// -------------------- Backend: POST y AJAX --------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Contexto del host (inyectado desde formulariodinamico.php)
    $json         = $json         ?? [];
    $all_fields   = (isset($all_fields) && is_array($all_fields)) ? $all_fields : [];
    $archivo_json = $archivo_json ?? ($_GET['archivo'] ?? 'form');
    $params       = $json['parametros'] ?? [];

    $uploadsDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0755, true);

    $postData = $_POST;
    $formData = [];
    $adjuntosWarnings = [];
    $erroresValidacion = [];

    // Validaciones regex (robustas)
    foreach (($params['validaciones'] ?? []) as $campo => $regla) {
        if (!isset($postData[$campo])) continue;
        if (is_array($regla) && !empty($regla['regex'])) {
            $pattern = '/' . str_replace('/', '\/', (string)$regla['regex']) . '/u';
            if (@preg_match($pattern, '') === false) continue;
            if (!preg_match($pattern, (string)$postData[$campo])) {
                $erroresValidacion[] = $regla['mensaje'] ?? ("Valor inválido en $campo");
            }
        }
    }
    if (!empty($erroresValidacion)) {
        $_SESSION['mensaje_flash'] = "<div class='alert alert-danger'><b>Errores de validación:</b><ul><li>" . implode('</li><li>', $erroresValidacion) . "</li></ul></div>";
        header("Location: formulariodinamico.php?archivo=" . urlencode($archivo_json) . "&status=invalid");
        exit;
    }

    // Config de adjuntos
    $param_adjuntos = $params['adjuntos'] ?? [];
    $allowedMimeTypes = $param_adjuntos['tipos_permitidos'] ?? [
        'image/jpeg','image/png','image/gif','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain','application/zip','application/x-zip-compressed',
        'application/vnd.ms-powerpoint','application/octet-stream'
    ];
    $maxFileSize = (int)(($param_adjuntos['tamano_maximo_mb'] ?? 5) * 1024 * 1024);

    // Construcción de datos desde $all_fields
    $fileFieldNames = array_keys($_FILES ?? []);
    foreach ($all_fields as $field) {
        $fieldName = $field['name'] ?? null;
        $fieldType = $field['type'] ?? null;
        if (!$fieldName) continue;

        if ($fieldType === 'datatable') {
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : [];
        } elseif ($fieldType === 'file') {
            $formData[$fieldName] = [];
            if (isset($_FILES[$fieldName])) {
                $files = $_FILES[$fieldName];
                if (is_array($files['name'])) {
                    foreach ($files['name'] as $idx => $fileName) {
                        if ($files['error'][$idx] === UPLOAD_ERR_OK) {
                            $tmpName  = $files['tmp_name'][$idx];
                            $fileType = @mime_content_type($tmpName) ?: ($files['type'][$idx] ?? '');
                            $fileSize = (int)$files['size'][$idx];
                            if (!in_array($fileType, $allowedMimeTypes, true)) { $adjuntosWarnings[] = "Tipo no permitido: $fileName ($fileType)"; continue; }
                            if ($fileSize > $maxFileSize) { $adjuntosWarnings[] = "Archivo grande: $fileName"; continue; }
                            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fileName));
                            $destPath = $uploadsDir . uniqid('adj_', true) . '_' . $safeName;
                            if (is_uploaded_file($tmpName) && move_uploaded_file($tmpName, $destPath)) $formData[$fieldName][] = $destPath;
                            else $adjuntosWarnings[] = "Error guardando: $fileName";
                        } elseif ($files['error'][$idx] !== UPLOAD_ERR_NO_FILE) {
                            $adjuntosWarnings[] = "Error subiendo: $fileName (code ".$files['error'][$idx].")";
                        }
                    }
                } else {
                    if ($files['error'] === UPLOAD_ERR_OK) {
                        $tmpName  = $files['tmp_name'];
                        $fileName = $files['name'];
                        $fileType = @mime_content_type($tmpName) ?: ($files['type'] ?? '');
                        $fileSize = (int)$files['size'];
                        if (!in_array($fileType, $allowedMimeTypes, true)) { $adjuntosWarnings[] = "Tipo no permitido: $fileName ($fileType)"; }
                        elseif ($fileSize > $maxFileSize) { $adjuntosWarnings[] = "Archivo grande: $fileName"; }
                        else {
                            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fileName));
                            $destPath = $uploadsDir . uniqid('adj_', true) . '_' . $safeName;
                            if (is_uploaded_file($tmpName) && move_uploaded_file($tmpName, $destPath)) $formData[$fieldName][] = $destPath;
                            else $adjuntosWarnings[] = "Error guardando: $fileName";
                        }
                    } elseif ($files['error'] !== UPLOAD_ERR_NO_FILE) {
                        $adjuntosWarnings[] = "Error subiendo: ".$files['name']." (code ".$files['error'].")";
                    }
                }
            }
        } else {
            $formData[$fieldName] = $postData[$fieldName] ?? null;
        }
    }
    // Fallback: archivos no mapeados en $all_fields
    foreach ($fileFieldNames as $fname) {
        if (!array_key_exists($fname, $formData)) {
            $formData[$fname] = [];
            $files = $_FILES[$fname];
            if (is_array($files['name'])) {
                foreach ($files['name'] as $i => $fn) {
                    if ($files['error'][$i] === UPLOAD_ERR_OK) {
                        $tmp  = $files['tmp_name'][$i];
                        $ft   = @mime_content_type($tmp) ?: ($files['type'][$i] ?? '');
                        $fsz  = (int)$files['size'][$i];
                        if (!in_array($ft, $allowedMimeTypes, true) || $fsz > $maxFileSize) continue;
                        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fn));
                        $dest = $uploadsDir . uniqid('adj_', true) . '_' . $safe;
                        if (is_uploaded_file($tmp) && move_uploaded_file($tmp, $dest)) $formData[$fname][] = $dest;
                    }
                }
            }
        }
    }

    // Persistencia mínima para AJAX load
    $firstField = reset($all_fields);
    if ($firstField && isset($firstField['name']) && array_key_exists($firstField['name'], $formData)) {
        $id_registro = $formData[$firstField['name']];
        $sessionKey = 'form_data_' . $archivo_json . '_' . $id_registro;
        $_SESSION[$sessionKey] = $formData;
    }

    // Preparar datos para archivos y correo
    $formatosAgenerar = array_filter(array_map('trim', explode(',', $params['tipoformatoenvio'] ?? '')));
    $archivosAdjuntar = [];
    $archivosTemporales = [];
    $baseFilename = rtrim($uploadsDir, '/\\') . '/formulario_' . date('Ymd_His');
    $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario', ENT_QUOTES, 'UTF-8') . "</h1>";
    $datosParaArchivos = [];

    foreach ($formData as $key => $value) {
        $fieldInfo = getFieldInfo($key, $all_fields);
        $label = $fieldInfo['label'] ?? ucfirst($key);
        $displayValue = '';
        $valorParaArchivo = '';

        if (($fieldInfo['type'] ?? '') === 'datatable' && is_array($value)) {
            $displayValue .= "<table border='1' cellpadding='5' style='width:100%; border-collapse:collapse; margin-top:5px;'><thead><tr>";
            foreach (($fieldInfo['columns'] ?? []) as $col) { $displayValue .= "<th>" . htmlspecialchars($col['label'] ?? '', ENT_QUOTES, 'UTF-8') . "</th>"; }
            $displayValue .= "</tr></thead><tbody>";
            foreach ($value as $row) {
                $displayValue .= "<tr>";
                foreach ($row as $cell) {
                    $displayValue .= "<td>" . htmlspecialchars((string)$cell, ENT_QUOTES, 'UTF-8') . "</td>";
                }
                $displayValue .= "</tr>";
            }
            $displayValue .= "</tbody></table>";
            $valorParaArchivo = json_encode($value);
        } elseif (($fieldInfo['type'] ?? '') === 'file' && is_array($value)) {
            $displayValue = implode('<br>', array_map('htmlspecialchars', $value));
            $valorParaArchivo = implode(', ', $value);
            foreach ($value as $filePath) if (file_exists($filePath)) $archivosAdjuntar[] = $filePath;
        } else {
            $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'));
            $valorParaArchivo = is_array($value) ? implode(', ', $value) : (string)$value;
        }

        $datosParaArchivos[] = [
            'label'   => $label,
            'value'   => $valorParaArchivo,
            'type'    => $fieldInfo['type'] ?? 'text',
            'columns' => $fieldInfo['columns'] ?? []
        ];
        $cuerpoHtml .= "<h3>" . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . "</h3><div>{$displayValue}</div><hr>";
    }

    // Generación de archivos
    if (in_array('html', $formatosAgenerar, true)) {
        $path = $baseFilename . '.html';
        file_put_contents($path, $cuerpoHtml);
        $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('json', $formatosAgenerar, true)) {
        $path = $baseFilename . '.json';
        file_put_contents($path, json_encode($formData, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
        $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('csv', $formatosAgenerar, true) || in_array('cvs', $formatosAgenerar, true)) {
        $path = $baseFilename . '.csv';
        $fp = fopen($path, 'w'); fputcsv($fp, ['Campo','Valor']);
        foreach ($datosParaArchivos as $d) { fputcsv($fp, [$d['label'], $d['value']]); }
        fclose($fp); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('xml', $formatosAgenerar, true)) {
        $path = $baseFilename . '.xml';
        $xml = new SimpleXMLElement('<formulario/>');
        foreach ($datosParaArchivos as $d) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $d['label']), htmlspecialchars($d['value'])); }
        $xml->asXML($path); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('doc', $formatosAgenerar, true)) {
        $path = $baseFilename . '.doc';
        file_put_contents($path, $cuerpoHtml);
        $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('xls', $formatosAgenerar, true) || in_array('xlsx', $formatosAgenerar, true)) {
        $path = $baseFilename . '.xls';
        $xls = "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='UTF-8'></head><body>";
        $xls .= "<h3>Datos</h3><table border='1'><tr><th>Campo</th><th>Valor</th></tr>";
        foreach ($datosParaArchivos as $d) { if ($d['type'] !== 'datatable') $xls .= "<tr><td>".htmlspecialchars($d['label'], ENT_QUOTES, 'UTF-8')."</td><td>".htmlspecialchars($d['value'], ENT_QUOTES, 'UTF-8')."</td></tr>"; }
        $xls .= "</table><br/>";
        foreach ($datosParaArchivos as $d) {
            if ($d['type'] === 'datatable') {
                $xls .= "<h3>".htmlspecialchars($d['label'], ENT_QUOTES, 'UTF-8')."</h3><table border='1'>";
                $tableData = json_decode($d['value'], true) ?: [];
                $xls .= "<tr>"; foreach ($d['columns'] as $col) $xls .= "<th>".htmlspecialchars($col['label'] ?? '', ENT_QUOTES, 'UTF-8')."</th>"; $xls .= "</tr>";
                foreach ($tableData as $row) { $xls .= "<tr>"; foreach ($d['columns'] as $col) $xls .= "<td>".htmlspecialchars($row[$col['name']] ?? '', ENT_QUOTES, 'UTF-8')."</td>"; $xls .= "</tr>"; }
                $xls .= "</table><br/>";
            }
        }
        $xls .= "</body></html>";
        file_put_contents($path, $xls); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
    }
    if (in_array('pdf', $formatosAgenerar, true) && class_exists('FPDF')) {
        try {
            $path = $baseFilename . '.pdf';
            $pdf = new FPDF('P','mm','A4'); $pdf->AddPage();
            $pdf->SetFont('Arial','B',16);
            $pdf->Cell(0,10,utf8_decode($params['subject'] ?? 'Datos del Formulario'),0,1,'C'); $pdf->Ln(10);
            foreach ($datosParaArchivos as $d) {
                $pdf->SetFont('Arial','B',12);
                $pdf->Cell(50,8,utf8_decode($d['label'].':'),0,0);
                $pdf->SetFont('Arial','',12);
                if ($d['type'] === 'datatable') {
                    $pdf->Ln(10);
                    $table = json_decode($d['value'], true) ?: [];
                    $pdf->SetFont('Arial','B',10);
                    foreach ($d['columns'] as $col) { $pdf->Cell(40,7,utf8_decode($col['label'] ?? ''),1); }
                    $pdf->Ln();
                    $pdf->SetFont('Arial','',10);
                    foreach ($table as $row) {
                        foreach ($d['columns'] as $col) { $pdf->Cell(40,7,utf8_decode($row[$col['name']] ?? ''),1); }
                        $pdf->Ln();
                    }
                    $pdf->Ln(5);
                } else {
                    $pdf->MultiCell(0,8,utf8_decode((string)$d['value'])); $pdf->Ln(2);
                }
            }
            $pdf->Output('F', $path);
            $archivosAdjuntar[] = $path; $archivosTemporales[] = $path;
        } catch (\Throwable $e) { /* silencioso */ }
    }

    // Envío de correo (respeta notificaciones.enviar_correo y claves alternativas)
    $enviarCorreo = (bool)($params['notificaciones']['enviar_correo'] ?? true);
    $destinatario = $params['destinatario'] ?? ($params['mailPara'] ?? null);
    if ($enviarCorreo && $destinatario && class_exists(PHPMailer::class)) {
        try {
            $mail = new PHPMailer(true);
            if (!empty($params['smtp_host'])) {
                $mail->isSMTP();
                $mail->Host = $params['smtp_host'];
                $mail->SMTPAuth = !empty($params['smtp_user']);
                if (!empty($params['smtp_user'])) $mail->Username = $params['smtp_user'];
                if (!empty($params['smtp_pass'])) $mail->Password = $params['smtp_pass'];
                if (!empty($params['smtp_secure'])) $mail->SMTPSecure = $params['smtp_secure'];
                if (!empty($params['smtp_port'])) $mail->Port = (int)$params['smtp_port'];
            } else {
                $mail->isSendmail();
            }
            $mail->CharSet = 'UTF-8';
            $fromEmail = $params['mailDe'] ?? ($params['remitente'] ?? 'noreply@example.com');
            $fromName  = $params['from_name'] ?? ($params['titulo'] ?? 'Formulario Web');
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($destinatario);
            if (!empty($params['mailCc']))  $mail->addCC($params['mailCc']);
            if (!empty($params['mailBcc'])) $mail->addBCC($params['mailBcc']);
            if (!empty($params['mailCco'])) $mail->addBCC($params['mailCco']); // alias en tu JSON
            $mail->isHTML(true);
            $mail->Subject = $params['subject'] ?? 'Nuevo Envío de Formulario';
            $mail->Body    = $cuerpoHtml;
            foreach ($archivosAdjuntar as $rutaArchivo) if (file_exists($rutaArchivo)) $mail->addAttachment($rutaArchivo);
            $mail->send();
        } catch (Exception $e) {
            $adjuntosWarnings[] = 'No se pudo enviar el correo: ' . $e->getMessage();
        }
    }

    // Mensaje y redirección
    $param_mensajes = $params['mensajes'] ?? [
        'exito'       => 'Datos enviados correctamente.',
        'advertencia' => 'Advertencias durante el envío:',
        'error'       => 'Ocurrió un error durante el envío.'
    ];
    // ...existing code...
}
// FIN DE ARCHIVO

<?php
if (session_status() === PHP_SESSION_NONE) session_start();

if (file_exists(__DIR__ . '/vendor/autoload.php')) require __DIR__ . '/vendor/autoload.php';
if (file_exists(__DIR__ . '/fpdf/fpdf.php')) require_once __DIR__ . '/fpdf/fpdf.php';

if (file_exists(__DIR__ . '/formulariodinamicofunciones.php')) require_once __DIR__ . '/formulariodinamicofunciones.php';
if (file_exists(__DIR__ . '/funcionessql.php')) require_once __DIR__ . '/funcionessql.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Fallbacks por si faltan helpers
if (!function_exists('generarCampo')) {
    function generarCampo(array $campo, $valor, $soloLectura = false) {
        $name = htmlspecialchars($campo['nombre'] ?? 'sin_nombre', ENT_QUOTES, 'UTF-8');
        $label = htmlspecialchars($campo['etiqueta'] ?? $name, ENT_QUOTES, 'UTF-8');
        $disabled = $soloLectura ? 'disabled' : '';
        return "<div class='form-group mb-2'><label class='form-label'>{$label}</label><input type='text' name='{$name}' value='".htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8')."' class='form-control' {$disabled}></div>";
    }
}
if (!function_exists('getFieldInfo')) {
    function getFieldInfo($name, array $all_fields) {
        foreach ($all_fields as $f) if (($f['name'] ?? null) === $name) return $f;
        return ['label' => ucfirst((string)$name), 'type' => 'text', 'columns' => []];
    }
}

// -------------------- Render helpers (GET) --------------------
function renderRows($rows, $fieldsetsConfig, $valores, $soloLectura) {
    if (!is_array($rows)) $rows = [];
    $html = '';
    foreach ($rows as $row) {
        $columns = $row['columns'] ?? [];
        $html .= '<div class="row" data-row>';
        foreach ($columns as $column) {
            $width = (int)($column['width'] ?? 12);
            if ($width < 1 || $width > 12) $width = 12;
            $html .= "<div class='col-md-{$width}' data-col-width='{$width}'>";
            $fieldset = $column['fieldset'] ?? null;

            if ($fieldset) {
                if (is_array($fieldset) && isset($fieldset['rows'])) {
                    $nombre = $fieldset['name'] ?? '';
                    $html .= "<fieldset class='mb-4 p-3 border rounded fieldset-grid-avanzada'>";
                    if (!empty($nombre)) $html .= "<legend class='w-auto px-2 h6'>".htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8')."</legend>";
                    foreach (($fieldset['rows'] ?? []) as $fsRow) {
                        $html .= "<div class='row fieldset-grid-row'>";
                        foreach (($fsRow['columns'] ?? []) as $fsCol) {
                            $html .= "<div class='col fieldset-grid-col' style='min-height:48px;'>";
                            if (isset($fsCol['field'])) {
                                $campo = null;
                                foreach ($fieldsetsConfig as $fs) {
                                    foreach (($fs['campos'] ?? []) as $c) {
                                        if (($c['nombre'] ?? null) === $fsCol['field']) { $campo = $c; break 2; }
                                    }
                                }
                                if ($campo) {
                                    $valor = $valores[$campo['nombre']] ?? ($campo['valor_predeterminado'] ?? '');
                                    $html .= "<div class='draggable-field' data-type='field' data-name='".htmlspecialchars($campo['nombre'], ENT_QUOTES, 'UTF-8')."'>";
                                    $html .= generarCampo($campo, $valor, $soloLectura);
                                    $html .= "</div>";
                                } else {
                                    $html .= "<div class='alert alert-warning mb-2'>Campo '".htmlspecialchars($fsCol['field'], ENT_QUOTES, 'UTF-8')."' no encontrado.</div>";
                                }
                            } elseif (isset($fsCol['fieldset']) && is_string($fsCol['fieldset'])) {
                                $html .= generarFieldsetContenido($fsCol['fieldset'], $fieldsetsConfig, $valores, $soloLectura);
                            }
                            $html .= "</div>";
                        }
                        $html .= "</div>";
                    }
                    $html .= "</fieldset>";
                } elseif (is_string($fieldset)) {
                    $html .= generarFieldsetContenido($fieldset, $fieldsetsConfig, $valores, $soloLectura);
                }
            }

            $html .= '</div>';
        }
        $html .= '</div>';
    }
    return $html;
}

function renderTabsBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockAttrs = '') {
    $tabsId = 'tabs_'.uniqid();
    $html = "<div {$blockAttrs}>";
    $html .= '<ul class="nav nav-pills mb-3" role="tablist">';
    $tabDetails = [];
    foreach (($block['tabs'] ?? []) as $index => $tab) {
        $title = $tab['title'] ?? ('Pestaña '.($index+1));
        $id = 'tab_'.preg_replace('/[^a-zA-Z0-9_]/', '', str_replace(' ', '_', $title)).'_'.uniqid();
        $tabDetails[] = ['id'=>$id, 'title'=>$title, 'rows'=>$tab['rows'] ?? []];
        $active = $index === 0 ? 'active' : '';
        $html .= '<li class="nav-item" role="presentation">';
        $html .= '<a class="nav-link '.$active.'" id="'.$id.'-tab" data-toggle="pill" href="#'.$id.'" role="tab" aria-controls="'.$id.'" aria-selected="'.($index===0?'true':'false').'">'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</a>';
        $html .= '</li>';
    }
    $html .= '</ul>';
    $html .= '<div class="tab-content" id="'.$tabsId.'Content">';
    foreach ($tabDetails as $i => $details) {
        $activeClass = $i === 0 ? 'show active' : '';
        $html .= '<div class="tab-pane fade '.$activeClass.'" id="'.$details['id'].'" role="tabpanel" aria-labelledby="'.$details['id'].'-tab">';
        $html .= renderRows($details['rows'], $fieldsetsConfig, $valores, $soloLectura);
        $html .= '</div>';
    }
    $html .= '</div></div>';
    return $html;
}

function renderBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockName = 'generic') {
    $type = $block['type'] ?? 'generic';
    $attrs = [];
    foreach (($block['attrs'] ?? []) as $k => $v) $attrs[] = $k.'="'.htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8').'"';
    $blockAttrs = implode(' ', $attrs);
    $html = '';

    switch ($type) {
        case 'header':
            $html .= "<div class='form-block form-header-block mb-4' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
        case 'footer':
            $html .= "<div class='form-block form-footer-block mt-4' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
        case 'fieldset':
            $fieldsetName = $block['name'] ?? '';
            $html .= "<div class='form-block fieldset-block' {$blockAttrs}>";
            $html .= generarFieldsetContenido($fieldsetName, $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
        case 'tabs':
            $html .= renderTabsBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockAttrs);
            break;
        default:
            $html .= "<div class='form-block form-generic-block' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
    }
    return $html;
}

function generarFieldsetContenido($fieldsetName, $fieldsetsConfig, $valores, $soloLectura) {
    if (!is_string($fieldsetName) || $fieldsetName === '' || !isset($fieldsetsConfig[$fieldsetName])) {
        return "<div class='alert alert-warning mb-2'>Fieldset '".htmlspecialchars((string)$fieldsetName, ENT_QUOTES, 'UTF-8')."' no encontrado.</div>";
    }
    $fieldset = $fieldsetsConfig[$fieldsetName];
    $titulo = $fieldset['titulo'] ?? ucfirst(str_replace('_', ' ', $fieldsetName));
    $html = "<div class='draggable-fieldset' data-fieldset-name='".htmlspecialchars($fieldsetName, ENT_QUOTES, 'UTF-8')."'>";
    $renderizado = false;

    // Grilla interna (exclusiva)
    if (!empty($fieldset['rows']) && is_array($fieldset['rows'])) {
        $renderizado = true;
        $html .= "<fieldset class='mb-4 p-3 border rounded fieldset-grid-avanzada'>";
        if (!empty($titulo)) $html .= "<legend class='w-auto px-2 h6'>".htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8')."</legend>";
        foreach ($fieldset['rows'] as $fsRow) {
            $html .= "<div class='row fieldset-grid-row'>";
            foreach (($fsRow['columns'] ?? []) as $fsCol) {
                $html .= "<div class='col fieldset-grid-col' style='min-height:48px;'>";
                if (isset($fsCol['field'])) {
                    $campo = null;
                    foreach ($fieldsetsConfig as $fs) {
                        foreach (($fs['campos'] ?? []) as $c) {
                            if (($c['nombre'] ?? null) === $fsCol['field']) { $campo = $c; break 2; }
                        }
                    }
                    if ($campo) {
                        $valor = $valores[$campo['nombre']] ?? ($campo['valor_predeterminado'] ?? '');
                        $html .= "<div class='draggable-field' data-type='field' data-name='".htmlspecialchars($campo['nombre'], ENT_QUOTES, 'UTF-8')."'>";
                        $html .= generarCampo($campo, $valor, $soloLectura);
                        $html .= "</div>";
                    } else {
                        $html .= "<div class='alert alert-warning mb-2'>Campo '".htmlspecialchars($fsCol['field'], ENT_QUOTES, 'UTF-8')."' no encontrado.</div>";
                    }
                } elseif (isset($fsCol['fieldset']) && is_string($fsCol['fieldset'])) {
                    $html .= generarFieldsetContenido($fsCol['fieldset'], $fieldsetsConfig, $valores, $soloLectura);
                }
                $html .= "</div>";
            }
            $html .= "</div>";
        }
        $html .= "</fieldset>";
    }

    // Modo clásico (si no hubo grilla)
    if (!$renderizado && !empty($fieldset['campos']) && is_array($fieldset['campos'])) {
        $html .= "<fieldset class='mb-4 p-3 border rounded sortable-fields-container'>";
        if (!empty($titulo)) $html .= "<legend class='w-auto px-2 h6'>".htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8')."</legend>";
        foreach ($fieldset['campos'] as $campo) {
            $nombreCampo = $campo['nombre'] ?? 'sin_nombre';
            $valor = $valores[$nombreCampo] ?? ($campo['valor_predeterminado'] ?? '');
            $html .= "<div class='draggable-field' data-field-name='".htmlspecialchars($nombreCampo, ENT_QUOTES, 'UTF-8')."'>";
            $html .= generarCampo($campo, $valor, $soloLectura);
            $html .= "</div>";
        }
        $html .= "</fieldset>";
        $renderizado = true;
    }

    if (!$renderizado) {
        $html .= "<div class='alert alert-info'>Este fieldset no tiene campos definidos.</div>";
    }

    $html .= "</div>";
    return $html;
}

function generarContenedorFueraDelFormulario($elementos, $fieldsetsConfig, $valores, $soloLectura) {
    global $modoDiseno;
    if (empty($modoDiseno)) return '';
    $html = '<div id="elementos-fuera-container" class="p-3 border rounded bg-light sortable-outside-container solo-modo-diseno">';
    $html .= '<h5>Elementos Fuera del Formulario</h5>';
    if (empty($elementos)) {
        $html .= '<p class="text-muted">Arrastra aquí los campos o grupos que quieras quitar temporalmente.</p>';
    } else {
        foreach ($elementos as $item) {
            if (($item['type'] ?? '') === 'fieldset' && !empty($item['name'])) {
                $html .= generarFieldsetContenido($item['name'], $fieldsetsConfig, $valores, $soloLectura);
            } elseif (($item['type'] ?? '') === 'field' && !empty($item['name'])) {
                $fieldConfig = null;
                foreach ($fieldsetsConfig as $fs) {
                    foreach (($fs['campos'] ?? []) as $campo) {
                        if (($campo['nombre'] ?? null) === $item['name']) { $fieldConfig = $campo; break 2; }
                    }
                }
                if ($fieldConfig) {
                    $nombreCampo = $fieldConfig['nombre'];
                    $valor = $valores[$nombreCampo] ?? ($fieldConfig['valor_predeterminado'] ?? '');
                    $html .= "<div class='draggable-field' data-field-name='".htmlspecialchars($nombreCampo, ENT_QUOTES, 'UTF-8')."'>";
                    $html .= generarCampo($fieldConfig, $valor, $soloLectura);
                    $html .= "</div>";
                }
            }
        }
    }
    $html .= '</div>';
    return $html;
}

function generarLayout($layoutConfig, $fieldsetsConfig, $valores, $soloLectura) {
    $html = '';
    if (empty($layoutConfig) || !is_array($layoutConfig)) {
        // Fallback: renderizar todos los fieldsets
        $html .= '<div class="layout-container fallback-layout>';
        foreach (array_keys($fieldsetsConfig ?? []) as $fieldsetName) {
            $html .= generarFieldsetContenido($fieldsetName, $fieldsetsConfig, $valores, $soloLectura);
        }
        $html .= '</div>';
        return $html;
    }
    $html .= '<div class="layout-container" data-layout-container>';
    foreach ($layoutConfig as $blockName => $blockData) {
        $html .= renderBlock($blockData, $fieldsetsConfig, $valores, $soloLectura, $blockName);
    }
    $html .= '</div>';
    return $html;
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
                foreach (($fieldInfo['columns'] ?? []) as $col) {
                    $displayValue .= "<td>" . htmlspecialchars((string)($row[$col['name']] ?? ''), ENT_QUOTES, 'UTF-8') . "</td>";
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
    $mensajeFinal = $param_mensajes['exito'];
    if (!empty($adjuntosWarnings)) {
        $mensajeFinal .= "<br><div class='alert alert-warning mt-2'><b>" . $param_mensajes['advertencia'] . "</b><ul><li>" . implode('</li><li>', $adjuntosWarnings) . "</li></ul></div>";
    }
    $_SESSION['mensaje_flash'] = $mensajeFinal;

    // Limpieza de temporales generados (no borra uploads del usuario)
    foreach (($archivosTemporales ?? []) as $tmp) if (file_exists($tmp)) @unlink($tmp);

    $redirect = trim($params['post_envio']['redireccion'] ?? '');
    if ($redirect !== '') {
        header("Location: " . $redirect);
    } else {
        header("Location: formulariodinamico.php?archivo=" . urlencode($archivo_json) . "&status=saved");
    }
    exit;
}
// AJAX: load_data
elseif (isset($_GET['action']) && $_GET['action'] === 'load_data') {
    header('Content-Type: application/json; charset=utf-8');
    $formName = $_GET['archivo'] ?? '';
    $key = $_GET['key'] ?? '';
    if ($formName === '' || $key === '') { echo json_encode(['error'=>'Faltan parámetros']); exit; }
    $sessionKey = 'form_data_' . $formName . '_' . $key;
    if (isset($_SESSION[$sessionKey])) echo json_encode(['success'=>true,'data'=>$_SESSION[$sessionKey]]);
    else echo json_encode(['success'=>false]);
    exit;
}

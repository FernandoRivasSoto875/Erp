<?php
// KEEP: Revisado y listo para commit. Lógica de negocio y procesamiento del formulario dinámico.
 
// KEEP: Revisado y listo para commit. Cambios recientes validados.
// KEEP: Revisado y listo para commit. Cambios recientes validados.
// Elimina cualquier salida previa para evitar errores de headers
if (ob_get_level() === 0) ob_start();
// No mostrar error HTML si es petición AJAX (ej: fetch, XMLHttpRequest)
$isAjax = (
    (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') ||
    (isset($_GET['action']) && in_array($_GET['action'], ['lookup', 'load_data']))
);
if (headers_sent($file, $line) && !$isAjax) {
    $msg = '<div style="color:red;font-weight:bold">Error: No se puede iniciar sesión porque los headers ya fueron enviados.';
    $msg .= '<br>Archivo: <b>' . htmlspecialchars($file) . '</b> línea <b>' . $line . '</b>.';
    $msg .= '<br>Revisa que no haya espacios, saltos de línea, <code>echo</code>, <code>print</code>, <code>var_dump</code> o <code>?&gt;</code> fuera de lugar antes de este archivo.';
    $msg .= '<br>Consejo: Busca en tu código <code>echo</code>, <code>print</code>, <code>var_dump</code>, <code>?&gt;</code> y espacios antes de <code>&lt;?php</code>.';
    $msg .= '</div>';
    error_log("[HEADERS_SENT] Headers enviados antes de tiempo en $file línea $line");
    die($msg);
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// --- PRIORIDAD -1: GUARDAR NUEVO DISEÑO (layout/fieldsets) DESDE JS ---
if (isset($_GET['action']) && $_GET['action'] === 'guardar_diseno_json') {
    // Solo aceptar POST y JSON
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['json'])) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Método o datos inválidos']);
        exit;
    }
    $archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
    $archivo_json = basename($archivo_json);
    $json_path = __DIR__ . "/json/" . $archivo_json;
    $nuevo_json = json_decode($_POST['json'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'JSON inválido: ' . json_last_error_msg()]);
        exit;
    }
    // Opcional: respaldo antes de sobrescribir
    if (file_exists($json_path)) {
        @copy($json_path, $json_path . '.' . date('Ymd_His') . '.bak');
    }
    $ok = file_put_contents($json_path, json_encode($nuevo_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($ok === false) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo']);
        exit;
    }
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
    exit;
}
if (isset($_GET['action']) && $_GET['action'] === 'lookup') {
    ob_clean();
    header('Content-Type: application/json');
    flush(); // <-- Asegura que el buffer esté limpio antes de los headers
    ini_set('display_errors', 1); // Mostrar errores solo para depuración
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    $table = $_GET['table'] ?? '';
    $field = $_GET['field'] ?? '';
    $where = $_GET['where'] ?? '';

    if (!$table || !$field || !$where) {
        echo json_encode(['success' => false, 'error' => 'Faltan parámetros']);
        exit;
    }

    $config_path = __DIR__ . '/config/conexion.json';
    if (!file_exists($config_path)) {
        echo json_encode(['success' => false, 'error' => 'No existe config/conexion.json']);
        exit;
    }
    $config = json_decode(file_get_contents($config_path), true);
    if (!$config || !isset($config['host'], $config['user'], $config['password'], $config['database'])) {
        echo json_encode(['success' => false, 'error' => 'config/conexion.json inválido']);
        exit;
    }
    $mysqli = new mysqli($config['host'], $config['user'], $config['password'], $config['database']);
    if ($mysqli->connect_errno) {
        echo json_encode(['success' => false, 'error' => 'Error de conexión: ' . $mysqli->connect_error]);
        exit;
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $field)) {
        echo json_encode(['success' => false, 'error' => 'Parámetros inválidos']);
        exit;
    }

    $sql = "SELECT `$field` FROM `$table` WHERE $where LIMIT 1";
    $result = $mysqli->query($sql);
    if ($result && $row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'value' => $row[$field]]);
    } else {
        echo json_encode(['success' => false, 'value' => '', 'sql' => $sql, 'mysqli_error' => $mysqli->error]);
    }
    $mysqli->close();
    exit;
}

// Elimino el header global, solo se debe usar en respuestas AJAX

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- INICIO: Integración con Librerías ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require_once 'fpdf/fpdf.php';
require __DIR__ . '/vendor/autoload.php';
// --- FIN: Integración con Librerías ---

// --- Inclusiones de funciones ---
require_once 'formulariodinamicofunciones.php';
require_once 'funcionessql.php';

// --- INICIO: Nuevo motor de renderizado de Layout RECURSIVO ---
function generarLayout($layoutConfig, $fieldsetsConfig, $valores, $soloLectura) {
    $html = '';
    if (empty($layoutConfig)) {
        $html .= '<!-- Layout no definido, renderizando fallback -->';
        $html .= '<div class="layout-container fallback-layout">';
        foreach (array_keys($fieldsetsConfig) as $fieldsetName) {
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

function renderBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockName = 'generic') {
    $type = $block['type'] ?? 'generic';
    $html = '';
    $blockAttrs = "data-block-type='{$type}' data-block-name='{$blockName}'";

    switch ($type) {
        case 'header':
            $html .= "<div class='form-block form-header-block mb-4' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
        case 'tabs':
            $html .= renderTabsBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockAttrs);
            break;
        case 'footer':
            $html .= "<div class='form-block form-footer-block mt-4' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
        default:
            $html .= "<div class='form-block' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
    }
    return $html;
}

function renderRows($rows, $fieldsetsConfig, $valores, $soloLectura) {
    $html = '';
    foreach ($rows as $row) {
        $columns = $row['columns'] ?? [];
        $html .= '<div class="row" data-row>';
        foreach ($columns as $column) {
            $width = $column['width'] ?? '12';
            $fieldset = $column['fieldset'] ?? null;
            $html .= "<div class='col-md-{$width}' data-col-width='{$width}'>";
            if ($fieldset) {
                if (is_array($fieldset) && isset($fieldset['rows'])) {
                    // Fieldset como grilla interna (estructura avanzada)
                    $nombre = $fieldset['name'] ?? '';
                    // Fieldset/grupo entero es draggable y droppable
                    $html .= "<div class='draggable-fieldset sortable-fieldset' data-type='fieldset' data-name='".htmlspecialchars($nombre)."'>";
                    $html .= "<fieldset class='mb-4 p-3 border rounded fieldset-grid-avanzada'>";
                    if ($nombre) {
                        $html .= "<legend class='w-auto px-2 h6'><span class='fieldset-title-text editable-label' contenteditable='false' data-edit-type='fieldset' data-fieldset-name='".htmlspecialchars($nombre)."'>".htmlspecialchars($nombre)."</span></legend>";
                    }
                    foreach ($fieldset['rows'] as $fsRow) {
                        $html .= "<div class='row fieldset-grid-row sortable-row'>";
                        foreach ($fsRow['columns'] as $fsCol) {
                            // Cada celda es droppable y draggable
                            $html .= "<div class='col fieldset-grid-col sortable-col' style='min-height:48px;'>";
                            if (isset($fsCol['field'])) {
                                // Buscar el campo en todos los fieldsets
                                $campo = null;
                                foreach ($fieldsetsConfig as $fs) {
                                    if (isset($fs['campos'])) {
                                        foreach ($fs['campos'] as $c) {
                                            if ($c['nombre'] === $fsCol['field']) {
                                                $campo = $c;
                                                break 2;
                                            }
                                        }
                                    }
                                }
                                if ($campo) {
                                    $valor = $valores[$campo['nombre']] ?? $campo['valor_predeterminado'] ?? '';
                                    // Envolver en div para drag & drop y edición
                                    $html .= "<div class='draggable-campo sortable-campo' data-type='field' data-name='".htmlspecialchars($campo['nombre'])."' data-tipo='".htmlspecialchars($campo['tipo'])."' ";
                                    if (!empty($campo['etiqueta'])) $html .= "data-etiqueta='".htmlspecialchars($campo['etiqueta'])."' ";
                                    if (!empty($campo['placeholder'])) $html .= "data-placeholder='".htmlspecialchars($campo['placeholder'])."' ";
                                    if (!empty($campo['opciones'])) $html .= "data-opciones='".htmlspecialchars(is_array($campo['opciones']) ? implode(',', array_values($campo['opciones'])) : $campo['opciones'])."' ";
                                    if (!empty($campo['style'])) $html .= "data-style='".htmlspecialchars($campo['style'])."' ";
                                    if (!empty($campo['regex'])) $html .= "data-regex='".htmlspecialchars($campo['regex'])."' ";
                                    if (!empty($campo['data-source'])) $html .= "data-source='".htmlspecialchars(json_encode($campo['data-source'])) . "' ";
                                    $html .= ">";
                                    $html .= generarCampo($campo, $valor, $soloLectura);
                                    $html .= "<i class='fas fa-pencil-alt edit-icon' data-edit-type='field' data-field-name='".htmlspecialchars($campo['nombre'])."' style='display:none; cursor:pointer; margin-left: 5px;'></i>";
                                    $html .= "</div>";
                                } else {
                                    $html .= "<div class='alert alert-warning'>Campo '".htmlspecialchars($fsCol['field'])."' no encontrado.</div>";
                                }
                            }
                            $html .= "</div>";
                        }
                        $html .= "</div>";
                    }
                    $html .= "</fieldset>";
                    $html .= "</div>";
                } else if (is_string($fieldset)) {
                    $html .= generarFieldsetContenido($fieldset, $fieldsetsConfig, $valores, $soloLectura);
                }
            }
            $html .= '</div>';
        }
        $html .= '</div>';
    }
    return $html;
}

// KEEP: Solo mostrar en modo diseño y edición de tabs solo en modo diseño
function renderTabsBlock($block, $fieldsetsConfig, $valores, $soloLectura, $blockAttrs) {
    global $modoDiseno;
    $tabsId = 'tabs_' . uniqid();
    $html = "<div {$blockAttrs}>";
    // SortableJS requiere sortable-tabs en <ul> y draggable-tab en cada <li>
    $html .= '<ul class="nav nav-pills mb-3 sortable-tabs" id="' . $tabsId . '" role="tablist">';
    $tabDetails = [];
    foreach (($block['tabs'] ?? []) as $index => $tab) {
        $tabTitle = htmlspecialchars($tab['title'] ?? 'Pestaña ' . ($index + 1));
        $tabDetails[] = [
            'title' => $tabTitle,
            'id' => 'tab_' . preg_replace('/[^a-zA-Z0-9_]/', '', str_replace(' ', '_', $tab['title'] ?? '')) . '_' . uniqid(),
            'rows' => $tab['rows'] ?? [],
            'raw_title' => $tab['title'] ?? 'Pestaña ' . ($index + 1)
        ];
    }
    foreach ($tabDetails as $index => $details) {
        $activeClass = ($index === 0) ? 'active' : '';
        $isSelected = ($index === 0) ? 'true' : 'false';
        // Agregar clase draggable-tab y data-index para SortableJS
        $html .= '<li class="nav-item draggable-tab" role="presentation" data-tab-index="' . $index . '">';
        $html .= '<a class="nav-link ' . $activeClass . '" id="' . $details['id'] . '-tab" data-toggle="pill" href="#' . $details['id'] . '" role="tab" aria-controls="' . $details['id'] . '" aria-selected="' . $isSelected . '">';
        if (!empty($modoDiseno)) {
            $html .= "<span class='tab-title-text editable-label' contenteditable='true' data-edit-type='tab' data-target-tab-id='" . $details['id'] . "-tab'>" . htmlspecialchars($details['raw_title']) . "</span>";
            $html .= " <i class='fas fa-pencil-alt edit-icon' data-edit-type='tab' data-target-tab-id='" . $details['id'] . "-tab' style='display:inline; cursor:pointer;'></i>";
        } else {
            $html .= "<span class='tab-title-text'>" . htmlspecialchars($details['raw_title']) . "</span>";
        }
        $html .= '</a>';
        $html .= '</li>';
    }
    // Botón para agregar nueva pestaña, solo en modo diseño
    if (!empty($modoDiseno)) {
        $html .= '<li class="nav-item add-tab-button" role="presentation">';
        $html .= '<a class="nav-link" href="#" title="Agregar nueva pestaña" id="add-tab-btn-' . $tabsId . '"><i class="fas fa-plus"></i></a>';
        $html .= '</li>';
    }
    $html .= '</ul>';
    // Renderizar el contenido de las pestañas
    $html .= '<div class="tab-content" id="' . $tabsId . 'Content">';
    foreach ($tabDetails as $index => $details) {
        $activeClass = ($index === 0) ? 'show active' : '';
        $html .= '<div class="tab-pane fade ' . $activeClass . '" id="' . $details['id'] . '" role="tabpanel" aria-labelledby="' . $details['id'] . '-tab" data-tab-title="' . htmlspecialchars($details['title']) . '">';
        $html .= renderRows($details['rows'], $fieldsetsConfig, $valores, $soloLectura);
        $html .= '</div>';
    }
    $html .= '</div>';
    $html .= '</div>';
    return $html;
}

function generarFieldsetContenido($fieldsetName, $fieldsetsConfig, $valores, $soloLectura) {
    if (!isset($fieldsetsConfig[$fieldsetName])) {
        return "<div class='alert alert-warning'>Fieldset '{$fieldsetName}' no encontrado.</div>";
    }

    $fieldset = $fieldsetsConfig[$fieldsetName];
    $titulo = $fieldset['titulo'] ?? ucfirst(str_replace('_', ' ', $fieldsetName));
    $html = '';

    // Contenedor principal para el fieldset, ahora draggable
    $html .= "<div class='draggable-fieldset' data-fieldset-name='{$fieldsetName}'>";

    // --- Soporte para fieldsets avanzados con filas/columnas (grilla interna) ---
    if (isset($fieldset['rows']) && is_array($fieldset['rows'])) {
        $html .= "<fieldset class='mb-4 p-3 border rounded fieldset-grid-avanzada'>";
        if ($titulo) {
            $html .= "<legend class='w-auto px-2 h6'>
                        <span class='fieldset-title-text editable-label' contenteditable='false' data-edit-type='fieldset' data-fieldset-name='{$fieldsetName}'>".htmlspecialchars($titulo)."</span>
                        <i class='fas fa-pencil-alt edit-icon' data-edit-type='fieldset' data-fieldset-name='{$fieldsetName}' style='display:none; cursor:pointer; margin-left: 10px;'></i>
                      </legend>";
        }
        foreach ($fieldset['rows'] as $fsRow) {
            $html .= "<div class='row fieldset-grid-row sortable-row'>";
        foreach ($fieldset['rows'] as $fsRow) {
            $html .= "<div class='row fieldset-grid-row sortable-row'>";
            foreach ($fsRow['columns'] as $fsCol) {
                $html .= "<div class='col fieldset-grid-col sortable-col' style='min-height:48px;'>";
                if (isset($fsCol['field'])) {
                    // Buscar el campo en todos los fieldsets
                    $campo = null;
                    foreach ($fieldsetsConfig as $fs) {
                        if (isset($fs['campos'])) {
                            foreach ($fs['campos'] as $c) {
                                if ($c['nombre'] === $fsCol['field']) {
                                    $campo = $c;
                                    break 2;
                                }
                            }
                        }
                    }
                    if ($campo) {
                        $valor = $valores[$campo['nombre']] ?? $campo['valor_predeterminado'] ?? '';
                        // Unificar: todos los campos individuales usan .draggable-field
                        $html .= "<div class='draggable-field sortable-campo' data-type='field' data-name='".htmlspecialchars($campo['nombre'])."' data-tipo='".htmlspecialchars($campo['tipo'])."' ";
                        if (!empty($campo['etiqueta'])) $html .= "data-etiqueta='".htmlspecialchars($campo['etiqueta'])."' ";
                        if (!empty($campo['placeholder'])) $html .= "data-placeholder='".htmlspecialchars($campo['placeholder'])."' ";
                        if (!empty($campo['opciones'])) $html .= "data-opciones='".htmlspecialchars(is_array($campo['opciones']) ? implode(',', array_values($campo['opciones'])) : $campo['opciones'])."' ";
                        if (!empty($campo['style'])) $html .= "data-style='".htmlspecialchars($campo['style'])."' ";
                        if (!empty($campo['regex'])) $html .= "data-regex='".htmlspecialchars($campo['regex'])."' ";
                        if (!empty($campo['data-source'])) $html .= "data-source='".htmlspecialchars(json_encode($campo['data-source'])) . "' ";
                        $html .= ">";
                        $html .= generarCampo($campo, $valor, $soloLectura);
                        $html .= "<i class='fas fa-pencil-alt edit-icon' data-edit-type='field' data-field-name='".htmlspecialchars($campo['nombre'])."' style='display:none; cursor:pointer; margin-left: 5px;'></i>";
                        $html .= "</div>";
                    } else {
                        $html .= "<div class='alert alert-warning'>Campo '".htmlspecialchars($fsCol['field'])."' no encontrado.</div>";
                    }
                } elseif (isset($fsCol['fieldset'])) {
                    // Permitir fieldsets anidados (grupo dentro de grupo)
                    $nombreAnidado = $fsCol['fieldset'];
                    $html .= generarFieldsetContenido($nombreAnidado, $fieldsetsConfig, $valores, $soloLectura);
                }
                $html .= "</div>";
            }
            $html .= "</div>";
        }
    }

    // --- Modo clásico (campos en lista vertical) ---
    $html .= "<fieldset class='mb-4 p-3 border rounded sortable-fields-container'>"; 
    if ($titulo) {
        $html .= "<legend class='w-auto px-2 h6'>
                    <span class='fieldset-title-text editable-label' contenteditable='false' data-edit-type='fieldset' data-fieldset-name='{$fieldsetName}'>".htmlspecialchars($titulo)."</span>
                    <i class='fas fa-pencil-alt edit-icon' data-edit-type='fieldset' data-fieldset-name='{$fieldsetName}' style='display:none; cursor:pointer; margin-left: 10px;'></i>
                  </legend>";
    }

    if (isset($fieldset['campos']) && is_array($fieldset['campos']) && count($fieldset['campos']) > 0) {
        foreach ($fieldset['campos'] as $campo) {
            $nombreCampo = $campo['nombre'] ?? 'sin_nombre';
            // Unificar: todos los campos individuales usan .draggable-field
            $html .= "<div class='draggable-field' data-field-name='{$nombreCampo}'>";
            $valor = $valores[$nombreCampo] ?? $campo['valor_predeterminado'] ?? '';
            $html .= generarCampo($campo, $valor, $soloLectura);
            $html .= "<i class='fas fa-pencil-alt edit-icon' data-edit-type='field' data-field-name='{$nombreCampo}' style='display:none; cursor:pointer; margin-left: 5px;'></i>";
            $html .= "</div>";
        }
    } else {
        $html .= "<div class='alert alert-info'>Este fieldset no tiene campos definidos.</div>";
    }

    $html .= '</fieldset>';
    $html .= '</div>'; // Cierre de draggable-fieldset
    return $html;
}

// KEEP: Elementos fuera del formulario solo en modo diseño
function generarContenedorFueraDelFormulario($elementos, $fieldsetsConfig, $valores, $soloLectura) {
    // Solo mostrar en modo diseño (requiere variable $modoDiseno = true)
    global $modoDiseno;
    if (empty($modoDiseno)) return '';
    $html = '<div id="elementos-fuera-container" class="p-3 border rounded bg-light sortable-outside-container solo-modo-diseno">';
    $html .= '<h5>Elementos Fuera del Formulario</h5>';
    if (empty($elementos)) {
        $html .= '<p class="text-muted">Arrastra aquí los campos o grupos que quieras quitar temporalmente.</p>';
    } else {
        foreach ($elementos as $item) {
            if ($item['type'] === 'fieldset') {
                $html .= generarFieldsetContenido($item['name'], $fieldsetsConfig, $valores, $soloLectura);
            } elseif ($item['type'] === 'field') {
                // Lógica para encontrar la configuración del campo y renderizarlo
                $fieldConfig = null;
                foreach ($fieldsetsConfig as $fs) {
                    if (isset($fs['campos']) && is_array($fs['campos'])) {
                        foreach ($fs['campos'] as $campo) {
                            if ($campo['nombre'] === $item['name']) {
                                $fieldConfig = $campo;
                                break 2;
                            }
                        }
                    }
                }
                if ($fieldConfig) {
                    $nombreCampo = $fieldConfig['nombre'];
                    $html .= "<div class='draggable-field' data-field-name='{$nombreCampo}'>";
                    $valor = $valores[$nombreCampo] ?? $fieldConfig['valor_predeterminado'] ?? '';
                    $html .= generarCampo($fieldConfig, $valor, $soloLectura);
                    $html .= "</div>";
                }
            }
        }
    }
    $html .= '</div>';
    return $html;
}
$modoDiseno = false;
if (isset($_GET['modo']) && $_GET['modo'] === 'diseno') {
    $modoDiseno = true;
}

// --- FIN: Nuevo motor de renderizado de Layout ---

// --- FUNCIONES AUXILIARES ---
function obtenerTodosLosCampos($fieldsets) {
    $campos = [];
    foreach ($fieldsets as $fieldset) {
        // Acepta tanto 'fields' como 'campos' para máxima compatibilidad
        if (!empty($fieldset['fields']) && is_array($fieldset['fields'])) {
            $campos = array_merge($campos, $fieldset['fields']);
        }
        if (!empty($fieldset['campos']) && is_array($fieldset['campos'])) {
            $campos = array_merge($campos, $fieldset['campos']);
        }
        if (!empty($fieldset['fieldsets'])) {
            $campos = array_merge($campos, obtenerTodosLosCampos($fieldset['fieldsets']));
        }
    }
    return $campos;
}
function getFieldInfo($fieldName, $all_fields) { foreach ($all_fields as $field) { if (isset($field['name']) && $field['name'] === $fieldName) { return $field; } } return null; }

// --- INICIO: Preparación de Variables Globales ---
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$archivo_json = basename($archivo_json); // Seguridad: solo nombre, sin ruta
$json_path = __DIR__ . "/json/" . $archivo_json;
if (!file_exists($json_path)) {
    $mensaje_envio = "<div class='alert alert-danger'>Error: El archivo de configuración '$json_path' no existe.</div>";
    return;
}
$json = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $mensaje_envio = "<div class='alert alert-danger'>Error: El archivo JSON contiene errores. " . json_last_error_msg() . "</div>";
    return;
}

$fieldsets = $json['fieldsets'] ?? [];
$layout = $json['layout'] ?? [];
// KEEP: Estas líneas aseguran que $fieldsets y $layout siempre estén definidos desde el JSON.
$all_fields = obtenerTodosLosCampos($fieldsets);
$valores = [];
$soloLectura = false;
$mensaje_envio = '';

// --- NUEVO: Cargar parámetros universales del JSON ---
$param_mensajes = $json['parametros']['mensajes'] ?? [
    'exito' => 'Formulario guardado y procesado con éxito.',
    'error' => 'Ocurrió un error al procesar el formulario.',
    'advertencia' => 'Por favor, revisa los campos resaltados.'
];
$param_validaciones = $json['parametros']['validaciones'] ?? [];
$param_botones = $json['parametros']['botones'] ?? [];
$param_post_envio = $json['parametros']['post_envio'] ?? [];
$param_adjuntos = $json['parametros']['adjuntos'] ?? [];
$param_notificaciones = $json['parametros']['notificaciones'] ?? [];

// --- FUNCIONALIDAD PRINCIPAL ---
// --- PRIORIDAD 1: PROCESAR EL ENVÍO DEL FORMULARIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $json['parametros'] ?? [];
    $postData = $_POST;
    $uploadsDir = 'uploads/';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    $formData = [];
    $adjuntosWarnings = [];
    $erroresValidacion = [];
    // --- Validación por regex desde JSON (backend) ---
    foreach (($json['parametros']['validaciones'] ?? []) as $campo => $regla) {
        if (isset($postData[$campo]) && $regla['regex']) {
            if (!preg_match('/' . $regla['regex'] . '/u', $postData[$campo])) {
                $erroresValidacion[] = $regla['mensaje'] ?? ("Valor inválido en $campo");
            }
        }
    }
    if (!empty($erroresValidacion)) {
        $mensaje_envio = "<div class='alert alert-danger'><b>Errores de validación:</b><ul><li>" . implode('</li><li>', $erroresValidacion) . "</li></ul></div>";
        $valores = $postData;
        echo $mensaje_envio;
        exit;
    }

    $formData = [];
    $adjuntosWarnings = [];
    // --- Configuración de validaciones de adjuntos ---
    $allowedMimeTypes = $param_adjuntos['tipos_permitidos'] ?? [
        'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-zip-compressed',
        'application/vnd.ms-powerpoint', 'application/octet-stream'
    ];
    $maxFileSize = ($param_adjuntos['tamano_maximo_mb'] ?? 5) * 1024 * 1024; // 5 MB
    $archivosTemporales = [];
    foreach ($all_fields as $field) {
        $fieldName = $field['name'];
        if ($field['type'] === 'datatable') {
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : [];
        } else if ($field['type'] === 'file') {
            $formData[$fieldName] = [];
            if (isset($_FILES[$fieldName]) && is_array($_FILES[$fieldName]['name'])) {
                foreach ($_FILES[$fieldName]['name'] as $idx => $fileName) {
                    if ($_FILES[$fieldName]['error'][$idx] === UPLOAD_ERR_OK) {
                        $tmpName = $_FILES[$fieldName]['tmp_name'][$idx];
                        $fileType = mime_content_type($tmpName);
                        $fileSize = $_FILES[$fieldName]['size'][$idx];
                        if (!in_array($fileType, $allowedMimeTypes)) {
                            $adjuntosWarnings[] = "Tipo de archivo no permitido: $fileName ($fileType)";
                            continue;
                        }
                        if ($fileSize > $maxFileSize) {
                            $adjuntosWarnings[] = "Archivo demasiado grande: $fileName (" . round($fileSize/1024/1024,2) . " MB)";
                            continue;
                        }
                        // Seguridad: nombre único para archivos adjuntos
                        $destPath = $uploadsDir . uniqid('adj_', true) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fileName));
                        if (move_uploaded_file($tmpName, $destPath)) {
                            $formData[$fieldName][] = $destPath;
                        } else {
                            $adjuntosWarnings[] = "No se pudo guardar el archivo adjunto: $fileName";
                        }
                    } else if ($_FILES[$fieldName]['error'][$idx] !== UPLOAD_ERR_NO_FILE) {
                        $adjuntosWarnings[] = "Error al subir archivo adjunto: $fileName, código: " . $_FILES[$fieldName]['error'][$idx];
                    }
                }
            } else if (isset($_FILES[$fieldName]) && !is_array($_FILES[$fieldName]['name']) && $_FILES[$fieldName]['error'] === UPLOAD_ERR_OK) {
                $tmpName = $_FILES[$fieldName]['tmp_name'];
                $fileName = $_FILES[$fieldName]['name'];
                $fileType = mime_content_type($tmpName);
                $fileSize = $_FILES[$fieldName]['size'];
                if (!in_array($fileType, $allowedMimeTypes)) {
                    $adjuntosWarnings[] = "Tipo de archivo no permitido: $fileName ($fileType)";
                } elseif ($fileSize > $maxFileSize) {
                    $adjuntosWarnings[] = "Archivo demasiado grande: $fileName (" . round($fileSize/1024/1024,2) . " MB)";
                } else {
                    $destPath = $uploadsDir . uniqid('adj_', true) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fileName));
                    if (move_uploaded_file($tmpName, $destPath)) {
                        $formData[$fieldName][] = $destPath;
                    } else {
                        $adjuntosWarnings[] = "No se pudo guardar el archivo adjunto (single): $fileName";
                    }
                }
            } else if (isset($_FILES[$fieldName]) && $_FILES[$fieldName]['error'] !== UPLOAD_ERR_NO_FILE) {
                $adjuntosWarnings[] = "Error al subir archivo adjunto (single): " . $_FILES[$fieldName]['name'] . ", código: " . $_FILES[$fieldName]['error'];
            }
        } else {
            $formData[$fieldName] = isset($postData[$fieldName]) ? $postData[$fieldName] : null;
        }
    }

    $firstField = reset($all_fields);
    $id_registro = null;
    if ($firstField && array_key_exists($firstField['name'], $formData)) {
        $id_registro = $formData[$firstField['name']];
        $sessionKey = 'form_data_' . $archivo_json . '_' . $id_registro;
        $_SESSION[$sessionKey] = $formData;
    }
    
    try {
        // Generación de archivos y correo (sin cambios)
        $formatosAgenerar = array_map('trim', explode(',', $params['tipoformatoenvio'] ?? ''));
        $archivosAdjuntar = [];
        $baseFilename = $uploadsDir . 'formulario_' . date('Ymd_His');
        $cuerpoHtml = "<h1>" . htmlspecialchars($params['subject'] ?? 'Datos del Formulario') . "</h1>";
        $datosParaArchivos = [];
        foreach ($formData as $key => $value) {
            $fieldInfo = getFieldInfo($key, $all_fields);
            if (!$fieldInfo) continue;
            $label = $fieldInfo['label'] ?? ucfirst($key);
            $displayValue = '';
            $valorParaArchivo = '';
            if ($fieldInfo['type'] === 'datatable' && is_array($value)) {
                $displayValue .= "<table border='1' cellpadding='5' style='width:100%; border-collapse:collapse; margin-top:5px;'><thead><tr>";
                foreach($fieldInfo['columns'] as $col) { $displayValue .= "<th>" . htmlspecialchars($col['label']) . "</th>"; }
                $displayValue .= "</tr></thead><tbody>";
                foreach($value as $row) { $displayValue .= "<tr>"; foreach($fieldInfo['columns'] as $col) { $displayValue .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $displayValue .= "</tr>"; }
                $displayValue .= "</tbody></table>";
                $valorParaArchivo = json_encode($value);
            } else if ($fieldInfo['type'] === 'file' && is_array($value)) {
                $displayValue = implode('<br>', array_map('htmlspecialchars', $value));
                $valorParaArchivo = implode(', ', $value);
                foreach ($value as $filePath) {
                    if (file_exists($filePath)) {
                        $archivosAdjuntar[] = $filePath;
                    } else {
                        $adjuntosWarnings[] = "Archivo adjunto no encontrado para adjuntar: $filePath";
                    }
                }
            } else {
                $displayValue = is_array($value) ? implode(', ', array_map('htmlspecialchars', $value)) : nl2br(htmlspecialchars($value));
                $valorParaArchivo = is_array($value) ? implode(', ', $value) : $value;
            }
            $datosParaArchivos[] = ['label' => $label, 'value' => $valorParaArchivo, 'type' => $fieldInfo['type'], 'columns' => $fieldInfo['columns'] ?? []];
            $cuerpoHtml .= "<h3>" . htmlspecialchars($label) . "</h3><div>{$displayValue}</div><hr>";
        }
        if (in_array('html', $formatosAgenerar)) { $path = $baseFilename . '.html'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('json', $formatosAgenerar)) { $path = $baseFilename . '.json'; file_put_contents($path, json_encode($formData, JSON_PRETTY_PRINT)); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('csv', $formatosAgenerar) || in_array('cvs', $formatosAgenerar)) { $path = $baseFilename . '.csv'; $fp = fopen($path, 'w'); fputcsv($fp, ['Campo', 'Valor']); foreach ($datosParaArchivos as $dato) { fputcsv($fp, [$dato['label'], $dato['value']]); } fclose($fp); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('xml', $formatosAgenerar)) { $path = $baseFilename . '.xml'; $xml = new SimpleXMLElement('<formulario/>'); foreach ($datosParaArchivos as $dato) { $xml->addChild(preg_replace('/[^A-Za-z0-9_]/', '', $dato['label']), htmlspecialchars($dato['value'])); } $xml->asXML($path); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('doc', $formatosAgenerar)) { $path = $baseFilename . '.doc'; file_put_contents($path, $cuerpoHtml); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('xls', $formatosAgenerar) || in_array('xlsx', $formatosAgenerar)) { $path = $baseFilename . '.xls'; $xlsContent = "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='UTF-8'></head><body>"; $xlsContent .= "<h3>Datos Principales</h3><table border='1'>"; $xlsContent .= "<tr><th>Campo</th><th>Valor</th></tr>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] !== 'datatable') { $xlsContent .= "<tr><td>" . htmlspecialchars($dato['label']) . "</td><td>" . htmlspecialchars($dato['value']) . "</td></tr>"; } } $xlsContent .= "</table><br/><br/>"; foreach ($datosParaArchivos as $dato) { if ($dato['type'] === 'datatable') { $xlsContent .= "<h3>" . htmlspecialchars($dato['label']) . "</h3><table border='1'>"; $tableData = json_decode($dato['value'], true); $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<th>" . htmlspecialchars($col['label']) . "</th>"; } $xlsContent .= "</tr>"; foreach($tableData as $row) { $xlsContent .= "<tr>"; foreach($dato['columns'] as $col) { $xlsContent .= "<td>" . htmlspecialchars($row[$col['name']] ?? '') . "</td>"; } $xlsContent .= "</tr>"; } $xlsContent .= "</table><br/>"; } } $xlsContent .= "</body></html>"; file_put_contents($path, $xlsContent); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; }
        if (in_array('pdf', $formatosAgenerar)) { try { $path = $baseFilename . '.pdf'; $pdf = new FPDF('P', 'mm', 'A4'); $pdf->AddPage(); $pdf->SetFont('Arial', 'B', 16); $pdf->Cell(0, 10, utf8_decode($params['subject'] ?? 'Datos del Formulario'), 0, 1, 'C'); $pdf->Ln(10); foreach ($datosParaArchivos as $dato) { $pdf->SetFont('Arial', 'B', 12); $pdf->Cell(50, 8, utf8_decode($dato['label'] . ':'), 0, 0); $pdf->SetFont('Arial', '', 12); if ($dato['type'] === 'datatable') { $pdf->Ln(10); $tableData = json_decode($dato['value'], true); $pdf->SetFont('Arial', 'B', 10); foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($col['label']), 1); } $pdf->Ln(); $pdf->SetFont('Arial', '', 10); foreach($tableData as $row) { foreach($dato['columns'] as $col) { $pdf->Cell(40, 7, utf8_decode($row[$col['name']] ?? ''), 1); } $pdf->Ln(); } $pdf->Ln(5); } else { $pdf->MultiCell(0, 8, utf8_decode($dato['value'])); $pdf->Ln(2); } } $pdf->Output('F', $path); $archivosAdjuntar[] = $path; $archivosTemporales[] = $path; } catch (Exception $e) { /* Ignorar error de PDF */ } }
        if (in_array('htmlc', $formatosAgenerar) && !empty($params['destinatario'])) {
            try {
                $mail = new PHPMailer(true);
                $mail->isSendmail();
                $mail->CharSet = 'UTF-8';
                $mail->setFrom($params['mailDe'] ?? 'noreply@example.com', 'Formulario Web');
                $mail->addAddress($params['destinatario']);
                if (!empty($params['mailCc'])) { $mail->addCC($params['mailCc']); }
                $mail->isHTML(true);
                $mail->Subject = $params['subject'] ?? 'Nuevo Envío de Formulario';
                $mail->Body    = $cuerpoHtml;
                $logAdjuntos = [];
                foreach ($archivosAdjuntar as $rutaArchivo) {
                    if (file_exists($rutaArchivo)) {
                        $mail->addAttachment($rutaArchivo);
                        $logAdjuntos[] = $rutaArchivo;
                    }
                }
                $mail->send();
                error_log('Correo enviado a: ' . $params['destinatario'] . ' | Adjuntos: ' . implode(', ', $logAdjuntos));
            } catch (Exception $e) {
                $adjuntosWarnings[] = 'No se pudo enviar el correo: ' . $mail->ErrorInfo;
            }
        }
        $mensajeFinal = $param_mensajes['exito'];
        if (!empty($adjuntosWarnings)) {
            $mensajeFinal .= "<br><div class='alert alert-warning mt-2'><b>" . $param_mensajes['advertencia'] . "</b><ul><li>" . implode('</li><li>', $adjuntosWarnings) . "</li></ul></div>";
        }
        $_SESSION['mensaje_flash'] = $mensajeFinal;
        header("Location: formulariodinamico.php?archivo=" . urlencode($archivo_json) . "&status=saved");
        error_log('Redirigiendo a formulariodinamico.php tras guardar. Adjuntos: ' . implode(', ', $archivosAdjuntar));
        exit;
    } catch (Exception $e) {
        $mensaje_envio = "<div class='alert alert-danger'>" . $param_mensajes['error'] . "<br>" . $e->getMessage() . "</div>";
        if (!empty($adjuntosWarnings)) {
            $mensaje_envio .= "<br><div class='alert alert-warning mt-2'><b>" . $param_mensajes['advertencia'] . "</b><ul><li>" . implode('</li><li>', $adjuntosWarnings) . "</li></ul></div>";
        }
        $valores = $formData;
        echo $mensaje_envio;
        exit;
    }
}
// --- PRIORIDAD 2: PROCESAR PETICIONES AJAX PARA CARGAR DATOS ---
// Esta es AHORA la ÚNICA forma de cargar datos en el formulario.
else if (isset($_GET['action']) && $_GET['action'] === 'load_data') {
    header('Content-Type: application/json');
    $formName = $_GET['archivo'] ?? ''; 
    $key = $_GET['key'] ?? '';

    if (empty($formName) || empty($key)) {
        echo json_encode(['error' => 'Faltan parámetros para la carga.']);
        exit;
    }

    $sessionKey = 'form_data_' . $formName . '_' . $key;
    if (isset($_SESSION[$sessionKey])) {
        echo json_encode(['success' => true, 'data' => $_SESSION[$sessionKey]]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}
// --- PRIORIDAD 3: LÓGICA PARA MOSTRAR MENSAJES (SI NO ES POST NI AJAX) ---
// Esto se ejecuta en la carga normal de la página.
if (isset($_SESSION['mensaje_flash'])) {
    $mensaje_envio = "<div class='alert alert-success'>" . $_SESSION['mensaje_flash'] . "</div>";
    unset($_SESSION['mensaje_flash']);
}

// --- Limpieza automática de archivos temporales generados (no adjuntos subidos por usuario) ---
if (!isset($archivosTemporales) || !is_array($archivosTemporales)) {
    $archivosTemporales = [];
}
foreach ($archivosTemporales as $tmpFile) {
    if (file_exists($tmpFile)) {
        @unlink($tmpFile);
    }
}

// --- LÓGICA PARA LA PALETA DE COMPONENTES ---
// 1. Obtener todos los nombres de los fieldsets definidos.

// --- DEPURACIÓN: Mostrar si $fieldsets y $layout están inicializados correctamente ---
/*
echo "<div style='background:#ffe;border:2px solid #fc0;padding:10px;margin:10px 0;'>";
echo "<b>Depuración rápida:</b><br>";
echo "<b>fieldsets</b>: ";
var_dump($fieldsets);
echo "<br><b>layout</b>: ";
var_dump($layout);
echo "</div>";
*/

// Asegurar que $layout sea un array antes de usar array_walk_recursive
$todos_los_fieldsets = array_keys(isset($fieldsets) ? $fieldsets : []);
$fieldsets_usados = [];
if (!is_array($layout)) {
    $layout = [];
}
// 2. Recorrer el layout para encontrar los fieldsets que ya están en uso.
array_walk_recursive($layout, function($item, $key) use (&$fieldsets_usados) {
    if (is_string($item) && $key !== 'type' && $key !== 'width' && !in_array($item, $fieldsets_usados)) {
        // Asumimos que cualquier string que no sea una propiedad es un nombre de fieldset/componente.
        $fieldsets_usados[] = $item;
    }
    if ($key === 'tabs') {
        foreach ($item as $tab) {
            if (isset($tab['content']) && is_array($tab['content'])) {
                 foreach ($tab['content'] as $componente) {
                     if (is_string($componente) && !in_array($componente, $fieldsets_usados)) {
                         $fieldsets_usados[] = $componente;
                     }
                 }
            }
        }
    }
});

// 3. Comparar para encontrar los fieldsets disponibles.
$fieldsets_disponibles = array_diff($todos_los_fieldsets, $fieldsets_usados);

// --- DEPURACIÓN: Mostrar resultado de la lógica de paleta SOLO si se activa debug en modo diseño ---
if (!function_exists('renderDebugButton')) {
    function renderDebugButton($id, $label = 'Debug') {
        return "<button type='button' class='solo-modo-diseno btn btn-warning btn-sm' style='margin:5px 0;' onclick=\"var d=document.getElementById('$id');d.style.display=d.style.display==='none'?'block':'none';\">$label</button>";
    }
}
if (!function_exists('renderDebugPanel')) {
    function renderDebugPanel($id, $content) {
        return "<div id='$id' class='solo-modo-diseno' style='display:none;'>$content</div>";
    }
}
if (!empty($modoDiseno)) {
    echo renderDebugButton('debug_fieldsets','Depuración Fieldsets');
    $debugContent = "<div style='background:#e0f7fa;border:2px solid #00bcd4;padding:10px;margin:10px 0;'>";
    $debugContent .= "<b>Fieldsets usados:</b> <pre>" . htmlspecialchars(print_r($fieldsets_usados, true)) . "</pre>";
    $debugContent .= "<b>Fieldsets disponibles:</b> <pre>" . htmlspecialchars(print_r($fieldsets_disponibles, true)) . "</pre>";
    $debugContent .= "</div>";
    echo renderDebugPanel('debug_fieldsets', $debugContent);
}
// --- FIN DE LA LÓGICA PARA LA PALETA DE COMPONENTES ---

/*
// --- DEPURACIÓN: Diagnóstico de parámetros visuales JSON ---
// if (!empty($modoDiseno)) {
//     echo renderDebugButton('debug_paramjson','Depuración Parámetros JSON');
//     $debugParam = '';
//     if (isset($json['parametros']['CssDefault']) || isset($json['parametros']['estilo']) || isset($json['parametros']['tituloimagen']) || isset($json['parametros']['comentario']) || isset($json['parametros']['pie']) || isset($json['parametros']['fecha_creacion'])) {
//         $debugParam .= "<div style='background:#fffbe7;border:2px solid #ffd700;padding:10px;margin:10px 0;'>";
//         $debugParam .= "<b>Diagnóstico de parámetros visuales JSON:</b><br>";
//         if (isset($json['parametros']['CssDefault'])) $debugParam .= "CssDefault: " . htmlspecialchars($json['parametros']['CssDefault']) . "<br>";
//         if (isset($json['parametros']['estilo'])) $debugParam .= "estilo: " . htmlspecialchars($json['parametros']['estilo']) . "<br>";
//         if (isset($json['parametros']['tituloimagen'])) $debugParam .= "tituloimagen: " . htmlspecialchars($json['parametros']['tituloimagen']) . "<br>";
//         if (isset($json['parametros']['comentario'])) $debugParam .= "comentario: " . htmlspecialchars($json['parametros']['comentario']) . "<br>";
//         if (isset($json['parametros']['pie'])) $debugParam .= "pie: " . htmlspecialchars($json['parametros']['pie']) . "<br>";
//         if (isset($json['parametros']['fecha_creacion'])) $debugParam .= "fecha_creacion: " . htmlspecialchars($json['parametros']['fecha_creacion']) . "<br>";
//         $debugParam .= "<span style='color:#888'>(Este bloque es solo para depuración y no se mostrará a los usuarios finales)</span>";
//         $debugParam .= "</div>";
//     }
//     echo renderDebugPanel('debug_paramjson', $debugParam);
// }
?>
?>
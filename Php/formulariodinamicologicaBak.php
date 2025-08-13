<?php
// --- FUNCIONES AUXILIARES ---
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
                    $nombre = $fieldset['name'] ?? '';
                    $html .= "<div class='draggable-fieldset sortable-fieldset' data-type='fieldset' data-name='".htmlspecialchars($nombre)."'>";
                    $html .= "<fieldset class='mb-4 p-3 border rounded fieldset-grid-avanzada'>";
                    if ($nombre) {
                        $html .= "<legend class='w-auto px-2 h6'><span class='fieldset-title-text editable-label' contenteditable='false' data-edit-type='fieldset' data-fieldset-name='".htmlspecialchars($nombre)."'>".htmlspecialchars($nombre)."</span></legend>";
                    }
                    foreach ($fieldset['rows'] as $fsRow) {
                        $html .= "<div class='row fieldset-grid-row sortable-row'>";
                        foreach ($fsRow['columns'] as $fsCol) {
                            $html .= "<div class='col fieldset-grid-col sortable-col' style='min-height:48px;'>";
                            if (isset($fsCol['field'])) {
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
                                    $html .= "<div class='draggable-campo sortable-campo' data-type='field' data-name='".htmlspecialchars($campo['nombre'])."' data-tipo='".htmlspecialchars($campo['tipo'])."' ";
                                    if (!empty($campo['etiqueta'])) $html .= "data-etiqueta='".htmlspecialchars($campo['etiqueta'])."' ";
                                    if (!empty($campo['placeholder'])) $html .= "data-placeholder='".htmlspecialchars($campo['placeholder'])."' ";
                                    if (!empty($campo['opciones'])) $html .= "data-opciones='".htmlspecialchars(is_array($campo['opciones']) ? implode(',', array_values($campo['opciones'])) : $campo['opciones'])."' ";
                                    if (!empty($campo['style'])) $html .= "data-style='".htmlspecialchars($campo['style'])."' ";
                                    if (!empty($campo['regex'])) $html .= "data-regex='".htmlspecialchars($campo['regex'])."' ";
                                    if (!empty($campo['data-source'])) $html .= "data-source='".htmlspecialchars(json_encode($campo['data-source']))."' ";
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
        echo json_encode(['success' => false, 'error' => 'Error al decodificar JSON: ' . json_last_error_msg()]);
        exit;
    }
    // Guardar el nuevo diseño en el archivo JSON correspondiente
    if (file_put_contents($json_path, json_encode($nuevo_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false) {
        // También actualizar el archivo .php correspondiente
        $php_path = __DIR__ . "/formularios/{$archivo_json}.php";
        $contenido_php = "<?php\n\n";
        $contenido_php .= "// --- AUTO-GENERADO - NO MODIFICAR ---\n";
        $contenido_php .= "\$fieldsetsConfig = " . var_export($nuevo_json, true) . ";\n";
        $contenido_php .= "\$valores = [];\n"; // Inicializar $valores como un array vacío
        $contenido_php .= "\n";
        $contenido_php .= "include_once __DIR__ . '/layout/fieldsets.php';\n";
        $contenido_php .= "include_once __DIR__ . '/layout/fieldsets_js.php';\n";
        file_put_contents($php_path, $contenido_php);
        // Responder con éxito
        header('Content-Type: application/json');
        echo json_encode(['success' => true]);
        exit;
    } else {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Error al guardar el archivo JSON']);
        exit;
    }
}
// --- PRIORIDAD 0: CARGAR DISEÑO (layout/fieldsets) ---
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico.json';
$archivo_json = basename($archivo_json);
$json_path = __DIR__ . "/json/" . $archivo_json;
if (!file_exists($json_path)) {
    die("Archivo JSON no encontrado.");
}
$fieldsetsConfig = json_decode(file_get_contents($json_path), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error al leer el archivo JSON: " . json_last_error_msg());
}
$valores = [];
include_once __DIR__ . '/layout/fieldsets.php';
include_once __DIR__ . '/layout/fieldsets_js.php';
<?php
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
        // ...otros tipos de bloque...
        default:
            $html .= "<div class='form-block form-generic-block mb-4' {$blockAttrs}>";
            $html .= renderRows($block['rows'] ?? [], $fieldsetsConfig, $valores, $soloLectura);
            $html .= '</div>';
            break;
    }
    return $html;
}

// Puedes seguir agregando funciones auxiliares y de renderizado aquí según la lógica de tu sistema.
<?php
if (session_status() === PHP_SESSION_NONE) session_start();
// error_reporting(E_ALL); ini_set('display_errors', 1);

// 1) Parámetros de entrada
$modoDiseno  = (int)($_GET['modoDiseno'] ?? 0);
$soloLectura = (bool)($_GET['soloLectura'] ?? false);
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';

// 2) Resolver ruta del JSON (admite con o sin .json)
$archivo_base = basename($archivo_json);
if (stripos($archivo_base, '.json') === false) {
    $archivo_base .= '.json';
}
$json_path = __DIR__ . '/json/' . $archivo_base;

// 3) Cargar JSON
if (!is_file($json_path)) {
    die("<div class='alert alert-danger'>Error: No existe el archivo de configuración: " . htmlspecialchars($json_path) . "</div>");
}
$json_data_raw = file_get_contents($json_path);
$json_data = json_decode($json_data_raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("<div class='alert alert-danger'>Error en JSON: " . htmlspecialchars(json_last_error_msg()) . "</div>");
}

// 4) Preparar layout/fieldsets/valores
$titulo_formulario      = $json_data['titulo'] ?? 'Formulario Dinámico';
$descripcion_formulario = $json_data['descripcion'] ?? '';
$fieldsets              = $json_data['fieldsets'] ?? [];
$layout                 = $json_data['layout'] ?? [];
$valores                = $valores ?? []; // precarga opcional
$params                 = $json_data['parametros'] ?? [];

// Normalizar fieldsets a mapa por 'name' si vienen como lista
if (is_array($fieldsets) && array_keys($fieldsets) === range(0, count($fieldsets)-1)) {
    $byName = [];
    foreach ($fieldsets as $fs) {
        if (!empty($fs['name'])) $byName[$fs['name']] = $fs;
    }
    if (!empty($byName)) $fieldsets = $byName;
}

// 5) all_fields para backend (name/type mínimos)
$all_fields = [];
foreach ($fieldsets as $fs) {
    foreach (($fs['campos'] ?? []) as $c) {
        $name = $c['nombre'] ?? null; 
        $type = $c['tipo'] ?? null;
        if (!$name || !$type) continue;
        $all_fields[] = [
            'name'    => $name,
            'type'    => $type,
            'label'   => $c['etiqueta'] ?? $name,
            'columns' => $c['columns'] ?? [],
        ];
    }
}

// 6) Exponer $json para la lógica y ajustes de solo lectura en modo diseño
$json = $json_data;
// En modo diseño, desactivar edición (no ocultar, solo deshabilitar)
if (!empty($modoDiseno)) {
    $soloLectura = true;
}

// 7) Incluir lógica/funciones antes de cualquier salida
require_once __DIR__ . '/formulariodinamicofunciones.php';
require_once __DIR__ . '/formulariodinamicologica.php';

// A partir de aquí, salida HTML
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></title>

<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<?php
// CSS configurable
if (!empty($params['CssDefault'])) {
    echo '<link rel="stylesheet" href="css/' . htmlspecialchars($params['CssDefault']) . '">';
} else {
    echo '<link rel="stylesheet" href="css/formularariodinamico.css">';
}
?>
<style>
/* Estilos modo diseño (bordes/drag) */
body.design-mode .draggable-fieldset,
body.design-mode .draggable-field {
    cursor: move;
    border: 2px dashed #007bff !important;
    background-color: rgba(0, 123, 255, 0.05);
    transition: background-color 0.3s, border 0.3s;
    margin-bottom: 10px;
}
body.design-mode .draggable-fieldset:hover,
body.design-mode .draggable-field:hover {
    background-color: rgba(0, 123, 255, 0.1);
}
.sortable-ghost { background-color: #cce5ff; border: 2px dashed #007bff; opacity: 0.7; }
body.design-mode .tab-pane,
body.design-mode .sortable-fields-container,
body.design-mode [data-col-width],
body.design-mode #elementos-fuera-container {
    min-height: 100px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: .25rem; padding: 1rem; margin-top: 10px;
}
.design-mode-switch {
    position: fixed; bottom: 20px; right: 20px; z-index: 1050; background-color: #fff; padding: 10px; border-radius: 50px; box-shadow: 0 4px 8px rgba(0,0,0,0.15); display: flex; align-items: center;
}
.design-mode-switch .custom-control-label::before,
.design-mode-switch .custom-control-label::after { cursor: pointer; }

.paleta-componentes { border: 2px dashed #6c757d; border-radius: 8px; background: #f8f9fa; margin-bottom: 24px; }
.paleta-componentes .draggable-fieldset { background: #fff; border: 1px solid #dee2e6; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
.paleta-componentes .draggable-fieldset:hover { box-shadow: 0 4px 12px rgba(0,123,255,0.10); }
.paleta-componentes .handle { cursor: grab; color: #007bff; }

#paleta-tipos-control { border: 2px dashed #17a2b8; border-radius: 8px; background: #f8f9fa; margin-bottom: 24px; }
#paleta-tipos-control .draggable-tipo { background: #fff; border: 1px solid #dee2e6; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
#paleta-tipos-control .draggable-tipo:hover { box-shadow: 0 4px 12px rgba(23,162,184,0.10); }
#paleta-tipos-control .handle { cursor: grab; color: #17a2b8; }
</style>
</head>
<body class="<?php echo !empty($modoDiseno) ? 'design-mode' : ''; ?>">

<?php
// Paletas solo en modo diseño
$todos_los_fieldsets = array_keys(is_array($fieldsets) ? $fieldsets : []);
$fieldsets_usados = [];

// ERROR: array_walk_recursive((is_array($layout)?$layout:[]), ...) -> requiere variable por referencia
$layout_for_scan = is_array($layout) ? $layout : [];
array_walk_recursive($layout_for_scan, function ($item, $key) use (&$fieldsets_usados) {
    if (is_string($item) && $key !== 'type' && $key !== 'width' && !in_array($item, $fieldsets_usados, true)) {
        $fieldsets_usados[] = $item;
    }
});

$fieldsets_disponibles = array_diff($todos_los_fieldsets, $fieldsets_usados);
?>

<div id="paletas-modo-diseno" style="<?php echo !empty($modoDiseno) ? '' : 'display:none;'; ?> border: 2px solid #ffc107; background: #fffbe6; padding: 10px; margin-bottom: 20px;">
    <?php
        $paletaTipos = trim(generarPaletaTiposControl());
        $paletaComponentes = trim(generarPaletaComponentes($fieldsets_disponibles, $fieldsets));
        if (!empty($paletaTipos)) {
            echo '<div id="paleta-tipos-control" class="mb-3">' . $paletaTipos . '</div>';
        }
        if (!empty($paletaComponentes)) {
            echo '<div id="paleta-componentes" class="paleta-componentes">' . $paletaComponentes . '</div>';
        }
    ?>
</div>

<div class="container mt-5 mb-5">
    <div id="outside-drop-area" class="mb-3">
        <?php
        $elementos_fuera = $json_data['elementos_fuera'] ?? [];
        echo generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, $valores, $soloLectura);
        ?>
    </div>

    <div class="card">
        <div class="card-header" style="<?php echo htmlspecialchars($params['estilo'] ?? ''); ?>">
            <?php if (!empty($params['tituloimagen'])): ?>
                <img src="<?php echo htmlspecialchars($params['tituloimagen']); ?>" alt="Imagen Título" style="max-height: 80px; display:block; margin:0 auto 10px;">
            <?php endif; ?>
            <h2><?php echo htmlspecialchars($params['titulo'] ?? $titulo_formulario); ?></h2>
            <?php if (!empty($params['comentario'])): ?>
                <p class="lead"><?php echo htmlspecialchars($params['comentario']); ?></p>
            <?php endif; ?>
            <?php if (!empty($params['fecha_creacion'])): ?>
                <div style="font-size:0.9em;color:#888;">Creado: <?php echo htmlspecialchars($params['fecha_creacion']); ?></div>
            <?php endif; ?>
        </div>
        <div class="card-body">
            <?php if (!empty($mensaje_envio)) echo $mensaje_envio; ?>
            <?php if (!empty($modoDiseno)): ?>
                <div class="alert alert-info">El formulario está desactivado en modo diseño. Solo disponible para ejecución.</div>
            <?php endif; ?>
            <form id="formulariodinamico" method="POST" action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']) . '?archivo=' . urlencode($archivo_base); ?>" enctype="multipart/form-data">
                <?php
                echo generarLayout($layout, $fieldsets, $valores, $soloLectura);
                ?>
                <div class="form-footer mt-4">
                    <?php if (!empty($params['pie'])): ?>
                        <div class="mb-2 text-muted"><?php echo htmlspecialchars($params['pie']); ?></div>
                    <?php endif; ?>
                    <button type="submit" class="btn btn-primary" <?php echo !empty($modoDiseno) ? 'disabled' : ''; ?>>Guardar</button>
                    <button type="button" class="btn btn-secondary" onclick="window.history.back();">Cancelar</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="design-mode-switch">
    <button id="undoBtn" class="btn btn-secondary btn-sm mr-2" style="display: none;" title="Deshacer"><i class="fas fa-undo"></i></button>
    <button id="redoBtn" class="btn btn-secondary btn-sm mr-2" style="display: none;" title="Rehacer"><i class="fas fa-redo"></i></button>
    <div class="custom-control custom-switch">
        <input type="checkbox" class="custom-control-input" id="designModeToggle" <?php echo !empty($modoDiseno) ? 'checked' : ''; ?>>
        <label class="custom-control-label" for="designModeToggle">Modo Diseño</label>
    </div>
    <button id="saveLayoutBtn" class="btn btn-success btn-sm ml-3" style="display: none;">Guardar Diseño</button>
</div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js"></script>
<script src="js/formulariodinamico.js"></script>
<script>
window.FORM_CONFIG = { archivo_json: '<?php echo addslashes($archivo_base); ?>' };
// Toggle modo diseño en front (redirige con query)
$('#designModeToggle').on('change', function() {
    const url = new URL(window.location.href);
    url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
    window.location.href = url.toString();
});
</script>
</body>
</html>

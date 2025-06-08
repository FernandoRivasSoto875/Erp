<?php
// --- Carga y validación del archivo JSON ---
$archivoJson = $_GET['archivo'] ?? 'contactoFormulario.json'; 
$archivoJson = basename($archivoJson);
$rutaBase = __DIR__ . '/config/';
$archivoCompleto = $rutaBase . $archivoJson;

if (pathinfo($archivoCompleto, PATHINFO_EXTENSION) !== 'json') {
    echo "<p>Error: Formato de archivo inválido.</p>";
    exit;
}

if (!file_exists($archivoCompleto)) {
    echo "<p>Error: No se encontró el archivo JSON de configuración.</p>";
    exit;
}

$json = json_decode(file_get_contents($archivoCompleto), true);
if ($json === null) {
    echo "<p>Error: No se pudo decodificar el archivo JSON.</p>";
    exit;
}

$cantidadMaximaAdjuntos = $json['parametros']['cantidadMaximaAdjuntos'] ?? 0;

/**
 * Genera el contenido de un campo (inputs, textarea, select, list, checkbox, adjuntos, file, etc.)
 */
function generarContenidoCampo($campo, $atributos) {
    ob_start();
    $tipo = $campo['tipo'];
    switch ($tipo) {
        case 'radio':
            echo "<div class='radio-group' id='{$campo['nombre']}_container'>";
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<span class='radio-item' style='display:inline-block; margin-right:15px;'>";
                echo "<input type='radio' id='{$campo['nombre']}_{$opcion}' name='{$campo['nombre']}' value='{$opcion}' {$atributos}>";
                echo "<label for='{$campo['nombre']}_{$opcion}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'select':
            echo "<div id='{$campo['nombre']}_container'>";
            echo "<select id='{$campo['nombre']}' name='{$campo['nombre']}'>";
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $marca = $atributos ? " data-dynamic='true'" : "";
                echo "<option value='{$opcion}'{$marca}>$opcionTexto</option>";
            }
            echo "</select>";
            echo "</div>";
            break;
        case 'checkbox':
            echo "<div class='checkbox-group' id='{$campo['nombre']}_container'>";
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $marca = $atributos ? " data-dynamic='true' autocomplete='off'" : "";
                echo "<span class='checkbox-item' style='display:inline-block; margin-right:10px;'>";
                echo "<input type='checkbox' id='{$campo['nombre']}_{$opcion}' name='{$campo['nombre']}[]' value='{$opcion}' $marca>";
                echo "<label for='{$campo['nombre']}_{$opcion}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'textarea':
            $filas = isset($campo['filas']) ? intval($campo['filas']) : 3;
            echo "<textarea id='{$campo['nombre']}' name='{$campo['nombre']}' rows='{$filas}'></textarea>";
            break;
        case 'Adjuntos':
            if (isset($campo['adjuntos']) && is_array($campo['adjuntos'])) {
                echo "<div class='adjuntos-group'>";
                foreach ($campo['adjuntos'] as $adjunto) {
                    $adjuntoEtiqueta = htmlspecialchars($adjunto['etiqueta'], ENT_QUOTES, 'UTF-8');
                    echo "<div class='adjunto-item'>";
                    echo "<label>$adjuntoEtiqueta</label>";
                    echo "<input type='file' name='{$adjunto['nombre']}'>";
                    echo "</div>";
                }
                echo "</div>";
            }
            break;
        case 'list':
            $datalistId = $campo['nombre'] . "-list";
            echo "<input type='text' id='{$campo['nombre']}' name='{$campo['nombre']}' list='{$datalistId}' {$atributos}>";
            echo "<datalist id='{$datalistId}'>";
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<option value='{$opcionTexto}'>";
            }
            echo "</datalist>";
            break;
        case 'file':
            // Soporta multimedia: imágenes, audio, video y captura de fotos
            $accept = isset($campo['accept']) ? " accept='" . htmlspecialchars($campo['accept'], ENT_QUOTES, 'UTF-8') . "'" : "";
            $capture = isset($campo['capture']) ? " capture='" . htmlspecialchars($campo['capture'], ENT_QUOTES, 'UTF-8') . "'" : "";
            echo "<input type='file' id='{$campo['nombre']}' name='{$campo['nombre']}' {$atributos} {$accept} {$capture}>";
            break;
        default:
            $placeholder = "";
            $inputEventAttrs = "";
            if (isset($campo["textinput"]) && $campo["textinput"] === "ToolTip" &&
                isset($campo["tooltipText"]) && trim($campo["tooltipText"]) !== "") {
                $placeholder = " placeholder='" . htmlspecialchars($campo["tooltipText"], ENT_QUOTES, "UTF-8") . "'";
                $inputEventAttrs = " onmouseover='mostrarTooltip(this)' onmouseout='ocultarTooltip(this)' ";
            }
            echo "<input type='{$tipo}' id='{$campo['nombre']}' name='{$campo['nombre']}' {$atributos} {$placeholder} {$inputEventAttrs}>";
            break;
    }
    return ob_get_clean();
}

/**
 * Genera el HTML para un campo, considerando la posición de la etiqueta.
 */
function generarCampo($campo, $cantidadMaximaAdjuntos) {
    if (isset($campo['activo']) && !$campo['activo']) return;
    if ($campo['tipo'] === 'Adjuntos' && $cantidadMaximaAdjuntos === 0) return;
    $admTodos = isset($campo['administraciondinamicatodosloselementos']) && $campo['administraciondinamicatodosloselementos'] === true;
    $estiloCampo = isset($campo['estilo']) ? " style='" . htmlspecialchars($campo['estilo'], ENT_QUOTES, 'UTF-8') . "'" : "";
    $etiqueta = htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8');
    $labelEventAttrs = "";
    if (!empty($campo["tooltipTextEtiqueta"])) {
        $labelEventAttrs = " onmouseover='mostrarTooltipEtiqueta(this)' onmouseout='ocultarTooltipEtiqueta(this)' ";
    }
    $atributos = $admTodos ? " data-dynamic='true' autocomplete='off'" : "";
    $contenidoCampo = generarContenidoCampo($campo, $atributos);
    $crudButton = ""; // Aquí se podría incorporar un botón CRUD si se necesitara.
    $posicionEtiqueta = isset($campo['posicionetiqueta']) ? strtolower(trim($campo['posicionetiqueta'])) : "arriba";
    
    ob_start();
    echo "<div class='campo-container' data-label='{$etiqueta}' {$estiloCampo}>";
    switch ($posicionEtiqueta) {
        case "arriba":
            echo "<div class='campo-table'>";
            echo "<div class='label-cell'><label for='{$campo['nombre']}' {$labelEventAttrs}>{$etiqueta}</label></div>";
            echo "<div class='input-cell'>";
            if ($crudButton !== "") {
                echo "<div style='display:flex; align-items:center;'>";
                echo "<div style='flex:1;'>{$contenidoCampo}</div>";
                echo "<div>{$crudButton}</div>";
                echo "</div>";
            } else {
                echo $contenidoCampo;
            }
            echo "</div></div>";
            break;
        case "abajo":
            echo "<div class='campo-table'>";
            echo "<div class='input-cell'>";
            if ($crudButton !== "") {
                echo "<div style='display:flex; align-items:center;'>";
                echo "<div style='flex:1;'>{$contenidoCampo}</div>";
                echo "<div>{$crudButton}</div>";
                echo "</div>";
            } else {
                echo $contenidoCampo;
            }
            echo "</div>";
            echo "<div class='label-cell'><label for='{$campo['nombre']}' {$labelEventAttrs}>{$etiqueta}</label></div>";
            echo "</div>";
            break;
        case "izquierdo":
            echo "<div style='display:flex; align-items:center;'>";
            echo "<div class='label-campo' style='margin-right:10px;'><label for='{$campo['nombre']}' {$labelEventAttrs}>{$etiqueta}</label></div>";
            echo "<div class='input-campo' style='display:flex; align-items:center;'>";
            echo "<div style='flex:1;'>{$contenidoCampo}</div>";
            echo ($crudButton !== "" ? $crudButton : "");
            echo "</div></div>";
            break;
        case "derecho":
            echo "<div style='display:flex; align-items:center;'>";
            echo "<div class='input-campo' style='display:flex; align-items:center;'>";
            echo "<div style='flex:1;'>{$contenidoCampo}</div>";
            echo ($crudButton !== "" ? $crudButton : "");
            echo "</div>";
            echo "<div class='label-campo' style='margin-left:10px;'><label for='{$campo['nombre']}' {$labelEventAttrs}>{$etiqueta}</label></div>";
            echo "</div>";
            break;
        case "ninguno":
            echo "<div class='input-campo' style='display:flex; align-items:center;'>";
            echo "<div style='flex:1;'>{$contenidoCampo}</div>";
            echo ($crudButton !== "" ? $crudButton : "");
            echo "</div>";
            break;
        default:
            echo "<div class='campo-table'>";
            echo "<div class='label-cell'><label for='{$campo['nombre']}' {$labelEventAttrs}>{$etiqueta}</label></div>";
            echo "<div class='input-cell'>";
            if ($crudButton !== "") {
                echo "<div style='display:flex; align-items:center;'>";
                echo "<div style='flex:1;'>{$contenidoCampo}</div>";
                echo "<div>{$crudButton}</div>";
                echo "</div>";
            } else {
                echo $contenidoCampo;
            }
            echo "</div></div>";
            break;
    }
    echo "</div>";
    echo "<span class='mensaje-error'></span>";
    echo ob_get_clean();
}

/**
 * Función recursiva para generar grupos y subgrupos, considerando "grupoAlineacion" y "alineacion".
 */
function generarGruposRecursivos($grupos, $cantidadMaximaAdjuntos) {
    foreach ($grupos as $grupo) {
        if (isset($grupo['activo']) && !$grupo['activo']) continue;
        
        $grupoNombre = isset($grupo['grupoNombre'])
            ? htmlspecialchars($grupo['grupoNombre'], ENT_QUOTES, 'UTF-8')
            : 'Grupo';
        $estiloGrupo = isset($grupo['estilo']) ? $grupo['estilo'] : "";
        
        // Determinar grupoAlineacion: "columna" o "fila" (por defecto "fila")
        $grupoAlineacion = isset($grupo['grupoAlineacion']) ? strtolower(trim($grupo['grupoAlineacion'])) : "fila";
        $classGrupoAlineacion = ($grupoAlineacion === "columna") ? " grupo-columna" : " grupo-fila";
        
        // Organización interna de los campos según "alineacion": "fila" o "columna" (por defecto "columna")
        $alineacion = isset($grupo['alineacion']) ? strtolower(trim($grupo['alineacion'])) : "columna";
        $grupoFlexClass = ($alineacion === "fila") ? "grupo-campos-fila" : "grupo-campos-columna";
        
        echo "<fieldset class='grupo-campos{$classGrupoAlineacion}' style='{$estiloGrupo}'>";
        echo "<legend>{$grupoNombre}</legend>";
        echo "<div class='grupo-campos-container {$grupoFlexClass}'>";
        if (isset($grupo['campos']) && is_array($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                generarCampo($campo, $cantidadMaximaAdjuntos);
                // Si un campo tiene hijos, procesarlos recursivamente
                if (isset($campo['hijos']) && is_array($campo['hijos'])) {
                    echo "<div class='subcampos'>";
                    generarGruposRecursivos($campo['hijos'], $cantidadMaximaAdjuntos);
                    echo "</div>";
                }
            }
        }
        echo "</div>";
        // Procesar subgrupos del grupo actual
        if (isset($grupo['hijos']) && is_array($grupo['hijos'])) {
            generarGruposRecursivos($grupo['hijos'], $cantidadMaximaAdjuntos);
        }
        echo "</fieldset>";
    }
}

/**
 * Función para generar el formulario completo.
 */
function generarFormulario($json) {
    global $cantidadMaximaAdjuntos;
    echo "<div class='formulario-dinamico'>";
    generarGruposRecursivos($json['grupos'], $cantidadMaximaAdjuntos);
    echo "</div>";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?></title>
  <link rel="stylesheet" href="css/formulariodinamico.css">
</head>
<body>
<main>
  <div class="form-header">
    <h2><?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?></h2>
    <?php if (!empty($json['parametros']['tituloimagen'])): ?>
      <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen'], ENT_QUOTES, 'UTF-8'); ?>" alt="Título Imagen">
    <?php endif; ?>
  </div>
  <p><?php echo htmlspecialchars($json['parametros']['comentario'], ENT_QUOTES, 'UTF-8'); ?></p>
  <form id="formulario" method="POST" enctype="multipart/form-data">
    <?php generarFormulario($json); ?>
    <div class="submit-container">
      <button type="submit">Enviar</button>
    </div>
  </form>
  <footer>
    <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
  </footer>
</main>

<!-- Modal CRUD -->
<div id="crud-modal" style="display: none;" role="dialog" aria-modal="true">
  <h3 id="crud-modal-title"></h3>
  <input type="text" id="modal-add-input" placeholder="" autocomplete="off">
  <button type="button" id="modal-add-button" onclick="agregarModal()">Agregar</button>
  <ul id="crud-list"></ul>
  <button type="button" onclick="cerrarCrudModal()">Cerrar</button>
</div>

<script src="js/formulariodinamico.js"></script>
</body>
</html>

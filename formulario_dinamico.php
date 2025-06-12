 <?php
// Autor: Fernando Rivas S.
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulario_dinamico.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'funcionessql.php';
$conn = conexionBd();

// Lógica para recibir el nombre del archivo JSON por parámetro
if (!isset($_GET['archivo']) || !preg_match('/^[a-zA-Z0-9_\-]+\.json$/', $_GET['archivo'])) {
    echo "<div style='color:red;text-align:center;font-weight:bold;'>No existe nombre de formulario.</div>";
    return;
}
$nombre_archivo = $_GET['archivo'];
$json_file = __DIR__ . '/json/' . $nombre_archivo;
if (!file_exists($json_file)) {
    echo "<div style='color:red;text-align:center;font-weight:bold;'>El archivo $nombre_archivo no existe.</div>";
    return;
}

$json = json_decode(file_get_contents($json_file), true);

if (!$json) {
    echo "<div style='color:red'>Error: El archivo JSON no es válido o está vacío.</div>";
    return;
}
if (!isset($json['grupos']) || !is_array($json['grupos'])) {
    echo "<div style='color:red'>Error: El archivo JSON no contiene grupos de campos.</div>";
    return;
}


// Función para obtener datos dinámicos desde la BD (propiedad "data")
 
 
function obtenerDatosTabla($data) {
    global $conn;
    $tabla  = $data['tabla'];
    $campo  = $data['campo'];
    $filtro = isset($data['filtro']) ? "WHERE " . $data['filtro'] : "";
    $consulta = "SELECT $campo FROM $tabla $filtro";
    $stmt = $conn->prepare($consulta);
    if ($stmt === false) {
        echo "<div style='color:red'>Error preparando consulta: $consulta<br>{$conn->error}</div>";
        return [];
    }
    $stmt->execute();

    // Detecta si hay una o dos columnas
    $campos = array_map('trim', explode(',', $campo));
    $result = [];
    if (count($campos) == 2) {
        $stmt->bind_result($id, $nombre);
        while ($stmt->fetch()) {
            $result[] = ['id' => $id, 'nombre' => $nombre];
        }
    } else {
        $stmt->bind_result($valor);
        while ($stmt->fetch()) {
            $result[] = $valor;
        }
    }
    $stmt->close();
    return $result;
}

// Función para generar el contenido de un campo (según su tipo)
function generarContenidoCampo($campo) {
    ob_start();
    $tipo = $campo['tipo'];
    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }
    $marcaCrud = (isset($campo['crud']) && $campo['crud'] === true) ? " data-dynamic='true'" : "";
    switch ($tipo) {
        case 'radio':
            echo "<div class='radio-group' id='{$campo['nombre']}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<span class='radio-item' style='margin-right:15px;'>";
                echo "<input type='radio' id='{$campo['nombre']}_{$opcionTexto}' name='{$campo['nombre']}' value='{$opcionTexto}'{$marcaCrud}> ";
                echo "<label for='{$campo['nombre']}_{$opcionTexto}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'checkbox':
            echo "<div class='checkbox-group' id='{$campo['nombre']}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<span class='checkbox-item' style='margin-right:10px;'>";
                echo "<input type='checkbox' id='{$campo['nombre']}_{$opcionTexto}' name='{$campo['nombre']}[]' value='{$opcionTexto}'{$marcaCrud}> ";
                echo "<label for='{$campo['nombre']}_{$opcionTexto}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'select':
            echo "<select name='{$campo['nombre']}' id='{$campo['nombre']}'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<option value='{$opcionTexto}'{$marcaCrud}>$opcionTexto</option>";
            }
            echo "</select>";
            break;


case 'selectdata':
    echo "<select name='{$campo['nombre']}' id='{$campo['nombre']}'{$marcaCrud}>";
    echo "<option value=''>Seleccione...</option>";
    foreach ($opciones as $opcion) {
        // Si $opcion es un array (id, nombre), usa $opcion['id'] y $opcion['nombre']
        if (is_array($opcion)) {
            $valor = htmlspecialchars($opcion['id'], ENT_QUOTES, 'UTF-8');
            $texto = htmlspecialchars($opcion['nombre'], ENT_QUOTES, 'UTF-8');
        } else {
            $valor = $texto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
        }
        echo "<option value='{$valor}'>{$texto}</option>";
    }
    echo "</select>";
    break;

 
        case 'list':
            $datalistId = $campo['nombre'] . "-list";
            echo "<input type='text' name='{$campo['nombre']}' id='{$campo['nombre']}' placeholder='" . ($campo['placeholder'] ?? '') . "' list='{$datalistId}'>";
            echo "<datalist id='{$datalistId}'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<option value='{$opcionTexto}'{$marcaCrud}>";
            }
            echo "</datalist>";
            break;
        case 'datable':
            echo "<div class='datable' id='{$campo['nombre']}_datable' style='width:100%; border:1px solid #ccc; padding:10px;'>";
            echo "<!-- Aquí se renderizarán los datos en forma tabular -->";
            echo "</div>";
            break;
        case 'file':
            $accept = isset($campo['accept']) ? " accept='" . htmlspecialchars($campo['accept'], ENT_QUOTES, 'UTF-8') . "'" : "";
            $capture = isset($campo['capture']) ? " capture='" . htmlspecialchars($campo['capture'], ENT_QUOTES, 'UTF-8') . "'" : "";
            echo "<input type='file' name='{$campo['nombre']}' id='{$campo['nombre']}' {$accept} {$capture}>";
            break;
        default:
            $placeholder = isset($campo["placeholder"]) ? " placeholder='" . htmlspecialchars($campo["placeholder"], ENT_QUOTES, "UTF-8") . "'" : "";
            echo "<input type='{$tipo}' name='{$campo['nombre']}' id='{$campo['nombre']}' {$placeholder}>";
            break;
    }
    return ob_get_clean();
}
 

function generarCampo($campo) {
    if (isset($campo['activo']) && !$campo['activo']) return "";
    $estiloCampo = isset($campo['estilo']) ? " style='" . htmlspecialchars($campo['estilo'], ENT_QUOTES, 'UTF-8') . "'" : "";
    $etiqueta = htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8');
    $condicion = "";
    if (isset($campo["condicion"]) && is_array($campo["condicion"])) {
        $condicion = " data-condicion='" . json_encode($campo["condicion"]) . "'";
    }
    $posicion = isset($campo['posicionetiqueta']) ? strtolower($campo['posicionetiqueta']) : 'arriba';
    $html  = "<div class='campo-container' {$estiloCampo} {$condicion}>";

    switch ($posicion) {
        case 'izquierdo':
            $html .= "<label for='{$campo['nombre']}' style='display:inline-block; min-width:120px; vertical-align:top;'>{$etiqueta}</label>";
            $html .= generarContenidoCampo($campo);
            break;
        case 'derecho':
            $html .= generarContenidoCampo($campo);
            $html .= "<label for='{$campo['nombre']}' style='display:inline-block; min-width:120px; vertical-align:top; margin-left:10px;'>{$etiqueta}</label>";
            break;
        case 'arriba.izquierdo':
            $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= "<div style='text-align:left;'>";
            $html .= generarContenidoCampo($campo);
            $html .= "</div>";
            break;
        case 'arriba.derecho':
            $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= "<div style='text-align:right;'>";
            $html .= generarContenidoCampo($campo);
            $html .= "</div>";
            break;
        case 'arriba.centro':
            $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= "<div style='text-align:center;'>";
            $html .= generarContenidoCampo($campo);
            $html .= "</div>";
            break;
        case 'arriba':
        default:
            $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= generarContenidoCampo($campo);
            break;
    }
    $html .= "<span class='mensaje-error'></span>";
    $html .= "</div>";
    return $html;
}

 

// Función recursiva para renderizar grupos y subgrupos del formulario
function generarGruposRecursivos($grupos) {
    $html = "";
    foreach ($grupos as $grupo) {
        if (isset($grupo['activo']) && !$grupo['activo']) continue;
        $grupoNombre = isset($grupo['grupoNombre']) ? htmlspecialchars($grupo['grupoNombre'], ENT_QUOTES, 'UTF-8') : "Grupo";
        $estiloGrupo = isset($grupo['estilo']) ? $grupo['estilo'] : "";
        $html .= "<fieldset style='{$estiloGrupo}'><legend>{$grupoNombre}</legend>";
        if (isset($grupo['campos']) && is_array($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $html .= generarCampo($campo);
            }
        }
        if (isset($grupo['hijos']) && is_array($grupo['hijos'])) {
            $html .= generarGruposRecursivos($grupo['hijos']);
        }
        $html .= "</fieldset>";
    }
    return $html;
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
    <header class="form-header">
      <h2><?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?></h2>
      <?php if (!empty($json['parametros']['tituloimagen'])): ?>
        <img src="<?php echo htmlspecialchars($json['parametros']['tituloimagen'], ENT_QUOTES, 'UTF-8'); ?>" alt="Título Imagen">
      <?php endif; ?>
    </header>
    <p><?php echo htmlspecialchars($json['parametros']['comentario'], ENT_QUOTES, 'UTF-8'); ?></p>
    <form id="formulario" method="POST" enctype="multipart/form-data">
      <?php echo generarGruposRecursivos($json['grupos']); ?>
      <div class="submit-container">
        <button type="submit">Enviar</button>
      </div>
    </form>
    <footer>
      <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
    </footer>
  </main>
  <script src="js/formulariodinamico.js"></script>
</body>
</html>
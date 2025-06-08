<?php
// Habilitar la visualización de errores en desarrollo.
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Se asume que tienes un archivo de conexión llamado "funcionesssql.php"
require 'funcionesssql.php';
$conn = conexionBd();

// ---------------------------------------------------------------
// Bloque para actualizar el JSON (Editor de JSON integrado)
// ---------------------------------------------------------------
$json_file = 'json/contactoFormulario.json';
$json_error = "";
$json_success = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['json_data'])) {
    $json_new = $_POST['json_data'];
    // Validar que el contenido es un JSON válido.
    if (json_decode($json_new) === null) {
        $json_error = "El formato JSON es inválido. Ningún cambio fue guardado.";
    } else {
        if (file_put_contents($json_file, $json_new) !== false) {
            $json_success = "El archivo JSON se ha guardado correctamente.";
        } else {
            $json_error = "Error al guardar el archivo JSON.";
        }
    }
}

// ---------------------------------------------------------------
// Función para obtener datos dinámicos desde la BD (propiedad "data")
function obtenerDatosTabla($data) {
    global $conn;
    $tabla  = $data['tabla'];
    $campo  = $data['campo'];
    $filtro = isset($data['filtro']) ? "WHERE " . $data['filtro'] : "";
    $consulta = "SELECT $campo FROM $tabla $filtro";
    $stmt = $conn->prepare($consulta);
    if ($stmt->execute()) {
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    return [];
}

// ---------------------------------------------------------------
// Función para generar el contenido de un campo (según su tipo)
// Soporta: radio, checkbox, select, list, datable, file y otros inputs.
function generarContenidoCampo($campo) {
    ob_start();
    $tipo = $campo['tipo'];
    
    // Se le da prioridad a "data" (opciones dinámicas), sino se evalúa "opciones" (estáticas)
    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }
    // Marca para activar funcionalidad CRUD (se agrega data-dynamic="true")
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
            // Se deja un placeholder para el componente de tabla dinámica.
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

// ---------------------------------------------------------------
// Función para renderizar un campo completo (incluye label, input y mensaje de error)
// ---------------------------------------------------------------
function generarCampo($campo) {
    if (isset($campo['activo']) && !$campo['activo']) return "";
    $estiloCampo = isset($campo['estilo']) ? " style='" . htmlspecialchars($campo['estilo'], ENT_QUOTES, 'UTF-8') . "'" : "";
    $etiqueta = htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8');
    $condicion = "";
    if (isset($campo["condicion"]) && is_array($campo["condicion"])) {
        $condicion = " data-condicion='" . json_encode($campo["condicion"]) . "'";
    }
    $html  = "<div class='campo-container' {$estiloCampo} {$condicion}>";
    $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label>";
    $html .= generarContenidoCampo($campo);
    $html .= "<span class='mensaje-error'></span>";
    $html .= "</div>";
    return $html;
}

// ---------------------------------------------------------------
// Función recursiva para renderizar grupos y subgrupos del formulario
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Leer el archivo JSON de configuración
$json = json_decode(file_get_contents($json_file), true);
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
    
    <!-- Editor de JSON integrado para actualizar la configuración -->
    <button id="toggle-json-editor" style="margin-top:20px;">Editar JSON</button>
    <div id="json-editor-container" style="display:none; margin-top:20px;">
      <form method="post" action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>">
        <textarea id="json-editor" name="json_data" rows="20" style="width:100%;"><?php echo htmlspecialchars(file_get_contents($json_file), ENT_QUOTES, 'UTF-8'); ?></textarea>
        <br>
        <button type="submit">Guardar JSON</button>
      </form>
      <?php if ($json_error !== ""): ?>
        <p style="color:red;"><?php echo $json_error; ?></p>
      <?php endif; ?>
      <?php if ($json_success !== ""): ?>
        <p style="color:green;"><?php echo $json_success; ?></p>
      <?php endif; ?>
    </div>
    
    <footer>
      <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
    </footer>
  </main>
  
  <!-- Modal CRUD para campos con "crud": true -->
  <div id="crud-modal" style="display: none;" role="dialog" aria-modal="true">
    <h3 id="crud-modal-title"></h3>
    <input type="text" id="modal-add-input" placeholder="" autocomplete="off">
    <button type="button" id="modal-add-button" onclick="agregarModal()">Agregar</button>
    <ul id="crud-list"></ul>
    <button type="button" onclick="cerrarCrudModal()">Cerrar</button>
  </div>
  
  <script src="js/formulariodinamico.js"></script>
  <script>
    // Lógica para mostrar/ocultar el editor JSON
    document.getElementById('toggle-json-editor').addEventListener('click', function(){
      var container = document.getElementById('json-editor-container');
      if(container.style.display === 'none' || container.style.display === ''){
          container.style.display = 'block';
          this.textContent = 'Ocultar Editor JSON';
      } else {
          container.style.display = 'none';
          this.textContent = 'Editar JSON';
      }
    });
  </script>
</body>
</html>

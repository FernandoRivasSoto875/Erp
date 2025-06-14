 <?php
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Autor: Fernando Rivas S.

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'funcionessql.php';
require_once __DIR__ . '/vendor/autoload.php'; // mPDF autoload
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

// Obtener la fecha de creación del archivo JSON
$fecha_creacion = isset($json['parametros']['fecha_creacion']) ? $json['parametros']['fecha_creacion'] : 'Fecha desconocida';

// Leer el CSS del formulario
$css = file_exists(__DIR__ . '/css/formulariodinamico.css') ? file_get_contents(__DIR__ . '/css/formulariodinamico.css') : '';

function generarCampo($campo, $valores = [], $soloLectura = false) {
    $estiloCampo = isset($campo['estilo']) ? " style='" . htmlspecialchars($campo['estilo'], ENT_QUOTES, 'UTF-8') . "'" : "";
    $etiqueta = isset($campo['etiqueta']) ? htmlspecialchars($campo['etiqueta'], ENT_QUOTES, 'UTF-8') : '';
    $posicion = isset($campo['posicionetiqueta']) ? strtolower($campo['posicionetiqueta']) : 'arriba';

    $clasePosicion = '';
    $alinearDiv = '';
    switch ($posicion) {
        case 'izquierdo':
            $clasePosicion = 'label-izquierdo';
            break;
        case 'derecho':
            $clasePosicion = 'label-derecho';
            break;
        case 'arriba.izquierdo':
        case 'abajo.izquierdo':
            $alinearDiv = 'alinear-izquierdo';
            break;
        case 'arriba.derecho':
        case 'abajo.derecho':
            $alinearDiv = 'alinear-derecho';
            break;
        case 'arriba.centro':
        case 'abajo.centro':
            $alinearDiv = 'alinear-centro';
            break;
    }

    $nombreCampo = isset($campo['nombre']) ? $campo['nombre'] : '';
    $valor = isset($valores[$nombreCampo]) ? $valores[$nombreCampo] : '';
    if (is_array($valor)) $valor = implode(', ', $valor);

    $html  = "<div class='campo-container $clasePosicion'{$estiloCampo}>";
    switch ($posicion) {
        case 'izquierdo':
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
        case 'derecho':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label>";
            break;
        case 'arriba.izquierdo':
        case 'arriba.derecho':
        case 'arriba.centro':
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label><br>";
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            $html .= "</div>";
            break;
        case 'abajo':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$nombreCampo}'>{$etiqueta}</label>";
            break;
        case 'abajo.izquierdo':
        case 'abajo.derecho':
        case 'abajo.centro':
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$nombreCampo}'>{$etiqueta}</label>";
            $html .= "</div>";
            break;
        case 'oculto':
        case 'none':
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
        case 'arriba':
        default:
            if ($etiqueta !== '') $html .= "<label for='{$nombreCampo}'>{$etiqueta}</label><br>";
            $html .= generarContenidoCampo($campo, $valor, $soloLectura);
            break;
    }
    $html .= "<span class='mensaje-error'></span>";
    $html .= "</div>";
    return $html;
}

function generarContenidoCampo($campo, $valor = '', $soloLectura = false) {
    $tipo = isset($campo['tipo']) ? $campo['tipo'] : 'text';
    $nombre = isset($campo['nombre']) ? $campo['nombre'] : '';
    $readonly = $soloLectura ? " readonly" : "";
    $disabled = $soloLectura ? " disabled" : "";
    $dataFormato = isset($campo['formato']) ? " data-formato='" . htmlspecialchars($campo['formato'], ENT_QUOTES, 'UTF-8') . "'" : "";

    // Opciones dinámicas
    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }

    $html = '';
    switch ($tipo) {
        case 'radio':
            $html .= "<div class='radio-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $checked = ($valor == $opcionTexto) ? " checked" : "";
                $html .= "<span class='radio-item' style='margin-right:15px;'>";
                $html .= "<input type='radio' id='{$nombre}_{$opcionTexto}' name='{$nombre}' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'checkbox':
            $html .= "<div class='checkbox-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $checked = (strpos($valor, $opcionTexto) !== false) ? " checked" : "";
                $html .= "<span class='checkbox-item' style='margin-right:10px;'>";
                $html .= "<input type='checkbox' id='{$nombre}_{$opcionTexto}' name='{$nombre}[]' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'select':
        case 'selectdata':
            $html .= "<select name='{$nombre}' id='{$nombre}'{$readonly}{$disabled}{$dataFormato}>";
            foreach ($opciones as $opcion) {
                $opcionTexto = is_array($opcion) ? htmlspecialchars($opcion['nombre'], ENT_QUOTES, 'UTF-8') : htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $selected = ($valor == $opcionTexto) ? " selected" : "";
                $html .= "<option value='{$opcionTexto}'{$selected}>{$opcionTexto}</option>";
            }
            $html .= "</select>";
            break;
        case 'list':
            $html .= "<input type='text' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$dataFormato}>";
            break;
        case 'textarea':
            $html .= "<textarea name='{$nombre}' id='{$nombre}'{$readonly}{$dataFormato}>" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "</textarea>";
            break;
        default:
            $html .= "<input type='{$tipo}' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$dataFormato}>";
            break;
    }
    return $html;
}

function obtenerDatosTabla($data) {
    global $conn;
    $tabla  = $data['tabla'];
    $campo  = $data['campo'];
    $filtro = isset($data['filtro']) ? "WHERE " . $data['filtro'] : "";
    $consulta = "SELECT $campo FROM $tabla $filtro";
    $stmt = $conn->prepare($consulta);
    if ($stmt === false) {
        return [];
    }
    $stmt->execute();
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

function generarGruposRecursivos($grupos, $valores = [], $soloLectura = false) {
    $html = "";
    foreach ($grupos as $grupo) {
        if (isset($grupo['activo']) && !$grupo['activo']) continue;
        $grupoNombre = isset($grupo['grupoNombre']) ? htmlspecialchars($grupo['grupoNombre'], ENT_QUOTES, 'UTF-8') : "Grupo";
        $estiloGrupo = isset($grupo['estilo']) ? $grupo['estilo'] : "";
        $html .= "<fieldset style='{$estiloGrupo}'><legend>{$grupoNombre}</legend>";
        if (isset($grupo['campos']) && is_array($grupo['campos'])) {
            foreach ($grupo['campos'] as $campo) {
                $html .= generarCampo($campo, $valores, $soloLectura);
            }
        }
        if (isset($grupo['hijos']) && is_array($grupo['hijos'])) {
            $html .= generarGruposRecursivos($grupo['hijos'], $valores, $soloLectura);
        }
        $html .= "</fieldset>";
    }
    return $html;
}

// ---------------------------------------------------------------
// FUNCIÓN PARA ENVIAR EL FORMULARIO CON ADJUNTOS MIME CORRECTOS
// ---------------------------------------------------------------
function enviarFormulario($jsonFile, $formData, $css, $json) {
    $config = $json['parametros'];

    $mailDe = $config['mailDe'] ?? null;
    $mailPara = $config['mailPara'] ?? null;
    $mailCc = $config['mailCc'] ?? null;
    $mailCco = $config['mailCco'] ?? null;

    $tiposFormatoEnvio = explode(',', strtolower($config['tipoformatoenvio'] ?? 'htmlc'));

    // Generar el HTML del formulario con valores y CSS
    $htmlForm = "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>{$css}</style></head><body>";
    $htmlForm .= "<main>";
    $htmlForm .= "<header class='form-header'><h2>" . htmlspecialchars($config['titulo'], ENT_QUOTES, 'UTF-8') . "</h2>";
    if (!empty($config['tituloimagen'])) {
        $htmlForm .= "<img src='" . htmlspecialchars($config['tituloimagen'], ENT_QUOTES, 'UTF-8') . "' alt='Título Imagen'>";
    }
    $htmlForm .= "</header>";
    $htmlForm .= "<p>" . htmlspecialchars($config['comentario'], ENT_QUOTES, 'UTF-8') . "</p>";
    $htmlForm .= "<form>";
    $htmlForm .= generarGruposRecursivos($json['grupos'], $formData, true);
    $htmlForm .= "</form>";
    $htmlForm .= "<footer><p>" . htmlspecialchars($config['pie'], ENT_QUOTES, 'UTF-8') . "</p></footer>";
    $htmlForm .= "</main></body></html>";

    // PDF con mPDF
    $mpdf = new \Mpdf\Mpdf(['tempDir' => __DIR__ . '/tmp']);
    $mpdf->WriteHTML($htmlForm);
    $pdfContent = $mpdf->Output('', 'S');

    $asunto = $config['subject'] ?? "Formulario Recibido";
    $cabeceras = "From: " . $mailDe . "\r\n";
    if (!empty($mailCc)) $cabeceras .= "Cc: " . $mailCc . "\r\n";
    if (!empty($mailCco)) $cabeceras .= "Bcc: " . $mailCco . "\r\n";
    $cabeceras .= "MIME-Version: 1.0\r\n";

    // Si solo htmlc, enviar como cuerpo
    if (in_array('htmlc', $tiposFormatoEnvio)) {
        $cabeceras .= "Content-Type: text/html; charset=UTF-8\r\n";
        return mail($mailPara, $asunto, $htmlForm, $cabeceras);
    }

    // Si hay adjuntos, armar MIME
    $boundary = "----=_Part_" . md5(uniqid(time()));
    $cabeceras .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

    $mensaje = "--$boundary\r\n";
    $mensaje .= "Content-Type: text/html; charset=UTF-8\r\n";
    $mensaje .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $mensaje .= $htmlForm . "\r\n\r\n";

    // Adjuntar HTML
    if (in_array('html', $tiposFormatoEnvio)) {
        $filename = "formulario.html";
        $attachment = chunk_split(base64_encode($htmlForm));
        $mensaje .= "--$boundary\r\n";
        $mensaje .= "Content-Type: text/html; name=\"$filename\"\r\n";
        $mensaje .= "Content-Disposition: attachment; filename=\"$filename\"\r\n";
        $mensaje .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $mensaje .= $attachment . "\r\n\r\n";
    }

    // Adjuntar PDF
    if (in_array('pdf', $tiposFormatoEnvio)) {
        $filename = "formulario.pdf";
        $attachment = chunk_split(base64_encode($pdfContent));
        $mensaje .= "--$boundary\r\n";
        $mensaje .= "Content-Type: application/pdf; name=\"$filename\"\r\n";
        $mensaje .= "Content-Disposition: attachment; filename=\"$filename\"\r\n";
        $mensaje .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $mensaje .= $attachment . "\r\n\r\n";
    }

    $mensaje .= "--$boundary--\r\n";

    // Enviar y mostrar resultado
    $ok = mail($mailPara, $asunto, $mensaje, $cabeceras);
    if ($ok) {
        echo "<p style='color: green; text-align: center;'>¡Correo enviado correctamente!</p>";
    } else {
        echo "<p style='color: red; text-align: center;'>Error al enviar el correo. Revise la configuración del servidor.</p>";
    }
    return $ok;
}

// Verificar si se ha enviado el formulario
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $formData = $_POST; // Recibe todos los datos del formulario
    enviarFormulario($json_file, $formData, $css, $json);
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
    <form id="formulario" method="POST" enctype="multipart/form-data" data-archivo="<?php echo htmlspecialchars($nombre_archivo, ENT_QUOTES, 'UTF-8'); ?>">
      <?php echo generarGruposRecursivos($json['grupos']); ?>
      <div class="submit-container">
        <button type="submit">Enviar</button>
      </div>
    </form>
    <footer>
      <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
    </footer>
    <p>Fecha de creación: <?php echo htmlspecialchars($fecha_creacion, ENT_QUOTES, 'UTF-8'); ?></p>
  </main>
  <script src="js/formulariodinamico.js"></script>
</body>
</html>
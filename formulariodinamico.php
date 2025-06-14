 <?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'funcionessql.php';
require_once __DIR__ . '/vendor/autoload.php'; // mPDF autoload

use Shuchkin\SimpleXLSXGen;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PhpOffice\PhpWord\PhpWord;

$conn = conexionBd();

// Validar y cargar el archivo JSON
if (!isset($_GET['archivo']) || !preg_match('/^[a-zA-Z0-9_\-]+\.json$/', $_GET['archivo'])) {
    echo "<div style='color:red;text-align:center;font-weight:bold;'>No existe nombre de formulario.</div>";
    exit;
}
$nombre_archivo = $_GET['archivo'];
$json_file = __DIR__ . '/json/' . $nombre_archivo;
if (!file_exists($json_file)) {
    echo "<div style='color:red;text-align:center;font-weight:bold;'>El archivo $nombre_archivo no existe.</div>";
    exit;
}

$json = json_decode(file_get_contents($json_file), true);

if (!$json) {
    echo "<div style='color:red'>Error: El archivo JSON no es válido o está vacío.</div>";
    exit;
}
if (!isset($json['grupos']) || !is_array($json['grupos'])) {
    echo "<div style='color:red'>Error: El archivo JSON no contiene grupos de campos.</div>";
    exit;
}

// Obtener la fecha de creación del archivo JSON
$fecha_creacion = isset($json['parametros']['fecha_creacion']) ? $json['parametros']['fecha_creacion'] : 'Fecha desconocida';

// Leer el CSS del formulario
$css = file_exists(__DIR__ . '/css/formulariodinamico.css') ? file_get_contents(__DIR__ . '/css/formulariodinamico.css') : '';

// Función para obtener datos de tabla si corresponde
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

// Función para generar campos del formulario
function generarContenidoCampo($campo, $valor = '', $soloLectura = false) {
    $tipo = isset($campo['tipo']) ? $campo['tipo'] : 'text';
    $nombre = isset($campo['nombre']) ? $campo['nombre'] : '';
    $readonly = $soloLectura ? " readonly" : "";
    $disabled = $soloLectura ? " disabled" : "";
    $dataFormato = isset($campo['formato']) ? " data-formato='" . htmlspecialchars($campo['formato'], ENT_QUOTES, 'UTF-8') . "'" : "";

    // NUEVO: agrega data-formula si existe
    $dataFormula = "";
    if (isset($campo['formula'])) {
        if (is_array($campo['formula'])) {
            $dataFormula = " data-formula='" . htmlspecialchars(json_encode($campo['formula']), ENT_QUOTES, 'UTF-8') . "'";
        } else {
            $dataFormula = " data-formula='" . htmlspecialchars($campo['formula'], ENT_QUOTES, 'UTF-8') . "'";
        }
    }

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
                $opcionTexto = htmlspecialchars(is_array($opcion) ? $opcion['nombre'] : $opcion, ENT_QUOTES, 'UTF-8');
                $checked = ($valor == $opcionTexto) ? " checked" : "";
                $html .= "<span class='radio-item' style='margin-right:15px;'>";
                $html .= "<input type='radio' id='{$nombre}_{$opcionTexto}' name='{$nombre}' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}{$dataFormula}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'checkbox':
            $html .= "<div class='checkbox-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars(is_array($opcion) ? $opcion['nombre'] : $opcion, ENT_QUOTES, 'UTF-8');
                $checked = (strpos($valor, $opcionTexto) !== false) ? " checked" : "";
                $html .= "<span class='checkbox-item' style='margin-right:10px;'>";
                $html .= "<input type='checkbox' id='{$nombre}_{$opcionTexto}' name='{$nombre}[]' value='{$opcionTexto}'{$checked}{$readonly}{$dataFormato}{$dataFormula}>";
                $html .= "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                $html .= "</span>";
            }
            $html .= "</div>";
            break;
        case 'select':
        case 'selectdata':
            $html .= "<select name='{$nombre}' id='{$nombre}'{$readonly}{$disabled}{$dataFormato}{$dataFormula}>";
            foreach ($opciones as $opcion) {
                $opcionTexto = is_array($opcion) ? htmlspecialchars($opcion['nombre'], ENT_QUOTES, 'UTF-8') : htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                $selected = ($valor == $opcionTexto) ? " selected" : "";
                $html .= "<option value='{$opcionTexto}'{$selected}>{$opcionTexto}</option>";
            }
            $html .= "</select>";
            break;
        case 'list':
            $html .= "<input type='text' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$dataFormato}{$dataFormula}>";
            break;
        case 'textarea':
            $html .= "<textarea name='{$nombre}' id='{$nombre}'{$readonly}{$dataFormato}{$dataFormula}>" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "</textarea>";
            break;
        default:
            $html .= "<input type='{$tipo}' name='{$nombre}' id='{$nombre}' value='" . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . "'{$readonly}{$disabled}{$dataFormato}{$dataFormula}>";
            break;
    }
    return $html;
}

// Función para generar cada campo con su etiqueta y alineación
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

// Función recursiva para grupos y subgrupos
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

// Envío de formulario y adjuntos

 
function enviarFormulario($jsonFile, $formData, $css, $json) {
    file_put_contents(__DIR__ . '/debug_mail.txt', "Entró a enviarFormulario\n", FILE_APPEND);

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

    // XLSX (Excel real) usando SimpleXLSXGen si está disponible
    $xlsContent = null;
    $xlsFilename = 'formulario.xlsx';
    if (class_exists('Shuchkin\SimpleXLSXGen')) {
        // Crea el archivo Excel real (.xlsx)
        $header = [array_keys($formData)];
        $row = [array_map(function($v) { return is_array($v) ? implode(', ', $v) : $v; }, $formData)];
        $xlsx = \Shuchkin\SimpleXLSXGen::fromArray(array_merge($header, $row));
        $xlsContent = $xlsx->downloadAsString();
    } else {
        // Fallback: CSV (Excel lo abre igual)
        $xlsFilename = 'formulario.csv';
        $xlsRows = [];
        $xlsRows[] = implode(",", array_map(function($k){return '"'.str_replace('"','""',$k).'"';}, array_keys($formData)));
        $xlsRows[] = implode(",", array_map(function($v){
            $v = is_array($v) ? implode(', ', $v) : $v;
            return '"'.str_replace('"','""',$v).'"';
        }, $formData));
        $xlsContent = implode("\r\n", $xlsRows);
    }

    // JSON
    $jsonContent = json_encode($formData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        $jsonContent = '{}';
    }

    // XML
    $xml = new SimpleXMLElement('<formulario/>');
    foreach ($formData as $key => $value) {
        $xml->addChild($key, is_array($value) ? implode(', ', $value) : $value);
    }
    $xmlContent = $xml->asXML();

    // DOC (Word real) usando HTML (Word lo abre)
    $docContent = "<html><body>" . $htmlForm . "</body></html>";

    $asunto = $config['subject'] ?? "Formulario Recibido";

    // --- ENVÍO CON PHPMailer ---
    $mail = new PHPMailer(true);
    try {
        // Si necesitas SMTP, descomenta y configura:
        // $mail->isSMTP();
        // $mail->Host = 'smtp.tudominio.com';
        // $mail->SMTPAuth = true;
        // $mail->Username = 'usuario@tudominio.com';
        // $mail->Password = 'tu_password';
        // $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        // $mail->Port = 587;

        $mail->setFrom($mailDe, 'Formulario Web');
        $mail->addAddress($mailPara);
        if (!empty($mailCc)) $mail->addCC($mailCc);
        if (!empty($mailCco)) $mail->addBCC($mailCco);
        $mail->Subject = $asunto;
        $mail->isHTML(true);

        // Adjuntar según tipoformatoenvio
        foreach ($tiposFormatoEnvio as $tipo) {
            $tipo = trim(strtolower($tipo));
            switch ($tipo) {
                case 'pdf':
                    $mail->addStringAttachment($pdfContent, 'formulario.pdf', 'base64', 'application/pdf');
                    break;
                case 'html':
                    $mail->addStringAttachment($htmlForm, 'formulario.html', 'base64', 'text/html');
                    break;
                case 'xls':
                    if ($xlsFilename === 'formulario.xlsx') {
                        $mail->addStringAttachment($xlsContent, $xlsFilename, 'base64', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    } else {
                        $mail->addStringAttachment($xlsContent, $xlsFilename, 'base64', 'text/csv');
                    }
                    break;
                case 'json':
                    $mail->addStringAttachment($jsonContent, 'formulario.json', 'base64', 'application/json');
                    break;
                case 'xml':
                    $mail->addStringAttachment($xmlContent, 'formulario.xml', 'base64', 'application/xml');
                    break;
                case 'doc':
                    $mail->addStringAttachment($docContent, 'formulario.doc', 'base64', 'application/msword');
                    break;
                case 'htmlc':
                    // No adjunta, solo pone el HTML como cuerpo del correo
                    break;
            }
        }

        // El cuerpo del correo (si incluye htmlc, usa el HTML como cuerpo)
        if (in_array('htmlc', $tiposFormatoEnvio)) {
            $mail->Body = $htmlForm;
        } else {
            $mail->Body = "Adjunto el(los) archivo(s) del formulario.";
        }

        $mail->send();
        echo "<p style='color: green; text-align: center;'>¡Correo enviado correctamente!</p>";
    } catch (Exception $e) {
        echo "<p style='color: red; text-align: center;'>Error al enviar el correo: {$mail->ErrorInfo}</p>";
 
 
// VALIDACIÓN Y ENVÍO DEL FORMULARIO
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    file_put_contents(__DIR__ . '/debug_mail.txt', "POST recibido\n", FILE_APPEND);

    $formData = $_POST; // Recibe todos los datos del formulario

    // VALIDACIONES BÁSICAS
    $errores = [];

    // Validar que mailPara y mailDe existen y son emails válidos
    $mailPara = $json['parametros']['mailPara'] ?? '';
    $mailDe = $json['parametros']['mailDe'] ?? '';
    if (empty($mailPara) || !filter_var($mailPara, FILTER_VALIDATE_EMAIL)) {
        $errores[] = "El destinatario del correo (mailPara) no es válido.";
    }
    if (empty($mailDe) || !filter_var($mailDe, FILTER_VALIDATE_EMAIL)) {
        $errores[] = "El remitente del correo (mailDe) no es válido.";
    }

    // Validar que todos los campos requeridos del formulario estén presentes
    function validarCamposRequeridos($grupos, $formData, &$errores) {
        foreach ($grupos as $grupo) {
            if (isset($grupo['campos'])) {
                foreach ($grupo['campos'] as $campo) {
                    if (!empty($campo['requerido']) && empty($formData[$campo['nombre']])) {
                        $etiqueta = $campo['etiqueta'] ?? $campo['nombre'];
                        $errores[] = "El campo '{$etiqueta}' es obligatorio.";
                    }
                }
            }
            if (isset($grupo['hijos'])) {
                validarCamposRequeridos($grupo['hijos'], $formData, $errores);
            }
        }
    }
    validarCamposRequeridos($json['grupos'], $formData, $errores);

    file_put_contents(__DIR__ . '/debug_mail.txt', "Errores: " . print_r($errores, true), FILE_APPEND);

    // Mostrar errores si existen
    if (!empty($errores)) {
        echo "<div style='color:red;'><ul>";
        foreach ($errores as $error) {
            echo "<li>" . htmlspecialchars($error) . "</li>";
        }
        echo "</ul></div>";
    } else {
        file_put_contents(__DIR__ . '/debug_mail.txt', "Llamando a enviarFormulario\n", FILE_APPEND);
        enviarFormulario($json_file, $formData, $css, $json);
    }
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


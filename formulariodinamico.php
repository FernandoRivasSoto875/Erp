<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'funcionessql.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once 'formulariodinamico.funciones.php';

use Shuchkin\SimpleXLSXGen;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$conn = conexionBd();

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
if (!isset($json['fieldsets']) || !is_array($json['fieldsets'])) {
    echo "<div style='color:red'>Error: El archivo JSON no contiene fieldsets de campos.</div>";
    exit;
}

$fecha_creacion = isset($json['parametros']['fecha_creacion']) ? $json['parametros']['fecha_creacion'] : 'Fecha desconocida';
$css = file_exists(__DIR__ . '/css/formulariodinamico.css') ? file_get_contents(__DIR__ . '/css/formulariodinamico.css') : '';

$registroFile = __DIR__ . '/data/' . $nombre_archivo . '_ultimo.json';
$valoresGuardados = [];
if (file_exists($registroFile)) {
    $valoresGuardados = json_decode(file_get_contents($registroFile), true);
}

$mensajeEnvio = '';
$mensajeEnvioTipo = '';

// Lógica de LIMPIAR: si no existe o es true, limpiar; si es false, no limpiar
$limpiar = (!isset($json['parametros']['limpiar']) || $json['parametros']['limpiar'] === true) ? 'true' : 'false';

function enviarFormulario($jsonFile, $formData, $css, $json, &$mensajeEnvio, &$mensajeEnvioTipo) {
    $config = $json['parametros'];
    $titulo = isset($config['titulo']) ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $config['titulo']) : 'formulario';

    $mailDe = $config['mailDe'] ?? null;
    $mailPara = $config['mailPara'] ?? null;
    $mailCc = $config['mailCc'] ?? null;
    $mailCco = $config['mailCco'] ?? null;
    $tiposFormatoEnvio = explode(',', strtolower($config['tipoformatoenvio'] ?? 'htmlc'));

    $valoresAdjuntos = normalizaValores($formData, $json, false);
    $valoresAdjuntosJson = normalizaValores($formData, $json, true);

    $htmlForm = "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>{$css}</style></head><body>";
    $htmlForm .= "<main>";
    $htmlForm .= "<header class='form-header'><h2>" . htmlspecialchars($config['titulo'], ENT_QUOTES, 'UTF-8') . "</h2>";
    if (!empty($config['tituloimagen'])) {
        $htmlForm .= "<img src='" . htmlspecialchars($config['tituloimagen'], ENT_QUOTES, 'UTF-8') . "' alt='Título Imagen'>";
    }
    $htmlForm .= "</header>";
    $htmlForm .= "<p>" . htmlspecialchars($config['comentario'], ENT_QUOTES, 'UTF-8') . "</p>";
    $htmlForm .= "<form>";
    $htmlForm .= generarFieldsets($json['fieldsets'], $valoresAdjuntos, true);
    $htmlForm .= "</form>";
    $htmlForm .= "<footer><p>" . htmlspecialchars($config['pie'], ENT_QUOTES, 'UTF-8') . "</p></footer>";
    $htmlForm .= "</main></body></html>";

    $mpdf = new \Mpdf\Mpdf(['tempDir' => __DIR__ . '/tmp']);
    $mpdf->WriteHTML($htmlForm);
    $pdfContent = $mpdf->Output('', 'S');

    // Generar XLSX y XLS (xls como CSV pero con extensión .xls)
    $xlsContent = null;
    $xlsxContent = null;
    $csvContent = null;
    $esXlsx = false;
    if (class_exists('Shuchkin\SimpleXLSXGen')) {
        $header = [array_keys($valoresAdjuntos)];
        $row = [array_values($valoresAdjuntos)];
        $xlsx = \Shuchkin\SimpleXLSXGen::fromArray(array_merge($header, $row));
        $tempXlsx = tempnam(sys_get_temp_dir(), 'xlsx_') . '.xlsx';
        $xlsx->saveAs($tempXlsx);
        $xlsxContent = file_get_contents($tempXlsx);
        unlink($tempXlsx);
        $esXlsx = true;
    }
    // CSV siempre disponible
    $csvRows = [];
    $csvRows[] = implode(",", array_map(function($k){return '"'.str_replace('"','""',$k).'"';}, array_keys($valoresAdjuntos)));
    $csvRows[] = implode(",", array_map(function($v){
        return '"'.str_replace('"','""',$v).'"';
    }, array_values($valoresAdjuntos)));
    $csvContent = implode("\r\n", $csvRows);
    // Para .xls (realmente CSV con extensión .xls)
    $xlsContent = $csvContent;

    $jsonContent = json_encode($valoresAdjuntosJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        $jsonContent = '{}';
    }

    $xml = new SimpleXMLElement('<formulario/>');
    foreach ($valoresAdjuntos as $key => $value) {
        $xml->addChild($key, $value);
    }
    $xmlContent = $xml->asXML();

    $docContent = "<html><body>" . $htmlForm . "</body></html>";

    // Nombres de archivos adjuntos personalizados según el título
    $pdfFilename  = $titulo . '.pdf';
    $htmlFilename = $titulo . '.html';
    $xlsxFilename = $titulo . '.xlsx';
    $xlsFilename  = $titulo . '.xls';
    $csvFilename  = $titulo . '.csv';
    $jsonFilename = $titulo . '.json';
    $xmlFilename  = $titulo . '.xml';
    $docFilename  = $titulo . '.doc';

    $asunto = $config['subject'] ?? "Formulario Recibido";

    $mail = new PHPMailer(true);
    try {
        $mail->setFrom($mailDe, 'Formulario Web');
        $mail->addAddress($mailPara);
        if (!empty($mailCc)) $mail->addCC($mailCc);
        if (!empty($mailCco)) $mail->addBCC($mailCco);
        $mail->Subject = $asunto;
        $mail->isHTML(true);

        foreach ($tiposFormatoEnvio as $tipo) {
            $tipo = trim(strtolower($tipo));
            switch ($tipo) {
                case 'pdf':
                    $mail->addStringAttachment($pdfContent, $pdfFilename, 'base64', 'application/pdf');
                    break;
                case 'html':
                    $mail->addStringAttachment($htmlForm, $htmlFilename, 'base64', 'text/html');
                    break;
                case 'xls':
                    if ($xlsContent) {
                        $mail->addStringAttachment($xlsContent, $xlsFilename, 'base64', 'application/vnd.ms-excel');
 
                        
                    }
                    break;
                case 'xlsx':
                    if ($xlsxContent) {
                        $mail->addStringAttachment($xlsxContent, $xlsxFilename, 'base64', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');


                     if (class_exists('Shuchkin\SimpleXLSXGen')) {
                                $header = [array_keys($valoresAdjuntos)];
                                $row = [array_values($valoresAdjuntos)];
                                $xlsx = \Shuchkin\SimpleXLSXGen::fromArray(array_merge($header, $row));
                                $tempXlsx = tempnam(sys_get_temp_dir(), 'xlsx_') . '.xlsx';
                                $xlsx->saveAs($tempXlsx);
                                if (file_exists($tempXlsx)) {
                                    $xlsxContent = file_get_contents($tempXlsx);
                                    unlink($tempXlsx);
                                } else {
                                    echo "<div style='color:red'>No se pudo crear el archivo temporal XLSX en: $tempXlsx</div>";
                                }
                            } else {
                                echo "<div style='color:red'>La clase SimpleXLSXGen no está disponible.</div>";
                            }













                    }
                    break;
                case 'csv':
                case 'cvs':
                    if ($csvContent) {
                        $mail->addStringAttachment($csvContent, $csvFilename, 'base64', 'text/csv');
                    }
                    break;
                case 'json':
                    $mail->addStringAttachment($jsonContent, $jsonFilename, 'base64', 'application/json');
                    break;
                case 'xml':
                    $mail->addStringAttachment($xmlContent, $xmlFilename, 'base64', 'application/xml');
                    break;
                case 'doc':
                    $mail->addStringAttachment($docContent, $docFilename, 'base64', 'application/msword');
                    break;
                case 'htmlc':
                    break;
            }
        }

        if (in_array('htmlc', $tiposFormatoEnvio)) {
            $mail->Body = $htmlForm;
        } else {
            $mail->Body = "Adjunto el(los) archivo(s) del formulario.";
        }


echo "<pre>";
echo "Adjuntos solicitados: "; print_r($tiposFormatoEnvio);
echo "PDF: " . (isset($pdfContent) && $pdfContent ? "OK" : "NO") . "\n";
echo "XLSX: " . (isset($xlsxContent) && $xlsxContent ? "OK" : "NO") . "\n";
echo "XLS: " . (isset($xlsContent) && $xlsContent ? "OK" : "NO") . "\n";
echo "CSV: " . (isset($csvContent) && $csvContent ? "OK" : "NO") . "\n";
echo "JSON: " . (isset($jsonContent) && $jsonContent ? "OK" : "NO") . "\n";
echo "XML: " . (isset($xmlContent) && $xmlContent ? "OK" : "NO") . "\n";
echo "DOC: " . (isset($docContent) && $docContent ? "OK" : "NO") . "\n";
echo "HTML: " . (isset($htmlForm) && $htmlForm ? "OK" : "NO") . "\n";
echo "</pre>";





        $mail->send();
        $mensajeEnvio = "¡Formulario enviado correctamente!";
        $mensajeEnvioTipo = "exito";
    } catch (Exception $e) {
        $mensajeEnvio = "Error al enviar el formulario: {$mail->ErrorInfo}";
        $mensajeEnvioTipo = "error";
    }

    $registroDir = __DIR__ . '/data/';
    if (!is_dir($registroDir)) {
        mkdir($registroDir, 0777, true);
    }
    $registroFile = $registroDir . $GLOBALS['nombre_archivo'] . '_ultimo.json';
    file_put_contents($registroFile, json_encode($valoresAdjuntosJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $formData = $_POST;

    $errores = [];

    $mailPara = $json['parametros']['mailPara'] ?? '';
    $mailDe = $json['parametros']['mailDe'] ?? '';
    if (empty($mailPara) || !filter_var($mailPara, FILTER_VALIDATE_EMAIL)) {
        $errores[] = "El destinatario del correo (mailPara) no es válido.";
    }
    if (empty($mailDe) || !filter_var($mailDe, FILTER_VALIDATE_EMAIL)) {
        $errores[] = "El remitente del correo (mailDe) no es válido.";
    }

    function validarCamposRequeridos($fieldsets, $formData, &$errores) {
        foreach ($fieldsets as $fieldset) {
            if (isset($fieldset['fields'])) {
                foreach ($fieldset['fields'] as $field) {
                    if (!empty($field['required']) && empty($formData[$field['name']])) {
                        $label = $field['label'] ?? $field['name'];
                        $errores[] = "El campo '{$label}' es obligatorio.";
                    }
                }
            }
            if (isset($fieldset['fieldsets'])) {
                validarCamposRequeridos($fieldset['fieldsets'], $formData, $errores);
            }
        }
    }
    validarCamposRequeridos($json['fieldsets'], $formData, $errores);

    if (!empty($errores)) {
        $mensajeEnvio = "<ul>";
        foreach ($errores as $error) {
            $mensajeEnvio .= "<li>" . htmlspecialchars($error) . "</li>";
        }
        $mensajeEnvio .= "</ul>";
        $mensajeEnvioTipo = "error";
    } else {
        enviarFormulario($json_file, $formData, $css, $json, $mensajeEnvio, $mensajeEnvioTipo);
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
 </style>
  <script>
    var LIMPIAR_FORMULARIO = <?php echo $limpiar; ?>;
  </script>
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
    <div id="mensaje-envio" class="<?php echo htmlspecialchars($mensajeEnvioTipo); ?>">
      <?php echo $mensajeEnvio; ?>
    </div>
    <form id="formulario" method="POST" enctype="multipart/form-data" data-archivo="<?php echo htmlspecialchars($nombre_archivo, ENT_QUOTES, 'UTF-8'); ?>">
      <?php
        $exito = ($_SERVER["REQUEST_METHOD"] == "POST" && $mensajeEnvioTipo === "exito");
        $valoresParaFormulario = $exito
            ? prepararValoresGuardados($json, [])
            : ($_SERVER["REQUEST_METHOD"] == "POST"
                ? prepararValoresGuardados($json, $_POST)
                : prepararValoresGuardados($json, $valoresGuardados)
              );
        echo generarFieldsets($json['fieldsets'], $valoresParaFormulario);
      ?>
      <div class="submit-container">
        <button type="submit">Enviar</button>
      </div>
    </form>
    <footer>
      <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
    </footer>
    <!-- <p>Fecha de creación: <?php echo htmlspecialchars($fecha_creacion, ENT_QUOTES, 'UTF-8'); ?></p> -->
  </main>
  <script src="js/formulariodinamico.js"></script>
  </body>
</html>
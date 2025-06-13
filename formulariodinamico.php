 <?php
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\formulariodinamico.php
// Autor: Fernando Rivas S.

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'funcionessql.php';
require_once __DIR__ . '/fpdf/fpdf.php'; // Asegúrate de tener FPDF en la carpeta fpdf
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

function generarCampo($campo) {
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

    $html  = "<div class='campo-container $clasePosicion'{$estiloCampo}>";
    switch ($posicion) {
        case 'izquierdo':
            if ($etiqueta !== '') $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label>";
            $html .= generarContenidoCampo($campo);
            break;
        case 'derecho':
            $html .= generarContenidoCampo($campo);
            if ($etiqueta !== '') $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label>";
            break;
        case 'arriba.izquierdo':
        case 'arriba.derecho':
        case 'arriba.centro':
            if ($etiqueta !== '') $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo);
            $html .= "</div>";
            break;
        case 'abajo':
            $html .= generarContenidoCampo($campo);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$campo['nombre']}'>{$etiqueta}</label>";
            break;
        case 'abajo.izquierdo':
        case 'abajo.derecho':
        case 'abajo.centro':
            $html .= "<div class='$alinearDiv'>";
            $html .= generarContenidoCampo($campo);
            if ($etiqueta !== '') $html .= "<br><label class='etiqueta-abajo' for='{$campo['nombre']}'>{$etiqueta}</label>";
            $html .= "</div>";
            break;
        case 'oculto':
        case 'none':
            $html .= generarContenidoCampo($campo);
            break;
        case 'arriba':
        default:
            if ($etiqueta !== '') $html .= "<label for='{$campo['nombre']}'>{$etiqueta}</label><br>";
            $html .= generarContenidoCampo($campo);
            break;
    }
    $html .= "<span class='mensaje-error'></span>";
    $html .= "</div>";
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

function generarContenidoCampo($campo) {
    ob_start();
    $tipo = isset($campo['tipo']) ? $campo['tipo'] : 'text';
    $nombre = isset($campo['nombre']) ? $campo['nombre'] : '';
    $placeholder = isset($campo["placeholder"]) ? " placeholder='" . htmlspecialchars($campo["placeholder"], ENT_QUOTES, "UTF-8") . "'" : "";
    $readonly = (isset($campo["readonly"]) && $campo["readonly"]) ? " readonly" : "";
    $formulaAttr = "";

    // Soporte para fórmula (aritmética o búsqueda)
    if (isset($campo["formula"])) {
        $formulaAttr = " data-formula='" . htmlspecialchars(json_encode($campo["formula"]), ENT_QUOTES, "UTF-8") . "'";
        $readonly = " readonly";
    }
    // Soporte para formato numérico/moneda
    $dataFormato = isset($campo['formato']) ? " data-formato='" . htmlspecialchars($campo['formato'], ENT_QUOTES, 'UTF-8') . "'" : "";

    // Opciones dinámicas
    if (isset($campo['data'])) {
        $opciones = obtenerDatosTabla($campo['data']);
    } else {
        $opciones = isset($campo['opciones']) ? $campo['opciones'] : [];
    }
    $marcaCrud = (isset($campo['crud']) && $campo['crud'] === true) ? " data-dynamic='true'" : "";

    switch ($tipo) {
        case 'radio':
            echo "<div class='radio-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<span class='radio-item' style='margin-right:15px;'>";
                echo "<input type='radio' id='{$nombre}_{$opcionTexto}' name='{$nombre}' value='{$opcionTexto}'{$marcaCrud}{$dataFormato}>";
                echo "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'checkbox':
            echo "<div class='checkbox-group' id='{$nombre}_container'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<span class='checkbox-item' style='margin-right:10px;'>";
                echo "<input type='checkbox' id='{$nombre}_{$opcionTexto}' name='{$nombre}[]' value='{$opcionTexto}'{$marcaCrud}{$dataFormato}>";
                echo "<label for='{$nombre}_{$opcionTexto}'>$opcionTexto</label>";
                echo "</span>";
            }
            echo "</div>";
            break;
        case 'select':
            echo "<select name='{$nombre}' id='{$nombre}'{$dataFormato}>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<option value='{$opcionTexto}'{$marcaCrud}>$opcionTexto</option>";
            }
            echo "</select>";
            break;
        case 'selectdata':
            echo "<select name='{$nombre}' id='{$nombre}'{$marcaCrud}{$dataFormato}>";
            echo "<option value=''>Seleccione...</option>";
            foreach ($opciones as $opcion) {
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
            $datalistId = $nombre . "-list";
            echo "<input type='text' name='{$nombre}' id='{$nombre}'{$placeholder}{$readonly}{$formulaAttr}{$dataFormato} list='{$datalistId}'>";
            echo "<datalist id='{$datalistId}'>";
            foreach ($opciones as $opcion) {
                $opcionTexto = htmlspecialchars($opcion, ENT_QUOTES, 'UTF-8');
                echo "<option value='{$opcionTexto}'{$marcaCrud}>";
            }
            echo "</datalist>";
            break;
        case 'datable':
            echo "<div class='datable' id='{$nombre}_datable' style='width:100%; border:1px solid #ccc; padding:10px;'>";
            echo "<!-- Aquí se renderizarán los datos en forma tabular -->";
            echo "</div>";
            break;
        case 'file':
            $accept = isset($campo['accept']) ? " accept='" . htmlspecialchars($campo['accept'], ENT_QUOTES, 'UTF-8') . "'" : "";
            $capture = isset($campo['capture']) ? " capture='" . htmlspecialchars($campo['capture'], ENT_QUOTES, 'UTF-8') . "'" : "";
            echo "<input type='file' name='{$nombre}' id='{$nombre}'{$accept}{$capture}{$dataFormato}>";
            break;
        case 'textarea':
            echo "<textarea name='{$nombre}' id='{$nombre}'{$placeholder}{$readonly}{$formulaAttr}{$dataFormato}></textarea>";
            break;
        default:
            echo "<input type='{$tipo}' name='{$nombre}' id='{$nombre}'{$placeholder}{$readonly}{$formulaAttr}{$dataFormato}>";
            break;
    }
    return ob_get_clean();
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
// FUNCIÓN PARA ENVIAR EL FORMULARIO CON ADJUNTOS MIME CORRECTOS
// ---------------------------------------------------------------
function enviarFormulario($jsonFile, $formData) {
    $jsonData = file_get_contents($jsonFile);
    $config = json_decode($jsonData, true);

    $mailDe = $config['parametros']['mailDe'] ?? null;
    $mailPara = $config['parametros']['mailPara'] ?? null;
    $mailCc = $config['parametros']['mailCc'] ?? null;
    $mailCco = $config['parametros']['mailCco'] ?? null;
    $usuario = $config['parametros']['usuario'] ?? 'Formulario';

    $tiposFormatoEnvio = explode(',', strtolower($config['parametros']['tipoformatoenvio'] ?? 'htmlc'));

    // Obtener etiquetas
    function obtenerEtiquetas($grupos) {
        $etiquetas = [];
        foreach ($grupos as $grupo) {
            if (isset($grupo['campos'])) {
                foreach ($grupo['campos'] as $campo) {
                    if (isset($campo['nombre']) && isset($campo['etiqueta'])) {
                        $etiquetas[$campo['nombre']] = $campo['etiqueta'];
                    }
                }
            }
            if (isset($grupo['hijos'])) {
                $etiquetas = array_merge($etiquetas, obtenerEtiquetas($grupo['hijos']));
            }
        }
        return $etiquetas;
    }
    $etiquetas = obtenerEtiquetas($config['grupos']);

    // Construir HTML
    $mensajeHTML = "<h2>Datos del Formulario</h2><table border='1'>";
    foreach ($formData as $key => $value) {
        $nombreCampo = isset($etiquetas[$key]) ? $etiquetas[$key] : $key;
        if (is_array($value)) $value = implode(', ', $value);
        $mensajeHTML .= "<tr><td><strong>" . htmlspecialchars($nombreCampo) . ":</strong></td><td>" . htmlspecialchars($value) . "</td></tr>";
    }
    $mensajeHTML .= "</table>";

    // Construir PDF real usando FPDF
    $pdf = new FPDF();
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 10, 'Datos del Formulario', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 12);
    foreach ($formData as $key => $value) {
        $nombreCampo = isset($etiquetas[$key]) ? $etiquetas[$key] : $key;
        if (is_array($value)) $value = implode(', ', $value);
        $pdf->Cell(60, 8, utf8_decode($nombreCampo) . ':', 1);
        $pdf->Cell(0, 8, utf8_decode($value), 1, 1);
    }
    $pdfContent = $pdf->Output('S');

    $asunto = $config['parametros']['subject'] ?? "Formulario Recibido";
    $cabeceras = "From: " . $mailDe . "\r\n";
    if (!empty($mailCc)) $cabeceras .= "Cc: " . $mailCc . "\r\n";
    if (!empty($mailCco)) $cabeceras .= "Bcc: " . $mailCco . "\r\n";
    $cabeceras .= "MIME-Version: 1.0\r\n";

    // Si solo htmlc, enviar como cuerpo
    if (in_array('htmlc', $tiposFormatoEnvio)) {
        $cabeceras .= "Content-Type: text/html; charset=UTF-8\r\n";
        return mail($mailPara, $asunto, $mensajeHTML, $cabeceras);
    }

    // Si hay adjuntos, armar MIME
    $boundary = "----=_Part_" . md5(uniqid(time()));
    $cabeceras .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

    $mensaje = "--$boundary\r\n";
    $mensaje .= "Content-Type: text/html; charset=UTF-8\r\n";
    $mensaje .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $mensaje .= $mensajeHTML . "\r\n\r\n";

    // Adjuntar HTML
    if (in_array('html', $tiposFormatoEnvio)) {
        $filename = "formulario.html";
        $attachment = chunk_split(base64_encode($mensajeHTML));
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

    enviarFormulario($json_file, $formData);
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
  <script
 <?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'formulariodinamico.funciones.php';

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
    echo "<div style='color:red'>Error: El archivo JSON no contiene fieldsets.</div>";
    exit;
}
$mensajeEnvio = '';
$mensajeEnvioTipo = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Aquí puedes agregar validaciones y lógica de guardado/envío
    $mensajeEnvio = "<span style='color:green'>¡Formulario enviado correctamente!</span>";
    $mensajeEnvioTipo = "exito";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?></title>
  <link rel="stylesheet" href="css/formulariodinamico.css">
  <style>
    #mensaje-envio { margin: 20px 0; font-weight: bold; }
    #mensaje-envio.exito { color: green; }
    #mensaje-envio.error { color: red; }
  </style>
</head>
<body>
  <main>
    <header class="form-header">
      <h2><?php echo htmlspecialchars($json['parametros']['titulo'], ENT_QUOTES, 'UTF-8'); ?></h2>
    </header>
    <div id="mensaje-envio" class="<?php echo htmlspecialchars($mensajeEnvioTipo); ?>">
      <?php echo $mensajeEnvio; ?>
    </div>
    <form id="formulario" method="POST" enctype="multipart/form-data">
      <?php
        echo generarFieldsets($json['fieldsets']);
      ?>
      <div class="submit-container">
        <button type="submit">Enviar</button>
      </div>
    </form>
    <footer>
      <p><?php echo htmlspecialchars($json['parametros']['pie'], ENT_QUOTES, 'UTF-8'); ?></p>
    </footer>
  </main>
</body>
</html>
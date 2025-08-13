<?php
require_once '../js/formulariodinamico-app/app/formulariodinamicologica.php';
$archivo_json = $_GET['archivo'] ?? 'formulariogenerico2.json';
$json_data = cargarJson($archivo_json);
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Árbol JSON</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <div id="app">
    <header class="app-bar">
      <h1>Árbol/Formulario Dinámico</h1>
      <button id="btnShowTree" class="btn btn-outline-secondary">Diseño Árbol</button>
      <button id="btnShowForm" class="btn btn-outline-primary">Diseño Formulario</button>
      <button id="btnSync" class="btn">Solicitar JSON</button>
      <button id="btnSend" class="btn btn-primary">Enviar cambios</button>
    </header>
    <section class="pane" id="treePane">
      <div class="pane-left">
        <h3>Estructura</h3>
        <div id="tree"></div>
      </div>
      <div class="pane-right">
        <h3>JSON</h3>
        <textarea id="jsonEditor" spellcheck="false"></textarea>
        <div id="status" class="status"></div>
      </div>
    </section>
    <section id="formPane" style="display:none;">
      <div class="fd-form-area">
        <form id="formulariodinamico" class="mb-4">
          <?php
          require_once '../formulariodinamicofunciones.php';
          $archivo_base = 'formulariogenerico2.json';
          $json_path    = __DIR__ . '/../json/' . $archivo_base;
          $json_text    = is_file($json_path) ? file_get_contents($json_path) : '{}';
          $json_data    = json_decode($json_text, true);
          $fieldsets = $json_data['fieldsets']  ?? [];
          $layout    = $json_data['layout']     ?? [];
          echo fd_render_layout_fallback($layout, $fieldsets);
          ?>
        </form>
      </div>
    </section>
  </div>
  <script src="js/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script src="js/arboljson.js"></script>
</body>
</html>
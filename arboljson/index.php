<?php
header('Content-Type: text/html; charset=utf-8');
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
      <h1>Árbol del Formulario (JSON)</h1>
      <button id="btnSync" class="btn">Solicitar JSON</button>
      <button id="btnSend" class="btn btn-primary">Enviar cambios</button>
    </header>
    <section class="pane">
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
  </div>
  <script src="js/app.js"></script>
</body>
</html>
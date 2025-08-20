<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Genérico Popup</title>
    <link rel="stylesheet" href="css/estilos.css">
    <script>
    function abrirPopupFormulario() {
        window.open('https://saludenterreno.cl/ErpQa/formulariodinamico.php?archivo=formulariogenerico2.json',
            'popupFormulario',
            'width=900,height=700,scrollbars=yes,resizable=yes');
    }
    </script>
</head>
<body>
    <div style="text-align:center;padding:2em;">
        <button onclick="abrirPopupFormulario()" style="font-size:1.2em;padding:1em 2em;">Abrir Formulario en Popup</button>
    </div>
</body>
</html>

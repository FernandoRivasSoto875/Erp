<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario Genérico Embebido (innerHTML)</title>
    <link rel="stylesheet" href="css/estilos.css">
    <script src="js/formulariodinamico.js"></script>
</head>
<body>
    <div style="max-width:900px;margin:2em auto;">
        <button onclick="cargarFormulario()" style="font-size:1.1em;padding:0.7em 2em;">Cargar Formulario Dinámico</button>
        <div id="contenedor-formulario" style="margin-top:2em;"></div>
    </div>
    <script>
    function cargarFormulario() {
        fetch('formulariodinamico.php?archivo=formulariogenerico2.json')
            .then(r => r.text())
            .then(html => {
                document.getElementById('contenedor-formulario').innerHTML = html;
                // Espera a que el JS esté cargado y luego inicializa
                if (window.inicializarFormularioDinamico) {
                    window.inicializarFormularioDinamico();
                } else {
                    // Si el JS aún no está listo, espera y reintenta
                    setTimeout(() => {
                        if (window.inicializarFormularioDinamico) window.inicializarFormularioDinamico();
                    }, 200);
                }
            });
    }
    </script>
</body>
</html>

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
        fetch('formulariodinamico.php?archivo=json/formulariogenerico2.json')
            .then(r => r.text())
            .then(html => {
                // Extraer y evaluar los bloques <script> con window.fields y window.validacionesJSON usando regex
                const regex = /<script[^>]*>([\s\S]*?window\.(fields|validacionesJSON)[\s\S]*?)<\/script>/gi;
                let match;
                while ((match = regex.exec(html)) !== null) {
                    try { eval(match[1]); } catch(e) { console.error('Error evaluando script:', e); }
                }
                document.getElementById('contenedor-formulario').innerHTML = html;
                if (window.inicializarFormularioDinamico) window.inicializarFormularioDinamico();
            });
    }
    </script>
</body>
</html>

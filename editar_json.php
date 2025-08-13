 
<?php
if (isset($_GET['archivo'])) {
    $archivo = $_GET['archivo'];

    // Validar que el archivo existe y es un JSON
    if (file_exists($archivo) && pathinfo($archivo, PATHINFO_EXTENSION) === 'json') {
        $contenido = file_get_contents($archivo);
        $jsonData = json_decode($contenido, true); // Decodificar el JSON
    } else {
        die("El archivo no existe o no es un archivo JSON válido.");
    }

    // Actualizar contenido al enviar el formulario
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $nuevoContenido = $_POST['jsonContent'];
        $arrayData = json_decode($nuevoContenido, true);

        if ($arrayData !== null) { // Validar que la entrada es JSON válido
            file_put_contents($archivo, json_encode($arrayData, JSON_PRETTY_PRINT));
            echo "<p>El archivo fue actualizado exitosamente.</p>";
        } else {
            echo "<p>Error: La entrada no es un JSON válido.</p>";
        }
    }
} else {
    die("No se especificó un archivo para editar.");
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar JSON</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <h2>Editar Archivo JSON: <?php echo basename($archivo); ?></h2>
    <form method="POST">
        <textarea name="jsonContent" rows="20" style="width: 100%;"><?php echo htmlspecialchars(json_encode($jsonData, JSON_PRETTY_PRINT), ENT_QUOTES, 'UTF-8'); ?></textarea>
        <br>
        <button type="submit">Guardar Cambios</button>
    </form>
    <a href="index.php">Volver</a> <!-- Ajustar el enlace según tu página principal -->
</body>
</html>

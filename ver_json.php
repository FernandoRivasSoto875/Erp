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
} else {
    die("No se especificó un archivo para ver.");
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ver JSON</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <h2>Contenido del Archivo JSON: <?php echo basename($archivo); ?></h2>
    <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;"><?php echo htmlspecialchars(json_encode($jsonData, JSON_PRETTY_PRINT), ENT_QUOTES, 'UTF-8'); ?></pre>
    <a href="index.php">Volver</a> <!-- Ajustar el enlace según tu página principal -->
</body>
</html>

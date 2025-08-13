<?php
if (isset($_GET['archivo'])) {
    $archivo = $_GET['archivo'];

    // Validar que el archivo existe y es un JSON
    if (file_exists($archivo) && pathinfo($archivo, PATHINFO_EXTENSION) === 'json') {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            unlink($archivo); // Eliminar el archivo
            echo "<p>El archivo fue eliminado exitosamente.</p>";
            echo "<a href='index.php'>Volver</a>"; // Ajustar según tu página principal
            exit;
        }
    } else {
        die("El archivo no existe o no es un archivo JSON válido.");
    }
} else {
    die("No se especificó un archivo para eliminar.");
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eliminar JSON</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <h2>Eliminar Archivo JSON: <?php echo basename($archivo); ?></h2>
    <p>¿Estás seguro de que deseas eliminar este archivo?</p>
    <form method="POST">
        <button type="submit">Sí, eliminar</button>
    </form>
    <a href="index.php">Cancelar</a> <!-- Ajustar el enlace según tu página principal -->
</body>
</html>

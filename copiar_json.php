<?php
$mensaje = ''; // Inicializar el mensaje
$archivoOriginal = ''; // Inicializar la ruta del archivo original

if (isset($_GET['archivo'])) {
    $archivo = $_GET['archivo'];

    // Validar que el archivo existe y es un JSON
    if (file_exists($archivo) && pathinfo($archivo, PATHINFO_EXTENSION) === 'json') {
        $nombreArchivo = pathinfo($archivo, PATHINFO_FILENAME);
        $extArchivo = pathinfo($archivo, PATHINFO_EXTENSION);
        $rutaConfig = __DIR__ . '/config';

        // Sugerir un nuevo nombre con "_copia"
        $nombreSugerido = $nombreArchivo . '_copia.' . $extArchivo;

        // Manejo del formulario enviado
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $nuevoNombre = trim($_POST['nuevoNombre']); // Recoger el nuevo nombre del formulario

            // Construir ruta completa para la copia
            $nuevoArchivo = $rutaConfig . '/' . $nuevoNombre;

            if (file_exists($nuevoArchivo)) {
                $mensaje = "Error: Ya existe un archivo con ese nombre en la carpeta /config.";
            } elseif (copy($archivo, $nuevoArchivo)) {
                $mensaje = "El archivo fue copiado exitosamente.";
                $archivoOriginal = $archivo; // Guardar la ruta del archivo original
            } else {
                $mensaje = "Error: No se pudo copiar el archivo.";
            }
        }
    } else {
        die("El archivo no existe o no es un archivo JSON válido.");
    }
} else {
    die("No se especificó un archivo para copiar.");
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copiar JSON</title>
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <h2>Copiar Archivo JSON</h2>

    <?php if (!empty($mensaje)): ?>
        <p style="color: <?php echo ($mensaje === "El archivo fue copiado exitosamente.") ? 'green' : 'red'; ?>;">
            <?php echo $mensaje; ?>
        </p>
        <?php if ($mensaje === "El archivo fue copiado exitosamente." && !empty($archivoOriginal)): ?>
            <p>Archivo original: <a href="<?php echo htmlspecialchars($archivoOriginal, ENT_QUOTES, 'UTF-8'); ?>" target="_blank"><?php echo basename($archivoOriginal); ?></a></p>
        <?php endif; ?>
    <?php endif; ?>

    <form method="POST">
        <label for="nuevoNombre">Nuevo Nombre para el Archivo:</label>
        <input type="text" id="nuevoNombre" name="nuevoNombre" value="<?php echo htmlspecialchars($nombreSugerido, ENT_QUOTES, 'UTF-8'); ?>" style="width: 100%; margin-bottom: 10px;">
        <button type="submit">Copiar Archivo</button>
    </form>

    <a href="index.php">Volver</a>
</body>
</html>

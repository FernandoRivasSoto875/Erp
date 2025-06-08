<?php
// funcionessql.php
// Archivo de funciones para la conexión a la base de datos

function conexionBd() {
    // Ruta al archivo JSON
    $rutaJson = __DIR__ . '/json/conexion.json';

    // Leer el contenido del archivo JSON
    if (!file_exists($rutaJson)) {
        die("Error: No se encuentra el archivo de configuración $rutaJson");
    }
    $configJson = file_get_contents($rutaJson);

    // Decodificar el JSON
    $config = json_decode($configJson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        die("Error al decodificar el archivo JSON: " . json_last_error_msg());
    }

    // Extraer los datos del JSON
    $server   = $config['server']   ?? null;
    $username = $config['username'] ?? null;
    $password = $config['password'] ?? null;
    $database = $config['database'] ?? null;

    if (!$server || !$username || !$password || !$database) {
        die("Error: El archivo JSON de configuración está incompleto.");
    }

    // Conectar a la base de datos
    $conn = new mysqli($server, $username, $password, $database);
    if ($conn->connect_error) {
        die("Error de conexión: " . $conn->connect_error);
    }

    return $conn;
}

// Función para obtener ClienteDescripcion según el ClienteCodigo
function obtenerClienteDescripcion($codigo) {
    $conn = conexionBd();
    if ($conn->connect_error) {
        die("Error de conexión: " . $conn->connect_error);
    }

    $sql = "SELECT CiuDes FROM Ciudad WHERE CiuCod = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        die("Error al preparar la consulta: " . $conn->error);
    }
    $stmt->bind_param("s", $codigo); // 's' indica que el parámetro es de tipo string
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $descripcion = $row['CiuDes'];
    } else {
        $descripcion = "No se encontró la descripción para el código proporcionado.";
    }

    $stmt->close();
    $conn->close();

    return $descripcion;
}

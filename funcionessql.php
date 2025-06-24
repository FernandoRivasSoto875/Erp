 <?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);




// funcionessql.php
// Archivo de funciones para la conexión a la base de datos y utilidades SQL

function conexionBd() {
    $rutaJson = __DIR__ . '/json/conexion.json';
    if (!file_exists($rutaJson)) {
        die("Error: No se encuentra el archivo de configuración $rutaJson");
    }
    $configJson = file_get_contents($rutaJson);
    $config = json_decode($configJson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        die("Error al decodificar el archivo JSON: " . json_last_error_msg());
    }
    $server   = $config['server']   ?? null;
    $username = $config['username'] ?? null;
    $password = $config['password'] ?? null;
    $database = $config['database'] ?? null;
    if (!$server || !$username || !$password || !$database) {
        die("Error: El archivo JSON de configuración está incompleto.");
    }
    $conn = new mysqli($server, $username, $password, $database);
    if ($conn->connect_error) {
        die("Error de conexión: " . $conn->connect_error);
    }
    return $conn;
}

// Ejemplo de función auxiliar para obtener una descripción según un código
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
    $stmt->bind_param("s", $codigo);
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
?>
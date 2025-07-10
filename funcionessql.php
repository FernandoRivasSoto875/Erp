<?php // <-- ESTO DEBE SER LO PRIMERO EN EL ARCHIVO. SIN ESPACIOS NI LÍNEAS ANTES.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
/**
 * Establece y devuelve una conexión a la base de datos.
 * Utiliza un patrón Singleton (conexión única) para evitar múltiples conexiones
 * en una misma ejecución de página.
 *
 * @return mysqli La instancia de la conexión a la base de datos.
 */
function conexionBd() {
    // La variable estática mantiene su valor entre llamadas a la función.
    static $conn = null;
    // Si la conexión ya fue creada, la devolvemos directamente.
    if ($conn !== null) {
        return $conn;
    }
    // Si no, creamos la conexión por primera vez.
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
    $conn->set_charset("utf8");
    return $conn;
}
/**
 * Obtiene la descripción de una ciudad según su código.
 *
 * @param string $codigo El código de la ciudad (ej: 'STGO').
 * @return string La descripción de la ciudad o un mensaje de error.
 */
function obtenerDescripcionCiudad($codigo) {
    // Ahora esta llamada es súper eficiente.
    // La 1ra vez conecta, las siguientes solo devuelve la conexión existente.
    $conn = conexionBd();
    $descripcion = "Código no encontrado.";

    $sql = "SELECT CiuDes FROM Ciudad WHERE CiuCod = ?";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("s", $codigo);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $descripcion = $row['CiuDes'];
        }
        $stmt->close();
    }
    $conn->close();

    return $descripcion;
}
?>
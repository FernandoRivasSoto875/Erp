<?php
/**
 * =================================================================================
 *  BLOQUE DE PROTECCIÓN CONTRA DOBLE INCLUSIÓN
 * =================================================================================
 */
if (!function_exists('conexionBd')) {

    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    /**
     * Establece y devuelve una conexión a la base de datos (sin cambios).
     * @return mysqli La instancia de la conexión a la base de datos.
     */
    function conexionBd() {
        static $conn = null;
        if ($conn !== null) {
            return $conn;
        }
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
     * FUNCIÓN GENÉRICA Y DINÁMICA para obtener un valor de cualquier tabla.
     * Reemplaza a la antigua función 'obtenerDescripcionCiudad'.
     *
     * @param string $tabla La tabla de la base de datos a consultar.
     * @param string $campoValor El campo del que se quiere obtener el valor (ej: 'CiuDes').
     * @param string $campoClave El campo que se usará para filtrar en el WHERE (ej: 'CiuCod').
     * @param mixed  $valorClave El valor que se buscará en el campo clave.
     * @return string El valor encontrado o un mensaje de error.
     */
    function obtenerValorDeTabla($tabla, $campoValor, $campoClave, $valorClave) {
        $conn = conexionBd();
        $valorEncontrado = "Valor no encontrado";

        // Validar y escapar los nombres de tabla y campos para seguridad
        // Esto es una medida de seguridad básica para evitar inyecciones SQL en los nombres de las columnas/tablas.
        $tablaSegura = '`' . str_replace('`', '', $tabla) . '`';
        $campoValorSeguro = '`' . str_replace('`', '', $campoValor) . '`';
        $campoClaveSeguro = '`' . str_replace('`', '', $campoClave) . '`';

        $sql = "SELECT $campoValorSeguro FROM $tablaSegura WHERE $campoClaveSeguro = ?";
        $stmt = $conn->prepare($sql);

        if ($stmt) {
            // Asumimos que la clave es string "s". Se puede mejorar para detectar el tipo si es necesario.
            $stmt->bind_param("s", $valorClave);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $valorEncontrado = $row[str_replace('`', '', $campoValor)];
            }
            $stmt->close();
        } else {
            // Error en la preparación de la consulta, puede ser un nombre de tabla/campo inválido.
            $valorEncontrado = "Error en la consulta SQL.";
        }
        
        return $valorEncontrado;
    }

} // <-- FIN DEL BLOQUE DE PROTECCIÓN
?>
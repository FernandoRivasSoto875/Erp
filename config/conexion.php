<?php
function newConexion() {
    // Leer la configuración desde el archivo JSON
    $configPath = __DIR__ . '/conexion.json';
    if (!file_exists($configPath)) {
        die("Error: Archivo de configuración no encontrado en " . $configPath);
    }

    $config_json = file_get_contents($configPath);
    $config = json_decode($config_json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        die("Error: JSON de configuración inválido.");
    }

    $servidor = $config['servidor'];
    $usuario = $config['usuario'];
    $password = $config['password'];
    $base_datos = $config['base_datos'];

    // Crear la conexión
    $conn = new mysqli($servidor, $usuario, $password, $base_datos);

    // Comprobar la conexión
    if ($conn->connect_error) {
        // En un entorno de producción, no deberías mostrar el error detallado
        // por razones de seguridad. En su lugar, registra el error.
        error_log("Error de conexión a la base de datos: " . $conn->connect_error);
        // Devuelve null o maneja el error como prefieras.
        return null; 
    }

    // Establecer el juego de caracteres a UTF-8
    $conn->set_charset("utf8");

    return $conn;
}
?>

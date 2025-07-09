<?php
/**
 * VERSIÓN CORREGIDA Y SIMPLIFICADA
 * Acepta la cláusula 'where' como una cadena de texto simple enviada por el JavaScript.
 */

// --- 1. INCLUIR DEPENDENCIAS Y CONFIGURAR RESPUESTA ---
require_once '../funcionessql.php'; // Asegúrate de que esta ruta es correcta
header('Content-Type: application/json');

$response = ['resultado' => null, 'error' => null];
$conn = null;
$log_file = __DIR__ . '/debug_busqueda.log';

try {
    // --- 2. CONECTAR A LA BD ---
    $conn = conexionBd();
    if (!$conn) {
        throw new Exception("No se pudo establecer conexión con la base de datos.");
    }

    // --- 3. OBTENER Y VALIDAR DATOS DE ENTRADA ---
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log de los datos recibidos para depuración
    file_put_contents($log_file, "--- Petición: " . date('Y-m-d H:i:s') . " ---\n" . json_encode($data) . "\n", FILE_APPEND);

    // Validación corregida: 'where' debe ser un string.
    if (!$data || !isset($data['tabla']) || !isset($data['campo']) || !isset($data['where']) || !is_string($data['where'])) {
        throw new Exception("Datos de búsqueda inválidos. Se esperaba 'where' como string.");
    }

    // --- 4. LISTA BLANCA DE SEGURIDAD (¡MUY IMPORTANTE!) ---
    $tablas_permitidas = ['Comuna', 'Mps', 'productos', 'clientes']; // <-- ¡AÑADE TUS TABLAS AQUÍ!
    
    $tabla = $data['tabla'];
    $campo_a_buscar = $data['campo'];
    $where_sql = $data['where'];

    if (!in_array($tabla, $tablas_permitidas)) {
        throw new Exception("Acceso a la tabla no permitido: " . $tabla);
    }
    // Podrías añadir una validación similar para $campo_a_buscar si es necesario.


    // --- 5. CONSTRUIR Y EJECUTAR CONSULTA DIRECTA (SEGURA GRACIAS A LA LISTA BLANCA) ---
    
    // Escapar nombres de tabla y campo para seguridad adicional
    $tabla_segura = "`" . $conn->real_escape_string($tabla) . "`";
    $campo_seguro = "`" . $conn->real_escape_string($campo_a_buscar) . "`";
    
    // La cláusula WHERE ya viene preparada desde el JavaScript
    $sql = "SELECT $campo_seguro FROM $tabla_segura WHERE $where_sql LIMIT 1";

    // Log de la consulta final
    file_put_contents($log_file, "SQL Ejecutado: " . $sql . "\n", FILE_APPEND);

    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $response['resultado'] = $row[$campo_a_buscar];
        file_put_contents($log_file, "Dato encontrado: " . $response['resultado'] . "\n", FILE_APPEND);
    } else {
        // Si no hay resultado, el valor de 'resultado' se queda en null, 
        // y el JS lo convertirá en "no encontrado".
        file_put_contents($log_file, "No se encontró ningún dato para la consulta.\n", FILE_APPEND);
    }

} catch (Exception $e) {
    // --- 6. MANEJO DE ERRORES ---
    http_response_code(400); // Bad Request
    $response['error'] = $e->getMessage();
    file_put_contents($log_file, "ERROR: " . $e->getMessage() . "\n", FILE_APPEND);

} finally {
    // --- 7. CERRAR CONEXIÓN Y ENVIAR RESPUESTA ---
    if ($conn) {
        $conn->close();
    }
    echo json_encode($response);
}
?>
<?php
// filepath: c:\Respaldos Mensuales\Mis Documentos\Sitios\Set\Sitio Web\Erp\ajax\busqueda_formula.php

// --- 1. INCLUIR DEPENDENCIAS Y CONFIGURAR RESPUESTA ---
require_once '../funcionessql.php'; // Asegúrate de que esta ruta es correcta
header('Content-Type: application/json');

$response = ['resultado' => null, 'error' => null];
$conn = null; // Inicializar la conexión como nula

// --- INICIO: LÍNEAS DE DEPURACIÓN ---
$log_file = __DIR__ . '/debug_busqueda.log';
file_put_contents($log_file, "--- Nueva Petición: " . date('Y-m-d H:i:s') . " ---\n", FILE_APPEND);
// --- FIN: LÍNEAS DE DEPURACIÓN ---

try {
    // --- 2. CONECTAR A LA BD ---
    $conn = conexionBd();
    if (!$conn) {
        throw new Exception("No se pudo establecer conexión con la base de datos.");
    }

    // --- 3. OBTENER Y VALIDAR DATOS DE ENTRADA ---
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['tabla']) || !isset($data['campo']) || !isset($data['where']) || !is_array($data['where'])) {
        throw new Exception("Datos de búsqueda inválidos o incompletos.");
    }

    // --- 4. LISTA BLANCA DE SEGURIDAD (¡MUY IMPORTANTE!) ---
    // Define aquí las tablas y campos que se pueden consultar a través de esta API.
    // Esto previene que alguien intente consultar tablas sensibles como 'usuarios'.
    $tablas_permitidas = ['Comuna', 'Mps', 'productos', 'clientes']; // <-- ¡AÑADE TUS TABLAS AQUÍ!
    
    $tabla = $data['tabla'];
    $campo = $data['campo'];

    if (!in_array($tabla, $tablas_permitidas)) {
        throw new Exception("Acceso a la tabla no permitido.");
    }
    // Podrías hacer lo mismo para los campos si quieres ser aún más estricto.

    // --- 5. CONSTRUIR CONSULTA PREPARADA DE FORMA SEGURA ---
    $where_array = $data['where'];
    $condiciones = [];
    $valores = [];
    $tipos = '';

    foreach ($where_array as $columna => $valor) {
        // Seguridad: Asegurarse de que el nombre de la columna es seguro.
        $columna_segura = preg_replace('/[^a-zA-Z0-9_]/', '', $columna);
        $condiciones[] = "`" . $columna_segura . "` = ?";
        $valores[] = $valor;
        $tipos .= 's'; // Asumimos string por defecto. Cambia si manejas números ('i' o 'd').
    }

    if (empty($condiciones)) {
        throw new Exception("No se especificaron condiciones de búsqueda.");
    }
    
    $whereSql = implode(' AND ', $condiciones);

    // Los nombres de tabla y campo se validaron con la lista blanca, ahora es seguro usarlos.
    $sql = "SELECT `" . $campo . "` FROM `" . $tabla . "` WHERE " . $whereSql . " LIMIT 1";

    // --- INICIO: LÍNEAS DE DEPURACIÓN ---
    $log_message = "SQL: " . $sql . "\n";
    $log_message .= "Tipos: " . $tipos . "\n";
    $log_message .= "Valores: " . json_encode($valores) . "\n";
    file_put_contents($log_file, $log_message, FILE_APPEND);
    // --- FIN: LÍNEAS DE DEPURACIÓN ---

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        // --- INICIO: LÍNEAS DE DEPURACIÓN ---
        file_put_contents($log_file, "Error al preparar: " . $conn->error . "\n", FILE_APPEND);
        // --- FIN: LÍNEAS DE DEPURACIÓN ---
        throw new Exception("Error al preparar la consulta: " . $conn->error);
    }

    $stmt->bind_param($tipos, ...$valores);
    $stmt->execute();
    $stmt->bind_result($resultado_db);

    if ($stmt->fetch()) {
        $response['resultado'] = $resultado_db;
    }
    
    $stmt->close();

} catch (Exception $e) {
    // --- 6. MANEJO CENTRALIZADO DE ERRORES ---
    http_response_code(400); // Bad Request
    $response['error'] = $e->getMessage();

} finally {
    // --- 7. CERRAR CONEXIÓN Y ENVIAR RESPUESTA ---
    if ($conn) {
        $conn->close();
    }
    echo json_encode($response);
}
?>
<?php
header('Content-Type: application/json');
include 'funcionessql.php';

// Conectar a la base de datos
$conn = conexionBd();
if ($conn->connect_error) {
    die(json_encode(["error" => "Error de conexión a la base de datos: " . $conn->connect_error]));
}

// Recibir el nombre de la tabla principal vía GET
$table = $_GET['table_name'] ?? null;
if (!$table) {
    die(json_encode(["error" => "No se proporcionó el parámetro 'table_name'."]));
}

// Obtener las columnas nativas (baseColumns) a través de SHOW COLUMNS
$baseColumns = [];
$resBase = $conn->query("SHOW COLUMNS FROM `$table`");
if ($resBase) {
    while ($row = $resBase->fetch_assoc()){
        $baseColumns[] = $row['Field'];
    }
    $resBase->free();
}

/**
 * Obtiene la llave primaria de una tabla.
 */
function getPrimaryKey($conn, $table) {
    $sql = "SHOW COLUMNS FROM `$table`";
    $result = $conn->query($sql);
    $pk = null;
    if ($result) {
        while ($col = $result->fetch_assoc()) {
            if ($col['Key'] === 'PRI') {
                $pk = $col['Field'];
                break;
            }
        }
    }
    return $pk;
}

/**
 * Determina si una columna es llave foránea (relación muchos a uno).
 * Retorna un arreglo con:
 *    - related_table: la tabla referenciada.
 *    - ref_col: la columna referenciada (normalmente la PK de la tabla padre).
 * O null si no lo es.
 */
function getForeignKeyInfo($conn, $table, $column) {
    $sql = "SELECT REFERENCED_TABLE_NAME AS related_table, REFERENCED_COLUMN_NAME AS ref_col 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = '$table' AND COLUMN_NAME = '$column' 
              AND REFERENCED_TABLE_NAME IS NOT NULL 
              AND TABLE_SCHEMA = DATABASE()";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

/**
 * Obtiene las relaciones uno a muchos (tablas hijas) que referencian a $table.
 */
function getChildRelations($conn, $table) {
    $relations = [];
    $sql = "SELECT DISTINCT TABLE_NAME AS child_table, COLUMN_NAME AS child_fk
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_NAME = '$table'
              AND TABLE_SCHEMA = DATABASE()";
    $result = $conn->query($sql);
    if($result) {
        while ($row = $result->fetch_assoc()){
            $relations[] = $row;
        }
    }
    return $relations;
}

/**
 * Función recursiva para construir la cláusula SELECT y los JOIN para aplanar la información.
 *
 * Parámetros:
 *  - $conn: Conexión a la base de datos.
 *  - $table: Tabla actual a procesar.
 *  - $alias: Alias que se usará para esa tabla en el query.
 *  - &$columns: Arreglo (por referencia) que se llenará con los nombres de columna de salida.
 *  - &$processed: Arreglo asociativo de tablas ya procesadas (para evitar duplicar JOINs).
 *  - &$aliasCounter: Contador para generar alias únicos.
 *
 * Retorna un arreglo con dos claves:
 *   "select" => Arreglo de expresiones para la cláusula SELECT.
 *   "joins"  => Arreglo de cláusulas JOIN.
 */
function buildFlatQuery($conn, $table, $alias, &$columns, &$processed, &$aliasCounter) {
    if (isset($processed[$table])) {
        return ["select" => [], "joins" => []];
    }
    // ...continúa la lógica para construir el query...
}

// Aquí iría el resto de la lógica para procesar y devolver los datos en formato JSON

$conn->close();
?>

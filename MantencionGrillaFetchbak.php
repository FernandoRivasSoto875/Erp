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
 * Si lo es, retorna un arreglo con:
 *    - related_table: la tabla referenciada.
 *    - ref_col: la columna referenciada (normalmente la PK de la tabla padre).
 * Si no es llave foránea, retorna null.
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
 * Obtiene las relaciones uno a muchos, es decir, las tablas que tienen una columna foránea que referencia a $table.
 */
function getChildRelations($conn, $table) {
    $relations = [];
    $sql = "SELECT TABLE_NAME AS child_table, COLUMN_NAME AS child_fk
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
 * Los parámetros:
 *  - $conn: conexión a la base de datos.
 *  - $table: tabla actual a procesar.
 *  - $alias: alias que se usará para esa tabla en el query.
 *  - &$columns: arreglo (por referencia) que se llenará con los nombres de columna de salida.
 *  - &$processed: arreglo de nombres de tablas ya procesadas (para evitar ciclos).
 *  - &$aliasCounter: contador para generar alias únicos.
 * 
 * Retorna un arreglo con dos claves:
 *   "select" => arreglo de expresiones para la cláusula SELECT.
 *   "joins"  => arreglo de cláusulas JOIN.
 */
function buildFlatQuery($conn, $table, $alias, &$columns, &$processed, &$aliasCounter) {
    if (in_array($table, $processed)) {
        return ["select" => [], "joins" => []];
    }
    $processed[] = $table; // marca la tabla como procesada
    
    $selects = [];
    $joins = [];
    
    // Obtener las columnas de la tabla en el orden definido
    $sql = "SHOW COLUMNS FROM `$table`";
    $res = $conn->query($sql);
    if (!$res) {
        return ["select" => $selects, "joins" => $joins];
    }
    
    while ($col = $res->fetch_assoc()) {
        $colName = $col['Field'];
        // Verificar si la columna es llave foránea (muchos a uno)
        $fkInfo = getForeignKeyInfo($conn, $table, $colName);
        if ($fkInfo) {
            // Procesar la relación muchos a uno:
            // Se hace JOIN con la tabla referenciada (padre) para obtener sus atributos (sin incluir columnas llave).
            $parentTable = $fkInfo['related_table'];
            if (!in_array($parentTable, $processed)) {
                $aliasCounter++;
                $parentAlias = $parentTable . "_" . $aliasCounter;
                $joins[] = "LEFT JOIN `$parentTable` AS `$parentAlias` ON `$alias`.`$colName` = `$parentAlias`.`" . $fkInfo['ref_col'] . "`";
                // Incorporar las columnas de la tabla padre que NO sean llave (manteniendo el nombre original)
                $resParent = $conn->query("SHOW COLUMNS FROM `$parentTable`");
                if ($resParent) {
                    while ($pcol = $resParent->fetch_assoc()){
                        if ($pcol['Key'] !== "") continue;
                        $outName = $pcol['Field'];
                        $selects[] = "`$parentAlias`.`" . $pcol['Field'] . "` AS `$outName`";
                        $columns[] = $outName;
                    }
                }
                // Llamada recursiva para incluir más relaciones en la tabla padre.
                $resultParent = buildFlatQuery($conn, $parentTable, $parentAlias, $columns, $processed, $aliasCounter);
                $selects = array_merge($selects, $resultParent['select']);
                $joins = array_merge($joins, $resultParent['joins']);
            }
            // No se incluye la columna FK original, pues se reemplaza por la información de la tabla padre.
        } else {
            // Columna normal: se incluye con su nombre original.
            $outName = $colName;
            $selects[] = "`$alias`.`$colName` AS `$outName`";
            $columns[] = $outName;
        }
    }
    
    // Procesar relaciones uno a muchos (tablas hijas)
    $childRels = getChildRelations($conn, $table);
    $pk = getPrimaryKey($conn, $table);
    if ($pk) {
        foreach ($childRels as $rel) {
            $childTable = $rel['child_table'];
            if (in_array($childTable, $processed)) continue;
            $aliasCounter++;
            $childAlias = $childTable . "_" . $aliasCounter;
            $joins[] = "LEFT JOIN `$childTable` AS `$childAlias` ON `$alias`.`$pk` = `$childAlias`.`" . $rel['child_fk'] . "`";
            // Incorporar las columnas de la tabla hija que NO sean llave, usando su nombre original.
            $resChild = $conn->query("SHOW COLUMNS FROM `$childTable`");
            if ($resChild) {
                while ($cCol = $resChild->fetch_assoc()){
                    if ($cCol['Key'] !== "") continue;
                    $outName = $cCol['Field'];
                    $selects[] = "`$childAlias`.`" . $cCol['Field'] . "` AS `$outName`";
                    $columns[] = $outName;
                }
            }
            $resultChild = buildFlatQuery($conn, $childTable, $childAlias, $columns, $processed, $aliasCounter);
            $selects = array_merge($selects, $resultChild['select']);
            $joins = array_merge($joins, $resultChild['joins']);
        }
    }
    
    return ["select" => $selects, "joins" => $joins];
}

// --- Construcción del query final ---
$processed = [];
$aliasCounter = 0;
$columnsOutput = [];
$resultParts = buildFlatQuery($conn, $table, $table, $columnsOutput, $processed, $aliasCounter);
$selectClause = implode(", ", $resultParts["select"]);
$joinClause = implode(" ", $resultParts["joins"]);

$finalQuery = "SELECT $selectClause FROM `$table` AS `$table` $joinClause";

// Ejecutar el query y recopilar los datos
$data = [];
$qResult = $conn->query($finalQuery);
if ($qResult) {
    while ($row = $qResult->fetch_assoc()){
        $data[] = $row;
    }
}
$conn->close();

// Devolver el resultado (solo "columns" y "data")
echo json_encode(["columns" => $columnsOutput, "data" => $data]);
?>

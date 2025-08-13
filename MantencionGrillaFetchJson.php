<?php
header('Content-Type: application/json');
include 'funcionessql.php';  // Se asume que en este archivo está la función conexionBd()

/*===========================
  CONEXIÓN A LA BASE DE DATOS
===========================*/
$conn = conexionBd();
if ($conn->connect_error) {
    $estadoConsulta[] = "Error de conexión a la base de datos: " . $conn->connect_error;
    die(json_encode([
        "estadoconsulta" => [$estadoConsulta],
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

/*==============================
  INICIALIZAR VARIABLES DE ESTADO
==============================*/
$estadoConsulta   = [];
$debugQueryParts  = []; // Se guardarán las partes del query
$tablaColumnas    = []; // Se guardarán las columnas de cada tabla involucrada
$joins            = []; // Aquí se almacenarán los JOIN generados

/*======================================
  RECIBIR Y DECODIFICAR PARÁMETROS
======================================*/
$parametrosRaw = $_GET['Parametros'] ?? null;
if (!$parametrosRaw) {
    $estadoConsulta[] = "No se proporcionó el parámetro 'Parametros'.";
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $parametrosRaw
    ]));
}

$parametrosDecoded = json_decode($parametrosRaw, true);
if (
    !$parametrosDecoded ||
    !isset($parametrosDecoded['tablas']) ||
    !isset($parametrosDecoded['Donde']) ||
    !isset($parametrosDecoded['Orden'])
) {
    $estadoConsulta[] = "El JSON de 'Parametros' está mal formado o faltan atributos requeridos.";
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

/*=======================================
  CONFIGURACIONES: OBTENER LA TABLA BASE
=======================================*/
$tablas           = $parametrosDecoded['tablas'];  // Es un arreglo; el primer elemento es la tabla base
$tablaBase        = $tablas[0] ?? null;
$otrasTablas      = array_slice($tablas, 1);         // Puede estar vacío, tener "*" o nombres explícitos
$condicionesWhere = $parametrosDecoded['Donde'];
$ordenQuery       = $parametrosDecoded['Orden'];

if (!$tablaBase) {
    $estadoConsulta[] = "No se proporcionó la tabla base en 'tablas'.";
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

/*================================
  VALIDAR LA EXISTENCIA DE LA TABLA BASE
================================*/
$resBase = $conn->query("SHOW TABLES LIKE '$tablaBase'");
if (!$resBase || $resBase->num_rows === 0) {
    $estadoConsulta[] = "La tabla base '$tablaBase' no existe en la base de datos.";
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

/*=========================================
  OBTENER LAS COLUMNAS DE LA TABLA BASE
  Y DETERMINAR SU CLAVE PRIMARIA
=========================================*/
$tablaColumnas[$tablaBase] = [];
$clavePrimaria = null;
$resCols = $conn->query("SHOW COLUMNS FROM `$tablaBase`");
if ($resCols) {
    while ($row = $resCols->fetch_assoc()) {
        $tablaColumnas[$tablaBase][] = $row['Field'];
        if ($row['Key'] === "PRI") {
            $clavePrimaria = $row['Field'];
        }
    }
    $resCols->free();
} else {
    $estadoConsulta[] = "No se pudieron obtener columnas de la tabla base '$tablaBase'.";
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

/*=====================================================================
  GENERAR LOS JOIN
  Tenemos tres casos:
  1) Si no hay tablas adicionales: se usa solo la tabla base.
  2) Si se especifica "*" en "otrasTablas": se generan TODOS los JOIN,
     primero las relaciones FK→PK (las claves foráneas de la tabla base)
     y luego las relaciones PK→FK (otras tablas que referencian la PK de la base).
  3) Si se especifican nombres explícitos en "otrasTablas": para cada uno se intenta
     encontrar la relación en ambas direcciones y se genera el JOIN correspondiente.
=====================================================================*/
if (count($otrasTablas) > 0) {
    // Si "*" aparece, se generan todos los JOIN posibles
    if (in_array("*", $otrasTablas)) {
        // 1. Relación FK→PK: Claves foráneas en la tabla base referencian a la PK de otra tabla.
        $sqlFkPk = "SELECT REFERENCED_TABLE_NAME AS related_table, 
                         COLUMN_NAME AS fk_column, 
                         REFERENCED_COLUMN_NAME AS pk_column
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_NAME = '$tablaBase'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                      AND TABLE_SCHEMA = DATABASE()";
        $resFkPk = $conn->query($sqlFkPk);
        if ($resFkPk && $resFkPk->num_rows > 0) {
            while ($rel = $resFkPk->fetch_assoc()) {
                $relatedTable = $rel['related_table'];
                $fkColumn     = $rel['fk_column'];   // Columna en la tabla base
                $pkColumn     = $rel['pk_column'];   // Columna en la tabla relacionada
                $joins[] = "LEFT JOIN `$relatedTable` ON `$tablaBase`.`$fkColumn` = `$relatedTable`.`$pk_column`";
                // Nota: Usamos la PK de la tabla relacionada para unir
                $joins[count($joins)-1] = "LEFT JOIN `$relatedTable` ON `$tablaBase`.`$fkColumn` = `$relatedTable`.`$pkColumn`";
                if (!isset($tablaColumnas[$relatedTable])) {
                    $tablaColumnas[$relatedTable] = [];
                    $resColsRel = $conn->query("SHOW COLUMNS FROM `$relatedTable`");
                    if ($resColsRel) {
                        while ($col = $resColsRel->fetch_assoc()) {
                            $tablaColumnas[$relatedTable][] = $col['Field'];
                        }
                    } else {
                        $estadoConsulta[] = "No se pudieron obtener columnas de '$relatedTable' (FK→PK).";
                    }
                }
            }
        } else {
            $estadoConsulta[] = "No se encontraron relaciones FK→PK para '$tablaBase'.";
        }
        // 2. Relación PK→FK: Otras tablas tienen claves foráneas que referencian a la PK de la tabla base.
        $sqlPkFk = "SELECT TABLE_NAME AS related_table, 
                         COLUMN_NAME AS fk_column, 
                         REFERENCED_COLUMN_NAME AS pk_column
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE REFERENCED_TABLE_NAME = '$tablaBase'
                      AND TABLE_SCHEMA = DATABASE()";
        $resPkFk = $conn->query($sqlPkFk);
        if ($resPkFk && $resPkFk->num_rows > 0) {
            while ($rel = $resPkFk->fetch_assoc()) {
                $relatedTable = $rel['related_table'];
                $fkColumn     = $rel['fk_column'];   // Columna en la tabla relacionada
                $pkColumn     = $rel['pk_column'];   // Columna en la tabla base
                $joins[] = "LEFT JOIN `$relatedTable` ON `$tablaBase`.`$pkColumn` = `$relatedTable`.`$fkColumn`";
                if (!isset($tablaColumnas[$relatedTable])) {
                    $tablaColumnas[$relatedTable] = [];
                    $resColsRel = $conn->query("SHOW COLUMNS FROM `$relatedTable`");
                    if ($resColsRel) {
                        while ($col = $resColsRel->fetch_assoc()) {
                            $tablaColumnas[$relatedTable][] = $col['Field'];
                        }
                    } else {
                        $estadoConsulta[] = "No se pudieron obtener columnas de '$relatedTable' (PK→FK).";
                    }
                }
            }
        } else {
            $estadoConsulta[] = "No se encontraron relaciones PK→FK para '$tablaBase'.";
        }
    } else {
        // Se especificaron nombres de tablas explícitos
        foreach ($otrasTablas as $relatedTable) {
            if (empty($relatedTable)) continue;
            $encontrado = false;
            // Primer intento: Buscar que la tabla base tenga una FK que refiera a relatedTable (FK→PK)
            $sqlExp = "SELECT REFERENCED_TABLE_NAME AS related_table, COLUMN_NAME AS fk_column, 
                              REFERENCED_COLUMN_NAME AS pk_column
                       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                       WHERE TABLE_NAME = '$tablaBase'
                         AND REFERENCED_TABLE_NAME = '$relatedTable'
                         AND TABLE_SCHEMA = DATABASE()";
            $resExp = $conn->query($sqlExp);
            if ($resExp && $resExp->num_rows > 0) {
                $rel = $resExp->fetch_assoc();
                $fkColumn = $rel['fk_column'];
                $pkColumn = $rel['pk_column'];
                $joins[] = "LEFT JOIN `$relatedTable` ON `$tablaBase`.`$fkColumn` = `$relatedTable`.`$pkColumn`";
                $encontrado = true;
                if (!isset($tablaColumnas[$relatedTable])) {
                    $tablaColumnas[$relatedTable] = [];
                    $resColsRel = $conn->query("SHOW COLUMNS FROM `$relatedTable`");
                    if ($resColsRel) {
                        while ($col = $resColsRel->fetch_assoc()) {
                            $tablaColumnas[$relatedTable][] = $col['Field'];
                        }
                    } else {
                        $estadoConsulta[] = "No se pudieron obtener columnas de '$relatedTable' (explicito FK→PK).";
                    }
                }
            } else {
                // Segundo intento: Buscar que relatedTable tenga una FK que refiera a la tabla base (PK→FK)
                $sqlExp2 = "SELECT TABLE_NAME AS related_table, COLUMN_NAME AS fk_column, 
                                   REFERENCED_COLUMN_NAME AS pk_column
                            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                            WHERE TABLE_NAME = '$relatedTable'
                              AND REFERENCED_TABLE_NAME = '$tablaBase'
                              AND TABLE_SCHEMA = DATABASE()";
                $resExp2 = $conn->query($sqlExp2);
                if ($resExp2 && $resExp2->num_rows > 0) {
                    $rel = $resExp2->fetch_assoc();
                    $fkColumn = $rel['fk_column'];  // Columna en relatedTable
                    $pkColumn = $rel['pk_column'];  // Columna en la tabla base
                    $joins[] = "LEFT JOIN `$relatedTable` ON `$tablaBase`.`$pkColumn` = `$relatedTable`.`$fkColumn`";
                    $encontrado = true;
                    if (!isset($tablaColumnas[$relatedTable])) {
                        $tablaColumnas[$relatedTable] = [];
                        $resColsRel = $conn->query("SHOW COLUMNS FROM `$relatedTable`");
                        if ($resColsRel) {
                            while ($col = $resColsRel->fetch_assoc()) {
                                $tablaColumnas[$relatedTable][] = $col['Field'];
                            }
                        } else {
                            $estadoConsulta[] = "No se pudieron obtener columnas de '$relatedTable' (explicito PK→FK).";
                        }
                    }
                }
            }
            if (!$encontrado) {
                $estadoConsulta[] = "No se encontró relación entre '$tablaBase' y '$relatedTable'.";
            }
        }
    }
}

/*=============================================
  CONSTRUCCIÓN DEL SELECT Y COMPONENTES DEL QUERY
=============================================*/
// Unir las columnas de la tabla base y de las tablas relacionadas
$columnsOutput = [];
foreach ($tablaColumnas as $tabla => $cols) {
    foreach ($cols as $col) {
        $columnsOutput[] = "`$tabla`.`$col`";
    }
}
$debugQueryParts['SELECT'] = "SELECT " . implode(", ", $columnsOutput);

// Construir FROM + JOIN
$joinClause = implode(" ", $joins);
$debugQueryParts['FROM_JOIN'] = "FROM `$tablaBase` " . $joinClause;

// cláusula WHERE (si se definió)
$whereClause = !empty($condicionesWhere) ? "WHERE " . $condicionesWhere : "";
$debugQueryParts['WHERE'] = $whereClause;

// cláusula ORDER BY: si se define se usa; de lo contrario se ordena por la PK de la tabla base (si existe)
$orderByClause = !empty($ordenQuery)
    ? "ORDER BY " . $ordenQuery
    : ($clavePrimaria ? "ORDER BY `$tablaBase`.`$clavePrimaria` ASC" : "");
$debugQueryParts['ORDER_BY'] = $orderByClause;

// Armar el query final
$finalQuery = trim(implode(" ", $debugQueryParts));
$debugQueryParts['FINAL_QUERY'] = $finalQuery;

/*==============================
  EJECUTAR EL QUERY
==============================*/
$data = [];
$qResult = $conn->query($finalQuery);
if ($qResult) {
    while ($row = $qResult->fetch_assoc()) {
        $data[] = $row;
    }
} else {
    $estadoConsulta[] = "No se pudieron obtener datos del query generado.";
}
$conn->close();

/*================================
  RETORNAR EL JSON DE RESULTADO
================================*/
echo json_encode([
    "estadoconsulta" => $estadoConsulta,
    "parametrosIn"   => $_GET['Parametros'], // Se refleja el JSON original enviado
    "debugQuery"     => $debugQueryParts,      // Todas las partes para depuración
    "columns"        => $columnsOutput,
    "baseColumns"    => $tablaColumnas[$tablaBase],
    "data"           => $data
]);
?>

// https://www.saludenterreno.cl/sitio/MantencionGrillaFetchJson.php?Parametros=%7B%22tablas%22%3A%5B%22Persona%22%2C%22TA2%22%2C%22TA3%22%2C%22TA4%22%2C%22TA5%22%2C%22TA6%22%5D%2C%22Donde%22%3A%22%22%2C%22Orden%22%3A%22%22%7D
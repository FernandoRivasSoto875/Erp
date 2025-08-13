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

/*===============================
  INICIALIZAR VARIABLES DE ESTADO
===============================*/
$estadoConsulta   = [];
$debugQueryParts  = []; // Se guardarán las partes del query
$tablaColumnas    = []; // Se guardarán las columnas de cada tabla involucrada
$joins            = []; // Aquí se almacenarán los JOIN generados

/*=====================================
  RECIBIR Y DECODIFICAR PARÁMETROS
=====================================*/
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

/*======================================
  CONFIGURACIONES: OBTENER LA TABLA BASE
======================================*/
$tablas           = $parametrosDecoded['tablas'];  // Es un arreglo; el primer elemento es la tabla base
$tablaBase        = $tablas[0] ?? null;
$otrasTablas      = array_slice($tablas, 1);         // Puede estar vacío, tener "*" o nombres explícitos
$condicionesWhere = $parametrosDecoded['Donde'];
$ordenQuery       = $parametrosDecoded['Orden'];

if (!$tablaBase) {
    $estadoConsulta[] = "No se proporcionó la tabla base en 'tablas'.;
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
    $estadoConsulta[] = "No se pudieron obtener columnas de la tabla base '$tablaBase'.;
    die(json_encode([
        "estadoconsulta" => $estadoConsulta,
        "parametrosIn"   => $_GET['Parametros']
    ]));
}

// ...continúa la lógica para procesar y devolver los datos en formato JSON

$conn->close();
?>

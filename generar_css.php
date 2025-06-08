<?php
// Ruta del archivo JSON
$archivoJson = __DIR__ . '/json/parametro.json';
if (!file_exists($archivoJson)) {
    die("Error: No se encuentra el archivo json/parametro.json.");
}

// Leer y decodificar el JSON
$json = json_decode(file_get_contents($archivoJson), true);

// Verificar si existe la variable ColoresDiseñoPorDefecto
if (!isset($json['ColoresDiseñoPorDefecto']) || !isset($json['ColoresDiseño'])) {
    die("Error: No se encuentra la configuración de colores en el JSON.");
}

// Obtener el índice por defecto
$indice = (int) $json['ColoresDiseñoPorDefecto'];

// Seleccionar la variación correspondiente
if (!isset($json['ColoresDiseño'][$indice])) {
    die("Error: Índice de variación inválido en ColoresDiseño.");
}
$variacion = $json['ColoresDiseño'][$indice];

// Generar el bloque actualizado para :root
$variablesCss = ":root {\n";
foreach ($variacion as $key => $value) {
    if ($key !== 'nombre') { // Ignorar el nombre de la variación
        $variablesCss .= "    --$key: $value;\n";
    }
}
$variablesCss .= "}\n";

// Ruta del archivo estilos.css
$archivoCss = __DIR__ . '/css/estilos.css';

// Leer el contenido existente de estilos.css
$contenidoExistente = file_exists($archivoCss) ? file_get_contents($archivoCss) : "";

// Separar el bloque :root y el resto del contenido
if (strpos($contenidoExistente, ":root {") !== false) {
    // Si existe un bloque :root, reemplazarlo
    $contenidoFinal = preg_replace("/:root\s*\{[^}]*\}/", $variablesCss, $contenidoExistente);
} else {
    // Si no existe, agregar el bloque :root al inicio
    $contenidoFinal = $variablesCss . "\n" . $contenidoExistente;
}

// Escribir el contenido actualizado en estilos.css
if (file_put_contents($archivoCss, $contenidoFinal)) {
   // echo "Archivo estilos.css actualizado con la variación: " . $variacion['nombre'] . "\n";
} else {
  //  echo "Error: No se pudo escribir en estilos.css.\n";
}


?>

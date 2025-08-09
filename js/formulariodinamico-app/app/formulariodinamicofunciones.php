<?php
// filepath: formulariodinamico-app/app/formulariodinamicofunciones.php

function generarContenedorFueraDelFormulario($elementos_fuera, $fieldsets, $params = [], $isDesignMode = false) {
    // Implementación de la función para generar el contenedor de elementos fuera del formulario
}

function generarLayout($layout, $fieldsets, $params = [], $isDesignMode = false) {
    // Implementación de la función para generar el layout del formulario
}

function obtenerEstructuraJson($json_data) {
    return json_encode($json_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function editarPropiedadJson(&$json_data, $path, $new_value) {
    $keys = explode('.', $path);
    $temp = &$json_data;

    foreach ($keys as $key) {
        if (!isset($temp[$key])) {
            return false; // La propiedad no existe
        }
        $temp = &$temp[$key];
    }

    $temp = $new_value;
    return true; // Edición exitosa
}
?>
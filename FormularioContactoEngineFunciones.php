<?php
// File: FormularioContactoEngineFunciones.php
// Helper functions for FormularioContactoEngine.php

/**
 * Genera el HTML para un grupo de campos y sus hijos recursivamente.
 * @param array $grupos Array de grupos del JSON.
 * @return string HTML generado.
 */
function generarGrupos(array $grupos): string {
    $html = '';
    foreach ($grupos as $grupo) {
        if (!($grupo['activo'] ?? false)) continue;

        $grupoAlineacionClass = ($grupo['grupoAlineacion'] ?? 'columna') === 'fila' ? 'row' : '';
        $html .= "<div class='form-group-custom' style='" . htmlspecialchars($grupo['estilo'] ?? '') . "'>";
        $html .= "<h3 class='form-group-title'>" . htmlspecialchars($grupo['grupoNombre'] ?? '') . "</h3>";
        $html .= "<div class='$grupoAlineacionClass'>";

        foreach ($grupo['campos'] ?? [] as $campo) {
            $html .= generarCampo($campo, $grupo['alineacion'] ?? 'columna');
        }
        
        $html .= "</div>"; // Cierre de $grupoAlineacionClass

        // Recursividad para grupos hijos
        if (!empty($grupo['hijos'])) {
            $html .= generarGrupos($grupo['hijos']);
        }

        $html .= "</div>";
    }
    return $html;
}

/**
 * Genera el HTML para un único campo de formulario.
 * @param array $campo Array con la definición del campo.
 * @param string $alineacionPadre Alineación del grupo padre ('fila' o 'columna').
 * @return string HTML del campo.
 */
function generarCampo(array $campo, string $alineacionPadre): string {
    if (!($campo['activo'] ?? false)) return '';

    $nombre = htmlspecialchars($campo['nombre'] ?? uniqid());
    $etiqueta = htmlspecialchars($campo['etiqueta'] ?? '');
    $tipo = $campo['tipo'] ?? 'text';
    $placeholder = htmlspecialchars($campo['placeholder'] ?? '');
    $requerido = ($campo['requerido'] ?? false) ? 'required' : '';
    $estilo = htmlspecialchars($campo['estilo'] ?? '');
    $tooltip = htmlspecialchars($campo['tooltipText'] ?? '');
    $id = "form_" . $nombre;

    $colClass = $alineacionPadre === 'fila' ? 'col-md-6' : 'col-12'; // Bootstrap grid
    $html = "<div class='form-group {$colClass}'>";

    // Posicionamiento de la etiqueta
    $labelHtml = "<label for='{$id}' title='{$tooltip}'>{$etiqueta}</label>";
    $posicionEtiqueta = $campo['posicionetiqueta'] ?? 'arriba';

    if ($posicionEtiqueta !== 'oculto' && strpos($posicionEtiqueta, 'arriba') !== false) {
        $html .= $labelHtml;
    }

    // Generar el input según el tipo
    $inputHtml = '';
    switch ($tipo) {
        case 'textarea':
            $inputHtml = "<textarea class='form-control' id='{$id}' name='{$nombre}' placeholder='{$placeholder}' {$requerido} style='{$estilo}'></textarea>";
            break;
        case 'select':
            $inputHtml = "<select class='form-control' id='{$id}' name='{$nombre}' {$requerido} style='{$estilo}'>";
            if ($placeholder) {
                $inputHtml .= "<option value='' disabled selected>{$placeholder}</option>";
            }
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $inputHtml .= "<option value='" . htmlspecialchars($opcion) . "'>" . htmlspecialchars($opcion) . "</option>";
            }
            $inputHtml .= "</select>";
            break;
        case 'select2':
            $tabla = $campo['data']['tabla'] ?? '';
            $campo_desc = $campo['data']['campo'] ?? '';
            $inputHtml = "<select class='form-control select2-field' id='{$id}' name='{$nombre}' {$requerido} style='{$estilo}' data-placeholder='{$placeholder}' data-tabla='{$tabla}' data-campo='{$campo_desc}'>";
            // Las opciones se cargarán vía AJAX
            $inputHtml .= "</select>";
            break;
        case 'radio':
        case 'checkbox':
            $inputHtml = "<div>";
            foreach ($campo['opciones'] ?? [] as $opcion) {
                $opcionVal = htmlspecialchars($opcion);
                $inputHtml .= "<div class='form-check form-check-inline'>";
                $inputHtml .= "<input class='form-check-input' type='{$tipo}' name='{$nombre}" . ($tipo === 'checkbox' ? '[]' : '') . "' id='{$id}_{$opcionVal}' value='{$opcionVal}'>";
                $inputHtml .= "<label class='form-check-label' for='{$id}_{$opcionVal}'>{$opcionVal}</label>";
                $inputHtml .= "</div>";
            }
            $inputHtml .= "</div>";
            break;
        default:
            $inputHtml = "<input type='{$tipo}' class='form-control' id='{$id}' name='{$nombre}' placeholder='{$placeholder}' {$requerido} style='{$estilo}'>";
            break;
    }

    $html .= $inputHtml;

    if ($posicionEtiqueta !== 'oculto' && strpos($posicionEtiqueta, 'abajo') !== false) {
        $html .= $labelHtml;
    }
    
    $html .= "</div>";
    return $html;
}

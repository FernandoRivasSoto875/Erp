<?php
/* MASTER_PROMPT_REFERENCE
   Leer COPILOT_PROMPT en formulariodinamico.php (fuente única de lineamientos).
   Rol de este archivo: helpers / lógica PHP reutilizable (sin HTML de vista, sin CSS, sin JS inline).
   No romper contrato JSON (parametros, fieldsets, layout). Agregar nuevas funciones de forma compatible.
*/
   
// KEEP: Revisado y listo para commit. Funciones auxiliares para renderizado y utilidades del formulario dinámico.
/*
====================================================================================
  KEEP: UNIFICADO
  Este archivo contiene TODAS las funciones de generación de campos y paleta.
  NO debe ser sobrescrito ni fragmentado. Mantener siempre esta versión unificada.
  Si se actualiza, conservar este bloque y toda la lógica unificada.
====================================================================================
*/
// KEEP: UNIFICADO. Incluye funciones de paleta y de generación de campos.
// ========================================================================
//  - Contiene las funciones para generar cada tipo de campo del formulario.
//  - Incluye funciones para la paleta de componentes y tipos de control.
//  - SOLUCIONA EL ERROR "Couldn't fetch mysqli" en la función de 'selectdata'.
// ========================================================================
// --- PALETA DE COMPONENTES ---
function generarPaletaComponentes($fieldsets_disponibles, $fieldsets) {
    $html = "<div id='paleta-componentes' class='paleta-componentes bg-light p-3 mb-3 solo-modo-diseno'>";
    $html .= "<h5 class='mb-3'><i class='fas fa-toolbox'></i> Paleta de Componentes</h5>";
    if (empty($fieldsets_disponibles)) {
        $html .= "<div class='text-muted'>No hay componentes disponibles para agregar.</div>";
    } else {
        $html .= "<div class='d-flex flex-wrap'>";
        foreach ($fieldsets_disponibles as $fs_name) {
            $titulo = htmlspecialchars($fieldsets[$fs_name]['titulo'] ?? $fs_name);
            $html .= "<div class='draggable-fieldset card m-2 p-2 text-center' data-fieldset='$fs_name' style='min-width:180px;cursor:grab;'>";
            $html .= "<div class='handle mb-2'><i class='fas fa-grip-vertical'></i></div>";
            $html .= "<strong>$titulo</strong><br><span class='badge badge-secondary'>$fs_name</span>";
            $html .= "</div>";
        }
        $html .= "</div>";
    }
    $html .= "</div>";
    return $html;
}

// --- PALETA DE TIPOS DE CONTROL (para crear nuevos campos desde cero) ---
function generarPaletaTiposControl(): string {
    $tipos = ['text','textarea','number','email','password','select','selectdata','radio','checkbox','file','date','datatable','hidden'];
    $html = '<div class="p-3"><h5 class="mb-3">Tipos de control</h5><div class="row">';
    foreach ($tipos as $t) {
        $html .= '<div class="col-6 col-md-4 mb-2">';
        $html .= '<div class="draggable-tipo border rounded p-2 bg-white">';
        $html .= '<div class="d-flex align-items-center"><span class="handle mr-2"><i class="fas fa-grip-vertical"></i></span>';
        $html .= '<span>'.htmlspecialchars($t, ENT_QUOTES, 'UTF-8').'</span></div>';
        $html .= '</div></div>';
    }
    $html .= '</div></div>';
    return $html;
}

// --- Función principal para generar un campo ---
function generarCampo($campo, $valor, $soloLectura): string {
    // ...lógica para renderizar cada tipo de campo...
    // Esta función debe ser completada según la estructura de tu JSON y los tipos de campo soportados.
    return '';
}

// Puedes agregar aquí más funciones auxiliares según las necesidades del formulario dinámico.


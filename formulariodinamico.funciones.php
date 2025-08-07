<?php
// --- PALETA DE COMPONENTES ---
function generarPaletaComponentes($fieldsets_disponibles, $fieldsets) {
    $html = "<div id='paleta-componentes' class='paleta-componentes bg-light p-3 mb-3'>";
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
function generarPaletaTiposControl() {
    $tipos = [
        'text' => 'Texto',
        'textarea' => 'Área de texto',
        'number' => 'Número',
        'email' => 'Email',
        'password' => 'Contraseña',
        'select' => 'Select (Opciones)',
        'selectdata' => 'Select (BD)',
        'radio' => 'Radio',
        'checkbox' => 'Checkbox',
        'file' => 'Archivo',
        'date' => 'Fecha',
        'datatable' => 'Datatable',
        'hidden' => 'Oculto'
    ];
    $html = "<div id='paleta-tipos-control' class='paleta-componentes bg-light p-3 mb-3'>";
    $html .= "<h5 class='mb-3'><i class='fas fa-plus-square'></i> Crear Nuevo Campo</h5>";
    $html .= "<div class='d-flex flex-wrap'>";
    foreach ($tipos as $tipo => $label) {
        $html .= "<div class='draggable-tipo card m-2 p-2 text-center' data-tipo='$tipo' style='min-width:120px;cursor:grab;'>";
        $html .= "<div class='handle mb-2'><i class='fas fa-grip-vertical'></i></div>";
        $html .= "<strong>$label</strong><br><span class='badge badge-info'>$tipo</span>";
        $html .= "</div>";
    }
    $html .= "</div></div>";
    return $html;
}
?>
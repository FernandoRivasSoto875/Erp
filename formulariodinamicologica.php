<?php
// --- FUNCIONES AUXILIARES ---
// ...existing code...

function sanitizeInput($data) {
    $sanitized = [];
    foreach ($data as $key => $value) {
        $sanitized[$key] = htmlspecialchars(trim($value));
    }
    return $sanitized;
}

// ...existing code...

// --- CONFIGURACIÓN DE CAMPOS ---
$fieldsetsConfig = [
    'nombre' => ['label' => 'Nombre', 'type' => 'text', 'required' => true],
    'email' => ['label' => 'Correo Electrónico', 'type' => 'email', 'required' => true],
    'edad' => ['label' => 'Edad', 'type' => 'number'],
    'comentario' => ['label' => 'Comentario', 'type' => 'text']
];

// --- ORGANIZACIÓN DE FILAS ---
$rows = [
    ['nombre', 'email'],
    ['edad', 'comentario']
]; 
// --- VALORES PREDETERMINADOS ---
$valores = [
    'nombre' => '',
    'email' => '',
    'edad' => '',
    'comentario' => ''
];

// --- MODO SOLO LECTURA ---
$soloLectura = false;

// --- PROCESAMIENTO DEL FORMULARIO ---
$errores = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datosRecibidos = sanitizeInput($_POST);
    $errores = validateFields($datosRecibidos, $fieldsetsConfig);

    if (empty($errores)) {
        // Aquí podrías guardar los datos en una base de datos o enviarlos por correo
        echo '<div class="alert alert-success">Formulario enviado correctamente.</div>';
        $valores = $datosRecibidos;
        $soloLectura = true;
    } else {
        echo '<div class="alert alert-danger">Hay errores en el formulario.</div>';
        $valores = $datosRecibidos;
    }
}

// --- RENDERIZADO DEL FORMULARIO ---
echo '<form method="post">';
renderRows($rows, $fieldsetsConfig, $valores, $soloLectura);
echo '<button type="submit">Enviar</button>';
echo '</form>';
// --- FUNCIONES ADICIONALES ---
function renderSelect($name, $options, $selected = '', $readonly = false) {
    $disabled = $readonly ? 'disabled' : '';
    echo '<select name="' . $name . '" id="' . $name . '" ' . $disabled . '>';
    foreach ($options as $value => $label) {
        $isSelected = $value == $selected ? 'selected' : '';
        echo '<option value="' . $value . '" ' . $isSelected . '>' . $label . '</option>';
    }
    echo '</select>';
}

function renderTextarea($name, $value = '', $readonly = false) {
    $readonlyAttr = $readonly ? 'readonly' : '';
    echo '<textarea name="' . $name . '" id="' . $name . '" ' . $readonlyAttr . '>';
    echo htmlspecialchars($value);
    echo '</textarea>';
}

function renderCheckbox($name, $checked = false, $readonly = false) {
    $readonlyAttr = $readonly ? 'disabled' : '';
    $checkedAttr = $checked ? 'checked' : '';
    echo '<input type="checkbox" name="' . $name . '" id="' . $name . '" ' . $checkedAttr . ' ' . $readonlyAttr . '>';
}

function renderRadioGroup($name, $options, $selected = '', $readonly = false) {
    foreach ($options as $value => $label) {
        $checked = $value == $selected ? 'checked' : '';
        $disabled = $readonly ? 'disabled' : '';
        echo '<label>';
        echo '<input type="radio" name="' . $name . '" value="' . $value . '" ' . $checked . ' ' . $disabled . '>';
        echo $label;
        echo '</label>';
    }
}
// --- CONFIGURACIÓN AVANZADA DE CAMPOS ---
$fieldsetsConfig['genero'] = [
    'label' => 'Género',
    'type' => 'radio',
    'options' => ['M' => 'Masculino', 'F' => 'Femenino'],
    'required' => true
];

$fieldsetsConfig['pais'] = [
    'label' => 'País',
    'type' => 'select',
    'options' => [
        'CL' => 'Chile',
        'AR' => 'Argentina',
        'PE' => 'Perú',
        'CO' => 'Colombia'
    ],
    'required' => true
];

$fieldsetsConfig['suscripcion'] = [
    'label' => 'Suscribirse al boletín',
    'type' => 'checkbox'
];

$fieldsetsConfig['descripcion'] = [
    'label' => 'Descripción personal',
    'type' => 'textarea'
];

// --- ACTUALIZACIÓN DE FILAS ---
$rows[] = ['genero', 'pais'];
$rows[] = ['suscripcion', 'descripcion'];

function renderRows($rows, $fieldsetsConfig, $valores, $soloLectura) {
    foreach ($rows as $row) {
        echo '<div class="row">';
        foreach ($row as $col) {
            if (!isset($fieldsetsConfig[$col])) continue;
            $fieldset = $fieldsetsConfig[$col];
            $valor = isset($valores[$col]) ? $valores[$col] : '';
            echo '<div class="col">';
            echo '<label for="' . $col . '">' . $fieldset['label'] . '</label>';

            switch ($fieldset['type']) {
                case 'text':
                case 'email':
                case 'number':
                    $readonly = $soloLectura ? 'readonly' : '';
                    echo '<input type="' . $fieldset['type'] . '" name="' . $col . '" id="' . $col . '" value="' . htmlspecialchars($valor) . '" ' . $readonly . '>';
                    break;

                case 'select':
                    renderSelect($col, $fieldset['options'], $valor, $soloLectura);
                    break;

                case 'textarea':
                    renderTextarea($col, $valor, $soloLectura);
                    break;

                case 'checkbox':
                    $checked = $valor === 'on' || $valor === true;
                    renderCheckbox($col, $checked, $soloLectura);
                    break;

                case 'radio':
                    renderRadioGroup($col, $fieldset['options'], $valor, $soloLectura);
                    break;
            }

            echo '</div>';
        }
        echo '</div>';
    }
}
function validateFields($data, $fieldsetsConfig) {
    $errors = [];
    foreach ($fieldsetsConfig as $key => $config) {
        if (isset($config['required']) && $config['required']) {
            if (!isset($data[$key]) || trim($data[$key]) === '') {
                $errors[$key] = $config['label'] . ' es obligatorio.';
                continue;
            }
        }

        if ($config['type'] === 'email' && isset($data[$key]) && !filter_var($data[$key], FILTER_VALIDATE_EMAIL)) {
            $errors[$key] = 'El correo electrónico no es válido.';
        }

        if ($config['type'] === 'number' && isset($data[$key]) && !is_numeric($data[$key])) {
            $errors[$key] = 'El campo ' . $config['label'] . ' debe ser numérico.';
        }
    }
    return $errors;
}

// --- FINAL DEL ARCHIVO ---
?>


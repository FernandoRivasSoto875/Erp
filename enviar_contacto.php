<?php
// Leer el archivo JSON desde la carpeta "config"
$parametros = json_decode(file_get_contents('json/parametro.json'), true);

// Extraer los datos del archivo JSON
$para = $parametros['ParaContactos']; // Dirección de correo donde se enviará el mensaje
$copia = "Gestion@saludenterreno.cl"; // Dirección para enviar copia
$remitente = "gestion@saludenterreno.cl"; // Dirección fija desde la cual se enviará el correo

// Comprobar si el formulario fue enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Capturar los datos del formulario
    $nombre = htmlspecialchars(trim($_POST['nombre']), ENT_QUOTES, 'UTF-8');
    $email = filter_var(trim($_POST['email']), FILTER_VALIDATE_EMAIL);
    $telefono = htmlspecialchars(trim($_POST['telefono']), ENT_QUOTES, 'UTF-8');
    $empresa = htmlspecialchars(trim($_POST['empresa']), ENT_QUOTES, 'UTF-8');
    $cargo = htmlspecialchars(trim($_POST['cargo']), ENT_QUOTES, 'UTF-8');
    $mensaje = htmlspecialchars(trim($_POST['mensaje']), ENT_QUOTES, 'UTF-8');

    // Validar datos esenciales
    if (!$email) {
        echo "<script>alert('Correo electrónico no válido. Por favor, vuelve a intentarlo.');</script>";
        exit;
    }

    // Preparar el correo
    $asunto = "Nuevo mensaje de contacto de: $nombre";
    $contenido = "Has recibido un nuevo mensaje desde el formulario de contacto.\n\n";
    $contenido .= "Nombre: $nombre\n";
    $contenido .= "Correo Electrónico: $email\n";
    $contenido .= "Teléfono: $telefono\n";
    $contenido .= "Empresa: $empresa\n";
    $contenido .= "Cargo: $cargo\n";
    $contenido .= "Mensaje:\n$mensaje\n\n";
    $contenido .= "--- Este mensaje fue enviado desde el sitio web ---";

    // Cabeceras del correo
    $cabeceras = "From: $remitente\r\n";
    $cabeceras .= "Reply-To: $email\r\n";
    $cabeceras .= "Cc: $copia\r\n"; // Agregar copia
    $cabeceras .= "Content-Type: text/plain; charset=UTF-8\r\n"; // Codificación UTF-8 para acentos

    // Intentar enviar el correo
    if (mail($para, $asunto, $contenido, $cabeceras)) {
        // Mensaje de confirmación en popup
        echo "<script>alert('¡Gracias, $nombre! Tu mensaje ha sido enviado con éxito. Nos pondremos en contacto contigo pronto.');</script>";
        echo "<script>window.location.href = 'contactos.php';</script>"; // Redirige al usuario al formulario después del envío
    } else {
        // Mostrar mensaje de error en popup
        echo "<script>alert('Lo sentimos, ocurrió un error al enviar tu mensaje. Por favor, intenta nuevamente más tarde.');</script>";
        echo "<script>window.location.href = 'contactos.php';</script>"; // Redirige al usuario al formulario en caso de error
    }
} else {
    // Redirigir al formulario si se accede directamente a este archivo
    header('Location: contactos.php');
    exit;
}
?>


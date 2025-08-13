 
<?php
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// CONFIGURA AQUÍ TUS DATOS
$mailPara = 'fernandorivassoto@gmail.com'; // Cambia por tu correo real
$mailDe   = 'gestion@saludenterreno.cl'; // Cambia por un correo válido de tu dominio
$asunto   = 'Prueba de envío PHPMailer';
$htmlBody = '<h2>¡Esto es una prueba de PHPMailer!</h2><p>Si ves este mensaje, el envío funciona.</p>';

$mail = new PHPMailer(true);

try {
    $mail->setFrom($mailDe, 'Remitente Prueba');
    $mail->addAddress($mailPara);
    $mail->Subject = $asunto;
    $mail->isHTML(true);
    $mail->Body = $htmlBody;

    // Agrega el adjunto (asegúrate que el archivo exista)
    $mail->addAttachment(__DIR__ . '/test_mail.php', 'test_mail.php');

    $mail->send();
    echo "<p style='color:green'>¡Correo enviado correctamente a $mailPara con adjunto!</p>";
} catch (Exception $e) {
    echo "<p style='color:red'>Error al enviar el correo: {$mail->ErrorInfo}</p>";
}
?>

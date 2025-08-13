<?php
// Definir el enlace de WhatsApp dinámicamente desde parametro.json
$numeroWhatsApp = $parametros['NumeroWhatsApp'] ?? "123456789"; // Número predeterminado
$mensajeWhatsApp = urlencode($parametros['MensajeWhatsApp'] ?? "Hola, estoy interesado en obtener más información.");
?>

<!-- Enlace a la hoja de estilos redes.css -->
<link rel="stylesheet" href="css/redes.css">

<!-- Botón de WhatsApp flotante -->
<div class="redes-container">
    <a href="https://wa.me/<?php echo $numeroWhatsApp; ?>?text=<?php echo $mensajeWhatsApp; ?>" 
       target="_blank" title="Conéctate con nosotros en WhatsApp" class="whatsapp-button">
        <img src="imagenes/whatsapp_iconTransparente.png" alt="WhatsApp">
    </a>
</div>

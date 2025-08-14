<?php
if (!headers_sent()) {
    header('Content-Type: text/html; charset=UTF-8');
}
<footer class="footer">
    <!-- Contenido del footer -->
    <p class="footer-title">
        &copy; <?php echo date("Y"); ?> - <?php echo $parametros['NombreSitio']; ?>
    </p>
    <p class="footer-message">
        <?php echo $parametros['MensajeFooter']; ?>
    </p>
</footer> 

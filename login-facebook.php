<?php
session_start();

// Aquí implementas la lógica de autenticación con Facebook Login
// Simulación de autenticación:
$_SESSION['user_name'] = 'María López';
$_SESSION['user_email'] = 'maria.lopez@facebook.com';
$_SESSION['user_photo'] = 'https://example.com/facebook-photo.jpg';

// Redirige de nuevo al header después de iniciar sesión
header('Location: header.php');

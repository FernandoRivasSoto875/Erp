<?php
session_start();

// Aquí implementas la lógica de autenticación con Google OAuth
// Simulación de autenticación:
$_SESSION['user_name'] = 'Juan Pérez';
$_SESSION['user_email'] = 'juan.perez@gmail.com';
$_SESSION['user_photo'] = 'https://example.com/google-photo.jpg';

// Redirige de nuevo al header después de iniciar sesión
header('Location: header.php');

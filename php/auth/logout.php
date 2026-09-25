<?php
// POST /api/auth/logout
require_once __DIR__ . '/../auth.php';

require_method(['POST']);

$_SESSION = [];
session_destroy();

$cookie = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires'  => time() - 3600,
    'path'     => $cookie['path'],
    'domain'   => $cookie['domain'],
    'secure'   => $cookie['secure'],
    'httponly' => $cookie['httponly'],
    'samesite' => $cookie['samesite'],
]);

json_response(200, ['message' => 'Logged out']);

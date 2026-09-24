<?php
// Shared helpers: JSON I/O and session/login checks.
// Every endpoint file includes this first.

require_once __DIR__ . '/config.php';

// Every response from this API is JSON.
header('Content-Type: application/json');

// Sessions are how we know who's logged in. 
session_set_cookie_params([
    'lifetime' => 0, // extended per-request in login.php when "remember me" is checked
    'path'     => '/',
    'samesite' => 'Lax',
    'secure'   => true,
    'httponly' => true,
]);
session_start();
header('Cache-Control: no-store');

function json_response(int $status, array $data): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function get_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(400, ['message' => 'Request body must be valid JSON']);
    }
    return $data;
}

// Call this at the top of any endpoint that requires a logged-in user.
// Returns the current user's id. 
function require_login(): int {
    if (empty($_SESSION['user_id'])) {
        json_response(401, ['message' => 'Not logged in']);
    }
    return (int) $_SESSION['user_id'];
}

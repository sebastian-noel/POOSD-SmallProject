<?php
// Shared helpers: JSON I/O and session/login checks.
// Every endpoint file includes this first.

// Keep unexpected runtime/database errors out of the JSON response body.
ini_set('display_errors', '0');
set_exception_handler(function (Throwable $error): void {
    error_log('API failure: ' . get_class($error) . ' (code ' . $error->getCode() . ')');
    json_response(500, ['message' => 'Internal server error']);
});

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/validation.php';

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
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function get_json_body(): array {
    $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($type !== 'application/json') {
        json_response(415, ['message' => 'Content-Type must be application/json']);
    }
    // Bound parsing work, including when Content-Length is missing or untrusted.
    $maxBytes = 1048576;
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false) {
        throw new RuntimeException('Unable to read request body');
    }
    if (strlen($raw) > $maxBytes) {
        json_response(413, ['message' => 'Request body must be at most 1048576 bytes']);
    }
    try {
        $data = json_decode($raw, false, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        json_response(400, ['message' => 'Request body must be valid JSON']);
    }
    if (!$data instanceof stdClass) {
        json_response(400, ['message' => 'Request body must be a JSON object']);
    }
    return get_object_vars($data);
}

// Call this at the top of any endpoint that requires a logged-in user.
// Returns the current user's id. 
function require_login(): int {
    if (empty($_SESSION['user_id'])) {
        json_response(401, ['message' => 'Not logged in']);
    }
    return (int) $_SESSION['user_id'];
}

<?php
// POST /api/auth/login
// Body: { "email": "...", "password": "...", "rememberMe": true }
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['message' => 'Method not allowed']);
}

$body = get_json_body();
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';
$rememberMe = !empty($body['rememberMe']);

if ($email === '' || $password === '') {
    json_response(400, ['message' => 'email and password are required']);
}

$db = get_db();
$stmt = $db->prepare(
    'SELECT id, username, email, password_hash FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    json_response(401, ['message' => 'Invalid email or password']);
}

// Prevent session fixation.
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];

// "Remember me" -> keep the session cookie for 30 days instead of
// until the browser closes. Re-sends the cookie with a longer expiry.
if ($rememberMe) {
    setcookie(session_name(), session_id(), [
        'expires'  => time() + 60 * 60 * 24 * 30,
        'path'     => '/',
        'samesite' => 'Lax',
        'secure'   => true,
        'httponly' => true,
    ]);
}

json_response(200, [
    'message' => 'Login successful',
    'user' => [
        'id'       => (int) $user['id'],
        'username' => $user['username'],
        'email'    => $user['email'],
    ],
]);
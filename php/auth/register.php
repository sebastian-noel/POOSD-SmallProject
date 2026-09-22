<?php
// POST /api/auth/register
// Body: { "username": "...", "email": "...", "password": "..." }
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['message' => 'Method not allowed']);
}

$body = get_json_body();
$username = trim($body['username'] ?? '');
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($username === '' || $email === '' || $password === '') {
    json_response(400, ['message' => 'username, email, and password are required']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['message' => 'Invalid email address']);
}
if (strlen($password) < 8) {
    json_response(400, ['message' => 'Password must be at least 8 characters']);
}

$db = get_db();

$check = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
$check->execute([$username, $email]);
if ($check->fetch()) {
    json_response(409, ['message' => 'Username or email already in use']);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$insert = $db->prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
);
$insert->execute([$username, $email, $hash]);

json_response(201, [
    'message' => 'Account created',
    'user' => [
        'id'       => (int) $db->lastInsertId(),
        'username' => $username,
        'email'    => $email,
    ],
]);
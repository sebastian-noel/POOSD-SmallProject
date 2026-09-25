<?php
// POST /api/auth/register
// Body: { "username": "...", "email": "...", "password": "..." }
require_once __DIR__ . '/../auth.php';

require_method(['POST']);

$body = get_json_body();
$username = string_field($body, 'username', 50, true);
$email = email_field($body, true);
$password = password_field($body, true);

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
try {
    $insert->execute([$username, $email, $hash]);
} catch (PDOException $error) {
    // A concurrent signup can win after the SELECT check above.
    if (($error->errorInfo[1] ?? null) === 1062) {
        json_response(409, ['message' => 'Username or email already in use']);
    }
    throw $error;
}

json_response(201, [
    'message' => 'Account created',
    'user' => [
        'id'       => (int) $db->lastInsertId(),
        'username' => $username,
        'email'    => $email,
    ],
]);

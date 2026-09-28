<?php
// POST /api/auth/register
// Body: { "username": "...", "password": "..." }
require_once __DIR__ . '/../auth.php';

require_method(['POST']);

$body = get_json_body();
$username = string_field($body, 'username', 50, true);
$password = password_field($body, true);

$db = get_db();

$check = $db->prepare('SELECT userID FROM users WHERE username = ?');
$check->execute([$username]);
if ($check->fetch()) {
    json_response(409, ['message' => 'Username already in use']);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$insert = $db->prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);
try {
    $insert->execute([$username, $hash]);
} catch (PDOException $error) {
    // A concurrent signup can win after the SELECT check above.
    if (($error->errorInfo[1] ?? null) === 1062) {
        json_response(409, ['message' => 'Username already in use']);
    }
    throw $error;
}

json_response(201, [
    'message' => 'Account created',
    'user' => [
        'id'       => (int) $db->lastInsertId(),
        'username' => $username,
    ],
]);

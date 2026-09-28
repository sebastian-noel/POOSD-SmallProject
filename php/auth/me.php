<?php
// GET /api/auth/me
// Lets the frontend check on page load whether someone is already logged
// in, so contacts.html can redirect straight back to login.html if not.
require_once __DIR__ . '/../auth.php';

require_method(['GET']);

if (empty($_SESSION['user_id'])) {
    json_response(401, ['message' => 'Not logged in']);
}

$db = get_db();
$stmt = $db->prepare('SELECT userID AS id, username FROM users WHERE userID = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    json_response(401, ['message' => 'Not logged in']);
}

json_response(200, ['user' => [
    'id'       => (int) $user['id'],
    'username' => $user['username'],
]]);

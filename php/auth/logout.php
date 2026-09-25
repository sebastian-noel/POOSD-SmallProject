<?php
// POST /api/auth/logout
require_once __DIR__ . '/../auth.php';

require_method(['POST']);

$_SESSION = [];
session_destroy();

json_response(200, ['message' => 'Logged out']);
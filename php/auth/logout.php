<?php
// POST /api/auth/logout
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['message' => 'Method not allowed']);
}

$_SESSION = [];
session_destroy();

json_response(200, ['message' => 'Logged out']);
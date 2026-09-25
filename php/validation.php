<?php
// Request validation shared by the authentication and contact endpoints.

function require_method(array $allowed): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_response(405, ['message' => 'Method not allowed']);
    }
}

function string_field(array $source, string $field, int $maxLength, bool $required = false): string {
    if (!array_key_exists($field, $source)) {
        if ($required) {
            json_response(400, ['message' => "$field is required"]);
        }
        return '';
    }
    if (!is_string($source[$field])) {
        json_response(400, ['message' => "$field must be a string"]);
    }
    $value = trim($source[$field]);
    // Count Unicode characters like MySQL VARCHAR, without requiring mbstring.
    $length = preg_match_all('/./us', $value);
    if ($length === false || str_contains($source[$field], "\0")) {
        json_response(400, ['message' => "$field contains invalid text"]);
    }
    if ($required && $value === '') {
        json_response(400, ['message' => "$field is required"]);
    }
    if ($length > $maxLength) {
        json_response(400, ['message' => "$field must be at most $maxLength characters"]);
    }
    return $value;
}

function email_field(array $body, bool $required = false): string {
    $email = string_field($body, 'email', 254, $required);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(400, ['message' => 'Invalid email address']);
    }
    return $email;
}

function password_field(array $body, bool $registration = false): string {
    if (!array_key_exists('password', $body) || $body['password'] === '') {
        json_response(400, ['message' => 'password is required']);
    }
    if (!is_string($body['password'])) {
        json_response(400, ['message' => 'password must be a string']);
    }
    $password = $body['password']; // Password spaces are significant; never trim.
    if (str_contains($password, "\0")) {
        json_response(400, ['message' => 'password must not contain null bytes']);
    }
    if ($registration) {
        if (preg_match_all('/./us', $password) < 8) {
            json_response(400, ['message' => 'Password must be at least 8 characters']);
        }
        // PASSWORD_DEFAULT currently uses bcrypt, which only considers 72 bytes.
        if (strlen($password) > 72) {
            json_response(400, ['message' => 'Password must be at most 72 bytes']);
        }
    }
    return $password;
}

function contact_id(): int {
    $id = $_GET['id'] ?? null;
    if ($id === null) {
        json_response(400, ['message' => 'id is required']);
    }
    if (!is_string($id) || !preg_match('/^[1-9][0-9]{0,9}$/D', $id) || (int) $id > 4294967295) {
        json_response(400, ['message' => 'id must be a positive integer from 1 to 4294967295']);
    }
    return (int) $id;
}

<?php
// Generate demo SQL from a password supplied on stdin, never from source code.
// This CLI helper does not connect to a database or print the plaintext password.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$mode = $argv[1] ?? '';
if (!in_array($mode, ['', '--rotate-password'], true)) {
    fwrite(STDERR, "Usage: php scripts/seed-demo.php [--rotate-password] < password-file\n");
    exit(1);
}
$password = stream_get_contents(STDIN);
if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
    fwrite(STDERR, "Supply an 8–72 byte demo password on stdin (without a trailing newline).\n");
    exit(1);
}
$hash = password_hash($password, PASSWORD_BCRYPT);
echo "SET @demo_password_hash = '$hash';\n";
if ($mode === '--rotate-password') {
    // Used only to upgrade the isolated preview's three sample accounts.
    echo "UPDATE users SET password_hash = @demo_password_hash WHERE username IN ('Huey', 'Dewey', 'Louie');\n";
} else {
    echo file_get_contents(__DIR__ . '/../database/seed.sql');
}

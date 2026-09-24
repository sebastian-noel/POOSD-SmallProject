<?php
// REST resource for a logged-in user's own contacts.
//
//   GET    /api/contacts              -> list all of my contacts
//   GET    /api/contacts?id=5         -> get one contact
//   GET    /api/contacts?search=term  -> server-side partial-match search
//   POST   /api/contacts              -> create a contact
//   PUT    /api/contacts/5            -> update a contact
//   DELETE /api/contacts/5            -> delete a contact
//
// Every query is scoped to the current session's user_id (never a
// client-supplied id), so nobody can see or touch another user's
// contacts -- there is no such thing as a shared contact.

require_once __DIR__ . '/auth.php';

$userId = require_login();
$db = get_db();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handle_get($db, $userId);
        break;
    case 'POST':
        handle_create($db, $userId);
        break;
    case 'PUT':
        handle_update($db, $userId);
        break;
    case 'DELETE':
        handle_delete($db, $userId);
        break;
    default:
        json_response(405, ['message' => 'Method not allowed']);
}

function handle_get(PDO $db, int $userId): void {
    // Single contact by id.
    if (isset($_GET['id'])) {
        $stmt = $db->prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?');
        $stmt->execute([(int) $_GET['id'], $userId]);
        $contact = $stmt->fetch();

        if (!$contact) {
            json_response(404, ['message' => 'Contact not found']);
        }
        json_response(200, ['contact' => $contact]);
    }

    // Server-side search with partial matching 
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $term = trim($_GET['search']);
        // Escape LIKE wildcard characters the user might type literally.
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
        $like = '%' . $escaped . '%';

        // Four separate "?" placeholders, not a repeated named one: PDO's
        // native MySQL prepares (EMULATE_PREPARES = false) throw "Invalid
        // parameter number" if the same named placeholder is reused.
        $stmt = $db->prepare(
            "SELECT * FROM contacts
             WHERE user_id = ?
               AND (first_name LIKE ? ESCAPE '\\\\'
                 OR last_name  LIKE ? ESCAPE '\\\\'
                 OR email      LIKE ? ESCAPE '\\\\'
                 OR phone      LIKE ? ESCAPE '\\\\')
             ORDER BY last_name, first_name"
        );
        $stmt->execute([$userId, $like, $like, $like, $like]);
        json_response(200, ['contacts' => $stmt->fetchAll()]);
    }

    // No id, no search -> full list for this user.
    $stmt = $db->prepare(
        'SELECT * FROM contacts WHERE user_id = ? ORDER BY last_name, first_name'
    );
    $stmt->execute([$userId]);
    json_response(200, ['contacts' => $stmt->fetchAll()]);
}

function handle_create(PDO $db, int $userId): void {
    $body = get_json_body();
    [$firstName, $lastName, $phone, $email, $address, $notes] = extract_contact_fields($body);

    if ($firstName === '' || $lastName === '') {
        json_response(400, ['message' => 'first_name and last_name are required']);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(400, ['message' => 'Invalid email address']);
    }

    // Record today's date/time as the creation date -- set explicitly here
    // in PHP so a contact 
    // created today stores today's date, e.g. 2026-09-23 14:02:10.
    $createdAt = date('Y-m-d H:i:s');

    $stmt = $db->prepare(
        'INSERT INTO contacts (user_id, first_name, last_name, phone, email, address, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $firstName, $lastName, $phone, $email, $address, $notes, $createdAt]);

    $id = (int) $db->lastInsertId();
    $stmt = $db->prepare('SELECT * FROM contacts WHERE id = ?');
    $stmt->execute([$id]);

    json_response(201, ['message' => 'Contact created', 'contact' => $stmt->fetch()]);
}

function handle_update(PDO $db, int $userId): void {
    if (!isset($_GET['id'])) {
        json_response(400, ['message' => 'id is required']);
    }
    $id = (int) $_GET['id'];

    // Confirm the contact exists and belongs to this user before touching it.
    $check = $db->prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?');
    $check->execute([$id, $userId]);
    if (!$check->fetch()) {
        json_response(404, ['message' => 'Contact not found']);
    }

    $body = get_json_body();
    [$firstName, $lastName, $phone, $email, $address, $notes] = extract_contact_fields($body);

    if ($firstName === '' || $lastName === '') {
        json_response(400, ['message' => 'first_name and last_name are required']);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(400, ['message' => 'Invalid email address']);
    }

    $stmt = $db->prepare(
        'UPDATE contacts
         SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ?, notes = ?
         WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$firstName, $lastName, $phone, $email, $address, $notes, $id, $userId]);

    $stmt = $db->prepare('SELECT * FROM contacts WHERE id = ?');
    $stmt->execute([$id]);

    json_response(200, ['message' => 'Contact updated', 'contact' => $stmt->fetch()]);
}

function handle_delete(PDO $db, int $userId): void {
    if (!isset($_GET['id'])) {
        json_response(400, ['message' => 'id is required']);
    }
    $id = (int) $_GET['id'];

    $stmt = $db->prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) {
        json_response(404, ['message' => 'Contact not found']);
    }
    json_response(200, ['message' => 'Contact deleted']);
}

function extract_contact_fields(array $body): array {
    return [
        trim($body['first_name'] ?? ''),
        trim($body['last_name'] ?? ''),
        trim($body['phone'] ?? ''),
        trim($body['email'] ?? ''),
        trim($body['address'] ?? ''),
        trim($body['notes'] ?? ''),
    ];
}
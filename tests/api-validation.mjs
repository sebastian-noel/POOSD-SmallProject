import assert from 'node:assert/strict';

// Run through run-api-validation.sh: this suite creates test users and requires
// the error-injection triggers in a fresh, disposable database.
const base = process.env.API_TEST_BASE_URL;
if (!base) throw new Error('Use bash tests/run-api-validation.sh');
let checks = 0;
function client() {
    let cookie = '';
    return async (method, path, body, options = {}) => {
        const response = await fetch(base + '/php/' + path, {
            method, signal: AbortSignal.timeout(15000),
            headers: {
                ...(cookie ? { Cookie: cookie } : {}),
                ...(body !== undefined ? { 'Content-Type': options.type ?? 'application/json' } : {}),
            },
            body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body),
        });
        const session = response.headers.getSetCookie().findLast(value => value.startsWith('PHPSESSID='));
        if (session) cookie = session.split(';')[0];
        assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
        const text = await response.text();
        const data = JSON.parse(text); // PHP warnings/HTML must fail the test.
        assert.doesNotMatch(text, /PRIVATE_|SQLSTATE|PDOException|Fatal error|Stack trace/);
        if (response.status >= 400) {
            assert.deepEqual(Object.keys(data), ['message']);
            assert.equal(typeof data.message, 'string');
        }
        return { status: response.status, data, headers: response.headers };
    };
}
async function expect(status, promise, label) {
    const result = await promise;
    assert.equal(result.status, status, `${label}: ${JSON.stringify(result.data)}`);
    checks++;
    console.log(`PASS ${label}`);
    return result;
}

const guest = client();
const owner = client();
const other = client();
const registration = { username: 'ValidationOwner', password: 'TestPassword123!' };
const contact = { first_name: ' Ada ', last_name: ' Lovelace ', phone: '', email: '' };

const seeded = client();
await expect(200, seeded('POST', 'auth/login.php', { username: 'Huey', password: 'ContactDemo123!' }), 'existing seeded password hash works with username login');
const seededSearch = await expect(200, seeded('GET', 'contacts.php?search=jo'), 'seeded partial search after schema change');
assert.deepEqual(seededSearch.data.contacts.map(row => row.first_name), ['Jon', 'Joanna']);

for (const path of ['auth/login.php', 'auth/register.php']) {
    for (const raw of ['', '{', '[]', '[{}]', 'null', 'true', '42', '"text"', '{"email":"\u0001"}']) {
        await expect(400, guest('POST', path, raw, { raw: true }), `${path} rejects non-object or malformed JSON ${JSON.stringify(raw)}`);
    }
    await expect(415, guest('POST', path, '{}', { raw: true, type: 'text/plain' }), `${path} rejects non-JSON media type`);
    await expect(415, guest('POST', path), `${path} rejects missing Content-Type`);
    await expect(413, guest('POST', path, { extra: 'x'.repeat(1048576) }), `${path} bounds request size`);
    await expect(400, guest('POST', path, {}), `${path} requires fields`);
}
for (const field of ['username', 'password']) {
    for (const value of [[], {}, 1, true, null]) {
        await expect(400, guest('POST', 'auth/register.php', { ...registration, [field]: value }), `registration rejects ${field} type ${JSON.stringify(value)}`);
    }
}
for (const changes of [
    { username: ' ' }, { username: 'x'.repeat(51) }, { username: '🦆'.repeat(51) },
    { password: 'short' },
    { password: '🦆'.repeat(7) }, { password: 'x'.repeat(73) }, { password: 'abc\0defghi' },
]) {
    await expect(400, guest('POST', 'auth/register.php', { ...registration, ...changes }), `registration rejects invalid ${Object.keys(changes)[0]} value`);
}
const registered = await expect(201, guest('POST', 'auth/register.php', registration), 'username-only registration');
assert.deepEqual(Object.keys(registered.data.user).sort(), ['id', 'username']);
await expect(409, guest('POST', 'auth/register.php', registration), 'duplicate registration');
await expect(409, guest('POST', 'auth/register.php', { ...registration, username: '__test_duplicate__' }), 'duplicate-key error after precheck returns JSON 409');
const second = { ...registration, username: 'OtherOwner' };
await expect(201, guest('POST', 'auth/register.php', second), 'second user registration');
await expect(201, guest('POST', 'auth/register.php', { username: '🦆'.repeat(50), password: '🦆'.repeat(18) }), 'Unicode username and 72-byte password boundaries accepted');
for (const field of ['username', 'password', 'rememberMe']) {
    for (const value of [[], {}, 1, 'false', null]) {
        if (field !== 'rememberMe' && value === 'false') continue;
        await expect(400, guest('POST', 'auth/login.php', { ...registration, [field]: value }), `login rejects invalid ${field} ${JSON.stringify(value)}`);
    }
}
await expect(401, guest('POST', 'auth/login.php', { ...registration, password: 'wrong-password' }), 'wrong password rejected');
await expect(400, guest('POST', 'auth/login.php', { email: 'owner@example.com', password: registration.password }), 'old email-only login requires username');
await expect(401, guest('POST', 'auth/login.php', { username: 'UnknownOwner', password: registration.password }), 'unknown username denied');
await expect(400, guest('POST', 'auth/login.php', { ...registration, username: 'x'.repeat(51) }), 'login username length limit');
await expect(409, guest('POST', 'auth/register.php', { ...registration, username: 'validationowner' }), 'username uniqueness is case-insensitive');
const login = await expect(200, owner('POST', 'auth/login.php', { ...registration, rememberMe: false }), 'valid login');
assert.deepEqual(Object.keys(login.data.user).sort(), ['id', 'username']);
const me = await expect(200, owner('GET', 'auth/me.php'), 'current session exposes only id and username');
assert.deepEqual(me.data.user, login.data.user);
assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
assert.match(login.headers.get('set-cookie'), /Secure/i);
const remembered = await expect(200, other('POST', 'auth/login.php', { ...second, rememberMe: true }), 'boolean rememberMe accepted');
assert.match(remembered.headers.get('set-cookie'), /Secure/i);
for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    await expect(401, guest(method, 'contacts.php?id=1', method === 'POST' || method === 'PUT' ? contact : undefined), `unauthenticated ${method} denied`);
}
for (const [path, method, allow] of [
    ['auth/login.php', 'GET', 'POST'], ['auth/register.php', 'GET', 'POST'],
    ['auth/logout.php', 'GET', 'POST'], ['auth/me.php', 'POST', 'GET'],
    ['contacts.php', 'PATCH', 'GET, POST, PUT, DELETE'],
]) {
    const result = await expect(405, guest(method, path), `${path} unsupported method`);
    assert.equal(result.headers.get('allow'), allow);
}
const created = await expect(201, owner('POST', 'contacts.php', { ...contact, user_id: 9999, UserID: 9999, address: 'legacy ignored', notes: 'legacy ignored' }, { type: 'application/json; charset=UTF-8' }), 'valid create accepts charset and ignores supplied owner');
const id = created.data.contact.id;
assert.deepEqual(Object.keys(created.data.contact).sort(), ['created_at', 'email', 'first_name', 'id', 'last_name', 'phone', 'updated_at', 'user_id']);
assert.equal(created.data.contact.user_id, login.data.user.id);
assert.equal(created.data.contact.first_name, 'Ada');
assert.match(created.data.contact.created_at, /^\d{4}-\d{2}-\d{2} /);
for (const field of ['first_name', 'last_name', 'phone', 'email']) {
    for (const value of [[], {}, 1, true, null]) {
        await expect(400, owner('POST', 'contacts.php', { ...contact, [field]: value }), `contact rejects ${field} type ${JSON.stringify(value)}`);
    }
}
for (const changes of [
    { first_name: ' ' }, { last_name: '' }, { first_name: 'x'.repeat(51) },
    { last_name: '🦆'.repeat(51) }, { phone: '1'.repeat(21) }, { email: 'invalid' },
    { email: 'a'.repeat(61) }, { email: 'a'.repeat(49) + '@example.com' },
    { first_name: 'Ada\0Lovelace' },
]) {
    await expect(400, owner('PUT', `contacts.php?id=${id}`, { ...contact, ...changes }), `edit rejects invalid ${Object.keys(changes)[0]}`);
}
const unchanged = await expect(200, owner('GET', `contacts.php?id=${id}`), 'rejected edits leave the contact unchanged');
assert.deepEqual(unchanged.data.contact, created.data.contact);
for (const query of ['id=0', 'id=-1', 'id=1.5', 'id=1abc', 'id=1e0', 'id=01', 'id=', 'id[]=1', 'id=2147483648', 'id=999999999999999999999', 'id=%201']) {
    for (const method of ['GET', 'PUT', 'DELETE']) {
        await expect(400, owner(method, 'contacts.php?' + query, method === 'PUT' ? contact : undefined), `${method} rejects ${query}`);
    }
}
await expect(400, owner('PUT', 'contacts.php', contact), 'update requires id');
await expect(400, owner('DELETE', 'contacts.php'), 'delete requires id');
for (const search of ['search[]=Ada', 'search=' + 'x'.repeat(255), 'search=%FF']) {
    await expect(400, owner('GET', 'contacts.php?' + search), 'reject invalid search parameter');
}
for (const method of ['GET', 'PUT', 'DELETE']) {
    await expect(404, other(method, `contacts.php?id=${id}`, method === 'PUT' ? contact : undefined), `other user cannot ${method} owned contact`);
}
const privateSearch = await expect(200, other('GET', 'contacts.php?search=ada'), 'search respects ownership');
assert.deepEqual(privateSearch.data.contacts, []);
const match = await expect(200, owner('GET', 'contacts.php?search=ovel'), 'partial substring search');
assert.equal(match.data.contacts[0].id, id);
for (const term of ['%', '_', "' OR 1=1 --"]) {
    const result = await expect(200, owner('GET', 'contacts.php?search=' + encodeURIComponent(term)), 'search treats wildcard/SQL text literally');
    assert.deepEqual(result.data.contacts, []);
}
const boundary = await expect(201, owner('POST', 'contacts.php', {
    first_name: '🦆'.repeat(50), last_name: 'x'.repeat(50), phone: '1'.repeat(20),
    email: 'a'.repeat(48) + '@example.com',
}), 'contact name, phone and 60-character email boundaries accepted');
assert.equal(boundary.data.contact.email.length, 60);
const failure = await expect(500, owner('POST', 'contacts.php', { ...contact, first_name: '__test_sql_error__' }), 'database query errors return generic JSON');
assert.equal(failure.data.message, 'Internal server error');
const edited = await expect(200, owner('PUT', `contacts.php?id=${id}`, { first_name: 'Ada', last_name: 'Updated' }), 'valid replacement edit');
assert.equal(edited.data.contact.created_at, created.data.contact.created_at);
assert.equal(edited.data.contact.email, '');
await expect(404, owner('GET', 'contacts.php?id=2147483647'), 'valid missing id returns 404');
await expect(200, owner('DELETE', `contacts.php?id=${id}`), 'valid delete');
await expect(404, owner('GET', `contacts.php?id=${id}`), 'deleted contact no longer exists');
await expect(200, owner('POST', 'auth/logout.php'), 'logout');
await expect(401, owner('GET', 'contacts.php'), 'logged-out session denied');
console.log(`\n${checks} API checks passed.`);

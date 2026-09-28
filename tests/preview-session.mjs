import assert from 'node:assert/strict';
import { get } from 'node:http';

// Check only the isolated local preview; never accept a production URL.
const base = process.env.PREVIEW_TEST_BASE_URL;
assert.match(base ?? '', /^http:\/\/127\.0\.0\.1:\d+$/);
for (const rememberMe of [false, true]) {
    const login = await fetch(base + '/php/auth/login.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Huey', password: 'ContactDemo123!', rememberMe }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.getSetCookie().findLast(value => value.startsWith('POOSD_PREVIEW_SESSION='));
    assert.ok(cookie, 'preview uses its own cookie name');
    assert.doesNotMatch(cookie, /;\s*Secure(?:;|$)/i);
    assert.match(cookie, /;\s*HttpOnly(?:;|$)/i);
    assert.match(cookie, /;\s*SameSite=Lax(?:;|$)/i);
    if (rememberMe) assert.match(cookie, /expires=/i);
    const headers = { Cookie: cookie.split(';')[0] };
    const me = await fetch(base + '/php/auth/me.php', { headers });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.username, 'Huey');
    assert.equal((await fetch(base + '/php/contacts.php', { headers })).status, 200);
    const logout = await fetch(base + '/php/auth/logout.php', { method: 'POST', headers });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /^POOSD_PREVIEW_SESSION=/);
    assert.doesNotMatch(logout.headers.get('set-cookie'), /;\s*Secure(?:;|$)/i);
    assert.equal((await fetch(base + '/php/auth/me.php', { headers })).status, 401);
    console.log(`PASS local preview login, session, contacts, logout (rememberMe=${rememberMe})`);
}

// The preview flag is insufficient for other hosts: retain HTTPS-only defaults.
// Use node:http because fetch can override the caller-supplied Host header.
const defaultCookie = await new Promise((resolve, reject) => {
    const request = get(base + '/php/auth/me.php', { headers: { Host: 'example.test' } }, response => {
        response.resume();
        resolve(response.headers['set-cookie']?.join('\n'));
    });
    request.on('error', reject);
});
assert.match(defaultCookie, /^PHPSESSID=/);
assert.match(defaultCookie, /;\s*Secure(?:;|$)/i);
console.log('PASS non-loopback hosts retain Secure PHPSESSID even with preview flag');

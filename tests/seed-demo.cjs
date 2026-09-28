const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Run with Docker; no database or production configuration is used here.
const docker = process.env.DOCKER_BIN || 'docker';
const repo = path.resolve(__dirname, '..');
function generate(password, mode = '') {
    const result = spawnSync(docker, [
        'run', '--rm', '-i',
        '-v', `${repo}/scripts:/seed/scripts:ro`,
        '-v', `${repo}/database:/seed/database:ro`,
        'php:8.3-cli', 'php', '/seed/scripts/seed-demo.php', mode,
    ], { input: password, encoding: 'utf8', timeout: 30000 });
    if (result.error) throw result.error;
    return result;
}

for (const input of ['', 'short', 'x'.repeat(73), 'abc\0defghi']) {
    const result = generate(input);
    assert.equal(result.status, 1, 'invalid input must fail before emitting SQL');
    assert.equal(result.stdout, '');
}
console.log('PASS missing, short, oversized, and NUL passwords rejected without SQL');

const password = randomBytes(24).toString('hex');
const first = generate(password);
const second = generate(password);
for (const result of [first, second]) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^SET @demo_password_hash = '\$2y\$\d{2}\$[./A-Za-z0-9]{53}';/);
    assert.match(result.stdout, /INSERT INTO users/);
    assert.ok(!result.stdout.includes(password), 'SQL must not contain plaintext');
}
assert.notEqual(first.stdout, second.stdout, 'each invocation must salt the hash');
console.log('PASS seed SQL contains salted bcrypt hashes, never the supplied password');

const rotation = generate(password, '--rotate-password');
assert.equal(rotation.status, 0, rotation.stderr);
assert.match(rotation.stdout, /WHERE username IN \('Huey', 'Dewey', 'Louie'\)/);
assert.doesNotMatch(rotation.stdout, /INSERT|DELETE|DROP|ALTER/);
assert.ok(!rotation.stdout.includes(password));
assert.equal(generate(password, '--unknown').status, 1);
console.log('PASS rotation only updates sample account hashes; unknown modes rejected');

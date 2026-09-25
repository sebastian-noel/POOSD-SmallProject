const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../contacts/script.js'), 'utf8');

// Exercise save behavior without a database or browser dependency. Requests are
// completed explicitly so failures and repeated clicks are deterministic.
function fixture() {
    function element(tagName = 'div') {
        return {
            tagName, value: '', textContent: '', disabled: false,
            style: {}, dataset: {}, attributes: {}, children: [],
            set innerHTML(value) { throw new Error('Use textContent for contact data'); },
            setAttribute(name, value) { this.attributes[name] = value; },
            append(...children) { this.children.push(...children); },
            appendChild(child) { this.children.push(child); },
            replaceChildren(...children) { this.children = children; },
            focus() { this.focused = true; },
        };
    }
    const fields = ['firstName', 'lastName', 'contactEmail', 'contactPhone', 'contactAddress', 'notes'];
    const ids = [...fields, 'contactForm', 'contactAddResult', 'saveContactBtn',
        'closePopupBtn', 'popupOverlay', 'popupTitle', 'contactSearchResult', 'addContactBtn', 'contactsTableBody'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    const form = elements.contactForm;
    form.elements = [...fields.map(id => elements[id]), elements.closePopupBtn, elements.saveContactBtn];
    form.reportValidity = () => true;
    form.reset = () => { for (const id of fields) elements[id].value = ''; };
    elements.firstName.value = ' Jane ';
    elements.lastName.value = ' Doe ';
    elements.notes.value = 'Keep these notes';
    elements.popupOverlay.style.display = 'grid';
    const requests = [];
    class Request {
        constructor() { requests.push(this); }
        open(method, url) { this.method = method; this.url = url; }
        setRequestHeader(name, value) { this.headers = { ...this.headers, [name]: value }; }
        send(body) { this.body = body; if (this.failSend) throw new Error('Send failed'); }
        respond(status, body) {
            this.status = status;
            this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
            this.onload();
        }
    }
    const context = vm.createContext({
        window: { addEventListener() {} },
        document: {
            getElementById: id => elements[id],
            createElement: tag => element(tag),
            addEventListener() {},
        },
        XMLHttpRequest: Request,
    });
    vm.runInContext(source, context);
    return { context, elements, fields, form, requests, Request };
}

function assertPreserved(f) {
    assert.equal(f.elements.popupOverlay.style.display, 'grid');
    assert.equal(f.elements.firstName.value, ' Jane ');
    assert.equal(f.elements.lastName.value, ' Doe ');
    assert.equal(f.elements.notes.value, 'Keep these notes');
    assert.ok(f.form.elements.every(control => !control.disabled));
    assert.equal(f.elements.saveContactBtn.textContent, 'Save Contact');
    assert.ok(f.elements.contactAddResult.textContent);
}

test('invalid fields and whitespace-only names do not submit', () => {
    const f = fixture();
    f.form.reportValidity = () => false;
    f.context.saveContact(null);
    assert.equal(f.requests.length, 0);
    f.form.reportValidity = () => true;
    f.elements.firstName.value = '   ';
    f.context.saveContact(null);
    assert.equal(f.requests.length, 0);
    assert.match(f.elements.contactAddResult.textContent, /required/);
});

test('pending saves disable controls and duplicate submissions; success resets and refreshes', () => {
    const f = fixture();
    f.context.saveContact(null);
    f.context.saveContact(null);
    assert.equal(f.requests.length, 1);
    assert.ok(f.form.elements.every(control => control.disabled));
    assert.equal(f.form.attributes['aria-busy'], 'true');
    assert.equal(f.elements.saveContactBtn.textContent, 'Saving...');
    assert.equal(f.elements.popupOverlay.style.display, 'grid');
    const request = f.requests[0];
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '../php/contacts.php');
    assert.equal(request.timeout, 15000);
    assert.equal(request.withCredentials, true);
    assert.deepEqual(JSON.parse(request.body), {
        first_name: 'Jane', last_name: 'Doe', email: '', phone: '', address: '', notes: 'Keep these notes',
    });
    request.respond(201, { contact: { id: 6 } });
    assert.equal(f.elements.popupOverlay.style.display, 'none');
    assert.ok(f.fields.every(id => f.elements[id].value === ''));
    assert.ok(f.form.elements.every(control => !control.disabled));
    assert.equal(f.form.attributes['aria-busy'], 'false');
    assert.match(f.elements.contactSearchResult.textContent, /added/);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].method, 'GET');
    assert.equal(f.elements.addContactBtn.focused, true);
});

const failures = [
    ['validation error', r => r.respond(400, { message: 'Invalid email address' })],
    ['expired session', r => r.respond(401, { message: 'Not logged in' })],
    ['server failure', r => r.respond(500, { message: 'Unavailable' })],
    ['HTML response', r => r.respond(201, '<html>Error</html>')],
    ['missing confirmation', r => r.respond(201, { message: 'Created' })],
    ['unexpected success status', r => r.respond(200, { contact: { id: 6 } })],
    ['network error', r => r.onerror()],
    ['timeout', r => r.ontimeout()],
    ['abort', r => r.onabort()],
];
for (const [name, fail] of failures) {
    test(`${name} preserves entries and permits retry`, () => {
        const f = fixture();
        f.context.saveContact(null);
        fail(f.requests[0]);
        assertPreserved(f);
        assert.equal(f.requests.length, 1); // A failure must not reload the list.
        f.context.saveContact(null);
        assert.equal(f.requests.length, 2);
        assert.equal(f.requests[1].body, f.requests[0].body);
        f.requests[1].respond(201, { contact: { id: 6 } });
        assert.equal(f.elements.popupOverlay.style.display, 'none');
    });
}

test('a synchronous send failure restores the form', () => {
    const f = fixture();
    f.Request.prototype.failSend = true;
    f.context.saveContact(null);
    assertPreserved(f);
});

test('failed edits keep the selected contact for a PUT retry', () => {
    const f = fixture();
    f.context.editContact({ id: 42, first_name: ' Jane ', last_name: ' Doe ', notes: 'Keep these notes' });
    vm.runInContext('saveContact(editContactId);', f.context);
    f.context.editContact({ id: 99, first_name: 'Another', last_name: 'Contact' });
    assert.equal(f.elements.firstName.value, ' Jane '); // Cannot switch contacts mid-save.
    f.requests[0].respond(400, { message: 'Please correct the email' });
    assertPreserved(f);
    f.elements.contactEmail.value = 'jane@example.com';
    vm.runInContext('saveContact(editContactId);', f.context);
    assert.equal(f.requests[1].method, 'PUT');
    assert.equal(f.requests[1].url, '../php/contacts.php?id=42');
    assert.equal(JSON.parse(f.requests[1].body).email, 'jane@example.com');
    f.requests[1].respond(200, { contact: { id: 42 } });
    assert.match(f.elements.contactSearchResult.textContent, /updated/);
    assert.equal(vm.runInContext('editContactId', f.context), null);
});

test('table rendering treats contact data as text and keeps action IDs', () => {
    const f = fixture();
    f.context.loadContacts([{
        id: 42, first_name: '<b>Jane</b>', last_name: 'Doe',
        email: 'jane@example.com', phone: '', created_at: '2026-09-24 14:00:00',
    }]);
    const cells = f.elements.contactsTableBody.children[0].children;
    assert.equal(cells[0].textContent, '<b>Jane</b> Doe');
    assert.equal(cells[3].textContent, '2026-09-24');
    assert.equal(cells[4].children[0].textContent, 'Edit');
    assert.equal(cells[4].children[0].dataset.id, 42);
    assert.equal(cells[4].children[2].textContent, 'Delete');
    assert.equal(cells[4].children[2].dataset.id, 42);
    f.context.loadContacts([]);
    assert.equal(f.elements.contactsTableBody.children.length, 1);
    assert.equal(f.elements.contactsTableBody.children[0].children[0].textContent, 'No contacts found');
});

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
            style: {}, dataset: {}, attributes: {}, children: [], listeners: {},
            addEventListener(name, listener) { this.listeners[name] = listener; },
            set innerHTML(value) { throw new Error('Use textContent for contact data'); },
            setAttribute(name, value) { this.attributes[name] = value; },
            append(...children) { this.children.push(...children); },
            appendChild(child) { this.children.push(child); },
            replaceChildren(...children) { this.children = children; },
            focus() { this.focused = true; },
        };
    }
    const fields = ['firstName', 'lastName', 'contactEmail', 'contactPhone'];
    const ids = [...fields, 'contactForm', 'contactAddResult', 'saveContactBtn',
        'closePopupBtn', 'popupOverlay', 'popupTitle', 'contactSearchResult', 'addContactBtn', 'contactsTableBody',
        'searchBox', 'logoutBtn'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    const form = elements.contactForm;
    form.elements = [...fields.map(id => elements[id]), elements.closePopupBtn, elements.saveContactBtn];
    form.reportValidity = () => true;
    form.reset = () => { for (const id of fields) elements[id].value = ''; };
    elements.firstName.value = ' Jane ';
    elements.lastName.value = ' Doe ';
    elements.contactPhone.value = '407-555-0100';
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
    const documentListeners = {};
    const context = vm.createContext({
        window: { addEventListener() {} },
        document: {
            getElementById: id => elements[id],
            createElement: tag => element(tag),
            addEventListener(name, listener) { documentListeners[name] = listener; },
        },
        XMLHttpRequest: Request,
    });
    vm.runInContext(source, context);
    return { context, elements, fields, form, requests, Request, documentListeners };
}

function assertPreserved(f) {
    assert.equal(f.elements.popupOverlay.style.display, 'grid');
    assert.equal(f.elements.firstName.value, ' Jane ');
    assert.equal(f.elements.lastName.value, ' Doe ');
    assert.equal(f.elements.contactPhone.value, '407-555-0100');
    assert.ok(f.form.elements.every(control => !control.disabled));
    assert.equal(f.elements.saveContactBtn.textContent, 'Save Contact');
    assert.ok(f.elements.contactAddResult.textContent);
}

test('invalid fields and whitespace-only names do not submit', () => {
    const f = fixture();
    f.form.reportValidity = () => false;
    f.context.addContact();
    assert.equal(f.requests.length, 0);
    f.form.reportValidity = () => true;
    f.elements.firstName.value = '   ';
    f.context.addContact();
    assert.equal(f.requests.length, 0);
    assert.match(f.elements.contactAddResult.textContent, /required/);
});

test('pending saves disable controls and duplicate submissions; success resets and refreshes', () => {
    const f = fixture();
    f.context.addContact();
    f.context.addContact();
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
        first_name: 'Jane', last_name: 'Doe', email: '', phone: '407-555-0100',
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
    ['HTML response', (r, status) => r.respond(status, '<html>Error</html>')],
    ['missing confirmation', (r, status) => r.respond(status, { message: 'Saved' })],
    ['unexpected success status', (r, status) => r.respond(status === 201 ? 200 : 201, { contact: { id: 6 } })],
    ['network error', r => r.onerror()],
    ['timeout', r => r.ontimeout()],
    ['abort', r => r.onabort()],
];
for (const operation of [
    { name: 'add', save: f => f.context.addContact(), status: 201 },
    { name: 'update', save: f => f.context.updateContact(42), status: 200 },
]) {
  for (const [name, fail] of failures) {
    test(`${operation.name}: ${name} preserves entries and permits retry`, () => {
        const f = fixture();
        operation.save(f);
        fail(f.requests[0], operation.status);
        assertPreserved(f);
        assert.equal(f.requests.length, 1); // A failure must not reload the list.
        operation.save(f);
        assert.equal(f.requests.length, 2);
        assert.equal(f.requests[1].body, f.requests[0].body);
        f.requests[1].respond(operation.status, { contact: { id: 42 } });
        assert.equal(f.elements.popupOverlay.style.display, 'none');
    });
  }
}

test('form submission creates with POST and edits the selected contact with PUT', async () => {
    const f = fixture();
    f.context.checkSession = async () => false;
    await f.documentListeners.DOMContentLoaded();
    const event = { preventDefault() {} };
    f.form.listeners.submit(event);
    assert.equal(f.requests[0].method, 'POST');
    f.requests[0].respond(201, { contact: { id: 42 } });
    f.context.editContact({ id: 42, first_name: 'Jane', last_name: 'Doe' });
    f.form.listeners.submit(event);
    assert.equal(f.requests[2].method, 'PUT');
    assert.equal(f.requests[2].url, '../php/contacts.php?id=42');
});

test('a synchronous send failure restores the form', () => {
    const f = fixture();
    f.Request.prototype.failSend = true;
    f.context.addContact();
    assertPreserved(f);
});

test('failed edits keep the selected contact for a PUT retry', () => {
    const f = fixture();
    f.context.editContact({ id: 42, first_name: ' Jane ', last_name: ' Doe ', phone: '407-555-0100' });
    vm.runInContext('updateContact(editContactId);', f.context);
    f.context.editContact({ id: 99, first_name: 'Another', last_name: 'Contact' });
    assert.equal(f.elements.firstName.value, ' Jane '); // Cannot switch contacts mid-save.
    f.requests[0].respond(400, { message: 'Please correct the email' });
    assertPreserved(f);
    f.elements.contactEmail.value = 'jane@example.com';
    vm.runInContext('updateContact(editContactId);', f.context);
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

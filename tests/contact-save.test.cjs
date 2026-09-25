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
        'closePopupBtn', 'contactEditor', 'editorTitle', 'contactSearchResult', 'addContactBtn', 'contactsTableBody',
        'closeEditorBtn', 'listStatus', 'listContent', 'contactsTable', 'retryContactsBtn', 'emptyState',
        'clearSearchBtn', 'listSummary', 'contactCount', 'emptyTitle', 'emptyDescription', 'emptyActionBtn', 'searchBox',
        'deleteDialog', 'confirmDeleteBtn', 'cancelDeleteBtn', 'deleteError'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    const form = elements.contactForm;
    form.elements = [...fields.map(id => elements[id]), elements.closePopupBtn, elements.saveContactBtn];
    form.reportValidity = () => true;
    form.reset = () => { for (const id of fields) elements[id].value = ''; };
    elements.firstName.value = ' Jane ';
    elements.lastName.value = ' Doe ';
    elements.notes.value = 'Keep these notes';
    elements.contactEditor.hidden = false;
    elements.deleteDialog.open = true;
    elements.deleteDialog.close = () => { elements.deleteDialog.open = false; };
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
    assert.equal(f.elements.contactEditor.hidden, false);
    assert.equal(f.elements.firstName.value, ' Jane ');
    assert.equal(f.elements.lastName.value, ' Doe ');
    assert.equal(f.elements.notes.value, 'Keep these notes');
    assert.ok(f.form.elements.every(control => !control.disabled));
    assert.equal(f.elements.saveContactBtn.textContent, 'Save contact');
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
    assert.equal(f.elements.contactEditor.hidden, false);
    const request = f.requests[0];
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '../php/contacts.php');
    assert.equal(request.timeout, 15000);
    assert.equal(request.withCredentials, true);
    assert.deepEqual(JSON.parse(request.body), {
        first_name: 'Jane', last_name: 'Doe', email: '', phone: '', address: '', notes: 'Keep these notes',
    });
    request.respond(201, { contact: { id: 6 } });
    assert.equal(f.elements.contactEditor.hidden, true);
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
        assert.equal(f.elements.contactEditor.hidden, true);
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
    assert.equal(cells[0].children[0].children[1].textContent, '<b>Jane</b> Doe');
    assert.equal(cells[3].children[1].textContent, '2026-09-24');
    assert.equal(cells[4].children[0].children[0].textContent, 'Edit');
    assert.equal(cells[4].children[0].children[0].dataset.id, 42);
    assert.equal(cells[4].children[0].children[1].textContent, 'Delete');
    assert.equal(cells[4].children[0].children[1].dataset.id, 42);
    f.context.loadContacts([]);
    assert.equal(f.elements.contactsTableBody.children.length, 0);
    assert.equal(f.elements.emptyState.hidden, false);
    assert.equal(f.elements.contactsTable.hidden, true);
    assert.equal(f.elements.emptyActionBtn.textContent, 'Add your first contact');
});


test('search uses the server and stale responses cannot replace the newest results', () => {
    const f = fixture();
    f.elements.searchBox.value = 'Ada';
    f.context.searchContact();
    f.elements.searchBox.value = 'Grace';
    f.context.searchContact();
    assert.equal(f.requests[0].url, '../php/contacts.php?search=Ada');
    assert.equal(f.requests[1].url, '../php/contacts.php?search=Grace');
    f.requests[1].respond(200, { contacts: [{ id: 2, first_name: 'Grace', last_name: 'Hopper' }] });
    f.requests[0].respond(200, { contacts: [{ id: 1, first_name: 'Ada', last_name: 'Lovelace' }] });
    const name = f.elements.contactsTableBody.children[0].children[0].children[0].children[1];
    assert.equal(name.textContent, 'Grace Hopper');
    assert.equal(f.elements.listContent.attributes['aria-busy'], 'false');
});

test('failed searches remove loading placeholders and expose a retry action', () => {
    const f = fixture();
    f.context.createContacts();
    f.requests[0].onerror();
    assert.equal(f.elements.listContent.attributes['aria-busy'], 'false');
    assert.equal(f.elements.contactsTableBody.children.length, 0);
    assert.equal(f.elements.retryContactsBtn.hidden, false);
    assert.equal(f.elements.emptyState.hidden, true);
});

test('closing the inline editor restores focus and cannot interrupt a save', () => {
    const f = fixture();
    f.context.newContact();
    assert.equal(f.elements.firstName.focused, true);
    assert.equal(f.elements.addContactBtn.attributes['aria-expanded'], 'true');
    f.context.closeEditor();
    assert.equal(f.elements.contactEditor.hidden, true);
    assert.equal(f.elements.addContactBtn.focused, true);
    f.context.newContact();
    f.elements.firstName.value = 'Ada';
    f.elements.lastName.value = 'Lovelace';
    f.context.saveContact(null);
    f.context.closeEditor();
    assert.equal(f.elements.contactEditor.hidden, false);
});

test('a late edit response cannot overwrite a new contact draft', () => {
    const f = fixture();
    f.context.fetchContactForEdit(42);
    f.context.newContact();
    f.elements.firstName.value = 'New draft';
    f.requests[0].respond(200, { contact: { id: 42, first_name: 'Previous', last_name: 'Contact' } });
    assert.equal(f.elements.firstName.value, 'New draft');
    assert.equal(vm.runInContext('editContactId', f.context), null);
});

for (const [name, fail] of [
    ['server error', request => request.respond(500, {})],
    ['network error', request => request.onerror()],
]) {
    test(`delete ${name} keeps confirmation open and allows a successful retry`, () => {
        const f = fixture();
        f.context.deleteContact(42);
        f.context.deleteContact(42);
        assert.equal(f.requests.length, 1);
        assert.equal(f.elements.cancelDeleteBtn.disabled, true);
        fail(f.requests[0]);
        assert.equal(f.elements.deleteDialog.open, true);
        assert.equal(f.elements.confirmDeleteBtn.disabled, false);
        assert.equal(f.elements.deleteError.focused, true);
        assert.equal(f.requests.length, 1);
        f.context.deleteContact(42);
        assert.equal(f.requests[1].method, 'DELETE');
        assert.equal(f.requests[1].url, '../php/contacts.php?id=42');
        f.requests[1].respond(200, { message: 'Contact deleted' });
        assert.equal(f.elements.deleteDialog.open, false);
        assert.equal(f.elements.addContactBtn.focused, true);
        assert.equal(f.requests[2].method, 'GET');
    });
}

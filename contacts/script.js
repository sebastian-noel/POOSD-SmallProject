const API_URL = window.APP_CONFIG?.API_URL || '../php/contacts.php';
const AUTH_BASE_URL = window.APP_CONFIG?.AUTH_BASE_URL || '../php/auth';

let editContactId = null;
let isSavingContact = false;
let activeSearchTerm = '';
let listRequestVersion = 0;
let editorRequestVersion = 0;
let editorTrigger = null;
let deleteTarget = null;
let isDeletingContact = false;

function openEditor(trigger = document.getElementById('addContactBtn'))
{
    editorTrigger = trigger;
    document.getElementById('contactEditor').hidden = false;
    document.getElementById('addContactBtn').setAttribute('aria-expanded', 'true');
    document.getElementById('firstName').focus();
}

function closeEditor(restoreFocus = true)
{
    if (isSavingContact) return;
    editorRequestVersion++;
    document.getElementById('contactEditor').hidden = true;
    document.getElementById('addContactBtn').setAttribute('aria-expanded', 'false');
    editContactId = null;
    if (restoreFocus) (editorTrigger?.isConnected ? editorTrigger : document.getElementById('addContactBtn')).focus();
}

function newContact()
{
    if (isSavingContact) return;
    editorRequestVersion++;
    setContactSaveMessage('');
    document.getElementById('contactSearchResult').textContent = '';
    editContactId = null;
    document.getElementById('contactForm').reset();
    document.getElementById('editorTitle').textContent = 'New contact';
    openEditor();
}

async function doLogout()
{
	const button = document.getElementById('logoutBtn');
	button.disabled = true;
	try
	{
		const response = await fetch(AUTH_BASE_URL + '/logout.php', {
			method: 'POST',
			credentials: 'include',
			headers: { Accept: 'application/json' },
		});
		if (!response.ok) throw new Error('Logout failed');
		window.location.replace('../login/index.html');
	}
	catch
	{
		const message = document.getElementById('contactSearchResult');
		message.textContent = 'Unable to log out. Please try again.';
		message.className = 'contact-message error';
	}
	finally
	{
		button.disabled = false;
	}
}

async function checkSession()
{
	const panel = document.getElementById('contactsPanel');
	const message = document.getElementById('sessionMessage');
	panel.hidden = true;
	document.getElementById('accountControls').hidden = true;
	document.getElementById('contactsTableBody').replaceChildren();
	closeEditor(false);
	message.textContent = 'Checking your session...';
	try
	{
		const response = await fetch(AUTH_BASE_URL + '/me.php', {
			credentials: 'include',
			cache: 'no-store',
			headers: { Accept: 'application/json' },
		});
		if (response.status === 401)
		{
			window.location.replace('../login/index.html');
			return false;
		}
		if (!response.ok) throw new Error('Session check failed');
		const data = await response.json();
		if (!data.user?.id) throw new Error('Missing user');
		message.textContent = '';
		document.getElementById('accountName').textContent = data.user.username;
		document.getElementById('accountAvatar').textContent = [...data.user.username][0].toUpperCase();
		document.getElementById('accountControls').hidden = false;
		panel.hidden = false;
		return true;
	}
	catch
	{
		message.textContent = 'Unable to check your session. Reload the page to try again.';
		message.className = 'contact-message error';
		return false;
	}
}

function setContactSaveMessage(text)
{
	const message = document.getElementById('contactAddResult');
	message.textContent = text;
	message.className = text ? 'contact-message error' : 'contact-message';
	if (text) message.focus();
}

function setContactSaving(saving)
{
	isSavingContact = saving;
	const form = document.getElementById('contactForm');
	for (const control of form.elements) control.disabled = saving;
	form.setAttribute('aria-busy', String(saving));
	document.getElementById('saveContactBtn').textContent = saving ? 'Saving...' : 'Save contact';
	document.getElementById('saveContactBtn').setAttribute('aria-busy', String(saving));
	document.getElementById('closeEditorBtn').disabled = saving;
}

function saveContact(id)
{
	if (isSavingContact) return;
	const form = document.getElementById('contactForm');
	setContactSaveMessage('');
	if (!form.reportValidity()) return;
	const contact = {
		first_name: document.getElementById('firstName').value.trim(),
		last_name: document.getElementById('lastName').value.trim(),
		phone: document.getElementById('contactPhone').value.trim(),
		email: document.getElementById('contactEmail').value.trim(),
		address: document.getElementById('contactAddress').value.trim(),
		notes: document.getElementById('notes').value.trim(),
	};
	if (!contact.first_name || !contact.last_name)
	{
		setContactSaveMessage('First and last name are required.');
		return;
	}

	setContactSaving(true);
	const fail = message => {
		setContactSaving(false);
		setContactSaveMessage(message);
	};
	const xhr = new XMLHttpRequest();
	xhr.onload = function()
	{
		let data;
		try { data = JSON.parse(xhr.responseText); }
		catch
		{
			fail('Unexpected response from the server. Your entries have been kept.');
			return;
		}
		if (xhr.status !== (id === null ? 201 : 200))
		{
			fail(typeof data?.message === 'string' ? data.message : 'Unable to save this contact. Please try again.');
			return;
		}
		if (!data?.contact?.id)
		{
			fail('The server did not confirm the saved contact. Your entries have been kept.');
			return;
		}

		setContactSaving(false);
		editContactId = null;
		form.reset();
		closeEditor(false);
		const message = document.getElementById('contactSearchResult');
		message.textContent = id === null ? 'Contact has been added.' : 'Contact has been updated.';
		message.className = 'contact-message success';
		createContacts();
		document.getElementById('addContactBtn').focus();
	};
	xhr.onerror = () => fail('Unable to reach the server. Your entries have been kept.');
	xhr.ontimeout = () => fail('The save request timed out. Your entries have been kept.');
	xhr.onabort = () => fail('The save request was interrupted. Your entries have been kept.');
	try
	{
		xhr.open(id === null ? 'POST' : 'PUT', id === null ? API_URL : API_URL + '?id=' + encodeURIComponent(id), true);
		xhr.withCredentials = true;
		xhr.timeout = 15000;
		xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
		xhr.send(JSON.stringify(contact));
	}
	catch
	{
		fail('Unable to send this contact. Your entries have been kept.');
	}
}


function searchContact()
{
    activeSearchTerm = document.getElementById('searchBox').value.trim();
    createContacts();
}

function clearSearch()
{
    document.getElementById('searchBox').value = '';
    activeSearchTerm = '';
    createContacts();
    document.getElementById('searchBox').focus();
}

function createContacts()
{
    const version = ++listRequestVersion;
    const body = document.getElementById('contactsTableBody');
    const status = document.getElementById('listStatus');
    const content = document.getElementById('listContent');
    const table = document.getElementById('contactsTable');
    document.getElementById('retryContactsBtn').hidden = true;
    document.getElementById('emptyState').hidden = true;
    document.getElementById('clearSearchBtn').hidden = !activeSearchTerm;
    document.getElementById('listSummary').textContent = activeSearchTerm ? `Results for “${activeSearchTerm}”` : 'All contacts';
    document.getElementById('contactCount').textContent = '';
    content.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading contacts...';
    status.className = 'contact-message';
    table.hidden = false;
    body.replaceChildren();
    for (let i = 0; i < 3; i++) {
        const row = document.createElement('tr');
        row.setAttribute('aria-hidden', 'true');
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('td');
            const bar = document.createElement('span');
            bar.className = 'skeleton-bar';
            cell.appendChild(bar);
            row.appendChild(cell);
        }
        body.appendChild(row);
    }
    const fail = message => {
        if (version !== listRequestVersion) return;
        content.setAttribute('aria-busy', 'false');
        body.replaceChildren();
        table.hidden = true;
        status.textContent = message;
        status.className = 'contact-message error';
        document.getElementById('retryContactsBtn').hidden = false;
    };
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + (activeSearchTerm ? '?search=' + encodeURIComponent(activeSearchTerm) : ''), true);
    xhr.withCredentials = true;
    xhr.timeout = 15000;
    xhr.onload = () => {
        if (version !== listRequestVersion) return;
        if (xhr.status === 401) {
            window.location.replace('../login/index.html');
            return;
        }
        try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status !== 200 || !Array.isArray(data.contacts)) throw new Error();
            content.setAttribute('aria-busy', 'false');
            status.textContent = `${data.contacts.length} ${data.contacts.length === 1 ? 'contact' : 'contacts'} ${activeSearchTerm ? 'found' : 'loaded'}.`;
            status.className = 'sr-only';
            loadContacts(data.contacts);
        } catch {
            fail('We could not load your contacts. Please try again.');
        }
    };
    xhr.onerror = () => fail('Unable to reach the server. Check your connection and try again.');
    xhr.ontimeout = () => fail('Loading took too long. Please try again.');
    xhr.send();
}

function loadContacts(contacts)
{
    const body = document.getElementById('contactsTableBody');
    body.replaceChildren();
    document.getElementById('contactCount').textContent = `${contacts.length} ${contacts.length === 1 ? 'person' : 'people'}`;
    document.getElementById('contactsTable').hidden = contacts.length === 0;
    document.getElementById('emptyState').hidden = contacts.length !== 0;
    document.getElementById('emptyTitle').textContent = activeSearchTerm ? 'No matches this time.' : 'Your people, all together.';
    document.getElementById('emptyDescription').textContent = activeSearchTerm ? 'Try part of a name, an email, or a phone number.' : 'Add your first contact to start your address book.';
    document.getElementById('emptyActionBtn').textContent = activeSearchTerm ? 'Clear search' : 'Add your first contact';
    contacts.forEach(contact => {
        const fullName = contact.first_name + ' ' + contact.last_name;
        const row = document.createElement('tr');
        row.setAttribute('role', 'row');
        const nameCell = document.createElement('td');
        nameCell.setAttribute('role', 'cell');
        const person = document.createElement('div');
        person.className = 'person-cell';
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = [...contact.first_name][0] + [...contact.last_name][0];
        const name = document.createElement('span');
        name.className = 'person-name';
        name.textContent = fullName;
        person.append(avatar, name);
        nameCell.appendChild(person);
        row.appendChild(nameCell);
        const createdDate = (contact.created_at || '').slice(0, 10);
        for (const [label, value] of [['Email', contact.email], ['Phone', contact.phone], ['Added', createdDate]]) {
            const cell = document.createElement('td');
            cell.setAttribute('role', 'cell');
            if (label === 'Added') cell.className = 'date-column';
            const mobileLabel = document.createElement('span');
            mobileLabel.className = 'cell-label';
            mobileLabel.setAttribute('aria-hidden', 'true');
            mobileLabel.textContent = label;
            const text = document.createElement('span');
            text.className = 'cell-value';
            text.textContent = value || 'Not added';
            cell.append(mobileLabel, text);
            row.appendChild(cell);
        }
        const actions = document.createElement('td');
        actions.setAttribute('role', 'cell');
        const group = document.createElement('div');
        group.className = 'row-actions';
        for (const [label, className] of [['Edit', 'btn-edit'], ['Delete', 'btn-delete']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = className;
            button.dataset.id = contact.id;
            button.dataset.name = fullName;
            button.setAttribute('aria-label', `${label} ${fullName}`);
            button.textContent = label;
            group.appendChild(button);
        }
        actions.appendChild(group);
        row.appendChild(actions);
        body.appendChild(row);
    });
}

function deleteContact(id)
{
    if (isDeletingContact) return;
    const dialog = document.getElementById('deleteDialog');
    const confirm = document.getElementById('confirmDeleteBtn');
    const cancel = document.getElementById('cancelDeleteBtn');
    const error = document.getElementById('deleteError');
    error.textContent = '';
    isDeletingContact = true;
    confirm.disabled = cancel.disabled = true;
    confirm.textContent = 'Deleting...';
    confirm.setAttribute('aria-busy', 'true');
    const finish = () => {
        isDeletingContact = false;
        confirm.disabled = cancel.disabled = false;
        confirm.textContent = 'Delete contact';
        confirm.setAttribute('aria-busy', 'false');
    };
    const fail = () => {
        finish();
        error.textContent = 'We could not delete this contact. Please try again.';
        error.focus();
    };
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_URL + '?id=' + encodeURIComponent(id), true);
    xhr.withCredentials = true;
    xhr.timeout = 15000;
    xhr.onload = () => {
        if (xhr.status !== 200 && xhr.status !== 204) { fail(); return; }
        finish();
        dialog.close();
        if (String(editContactId) === String(id)) closeEditor(false);
        const message = document.getElementById('contactSearchResult');
        message.textContent = 'Contact deleted.';
        message.className = 'contact-message success';
        createContacts();
        document.getElementById('addContactBtn').focus();
    };
    xhr.onerror = xhr.ontimeout = fail;
    xhr.send();
}

function editContact(contact, trigger)
{
	if (isSavingContact) return;
	setContactSaveMessage('');
	editContactId = contact.id;
	document.getElementById("firstName").value = contact.first_name || "";
	document.getElementById("lastName").value = contact.last_name || "";
	document.getElementById("contactEmail").value = contact.email || "";
	document.getElementById("contactPhone").value = contact.phone || "";
	document.getElementById("contactAddress").value = contact.address || "";
	document.getElementById("notes").value = contact.notes || "";
	document.getElementById("editorTitle").textContent = "Edit contact";
	openEditor(trigger);
}

function fetchContactForEdit(id, trigger)
{
    if (isSavingContact) return;
    const version = ++editorRequestVersion;
    const message = document.getElementById('contactSearchResult');
    message.textContent = 'Opening contact...';
    message.className = 'contact-message';
    const fail = () => {
        if (version !== editorRequestVersion) return;
        message.textContent = 'We could not open this contact. Please try again.';
        message.className = 'contact-message error';
    };
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '?id=' + encodeURIComponent(id), true);
    xhr.withCredentials = true;
    xhr.timeout = 15000;
    xhr.onload = () => {
        if (version !== editorRequestVersion) return;
        try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status !== 200 || !data.contact?.id) throw new Error();
            message.textContent = '';
            editContact(data.contact, trigger);
        } catch { fail(); }
    };
    xhr.onerror = xhr.ontimeout = fail;
    xhr.send();
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('contactsTableBody').addEventListener('click', event => {
        const button = event.target.closest('button[data-id]');
        if (!button || isSavingContact) return;
        if (button.classList.contains('btn-delete')) {
            deleteTarget = button;
            document.getElementById('deleteError').textContent = '';
            document.getElementById('deleteDescription').textContent = `${button.dataset.name} will be removed from your address book. This cannot be undone.`;
            document.getElementById('deleteDialog').showModal();
        } else if (button.classList.contains('btn-edit')) {
            fetchContactForEdit(button.dataset.id, button);
        }
    });
    document.getElementById('addContactBtn').addEventListener('click', newContact);
    document.getElementById('emptyActionBtn').addEventListener('click', () => activeSearchTerm ? clearSearch() : newContact());
    document.getElementById('closePopupBtn').addEventListener('click', () => closeEditor());
    document.getElementById('closeEditorBtn').addEventListener('click', () => closeEditor());
    document.getElementById('contactEditor').addEventListener('keydown', event => {
        if (event.key === 'Escape' && !isSavingContact) { event.preventDefault(); closeEditor(); }
    });
    document.getElementById('contactForm').addEventListener('submit', event => {
        event.preventDefault();
        saveContact(editContactId);
    });
    document.getElementById('searchForm').addEventListener('submit', event => {
        event.preventDefault();
        searchContact();
    });
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    document.getElementById('retryContactsBtn').addEventListener('click', createContacts);
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
    document.getElementById('deleteForm').addEventListener('submit', event => {
        event.preventDefault();
        if (deleteTarget) deleteContact(deleteTarget.dataset.id);
    });
    const dialog = document.getElementById('deleteDialog');
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { if (isDeletingContact) event.preventDefault(); });
    dialog.addEventListener('close', () => { if (deleteTarget?.isConnected) deleteTarget.focus(); });
    if (await checkSession()) createContacts();
});

window.addEventListener('pageshow', async event => {
    if (event.persisted && await checkSession()) createContacts();
});

const API_URL = window.APP_CONFIG?.API_URL || '../php/contacts.php';
const AUTH_BASE_URL = window.APP_CONFIG?.AUTH_BASE_URL || '../php/auth';
//most code adopted from COLORS lab, pls dont kill me :(

let editContactId = null;
let isSavingContact = false;

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
	document.getElementById('contactsTableBody').replaceChildren();
	document.getElementById('popupOverlay').style.display = 'none';
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
}

function setContactSaving(saving)
{
	isSavingContact = saving;
	const form = document.getElementById('contactForm');
	for (const control of form.elements) control.disabled = saving;
	form.setAttribute('aria-busy', String(saving));
	document.getElementById('saveContactBtn').textContent = saving ? 'Saving...' : 'Save Contact';
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
		document.getElementById('popupOverlay').style.display = 'none';
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
	let srch = document.getElementById("searchBox").value;
	document.getElementById("contactSearchResult").innerHTML = "";

	let url = API_URL + '?search=' + encodeURIComponent(srch);

	let xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);

	try
	{
		xhr.onreadystatechange = function() 
		{
			if (this.readyState == 4 && this.status == 200) 
			{
				document.getElementById("contactSearchResult").innerHTML = "Contacts(s) has been retrieved";
				let jsonObject = JSON.parse(xhr.responseText);
				loadContacts(jsonObject.contacts);
			}
		};
		xhr.send();
	}
	catch(err)
	{
		document.getElementById("contactSearchResult").innerHTML = err.message;
	}
	
}

function createContacts()
{
	let xhr = new XMLHttpRequest();
	xhr.open("GET", API_URL,true);
	xhr.onreadystatechange = function()
	{
		if (this.readyState==4&&this.status==200)
		{
			let jsonObject = JSON.parse(xhr.responseText);
			loadContacts(jsonObject.contacts);
		}
	}
	xhr.send();
}

function loadContacts(contacts)
{
	let body = document.getElementById("contactsTableBody");
	body.replaceChildren();

	if (!contacts||contacts.length===0)
	{
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 5;
		cell.textContent = 'No contacts found';
		row.appendChild(cell);
		body.appendChild(row);
		return;
	}
	contacts.forEach(function(contact)
	{
		const row = document.createElement('tr');
		const values = [contact.first_name + ' ' + contact.last_name, contact.email,
			contact.phone, (contact.created_at || '').slice(0, 10)];
		for (const value of values)
		{
			const cell = document.createElement('td');
			cell.textContent = value || '';
			row.appendChild(cell);
		}
		const actions = document.createElement('td');
		for (const [label, className] of [['Edit', 'secondary-btn'], ['Delete', 'btn-delete']])
		{
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className;
			button.dataset.id = contact.id;
			button.textContent = label;
			actions.append(button, ' ');
		}
		row.appendChild(actions);
		body.appendChild(row);
	});
}

function deleteContact(id)
{
	let xhr = new XMLHttpRequest();
	xhr.open("DELETE", API_URL + '?id=' + id, true);
	xhr.onreadystatechange = function()
	{
		if (this.readyState == 4 && (this.status == 200 || this.status == 204))
		{
			document.getElementById("contactDeleteResult").innerHTML = "Contact deleted";
			document.getElementById("contactDeleteResult").className = "contact-message success";
			createContacts(); // refresh the table
		}
		else if (this.readyState == 4)
		{
			document.getElementById("contactDeleteResult").innerHTML = "Error deleting contact";
			document.getElementById("contactDeleteResult").className = "contact-message error";
		}
	};
	xhr.send();
}

function editContact(contact)
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
	document.getElementById("popupTitle").textContent = "Edit Contact";
	document.getElementById("popupOverlay").style.display = "grid";
}

function fetchContactForEdit(id)
{
	let xhr = new XMLHttpRequest();
	xhr.open("GET", API_URL + '?id=' + id, true);
	xhr.onreadystatechange = function()
	{
		if (this.readyState == 4 && this.status == 200)
		{
			let jsonObject = JSON.parse(xhr.responseText);
			editContact(jsonObject.contact);
		}
	};
	xhr.send();
}

document.addEventListener("DOMContentLoaded", async function ()
{
	let overlay = document.getElementById("popupOverlay");
	let addBtn = document.getElementById("addContactBtn");
	let closeBtn = document.getElementById("closePopupBtn");
	let form = document.getElementById("contactForm");
	let searchBox = document.getElementById("searchBox");
	let tableBody = document.getElementById("contactsTableBody");
	tableBody.addEventListener("click", function(event)
	{
		if (event.target.classList.contains("btn-delete"))
		{
			let id = event.target.getAttribute("data-id");
			let confirmed = window.confirm("Delete this contact? This can't be undone.");
			if (confirmed)
			{
			deleteContact(id);
			}
		}
		else if (event.target.classList.contains("secondary-btn"))
		{
			let id = event.target.getAttribute("data-id");
			fetchContactForEdit(id);
		}

	});
	addBtn.addEventListener("click", function()
	{
		if (isSavingContact) return;
		setContactSaveMessage('');
		editContactId = null;
		form.reset();
		document.getElementById("popupTitle").textContent = "Add Contact";
		overlay.style.display = "grid";
	});
 
	closeBtn.addEventListener("click", function()
	{
		if (isSavingContact) return;
		editContactId = null;
		overlay.style.display = "none";
	});
 
	form.addEventListener("submit", function(event)
	{
		event.preventDefault();
		saveContact(editContactId);
	});
 
	searchBox.addEventListener("keydown", function(event)
	{
		if (event.key ==="Enter")
		{
			searchContact();
		}
	});
	let logoutBtn = document.getElementById("logoutBtn");
	logoutBtn.addEventListener("click", doLogout);
 
	if (await checkSession()) createContacts();
});

// A page restored with Back/Forward must check the session again before showing data.
window.addEventListener('pageshow', async function(event)
{
	if (event.persisted && await checkSession()) createContacts();
});

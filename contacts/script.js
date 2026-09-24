const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api/contacts';
//most code adopted from COLORS lab, pls dont kill me :(

let userName = "";
let firstName = "";
let lastName = "";
let editContactId = null;

function doLogout()
{
	userName = "";
	firstName = "";
	lastName = "";
	document.cookie = "firstName=; expires = Thu, 01 Jan 1970 00:00:00 GMT";
	document.cookie = "lastName=; expires = Thu, 01 Jan 1970 00:00:00 GMT";
	document.cookie = "userName=; expires = Thu, 01 Jan 1970 00:00:00 GMT";
	window.location.href = "index.html";
}

function addContact()
{
	let tmp = {
	first_name: document.getElementById("firstName").value,
	last_name: document.getElementById("lastName").value,
	phone: document.getElementById("contactPhone").value,
	email: document.getElementById("contactEmail").value,
	address: document.getElementById("contactAddress").value,
	notes: document.getElementById("notes").value,
	date_created: document.getElementById("dateCreated").value
	};
	let jsonPayload = JSON.stringify( tmp );
	let url = API_URL;
	
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function() 
		{
			if (this.readyState == 4 && (this.status == 200 ||this.status == 201)) //changed to also include 201
			{
				document.getElementById("contactAddResult").innerHTML = "Contact has been added";
				document.getElementById("contactAddResult").className = "contact-message success"; //color
				createContacts();
			} else if (this.readyState == 4) // added to catch error on php to be able to notify user when contact cannot be added
			{
				let jsonObject = JSON.parse(xhr.responseText);
				document.getElementById("contactAddResult").innerHTML = jsonObject.message || "Error adding contact";
				document.getElementById("contactAddResult").className = "contact-message error"; //color
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("contactAddResult").innerHTML = err.message;
		document.getElementById("contactAddResult").className = "contact-message error"; //cp;pr
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
	body.innerHTML="";

	if (!contacts||contacts.length===0)
	{
		body.innerHTML ="<tr><td colspan=\"5\">No contacts found</td></tr>";
		return;
	}
	contacts.forEach(function(contact)
	{
	let r = document.createElement("tr");
	r.innerHTML = "<td>" + contact.first_name + " " + contact.last_name + "</td>" + "<td>" + contact.email + "</td>" + "<td>" + contact.phone + "</td>" + "<td>" + (contact.date_created || "") + "</td>" +"<td>" + "<button class=\"secondary-btn\" type=\"button\" data-id=\"" + contact.id + "\">Edit</button> " +"<button class=\"btn-delete\" type=\"button\" data-id=\"" + contact.id + "\">Delete</button>" + "</td>";
	body.appendChild(r);
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
	editContactId = contact.id;
	document.getElementById("firstName").value = contact.first_name || "";
	document.getElementById("lastName").value = contact.last_name || "";
	document.getElementById("contactEmail").value = contact.email || "";
	document.getElementById("contactPhone").value = contact.phone || "";
	document.getElementById("contactAddress").value = contact.address || "";
	document.getElementById("notes").value = contact.notes || "";
	document.getElementById("dateCreated").value = contact.date_created || "";
	document.getElementById("popupTitle").innerHTML = "Edit Contact";
	document.getElementById("popupOverlay").style.display = "grid";
}
function updateContact(id)
{
	let tmp = {
	first_name: document.getElementById("firstName").value,
	last_name: document.getElementById("lastName").value,
	phone: document.getElementById("contactPhone").value,
	email: document.getElementById("contactEmail").value,
	address: document.getElementById("contactAddress").value,
	notes: document.getElementById("notes").value,
	date_created: document.getElementById("dateCreated").value
	};
	let jsonPayload = JSON.stringify( tmp );

	let xhr = new XMLHttpRequest();
	xhr.open("PUT", API_URL + '?id=' + id, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function()
		{
			if (this.readyState == 4 && this.status == 200)
			{
				document.getElementById("contactAddResult").innerHTML = "Contact has been updated";
				document.getElementById("contactAddResult").className = "contact-message success";
				createContacts();
			}
			else if (this.readyState == 4)
			{
				let jsonObject = JSON.parse(xhr.responseText);
				document.getElementById("contactAddResult").innerHTML = jsonObject.message || "Error updating contact";
				document.getElementById("contactAddResult").className = "contact-message error";
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("contactAddResult").innerHTML = err.message;
		document.getElementById("contactAddResult").className = "contact-message error";
	}
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

document.addEventListener("DOMContentLoaded", function ()
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
		editContactId = null;
		form.reset();
		document.getElementById("popupTitle").innerHTML = "Add Contact";
		overlay.style.display = "grid";
	});
 
	closeBtn.addEventListener("click", function()
	{
		editContactId = null;
		overlay.style.display = "none";
	});
 
	form.addEventListener("submit", function(event)
	{
		event.preventDefault();
		if (editContactId)
		{
			updateContact(editContactId);
		}
		else
		{
			addContact();
		}
		editContactId = null;
		overlay.style.display = "none";
		form.reset();
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
 
	createContacts();
});

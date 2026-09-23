const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api/contacts';
//most code adopted from COLORS lab, pls dont kill me :(

let userName = "";
let firstName = "";
let lastName = "";
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
	let tmp = {firstName:document.getElementById("firstName").value, lastName:document.getElementById("lastName").value, phone:document.getElementById("contactPhone").value, email:document.getElementById("contactEmail").value, address:document.getElementById("contactAddress").value, notes:document.getElementById("notes").value, dateCreated:document.getElementById("dateCreated").value};
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
	r.innerHTML = "<td>" + contact.firstName + " " + contact.lastName + "</td>" + "<td>" + contact.email + "</td>" + "<td>" + contact.phone + "</td>" + "<td>" + (contact.dateCreated || "") + "</td>" +"<td>" + "<button class=\"secondary-btn\" type=\"button\">Edit</button> " +"<button class=\"btn-delete\" type=\"button\">Delete</button>" + "</td>";
	body.appendChild(r);
	});
}

document.addEventListener("DOMContentLoaded", function ()
{
	let overlay = document.getElementById("popupOverlay");
	let addBtn = document.getElementById("addContactBtn");
	let closeBtn = document.getElementById("closePopupBtn");
	let form = document.getElementById("contactForm");
	let searchBox = document.getElementById("searchBox");
	addBtn.addEventListener("click", function()
	{
		overlay.style.display = "grid";
	});
 
	closeBtn.addEventListener("click", function()
	{
		overlay.style.display = "none";
	});
 
	form.addEventListener("submit", function(event)
	{
		event.preventDefault();
		addContact();
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
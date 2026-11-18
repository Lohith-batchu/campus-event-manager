"use strict";

const API_BASE = "http://127.0.0.1:5001";
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const eventContainer = document.getElementById("eventContainer");
const noEventsMessage = document.getElementById("noEventsMessage");
const apiStatus = document.getElementById("apiStatus");
const registrationContainer = document.getElementById("registrationContainer");
const eventModal = document.getElementById("eventDetailsModal");
const eventDetailsTitle = document.getElementById("eventDetailsTitle");
const eventDetailsBody = document.getElementById("eventDetailsBody");
const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");
const studentNameInput = document.getElementById("studentName");

// Each browser receives its own demo identifier; this is NOT authentication.
let clientId = localStorage.getItem("campusEventClientId");
if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem("campusEventClientId", clientId);
}

let events = [];
let registrations = [];

function textElement(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
}

function friendlyDate(value) {
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function showApiError(message) {
    apiStatus.textContent = message;
    apiStatus.classList.remove("d-none");
}

function clearApiError() {
    apiStatus.classList.add("d-none");
    apiStatus.textContent = "";
}

function renderEvents() {
    eventContainer.replaceChildren();

    events.forEach(function (event) {
        const column = document.createElement("div");
        column.className = "col-md-6 col-lg-4 event-card";
        column.dataset.category = event.category.toLowerCase();

        const card = textElement("article", "card h-100 shadow-sm", "");
        const body = document.createElement("div");
        body.className = "card-body";

        const colors = {technical:"bg-primary", cultural:"bg-success", sports:"bg-warning text-dark", workshop:"bg-info text-dark"};
        const badge = textElement("span", "badge mb-3 " + (colors[event.category.toLowerCase()] || "bg-secondary"), event.category);
        const title = textElement("h3", "card-title h5", event.name);
        const description = textElement("p", "card-text", event.description);
        const date = textElement("p", "mb-1", "Date: " + friendlyDate(event.date));
        const venue = textElement("p", "mb-3", "Venue: " + event.venue);
        const button = textElement("button", "btn btn-outline-primary", "View Details");
        button.type = "button";
        button.dataset.eventId = String(event.id);
        button.setAttribute("data-bs-toggle", "modal");
        button.setAttribute("data-bs-target", "#eventDetailsModal");
        body.append(badge, title, description, date, venue, button);
        card.appendChild(body);
        column.appendChild(card);
        eventContainer.appendChild(column);
    });
    filterEvents();
}

function filterEvents() {
    const searchText = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    let count = 0;
    eventContainer.querySelectorAll(".event-card").forEach(function (card) {
        const title = card.querySelector(".card-title").textContent.toLowerCase();
        const matches = title.includes(searchText) && (category === "all" || card.dataset.category === category);
        card.classList.toggle("d-none", !matches);
        if (matches) count++;
    });
    noEventsMessage.classList.toggle("d-none", count !== 0 || events.length === 0);
}

searchInput.addEventListener("input", filterEvents);
categoryFilter.addEventListener("change", filterEvents);

function renderRegistrations() {
    registrationContainer.replaceChildren();
    if (!registrations.length) {
        registrationContainer.appendChild(textElement("p", "text-muted text-center", "No registrations yet. Explore an event and click Register Now."));
        return;
    }
    registrations.forEach(function (event) {
        const card = textElement("article", "card registration-card mb-3", "");
        const body = textElement("div", "card-body d-flex justify-content-between align-items-center gap-3 flex-wrap", "");
        const info = document.createElement("div");
        info.append(
            textElement("h3", "h5 mb-1", event.name),
            textElement("p", "mb-0 text-muted", friendlyDate(event.date) + " | " + event.venue),
            textElement("small", "text-muted", "Registered as " + event.student_name)
        );
        const cancel = textElement("button", "btn btn-outline-danger btn-sm", "Cancel registration");
        cancel.type = "button";
        cancel.addEventListener("click", () => cancelRegistration(event.registration_id));
        body.append(info, cancel);
        card.appendChild(body);
        registrationContainer.appendChild(card);
    });
}

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed (HTTP " + response.status + ")");
    return data;
}

async function loadEvents() {
    try {
        clearApiError();
        events = await requestJson(API_BASE + "/api/events");
        renderEvents();
        await loadRegistrations();
        console.log("Events loaded:", events);
    } catch (error) {
        eventContainer.replaceChildren(textElement("div", "col-12 text-center text-muted", "Unable to load events."));
        registrationContainer.textContent = "Unable to load registrations while the backend is unavailable.";
        showApiError("Cannot connect to Flask. Start the backend on port 5001, then refresh. " + error.message);
    }
}

async function loadRegistrations() {
    registrations = await requestJson(API_BASE + "/api/registrations?client_id=" + encodeURIComponent(clientId));
    renderRegistrations();
}

eventModal.addEventListener("show.bs.modal", function (modalEvent) {
    const button = modalEvent.relatedTarget;
    const eventId = Number(button?.dataset.eventId);
    const selected = events.find(item => item.id === eventId);
    registerMessage.textContent = "";
    registerButton.disabled = !selected;
    if (!selected) {
        eventDetailsTitle.textContent = "Event not found";
        eventDetailsBody.textContent = "Please refresh and try again.";
        return;
    }
    eventDetailsTitle.textContent = selected.name;
    eventDetailsBody.replaceChildren(
        textElement("p", "", "Category: " + selected.category),
        textElement("p", "", "Date: " + friendlyDate(selected.date)),
        textElement("p", "", "Venue: " + selected.venue),
        textElement("p", "", selected.description)
    );
    registerButton.dataset.eventId = String(selected.id);
    const alreadyRegistered = registrations.some(item => item.id === selected.id);
    registerButton.disabled = alreadyRegistered;
    registerButton.textContent = alreadyRegistered ? "Already Registered" : "Register Now";
});

registerButton.addEventListener("click", async function () {
    const name = studentNameInput.value.trim();
    if (!name || name.length > 80) {
        registerMessage.textContent = "Enter your name (1–80 characters).";
        registerMessage.className = "small text-danger";
        studentNameInput.focus();
        return;
    }
    registerButton.disabled = true;
    registerMessage.textContent = "Saving registration...";
    registerMessage.className = "small text-muted";
    try {
        await requestJson(API_BASE + "/api/registrations", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({event_id:Number(registerButton.dataset.eventId), client_id:clientId, student_name:name})
        });
        await loadRegistrations();
        registerMessage.textContent = "Registration saved!";
        registerMessage.className = "small text-success";
        bootstrap.Modal.getInstance(eventModal)?.hide();
    } catch (error) {
        registerMessage.textContent = error.message;
        registerMessage.className = "small text-danger";
        registerButton.disabled = false;
    }
});

async function cancelRegistration(registrationId) {
    if (!confirm("Cancel this registration?")) return;
    try {
        await requestJson(API_BASE + "/api/registrations/" + registrationId, {
            method:"DELETE",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({client_id:clientId})
        });
        await loadRegistrations();
    } catch (error) {
        alert("Unable to cancel: " + error.message);
    }
}

loadEvents();

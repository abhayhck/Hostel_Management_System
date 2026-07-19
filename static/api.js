const TOKEN_KEY = "hostel_token";

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function showMessage(element, text, isError = false) {
    if (!element) return;
    element.textContent = text;
    element.className = isError ? "message error" : "message success";
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const isForm = options.body instanceof URLSearchParams || options.body instanceof FormData;

    if (!isForm && options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    let payload;
    try {
        payload = text ? JSON.parse(text) : {};
    } catch {
        payload = text;
    }

    if (!response.ok) {
        const message = payload?.detail || payload || `Request failed (${response.status})`;
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }

    return payload;
}

async function loginRequest(username, password) {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const response = await fetch("/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.detail || "Login failed");
    }

    setToken(payload.access_token);
    return payload;
}

async function getCurrentUser() {
    return apiRequest("/users/me");
}

function logoutAndRedirect() {
    clearToken();
    window.location.href = "/";
}

async function requireRole(allowedRoles) {
    const token = getToken();
    if (!token) {
        window.location.href = "/";
        return null;
    }

    try {
        const user = await getCurrentUser();
        if (!allowedRoles.includes(user.role)) {
            clearToken();
            window.location.href = "/";
            return null;
        }
        return user;
    } catch {
        clearToken();
        window.location.href = "/";
        return null;
    }
}

function formatDate(value) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function statusBadge(status) {
    const safe = (status || "unknown").toLowerCase();
    return `<span class="badge badge-${safe}">${status || "—"}</span>`;
}

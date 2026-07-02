const state = {
    token: localStorage.getItem("hostel_token") || "",
    currentUser: null,
};

const outputs = {
    me: document.getElementById("meOutput"),
    students: document.getElementById("studentsOutput"),
    admins: document.getElementById("adminsOutput"),
    rooms: document.getElementById("roomsOutput"),
    allocations: document.getElementById("allocationsOutput"),
    complaints: document.getElementById("complaintsOutput"),
    fees: document.getElementById("feesOutput"),
    documents: document.getElementById("documentsOutput"),
};

const actionOutputMap = {
    student: outputs.students,
    admin: outputs.admins,
    room: outputs.rooms,
    allocation: outputs.allocations,
    complaint: outputs.complaints,
    fee: outputs.fees,
    document: outputs.documents,
};

function updateSessionStatus() {
    const sessionStatus = document.getElementById("sessionStatus");
    if (!state.token) {
        sessionStatus.textContent = "Not logged in";
        return;
    }

    const role = state.currentUser?.role ? ` (${state.currentUser.role})` : "";
    sessionStatus.textContent = `Token saved${role}`;
}

function showOutput(element, data) {
    element.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function getJson(form) {
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (state.token) {
        headers.set("Authorization", `Bearer ${state.token}`);
    }

    const response = await fetch(path, {
        ...options,
        headers,
    });

    const text = await response.text();
    let payload;
    try {
        payload = text ? JSON.parse(text) : {};
    } catch {
        payload = text;
    }

    if (!response.ok) {
        const message = payload?.detail || payload || `Request failed with ${response.status}`;
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }

    return payload;
}

async function login(event) {
    event.preventDefault();
    const form = event.target;
    const data = getJson(form);
    const body = new URLSearchParams();
    body.append("username", data.username);
    body.append("password", data.password);

    const result = await fetch("/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const payload = await result.json();
    if (!result.ok) {
        throw new Error(payload.detail || "Login failed");
    }

    state.token = payload.access_token;
    localStorage.setItem("hostel_token", state.token);
    updateSessionStatus();
    showOutput(outputs.me, payload);
}

async function loadCurrentUser() {
    const me = await apiRequest("/users/me");
    state.currentUser = me;
    updateSessionStatus();
    showOutput(outputs.me, me);
}

function logout() {
    state.token = "";
    state.currentUser = null;
    localStorage.removeItem("hostel_token");
    updateSessionStatus();
    showOutput(outputs.me, "Logged out");
}

async function handleStudentAction(action) {
    const form = document.getElementById("studentForm");
    const data = getJson(form);
    const payload = {
        student_id: toNumber(data.student_id),
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        course: data.course,
        year: toNumber(data.year),
        gender: data.gender,
        address: data.address,
        emergency_contact: toNumber(data.emergency_contact),
    };

    if (action === "create-student") return showOutput(outputs.students, await apiRequest("/students", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-student") return showOutput(outputs.students, await apiRequest(`/students/${payload.student_id}`, { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-student") return showOutput(outputs.students, await apiRequest(`/students/${payload.student_id}`, { method: "DELETE" }));
    return showOutput(outputs.students, await apiRequest("/students"));
}

async function handleAdminAction(action) {
    const form = document.getElementById("adminForm");
    const data = getJson(form);
    const payload = {
        admin_id: toNumber(data.admin_id),
        name: data.name,
        email: data.email,
        phone: toNumber(data.phone),
        password: data.password,
        designation: data.designation,
    };

    if (action === "create-admin") return showOutput(outputs.admins, await apiRequest("/admins", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-admin") return showOutput(outputs.admins, await apiRequest("/admins", { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-admin") return showOutput(outputs.admins, await apiRequest(`/admins/${payload.admin_id}`, { method: "DELETE" }));
    return showOutput(outputs.admins, await apiRequest("/admins"));
}

async function handleRoomAction(action) {
    const form = document.getElementById("roomForm");
    const data = getJson(form);
    const payload = {
        room_id: toNumber(data.room_id),
        room_no: data.room_no,
        room_type: data.room_type,
        capacity: toNumber(data.capacity),
        occupied: toNumber(data.occupied),
    };

    if (action === "create-room") return showOutput(outputs.rooms, await apiRequest("/rooms", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-room") return showOutput(outputs.rooms, await apiRequest(`/rooms/${payload.room_id}`, { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-room") return showOutput(outputs.rooms, await apiRequest(`/rooms/${payload.room_id}`, { method: "DELETE" }));
    return showOutput(outputs.rooms, await apiRequest("/rooms"));
}

async function handleAllocationAction(action) {
    const form = document.getElementById("allocationForm");
    const data = getJson(form);
    const createPayload = {
        student_id: toNumber(data.student_id),
        room_id: toNumber(data.room_id),
    };
    const releasePayload = {
        release_date: data.release_date || null,
    };
    const allocationId = toNumber(data.allocation_id);

    if (action === "create-allocation") return showOutput(outputs.allocations, await apiRequest("/room_allocations", { method: "POST", body: JSON.stringify(createPayload) }));
    if (action === "release-allocation") return showOutput(outputs.allocations, await apiRequest(`/room_allocations/${allocationId}/release`, { method: "PUT", body: JSON.stringify(releasePayload) }));
    return showOutput(outputs.allocations, await apiRequest("/room_allocations"));
}

async function handleComplaintAction(action) {
    const form = document.getElementById("complaintForm");
    const data = getJson(form);
    const payload = {
        complaint_id: toNumber(data.complaint_id),
        student_id: toNumber(data.student_id),
        complaint_desc: data.complaint_desc,
        status: data.status,
    };

    if (action === "create-complaint") return showOutput(outputs.complaints, await apiRequest("/complaints", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-complaint") return showOutput(outputs.complaints, await apiRequest(`/complaints/${payload.complaint_id}`, { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-complaint") return showOutput(outputs.complaints, await apiRequest(`/complaints/${payload.complaint_id}`, { method: "DELETE" }));
    return showOutput(outputs.complaints, await apiRequest("/complaints"));
}

async function handleFeeAction(action) {
    const form = document.getElementById("feeForm");
    const data = getJson(form);
    const payload = {
        fee_id: toNumber(data.fee_id),
        student_id: toNumber(data.student_id),
        amount: toNumber(data.amount),
        due_date: data.due_date,
        status: data.status,
    };

    if (action === "create-fee") return showOutput(outputs.fees, await apiRequest("/fees", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-fee") return showOutput(outputs.fees, await apiRequest(`/fees/${payload.fee_id}`, { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-fee") return showOutput(outputs.fees, await apiRequest(`/fees/${payload.fee_id}`, { method: "DELETE" }));
    return showOutput(outputs.fees, await apiRequest("/fees"));
}

async function handleDocumentAction(action) {
    const form = document.getElementById("documentForm");
    const data = getJson(form);
    const payload = {
        document_id: toNumber(data.document_id),
        student_id: toNumber(data.student_id),
        document_name: data.document_name,
        upload_at: data.upload_at,
        file_path: data.file_path,
    };

    if (action === "create-document") return showOutput(outputs.documents, await apiRequest("/documents", { method: "POST", body: JSON.stringify(payload) }));
    if (action === "update-document") return showOutput(outputs.documents, await apiRequest(`/documents/${payload.document_id}`, { method: "PUT", body: JSON.stringify(payload) }));
    if (action === "delete-document") return showOutput(outputs.documents, await apiRequest(`/documents/${payload.document_id}`, { method: "DELETE" }));
    return showOutput(outputs.documents, await apiRequest("/documents"));
}

async function dispatchAction(action) {
    try {
        if (action.startsWith("create-student") || action.startsWith("update-student") || action.startsWith("delete-student") || action.startsWith("list-students")) {
            return await handleStudentAction(action);
        }
        if (action.startsWith("create-admin") || action.startsWith("update-admin") || action.startsWith("delete-admin") || action.startsWith("list-admins")) {
            return await handleAdminAction(action);
        }
        if (action.startsWith("create-room") || action.startsWith("update-room") || action.startsWith("delete-room") || action.startsWith("list-rooms")) {
            return await handleRoomAction(action);
        }
        if (action.startsWith("create-allocation") || action.startsWith("release-allocation") || action.startsWith("list-allocations")) {
            return await handleAllocationAction(action);
        }
        if (action.startsWith("create-complaint") || action.startsWith("update-complaint") || action.startsWith("delete-complaint") || action.startsWith("list-complaints")) {
            return await handleComplaintAction(action);
        }
        if (action.startsWith("create-fee") || action.startsWith("update-fee") || action.startsWith("delete-fee") || action.startsWith("list-fees")) {
            return await handleFeeAction(action);
        }
        if (action.startsWith("create-document") || action.startsWith("update-document") || action.startsWith("delete-document") || action.startsWith("list-documents")) {
            return await handleDocumentAction(action);
        }
    } catch (error) {
        const entity = action.split("-").pop().replace(/s$/, "");
        const fallback = actionOutputMap[entity] || outputs.me;
        showOutput(fallback, error.message);
    }
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
    try {
        await login(event);
    } catch (error) {
        showOutput(outputs.me, error.message);
    }
});

document.getElementById("loadMeBtn").addEventListener("click", async () => {
    try {
        await loadCurrentUser();
    } catch (error) {
        showOutput(outputs.me, error.message);
    }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => dispatchAction(button.dataset.action));
});

updateSessionStatus();

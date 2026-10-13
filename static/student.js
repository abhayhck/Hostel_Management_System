let currentUser = null;
let studentProfile = null;

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
        });
    });
}

function fillForm(form, data) {
    Object.entries(data).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) field.value = value ?? "";
    });
}

function renderProfile(profile) {
    const fields = [
        ["Student ID", profile.student_id],
        ["Name", profile.name],
        ["Email", profile.email],
        ["Phone", profile.phone],
        ["Course", profile.course],
        ["Year", profile.year],
        ["Gender", profile.gender],
        ["Address", profile.address],
        ["Emergency Contact", profile.emergency_contact],
    ];

    document.getElementById("profileGrid").innerHTML = fields
        .map(
            ([label, value]) => `
        <div class="profile-item">
            <span class="label">${label}</span>
            <span class="value">${escapeHtml(value ?? "—")}</span>
        </div>`
        )
        .join("");
}

async function loadProfile() {
    studentProfile = await apiRequest("/students/me");
    renderProfile(studentProfile);
    document.getElementById("studentMeta").textContent =
        `${studentProfile.name} · ${studentProfile.course} (Year ${studentProfile.year})`;
}

async function loadMyAllocations() {
    const [allocations, rooms] = await Promise.all([
        apiRequest("/room_allocations"),
        apiRequest("/rooms"),
    ]);

    const roomMap = Object.fromEntries(rooms.map((r) => [r.room_id, r]));
    const mine = allocations.filter((a) => a.student_id === currentUser.user_id);
    const tbody = document.getElementById("myAllocationsBody");

    if (!mine.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">No room allocation yet</td></tr>`;
        return;
    }

    tbody.innerHTML = mine
        .map((a) => {
            const room = roomMap[a.room_id] || {};
            const active = !a.release_date;
            return `
            <tr>
                <td>${escapeHtml(a.allocation_id)}</td>
                <td>${escapeHtml(a.room_id)}</td>
                <td>${escapeHtml(room.room_no || "—")}</td>
                <td>${escapeHtml(room.room_type || "—")}</td>
                <td>${escapeHtml(formatDate(a.allocation_date))}</td>
                <td>${active ? statusBadge("active") : escapeHtml(a.release_date)}</td>
            </tr>`;
        })
        .join("");
}

async function loadMyDocuments() {
    const documents = await apiRequest("/documents");
    const tbody = document.getElementById("myDocumentsBody");

    if (!documents.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">No documents on file</td></tr>`;
        return;
    }

    tbody.innerHTML = documents
        .map(
            (d) => `
        <tr>
            <td>${escapeHtml(d.document_id)}</td>
            <td>${escapeHtml(d.document_name)}</td>
            <td>${escapeHtml(d.upload_at)}</td>
            <td>${escapeHtml(d.file_path)}</td>
        </tr>`
        )
        .join("");
}

async function loadMyComplaints() {
    const complaints = await apiRequest("/complaints");
    const tbody = document.getElementById("myComplaintsBody");

    if (!complaints.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">No complaints yet</td></tr>`;
        return;
    }

    tbody.innerHTML = complaints
        .map(
            (c) => `
        <tr>
            <td>${escapeHtml(c.complaint_id)}</td>
            <td>${escapeHtml(c.complaint_desc)}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${escapeHtml(formatDate(c.created_at))}</td>
        </tr>`
        )
        .join("");
}

async function loadMyFees() {
    const fees = await apiRequest("/fees");
    const tbody = document.getElementById("myFeesBody");

    if (!fees.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">No fee records</td></tr>`;
        return;
    }

    tbody.innerHTML = fees
        .map(
            (f) => `
        <tr>
            <td>${escapeHtml(f.fee_id)}</td>
            <td>${escapeHtml(f.amount)}</td>
            <td>${escapeHtml(f.due_date)}</td>
            <td>${statusBadge(f.status)}</td>
        </tr>`
        )
        .join("");
}

async function refreshAll() {
    // Load profile first so the page isn't blank if a secondary request fails
    await loadProfile();

    const results = await Promise.allSettled([
        loadMyAllocations(),
        loadMyDocuments(),
        loadMyComplaints(),
        loadMyFees(),
    ]);

    const failed = results.find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
}

function setupComplaintSubmit() {
    document.getElementById("submitComplaintBtn").addEventListener("click", async () => {
        const form = document.getElementById("complaintForm");
        const msg = document.getElementById("complaintMessage");
        try {
            const data = formToObject(form);
            if (!data.complaint_desc?.trim()) throw new Error("Please enter a complaint");
            await apiRequest("/complaints", {
                method: "POST",
                body: JSON.stringify({
                    student_id: currentUser.user_id,
                    complaint_desc: data.complaint_desc.trim(),
                    status: "pending",
                }),
            });
            form.reset();
            showMessage(msg, "Complaint submitted");
            await loadMyComplaints();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });
}

async function init() {
    currentUser = await requireRole(["student"]);
    if (!currentUser) return;

    document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);
    document.getElementById("refreshBtn").addEventListener("click", () => refreshAll().catch((e) => alert(e.message)));

    setupTabs();
    setupComplaintSubmit();

    try {
        await refreshAll();
    } catch (error) {
        alert(error.message);
    }
}

init();

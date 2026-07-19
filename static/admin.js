let currentAdmin = null;

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

function clearForm(form, defaults = {}) {
    form.reset();
    Object.entries(defaults).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) field.value = value;
    });
}

async function loadStudents() {
    const students = await apiRequest("/students");
    const tbody = document.getElementById("studentsTableBody");

    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty">No students found</td></tr>`;
        return;
    }

    tbody.innerHTML = students
        .map(
            (s) => `
        <tr data-student='${JSON.stringify(s).replace(/'/g, "&#39;")}'>
            <td>${s.student_id}</td>
            <td>${s.name}</td>
            <td>${s.email}</td>
            <td>${s.phone}</td>
            <td>${s.course}</td>
            <td>${s.year}</td>
            <td>${s.gender}</td>
            <td>${s.address}</td>
            <td>${s.emergency_contact}</td>
        </tr>`
        )
        .join("");

    tbody.querySelectorAll("tr[data-student]").forEach((row) => {
        row.addEventListener("click", () => {
            const student = JSON.parse(row.dataset.student);
            fillForm(document.getElementById("studentForm"), {
                ...student,
                password: "",
            });
        });
    });
}

async function loadRooms() {
    const rooms = await apiRequest("/rooms");
    const tbody = document.getElementById("roomsTableBody");

    if (!rooms.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">No rooms found</td></tr>`;
        return;
    }

    tbody.innerHTML = rooms
        .map(
            (r) => `
        <tr data-room='${JSON.stringify(r).replace(/'/g, "&#39;")}'>
            <td>${r.room_id}</td>
            <td>${r.room_no}</td>
            <td>${r.room_type}</td>
            <td>${r.capacity}</td>
            <td>${r.occupied}</td>
            <td>${r.capacity - r.occupied}</td>
        </tr>`
        )
        .join("");

    tbody.querySelectorAll("tr[data-room]").forEach((row) => {
        row.addEventListener("click", () => {
            fillForm(document.getElementById("roomForm"), JSON.parse(row.dataset.room));
        });
    });
}

async function loadAllocations() {
    const allocations = await apiRequest("/room_allocations");
    const tbody = document.getElementById("allocationsTableBody");

    if (!allocations.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">No allocations found</td></tr>`;
        return;
    }

    tbody.innerHTML = allocations
        .map((a) => {
            const active = !a.release_date;
            return `
            <tr>
                <td>${a.allocation_id}</td>
                <td>${a.student_id}</td>
                <td>${a.room_id}</td>
                <td>${formatDate(a.allocation_date)}</td>
                <td>${active ? statusBadge("active") : a.release_date}</td>
                <td class="row-actions">
                    ${
                        active
                            ? `<button type="button" class="secondary" data-release="${a.allocation_id}">Release</button>`
                            : "—"
                    }
                </td>
            </tr>`;
        })
        .join("");

    tbody.querySelectorAll("[data-release]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const msg = document.getElementById("allocationMessage");
            try {
                await apiRequest(`/room_allocations/${btn.dataset.release}/release`, {
                    method: "PUT",
                    body: JSON.stringify({ release_date: "released" }),
                });
                showMessage(msg, "Room released");
                await Promise.all([loadAllocations(), loadRooms()]);
            } catch (error) {
                showMessage(msg, error.message, true);
            }
        });
    });
}

async function loadComplaints() {
    const complaints = await apiRequest("/complaints");
    const tbody = document.getElementById("complaintsTableBody");

    if (!complaints.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">No complaints found</td></tr>`;
        return;
    }

    tbody.innerHTML = complaints
        .map(
            (c) => `
        <tr data-complaint='${JSON.stringify(c).replace(/'/g, "&#39;")}'>
            <td>${c.complaint_id}</td>
            <td>${c.student_id}</td>
            <td>${c.complaint_desc}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${formatDate(c.created_at)}</td>
        </tr>`
        )
        .join("");

    tbody.querySelectorAll("tr[data-complaint]").forEach((row) => {
        row.addEventListener("click", () => {
            fillForm(document.getElementById("complaintForm"), JSON.parse(row.dataset.complaint));
        });
    });
}

async function loadFees() {
    const fees = await apiRequest("/fees");
    const tbody = document.getElementById("feesTableBody");

    if (!fees.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">No fee records found</td></tr>`;
        return;
    }

    tbody.innerHTML = fees
        .map(
            (f) => `
        <tr data-fee='${JSON.stringify(f).replace(/'/g, "&#39;")}'>
            <td>${f.fee_id}</td>
            <td>${f.student_id}</td>
            <td>${f.amount}</td>
            <td>${f.due_date}</td>
            <td>${statusBadge(f.status)}</td>
        </tr>`
        )
        .join("");

    tbody.querySelectorAll("tr[data-fee]").forEach((row) => {
        row.addEventListener("click", () => {
            fillForm(document.getElementById("feeForm"), JSON.parse(row.dataset.fee));
        });
    });
}

async function refreshAll() {
    await Promise.all([loadStudents(), loadRooms(), loadAllocations(), loadComplaints(), loadFees()]);
}

function setupStudentActions() {
    const form = document.getElementById("studentForm");
    const msg = document.getElementById("studentMessage");

    document.getElementById("createStudentBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const payload = {
                student_id: 0,
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
            const result = await apiRequest("/students", { method: "POST", body: JSON.stringify(payload) });
            showMessage(msg, `Student created (ID: ${result.student_id})`);
            clearForm(form, { student_id: 0 });
            await loadStudents();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("updateStudentBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const id = toNumber(data.student_id);
            if (!id) throw new Error("Select a student or enter a Student ID");
            const payload = {
                student_id: id,
                name: data.name,
                email: data.email,
                password: data.password || "unchanged",
                phone: data.phone,
                course: data.course,
                year: toNumber(data.year),
                gender: data.gender,
                address: data.address,
                emergency_contact: toNumber(data.emergency_contact),
            };
            await apiRequest(`/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
            showMessage(msg, "Student updated");
            await loadStudents();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("deleteStudentBtn").addEventListener("click", async () => {
        try {
            const id = toNumber(formToObject(form).student_id);
            if (!id) throw new Error("Select a student or enter a Student ID");
            if (!confirm(`Delete student ${id}?`)) return;
            await apiRequest(`/students/${id}`, { method: "DELETE" });
            showMessage(msg, "Student deleted");
            clearForm(form, { student_id: 0 });
            await loadStudents();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("clearStudentBtn").addEventListener("click", () => {
        clearForm(form, { student_id: 0 });
        msg.textContent = "";
    });
}

function setupRoomActions() {
    const form = document.getElementById("roomForm");
    const msg = document.getElementById("roomMessage");

    document.getElementById("createRoomBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const payload = {
                room_no: data.room_no,
                room_type: data.room_type,
                capacity: toNumber(data.capacity),
                occupied: toNumber(data.occupied),
            };
            await apiRequest("/rooms", { method: "POST", body: JSON.stringify(payload) });
            showMessage(msg, "Room created");
            clearForm(form, { room_id: 0, occupied: 0 });
            await loadRooms();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("updateRoomBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const id = toNumber(data.room_id);
            if (!id) throw new Error("Select a room or enter a Room ID");
            const payload = {
                room_no: data.room_no,
                room_type: data.room_type,
                capacity: toNumber(data.capacity),
                occupied: toNumber(data.occupied),
            };
            await apiRequest(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(payload) });
            showMessage(msg, "Room updated");
            await loadRooms();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("deleteRoomBtn").addEventListener("click", async () => {
        try {
            const id = toNumber(formToObject(form).room_id);
            if (!id) throw new Error("Select a room or enter a Room ID");
            if (!confirm(`Delete room ${id}?`)) return;
            await apiRequest(`/rooms/${id}`, { method: "DELETE" });
            showMessage(msg, "Room deleted");
            clearForm(form, { room_id: 0, occupied: 0 });
            await loadRooms();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("clearRoomBtn").addEventListener("click", () => {
        clearForm(form, { room_id: 0, occupied: 0 });
        msg.textContent = "";
    });
}

function setupAllocationActions() {
    const form = document.getElementById("allocationForm");
    const msg = document.getElementById("allocationMessage");

    document.getElementById("allocateBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            await apiRequest("/room_allocations", {
                method: "POST",
                body: JSON.stringify({
                    student_id: toNumber(data.student_id),
                    room_id: toNumber(data.room_id),
                }),
            });
            showMessage(msg, "Room allocated");
            await Promise.all([loadAllocations(), loadRooms()]);
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("releaseBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const id = toNumber(data.allocation_id);
            if (!id) throw new Error("Enter an Allocation ID");
            await apiRequest(`/room_allocations/${id}/release`, {
                method: "PUT",
                body: JSON.stringify({ release_date: data.release_date || "released" }),
            });
            showMessage(msg, "Room released");
            await Promise.all([loadAllocations(), loadRooms()]);
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });
}

function setupComplaintActions() {
    const form = document.getElementById("complaintForm");
    const msg = document.getElementById("complaintMessage");

    document.getElementById("updateComplaintBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const id = toNumber(data.complaint_id);
            if (!id) throw new Error("Select a complaint or enter a Complaint ID");
            await apiRequest(`/complaints/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    complaint_desc: data.complaint_desc,
                    status: data.status,
                }),
            });
            showMessage(msg, "Complaint updated");
            await loadComplaints();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("deleteComplaintBtn").addEventListener("click", async () => {
        try {
            const id = toNumber(formToObject(form).complaint_id);
            if (!id) throw new Error("Select a complaint or enter a Complaint ID");
            if (!confirm(`Delete complaint ${id}?`)) return;
            await apiRequest(`/complaints/${id}`, { method: "DELETE" });
            showMessage(msg, "Complaint deleted");
            form.reset();
            await loadComplaints();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });
}

function setupFeeActions() {
    const form = document.getElementById("feeForm");
    const msg = document.getElementById("feeMessage");

    document.getElementById("createFeeBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            await apiRequest("/fees", {
                method: "POST",
                body: JSON.stringify({
                    student_id: toNumber(data.student_id),
                    amount: toNumber(data.amount),
                    due_date: data.due_date,
                    status: data.status,
                }),
            });
            showMessage(msg, "Fee record created");
            await loadFees();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("updateFeeBtn").addEventListener("click", async () => {
        try {
            const data = formToObject(form);
            const id = toNumber(data.fee_id);
            if (!id) throw new Error("Select a fee or enter a Fee ID");
            await apiRequest(`/fees/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    amount: toNumber(data.amount),
                    due_date: data.due_date,
                    status: data.status,
                }),
            });
            showMessage(msg, "Fee updated");
            await loadFees();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });

    document.getElementById("deleteFeeBtn").addEventListener("click", async () => {
        try {
            const id = toNumber(formToObject(form).fee_id);
            if (!id) throw new Error("Select a fee or enter a Fee ID");
            if (!confirm(`Delete fee ${id}?`)) return;
            await apiRequest(`/fees/${id}`, { method: "DELETE" });
            showMessage(msg, "Fee deleted");
            clearForm(form, { fee_id: 0, status: "pending" });
            await loadFees();
        } catch (error) {
            showMessage(msg, error.message, true);
        }
    });
}

async function init() {
    currentAdmin = await requireRole(["admin"]);
    if (!currentAdmin) return;

    document.getElementById("adminMeta").textContent = `Logged in as ${currentAdmin.username} (admin)`;
    document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);
    document.getElementById("refreshBtn").addEventListener("click", () => refreshAll().catch((e) => alert(e.message)));

    setupTabs();
    setupStudentActions();
    setupRoomActions();
    setupAllocationActions();
    setupComplaintActions();
    setupFeeActions();

    try {
        await refreshAll();
    } catch (error) {
        alert(error.message);
    }
}

init();

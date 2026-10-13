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
        <tr data-student='${escapeHtml(JSON.stringify(s))}'>
            <td>${escapeHtml(s.student_id)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.phone)}</td>
            <td>${escapeHtml(s.course)}</td>
            <td>${escapeHtml(s.year)}</td>
            <td>${escapeHtml(s.gender)}</td>
            <td>${escapeHtml(s.address)}</td>
            <td>${escapeHtml(s.emergency_contact)}</td>
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
        <tr data-room='${escapeHtml(JSON.stringify(r))}'>
            <td>${escapeHtml(r.room_id)}</td>
            <td>${escapeHtml(r.room_no)}</td>
            <td>${escapeHtml(r.room_type)}</td>
            <td>${escapeHtml(r.capacity)}</td>
            <td>${escapeHtml(r.occupied)}</td>
            <td>${escapeHtml(r.capacity - r.occupied)}</td>
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
                <td>${escapeHtml(a.allocation_id)}</td>
                <td>${escapeHtml(a.student_id)}</td>
                <td>${escapeHtml(a.room_id)}</td>
                <td>${escapeHtml(formatDate(a.allocation_date))}</td>
                <td>${active ? statusBadge("active") : escapeHtml(a.release_date)}</td>
                <td class="row-actions">
                    ${
                        active
                            ? `<button type="button" class="secondary" data-release="${escapeHtml(a.allocation_id)}">Release</button>`
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
        <tr data-complaint='${escapeHtml(JSON.stringify(c))}'>
            <td>${escapeHtml(c.complaint_id)}</td>
            <td>${escapeHtml(c.student_id)}</td>
            <td>${escapeHtml(c.complaint_desc)}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${escapeHtml(formatDate(c.created_at))}</td>
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
        <tr data-fee='${escapeHtml(JSON.stringify(f))}'>
            <td>${escapeHtml(f.fee_id)}</td>
            <td>${escapeHtml(f.student_id)}</td>
            <td>${escapeHtml(f.amount)}</td>
            <td>${escapeHtml(f.due_date)}</td>
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

function askAiText(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
}

function askAiLabel(column) {
    return String(column).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function askAiValue(value) {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}

function appendAskAiSources(container, result) {
    const sources = document.createElement("div");
    sources.className = "ask-ai-sources";
    const entries = [
        ["SQL query", result.sql || "No SQL query was run."],
        ["Original result", JSON.stringify(result, null, 2)],
    ];
    entries.forEach(([label, value]) => {
        const disclosure = document.createElement("details");
        disclosure.append(askAiText("summary", label), askAiText("pre", value));
        sources.append(disclosure);
    });
    container.append(sources);
}

function renderAskAiAnswer(container, result) {
    container.replaceChildren(askAiText("p", "Ask AI", "ask-ai-speaker"));
    if (result.message) {
        container.append(askAiText("p", result.message));
        appendAskAiSources(container, result);
        return;
    }
    const columns = result.columns || [];
    const rows = result.rows || [];
    if (!rows.length) {
        container.append(askAiText("p", "No matching records found."));
        appendAskAiSources(container, result);
        return;
    }
    if (rows.length === 1 && columns.length === 1) {
        container.append(askAiText("p", askAiLabel(columns[0]), "hint"));
        container.append(askAiText("p", askAiValue(rows[0][0]), "ask-ai-value"));
    } else if (rows.length === 1) {
        const details = document.createElement("dl");
        details.className = "ask-ai-details";
        columns.forEach((column, index) => {
            details.append(askAiText("dt", askAiLabel(column)), askAiText("dd", askAiValue(rows[0][index])));
        });
        container.append(details);
    } else {
        container.append(askAiText("p", `Found ${rows.length} matching records${result.truncated ? " in this preview" : ""}.`));
        const wrapper = document.createElement("div");
        wrapper.className = "table-wrap";
        wrapper.tabIndex = 0;
        wrapper.setAttribute("aria-label", "Query results; scroll horizontally for more columns");
        const table = document.createElement("table");
        table.className = "data-table";
        const head = document.createElement("thead");
        const header = document.createElement("tr");
        columns.forEach((column) => {
            const cell = askAiText("th", askAiLabel(column));
            cell.scope = "col";
            header.append(cell);
        });
        head.append(header);
        const body = document.createElement("tbody");
        rows.forEach((row) => {
            const line = document.createElement("tr");
            columns.forEach((_, index) => line.append(askAiText("td", askAiValue(row[index]))));
            body.append(line);
        });
        table.append(head, body);
        wrapper.append(table);
        container.append(wrapper);
    }
    if (result.truncated) {
        container.append(askAiText("p", `Showing the first ${rows.length} results. Ask a more specific question to narrow them down.`, "hint"));
    }
    appendAskAiSources(container, result);
}

function setupAskAi() {
    const form = document.getElementById("askAiForm");
    const questionBox = document.getElementById("askAiQuestion");
    const submit = document.getElementById("askAiSubmit");
    const history = document.getElementById("askAiHistory");
    const count = document.getElementById("askAiCount");
    let pending = false;
    const updateCount = () => {
        count.textContent = `${questionBox.value.length} / 500 characters`;
        questionBox.style.height = "auto";
        questionBox.style.height = `${Math.min(questionBox.scrollHeight, 140)}px`;
    };
    questionBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            if (!pending) form.requestSubmit();
        }
    });
    questionBox.addEventListener("input", () => {
        questionBox.setCustomValidity("");
        updateCount();
    });
    document.querySelectorAll("[data-ask-example]").forEach((button) => {
        button.addEventListener("click", () => {
            questionBox.value = button.dataset.askExample;
            questionBox.setCustomValidity("");
            updateCount();
            questionBox.focus();
        });
    });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (pending) return;
        const question = questionBox.value.trim();
        if (!question || question.length > 500) {
            questionBox.setCustomValidity("Enter a question between 1 and 500 characters.");
            questionBox.reportValidity();
            return;
        }
        pending = true;
        submit.disabled = true;
        submit.setAttribute("aria-label", "Finding your answer");
        submit.setAttribute("aria-busy", "true");
        document.getElementById("askAiEmpty").hidden = true;
        const exchange = document.createElement("article");
        exchange.className = "ask-ai-exchange";
        const prompt = document.createElement("div");
        prompt.className = "ask-ai-question";
        prompt.append(askAiText("p", "You", "ask-ai-speaker"), askAiText("p", question));
        const answer = document.createElement("div");
        answer.className = "ask-ai-answer";
        answer.append(askAiText("p", "Finding your answer…"));
        exchange.append(prompt, answer);
        history.prepend(exchange);
        try {
            const result = await apiRequest("/ask", {
                method: "POST",
                body: JSON.stringify({ question }),
            });
            renderAskAiAnswer(answer, result);
            if (questionBox.value.trim() === question) {
                questionBox.value = "";
                updateCount();
            }
        } catch (error) {
            answer.replaceChildren(askAiText("p", "Unable to answer", "ask-ai-speaker"), askAiText("p", error.message));
            answer.classList.add("ask-ai-error");
        } finally {
            pending = false;
            submit.disabled = false;
            submit.setAttribute("aria-label", "Send question");
            submit.setAttribute("aria-busy", "false");
        }
    });
    submit.disabled = false;
    updateCount();
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
    setupAskAi();

    try {
        await refreshAll();
    } catch (error) {
        alert(error.message);
    }
}

init();

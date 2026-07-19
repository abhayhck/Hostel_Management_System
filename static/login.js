async function redirectIfLoggedIn() {
    const token = getToken();
    if (!token) return;

    try {
        const user = await getCurrentUser();
        if (user.role === "admin") {
            window.location.href = "/admin";
        } else if (user.role === "student") {
            window.location.href = "/student";
        }
    } catch {
        clearToken();
    }
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const messageEl = document.getElementById("loginMessage");
    const data = formToObject(event.target);

    try {
        await loginRequest(data.username, data.password);
        const user = await getCurrentUser();

        if (user.role === "admin") {
            window.location.href = "/admin";
        } else if (user.role === "student") {
            window.location.href = "/student";
        } else {
            showMessage(messageEl, `Unknown role: ${user.role}`, true);
        }
    } catch (error) {
        showMessage(messageEl, error.message, true);
    }
});

redirectIfLoggedIn();

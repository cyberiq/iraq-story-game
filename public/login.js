const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const statusNode = document.getElementById("loginStatus");

function setStatus(message) {
  statusNode.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  setStatus("جاري تسجيل الدخول...");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value.trim()
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "فشل تسجيل الدخول");
    }

    setStatus("تم تسجيل الدخول بنجاح...");
    window.location.href = "/admin";
  } catch (error) {
    console.error(error);
    setStatus(error.message || "تعذر تسجيل الدخول");
  }
});

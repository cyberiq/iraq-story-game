const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const loginPasswordInput = document.getElementById("password");
const statusNode = document.getElementById("loginStatus");

function setStatus(message) {
  statusNode.textContent = message;
}

async function getCsrfToken() {
  const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.csrfToken) {
    throw new Error('فشل في تهيئة حماية الطلبات');
  }
  return payload.csrfToken;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  setStatus("جاري تسجيل الدخول...");

  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: 'same-origin',
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: loginPasswordInput.value.trim()
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

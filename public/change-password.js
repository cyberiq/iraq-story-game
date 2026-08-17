const form = document.getElementById("changePasswordForm");
const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const statusNode = document.getElementById("changePasswordStatus");

function setStatus(message) {
  statusNode.textContent = message;
}

async function ensureAuth() {
  const response = await fetch("/api/auth/status");
  const payload = await response.json().catch(() => ({}));

  if (!payload.authenticated) {
    window.location.href = "/login";
    return false;
  }

  return true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("جاري تحديث كلمة المرور...");

  try {
    const ok = await ensureAuth();
    if (!ok) {
      return;
    }

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "فشل تحديث كلمة المرور");
    }

    form.reset();
    setStatus(payload.message || "تم تحديث كلمة المرور بنجاح.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "تعذر تحديث كلمة المرور");
  }
});

window.addEventListener("DOMContentLoaded", ensureAuth);

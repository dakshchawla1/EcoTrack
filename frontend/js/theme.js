// ==========================================
// EcoTrack - Simple Theme Toggle (Black & White)
// ==========================================

(function () {
    // 1. Immediately apply saved theme to prevent flash
    const savedTheme = localStorage.getItem("ecotrack_theme") || "light";
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark-mode");
    } else {
        document.documentElement.classList.remove("dark-mode");
    }

    function updateToggleButtons() {
        const isDark = document.documentElement.classList.contains("dark-mode");
        const buttons = document.querySelectorAll(".theme-toggle-btn, #themeToggleBtn");
        buttons.forEach((btn) => {
            btn.textContent = isDark ? "Light Mode" : "Dark Mode";
            btn.setAttribute("title", isDark ? "Switch to White Mode" : "Switch to Dark Mode");
        });
    }

    // 2. Attach toggle listener once DOM is loaded
    document.addEventListener("DOMContentLoaded", () => {
        updateToggleButtons();

        document.addEventListener("click", (event) => {
            const btn = event.target.closest(".theme-toggle-btn, #themeToggleBtn");
            if (!btn) return;

            const isDark = document.documentElement.classList.toggle("dark-mode");
            localStorage.setItem("ecotrack_theme", isDark ? "dark" : "light");
            updateToggleButtons();

            // Notify custom events (e.g. for charts if needed)
            window.dispatchEvent(new CustomEvent("themechanged", { detail: { theme: isDark ? "dark" : "light" } }));
        });
    });
})();

import {
    auth,
    googleProvider
} from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { API_BASE } from "./api.js";

// Helper for friendly error messages
function getFriendlyError(error) {
    if (!error) return "An error occurred. Please try again.";
    const code = error.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        return "Incorrect email or password. Please verify your details.";
    }
    if (code === "auth/email-already-in-use") {
        return "An account with this email already exists. Please log in.";
    }
    if (code === "auth/weak-password") {
        return "Password is too weak. Please use at least 6 characters.";
    }
    if (code === "auth/invalid-email") {
        return "Please enter a valid email address.";
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return "Sign-in was cancelled.";
    }
    if (code === "auth/too-many-requests") {
        return "Too many attempts. Please try again in a few moments.";
    }
    if (code === "auth/network-request-failed") {
        return "Network connection issue. Please check your internet connection.";
    }
    return error.message ? error.message.replace(/^Firebase:\s*(Error\s*)?(\(\auth\/[^)]+\)\.?)?/i, "").trim() : "Authentication failed.";
}

// Background sync helper
async function syncUserToBackend(user, displayName) {
    try {
        const token = await user.getIdToken();
        await fetch(`${API_BASE}/api/users/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: displayName || user.displayName || "EcoTrack User",
                email: user.email || ""
            })
        });
    } catch (e) {
        console.warn("Backend user sync notice:", e.message);
    }
}

/* =========================
   SIGNUP
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : "Create Account";

        const nameInput = document.getElementById("signupName");
        const emailInput = document.getElementById("signupEmail");
        const passwordInput = document.getElementById("signupPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const message = document.getElementById("message");

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

        if (password !== confirmPassword) {
            if (message) {
                message.style.color = "#8a2424";
                message.innerText = "Passwords do not match.";
            }
            return;
        }

        if (password.length < 6) {
            if (message) {
                message.style.color = "#8a2424";
                message.innerText = "Password must be at least 6 characters long.";
            }
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "Creating account...";
            }
            if (message) {
                message.innerText = "";
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            if (name) {
                await updateProfile(userCredential.user, { displayName: name });
            }

            await syncUserToBackend(userCredential.user, name);

            if (message) {
                message.style.color = "#1b4332";
                message.innerText = "Account created! Redirecting to dashboard...";
            }

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);

        } catch (error) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
            if (message) {
                message.style.color = "#8a2424";
                message.innerText = getFriendlyError(error);
            }
        }
    });
}

/* =========================
   EMAIL LOGIN
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : "Log In";

        const emailInput = document.getElementById("loginEmail");
        const passwordInput = document.getElementById("loginPassword");
        const message = document.getElementById("message");

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "Signing in...";
            }
            if (message) {
                message.innerText = "";
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            await syncUserToBackend(userCredential.user);

            if (message) {
                message.style.color = "#1b4332";
                message.innerText = "Login successful! Redirecting...";
            }

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);

        } catch (error) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
            if (message) {
                message.style.color = "#8a2424";
                message.innerText = getFriendlyError(error);
            }
        }
    });
}

/* =========================
   GOOGLE LOGIN / SIGNUP
========================= */
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleSignupBtn = document.getElementById("googleSignupBtn");

async function loginWithGoogle(btn) {
    const originalText = btn ? btn.innerHTML : "";
    const message = document.getElementById("message");

    try {
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = "0.7";
        }
        if (message) {
            message.innerText = "";
        }

        const result = await signInWithPopup(auth, googleProvider);
        await syncUserToBackend(result.user);

        if (message) {
            message.style.color = "#1b4332";
            message.innerText = "Signed in successfully! Redirecting...";
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.innerHTML = originalText;
        }
        if (message) {
            message.style.color = "#8a2424";
            message.innerText = getFriendlyError(error);
        }
    }
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => loginWithGoogle(googleLoginBtn));
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", () => loginWithGoogle(googleSignupBtn));
}

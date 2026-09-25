import { auth } from "./firebase-config.js";

const isLocal =
    !window.location.hostname ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const API_BASE = isLocal ? "http://localhost:4000" : "";


// ===============================
// SECURE API REQUEST
// ===============================

export async function apiFetch(endpoint, options = {}) {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("User is not logged in");
    }


    // Get Firebase ID token
    const token = await user.getIdToken();


    // Create headers
    const headers = new Headers(
        options.headers || {}
    );


    // Send Firebase token
    headers.set(
        "Authorization",
        `Bearer ${token}`
    );


    // Add JSON content type when sending data
    if (
        options.body &&
        !headers.has("Content-Type")
    ) {

        headers.set(
            "Content-Type",
            "application/json"
        );

    }


    // Make request
    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers: headers
        }
    );


    // If backend rejects request
    if (!response.ok) {

        const errorData =
            await response.json().catch(() => ({}));

        throw new Error(
            errorData.message ||
            `Request failed: ${response.status}`
        );

    }


    return response.json();

}

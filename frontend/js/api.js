import { auth } from "./firebase-config.js";

const isLocal =
    !window.location.hostname ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

export const API_BASE = (isLocal && window.location.port !== "4000") ? "http://localhost:4000" : "";

export async function getAuthUser(timeoutMs = 1500) {
    if (auth.currentUser) return auth.currentUser;
    return new Promise((resolve) => {
        let timer = null;
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (timer) clearTimeout(timer);
            unsubscribe();
            resolve(user);
        });
        timer = setTimeout(() => {
            unsubscribe();
            resolve(auth.currentUser);
        }, timeoutMs);
    });
}

// ==========================================
// LOCAL STORAGE CACHE & SYNC HELPERS
// ==========================================

function getLocalKey(uid) {
    return `ecotrack_activities_${uid || "guest"}`;
}

export function getLocalActivities(uid) {
    try {
        const raw = localStorage.getItem(getLocalKey(uid));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function setLocalActivities(uid, acts) {
    try {
        localStorage.setItem(getLocalKey(uid), JSON.stringify(acts));
    } catch (e) {
        console.warn("Storage write failed:", e);
    }
}

// Background sync of locally saved activities
async function syncOfflineActivities(user, token) {
    const local = getLocalActivities(user.uid);
    const unsynced = local.filter(a => a.synced === false);
    if (unsynced.length === 0) return;

    for (const act of unsynced) {
        try {
            const res = await fetch(`${API_BASE}/api/activities`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    activity_type: act.activity_type,
                    amount: act.amount,
                    unit: act.unit,
                    emission: act.emission
                })
            });
            if (res.ok) {
                const saved = await res.json();
                act.synced = true;
                if (saved.activity && saved.activity.id) {
                    act.id = saved.activity.id;
                }
            }
        } catch {
            // Still offline, stop attempt
            break;
        }
    }
    setLocalActivities(user.uid, local);
}

// Default fallback challenges if offline
const DEFAULT_CHALLENGES = [
    {
        id: "low-carbon-commute",
        title: "Low Carbon Commute",
        description: "Log at least 3 transport activities with reduced emissions (public transit, walking, or cycling).",
        target: 3,
        category: "transport"
    },
    {
        id: "energy-saver",
        title: "Energy Efficiency",
        description: "Log home electricity usage under 5 kWh or record an energy-saving action.",
        target: 2,
        category: "electricity"
    },
    {
        id: "plant-based-day",
        title: "Plant-Powered Plate",
        description: "Log 3 plant-based or low-carbon meals in a single week.",
        target: 3,
        category: "food"
    },
    {
        id: "mindful-shopping",
        title: "Conscious Consumer",
        description: "Log sustainable purchases or second-hand items.",
        target: 2,
        category: "shopping"
    },
    {
        id: "consistent-tracker",
        title: "Consistent Accounting",
        description: "Log 5 total carbon activities across any categories.",
        target: 5,
        category: "all"
    }
];

// ===============================
// SECURE API REQUEST WITH RESILIENT FALLBACK
// ===============================

export async function apiFetch(endpoint, options = {}) {
    const user = await getAuthUser();

    if (!user) {
        throw new Error("User is not logged in");
    }

    const token = await user.getIdToken();
    const method = (options.method || "GET").toUpperCase();

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Request failed: ${response.status}`
            );
        }

        const data = await response.json();

        // On successful GET activities, cache them & trigger offline sync
        if (endpoint.includes("/api/activities") && method === "GET") {
            if (Array.isArray(data)) {
                setLocalActivities(user.uid, data);
            }
            syncOfflineActivities(user, token).catch(() => {});
        }

        // On successful POST activity, also add to local cache
        if (endpoint.includes("/api/activities") && method === "POST") {
            const newAct = data.activity || data;
            if (newAct) {
                const acts = getLocalActivities(user.uid);
                acts.unshift(newAct);
                setLocalActivities(user.uid, acts);
            }
        }

        return data;

    } catch (networkError) {
        console.warn(`API call to ${endpoint} encountered network notice:`, networkError.message);

        // ==========================================
        // SMART OFFLINE FALLBACKS
        // ==========================================

        // 1. GET ACTIVITIES
        if (endpoint.includes("/api/activities") && method === "GET") {
            const local = getLocalActivities(user.uid);
            return local;
        }

        // 2. POST ACTIVITY
        if (endpoint.includes("/api/activities") && method === "POST") {
            const payload = options.body ? JSON.parse(options.body) : {};
            const localAct = {
                id: Date.now(),
                firebase_uid: user.uid,
                activity_type: payload.activity_type || "other",
                amount: Number(payload.amount) || 0,
                unit: payload.unit || "",
                emission: Number(payload.emission) || 0,
                created_at: new Date().toISOString(),
                synced: false
            };
            const acts = getLocalActivities(user.uid);
            acts.unshift(localAct);
            setLocalActivities(user.uid, acts);

            return {
                message: "Activity saved successfully!",
                activity: localAct,
                offline: true
            };
        }

        // 3. DELETE ACTIVITY
        if (endpoint.includes("/api/activities/") && method === "DELETE") {
            const parts = endpoint.split("/");
            const id = parts[parts.length - 1];
            const acts = getLocalActivities(user.uid).filter(a => String(a.id) !== String(id));
            setLocalActivities(user.uid, acts);
            return { message: "Activity deleted successfully!" };
        }

        // 4. PUT ACTIVITY
        if (endpoint.includes("/api/activities/") && method === "PUT") {
            const parts = endpoint.split("/");
            const id = parts[parts.length - 1];
            const payload = options.body ? JSON.parse(options.body) : {};
            const acts = getLocalActivities(user.uid);
            const idx = acts.findIndex(a => String(a.id) === String(id));
            if (idx !== -1) {
                acts[idx] = {
                    ...acts[idx],
                    ...payload,
                    amount: Number(payload.amount ?? acts[idx].amount),
                    emission: Number(payload.emission ?? acts[idx].emission),
                    synced: false
                };
                setLocalActivities(user.uid, acts);
                return { message: "Activity updated successfully!", activity: acts[idx] };
            }
            return { message: "Activity updated successfully!" };
        }

        // 5. GET CHALLENGES
        if (endpoint.includes("/api/challenges") && method === "GET") {
            return DEFAULT_CHALLENGES;
        }

        // 6. GET /api/users/me
        if (endpoint.includes("/api/users/me") && method === "GET") {
            return {
                firebase_uid: user.uid,
                name: user.displayName || "EcoTrack User",
                email: user.email || "",
                photo_url: user.photoURL || null,
                synced: false
            };
        }

        // 7. POST /api/users/sync
        if (endpoint.includes("/api/users/sync") && method === "POST") {
            return {
                message: "User synced locally",
                user: {
                    firebase_uid: user.uid,
                    name: user.displayName || "EcoTrack User",
                    email: user.email || ""
                }
            };
        }

        // If not a handled offline route, rethrow original error
        throw networkError;
    }
}

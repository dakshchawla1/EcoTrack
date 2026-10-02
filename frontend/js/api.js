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

        // 8. GET /api/ai/recommendation
        if (endpoint.includes("/api/ai/recommendation")) {
            const acts = getLocalActivities(user.uid);
            if (!acts || acts.length === 0) {
                return {
                    status: "no_data",
                    title: "Build Your Carbon Baseline",
                    analysis: "Add more activities to receive a personalized EcoAI recommendation.",
                    recommendation: "Log your daily transport, home electricity, or meals to get tailored reduction tips.",
                    estimated_saving: 0
                };
            }
            const catMap = { transport: 0, electricity: 0, food: 0, shopping: 0 };
            acts.forEach(a => {
                const c = (a.activity_type || "").toLowerCase();
                if (catMap[c] !== undefined) catMap[c] += Number(a.emission || 0);
            });
            let topC = "transport", topV = -1;
            for (const [k, v] of Object.entries(catMap)) {
                if (v > topV) { topV = v; topC = k; }
            }
            const saving = Math.max(1.5, Number((topV * 0.2).toFixed(1)));
            const titles = {
                transport: "Optimize Weekly Commuting",
                electricity: "Reduce Baseload Electricity",
                food: "Incorporate Plant-Powered Meals",
                shopping: "Practice Mindful Purchasing"
            };
            const recs = {
                transport: "Consider replacing 2 short solo car or motorbike trips this week with public transit, cycling, or walking.",
                electricity: "Shift high-power appliances to off-peak hours and adjust thermostat settings by 1-2 degrees.",
                food: "Try swapping 2 meat-based meals this week for plant-based or vegetarian alternatives.",
                shopping: "Prioritize second-hand or certified durable goods and repair electronics before replacing."
            };
            return {
                status: "success",
                title: titles[topC] || "Reduce Carbon Footprint",
                analysis: `${topC.charAt(0).toUpperCase() + topC.slice(1)} is currently your highest emission category (${topV.toFixed(1)} kg CO₂).`,
                recommendation: recs[topC] || "Log activities consistently to see personalized reduction targets.",
                estimated_saving: saving,
                source: "offline"
            };
        }

        // 9. POST /api/ai/simulate
        if (endpoint.includes("/api/ai/simulate")) {
            const factors = {
                transport: { car: 0.192, bike: 0.103, bus: 0.089, metro: 0.041, train: 0.041, bicycle: 0, walk: 0 },
                electricity: { grid: 0.82, efficient: 0.45, solar: 0.05 },
                food: { nonvegetarian: 3.5, vegetarian: 1.5, vegan: 0.8 },
                shopping: { electronics: 10.0, refurbished: 2.5, clothing: 5.0, thrift: 1.0, other: 2.0 }
            };
            const p = options.body ? JSON.parse(options.body) : {};
            const cat = p.category || "transport";
            const cur = p.currentChoice || "car";
            const alt = p.alternativeChoice || "metro";
            const amt = Math.max(0.1, Number(p.amount) || 1);
            const freq = Math.max(1, Number(p.frequency) || 1);
            const cf = (factors[cat] && factors[cat][cur] !== undefined) ? factors[cat][cur] : 0.192;
            const af = (factors[cat] && factors[cat][alt] !== undefined) ? factors[cat][alt] : 0.041;
            const curE = Number((amt * cf * freq).toFixed(2));
            const altE = Number((amt * af * freq).toFixed(2));
            const sav = Number(Math.max(0, curE - altE).toFixed(2));
            const pct = curE > 0 ? Number(((sav / curE) * 100).toFixed(1)) : 0;
            return {
                status: "success",
                category: cat,
                currentChoice: cur,
                alternativeChoice: alt,
                amount: amt,
                frequency: freq,
                currentEmissions: curE,
                alternativeEmissions: altE,
                potentialSaving: sav,
                percentageSaved: pct,
                explanation: `Switching ${freq} ${cat} action(s) from ${cur} to ${alt} avoids approximately ${sav} kg CO₂ (${pct}% reduction).`,
                source: "offline"
            };
        }

        // 10. GET /api/ai/insights
        if (endpoint.includes("/api/ai/insights")) {
            const acts = getLocalActivities(user.uid);
            if (!acts || acts.length === 0) {
                return {
                    status: "no_data",
                    headline: "Awaiting Your First Records",
                    trend_analysis: "Add some activities first to receive personalized EcoAI insights.",
                    primary_driver: "No baseline emissions recorded yet.",
                    suggested_action: "Start tracking daily transit or home electricity to identify your largest reduction opportunities.",
                    weekly_comparison: "Baseline will generate after your first week of entries."
                };
            }
            const total = acts.reduce((s, a) => s + Number(a.emission || 0), 0);
            return {
                status: "success",
                headline: "Activity Patterns Established",
                trend_analysis: `You have recorded ${acts.length} activities totaling ${total.toFixed(1)} kg CO₂.`,
                primary_driver: "Emissions are distributed across your logged lifestyle categories.",
                suggested_action: "Review your highest-impact activities to focus reduction efforts where they matter most.",
                weekly_comparison: `${total.toFixed(1)} kg CO₂ cumulative personal footprint recorded.`,
                source: "offline"
            };
        }

        // If not a handled offline route, rethrow original error
        throw networkError;
    }
}

const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === "string"
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable:", err.message);
    }
} else {
    try {
        serviceAccount = require("./serviceAccountKey.json");
    } catch (err) {
        console.warn("Notice: serviceAccountKey.json not found locally. If running in production or Vercel, ensure FIREBASE_SERVICE_ACCOUNT_JSON is set.");
    }
}

if (getApps().length === 0) {
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        // Fallback for build phase or environment where default credentials exist
        try {
            initializeApp();
        } catch (e) {
            console.warn("Firebase Admin initialized without explicit credentials:", e.message);
        }
    }
}

let auth;
try {
    auth = getAuth();
} catch (e) {
    console.error("Firebase getAuth() error:", e.message);
    auth = {
        verifyIdToken: async () => {
            throw new Error("Firebase Admin not configured with credentials.");
        }
    };
}

module.exports = auth;

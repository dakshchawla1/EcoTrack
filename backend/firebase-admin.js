const { initializeApp, cert } =
    require("firebase-admin/app");

const { getAuth } =
    require("firebase-admin/auth");


// Load Firebase service account
const serviceAccount =
    require("./serviceAccountKey.json");


// Initialize Firebase Admin
initializeApp({

    credential:
        cert(serviceAccount)

});


// Get Firebase Admin Authentication
const auth =
    getAuth();


module.exports = auth;
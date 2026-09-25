import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_pxE2yOiJ-W0VSbouYa4QEQdwb6c34BA",
    authDomain: "ecotrack-bdc9c.firebaseapp.com",
    projectId: "ecotrack-bdc9c",
    storageBucket: "ecotrack-bdc9c.firebasestorage.app",
    messagingSenderId: "402710844262",
    appId: "1:402710844262:web:c3a39ae214b04387fe2ea7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
    auth,
    googleProvider
};
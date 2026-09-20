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



/* =========================
   SIGNUP
========================= */

const signupForm = document.getElementById("signupForm");


if (signupForm) {

    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const name =
            document.getElementById("signupName").value;


        const email =
            document.getElementById("signupEmail").value;


        const password =
            document.getElementById("signupPassword").value;


        const confirmPassword =
            document.getElementById("confirmPassword").value;


        const message =
            document.getElementById("message");


        if (password !== confirmPassword) {

            message.innerText =
                "Passwords do not match.";

            return;

        }


        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            await updateProfile(
                userCredential.user,
                {
                    displayName: name
                }
            );


            message.style.color = "green";


            message.innerText =
                "Account created successfully!";


            setTimeout(function () {

                window.location.href =
                    "dashboard.html";

            }, 1000);


        }

        catch (error) {

            message.style.color = "red";


            message.innerText =
                error.message;

        }

    });

}



/* =========================
   EMAIL LOGIN
========================= */

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("loginEmail").value;


        const password =
            document.getElementById("loginPassword").value;


        const message =
            document.getElementById("message");


        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            message.style.color = "green";


            message.innerText =
                "Login successful!";


            setTimeout(function () {

                window.location.href =
                    "dashboard.html";

            }, 800);


        }

        catch (error) {

            message.style.color = "red";


            message.innerText =
                error.message;

        }

    });

}



/* =========================
   GOOGLE LOGIN
========================= */

const googleLoginBtn =
    document.getElementById("googleLoginBtn");


const googleSignupBtn =
    document.getElementById("googleSignupBtn");


async function loginWithGoogle() {

    try {

        await signInWithPopup(
            auth,
            googleProvider
        );


        window.location.href =
            "dashboard.html";

    }

    catch (error) {

        const message =
            document.getElementById("message");


        if (message) {

            message.style.color = "red";


            message.innerText =
                error.message;

        }

    }

}


if (googleLoginBtn) {

    googleLoginBtn.addEventListener(
        "click",
        loginWithGoogle
    );

}


if (googleSignupBtn) {

    googleSignupBtn.addEventListener(
        "click",
        loginWithGoogle
    );

}
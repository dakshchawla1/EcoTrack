import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =========================
// HTML ELEMENTS
// =========================

const profilePhoto =
    document.getElementById("profilePhoto");

const defaultPhoto =
    document.getElementById("defaultPhoto");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const detailName =
    document.getElementById("detailName");

const detailEmail =
    document.getElementById("detailEmail");

const accountCreated =
    document.getElementById("accountCreated");

const activityCount =
    document.getElementById("activityCount");

const totalEmission =
    document.getElementById("totalEmission");

const achievementCount =
    document.getElementById("achievementCount");

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================
// AUTHENTICATION
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    // =========================
    // DEBUG USER INFORMATION
    // =========================

    console.log(
        "Firebase User:",
        user
    );

    console.log(
        "Firebase Name:",
        user.displayName
    );

    console.log(
        "Firebase Email:",
        user.email
    );

    console.log(
        "Firebase Photo URL:",
        user.photoURL
    );


    // =========================
    // DISPLAY USER
    // =========================

    displayUserInformation(user);


    // =========================
    // LOAD ACTIVITY DATA
    // =========================

    await loadActivityInformation();

});


// =========================
// DISPLAY USER INFORMATION
// =========================

function displayUserInformation(user) {

    /*
        USER NAME
    */

    const name =
        user.displayName ||
        "EcoTrack User";


    profileName.textContent =
        name;


    detailName.textContent =
        name;


    /*
        USER EMAIL
    */

    const email =
        user.email ||
        "Not available";


    profileEmail.textContent =
        email;


    detailEmail.textContent =
        email;


    /*
        ACCOUNT CREATION DATE
    */

    if (
        user.metadata &&
        user.metadata.creationTime
    ) {

        const createdDate =
            new Date(
                user.metadata.creationTime
            );


        accountCreated.textContent =
            createdDate.toLocaleDateString(
                "en-IN",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    } else {

        accountCreated.textContent =
            "Not available";

    }


    /*
        PROFILE PHOTO
    */

    if (
        user.photoURL &&
        user.photoURL.trim() !== ""
    ) {

        console.log(
            "Showing Firebase profile photo."
        );


        profilePhoto.src =
            user.photoURL;


        profilePhoto.alt =
            `${name}'s profile photo`;


        profilePhoto.style.display =
            "block";


        defaultPhoto.style.display =
            "none";


        /*
            Wait until image loads.
        */

        profilePhoto.onload =
            () => {

                console.log(
                    "Profile photo loaded successfully."
                );

            };


        /*
            If image cannot load,
            show default icon.
        */

        profilePhoto.onerror =
            () => {

                console.log(
                    "Profile photo could not be loaded."
                );


                profilePhoto.style.display =
                    "none";


                defaultPhoto.style.display =
                    "flex";

            };

    } else {

        /*
            Firebase does not have
            a profile photo.
        */

        console.log(
            "No Firebase profile photo found."
        );


        profilePhoto.style.display =
            "none";


        defaultPhoto.style.display =
            "flex";

    }

}


// =========================
// LOAD ACTIVITY INFORMATION
// =========================

async function loadActivityInformation() {

    try {

        /*
            Get activities securely.

            apiFetch automatically:
            1. Gets the current Firebase user
            2. Gets the Firebase ID token
            3. Sends the token to backend
        */

        const activities =
            await apiFetch(
                "/api/activities"
            );


        console.log(
            "Profile activities:",
            activities
        );


        // =========================
        // TOTAL ACTIVITIES
        // =========================

        activityCount.textContent =
            activities.length;


        // =========================
        // TOTAL EMISSIONS
        // =========================

        const total =
            activities.reduce(
                (sum, activity) => {

                    return (
                        sum +
                        Number(
                            activity.emission || 0
                        )
                    );

                },
                0
            );


        totalEmission.textContent =
            total.toFixed(2);


        // =========================
        // ACHIEVEMENTS
        // =========================

        const achievements =
            calculateAchievements(
                activities
            );


        achievementCount.textContent =
            achievements;

    } catch (error) {

        console.error(
            "Error loading profile data:",
            error
        );


        /*
            Keep the page usable even
            if activity data fails.
        */

        activityCount.textContent =
            "0";

        totalEmission.textContent =
            "0.00";

        achievementCount.textContent =
            "0";

    }

}


// =========================
// CALCULATE ACHIEVEMENTS
// =========================

function calculateAchievements(
    activities
) {

    const activityCount =
        activities.length;


    /*
        NORMALIZE CATEGORIES
    */

    const categories =
        new Set(

            activities.map(
                activity =>
                    normalizeCategory(
                        activity.activity_type
                    )
            )

        );


    /*
        UNIQUE DATES
    */

    const dates =
        new Set(

            activities.map(
                activity => {

                    const date =
                        new Date(
                            activity.created_at
                        );


                    return date.toLocaleDateString();

                }
            )

        );


    let count = 0;


    /*
        FIRST STEP
    */

    if (
        activityCount >= 1
    ) {

        count++;

    }


    /*
        ECO STARTER
    */

    if (
        activityCount >= 3
    ) {

        count++;

    }


    /*
        ECO EXPLORER
    */

    if (
        categories.has(
            "transport"
        ) &&

        categories.has(
            "electricity"
        ) &&

        categories.has(
            "food"
        ) &&

        categories.has(
            "shopping"
        )
    ) {

        count++;

    }


    /*
        CONSISTENT TRACKER
    */

    if (
        dates.size >= 2
    ) {

        count++;

    }


    /*
        TRANSPORT TRACKER
    */

    if (
        categories.has(
            "transport"
        )
    ) {

        count++;

    }


    /*
        ENERGY TRACKER
    */

    if (
        categories.has(
            "electricity"
        )
    ) {

        count++;

    }


    return count;

}


// =========================
// NORMALIZE CATEGORY
// =========================

function normalizeCategory(
    category
) {

    if (!category) {

        return "";

    }


    return String(category)
        .trim()
        .toLowerCase();

}


// =========================
// LOGOUT
// =========================

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }

    }
);
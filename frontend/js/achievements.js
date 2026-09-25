import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =========================
// HTML ELEMENTS
// =========================

const achievementList =
    document.getElementById("achievementList");

const emptyState =
    document.getElementById("emptyState");

const summarySection =
    document.getElementById("summarySection");

const achievementsSection =
    document.getElementById("achievementsSection");

const unlockedCount =
    document.getElementById("unlockedCount");

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================
// AUTHENTICATION
// =========================

onAuthStateChanged(auth, async (user) => {

    console.log(
        "Achievements - Firebase User:",
        user
    );


    if (!user) {

        console.log(
            "No Firebase user found on Achievements page."
        );

        return;
    }


    console.log(
        "Achievements user:",
        user.email
    );


    try {

        // Get activities securely
        // Firebase token is automatically added
        const activities =
            await apiFetch(
                "/api/activities"
            );


        console.log(
            "Activities loaded for achievements:",
            activities
        );


        displayAchievements(
            activities
        );


    } catch (error) {

        console.error(
            "Error loading achievements:",
            error
        );

    }

});


// =========================
// DISPLAY ACHIEVEMENTS
// =========================

function displayAchievements(
    activities
) {

    /*
        No activities yet.
    */

    if (activities.length === 0) {

        emptyState.classList.remove(
            "hidden"
        );

        summarySection.classList.add(
            "hidden"
        );

        achievementsSection.classList.add(
            "hidden"
        );

        return;
    }


    /*
        Activities exist.
    */

    emptyState.classList.add(
        "hidden"
    );

    summarySection.classList.remove(
        "hidden"
    );

    achievementsSection.classList.remove(
        "hidden"
    );


    /*
        Create achievements
        using real activity data.
    */

    const achievements =
        createAchievements(
            activities
        );


    /*
        Count unlocked badges.
    */

    const unlocked =
        achievements.filter(
            achievement =>
                achievement.unlocked
        ).length;


    unlockedCount.textContent =
        unlocked;


    /*
        Clear old cards.
    */

    achievementList.innerHTML = "";


    /*
        Create each badge.
    */

    achievements.forEach(
        achievement => {

            const card =
                createAchievementCard(
                    achievement
                );


            achievementList.appendChild(
                card
            );

        }
    );

}


// =========================
// CREATE ACHIEVEMENTS
// =========================

function createAchievements(
    activities
) {

    /*
        Number of activities.
    */

    const activityCount =
        activities.length;


    /*
        Normalize categories.
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
        Find unique dates.
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


    /*
        Return all achievements.
    */

    return [

        // =========================
        // FIRST STEP
        // =========================

        {
            icon: "I",

            title: "First Step",

            description:
                "You recorded your first environmental activity.",

            unlocked:
                activityCount >= 1
        },


        // =========================
        // ECO STARTER
        // =========================

        {
            icon: "II",

            title: "Eco Starter",

            description:
                "You tracked at least three environmental activities.",

            unlocked:
                activityCount >= 3
        },


        // =========================
        // ECO EXPLORER
        // =========================

        {
            icon: "III",

            title: "Eco Explorer",

            description:
                "You explored all four EcoTrack activity categories.",

            unlocked:
                hasAllCategories(
                    categories
                )
        },


        // =========================
        // CONSISTENT TRACKER
        // =========================

        {
            icon: "IV",

            title: "Consistent Tracker",

            description:
                "You tracked activities on at least two different days.",

            unlocked:
                dates.size >= 2
        },


        // =========================
        // TRANSPORT TRACKER
        // =========================

        {
            icon: "V",

            title: "Transport Tracker",

            description:
                "You recorded your first transport activity.",

            unlocked:
                categories.has(
                    "transport"
                )
        },


        // =========================
        // ENERGY TRACKER
        // =========================

        {
            icon: "VI",

            title: "Energy Tracker",

            description:
                "You recorded your first electricity activity.",

            unlocked:
                categories.has(
                    "electricity"
                )
        }

    ];

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
// CHECK ALL CATEGORIES
// =========================

function hasAllCategories(
    categories
) {

    return (

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

    );

}


// =========================
// CREATE BADGE CARD
// =========================

function createAchievementCard(
    achievement
) {

    const card =
        document.createElement("div");


    /*
        Add locked class
        when achievement isn't unlocked.
    */

    card.className =
        achievement.unlocked
            ? "achievement-card"
            : "achievement-card locked";


    /*
        Status.
    */

    const status =
        achievement.unlocked
            ? "Unlocked"
            : "Locked";


    const statusClass =
        achievement.unlocked
            ? "unlocked"
            : "";


    /*
        Build card.
    */

    card.innerHTML = `

        <div class="badge-icon">

            ${achievement.icon}

        </div>


        <div class="achievement-info">

            <h3>
                ${achievement.title}
            </h3>


            <p class="achievement-description">

                ${achievement.description}

            </p>


            <span
                class="achievement-status ${statusClass}"
            >

                ${status}

            </span>

        </div>

    `;


    return card;

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
import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =========================
// HTML ELEMENTS
// =========================

const challengeList =
    document.getElementById("challengeList");

const emptyState =
    document.getElementById("emptyState");

const summarySection =
    document.getElementById("summarySection");

const challengesSection =
    document.getElementById("challengesSection");

const completedCount =
    document.getElementById("completedCount");

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================
// AUTHENTICATION
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }


    try {

        // Get activities securely
        // Firebase token is automatically added
        const activities =
            await apiFetch(
                "/api/activities"
            );


        console.log(
            "Activities loaded for challenges:",
            activities
        );


        displayChallenges(activities);


    } catch (error) {

        console.error(
            "Error loading challenges:",
            error
        );

    }

});


// =========================
// DISPLAY CHALLENGES
// =========================

function displayChallenges(activities) {

    /*
        No activities
    */

    if (activities.length === 0) {

        emptyState.classList.remove("hidden");

        summarySection.classList.add("hidden");

        challengesSection.classList.add("hidden");

        return;
    }


    /*
        Activities exist
    */

    emptyState.classList.add("hidden");

    summarySection.classList.remove("hidden");

    challengesSection.classList.remove("hidden");


    /*
        Create challenge data
    */

    const challenges =
        createChallenges(activities);


    /*
        Count completed challenges
    */

    const completed =
        challenges.filter(
            challenge =>
                challenge.completed
        ).length;


    completedCount.textContent =
        completed;


    /*
        Remove old cards
    */

    challengeList.innerHTML = "";


    /*
        Create challenge cards
    */

    challenges.forEach(
        (challenge, index) => {

            const card =
                createChallengeCard(
                    challenge,
                    index
                );


            challengeList.appendChild(card);

        }
    );

}


// =========================
// CREATE CHALLENGES
// =========================

function createChallenges(activities) {

    /*
        Total activities
    */

    const activityCount =
        activities.length;


    /*
        Normalize category names.

        This means:

        Transport
        transport
        TRANSPORT
        " Transport "

        are all treated
        as the same category.
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
        DEBUG

        You can see these in the browser
        console if something goes wrong.
    */

    console.log(
        "Normalized categories:",
        categories
    );


    // =========================
    // RETURN ALL CHALLENGES
    // =========================

    return [

        // =========================
        // 01 - FIRST STEP
        // =========================

        {
            title: "First Step",

            description:
                "Track your first environmental activity.",

            current:
                Math.min(
                    activityCount,
                    1
                ),

            target: 1,

            completed:
                activityCount >= 1
        },


        // =========================
        // 02 - GETTING STARTED
        // =========================

        {
            title: "Getting Started",

            description:
                "Track at least three environmental activities.",

            current:
                Math.min(
                    activityCount,
                    3
                ),

            target: 3,

            completed:
                activityCount >= 3
        },


        // =========================
        // 03 - EXPLORE EVERYTHING
        // =========================

        {
            title: "Explore Everything",

            description:
                "Track activities from all four EcoTrack categories.",

            current:
                getCategoryCount(categories),

            target: 4,

            completed:
                hasAllCategories(categories)
        },


        // =========================
        // 04 - KEEP TRACKING
        // =========================

        {
            title: "Keep Tracking",

            description:
                "Track activities on at least two different days.",

            current:
                Math.min(
                    dates.size,
                    2
                ),

            target: 2,

            completed:
                dates.size >= 2
        },


        // =========================
        // 05 - TRANSPORT TRACKER
        // =========================

        {
            title: "Transport Tracker",

            description:
                "Record at least one transport activity.",

            current:
                categories.has("transport")
                    ? 1
                    : 0,

            target: 1,

            completed:
                categories.has("transport")
        },


        // =========================
        // 06 - ENERGY TRACKER
        // =========================

        {
            title: "Energy Tracker",

            description:
                "Record at least one electricity activity.",

            current:
                categories.has("electricity")
                    ? 1
                    : 0,

            target: 1,

            completed:
                categories.has("electricity")
        }

    ];

}


// =========================
// NORMALIZE CATEGORY
// =========================

function normalizeCategory(category) {

    /*
        Convert category to string
        in case the database value
        is missing or unexpected.
    */

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

function hasAllCategories(categories) {

    return (

        categories.has("transport") &&

        categories.has("electricity") &&

        categories.has("food") &&

        categories.has("shopping")

    );

}


// =========================
// COUNT ECO CATEGORIES
// =========================

function getCategoryCount(categories) {

    let count = 0;


    if (categories.has("transport")) {
        count++;
    }


    if (categories.has("electricity")) {
        count++;
    }


    if (categories.has("food")) {
        count++;
    }


    if (categories.has("shopping")) {
        count++;
    }


    return count;

}


// =========================
// CREATE CHALLENGE CARD
// =========================

function createChallengeCard(
    challenge,
    index
) {

    const card =
        document.createElement("div");


    card.className =
        "challenge-card";


    /*
        Calculate progress percentage.
    */

    const percentage =
        Math.min(
            (
                challenge.current /
                challenge.target
            ) * 100,
            100
        );


    /*
        Status text.
    */

    const status =
        challenge.completed
            ? "Completed ✓"
            : "In Progress";


    /*
        Completed CSS class.
    */

    const statusClass =
        challenge.completed
            ? "completed"
            : "";


    /*
        Challenge number.
    */

    const number =
        String(index + 1)
            .padStart(2, "0");


    /*
        Build card.
    */

    card.innerHTML = `

        <div class="challenge-number">
            ${number}
        </div>


        <div class="challenge-main">

            <h3>
                ${challenge.title}
            </h3>

            <p class="challenge-description">
                ${challenge.description}
            </p>

        </div>


        <div class="challenge-progress">

            <span
                class="challenge-status ${statusClass}"
            >
                ${status}
            </span>


            <div class="mini-bar">

                <div
                    class="mini-fill"
                    style="width: ${percentage}%"
                ></div>

            </div>


            <span class="progress-count">

                ${challenge.current}
                /
                ${challenge.target}

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
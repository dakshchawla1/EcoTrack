import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";



/* =========================
   GET HTML ELEMENTS
========================= */

const welcomeMessage =
    document.getElementById("welcomeMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const emptyState =
    document.getElementById("emptyState");

const insightsContent =
    document.getElementById("insightsContent");

const summaryText =
    document.getElementById("summaryText");

const biggestSource =
    document.getElementById("biggestSource");

const biggestSourceEmission =
    document.getElementById(
        "biggestSourceEmission"
    );

const sourceIcon =
    document.getElementById("sourceIcon");

const transportEmission =
    document.getElementById("transportEmission");

const electricityEmission =
    document.getElementById("electricityEmission");

const foodEmission =
    document.getElementById("foodEmission");

const shoppingEmission =
    document.getElementById("shoppingEmission");

const transportTip =
    document.getElementById("transportTip");

const electricityTip =
    document.getElementById("electricityTip");

const foodTip =
    document.getElementById("foodTip");

const shoppingTip =
    document.getElementById("shoppingTip");

const tipsContainer =
    document.getElementById("tipsContainer");



/* =========================
   CHECK LOGIN
========================= */

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        /* =========================
           USER NAME
        ========================= */

        const name =
            user.displayName || "User";


        welcomeMessage.innerText =
            `Your Environmental Insights, ${name} 🌱`;



        /* =========================
           GET ACTIVITIES
        ========================= */

        try {

            /*
                Secure API request.

                apiFetch automatically:
                1. Gets Firebase ID token
                2. Sends it to backend
                3. Backend verifies token
            */

            const activities =
                await apiFetch(
                    "/api/activities"
                );



            /* =========================
               NO DATA
            ========================= */

            if (activities.length === 0) {

                emptyState.style.display =
                    "block";

                insightsContent.style.display =
                    "none";

                return;

            }



            /* =========================
               SHOW INSIGHTS
            ========================= */

            emptyState.style.display =
                "none";

            insightsContent.style.display =
                "block";



            /* =========================
               CATEGORY TOTALS
            ========================= */

            let transport = 0;

            let electricity = 0;

            let food = 0;

            let shopping = 0;



            activities.forEach(
                function(activity) {

                    const emission =
                        Number(activity.emission);


                    if (
                        activity.activity_type
                        === "transport"
                    ) {

                        transport += emission;

                    }


                    else if (
                        activity.activity_type
                        === "electricity"
                    ) {

                        electricity += emission;

                    }


                    else if (
                        activity.activity_type
                        === "food"
                    ) {

                        food += emission;

                    }


                    else if (
                        activity.activity_type
                        === "shopping"
                    ) {

                        shopping += emission;

                    }

                }
            );



            const total =
                transport +
                electricity +
                food +
                shopping;



            /* =========================
               SUMMARY
            ========================= */

            summaryText.innerText =
                `You have recorded ${activities.length} activities with a total estimated carbon footprint of ${total.toFixed(2)} kg CO₂. Use the category insights below to understand where most of your footprint comes from.`;



            /* =========================
               DISPLAY CATEGORY VALUES
            ========================= */

            transportEmission.innerText =
                `${transport.toFixed(2)} kg CO₂`;


            electricityEmission.innerText =
                `${electricity.toFixed(2)} kg CO₂`;


            foodEmission.innerText =
                `${food.toFixed(2)} kg CO₂`;


            shoppingEmission.innerText =
                `${shopping.toFixed(2)} kg CO₂`;



            /* =========================
               FIND BIGGEST SOURCE
            ========================= */

            const categories = [

                {
                    name: "Transport",
                    value: transport,
                    icon: "🚗"
                },

                {
                    name: "Electricity",
                    value: electricity,
                    icon: "⚡"
                },

                {
                    name: "Food",
                    value: food,
                    icon: "🍽️"
                },

                {
                    name: "Shopping",
                    value: shopping,
                    icon: "🛍️"
                }

            ];



            categories.sort(
                function(a, b) {

                    return b.value - a.value;

                }
            );


            const biggest =
                categories[0];



            biggestSource.innerText =
                biggest.name;


            biggestSourceEmission.innerText =
                `${biggest.value.toFixed(2)} kg CO₂`;


            sourceIcon.innerText =
                biggest.icon;



            /* =========================
               CATEGORY TIPS
            ========================== */

            transportTip.innerText =
                "Consider public transport, walking or cycling for shorter journeys.";


            electricityTip.innerText =
                "Switch off unused lights and devices and reduce unnecessary electricity use.";


            foodTip.innerText =
                "Consider including more plant-based meals in your routine.";


            shoppingTip.innerText =
                "Choose durable products and avoid unnecessary purchases when possible.";



            /* =========================
               PERSONALIZED TIPS
            ========================= */

            createPersonalizedTips(
                categories,
                total
            );

        }


        catch (error) {

            console.log(
                "Insights error:",
                error
            );

        }

    }
);



/* =========================
   PERSONALIZED TIPS
========================= */

function createPersonalizedTips(
    categories,
    total
) {

    tipsContainer.innerHTML = "";


    /* =========================
       BIGGEST CATEGORY TIP
    ========================= */

    const biggest =
        categories[0];


    const tip1 =
        document.createElement("div");


    tip1.className =
        "tip-card";


    tip1.innerHTML = `

        <h3>
            Focus on ${biggest.name}
        </h3>

        <p>
            ${biggest.name} is currently your largest
            recorded carbon source at
            ${biggest.value.toFixed(2)} kg CO₂.
            Small changes in this area can help reduce
            your overall footprint.
        </p>

    `;


    tipsContainer.appendChild(tip1);



    /* =========================
       GENERAL TIP
    ========================= */

    const tip2 =
        document.createElement("div");


    tip2.className =
        "tip-card";


    tip2.innerHTML = `

        <h3>
            Keep Tracking 🌱
        </h3>

        <p>
            Continue recording your activities regularly.
            Tracking your habits makes it easier to understand
            your footprint and identify areas where you can
            make changes.
        </p>

    `;


    tipsContainer.appendChild(tip2);



    /* =========================
       TOTAL FOOTPRINT TIP
    ========================= */

    const tip3 =
        document.createElement("div");


    tip3.className =
        "tip-card";


    tip3.innerHTML = `

        <h3>
            Make Small Changes
        </h3>

        <p>
            You currently have a recorded footprint of
            ${total.toFixed(2)} kg CO₂.
            Try changing one activity at a time and
            use your Progress chart to observe your
            recorded footprint over time.
        </p>

    `;


    tipsContainer.appendChild(tip3);



    /* =========================
       BALANCED LIFESTYLE TIP
    ========================= */

    const tip4 =
        document.createElement("div");


    tip4.className =
        "tip-card";


    tip4.innerHTML = `

        <h3>
            Explore Different Categories
        </h3>

        <p>
            Track transport, electricity, food and shopping
            activities to get a more complete picture of
            your personal carbon footprint.
        </p>

    `;


    tipsContainer.appendChild(tip4);

}



/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async function() {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        }

        catch (error) {

            console.log(
                "Logout error:",
                error
            );

        }

    }
);
import { auth } from "./firebase-config.js";

import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// ==========================================
// ELEMENTS
// ==========================================

const welcomeMessage =
    document.getElementById("welcomeMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const totalEmission =
    document.getElementById("totalEmission");

const totalActivities =
    document.getElementById("totalActivities");

const ecoScore =
    document.getElementById("ecoScore");

const transportEmission =
    document.getElementById("transportEmission");

const electricityEmission =
    document.getElementById("electricityEmission");

const foodEmission =
    document.getElementById("foodEmission");

const shoppingEmission =
    document.getElementById("shoppingEmission");

const activityList =
    document.getElementById("activityList");

const emptyState =
    document.getElementById("emptyState");

const progressList =
    document.getElementById("progressList");

const carbonChart =
    document.getElementById("carbonChart");


// ==========================================
// WEEKLY ELEMENTS
// ==========================================

const thisWeekEmission =
    document.getElementById("thisWeekEmission");

const lastWeekEmission =
    document.getElementById("lastWeekEmission");

const weeklyDifference =
    document.getElementById("weeklyDifference");

const weeklyMessage =
    document.getElementById("weeklyMessage");


// ==========================================
// TIPS
// ==========================================

const tipsList =
    document.getElementById("tipsList");


// ==========================================
// GOAL ELEMENTS
// ==========================================

const setGoalBtn =
    document.getElementById("setGoalBtn");

const emptySetGoalBtn =
    document.getElementById("emptySetGoalBtn");

const goalModal =
    document.getElementById("goalModal");

const closeGoalModal =
    document.getElementById("closeGoalModal");

const cancelGoal =
    document.getElementById("cancelGoal");

const goalForm =
    document.getElementById("goalForm");

const goalAmount =
    document.getElementById("goalAmount");

const goalContent =
    document.getElementById("goalContent");

const goalError =
    document.getElementById("goalError");


// ==========================================
// VARIABLES
// ==========================================

let activities = [];

let chartInstance = null;

let currentGoal =
    Number(
        localStorage.getItem(
            "ecoTrackGoal"
        ) || 0
    );


// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        console.log(
            "Dashboard Firebase User:",
            user.email
        );


        const name =
            user.displayName ||
            "EcoTrack User";


        if (welcomeMessage) {

            welcomeMessage.textContent =
                `Welcome back, ${name}!`;

        }


        await loadDashboard();

    }
);


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        activities =
            await apiFetch(
                "/api/activities"
            );


        console.log(
            "Dashboard activities:",
            activities
        );


        updateDashboard();

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        activities = [];

        updateDashboard();

    }

}


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard() {

    updateStats();

    updateCategoryBreakdown();

    displayRecentActivities();

    displayDailyProgress();

    createCarbonChart();

    displayGoal();

    displayWeeklyComparison();

    displayPersonalizedTips();

}


// ==========================================
// STATS
// ==========================================

function updateStats() {

    const total =
        getTotalEmission();


    totalEmission.textContent =
        total.toFixed(2);


    totalActivities.textContent =
        activities.length;


    let score =
        100 -
        (
            total *
            5
        );


    if (score < 0) {

        score = 0;

    }


    ecoScore.textContent =
        Math.round(score);

}


// ==========================================
// TOTAL EMISSION
// ==========================================

function getTotalEmission() {

    return activities.reduce(
        (
            sum,
            activity
        ) => {

            return (
                sum +
                Number(
                    activity.emission || 0
                )
            );

        },
        0
    );

}


// ==========================================
// CATEGORY BREAKDOWN
// ==========================================

function updateCategoryBreakdown() {

    let transport = 0;

    let electricity = 0;

    let food = 0;

    let shopping = 0;


    activities.forEach(
        activity => {

            const emission =
                Number(
                    activity.emission || 0
                );


            const category =
                getCategory(
                    activity.activity_type
                );


            if (
                category ===
                "transport"
            ) {

                transport +=
                    emission;

            }


            else if (
                category ===
                "electricity"
            ) {

                electricity +=
                    emission;

            }


            else if (
                category ===
                "food"
            ) {

                food +=
                    emission;

            }


            else if (
                category ===
                "shopping"
            ) {

                shopping +=
                    emission;

            }

        }
    );


    transportEmission.textContent =
        transport.toFixed(2);


    electricityEmission.textContent =
        electricity.toFixed(2);


    foodEmission.textContent =
        food.toFixed(2);


    shoppingEmission.textContent =
        shopping.toFixed(2);

}


// ==========================================
// CATEGORY
// ==========================================

function getCategory(
    activityType
) {

    const type =
        String(
            activityType || ""
        )
            .trim()
            .toLowerCase();


    if (
        [
            "car",
            "motorcycle",
            "bike",
            "bus",
            "train",
            "transport"
        ].includes(type)
    ) {

        return "transport";

    }


    if (
        type ===
        "electricity"
    ) {

        return "electricity";

    }


    if (
        [
            "vegetarian",
            "non-vegetarian",
            "nonvegetarian",
            "food"
        ].includes(type)
    ) {

        return "food";

    }


    if (
        [
            "clothing",
            "electronics",
            "other",
            "shopping"
        ].includes(type)
    ) {

        return "shopping";

    }


    return type;

}


// ==========================================
// ACTIVITY ICON
// ==========================================

function getActivityIcon(
    category
) {

    if (
        category ===
        "transport"
    ) {

        return "🚗";

    }


    if (
        category ===
        "electricity"
    ) {

        return "⚡";

    }


    if (
        category ===
        "food"
    ) {

        return "🍽️";

    }


    if (
        category ===
        "shopping"
    ) {

        return "🛍️";

    }


    return "🌱";

}


// ==========================================
// RECENT ACTIVITIES
// ==========================================

function displayRecentActivities() {

    activityList.innerHTML =
        "";


    if (
        activities.length === 0
    ) {

        activityList.style.display =
            "none";

        emptyState.style.display =
            "block";

        return;

    }


    activityList.style.display =
        "flex";

    emptyState.style.display =
        "none";


    const recentActivities =
        activities.slice(
            0,
            5
        );


    recentActivities.forEach(
        activity => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "activity-card";


            const category =
                getCategory(
                    activity.activity_type
                );


            const icon =
                getActivityIcon(
                    category
                );


            const amount =
                Number(
                    activity.amount || 0
                );


            const emission =
                Number(
                    activity.emission || 0
                );


            const date =
                formatDate(
                    activity.created_at
                );


            card.innerHTML = `

                <div class="activity-main">

                    <div class="activity-icon">
                        ${icon}
                    </div>

                    <div class="activity-info">

                        <h3>
                            ${escapeHTML(
                                activity.activity_type
                            )}
                        </h3>

                        <p>
                            ${amount.toFixed(2)}
                            ${escapeHTML(
                                activity.unit
                            )}
                            • ${date}
                        </p>

                    </div>

                </div>


                <div class="activity-emission">

                    <strong>
                        ${emission.toFixed(2)}
                        kg CO₂
                    </strong>

                    <span>
                        Estimated emission
                    </span>

                </div>

            `;


            activityList.appendChild(
                card
            );

        }
    );

}


// ==========================================
// DAILY PROGRESS
// ==========================================

function displayDailyProgress() {

    progressList.innerHTML =
        "";


    if (
        activities.length === 0
    ) {

        progressList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    📊
                </div>

                <h3>
                    No progress data yet
                </h3>

                <p>
                    Add activities to see your
                    daily progress.
                </p>

            </div>

        `;

        return;

    }


    const dailyData = {};


    activities.forEach(
        activity => {

            const date =
                new Date(
                    activity.created_at
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return;

            }


            const key =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                );


            if (
                !dailyData[key]
            ) {

                dailyData[key] = 0;

            }


            dailyData[key] +=
                Number(
                    activity.emission || 0
                );

        }
    );


    const dailyEntries =
        Object.entries(
            dailyData
        );


    const maxEmission =
        Math.max(
            ...Object.values(
                dailyData
            )
        );


    dailyEntries
        .slice(
            0,
            7
        )
        .forEach(
            entry => {

                const date =
                    entry[0];

                const emission =
                    entry[1];


                let percentage =
                    0;


                if (
                    maxEmission > 0
                ) {

                    percentage =
                        (
                            emission /
                            maxEmission
                        ) *
                        100;

                }


                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "progress-item";


                item.innerHTML = `

                    <div class="progress-top">

                        <span class="progress-date">
                            ${escapeHTML(date)}
                        </span>

                        <span class="progress-value">
                            ${emission.toFixed(2)}
                            kg CO₂
                        </span>

                    </div>


                    <div class="progress-bar">

                        <div
                            class="progress-fill"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                `;


                progressList.appendChild(
                    item
                );

            }
        );

}


// ==========================================
// CARBON CHART
// ==========================================

function createCarbonChart() {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.log(
            "Chart.js not loaded."
        );

        return;

    }


    if (
        !carbonChart
    ) {

        return;

    }


    if (
        chartInstance
    ) {

        chartInstance.destroy();

    }


    const transport =
        getCategoryEmission(
            "transport"
        );


    const electricity =
        getCategoryEmission(
            "electricity"
        );


    const food =
        getCategoryEmission(
            "food"
        );


    const shopping =
        getCategoryEmission(
            "shopping"
        );


    chartInstance =
        new Chart(
            carbonChart,
            {

                type: "bar",

                data: {

                    labels: [
                        "Transport",
                        "Electricity",
                        "Food",
                        "Shopping"
                    ],

                    datasets: [
                        {

                            label:
                                "Emission (kg CO₂)",

                            data: [
                                transport,
                                electricity,
                                food,
                                shopping
                            ],

                            backgroundColor: [
                                "#5b8f63",
                                "#7aa47d",
                                "#93b496",
                                "#aec7ae"
                            ],

                            borderRadius: 7

                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            title: {

                                display: true,

                                text:
                                    "kg CO₂"

                            }

                        }

                    }

                }

            }
        );

}


// ==========================================
// CATEGORY EMISSION
// ==========================================

function getCategoryEmission(
    category
) {

    return activities.reduce(
        (
            sum,
            activity
        ) => {

            if (
                getCategory(
                    activity.activity_type
                ) === category
            ) {

                return (
                    sum +
                    Number(
                        activity.emission ||
                        0
                    )
                );

            }


            return sum;

        },
        0
    );

}


// ==========================================
// PERSONALIZED TIPS
// ==========================================

function displayPersonalizedTips() {

    if (
        !tipsList
    ) {

        return;

    }


    tipsList.innerHTML =
        "";


    if (
        activities.length === 0
    ) {

        tipsList.innerHTML = `

            <div class="tips-empty">

                Add some activities first and EcoTrack
                will generate personalized tips for you.

            </div>

        `;

        return;

    }


    const transport =
        getCategoryEmission(
            "transport"
        );


    const electricity =
        getCategoryEmission(
            "electricity"
        );


    const food =
        getCategoryEmission(
            "food"
        );


    const shopping =
        getCategoryEmission(
            "shopping"
        );


    const categoryData = [

        {
            category: "transport",
            emission: transport,
            icon: "🚗",
            title: "Reduce Transport Impact",
            text:
                "For shorter journeys, consider walking, cycling or using public transport when possible."
        },

        {
            category: "electricity",
            emission: electricity,
            icon: "⚡",
            title: "Save Electricity",
            text:
                "Switch off lights, fans and devices when they are not needed and avoid unnecessary energy use."
        },

        {
            category: "food",
            emission: food,
            icon: "🍽️",
            title: "Think About Food Choices",
            text:
                "Try to reduce food waste and include lower-impact food choices more often."
        },

        {
            category: "shopping",
            emission: shopping,
            icon: "🛍️",
            title: "Shop More Mindfully",
            text:
                "Consider reusing items, avoiding unnecessary purchases and choosing products that last longer."
        }

    ];


    const activeTips =
        categoryData
            .filter(
                item =>
                    item.emission > 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.emission -
                    a.emission
            );


    const tipsToShow =
        activeTips.slice(
            0,
            4
        );


    if (
        tipsToShow.length === 0
    ) {

        tipsList.innerHTML = `

            <div class="tips-empty">

                Keep tracking your activities to receive
                more personalized suggestions.

            </div>

        `;

        return;

    }


    tipsToShow.forEach(
        tip => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "tip-card";


            card.innerHTML = `

                <div class="tip-icon">
                    ${tip.icon}
                </div>

                <div class="tip-content">

                    <h3>
                        ${tip.title}
                    </h3>

                    <p>
                        ${tip.text}
                    </p>

                </div>

            `;


            tipsList.appendChild(
                card
            );

        }
    );

}


// ==========================================
// PERSONAL CARBON GOAL
// ==========================================

function openGoalModal() {

    goalError.textContent =
        "";


    if (
        currentGoal > 0
    ) {

        goalAmount.value =
            currentGoal;

    }

    else {

        goalAmount.value =
            "";

    }


    goalModal.classList.add(
        "show"
    );

}


function closeGoalModalFunction() {

    goalModal.classList.remove(
        "show"
    );


    goalForm.reset();


    goalError.textContent =
        "";

}


goalForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const value =
            Number(
                goalAmount.value
            );


        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {

            goalError.textContent =
                "Please enter a valid goal.";

            return;

        }


        currentGoal =
            value;


        localStorage.setItem(
            "ecoTrackGoal",
            String(
                currentGoal
            )
        );


        closeGoalModalFunction();


        displayGoal();

    }
);


// ==========================================
// DISPLAY GOAL
// ==========================================

function displayGoal() {

    if (
        !goalContent
    ) {

        return;

    }


    if (
        currentGoal <= 0
    ) {

        goalContent.innerHTML = `

            <div class="goal-empty">

                <div class="goal-empty-icon">
                    🎯
                </div>

                <h3>
                    No personal goal set
                </h3>

                <p>
                    Set a carbon goal to start tracking
                    your progress.
                </p>

                <button
                    id="emptySetGoalBtn"
                    class="goal-btn"
                >
                    Set My Goal
                </button>

            </div>

        `;


        const newButton =
            document.getElementById(
                "emptySetGoalBtn"
            );


        if (
            newButton
        ) {

            newButton.addEventListener(
                "click",
                openGoalModal
            );

        }


        return;

    }


    const total =
        getTotalEmission();


    const percentage =
        Math.min(
            (
                total /
                currentGoal
            ) *
            100,
            100
        );


    const remaining =
        Math.max(
            currentGoal -
            total,
            0
        );


    let statusText =
        "You're within your carbon goal. Keep tracking!";


    let statusClass =
        "";


    if (
        percentage >= 100
    ) {

        statusText =
            "You've reached your carbon goal. Consider reducing your footprint in your next activities.";

        statusClass =
            "danger";

    }


    else if (
        percentage >= 80
    ) {

        statusText =
            "You're getting close to your goal. Keep an eye on your upcoming activities.";

        statusClass =
            "warning";

    }


    goalContent.innerHTML = `

        <div class="goal-display">

            <div class="goal-progress-box">

                <div class="goal-progress-top">

                    <span>
                        Monthly progress
                    </span>

                    <strong>
                        ${percentage.toFixed(0)}%
                    </strong>

                </div>


                <div class="goal-progress-bar">

                    <div
                        class="goal-progress-fill ${statusClass}"
                        style="width: ${percentage}%"
                    ></div>

                </div>


                <div class="goal-status ${statusClass}">
                    ${statusText}
                </div>

            </div>


            <div class="goal-stats">

                <div class="goal-stat">

                    <span>
                        Current
                    </span>

                    <strong>
                        ${total.toFixed(2)} kg
                    </strong>

                </div>


                <div class="goal-stat">

                    <span>
                        Goal
                    </span>

                    <strong>
                        ${currentGoal.toFixed(2)} kg
                    </strong>

                </div>


                <div class="goal-stat">

                    <span>
                        Remaining
                    </span>

                    <strong>
                        ${remaining.toFixed(2)} kg
                    </strong>

                </div>

            </div>

        </div>

    `;

}


// ==========================================
// WEEKLY COMPARISON
// ==========================================

function displayWeeklyComparison() {

    const thisWeek =
        getWeekEmission(
            0
        );


    const lastWeek =
        getWeekEmission(
            1
        );


    const difference =
        thisWeek -
        lastWeek;


    thisWeekEmission.textContent =
        thisWeek.toFixed(2);


    lastWeekEmission.textContent =
        lastWeek.toFixed(2);


    if (
        difference > 0
    ) {

        weeklyDifference.textContent =
            `+${difference.toFixed(2)}`;


        weeklyMessage.textContent =
            `Your emissions are ${difference.toFixed(2)} kg CO₂ higher than last week.`;

    }


    else if (
        difference < 0
    ) {

        weeklyDifference.textContent =
            difference.toFixed(2);


        weeklyMessage.textContent =
            `Your emissions are ${Math.abs(difference).toFixed(2)} kg CO₂ lower than last week. 🌱`;

    }


    else {

        weeklyDifference.textContent =
            "0.00";


        weeklyMessage.textContent =
            "Your emissions are the same as last week.";

    }

}


// ==========================================
// GET WEEK EMISSION
// ==========================================

function getWeekEmission(
    weeksAgo
) {

    const now =
        new Date();


    const currentDay =
        now.getDay();


    const mondayOffset =
        currentDay === 0
            ? 6
            : currentDay - 1;


    const startOfWeek =
        new Date(
            now
        );


    startOfWeek.setHours(
        0,
        0,
        0,
        0
    );


    startOfWeek.setDate(
        now.getDate() -
        mondayOffset -
        (
            weeksAgo *
            7
        )
    );


    const endOfWeek =
        new Date(
            startOfWeek
        );


    endOfWeek.setDate(
        startOfWeek.getDate() +
        7
    );


    return activities.reduce(
        (
            sum,
            activity
        ) => {

            const activityDate =
                new Date(
                    activity.created_at
                );


            if (
                Number.isNaN(
                    activityDate.getTime()
                )
            ) {

                return sum;

            }


            if (
                activityDate >=
                    startOfWeek &&
                activityDate <
                    endOfWeek
            ) {

                return (
                    sum +
                    Number(
                        activity.emission ||
                        0
                    )
                );

            }


            return sum;

        },
        0
    );

}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "Date unavailable";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Date unavailable";

    }


    return date.toLocaleString(
        "en-IN",
        {

            day: "numeric",

            month: "short",

            year: "numeric",

            hour: "numeric",

            minute: "2-digit"

        }
    );

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// GOAL BUTTON EVENTS
// ==========================================

setGoalBtn.addEventListener(
    "click",
    openGoalModal
);


emptySetGoalBtn.addEventListener(
    "click",
    openGoalModal
);


closeGoalModal.addEventListener(
    "click",
    closeGoalModalFunction
);


cancelGoal.addEventListener(
    "click",
    closeGoalModalFunction
);


goalModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            goalModal
        ) {

            closeGoalModalFunction();

        }

    }
);


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.href =
                "login.html";

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }

    }
);
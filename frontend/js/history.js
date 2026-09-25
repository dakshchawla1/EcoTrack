import { auth } from "./firebase-config.js";

import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// ==========================================
// ELEMENTS
// ==========================================

const activityList =
    document.getElementById("activityList");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");

const totalActivities =
    document.getElementById("totalActivities");

const totalEmission =
    document.getElementById("totalEmission");

const editModal =
    document.getElementById("editModal");

const editForm =
    document.getElementById("editForm");

const editId =
    document.getElementById("editId");

const editActivityType =
    document.getElementById("editActivityType");

const editAmount =
    document.getElementById("editAmount");

const editUnit =
    document.getElementById("editUnit");

const editEmission =
    document.getElementById("editEmission");

const editError =
    document.getElementById("editError");

const closeModal =
    document.getElementById("closeModal");

const cancelEdit =
    document.getElementById("cancelEdit");

const logoutBtn =
    document.getElementById("logoutBtn");


// ==========================================
// DATA
// ==========================================

let activities = [];


// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    console.log(
        "History Firebase User:",
        user.email
    );

    await loadActivities();

});


// ==========================================
// LOAD ACTIVITIES
// ==========================================

async function loadActivities() {

    try {

        activities =
            await apiFetch(
                "/api/activities"
            );

        console.log(
            "History activities:",
            activities
        );

        updateSummary();

        displayActivities();

    } catch (error) {

        console.error(
            "Error loading activities:",
            error
        );

        activities = [];

        updateSummary();

        displayActivities();

    }

}


// ==========================================
// UPDATE SUMMARY
// ==========================================

function updateSummary() {

    totalActivities.textContent =
        activities.length;

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

}


// ==========================================
// DISPLAY ACTIVITIES
// ==========================================

function displayActivities() {

    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedCategory =
        categoryFilter.value;


    const filteredActivities =
        activities.filter(
            activity => {

                const activityType =
                    String(
                        activity.activity_type || ""
                    )
                        .toLowerCase();


                const matchesSearch =
                    activityType.includes(
                        searchText
                    );


                const matchesCategory =
                    selectedCategory === "all" ||
                    getCategory(activityType) ===
                        selectedCategory;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            }
        );


    activityList.innerHTML = "";


    if (
        filteredActivities.length === 0
    ) {

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    filteredActivities.forEach(
        activity => {

            const card =
                createActivityCard(
                    activity
                );

            activityList.appendChild(card);

        }
    );

}


// ==========================================
// CREATE ACTIVITY CARD
// ==========================================

function createActivityCard(activity) {

    const card =
        document.createElement("div");

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


    const date =
        formatDate(
            activity.created_at
        );


    const amount =
        Number(
            activity.amount || 0
        );


    const emission =
        Number(
            activity.emission || 0
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


        <div class="activity-actions">

            <button
                class="edit-btn"
                data-id="${activity.id}"
            >
                Edit
            </button>

            <button
                class="delete-btn"
                data-id="${activity.id}"
            >
                Delete
            </button>

        </div>

    `;


    const editButton =
        card.querySelector(
            ".edit-btn"
        );

    const deleteButton =
        card.querySelector(
            ".delete-btn"
        );


    editButton.addEventListener(
        "click",
        () => {

            openEditModal(
                activity
            );

        }
    );


    deleteButton.addEventListener(
        "click",
        () => {

            deleteActivity(
                activity.id
            );

        }
    );


    return card;

}


// ==========================================
// GET CATEGORY
// ==========================================

function getCategory(activityType) {

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
        type === "electricity"
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

function getActivityIcon(category) {

    if (
        category === "transport"
    ) {

        return "TR";

    }


    if (
        category === "electricity"
    ) {

        return "EL";

    }


    if (
        category === "food"
    ) {

        return "FD";

    }


    if (
        category === "shopping"
    ) {

        return "SH";

    }


    return "•";

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateValue) {

    if (!dateValue) {

        return "Date unavailable";

    }


    const date =
        new Date(dateValue);


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
// EDIT MODAL
// ==========================================

function openEditModal(activity) {

    editId.value =
        activity.id;

    editActivityType.value =
        activity.activity_type || "";

    editAmount.value =
        activity.amount || 0;

    editUnit.value =
        activity.unit || "";

    editEmission.value =
        activity.emission || 0;

    editError.textContent =
        "";

    editModal.classList.add(
        "show"
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeEditModal() {

    editModal.classList.remove(
        "show"
    );

    editForm.reset();

    editError.textContent =
        "";

}


// ==========================================
// UPDATE ACTIVITY
// ==========================================

editForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        editError.textContent =
            "";


        const id =
            editId.value;


        const activityType =
            editActivityType.value
                .trim();


        const amount =
            Number(
                editAmount.value
            );


        const unit =
            editUnit.value
                .trim();


        const emission =
            Number(
                editEmission.value
            );


        if (
            !activityType ||
            !unit ||
            !Number.isFinite(amount) ||
            !Number.isFinite(emission) ||
            amount < 0 ||
            emission < 0
        ) {

            editError.textContent =
                "Please enter valid activity details.";

            return;

        }


        try {

            await apiFetch(
                `/api/activities/${id}`,
                {
                    method: "PUT",

                    body: JSON.stringify({

                        activity_type:
                            activityType,

                        amount:
                            amount,

                        unit:
                            unit,

                        emission:
                            emission

                    })
                }
            );


            closeEditModal();


            await loadActivities();


        } catch (error) {

            console.error(
                "Update error:",
                error
            );

            editError.textContent =
                error.message ||
                "Failed to update activity.";

        }

    }
);


// ==========================================
// DELETE ACTIVITY
// ==========================================

async function deleteActivity(id) {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this activity?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await apiFetch(
            `/api/activities/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadActivities();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        alert(
            error.message ||
            "Failed to delete activity."
        );

    }

}


// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener(
    "input",
    () => {

        displayActivities();

    }
);


// ==========================================
// FILTER
// ==========================================

categoryFilter.addEventListener(
    "change",
    () => {

        displayActivities();

    }
);


// ==========================================
// MODAL EVENTS
// ==========================================

closeModal.addEventListener(
    "click",
    closeEditModal
);


cancelEdit.addEventListener(
    "click",
    closeEditModal
);


editModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target === editModal
        ) {

            closeEditModal();

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


// ==========================================
// BASIC HTML ESCAPING
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
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
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

const activeDaysCount =
    document.getElementById("activeDaysCount");

// Calendar Elements
const calendarMonthYear =
    document.getElementById("calendarMonthYear");

const prevMonthBtn =
    document.getElementById("prevMonthBtn");

const todayMonthBtn =
    document.getElementById("todayMonthBtn");

const nextMonthBtn =
    document.getElementById("nextMonthBtn");

const calendarDays =
    document.getElementById("calendarDays");

const calendarSelectedInfo =
    document.getElementById("calendarSelectedInfo");

const selectedDateLabel =
    document.getElementById("selectedDateLabel");

const selectedDateStats =
    document.getElementById("selectedDateStats");

const clearDateFilterBtn =
    document.getElementById("clearDateFilterBtn");

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
// DATA & STATE
// ==========================================

let activities = [];
let calendarDate = new Date();
let selectedDateFilter = null; // "YYYY-MM-DD" or null


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

        renderCalendar();

        displayActivities();

    } catch (error) {

        console.error(
            "Error loading activities:",
            error
        );

        activities = [];

        updateSummary();

        renderCalendar();

        displayActivities();

    }

}


// ==========================================
// DATE HELPERS
// ==========================================

function getActivityDateKey(activity) {
    const raw = activity.date || activity.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}


// ==========================================
// UPDATE SUMMARY
// ==========================================

function updateSummary() {

    if (totalActivities) {
        totalActivities.textContent = activities.length;
    }

    const total = activities.reduce(
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

    if (totalEmission) {
        totalEmission.textContent = total.toFixed(2);
    }

    if (activeDaysCount) {
        const curYear = calendarDate.getFullYear();
        const curMonth = calendarDate.getMonth();
        const daysSet = new Set();
        activities.forEach(activity => {
            const raw = activity.date || activity.created_at;
            if (!raw) return;
            const d = new Date(raw);
            if (!isNaN(d.getTime()) && d.getFullYear() === curYear && d.getMonth() === curMonth) {
                daysSet.add(d.getDate());
            }
        });
        activeDaysCount.textContent = daysSet.size;
    }

}


// ==========================================
// RENDER CALENDAR
// ==========================================

function renderCalendar() {
    if (!calendarDays || !calendarMonthYear) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

    // Map: "YYYY-MM-DD" -> { count, totalEmission, activities: [] }
    const activityMap = {};
    activities.forEach(activity => {
        const key = getActivityDateKey(activity);
        if (!key) return;
        if (!activityMap[key]) {
            activityMap[key] = { count: 0, totalEmission: 0, activities: [] };
        }
        activityMap[key].count += 1;
        activityMap[key].totalEmission += Number(activity.emission || 0);
        activityMap[key].activities.push(activity);
    });

    calendarDays.innerHTML = "";

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Previous month padding
    for (let i = firstDayIndex; i > 0; i--) {
        const prevDay = prevMonthLastDay - i + 1;
        const cell = document.createElement("div");
        cell.className = "calendar-day other-month";
        cell.innerHTML = `
            <div class="day-header">
                <span class="day-number">${prevDay}</span>
            </div>
        `;
        calendarDays.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= lastDayOfMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day";

        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayData = activityMap[dateKey];

        const isToday = dateKey === todayKey;
        const isSelected = dateKey === selectedDateFilter;

        if (isToday) cell.classList.add("is-today");
        if (isSelected) cell.classList.add("is-selected");

        let badgeHtml = "";
        let emissionsHtml = "";

        if (dayData && dayData.count > 0) {
            cell.classList.add("has-activities");
            badgeHtml = `<span class="day-badge">${dayData.count} log${dayData.count > 1 ? "s" : ""}</span>`;
            emissionsHtml = `<span class="day-emissions-text">${dayData.totalEmission.toFixed(1)} kg</span>`;
            cell.title = `${dayData.count} logged activities (${dayData.totalEmission.toFixed(2)} kg CO₂)`;
        }

        cell.innerHTML = `
            <div class="day-header">
                <span class="day-number">${day}</span>
                ${badgeHtml}
            </div>
            ${emissionsHtml}
        `;

        cell.addEventListener("click", () => {
            if (selectedDateFilter === dateKey) {
                selectedDateFilter = null;
            } else {
                selectedDateFilter = dateKey;
            }
            renderCalendar();
            displayActivities();
        });

        calendarDays.appendChild(cell);
    }

    // Next month padding slots
    const totalRendered = firstDayIndex + lastDayOfMonth;
    const remainingSlots = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day other-month";
        cell.innerHTML = `
            <div class="day-header">
                <span class="day-number">${nextDay}</span>
            </div>
        `;
        calendarDays.appendChild(cell);
    }

    updateSelectedBanner(activityMap);
    updateSummary();
}

function updateSelectedBanner(activityMap) {
    if (!calendarSelectedInfo) return;

    if (!selectedDateFilter) {
        calendarSelectedInfo.style.display = "none";
        return;
    }

    calendarSelectedInfo.style.display = "flex";
    const parts = selectedDateFilter.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    if (selectedDateLabel) {
        selectedDateLabel.textContent = `Viewing logs for ${formatted}`;
    }

    const dayData = (activityMap || {})[selectedDateFilter];
    const count = dayData ? dayData.count : 0;
    const em = dayData ? dayData.totalEmission.toFixed(2) : "0.00";

    if (selectedDateStats) {
        selectedDateStats.textContent = `(${count} activit${count === 1 ? "y" : "ies"} • ${em} kg CO₂)`;
    }
}


// ==========================================
// DISPLAY ACTIVITIES
// ==========================================

function displayActivities() {

    const searchText =
        searchInput ? searchInput.value.trim().toLowerCase() : "";

    const selectedCategory =
        categoryFilter ? categoryFilter.value : "all";

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

                let matchesDate = true;
                if (selectedDateFilter) {
                    const actKey = getActivityDateKey(activity);
                    matchesDate = actKey === selectedDateFilter;
                }

                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesDate
                );

            }
        );

    activityList.innerHTML = "";

    if (filteredActivities.length === 0) {
        emptyState.style.display = "block";
        const emptyH3 = emptyState.querySelector("h3");
        const emptyP = emptyState.querySelector("p");
        if (selectedDateFilter) {
            if (emptyH3) emptyH3.textContent = "No activities on this date";
            if (emptyP) emptyP.textContent = "You did not log any entries on the selected calendar date.";
        } else {
            if (emptyH3) emptyH3.textContent = "No activities found";
            if (emptyP) emptyP.textContent = "No matching activity logs found for your search or filter selection.";
        }
        return;
    }

    emptyState.style.display = "none";

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
    const icons = {
        transport: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
        electricity: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        food: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/></svg>`,
        shopping: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
    };
    return icons[category] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
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
// CALENDAR EVENT LISTENERS
// ==========================================

if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });
}

if (todayMonthBtn) {
    todayMonthBtn.addEventListener("click", () => {
        calendarDate = new Date();
        renderCalendar();
    });
}

if (clearDateFilterBtn) {
    clearDateFilterBtn.addEventListener("click", () => {
        selectedDateFilter = null;
        renderCalendar();
        displayActivities();
    });
}


// ==========================================
// LOGOUT
// ==========================================

if (logoutBtn) {
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
}


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
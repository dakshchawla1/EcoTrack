import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const form =
    document.getElementById("activityForm");

const activityType =
    document.getElementById("activityType");

const amount =
    document.getElementById("amount");

const unit =
    document.getElementById("unit");

const extraFields =
    document.getElementById("extraFields");

const result =
    document.getElementById("result");


let currentUser = null;



/* =========================
   CHECK LOGIN
========================= */

onAuthStateChanged(auth, function(user) {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    currentUser = user;

});



/* =========================
   CHANGE ACTIVITY
========================= */

activityType.addEventListener(
    "change",
    function() {

        const type =
            activityType.value;


        extraFields.innerHTML = "";


        unit.innerHTML = `
            <option value="">
                Select unit
            </option>
        `;



        /* TRANSPORT */

        if (type === "transport") {

            extraFields.innerHTML = `

                <label class="extra-label">
                    Transport Type
                </label>

                <select id="transportType" required>

                    <option value="">
                        Select vehicle
                    </option>

                    <option value="car">
                        Car
                    </option>

                    <option value="bike">
                        Motorcycle
                    </option>

                    <option value="bus">
                        Bus
                    </option>

                    <option value="train">
                        Train
                    </option>

                </select>

            `;


            unit.innerHTML = `

                <option value="km">
                    Kilometres
                </option>

            `;

        }



        /* ELECTRICITY */

        else if (type === "electricity") {

            unit.innerHTML = `

                <option value="kwh">
                    kWh
                </option>

            `;

        }



        /* FOOD */

        else if (type === "food") {

            extraFields.innerHTML = `

                <label class="extra-label">
                    Food Type
                </label>

                <select id="foodType" required>

                    <option value="">
                        Select food type
                    </option>

                    <option value="vegetarian">
                        Vegetarian
                    </option>

                    <option value="nonvegetarian">
                        Non-vegetarian
                    </option>

                </select>

            `;


            unit.innerHTML = `

                <option value="kg">
                    Kilograms
                </option>

            `;

        }



        /* SHOPPING */

        else if (type === "shopping") {

            extraFields.innerHTML = `

                <label class="extra-label">
                    Shopping Type
                </label>

                <select id="shoppingType" required>

                    <option value="">
                        Select category
                    </option>

                    <option value="clothing">
                        Clothing
                    </option>

                    <option value="electronics">
                        Electronics
                    </option>

                    <option value="other">
                        Other
                    </option>

                </select>

            `;


            unit.innerHTML = `

                <option value="items">
                    Items
                </option>

            `;

        }

    }
);



/* =========================
   SUBMIT FORM
========================= */

form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        if (!currentUser) {

            result.style.display = "block";

            result.innerText =
                "Please wait for login to load.";

            return;
        }


        const type =
            activityType.value;

        const value =
            Number(amount.value);

        const selectedUnit =
            unit.value;


        if (value <= 0) {

            result.style.display = "block";

            result.innerText =
                "Please enter a valid amount.";

            return;
        }



        /* =========================
           EMISSION FACTORS
        ========================= */

        let emission = 0;



        /* TRANSPORT */

        if (type === "transport") {

            const vehicle =
                document.getElementById(
                    "transportType"
                ).value;


            if (!vehicle) {

                result.style.display = "block";

                result.innerText =
                    "Please select a transport type.";

                return;
            }


            if (vehicle === "car") {

                emission = value * 0.21;

            }

            else if (vehicle === "bike") {

                emission = value * 0.10;

            }

            else if (vehicle === "bus") {

                emission = value * 0.08;

            }

            else if (vehicle === "train") {

                emission = value * 0.04;

            }

        }



        /* ELECTRICITY */

        else if (type === "electricity") {

            emission = value * 0.7;

        }



        /* FOOD */

        else if (type === "food") {

            const food =
                document.getElementById(
                    "foodType"
                ).value;


            if (!food) {

                result.style.display = "block";

                result.innerText =
                    "Please select a food type.";

                return;
            }


            if (food === "vegetarian") {

                emission = value * 1.5;

            }

            else if (food === "nonvegetarian") {

                emission = value * 4.5;

            }

        }



        /* SHOPPING */

        else if (type === "shopping") {

            const shopping =
                document.getElementById(
                    "shoppingType"
                ).value;


            if (!shopping) {

                result.style.display = "block";

                result.innerText =
                    "Please select a shopping category.";

                return;
            }


            if (shopping === "clothing") {

                emission = value * 5;

            }

            else if (shopping === "electronics") {

                emission = value * 10;

            }

            else {

                emission = value * 2;

            }

        }



        /* =========================
           SAVE TO DATABASE
        ========================= */

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : "Calculate & Save Activity";

        result.style.display = "block";
        result.className = "result";
        result.innerText = "Calculating & saving activity...";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Saving...";
        }

        try {

            /*
                Secure API request with resilient fallback.
                apiFetch automatically gets the Firebase ID token
                and handles cloud storage with offline resilience.
            */

            const data = await apiFetch(
                "/api/activities",
                {
                    method: "POST",
                    body: JSON.stringify({
                        activity_type: type,
                        amount: value,
                        unit: selectedUnit,
                        emission: emission
                    })
                }
            );

            result.className = "result result-success";
            result.innerHTML = `
                <div style="font-size: 15px; font-weight: 700; color: var(--brand-primary); margin-bottom: 6px;">
                    Activity Recorded Successfully
                </div>
                <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
                    Logged <strong>${value} ${selectedUnit}</strong> of <strong>${type}</strong>.
                    <br>
                    Estimated Footprint: <strong style="color: var(--brand-primary); font-size: 16px;">${emission.toFixed(2)} kg CO₂</strong>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 10px;">
                    <a href="dashboard.html" class="btn btn-sm btn-primary" style="font-size: 12.5px; padding: 5px 12px;">View Dashboard</a>
                    <a href="history.html" class="btn btn-sm btn-secondary" style="font-size: 12.5px; padding: 5px 12px;">View History</a>
                </div>
            `;

            form.reset();
            extraFields.innerHTML = "";
            unit.innerHTML = `
                <option value="">
                    Select unit
                </option>
            `;

        }

        catch (error) {

            console.error("Save error:", error);

            result.className = "result result-error";
            result.innerHTML = `
                <div style="font-size: 14px; font-weight: 600; color: var(--status-danger); margin-bottom: 2px;">
                    Could not record activity
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    ${error.message || "Please check your inputs and try again."}
                </div>
            `;

        }

        finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }

    }
);

// ==========================================
// WHAT-IF CARBON SIMULATOR
// ==========================================

const whatIfForm = document.getElementById("whatIfForm");
const whatIfCategory = document.getElementById("whatIfCategory");
const whatIfCurrent = document.getElementById("whatIfCurrent");
const whatIfAlternative = document.getElementById("whatIfAlternative");
const whatIfAmount = document.getElementById("whatIfAmount");
const whatIfAmountLabel = document.getElementById("whatIfAmountLabel");
const whatIfFrequency = document.getElementById("whatIfFrequency");
const whatIfFrequencyLabel = document.getElementById("whatIfFrequencyLabel");
const whatIfResult = document.getElementById("whatIfResult");
const whatIfCalculateBtn = document.getElementById("whatIfCalculateBtn");

const whatIfOptions = {
    transport: {
        amountLabel: "Distance (km)",
        amountDefault: 20,
        freqLabel: "Number of trips",
        freqDefault: 5,
        current: [
            { value: "car", label: "Petrol Car (0.19 kg/km)" },
            { value: "bike", label: "Motorcycle (0.10 kg/km)" }
        ],
        alt: [
            { value: "metro", label: "Metro / Train (0.04 kg/km)" },
            { value: "bus", label: "City Bus (0.09 kg/km)" },
            { value: "bicycle", label: "Bicycle / Walking (0.00 kg/km)" }
        ]
    },
    electricity: {
        amountLabel: "Energy usage (kWh)",
        amountDefault: 100,
        freqLabel: "Billing periods",
        freqDefault: 1,
        current: [
            { value: "grid", label: "Standard Coal/Gas Grid (0.82 kg/kWh)" }
        ],
        alt: [
            { value: "efficient", label: "Energy-Star / Heat Pump (0.45 kg/kWh)" },
            { value: "solar", label: "Rooftop Solar / Clean Power (0.05 kg/kWh)" }
        ]
    },
    food: {
        amountLabel: "Servings per meal",
        amountDefault: 1,
        freqLabel: "Meals per week",
        freqDefault: 4,
        current: [
            { value: "nonvegetarian", label: "Meat / Beef Meal (3.50 kg/meal)" }
        ],
        alt: [
            { value: "vegetarian", label: "Vegetarian / Plant-Forward (1.50 kg/meal)" },
            { value: "vegan", label: "Fully Plant-Based / Vegan (0.80 kg/meal)" }
        ]
    },
    shopping: {
        amountLabel: "Items per purchase",
        amountDefault: 2,
        freqLabel: "Occasions per year",
        freqDefault: 6,
        current: [
            { value: "clothing", label: "Fast Fashion Garments (5.0 kg/item)" },
            { value: "electronics", label: "New Tech / Electronics (10.0 kg/item)" }
        ],
        alt: [
            { value: "thrift", label: "Second-hand / Thrift (1.0 kg/item)" },
            { value: "refurbished", label: "Refurbished / Repaired (2.5 kg/item)" }
        ]
    }
};

if (whatIfCategory) {
    whatIfCategory.addEventListener("change", () => {
        const cat = whatIfCategory.value;
        const config = whatIfOptions[cat] || whatIfOptions.transport;

        if (whatIfAmountLabel) whatIfAmountLabel.textContent = config.amountLabel;
        if (whatIfAmount) whatIfAmount.value = config.amountDefault;
        if (whatIfFrequencyLabel) whatIfFrequencyLabel.textContent = config.freqLabel;
        if (whatIfFrequency) whatIfFrequency.value = config.freqDefault;

        if (whatIfCurrent) {
            whatIfCurrent.innerHTML = config.current.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
        }

        if (whatIfAlternative) {
            whatIfAlternative.innerHTML = config.alt.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
        }

        if (whatIfResult) whatIfResult.style.display = "none";
    });
}

if (whatIfForm) {
    whatIfForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const category = whatIfCategory ? whatIfCategory.value : "transport";
        const currentChoice = whatIfCurrent ? whatIfCurrent.value : "car";
        const alternativeChoice = whatIfAlternative ? whatIfAlternative.value : "metro";
        const amount = Number(whatIfAmount?.value) || 20;
        const frequency = Number(whatIfFrequency?.value) || 5;

        const originalBtnText = whatIfCalculateBtn ? whatIfCalculateBtn.innerText : "Calculate Impact";
        if (whatIfCalculateBtn) {
            whatIfCalculateBtn.disabled = true;
            whatIfCalculateBtn.innerText = "Calculating...";
        }

        try {
            const data = await apiFetch("/api/ai/simulate", {
                method: "POST",
                body: JSON.stringify({
                    category,
                    currentChoice,
                    alternativeChoice,
                    amount,
                    frequency
                })
            });

            const currentEl = document.getElementById("whatIfCurrentEmissions");
            const altEl = document.getElementById("whatIfAltEmissions");
            const savingEl = document.getElementById("whatIfSaving");
            const pctEl = document.getElementById("whatIfPct");
            const explanationEl = document.getElementById("whatIfExplanationText");

            if (currentEl) currentEl.textContent = `${data.currentEmissions} kg CO₂`;
            if (altEl) altEl.textContent = `${data.alternativeEmissions} kg CO₂`;
            if (savingEl) savingEl.textContent = `${data.potentialSaving} kg CO₂`;
            if (pctEl) pctEl.textContent = `${data.percentageSaved}% reduction`;
            if (explanationEl) explanationEl.textContent = data.explanation || "Switching to this alternative lowers your footprint.";

            if (whatIfResult) {
                whatIfResult.style.display = "block";
                whatIfResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }

        } catch (error) {
            console.error("Simulator error:", error);
            // Fallback calculation on client
            const factors = {
                transport: { car: 0.192, bike: 0.103, bus: 0.089, metro: 0.041, bicycle: 0 },
                electricity: { grid: 0.82, efficient: 0.45, solar: 0.05 },
                food: { nonvegetarian: 3.5, vegetarian: 1.5, vegan: 0.8 },
                shopping: { clothing: 5.0, electronics: 10.0, thrift: 1.0, refurbished: 2.5 }
            };
            const catFactors = factors[category] || factors.transport;
            const cf = catFactors[currentChoice] ?? 0.192;
            const af = catFactors[alternativeChoice] ?? 0.041;
            const curE = Number((amount * cf * frequency).toFixed(2));
            const altE = Number((amount * af * frequency).toFixed(2));
            const sav = Number(Math.max(0, curE - altE).toFixed(2));
            const pct = curE > 0 ? Number(((sav / curE) * 100).toFixed(1)) : 0;

            const currentEl = document.getElementById("whatIfCurrentEmissions");
            const altEl = document.getElementById("whatIfAltEmissions");
            const savingEl = document.getElementById("whatIfSaving");
            const pctEl = document.getElementById("whatIfPct");
            const explanationEl = document.getElementById("whatIfExplanationText");

            if (currentEl) currentEl.textContent = `${curE} kg CO₂`;
            if (altEl) altEl.textContent = `${altE} kg CO₂`;
            if (savingEl) savingEl.textContent = `${sav} kg CO₂`;
            if (pctEl) pctEl.textContent = `${pct}% reduction`;
            if (explanationEl) explanationEl.textContent = `Switching ${frequency} ${category} action(s) avoids approximately ${sav} kg CO₂ (${pct}% reduction).`;

            if (whatIfResult) whatIfResult.style.display = "block";
        } finally {
            if (whatIfCalculateBtn) {
                whatIfCalculateBtn.disabled = false;
                whatIfCalculateBtn.innerText = originalBtnText;
            }
        }
    });
}

// ==========================================
// LOGOUT
// ==========================================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}
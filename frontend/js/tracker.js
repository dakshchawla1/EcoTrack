import { auth } from "./firebase-config.js";
import { apiFetch } from "./api.js";

import {
    onAuthStateChanged
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

        result.style.display = "block";

        result.innerText =
            "Saving activity...";


        try {

            /*
                Secure API request.

                apiFetch automatically gets the
                Firebase ID token and sends it
                to the backend.
            */

            const data =
                await apiFetch(
                    "/api/activities",
                    {

                        method: "POST",

                        body: JSON.stringify({

                            activity_type:
                                type,

                            amount:
                                value,

                            unit:
                                selectedUnit,

                            emission:
                                emission

                        })

                    }
                );


            result.innerHTML = `

                <strong>
                    Activity Saved!
                </strong>

                <br><br>

                Estimated Carbon Footprint:

                <strong>
                    ${emission.toFixed(2)} kg CO₂
                </strong>

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

            console.log(
                "Save error:",
                error
            );


            result.innerText =
                "Could not save activity: " +
                error.message;

        }

    }
);
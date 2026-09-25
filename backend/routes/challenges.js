const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);

// ==========================================
// GET STANDARD CHALLENGES
// ==========================================
router.get("/", (req, res) => {
    const challenges = [
        {
            id: "low-carbon-commute",
            title: "Low Carbon Commute",
            description: "Log at least 3 transport activities with reduced emissions (public transit, walking, or cycling).",
            target: 3,
            category: "transport"
        },
        {
            id: "energy-saver",
            title: "Energy Efficiency",
            description: "Log home electricity usage under 5 kWh or record an energy-saving action.",
            target: 2,
            category: "electricity"
        },
        {
            id: "plant-based-day",
            title: "Plant-Powered Plate",
            description: "Log 3 plant-based or low-carbon meals in a single week.",
            target: 3,
            category: "food"
        },
        {
            id: "mindful-shopping",
            title: "Conscious Consumer",
            description: "Log sustainable purchases or second-hand items.",
            target: 2,
            category: "shopping"
        },
        {
            id: "consistent-tracker",
            title: "Consistent Accounting",
            description: "Log 5 total carbon activities across any categories.",
            target: 5,
            category: "all"
        }
    ];

    res.json(challenges);
});

module.exports = router;

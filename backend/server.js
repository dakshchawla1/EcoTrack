const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./database");

const activitiesRoute = require("./routes/activities");

const app = express();

app.use(cors());
app.use(express.json());


// Home route
app.get("/", (req, res) => {
    res.send("EcoTrack Backend is Running 🌱");
});


// Test database
app.get("/test-db", async (req, res) => {

    try {

        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connected successfully!",
            time: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Database connection failed"
        });

    }

});


// Activities route
app.use("/api/activities", activitiesRoute);


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`EcoTrack server running on port ${PORT}`);
});
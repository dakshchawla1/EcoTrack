const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./database");

const activitiesRoute = require("./routes/activities");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("EcoTrack Backend is Running 🌱");
});

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

app.use("/api/activities", activitiesRoute);

module.exports = app;

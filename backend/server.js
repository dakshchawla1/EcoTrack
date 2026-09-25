const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = require("./database");

const activitiesRoute = require("./routes/activities");
const usersRoute = require("./routes/users");
const challengesRoute = require("./routes/challenges");

const app = express();

app.use(cors());
app.use(express.json());

// Root status check
app.get("/", (req, res) => {
    res.send("EcoTrack Backend is Running");
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            status: "healthy",
            uptime: process.uptime(),
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(503).json({
            status: "degraded",
            message: "Database unreachable",
            error: error.message
        });
    }
});

// Database connection verification test
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            message: "Database connected successfully!",
            time: result.rows[0]
        });
    } catch (error) {
        console.error("Database connection test error:", error);
        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// API Routes
app.use("/api/activities", activitiesRoute);
app.use("/api/users", usersRoute);
app.use("/api/challenges", challengesRoute);

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Central error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});

module.exports = app;

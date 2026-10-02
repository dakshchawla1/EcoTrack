const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = require("./database");

const activitiesRoute = require("./routes/activities");
const usersRoute = require("./routes/users");
const challengesRoute = require("./routes/challenges");
const aiRoute = require("./routes/ai");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static assets and pages
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// API Root Status
app.get("/api", (req, res) => {
    res.json({ message: "EcoTrack API is running" });
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

// API Routes (mounted on both /api/... and direct paths for Vercel and local proxy support)
app.use("/api/activities", activitiesRoute);
app.use("/activities", activitiesRoute);

app.use("/api/users", usersRoute);
app.use("/users", usersRoute);

app.use("/api/challenges", challengesRoute);
app.use("/challenges", challengesRoute);

app.use("/api/ai", aiRoute);
app.use("/ai", aiRoute);

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

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`EcoTrack server running on port ${PORT}`);
    });
}

module.exports = app;

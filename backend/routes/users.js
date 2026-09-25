const express = require("express");
const router = express.Router();

const pool = require("../database");
const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);

// ==========================================
// GET CURRENT USER PROFILE
// ==========================================
router.get("/me", async (req, res) => {
    try {
        const firebase_uid = req.user.uid;

        const result = await pool.query(
            `SELECT id, firebase_uid, name, email, photo_url, created_at
             FROM users
             WHERE firebase_uid = $1`,
            [firebase_uid]
        );

        if (result.rows.length === 0) {
            // Return token info if not yet synced to DB
            return res.json({
                firebase_uid,
                name: req.user.name || null,
                email: req.user.email || null,
                photo_url: req.user.picture || null,
                synced: false
            });
        }

        res.json({
            ...result.rows[0],
            synced: true
        });

    } catch (error) {
        console.error("GET USER ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch user profile"
        });
    }
});

// ==========================================
// SYNC USER DATA
// ==========================================
router.post("/sync", async (req, res) => {
    try {
        const firebase_uid = req.user.uid;
        const name = req.body.name || req.user.name || "EcoTrack User";
        const email = req.body.email || req.user.email || "";
        const photo_url = req.body.photo_url || req.user.picture || null;

        const result = await pool.query(
            `INSERT INTO users (firebase_uid, name, email, photo_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (firebase_uid)
             DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                photo_url = EXCLUDED.photo_url
             RETURNING *`,
            [firebase_uid, name, email, photo_url]
        );

        res.json({
            message: "User synced successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("SYNC USER ERROR:", error);
        res.status(500).json({
            message: "Failed to sync user data"
        });
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();

const pool = require("../database");
const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);


// ==========================================
// ADD ACTIVITY
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            activity_type,
            amount,
            unit,
            emission
        } = req.body;

        const firebase_uid = req.user.uid;

        if (
            !activity_type ||
            amount === undefined ||
            !unit ||
            emission === undefined
        ) {
            return res.status(400).json({
                message: "All activity fields are required"
            });
        }

        const numericAmount = Number(amount);
        const numericEmission = Number(emission);

        if (
            !Number.isFinite(numericAmount) ||
            !Number.isFinite(numericEmission) ||
            numericAmount < 0 ||
            numericEmission < 0
        ) {
            return res.status(400).json({
                message: "Invalid amount or emission"
            });
        }

        const result = await pool.query(
            `INSERT INTO activities
            (
                firebase_uid,
                activity_type,
                amount,
                unit,
                emission
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                firebase_uid,
                activity_type,
                numericAmount,
                unit,
                numericEmission
            ]
        );

        res.status(201).json({
            message: "Activity saved successfully!",
            activity: result.rows[0]
        });

    } catch (error) {

        console.log("DATABASE ERROR:", error);

        res.status(500).json({
            message: "Failed to save activity"
        });
    }
});


// ==========================================
// GET USER ACTIVITIES
// ==========================================

router.get("/", async (req, res) => {

    try {

        const firebase_uid = req.user.uid;

        const result = await pool.query(
            `SELECT *
             FROM activities
             WHERE firebase_uid = $1
             ORDER BY created_at DESC`,
            [firebase_uid]
        );

        res.json(result.rows);

    } catch (error) {

        console.log("DATABASE ERROR:", error);

        res.status(500).json({
            message: "Failed to get activities"
        });
    }
});


// ==========================================
// UPDATE ACTIVITY
// ==========================================

router.put("/:id", async (req, res) => {

    try {

        const activityId = Number(req.params.id);

        const {
            activity_type,
            amount,
            unit,
            emission
        } = req.body;

        const firebase_uid = req.user.uid;

        if (!Number.isInteger(activityId)) {

            return res.status(400).json({
                message: "Invalid activity ID"
            });

        }

        if (
            !activity_type ||
            amount === undefined ||
            !unit ||
            emission === undefined
        ) {

            return res.status(400).json({
                message: "All activity fields are required"
            });

        }

        const numericAmount = Number(amount);
        const numericEmission = Number(emission);

        if (
            !Number.isFinite(numericAmount) ||
            !Number.isFinite(numericEmission) ||
            numericAmount < 0 ||
            numericEmission < 0
        ) {

            return res.status(400).json({
                message: "Invalid amount or emission"
            });

        }

        const result = await pool.query(
            `UPDATE activities
             SET
                activity_type = $1,
                amount = $2,
                unit = $3,
                emission = $4
             WHERE
                id = $5
                AND firebase_uid = $6
             RETURNING *`,
            [
                activity_type,
                numericAmount,
                unit,
                numericEmission,
                activityId,
                firebase_uid
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Activity not found"
            });

        }

        res.json({
            message: "Activity updated successfully!",
            activity: result.rows[0]
        });

    } catch (error) {

        console.log("DATABASE ERROR:", error);

        res.status(500).json({
            message: "Failed to update activity"
        });
    }
});


// ==========================================
// DELETE ACTIVITY
// ==========================================

router.delete("/:id", async (req, res) => {

    try {

        const activityId = Number(req.params.id);

        const firebase_uid = req.user.uid;

        if (!Number.isInteger(activityId)) {

            return res.status(400).json({
                message: "Invalid activity ID"
            });

        }

        const result = await pool.query(
            `DELETE FROM activities
             WHERE
                id = $1
                AND firebase_uid = $2
             RETURNING *`,
            [
                activityId,
                firebase_uid
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Activity not found"
            });

        }

        res.json({
            message: "Activity deleted successfully!"
        });

    } catch (error) {

        console.log("DATABASE ERROR:", error);

        res.status(500).json({
            message: "Failed to delete activity"
        });
    }
});


module.exports = router;
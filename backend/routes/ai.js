const express = require("express");
const router = express.Router();
const pool = require("../database");
const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);

// ============================================================================
// VERIFIED ECOTRACK EMISSION FACTORS (kg CO2e per unit)
// ============================================================================
const EMISSION_FACTORS = {
    transport: {
        car: 0.192,         // Petrol Car per km
        bike: 0.103,        // Motorcycle per km
        bus: 0.089,         // City Bus per km
        metro: 0.041,       // Metro / Subway per km
        train: 0.041,       // Rail / Train per km
        bicycle: 0.0,       // Zero emission
        walk: 0.0           // Zero emission
    },
    electricity: {
        grid: 0.82,         // Standard Grid electricity per kWh
        efficient: 0.45,    // Energy Star / Efficient per kWh
        solar: 0.05         // Rooftop Solar / Renewable per kWh
    },
    food: {
        nonvegetarian: 3.50, // Meat-heavy meal
        vegetarian: 1.50,    // Plant-forward / Vegetarian meal
        vegan: 0.80          // Fully vegan / plant-based meal
    },
    shopping: {
        electronics: 10.0,  // New electronics per item
        refurbished: 2.5,   // Refurbished electronics per item
        clothing: 5.0,      // Fast-fashion garment per item
        thrift: 1.0,        // Second-hand / thrift clothing
        other: 2.0          // General purchase
    }
};

// ============================================================================
// AI API CALLER (Supports Gemini & Fallback)
// ============================================================================
async function callGeminiStructured(systemInstruction, userPrompt) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `${systemInstruction}\n\nStrict JSON requirement:\nYou MUST return a single raw JSON object matching the requested schema. Do not wrap in markdown codeblocks.\n\nData:\n${userPrompt}`
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 300,
            thinkingConfig: {
                thinkingBudget: 0
            }
        }
    };

    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(4000)
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(`Gemini API (${model}) returned status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
            throw new Error(`Empty candidate response from Gemini API (${model})`);
        }

        // Parse JSON safely
        const cleanJson = candidateText.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
        return JSON.parse(cleanJson);
    } catch (err) {
        console.warn(`Gemini API fast-bypass (${model}):`, err.message);
        return null; // Gracefully fall back to deterministic statistical engine immediately
    }
}

// ============================================================================
// FEATURE 1: GET /api/ai/recommendation (Dashboard)
// ============================================================================
router.get("/recommendation", async (req, res) => {
    try {
        const firebase_uid = req.user.uid;

        // Fetch user activities
        const result = await pool.query(
            `SELECT activity_type, amount, unit, emission, created_at
             FROM activities
             WHERE firebase_uid = $1
             ORDER BY created_at DESC`,
            [firebase_uid]
        );

        const activities = result.rows;

        // If no data, return clear friendly guidance
        if (!activities || activities.length === 0) {
            return res.json({
                status: "no_data",
                title: "Build Your Carbon Baseline",
                analysis: "Add more activities to receive a personalized EcoAI recommendation.",
                recommendation: "Log your daily transport, home electricity, or meals to get tailored reduction tips.",
                estimated_saving: 0
            });
        }

        // 1. Calculate deterministic statistics
        const totalEmission = activities.reduce((sum, a) => sum + Number(a.emission || 0), 0);
        const categoryMap = { transport: 0, electricity: 0, food: 0, shopping: 0 };
        const categoryCounts = { transport: 0, electricity: 0, food: 0, shopping: 0 };

        activities.forEach(a => {
            const cat = (a.activity_type || "").toLowerCase();
            if (categoryMap[cat] !== undefined) {
                categoryMap[cat] += Number(a.emission || 0);
                categoryCounts[cat] += 1;
            }
        });

        // Identify highest category
        let highestCategory = "transport";
        let highestEmission = -1;
        for (const [cat, val] of Object.entries(categoryMap)) {
            if (val > highestEmission) {
                highestEmission = val;
                highestCategory = cat;
            }
        }

        const highestShare = totalEmission > 0 ? ((highestEmission / totalEmission) * 100).toFixed(0) : 0;
        const recentActivities = activities.slice(0, 5).map(a => `${a.activity_type}: ${a.amount} ${a.unit} (${Number(a.emission).toFixed(2)} kg CO2)`);

        // Potential saving estimate: 15-20% reduction of top category
        const potentialSaving = Math.max(1.5, Number((highestEmission * 0.2).toFixed(1)));

        // Deterministic recommendation fallback
        const fallbackRecommendations = {
            transport: {
                title: "Optimize Weekly Commuting",
                analysis: `Transport is currently your largest source of emissions, accounting for ${highestShare}% (${highestEmission.toFixed(1)} kg CO₂) of your total footprint.`,
                recommendation: "Consider replacing 2 short solo car or motorbike trips this week with public transit, cycling, or walking.",
                estimated_saving: potentialSaving
            },
            electricity: {
                title: "Reduce Baseload Electricity",
                analysis: `Home electricity is your primary footprint contributor at ${highestShare}% (${highestEmission.toFixed(1)} kg CO₂).`,
                recommendation: "Shift high-power appliances to off-peak hours and adjust thermostat settings by 1-2 degrees.",
                estimated_saving: potentialSaving
            },
            food: {
                title: "Incorporate Plant-Powered Meals",
                analysis: `Dietary choices generate ${highestShare}% (${highestEmission.toFixed(1)} kg CO₂) of your recorded footprint.`,
                recommendation: "Try swapping 2 meat-based meals this week for plant-based or vegetarian alternatives.",
                estimated_saving: potentialSaving
            },
            shopping: {
                title: "Practice Mindful Purchasing",
                analysis: `Consumer purchases represent ${highestShare}% (${highestEmission.toFixed(1)} kg CO₂) of your footprint.`,
                recommendation: "Prioritize second-hand or certified durable goods and repair electronics before replacing.",
                estimated_saving: potentialSaving
            }
        };

        const defaultResult = fallbackRecommendations[highestCategory] || fallbackRecommendations.transport;

        // Try AI generation
        try {
            const systemPrompt = `You are EcoAI, a practical environmental analyst for the EcoTrack platform.
Your task is to analyze real carbon tracking data and produce ONE concise, personalized recommendation.
Keep the tone human, pragmatic, respectful, and direct. Avoid marketing hype, buzzwords, emojis, or exaggerated claims.
Return a single JSON object with these keys:
- title: Short 3-5 word headline (e.g., "Focus on transport")
- analysis: 1-2 sentences stating the user's primary driver with real numbers
- recommendation: 1-2 concrete, realistic behavioral changes the user can make
- estimated_saving: A realistic number representing potential kg CO2 reduction`;

            const userPrompt = JSON.stringify({
                total_emissions_kg: Number(totalEmission.toFixed(2)),
                highest_emission_category: highestCategory,
                highest_category_emissions_kg: Number(highestEmission.toFixed(2)),
                highest_category_share_percent: Number(highestShare),
                category_breakdown_kg: categoryMap,
                recent_activities: recentActivities
            });

            const aiResult = await callGeminiStructured(systemPrompt, userPrompt);
            if (aiResult && aiResult.title && aiResult.recommendation) {
                return res.json({
                    status: "success",
                    title: aiResult.title,
                    analysis: aiResult.analysis || defaultResult.analysis,
                    recommendation: aiResult.recommendation,
                    estimated_saving: Number(aiResult.estimated_saving || potentialSaving),
                    source: "ecoai"
                });
            }
        } catch (aiErr) {
            console.warn("EcoAI recommendation notice (using statistical baseline):", aiErr.message);
        }

        // Return statistical result if AI service was unavailable
        return res.json({
            status: "success",
            ...defaultResult,
            source: "statistical"
        });

    } catch (error) {
        console.error("GET /api/ai/recommendation error:", error);
        res.status(500).json({
            status: "error",
            message: "EcoAI is temporarily unavailable. Your EcoTrack data is still available."
        });
    }
});

// ============================================================================
// FEATURE 2: POST /api/ai/simulate (What-If Carbon Simulator)
// ============================================================================
router.post("/simulate", async (req, res) => {
    try {
        const {
            category = "transport",
            currentChoice = "car",
            alternativeChoice = "metro",
            amount = 20,
            frequency = 5
        } = req.body;

        const numAmount = Math.max(0.1, Number(amount) || 1);
        const numFrequency = Math.max(1, Number(frequency) || 1);

        const categoryFactors = EMISSION_FACTORS[category] || EMISSION_FACTORS.transport;
        const currentFactor = categoryFactors[currentChoice] !== undefined
            ? categoryFactors[currentChoice]
            : (categoryFactors.car || 0.192);

        const altFactor = categoryFactors[alternativeChoice] !== undefined
            ? categoryFactors[alternativeChoice]
            : (categoryFactors.metro || 0.041);

        // Strict numerical calculations (application-side, never hallucinated by AI)
        const currentEmissions = Number((numAmount * currentFactor * numFrequency).toFixed(2));
        const alternativeEmissions = Number((numAmount * altFactor * numFrequency).toFixed(2));
        const potentialSaving = Number(Math.max(0, currentEmissions - alternativeEmissions).toFixed(2));
        const percentageSaved = currentEmissions > 0
            ? Number(((potentialSaving / currentEmissions) * 100).toFixed(1))
            : 0;

        let unitLabel = "km";
        if (category === "electricity") unitLabel = "kWh";
        else if (category === "food") unitLabel = "meals";
        else if (category === "shopping") unitLabel = "items";

        // Deterministic default explanation
        let defaultExplanation = `Switching ${numFrequency} ${category} action(s) from ${currentChoice} to ${alternativeChoice} avoids approximately ${potentialSaving} kg CO₂ (${percentageSaved}% reduction).`;

        // Try AI explanation enhancement
        try {
            const systemPrompt = `You are EcoAI for EcoTrack.
A user ran a What-If Carbon Simulation with the exact verified calculations provided.
Your job is to provide 2 short, grounded sentences explaining the impact of this specific saving.
Highlight the practical significance (e.g. relation to tree absorption or everyday household equivalents).
Do NOT change the numbers. Return JSON with key: "explanation".`;

            const promptData = JSON.stringify({
                category,
                current_choice: currentChoice,
                alternative_choice: alternativeChoice,
                quantity_per_instance: `${numAmount} ${unitLabel}`,
                frequency_instances: numFrequency,
                current_emissions_kg: currentEmissions,
                alternative_emissions_kg: alternativeEmissions,
                potential_saving_kg: potentialSaving,
                percentage_saved: `${percentageSaved}%`
            });

            const aiResult = await callGeminiStructured(systemPrompt, promptData);
            if (aiResult && aiResult.explanation) {
                defaultExplanation = aiResult.explanation;
            }
        } catch (aiErr) {
            console.warn("EcoAI simulation explanation notice:", aiErr.message);
        }

        return res.json({
            status: "success",
            category,
            currentChoice,
            alternativeChoice,
            amount: numAmount,
            frequency: numFrequency,
            unit: unitLabel,
            currentEmissions,
            alternativeEmissions,
            potentialSaving,
            percentageSaved,
            explanation: defaultExplanation
        });

    } catch (error) {
        console.error("POST /api/ai/simulate error:", error);
        res.status(500).json({
            status: "error",
            message: "Simulator is temporarily unavailable."
        });
    }
});

// ============================================================================
// FEATURE 3: GET /api/ai/insights (Insights Page)
// ============================================================================
router.get("/insights", async (req, res) => {
    try {
        const firebase_uid = req.user.uid;

        const result = await pool.query(
            `SELECT activity_type, amount, unit, emission, created_at
             FROM activities
             WHERE firebase_uid = $1
             ORDER BY created_at DESC`,
            [firebase_uid]
        );

        const activities = result.rows;

        if (!activities || activities.length === 0) {
            return res.json({
                status: "no_data",
                headline: "Awaiting Your First Records",
                trend_analysis: "Add some activities first to receive personalized EcoAI insights.",
                primary_driver: "No baseline emissions recorded yet.",
                suggested_action: "Start tracking daily transit or home electricity to identify your largest reduction opportunities.",
                weekly_comparison: "Baseline will generate after your first week of entries."
            });
        }

        // 1. Calculate historical metrics
        const totalEmissions = activities.reduce((sum, a) => sum + Number(a.emission || 0), 0);
        const categoryMap = { transport: 0, electricity: 0, food: 0, shopping: 0 };
        activities.forEach(a => {
            const cat = (a.activity_type || "").toLowerCase();
            if (categoryMap[cat] !== undefined) categoryMap[cat] += Number(a.emission || 0);
        });

        // Compare last 7 days vs previous period
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        let recentWeekEmissions = 0;
        let prevWeekEmissions = 0;

        activities.forEach(a => {
            const date = new Date(a.created_at);
            const val = Number(a.emission || 0);
            if (date >= sevenDaysAgo) {
                recentWeekEmissions += val;
            } else if (date >= fourteenDaysAgo) {
                prevWeekEmissions += val;
            }
        });

        let trendDirection = "stable";
        let trendPercent = 0;
        if (prevWeekEmissions > 0) {
            const diff = recentWeekEmissions - prevWeekEmissions;
            trendPercent = Math.abs(Number(((diff / prevWeekEmissions) * 100).toFixed(1)));
            trendDirection = diff < 0 ? "decreased" : (diff > 0 ? "increased" : "stable");
        }

        // Top category
        let topCat = "transport";
        let topVal = -1;
        for (const [c, v] of Object.entries(categoryMap)) {
            if (v > topVal) {
                topVal = v;
                topCat = c;
            }
        }
        const topPercent = totalEmissions > 0 ? ((topVal / totalEmissions) * 100).toFixed(0) : 0;

        // Deterministic baseline insights
        const defaultInsights = {
            headline: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} accounts for ${topPercent}% of your footprint`,
            trend_analysis: trendDirection === "decreased"
                ? `Your emissions decreased by ${trendPercent}% over the past week compared to the prior period.`
                : (trendDirection === "increased"
                    ? `Your emissions increased by ${trendPercent}% this week, primarily driven by ${topCat}.`
                    : "Your emissions have remained steady across recent logging cycles."),
            primary_driver: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} generated ${topVal.toFixed(1)} kg CO₂ out of ${totalEmissions.toFixed(1)} kg CO₂ recorded.`,
            suggested_action: topCat === "transport"
                ? "Try replacing a few short car trips with public transit, walking, or cycling."
                : (topCat === "electricity"
                    ? "Audit household heating/cooling and shift heavy appliances to daylight hours."
                    : (topCat === "food"
                        ? "Designate two weekdays as plant-forward days to lower dietary emissions."
                        : "Plan purchases in batches and buy second-hand or certified durable products.")),
            weekly_comparison: `${recentWeekEmissions.toFixed(1)} kg CO₂ logged in the past 7 days.`
        };

        // Try AI generation
        try {
            const systemPrompt = `You are EcoAI for EcoTrack. Analyze the user's carbon footprint metrics and output a clear, structured JSON assessment.
Keep it human, encouraging, analytical, and concise. Avoid exclamation marks, fluff, and emojis.
Return a JSON object with:
- headline: 4-7 word summary statement
- trend_analysis: 1-2 sentences interpreting recent progress
- primary_driver: 1-2 sentences on their biggest emission source with real numbers
- suggested_action: 1 actionable, realistic habit change
- weekly_comparison: 1 brief sentence summarizing weekly context`;

            const promptData = JSON.stringify({
                total_emissions_kg: Number(totalEmissions.toFixed(2)),
                category_breakdown_kg: categoryMap,
                primary_category: topCat,
                primary_category_share: `${topPercent}%`,
                recent_7_days_kg: Number(recentWeekEmissions.toFixed(2)),
                prior_7_days_kg: Number(prevWeekEmissions.toFixed(2)),
                trend_direction: trendDirection,
                trend_change_percent: `${trendPercent}%`,
                total_activities_count: activities.length
            });

            const aiResult = await callGeminiStructured(systemPrompt, promptData);
            if (aiResult && aiResult.headline && aiResult.suggested_action) {
                return res.json({
                    status: "success",
                    headline: aiResult.headline,
                    trend_analysis: aiResult.trend_analysis || defaultInsights.trend_analysis,
                    primary_driver: aiResult.primary_driver || defaultInsights.primary_driver,
                    suggested_action: aiResult.suggested_action,
                    weekly_comparison: aiResult.weekly_comparison || defaultInsights.weekly_comparison,
                    source: "ecoai"
                });
            }
        } catch (aiErr) {
            console.warn("EcoAI insights notice (using baseline stats):", aiErr.message);
        }

        return res.json({
            status: "success",
            ...defaultInsights,
            source: "statistical"
        });

    } catch (error) {
        console.error("GET /api/ai/insights error:", error);
        res.status(500).json({
            status: "error",
            message: "EcoAI is temporarily unavailable. Your EcoTrack data is still available."
        });
    }
});

module.exports = router;

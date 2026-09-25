const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL;

const poolConfig = {
    connectionString: connectionString
};

// Enable SSL when connecting to hosted PostgreSQL databases (Neon, Supabase, Render, etc.)
if (connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1")) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

module.exports = pool;
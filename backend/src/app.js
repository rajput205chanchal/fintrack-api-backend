const express = require("express");
const cookieParser = require("cookie-parser")

const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

app.use(express.json())
app.use(cookieParser())


// routes required

const authRouter = require("./routes/authroutes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");


// use routes

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;
    res.status(status).json({ message });
});

module.exports = app

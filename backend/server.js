require("dotenv").config()
const app = require("./src/app");
const connectTODB = require("./src/config/db");
const cookieParser = require("cookie-parser");
app.use(cookieParser());
// const authMiddleware = require("./src/middlewares/auth.middleware");
connectTODB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

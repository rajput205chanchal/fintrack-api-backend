const mongoose = require("mongoose");

function connectTODB() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("server is connected to db");
    })
    .catch((err) => {
      console.log("Error connecting to db", err);
      process.exit(1);
    });
}

module.exports = connectTODB;

import dotenv from "dotenv"; // NOTE TO SELF: testing updated modern approach change back to require(...) etc if crash
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import appRoutes from "./routes/appRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// templates + static files (css)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));
app.use(express.static(path.join(__dirname, "public")));

// form parsing
app.use(express.urlencoded({ extended: true })); // NOTE TO SELF: testing modern approach vs body-parser change if crash

// routes
app.use("/", appRoutes);

// start
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_CONNECTION_STRING)
  .then(() => {
    app.listen(PORT, () => console.log(`Web server started and running at http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Mongo connect failed:", e.message);
    process.exit(1);
  });

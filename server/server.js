import dotenv from "dotenv";

import connectDB from "./config/db.js";
import { createApp } from "./app.js";

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 5000;

// Connect to the database, then start listening.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

import express from 'express';
import dotenv from 'dotenv';

import { connectDB } from "./lib/db.js";


dotenv.config(); // to access the .env file

const PORT = process.env.PORT; // to access the port from the .env file

const app = express();

app.listen(PORT, () => {
    console.log('Server is running on http://localhost:' + PORT);
    connectDB();
});


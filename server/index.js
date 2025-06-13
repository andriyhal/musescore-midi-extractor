import express from "express";
import dotenv from "dotenv";
import amqp from "amqplib";

import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL;

app.use(express.json());

app.use("/api", apiRoutes);

try {
    await amqp.connect(RABBITMQ_URL);
    console.log("Connecting to RabbitMQ successful!");
} catch (err) {
    console.error("Connected to RabbitMQ error:", err);
}
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

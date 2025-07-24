import express from "express";
import dotenv from "dotenv";
import amqp from "amqplib";

import apiRoutes from "./routes/index.js";
import { snowflakeClient } from "./services/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL;

app.use(express.json());

app.use("/api", apiRoutes);

try {
    await amqp.connect(RABBITMQ_URL);
    await snowflakeClient.init();
    console.log(
        "Connecting to RabbitMQ successful! \n ----------------------------------"
    );
} catch (err) {
    console.error("Connected to services error:", err);
}
app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Server running on http://localhost:${PORT} \n ----------------------------------`
    );
});

import amqp from "amqplib";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

import fs from "fs";
import path from "path";
const DATA_DIR = path.resolve("./data");
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;

const consume = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();

    await ch.assertQueue(QUEUE, { durable: true });

    ch.consume(QUEUE, async (msg) => {
        if (msg !== null) {
            const url = msg.content.toString();
            console.log("Consumed:", url);

            try {
                const { data: html } = await axios.get(url);

                const $ = cheerio.load(html);

                const jsStoreDiv = $("div.js-store");

                if (jsStoreDiv.length === 0) {
                    console.warn("div.js-store не знайдений на сторінці:", url);
                    ch.nack(msg);
                }
                const dataContent = jsStoreDiv.attr("data-content");

                if (dataContent) {
                    const decodedContent = dataContent.replace(/&quot;/g, '"');
                    let jsonContent;
                    try {
                        jsonContent = JSON.parse(decodedContent);
                        const safeUrlPart = url
                            .replace(/[^a-z0-9]/gi, "_")
                            .toLowerCase()
                            .slice(0, 50);
                        const filename = `data_${Date.now()}_${safeUrlPart}.json`;
                        const filepath = path.join(DATA_DIR, filename);
                        fs.writeFileSync(
                            filepath,
                            JSON.stringify(jsonContent, null, 2),
                            "utf-8"
                        );
                        console.log(`Збережено JSON у файл: ${filepath}`);
                    } catch (jsonErr) {
                        console.error(
                            "Помилка парсингу JSON з data-content:",
                            jsonErr
                        );
                    }
                } else {
                    console.warn(
                        "Атрибут data-content не знайдений у div.js-store"
                    );
                }

                ch.ack(msg);
            } catch (err) {
                console.error("Помилка при обробці URL:", url, err);
                // Можна зробити nack або залишити повідомлення в черзі для повтору
                ch.nack(msg);
            }
        }
    });
};

consume().catch(console.error);

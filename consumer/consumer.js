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
            const scoreUrl = msg.content.toString();
            console.log(`Current url${scoreUrl}`);

            try {
                const { data: html } = await axios.get(scoreUrl);

                const $ = cheerio.load(html);

                const jsStoreDiv = $("div.js-store");

                if (jsStoreDiv.length === 0) {
                    console.warn(
                        `div.js-store was not found on the page: ${scoreUrl}`
                    );
                    ch.nack(msg, false, true);
                }
                const dataContent = jsStoreDiv.attr("data-content");

                if (dataContent) {
                    const decodedContent = dataContent.replace(/&quot;/g, '"');
                    try {
                        const scoreInformationDetails =
                            JSON.parse(decodedContent);

                        console.log({
                            id: scoreInformationDetails.store.score.id,
                            title: scoreInformationDetails.store.score.title,
                            musescoreUrl:
                                scoreInformationDetails.store.score.url,
                            publisher:
                                scoreInformationDetails.store.score.user.name,
                            composer:
                                scoreInformationDetails.store.page.data.score
                                    .composer_name,
                            date_created:
                                scoreInformationDetails.store.page.data.score
                                    .date_created,
                            date_updated:
                                scoreInformationDetails.store.page.data.score
                                    .date_created,
                            pages: scoreInformationDetails.store.page.data.score
                                .pages_count,
                            duration:
                                scoreInformationDetails.store.page.data.score
                                    .duration,
                            info: scoreInformationDetails.store.page.data.score
                                .body,
                            measures:
                                scoreInformationDetails.store.page.data.score
                                    .measures,
                            keysig: scoreInformationDetails.store.page.data
                                .score.keysig,
                            difficultyLevel:
                                scoreInformationDetails.store.page.data.score
                                    .complexity,
                            genres: scoreInformationDetails.store.page.data.genres.map(
                                (e) => e.name
                            ),
                            instrumentations:
                                scoreInformationDetails.store.page.data.score.instrumentations.map(
                                    (e) => e.name
                                ),
                            instruments:
                                scoreInformationDetails.store.page.data.score.instruments.map(
                                    (e) => e.name
                                ),
                            categoryPages:
                                scoreInformationDetails.store.page.data.score.category_pages.map(
                                    (e) => e.name
                                ),
                        });

                        const safeUrlPart = scoreUrl
                            .replace(/[^a-z0-9]/gi, "_")
                            .toLowerCase()
                            .slice(0, 50);
                        const filename = `data_${Date.now()}_${safeUrlPart}.json`;
                        const filepath = path.join(DATA_DIR, filename);
                        fs.writeFileSync(
                            filepath,
                            JSON.stringify(
                                {
                                    id: scoreInformationDetails.store.score.id,
                                    title: scoreInformationDetails.store.score
                                        .title,
                                    musescoreUrl:
                                        scoreInformationDetails.store.score.url,
                                    publisher:
                                        scoreInformationDetails.store.score.user
                                            .name,
                                    composer:
                                        scoreInformationDetails.store.page.data
                                            .score.composer_name,
                                    date_created:
                                        scoreInformationDetails.store.page.data
                                            .score.date_created,
                                    date_updated:
                                        scoreInformationDetails.store.page.data
                                            .score.date_created,
                                    pages: scoreInformationDetails.store.page
                                        .data.score.pages_count,
                                    duration:
                                        scoreInformationDetails.store.page.data
                                            .score.duration,
                                    info: scoreInformationDetails.store.page
                                        .data.score.body,
                                    measures:
                                        scoreInformationDetails.store.page.data
                                            .score.measures,
                                    keysig: scoreInformationDetails.store.page
                                        .data.score.keysig,
                                    difficultyLevel:
                                        scoreInformationDetails.store.page.data
                                            .score.complexity,
                                    genres: scoreInformationDetails.store.page.data.genres.map(
                                        (e) => e.name
                                    ),
                                    instrumentations:
                                        scoreInformationDetails.store.page.data.score.instrumentations.map(
                                            (e) => e.name
                                        ),
                                    instruments:
                                        scoreInformationDetails.store.page.data.score.instruments.map(
                                            (e) => e.name
                                        ),
                                    categoryPages:
                                        scoreInformationDetails.store.page.data.score.category_pages.map(
                                            (e) => e.name
                                        ),
                                },
                                null,
                                2
                            ),
                            "utf-8"
                        );
                        console.log(`Saved JSON in file: ${filepath}`);
                    } catch (jsonErr) {
                        console.error(
                            "Error parsing JSON from data-content:",
                            jsonErr
                        );
                    }
                } else {
                    console.warn(
                        "Attribute data-content was not found in div.js-store"
                    );
                }

                ch.ack(msg);
            } catch (err) {
                console.error("Error processing URL:", url, err);
                ch.nack(msg, false, true);
            }
        }
    });
};

consume().catch(console.error);

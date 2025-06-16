import amqp from "amqplib";
import dotenv from "dotenv";
import axios from "axios";
import { decode } from "entities";
import * as cheerio from "cheerio";
import JSON5 from "json5";

import { delayer } from "../server/utils/index.js";
import { updateScore } from "../server/services/prismaScoreDb.js";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;

const parsingDataFromPage = async (scoreUrl) => {
    try {
        const { data: html } = await axios.get(scoreUrl);

        const $ = cheerio.load(html);

        const jsStoreDiv = $("div.js-store");

        if (jsStoreDiv.length === 0) {
            console.warn(`div.js-store was not found on the page: ${scoreUrl}`);
            throw new Error(
                `div.js-store was not found on the page: ${scoreUrl}`
            );
        }
        const dataContent = jsStoreDiv.attr("data-content");

        if (dataContent) {
            try {
                const decoded = decode(dataContent);

                const firstBrace = decoded.indexOf("{");
                const lastBrace = decoded.lastIndexOf("}");
                const jsonPart = decoded.slice(firstBrace, lastBrace + 1);

                const scoreInformationDetails = JSON5.parse(jsonPart);

                return {
                    id: scoreInformationDetails.store.score.id,
                    title: scoreInformationDetails.store.score.title,
                    url: scoreInformationDetails.store.score.url,
                    publisher: scoreInformationDetails.store.score.user.name,
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
                        scoreInformationDetails.store.page.data.score.duration,
                    info: scoreInformationDetails.store.page.data.score.body,
                    measures:
                        scoreInformationDetails.store.page.data.score.measures,
                    keysig: scoreInformationDetails.store.page.data.score
                        .keysig,
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
                    scoresJson: scoreInformationDetails,
                };
            } catch (jsonErr) {
                console.error("Error parsing JSON from data-content:", jsonErr);
                throw new Error(
                    "Error parsing JSON from data-content:",
                    jsonErr
                );
            }
        } else {
            console.warn(
                "Attribute data-content was not found in div.js-store"
            );
        }
    } catch (err) {
        console.error("Error processing URL:", scoreUrl, err);

        throw new Error("Error processing URL:", scoreUrl, err);
    }
};

const consume = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();

    await ch.assertQueue(QUEUE, { durable: true });
    await ch.prefetch(1);

    ch.consume(QUEUE, async (msg) => {
        if (msg !== null) {
            const scoreUrl = msg.content.toString();
            console.log(`Current url: ${scoreUrl}`);
            try {
                const scoreDat = await parsingDataFromPage(scoreUrl);
                console.log(scoreDat);

                await updateScore(scoreDat);
                await delayer(50000);
                ch.ack(msg);
            } catch (err) {
                console.error(`Consumer Error:${err}`);
                await delayer(5000);
                ch.reject(msg, false);
            }
        }
    });
};

consume().catch(console.error);

// (async () => {
//     await parsingDataFromPage("https://musescore.com/user/3/scores/410");
// })();

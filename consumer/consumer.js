import amqp from "amqplib";
import dotenv from "dotenv";
import { decode } from "entities";
import * as cheerio from "cheerio";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parseDirty = require("dirty-json").parse;

import { delayer, proxyGetRequest } from "../server/utils/index.js";
import { updateScore } from "../server/services/prismaScoreDb.js";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;

const parsingDataFromPage = async (scoreUrl) => {
    try {
        const { data: html } = await proxyGetRequest(scoreUrl);

        const $ = cheerio.load(html);
        const jsStoreDiv = $("div.js-store");

        if (jsStoreDiv.length === 0) {
            console.warn(`div.js-store was not found on the page: ${scoreUrl}`);
            throw new Error(
                `div.js-store was not found on the page: ${scoreUrl}`
            );
        }

        const dataContent = jsStoreDiv.attr("data-content");

        if (!dataContent) {
            console.warn(
                `Attribute data-content was not found in div.js-store`
            );
            throw new Error(`Attribute data-content was not found`);
        }

        const decoded = decode(dataContent);

        const jsonPart = parseDirty(decoded);

        const details = jsonPart;
        console.log(`Url: ${scoreUrl} done!`);

        return {
            id: details.store.score.id,
            title: details.store.score.title,
            url: details.store.score.url,
            publisher: details.store.score.user.name,
            composer: details.store.page.data.score.composer_name,
            date_created: details.store.page.data.score.date_created,
            date_updated: details.store.page.data.score.date_updated,
            pages: details.store.page.data.score.pages_count,
            duration: details.store.page.data.score.duration,
            info: details.store.page.data.score.body,
            measures: details.store.page.data.score.measures,
            keysig: details.store.page.data.score.keysig,
            difficultyLevel: details.store.page.data.score.complexity,
            genres: details.store.page.data.genres.map((e) => e.name),
            instrumentations:
                details.store.page.data.score.instrumentations.map(
                    (e) => e.name
                ),
            instruments: details.store.page.data.score.instruments.map(
                (e) => e.name
            ),
            categoryPages: details.store.page.data.score.category_pages.map(
                (e) => e.name
            ),
            scoresJson: details,
            count_views: details.store.page.data.count_views,
            count_favorites: details.store.page.data.count_favorites,
            count_comments: details.store.page.data.count_comments,
            rating: details.store.page.data.score.rating.rating,
            rating_count: details.store.page.data.score.rating.count,
        };
    } catch (err) {
        console.error(`Error processing URL: ${scoreUrl}\n`, err);
        throw err;
    }
};

const consume = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();

    await ch.assertQueue(QUEUE, { durable: true });
    await ch.prefetch(6);

    ch.consume(QUEUE, async (msg) => {
        if (msg !== null) {
            const scoreUrl = msg.content.toString();
            console.log(`Current url: ${scoreUrl}`);
            try {
                const scoreDat = await parsingDataFromPage(scoreUrl);

                await updateScore(scoreDat);
                await delayer(1000);
                ch.ack(msg);
            } catch (err) {
                console.error(`Consumer Error:${err}`);
                await delayer(5000);
                ch.nack(msg, false, false);
            }
        }
    });
};

consume().catch(console.error);

// (async () => {
//     await parsingDataFromPage("https://musescore.com/user/46351/scores/64640");
// })();

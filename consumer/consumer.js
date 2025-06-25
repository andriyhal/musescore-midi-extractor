import amqp from "amqplib";
import dotenv from "dotenv";
import { decode } from "entities";
import { load } from "cheerio";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parseDirty = require("dirty-json").parse;

import { delayer, proxyGetRequest } from "../server/utils/index.js";
import { updateScore } from "../server/services/prismaScoreDb.js";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;
const PARALLEL_REQUEST = 20;

class ParseError extends Error {
    constructor(message) {
        super(message);
        this.name = "ParseError";
    }
}
const cleanNullBytes = (obj) => {
    if (typeof obj === "string") {
        return obj.replace(/\x00/g, "").replace(/\u0000/g, "");
    } else if (Array.isArray(obj)) {
        return obj.map(cleanNullBytes);
    } else if (obj && typeof obj === "object") {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = cleanNullBytes(value);
        }
        return cleaned;
    } else {
        return obj;
    }
};

const parsingDataFromPage = async (scoreUrl) => {
    try {
        const { data: html } = await proxyGetRequest(scoreUrl);

        const $ = load(html);
        const jsStoreDiv = $("div.js-store");

        if (jsStoreDiv.length === 0) {
            throw new ParseError(
                `div.js-store was not found on the page: ${scoreUrl}`
            );
        }

        const dataContent = jsStoreDiv.attr("data-content");

        if (!dataContent) {
            throw new ParseError(
                `Attribute data-content was not found in div.js-store`
            );
        }

        let jsonPart;
        try {
            const decoded = decode(dataContent);
            const parsedJson = parseDirty(decoded);
            jsonPart = cleanNullBytes(parsedJson);
        } catch (err) {
            throw new ParseError(
                `Failed to decode or parse JSON: ${err.message}`
            );
        }

        const details = jsonPart;

        // console.log({
        //     id: details.store.score.id,
        //     title: details.store.score.title,
        //     url: scoreUrl,
        //     publisher: details.store.score.user.name,
        //     composer: details.store.page.data.score.composer_name,
        //     date_created: details.store.page.data.score.date_created,
        //     date_updated: details.store.page.data.score.date_updated,
        //     pages: details.store.page.data.score.pages_count,
        //     duration: details.store.page.data.score.duration,
        //     info: details.store.page.data.score.body,
        //     measures: details.store.page.data.score.measures,
        //     keysig: details.store.page.data.score.keysig,
        //     difficultyLevel: details.store.page.data.score.complexity,
        //     genres: details.store.page.data.genres.map((e) => e.name),
        //     instrumentations:
        //         details.store.page.data.score.instrumentations.map(
        //             (e) => e.name
        //         ),
        //     instruments: details.store.page.data.score.instruments.map(
        //         (e) => e.name
        //     ),
        //     categoryPages: details.store.page.data.score.category_pages.map(
        //         (e) => e.name
        //     ),
        //     scoresJson: details,
        //     count_views: details.store.page.data.count_views,
        //     count_favorites: details.store.page.data.count_favorites,
        //     count_comments: details.store.page.data.count_comments,
        //     rating: details.store.page.data.score.rating.rating,
        //     rating_count: details.store.page.data.score.rating.count,
        // });

        return {
            id: details.store.score.id,
            title: details.store.score.title,
            url: scoreUrl,
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
            scoresJson: details.store,
            count_views: details.store.page.data.count_views,
            count_favorites: details.store.page.data.count_favorites,
            count_comments: details.store.page.data.count_comments,
            rating: details.store.page.data.score.rating.rating,
            rating_count: details.store.page.data.score.rating.count,
        };
    } catch (err) {
        console.error(
            `Error processing URL: ${scoreUrl}. Status:${err.status}\n`
        );
        throw err;
    }
};

const consume = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();

    await ch.assertQueue(QUEUE, { durable: true });
    await ch.prefetch(PARALLEL_REQUEST);

    ch.consume(QUEUE, async (msg) => {
        if (msg !== null) {
            const scoreUrl = msg.content.toString();
            console.log(`Current url: ${scoreUrl}`);
            try {
                const scoreDat = await parsingDataFromPage(scoreUrl);

                await updateScore(scoreDat);
                console.log(`Url: ${scoreUrl} done!`);
                await delayer(2500);
                ch.ack(msg);
            } catch (err) {
                if (err instanceof ParseError) {
                    console.error(`Parse Error: ${err.message}`);
                    ch.nack(msg, false, false); // DO NOT REQUEUE
                    await delayer(3000);
                } else if (err.status === 404) {
                    console.error(`404 Not Found: ${scoreUrl}`);
                    ch.nack(msg, false, false); // DO NOT REQUEUE
                    await delayer(3000);
                } else {
                    console.error(`Consumer Error: ${err}`);
                    await delayer(3000);
                    ch.nack(msg, false, true); // REQUEUE for retry
                }
            }
        }
    });
};

consume().catch(console.error);

// (async () => {
//     try {
//         await parsingDataFromPage(
//             "https://musescore.com/user/4150/scores/5147"
//         );
//     } catch (err) {
//         console.error(`Caught top-level error: ${err.message}`);
//         console.error(`Status: ${err.status}`);
//     }
// })();

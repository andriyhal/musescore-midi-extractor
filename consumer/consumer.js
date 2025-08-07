import amqp from "amqplib";
import dotenv from "dotenv";
import { decode } from "entities";
import { load } from "cheerio";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parseDirty = require("dirty-json").parse;

import { BatchQueue, delayer, proxyGetRequest } from "../server/utils/index.js";

import {
    snowflakeClient,
    insertScoresSfBatchIfNotExists,
} from "../server/services/index.js";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;
const PARALLEL_REQUEST = 20;
const BATCH_SIZE = 100;

const batchQueue = new BatchQueue(BATCH_SIZE, async (batch) => {
    await insertScoresSfBatchIfNotExists(batch, snowflakeClient);
});

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
        if (!jsonPart || !jsonPart.store) {
            throw new ParseError(
                `Failed to decode or parse JSON, details is missing or malformed: ${scoreUrl}`
            );
        }

        const details = jsonPart;

        const composer = details.store.page.data.score.composer_name.trim();
        const artist = details.store.page.data.score.artist_name
            ? details.store.page.data.score.artist_name.trim()
            : composer;

        return {
            MUSESCORE_ID: details.store.score.id,
            TITLE: details.store.score.title.trim(),
            URL: scoreUrl,
            PUBLISHER: details.store.score.user.name.trim(),
            COMPOSER: composer,
            ARTIST: artist,
            DATE_CREATED: details.store.page.data.score.date_created,
            DATE_UPDATED: details.store.page.data.score.date_updated,
            PAGES: details.store.page.data.score.pages_count,
            DURATION: details.store.page.data.score.duration,
            INFO: details.store.page.data.score.body,
            MEASURES: details.store.page.data.score.measures,
            KEYSIG: details.store.page.data.score.keysig,
            DIFFICULTYLEVEL: details.store.page.data.score.complexity,
            GENRES: details.store.page.data.genres.map((e) => e.name),
            INSTRUMENTATIONS:
                details.store.page.data.score.instrumentations.map(
                    (e) => e.name
                ),
            INSTRUMENTS: details.store.page.data.score.instruments.map(
                (e) => e.name
            ),
            CATEGORYPAGES: details.store.page.data.score.category_pages.map(
                (e) => e.name
            ),
            SCORESJSON: details.store,
            COUNT_VIEWS: details.store.page.data.count_views,
            COUNT_FAVORITES: details.store.page.data.count_favorites,
            COUNT_COMMENTS: details.store.page.data.count_comments,
            RATING: details.store.page.data.score.rating.rating,
            RATING_COUNT: details.store.page.data.score.rating.count,
            IS_DOWNLOAD: false,
        };
    } catch (err) {
        console.error(
            `Error processing URL: ${scoreUrl}. Status:${err.status}`
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
            // console.log(`Current url: ${scoreUrl}`);
            try {
                const scoreDat = await parsingDataFromPage(scoreUrl);
                // console.log(`Url: ${scoreUrl} parsed!`);
                await delayer(500);
                await batchQueue.add(scoreDat);

                ch.ack(msg);
            } catch (err) {
                if (err instanceof ParseError) {
                    console.error(`Parse ${err.message}`);
                    ch.nack(msg, false, false); // DO NOT REQUEUE
                    await delayer(3000);
                } else if (err.status === 404) {
                    console.error(`404 Not Found: ${scoreUrl}`);
                    ch.nack(msg, false, false); // DO NOT REQUEUE
                    await delayer(3000);
                } else if (err.message.includes("has locked table")) {
                    console.error(`Lock error: ${err.message}`);
                    await delayer(5000);
                    ch.nack(msg, false, true); // REQUEUE
                } else {
                    console.error(`Consumer ${err}`);
                    await delayer(3000);
                    ch.nack(msg, false, true); // REQUEUE for retry
                }
            }
        }
    });
};

process.on("SIGINT", async () => {
    await batchQueue.flush(true);
    process.exit();
});

const start = async () => {
    await snowflakeClient.init();
    await consume();
};

start().catch(console.error);

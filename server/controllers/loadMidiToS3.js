import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import createCsvWriter from "csv-writer";
import { delayer, midiFileLoader, streamToString } from "../utils/index.js";
import {
    updateIsDownloadScoresSfBatch,
    updateScoreSf,
} from "../services/snowflakeService.js";

// Load environment variables
const result = dotenv.config();
if (result.error) {
    console.error("Error loading .env file:", result.error);
    process.exit(1);
}

const UPDATE_BATCH_SIZE = 10;
let updateBatch = [];

const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || `https://s3.amazonaws.com`;
const S3_BUCKET = process.env.AWS_S3_BUCKET || "musescore-scraped-library";

async function* getLinks() {
    const apiUrl = "http://localhost:3001/api/scores"; //! TEST CHANGE to prod url
    const genre = "classical";
    const instrumentations = "Solo Piano";
    const instruments = "Piano";
    const offset = 100; //! TEST CHANGE 100
    let page = 1;
    let total = 0;
    let fetched = 0;
    while (true) {
        const body = {
            genre,
            instrumentations,
            instruments,
            page,
            offset,
        };
        try {
            const response = await axios.post(apiUrl, body, {
                headers: { "Content-Type": "application/json" },
            });
            const data = response.data;

            if (page === 1) total = data.total;
            console.log("PAGE:", page);

            if (Array.isArray(data.results) && data.results.length > 0) {
                yield data.results.map((r) => ({
                    id: r.ID,
                    musescore_id: r.MUSESCORE_ID,
                    title: r.TITLE,
                    url: r.URL,
                    artist: r.ARTIST || "Unknown Artist",
                }));
                fetched += data.results.length;
            } else {
                break;
            }
            if (fetched >= total) break;
            page++;
        } catch (e) {
            console.error("Error fetching page", page, e.message);
            break;
        }
    }
}

const s3 = new S3Client({
    region: "eu-west-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const csvWriter = createCsvWriter.createObjectCsvWriter({
    path: "download_log.csv",
    header: [
        { id: "id", title: "id" },
        { id: "musescore_id", title: "musescore_id" },
        { id: "title", title: "title" },
        { id: "link_to_download", title: "link_to_download" },
    ],
    append: true,
});

async function uploadToS3(localPath, s3Key) {
    const fileContent = fs.readFileSync(localPath);
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: "audio/midi",
    });
    await s3.send(command);
    return `https://${S3_BUCKET}.s3.amazonaws.com/${encodeURIComponent(s3Key)}`;
}

async function updateJsonFileInS3(artist, pieceMetadata) {
    const jsonKey = `${artist}/composer.json`;

    let composerData = {
        composer: artist,
        pieces: [],
    };

    try {
        const getCommand = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: jsonKey,
        });
        const response = await s3.send(getCommand);

        const jsonString = await streamToString(response.Body);
        composerData = JSON.parse(jsonString);

        console.log(`Loaded existing composer.json for ${artist}`);
    } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
            console.log(
                `Composer.json not found for artist: ${artist}, creating new...`
            );
            composerData = {
                composer: artist,
                pieces: [],
            };
        } else {
            console.error("Error reading composer.json:", err);
            throw err;
        }
    }

    composerData.pieces.push(pieceMetadata);

    const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: jsonKey,
        Body: JSON.stringify(composerData, null, 2),
        ContentType: "application/json",
    });

    await s3.send(putCommand);

    console.log(`The composer.json file updated for ${artist}`);
}

function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_").slice(0, 80);
}

async function markScoreDownloadedBatch(url, is_download = false) {
    updateBatch.push({ url, is_download });
    if (updateBatch.length >= UPDATE_BATCH_SIZE) {
        await updateIsDownloadScoresSfBatch(updateBatch);
        updateBatch = [];
    }
}

async function processScore(scoreObj) {
    const { id, musescore_id, title, url, artist } = scoreObj;
    let s3Url;
    let midiFilePath;
    console.log("Downloading MIDI file:", url);

    try {
        midiFilePath = await midiFileLoader(musescore_id, url);
        try {
            const s3FileName = `${id}_${musescore_id}_${sanitizeFileName(
                title
            )}.mid`;
            s3Url = await uploadToS3(midiFilePath, `${artist}/${s3FileName}`);
            console.log("S3 upload success:", s3Url);
            await updateJsonFileInS3(artist, {
                id,
                url,
                title,
                musescore_id,
            });
            await markScoreDownloadedBatch(url, true);
        } catch (e) {
            console.error("S3 upload error:", e.message);
            throw e;
        }
    } catch (e) {
        console.error("Download error:", e.message);
        throw e;
    } finally {
        try {
            fs.unlinkSync(midiFilePath);
        } catch {}
    }
    console.log(
        "---------------------------------------------------------------------------------"
    );
}

async function main() {
    for await (const scores of getLinks()) {
        for (const scoreObj of scores) {
            try {
                await delayer(200);
                await processScore(scoreObj);
            } catch (e) {
                console.error(`Error processing ${scoreObj.url}:`, e.message);
                console.log(
                    "---------------------------------------------------------------------------------"
                );
            }
        }
    }

    if (updateBatch.length > 0) {
        await updateIsDownloadScoresSfBatch(updateBatch);
        updateBatch = [];
    }
}

export const loadMidiToS3 = async (req, res) => {
    try {
        main();
        res.json({ message: "MIDI files processing and uploading to S3." });
    } catch (error) {
        console.error("Error in loadMiditoS3:", error);
        res.status(500).json({ error: "Failed to process MIDI files." });
    }
};

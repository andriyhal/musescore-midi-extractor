import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { streamToString } from "../utils/index.js";

import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);
const result = dotenv.config();
if (result.error) {
    console.error("Error loading .env file:", result.error);
    process.exit(1);
}

const s3 = new S3Client({
    region: "eu-west-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || "musescore-scraped-library";

export const getS3ListFiles = async () => {
    console.log(S3_BUCKET);

    const result = await s3.send(
        new ListObjectsV2Command({
            Bucket: S3_BUCKET,
        })
    );
    console.log(result);

    return result.Contents ? result.Contents : [];
};
export const deleteS3File = async (key) => {
    try {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
            })
        );
    } catch (err) {
        console.error("Error while deleting:", err);
    }
};
export const getArtistJson = async (composerName) => {
    const jsonKey = `${composerName}/composer.json`;
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: jsonKey,
        });

        const response = await s3.send(command);

        const jsonString = await streamToString(response.Body);
        const data = JSON.parse(jsonString);

        console.log(`The composer.json loaded for ${composerName}`);
        return data;
    } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
            console.log(`The composer.json not found for ${composerName}`);
            return null;
        } else {
            console.error("Error fetching composer.json:", err);
            throw err;
        }
    }
};
export const getS3File = async (s3Key, downloadBaseDir = "./downloads") => {
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
        });

        const response = await s3.send(command);

        const localFilePath = path.join(downloadBaseDir, s3Key);
        console.log(localFilePath);

        const dir = path.dirname(localFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        await streamPipeline(
            response.Body,
            fs.createWriteStream(localFilePath)
        );

        console.log(`File downloaded: ${s3Key} -> ${localFilePath}`);
    } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
            console.error(`File not found in S3: ${s3Key}`);
        } else {
            console.error("Error downloading file from S3:", err);
        }
        throw err;
    }
};

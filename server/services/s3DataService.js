import dotenv from "dotenv";

import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

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

const S3_BUCKET = process.env.AWS_S3_BUCKET;

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
        const result = await s3.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
            })
        );
    } catch (err) {
        console.error("Error while deleting:", err);
    }
};

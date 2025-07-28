import {
    getS3ListFiles,
    deleteS3File,
    getArtistJson,
    getS3File,
} from "../services/index.js";

export const s3ListFiles = async (req, res) => {
    try {
        const { nextToken } = req.body;
        const response = await getS3ListFiles(nextToken);

        res.json({
            total: response.contents.length ? response.contents.length : 0,
            results: response.contents,
            nextToken: response.nextToken,
        });
    } catch (error) {
        console.error("Error listing S3 files:", error);
        res.status(500).json({ error: "Failed to list S3 files" });
    }
};

export const s3FileRemove = async (req, res) => {
    const { key } = req.query;
    if (!key) {
        return res.status(400).json({ error: "Key parameter is required" });
    }
    try {
        await deleteS3File(key);

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error deleting S3 file:", error);
        res.status(500).json({ error: "Failed to delete S3 file" });
    }
};
export const getJsonForArtistFromS3 = async (req, res) => {
    const { artist } = req.body;
    if (!artist) {
        return res.status(400).json({ error: "Artist parameter is required" });
    }
    try {
        const json = await getArtistJson(artist);
        if (!json) {
            return res.status(404).json({ error: "Artist JSON not found" });
        }
        res.json(json);
    } catch (error) {
        console.error("Error retrieving JSON for artist from S3:", error);
        res.status(500).json({ error: "Failed to retrieve JSON for artist" });
    }
};
export const downloadS3File = async (req, res) => {
    const { s3Key, downloadBaseDir } = req.body;
    if (!s3Key) {
        return res.status(400).json({ error: "Required parameter missed" });
    }
    try {
        await getS3File(s3Key, downloadBaseDir);

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error deleting S3 file:", error);
        res.status(500).json({ error: "Failed to delete S3 file" });
    }
};

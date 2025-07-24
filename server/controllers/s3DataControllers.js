import {
    getS3ListFiles,
    deleteS3File,
    getArtistJson,
} from "../services/index.js";

export const s3ListFiles = async (req, res) => {
    try {
        const files = await getS3ListFiles();

        res.json({ total: files.length ? files.length : 0, results: files });
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

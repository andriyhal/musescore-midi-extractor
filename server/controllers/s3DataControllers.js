import { getS3ListFiles, deleteS3File } from "../services/index.js";

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

import { snowflakeClient } from "../services/index.js";

export const deleteScore = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Missing url parameter" });
        }

        const score = await snowflakeClient.deleteMuseScoreScore({
            URL: url,
        });

        if (!score) {
            return res
                .status(404)
                .json({ error: `No score found for url: ${url}` });
        }

        res.json(score);
    } catch (error) {
        console.error("Error in deleteScore:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

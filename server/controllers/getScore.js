import { prisma } from "../../prisma/prisma.js";

export const getScore = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Missing url parameter" });
        }

        const score = await prisma.score.findUnique({
            where: { url },
        });

        if (!score) {
            return res
                .status(404)
                .json({ error: `No score found for url: ${url}` });
        }

        res.json(score);
    } catch (error) {
        console.error("Error in getScores:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

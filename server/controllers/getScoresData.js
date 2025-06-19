import { prisma } from "../../prisma/prisma.js";
import { getScores } from "../services/prismaScoreDb.js";

export const getScoresData = async (req, res) => {
    const { genre, instrumentations, instruments } = req.body;
    if (!genre || !instrumentations || !instruments) {
        throw new Error("Missing required fields");
    }
    try {
        const scores = await getScores(genre, instrumentations, instruments);

        res.json(scores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

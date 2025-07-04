import { getScores } from "../services/prismaScoreDb.js";

export const getScoresData = async (req, res) => {
    const { genre, instrumentations, instruments, page = 1, offset } = req.body;
    if (!genre || !instrumentations || !instruments) {
        throw new Error("Missing required fields");
    }
    try {
        let pageSize = parseInt(offset);
        if (isNaN(offset) || offset <= 0) pageSize = 10;
        if (pageSize > 1000) pageSize = 1000;

        const { total, results } = await getScores(
            genre,
            instrumentations,
            instruments,
            page,
            pageSize
        );

        res.json({
            page,
            offset: pageSize,
            total,
            results,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

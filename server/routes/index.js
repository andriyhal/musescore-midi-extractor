import express from "express";

import extractScoreLinksFromSitemap from "../controllers/index.js";
import { addScore } from "../services/prismaScoreDb.js";

const router = express.Router();

router.get("/get-scores-links", extractScoreLinksFromSitemap);

router.post("/score", async (req, res) => {
    const { id, title, url } = req.body;
    const score = await addScore(id, title, url);
    res.json(score);
});

export default router;

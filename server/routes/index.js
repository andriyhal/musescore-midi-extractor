import express from "express";
import {
    getScore,
    getScoresData,
    extractScoreLinksFromSitemap,
    updateScoreData,
} from "../controllers/index.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
    res.json({ message: "Pong" });
});

router.get("/get-scores-links", extractScoreLinksFromSitemap);

router.get("/score", getScore);
router.post("/scores", getScoresData);
router.patch("/score-status", updateScoreData);

export default router;

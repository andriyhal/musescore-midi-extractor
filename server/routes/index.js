import express from "express";
import {
    getScoresData,
    extractScoreLinksFromSitemap,
} from "../controllers/index.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
    res.json({ message: "Pong" });
});

router.get("/get-scores-links", extractScoreLinksFromSitemap);

router.post("/scores-data", getScoresData);

export default router;

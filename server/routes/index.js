import express from "express";
import {
    getScore,
    getScoresData,
    extractScoreLinksFromSitemap,
    updateScoreData,
    s3ListFiles,
    s3FileRemove,
    loadMidiToS3,
} from "../controllers/index.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
    res.json({ message: "Pong" });
});

router.get("/get-scores-links", extractScoreLinksFromSitemap);
router.get("/load-midi", loadMidiToS3);

router.get("/score", getScore);
router.post("/scores", getScoresData);
router.patch("/score-status", updateScoreData);

router.get("/s3-items", s3ListFiles);
router.delete("/s3-item", s3FileRemove);

export default router;

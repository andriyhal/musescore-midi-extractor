import express from "express";
import {
    getScoresData,
    extractScoreLinksFromSitemap,
    updateScoreData,
    s3ListFiles,
    s3FileRemove,
    loadMidiToS3,
    getJsonForArtistFromS3,
    downloadS3File,
    deleteScore,
} from "../controllers/index.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
    res.json({ message: "Pong" });
});

router.get("/get-scores-links", extractScoreLinksFromSitemap);

router.delete("/score", deleteScore);
router.post("/scores", getScoresData);
router.patch("/score-status", updateScoreData);

router.get("/s3-save-midi", loadMidiToS3);
router.post("/s3-items", s3ListFiles);
router.delete("/s3-item", s3FileRemove);
router.post("/s3-artist-json", getJsonForArtistFromS3);
router.post("/s3-download-item", downloadS3File);

export default router;

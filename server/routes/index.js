import express from "express";
import extractScoreLinksFromSitemap from "../controllers/index.js";

const router = express.Router();

router.get("/get-scores-links", extractScoreLinksFromSitemap);
router.get("/status", (req, res) => {
    res.status(200).json({ status: "ok" });
});

export default router;

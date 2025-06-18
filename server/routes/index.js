import express from "express";

import extractScoreLinksFromSitemap from "../controllers/index.js";
import {
    addProxy,
    getAvailableProxy,
    updateProxy,
} from "../services/prismaProxyDb.js";
import { prisma } from "../../prisma/prisma.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
    res.json({ message: "Pong" });
});

router.get("/get-scores-links", extractScoreLinksFromSitemap);

router.post("/proxy/add-proxy", async (req, res) => {
    try {
        const { ip, port, login, password } = req.body;

        const proxyData = {
            ip,
            port: parseInt(port, 10),
            login,
            password,
        };

        const proxy = await addProxy(proxyData);

        res.json({
            success: true,
            data: proxy,
        });
    } catch (error) {
        console.error("Error adding proxy:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add proxy",
            error: error.message,
        });
    }
});
router.get("/proxy/get-proxy", async (req, res) => {
    try {
        const proxy = await getAvailableProxy();

        if (!proxy) {
            return res.status(404).json({
                success: false,
                message: "No available proxy found.",
            });
        }

        res.json({
            success: true,
            data: proxy,
        });
    } catch (error) {
        console.error("Error getting proxy:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get proxy",
            error: error.message,
        });
    }
});
router.post("/proxy/update-proxy", async (req, res) => {
    try {
        const { id, status } = req.body;
        const proxy = await updateProxy({ id, status });

        if (!proxy) {
            return res.status(404).json({
                success: false,
                message: "Failed to update proxy",
            });
        }

        res.json({
            success: true,
            data: proxy,
        });
    } catch (error) {
        console.error("Error getting proxy:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update proxy",
            error: error.message,
        });
    }
});

router.get("/score/store", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        const result = await prisma.score.findUnique({
            where: { url },
            select: {
                scoresJson: true,
            },
        });

        if (!result || !result.scoresJson) {
            return res
                .status(404)
                .json({ error: "Score or scoresJson not found" });
        }

        res.json(result.scoresJson.store);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

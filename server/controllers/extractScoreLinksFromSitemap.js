import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";

import { QueueProducer } from "../services/index.js";

import { delayer } from "../utils/delayer.js";
import { getRequestWithRetry } from "../utils/index.js";

const producer = new QueueProducer();
const limit = pLimit(1000);

const sitemapScraper = async (url) => {
    try {
        const pageResponse = await getRequestWithRetry(url, { timeout: 15000 });

        if (!pageResponse.data) return null;

        const parsedPage = await parseStringPromise(pageResponse.data);

        return parsedPage;
    } catch (error) {
        console.log(`Error while sitemap data scrapping! Error${error}`);
        return null;
    }
};
const saveScoresToDbAndQueue = async (scoreUrl) => {
    try {
        await producer.sendMessage(scoreUrl);
    } catch (err) {
        console.error(`Error processing ${scoreUrl}: ${err.message}`);
    }
};
const getAllScoresFromPage = async (url) => {
    try {
        const parsedScoresPage = await sitemapScraper(url);

        const urls = parsedScoresPage.urlset.url
            .map((entry) => entry.loc[0])
            .filter((link) =>
                /^https:\/\/musescore\.com\/user\/\d+\/scores\/\d+$/.test(link)
            );

        console.log(`✔ Found ${urls.length} scores on page ${url}`);
        await Promise.all(
            urls.map((url) =>
                limit(async () => {
                    await saveScoresToDbAndQueue(url);
                    await delayer(200);
                })
            )
        );
    } catch (error) {
        console.log(`Loading links from page:${url} error:${error.message}`);
        return null;
    }
};

export const extractScoreLinksFromSitemap = async (req, res) => {
    let { page } = req.query;
    page = parseInt(page) || 0;

    try {
        const parsedSitemapPage = await sitemapScraper(
            "https://musescore.com/sitemap.xml"
        );
        const scorePageLinks = parsedSitemapPage.sitemapindex.sitemap
            .map((s) => s.loc[0])
            .filter((link) => /sitemap_scores\d+\.xml$/.test(link))
            .slice(page);

        res.status(200).json({
            message: `Extracting score links started! Total pages from sitemap: ${scorePageLinks.length}`,
        });
        await producer.connect();

        let parsedUrls = 0;
        for (const url of scorePageLinks) {
            console.log(
                `Send to the parser url${url}. Still in queue ${
                    scorePageLinks.length - parsedUrls
                }`
            );
            await getAllScoresFromPage(url);
            console.log("Waiting 20 minutes ... ");
            await delayer(20 * 60 * 1000);
            parsedUrls++;
        }
        console.log("Finished parsing all URLs.");
        await producer.close();
    } catch (error) {
        console.log(`Loading links from sitemap error:${error.message}`);
        return res.status(500).json({ message: "Failed to start producer" });
    }
};

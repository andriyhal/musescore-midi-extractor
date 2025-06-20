import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";

import QueueProducer from "../services/index.js";
import { addScore } from "../services/prismaScoreDb.js";
import { delayer } from "../utils/delayer.js";
import { proxyGetRequest } from "../utils/proxyRequest.js";

const producer = new QueueProducer();

const sitemapScraper = async (url) => {
    try {
        const pageResponse = await proxyGetRequest(url);

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
        const urlParts = scoreUrl.split("/");
        const scoreId = Number(urlParts[urlParts.length - 1]);

        await addScore({ id: scoreId, url: scoreUrl });
        console.log(`✔ Saved to DB: ${scoreUrl}`);

        await producer.sendMessage(scoreUrl);
        console.log(`Sent to queue: ${scoreUrl}`);
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
            )
            .slice(0, 1); //! Remove

        console.log(`✔ Found ${urls.length} scores on page ${url}`);

        await Promise.all(
            urls.map(async (url) => await saveScoresToDbAndQueue(url))
        );
    } catch (error) {
        console.log(`Loading links from page:${url} error:${error.message}`);
        return null;
    }
};

export const extractScoreLinksFromSitemap = async (req, res) => {
    try {
        const parsedSitemapPage = await sitemapScraper(
            "https://musescore.com/sitemap.xml"
        );
        const scorePageLinks = parsedSitemapPage.sitemapindex.sitemap
            .map((s) => s.loc[0])
            .filter((link) => /sitemap_scores\d+\.xml$/.test(link))
            .slice(3, 4); //! Remove

        console.log(scorePageLinks);

        res.status(200).json({
            message: `Extracting score links started! Total pages from sitemap: ${scorePageLinks.length}`,
        });
        await producer.connect();

        for (const url of scorePageLinks) {
            await getAllScoresFromPage(url);
            await delayer(1000);
        }

        // await Promise.all(
        //     scorePageLinks.map((url) =>
        //         limit5(async () => {
        //             await getAllScoresFromPage(url);
        //             await delayer(2000);
        //         })
        //     )
        // );

        await producer.close();
    } catch (error) {
        console.log(`Loading links from sitemap error:${error.message}`);
        return res.status(500).json({ message: "Failed to start producer" });
    }
};

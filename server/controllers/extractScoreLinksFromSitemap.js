import axios from "axios";
import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";

import QueueProducer from "../services/index.js";

const limit = pLimit(10);
const producer = new QueueProducer();

const sitemapScraper = async (url) => {
    try {
        const pageResponse = await axios.get(url);

        if (!pageResponse.data) return null;

        const parsedPage = await parseStringPromise(pageResponse.data);

        return parsedPage;
    } catch (error) {
        console.log(`Error while sitemap data scrapping! Error${error}`);
        return null;
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
            .slice(0, 2); //! Remove

        console.log(`✔ Found ${urls.length} scores on page ${url}`);

        await Promise.all(urls.map((url) => producer.sendMessage(url)));
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
            .filter((link) => /sitemap_scores\d+\.xml$/.test(link));

        console.log(scorePageLinks);

        res.status(200).json({
            message: `Extracting score links started! Total pages from sitemap: ${scorePageLinks.length}`,
        });
        await producer.connect();
        await Promise.all(
            scorePageLinks.map((url) => limit(() => getAllScoresFromPage(url)))
        );
        await producer.close();
    } catch (error) {
        console.log(`Loading links from sitemap error:${error.message}`);
        return res.status(500).json({ message: "Failed to start producer" });
    }
};

import axios from "axios";
import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";

const limit = pLimit(10);

export const getItemsByCategoryAllScoresFromPage = async (url) => {
    try {
        const scoresPageResponse = await axios.get(url);

        if (!sitemapPageResponse.data) return null;

        const parsedScoresPage = await parseStringPromise(
            scoresPageResponse.data
        );
        const urls = parsedScoresPage.urlset.url
            .map((entry) => entry.loc[0])
            .filter((link) =>
                /^https:\/\/musescore\.com\/user\/\d+\/scores\/\d+$/.test(link)
            );

        console.log(`✔ Found ${urls.length} scores on page ${url}`);
        return urls.length;
    } catch (error) {
        console.log(`Loading links from page:${url} error:${error.message}`);
        return null;
    }
};

export const extractScoreLinksFromSitemap = async (req, res) => {
    try {
        const sitemapPageResponse = await axios.get(
            "https://musescore.com/sitemap.xml"
        );

        if (!sitemapPageResponse.data)
            return res.status(500).send("Failed to start producer");

        const parsedSitemapPage = await parseStringPromise(
            sitemapPageResponse.data
        );

        const scorePageLinks = parsedSitemapPage.sitemapindex.sitemap
            .map((s) => s.loc[0])
            .filter((link) => /sitemap_scores\d+\.xml$/.test(link));
        // .slice(0, 2); //! Remove

        res.status(200).json({
            message: `Extracting score links started! Total pages from sitemap: ${scorePageLinks.length}`,
        });
        console.log(scorePageLinks);

        const results = await Promise.all(
            scorePageLinks.map((url) => limit(() => getAllScoresFromPage(url)))
        );

        const totalScores = results
            .filter(Boolean)
            .reduce((sum, count) => sum + count, 0);

        console.log(`✅ Total scores found: ${totalScores}`);
    } catch (error) {
        console.log(`Loading links from sitemap error:${error.message}`);
        return res.status(500).json({ message: "Failed to start producer" });
    }
};

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { load } from "cheerio";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import createCsvWriter from "csv-writer";

// Load environment variables
const result = dotenv.config();
if (result.error) {
    console.error("Error loading .env file:", result.error);
    process.exit(1);
}

const LOGIN_URL = "https://musescore.com/user/login";
const LOGIN_CREDENTIALS = {
    username: process.env.MUSESCORE_USERNAME,
    password: process.env.MUSESCORE_PASSWORD,
};

function cookiesToHeader(cookies) {
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function loginAndGetCookies() {
    console.log("Logging in...");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });
    await page.waitForSelector("#username");
    await page.waitForSelector("#password");
    await page.waitForSelector("button[type=submit]");

    console.log("Filling in username...");
    for (const char of LOGIN_CREDENTIALS.username) {
        await page.type("#username", char);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log("Filling in password...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (const char of LOGIN_CREDENTIALS.password) {
        await page.type("#password", char);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log("Submitting...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.evaluate(() => {
        const passwordField = document.querySelector("#password");
        if (passwordField) {
            let form = passwordField;
            while (form && form.tagName !== "FORM") {
                form = form.parentElement;
            }
            if (form) {
                form.submit();
            }
        }
    });
    console.log("Waiting for navigation...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    console.log("Waiting for cookies...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Getting cookies...");
    const cookies = await page.cookies();
    console.log("Closing browser...");
    await browser.close();

    console.log(
        "---------------------------------------------------------------------------------"
    );

    return cookies;
}

async function fetchScorePageHtml(scoreUrl, cookieHeader) {
    console.log("Fetching score page HTML: ", scoreUrl);

    const response = await axios.get(scoreUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: cookieHeader,
            Referer: "https://musescore.com/",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Connection: "keep-alive",
        },
    });
    fs.writeFileSync("debug_score.html", response.data);
    return response.data;
}

function extractDownloadLinksFromHtml(html) {
    const $ = load(html);
    const divs = $("div.js-store");
    let links = null;
    divs.each((i, el) => {
        const d = $(el).attr("data-content");
        if (!d) return;
        let decoded;
        try {
            decoded = JSON.parse(
                d
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, "&")
                    .replace(/&#39;/g, "'")
            );
        } catch (e) {
            // Not a valid JSON, skip
            return;
        }
        // Try both possible locations for type_download_list
        if (decoded?.store?.page?.data?.type_download_list) {
            links = decoded.store.page.data.type_download_list;
        } else if (decoded?.store?.score?.type_download_list) {
            links = decoded.store.score.type_download_list;
        }
    });
    if (!links) {
        throw new Error("No download links found in any div.js-store");
    }
    return links;
}

async function downloadFileWithCookies(url, outPath, cookieHeader, referer) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: cookieHeader,
            Referer: referer,
            Origin: "https://musescore.com",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Connection: "keep-alive",
        },
    });
    fs.writeFileSync(outPath, response.data);
    console.log("File saved:", outPath);
}

async function* getLinks() {
    const apiUrl = "http://localhost:3001/api/scores";
    const genre = "classical";
    const instrumentations = "Solo Piano";
    const instruments = "Piano";
    const offset = 1;
    let page = 1;
    let total = 0;
    let fetched = 1741;
    while (true) {
        const body = {
            genre,
            instrumentations,
            instruments,
            page,
            offset,
        };
        try {
            const response = await axios.post(apiUrl, body, {
                headers: { "Content-Type": "application/json" },
            });
            const data = response.data;
            if (page === 1) total = data.total;
            if (Array.isArray(data.results) && data.results.length > 0) {
                yield data.results.map((r) => ({
                    id: r.id,
                    musescore_id: r.musescore_id,
                    title: r.title,
                    url: r.url,
                    artist: r.artist || "Unknown Artist",
                }));
                fetched += data.results.length;
            } else {
                break;
            }
            if (fetched >= total) break;
            page++;
        } catch (e) {
            console.error("Error fetching page", page, e.message);
            break;
        }
    }
}

function extractScoreIdFromUrl(url) {
    // Extracts the score ID from a MuseScore URL
    const match = url.match(/\/scores\/(\d+)/);
    return match ? match[1] : "unknown";
}

// S3 endpoint (can be set via .env, otherwise AWS default)
const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || `https://s3.amazonaws.com`;
const s3 = new S3Client({
    region: "eu-west-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
// S3_BUCKET can be set via .env, otherwise will be musescore-scraped-library
const S3_BUCKET = process.env.AWS_S3_BUCKET || "musescore-scraper";

// CSV writer setup
const csvWriter = createCsvWriter.createObjectCsvWriter({
    path: "download_log.csv",
    header: [
        { id: "id", title: "id" },
        { id: "musescore_id", title: "musescore_id" },
        { id: "title", title: "title" },
        { id: "link_to_download", title: "link_to_download" },
    ],
    append: true,
});

async function uploadToS3(localPath, s3Key) {
    const fileContent = fs.readFileSync(localPath);
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: "audio/midi",
    });
    await s3.send(command);
    return `https://${S3_BUCKET}.s3.amazonaws.com/${encodeURIComponent(s3Key)}`;
}

function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_").slice(0, 80);
}

async function markScoreDownloaded(url, is_download = false) {
    try {
        await axios.patch(
            "http://3.72.82.245:3001/api/score-status",
            {
                url,
                is_download,
            },
            {
                headers: { "Content-Type": "application/json" },
                maxBodyLength: Infinity,
            }
        );
        console.log("Marked as downloaded in API:", url);
    } catch (e) {
        console.error("Failed to mark as downloaded in API:", url, e.message);
    }
}

async function processScore(scoreObj, cookieHeader) {
    const { id, musescore_id, title, url, artist } = scoreObj;
    const html = await fetchScorePageHtml(url, cookieHeader);
    const links = extractDownloadLinksFromHtml(html);

    if (links.length === 0) {
        console.log("No download links found for score:", url);
        return;
    }

    for (const link of links) {
        const ext = link.type;
        if (
            ext === "mid" &&
            link.url &&
            typeof link.url === "string" &&
            link.url.startsWith("http")
        ) {
            console.log("Downloading MIDI file:", link.url);
            const s3FileName = `${id}_${musescore_id}_${sanitizeFileName(
                title
            )}.mid`;
            const outPath = path.join(process.cwd(), s3FileName);
            let s3Url = "";
            try {
                await downloadFileWithCookies(
                    link.url,
                    outPath,
                    cookieHeader,
                    url
                );
                try {
                    s3Url = await uploadToS3(
                        outPath,
                        `${artist}/${s3FileName}`
                    );
                    console.log("S3 upload success:", s3Url);
                    await markScoreDownloaded(url, true);
                } catch (e) {
                    console.error("S3 upload error:", e.message);
                }
            } catch (e) {
                console.error("Download error:", e.message);
            }
            await csvWriter.writeRecords([
                { id, musescore_id, title, link_to_download: s3Url },
            ]);
            try {
                fs.unlinkSync(outPath);
            } catch {}
            console.log(
                "---------------------------------------------------------------------------------"
            );
        }
    }
}

async function main(cookieHeader) {
    const scoreUrlArg = process.argv[2];
    let scoreUrls = [];
    if (!scoreUrlArg) {
        //console.log('No score URL provided as argument. Using getLinks() generator.');
        for await (const scores of getLinks()) {
            for (const scoreObj of scores) {
                try {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    await processScore(scoreObj, cookieHeader);
                } catch (e) {
                    console.error(
                        `Error processing ${scoreObj.url}:`,
                        e.message
                    );
                }
            }
        }
    } else {
        scoreUrls = [scoreUrlArg];
        for (const scoreUrl of scoreUrls) {
            try {
                await processScore(
                    {
                        id: "cmcet6ak7000072n39iukwzbu",
                        musescore_id: extractScoreIdFromUrl(scoreUrl),
                        title: "Für Elise – Beethoven",
                        url: scoreUrl,
                    },
                    cookieHeader
                );
            } catch (e) {
                console.error(`Error processing ${scoreUrl}:`, e.message);
            }
        }
    }
}

export const loadMidiToS3 = async (req, res) => {
    try {
        const cookies = await loginAndGetCookies();
        const cookieHeader = cookiesToHeader(cookies);
        main(cookieHeader);
        res.json({ message: "MIDI files processing and uploading to S3." });
    } catch (error) {
        console.error("Error in loadMiditoS3:", error);
        res.status(500).json({ error: "Failed to process MIDI files." });
    }
};

import md5 from "crypto-js/md5.js";
import fs from "fs";
import path from "path";
import stream from "stream";

import { proxyGetRequest, getRequestWithRetry } from "./index.js";

const getSuffix = async (scoreUrl) => {
    let suffixUrls = [];
    const response = await getRequestWithRetry(scoreUrl);

    const text = response.data;
    suffixUrls = [
        ...text.matchAll(
            /link.+?href=["'](https:\/\/musescore\.com\/static\/public\/build\/musescore.*?(?:_es6)?\/20.+?\.js)["']/g
        ),
    ].map((match) => match[1]);

    for (const url of suffixUrls) {
        const response = await getRequestWithRetry(url);
        const text = response.data;
        const match = text.match(/"([^"]+)"\)\.substr\(0,4\)/);
        if (match) {
            return match[1];
        }
    }
    return null;
};

const getApiAuth = async (id, type, index, scoreUrl) => {
    const sufix = await getSuffix(scoreUrl);
    const code = `${id}${type}${index}${sufix}`;
    return md5(code).toString().slice(0, 4);
};

async function downloadFile(url, filename) {
    const res = await getRequestWithRetry(url, { responseType: "arraybuffer" });
    const dest = fs.createWriteStream(path.resolve(filename));
    await new Promise((resolve, reject) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(res.data);
        bufferStream.pipe(dest);
        bufferStream.on("error", reject);
        dest.on("finish", resolve);
    });
}

export const midiFileLoader = async (id, scoreUrl) => {
    const type = "midi";
    const index = 0;
    const url = `https://musescore.com/api/jmuse?id=${id}&type=${type}&index=${index}`;

    const auth = await getApiAuth(id, type, index, scoreUrl);

    const response = await getRequestWithRetry(url, {
        headers: {
            Authorization: auth,
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US;q=0.8",
        },
        responseType: "arraybuffer",
    });

    let midiInformationDetails;
    try {
        midiInformationDetails = JSON.parse(
            Buffer.from(response.data).toString()
        );
    } catch (e) {
        throw new Error("Parsing JSON error from API");
    }
    if (!midiInformationDetails.info || !midiInformationDetails.info.url) {
        throw new Error("There is not info.url in API");
    }

    const downloadsDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const midiFilePath = path.join(downloadsDir, `${id}.mid`);

    await downloadFile(midiInformationDetails.info.url, midiFilePath);
    return midiFilePath;
};

// (async (results) => {
//     for (const result of results) {
//         try {
//             await midiFileLoader(result.musescore_id, result.url);
//             console.log("Файл results успішно завантажено!");
//             console.log("---------------------------------------------------");
//         } catch (error) {
//             console.error("Помилка при завантаженні results:", error.message);
//         }
//     }
// })(results);

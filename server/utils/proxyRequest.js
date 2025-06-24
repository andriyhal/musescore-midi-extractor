import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import dotenv from "dotenv";
dotenv.config();

export const proxyGetRequest = async (url, axiosConfig = {}) => {
    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;
    const username = process.env.PROXY_USERNAME;
    const password = process.env.PROXY_PASS;

    const agent = new HttpsProxyAgent(
        `http://${username}:${password}@${proxyHost}:${proxyPort}`
    );

    try {
        const response = await axios.get(url, {
            ...axiosConfig,
            proxy: false,
            httpAgent: agent,
            httpsAgent: agent,
        });
        console.log(response.status);

        return { data: response.data };
    } catch (error) {
        const status = error.response?.status || null;
        console.error(
            `Proxy request failed: ${error.message}, status: ${status}`
        );
        const err = new Error(
            `Failed to fetch data from ${url} via proxy: ${error.message}`
        );
        err.status = status;
        throw err;
    }
};

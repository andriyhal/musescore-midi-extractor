import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getAvailableProxy, updateProxy } from "../services/prismaProxyDb.js";
import { PROXY_STATUS } from "./constants.js";

export const proxyGetRequest = async (url, axiosConfig = {}) => {
    let proxyData = null;
    let statusToSet = PROXY_STATUS.available;
    try {
        proxyData = await getAvailableProxy();

        const proxyUrl = `http://${proxyData.login}:${proxyData.password}@${proxyData.ip}:${proxyData.port}`;
        const agent = new HttpsProxyAgent(proxyUrl);

        const response = await axios.get(url, {
            ...axiosConfig,
            httpsAgent: agent,
            proxy: false,
        });

        return { data: response.data, proxyData };
    } catch (error) {
        if (error.response && error.response.status === 403 && proxyData) {
            statusToSet = PROXY_STATUS.forbidden;

            throw new Error(
                `Request failed with status code 403. Proxy: ${proxyData.id}`
            );
        }
        throw error;
    } finally {
        if (proxyData) {
            await updateProxy({
                id: proxyData.id,
                status: statusToSet,
            });
        }
    }
};

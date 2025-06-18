import { prisma } from "../../prisma/prisma.js";
import { PROXY_STATUS } from "../utils/constants.js";
import { delayer } from "../utils/delayer.js";

export const addProxy = async (data) => {
    const existing = await prisma.proxy.findUnique({
        where: {
            ip_port: { ip: data.ip, port: data.port },
        },
    });

    if (existing) {
        console.log(`Already in DB!`);
        throw new Error(
            `Proxy: ip:${udata.ipl}, port:${data.port} already exists`
        );
    }

    return await prisma.proxy.create({
        data: {
            ip: data.ip,
            port: data.port,
            login: data.login,
            password: data.password,
            status: PROXY_STATUS.available,
        },
    });
};
export const getAvailableProxy = async () => {
    const MAX_RETRIES = 10;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        const [proxy] = await prisma.$queryRaw`
            SELECT * FROM "Proxy"
            WHERE status = ${PROXY_STATUS.available}::"ProxyStatus"
            ORDER BY RANDOM()
            LIMIT 1
        `;

        if (!proxy) {
            attempts++;
            await delayer(500);
            continue;
        }

        const updatedProxy = await prisma.proxy.update({
            where: { id: proxy.id },
            data: { status: PROXY_STATUS.busy },
        });

        return updatedProxy;
    }

    return null;
};
export const updateProxy = async ({ id, status }) => {
    if (!id || !status) {
        throw new Error("Required fields are missing.");
    }

    const updated = await prisma.proxy.update({
        where: { id },
        data: { status },
    });

    return updated;
};

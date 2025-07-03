import { prisma } from "../../prisma/prisma.js";

export const addScore = async (data) => {
    const { url } = data;

    const existing = await prisma.score.findUnique({
        where: { url },
    });
    if (existing) {
        console.log(`Already in DB, skip: ${url}`);
        throw new Error(`Score ${url} already exists`);
    }

    return await prisma.score.create({ data });
};

export const updateScore = async (data) => {
    const { url, ...updateData } = data;
    try {
        for (const key in updateData) {
            if (typeof updateData[key] === "string") {
                updateData[key] = updateData[key].replace(/\x00/g, "");
            }
        }

        const existing = await prisma.score.findUnique({ where: { url } });
        if (!existing) {
            throw new Error(`Score with url:${url} not found`);
        }

        return await prisma.score.update({
            where: { url },
            data: updateData,
        });
    } catch (error) {
        throw new Error(`Update error: ${error.message}`);
    }
};

export const getScores = async (
    genre,
    instrumentations,
    instruments,
    page,
    pageSize
) => {
    try {
        const skip = (page - 1) * pageSize;

        const total = await prisma.score.count({
            where: {
                genres: {
                    has: genre,
                },
                instrumentations: {
                    has: instrumentations,
                },
                instruments: {
                    has: instruments,
                },
                is_download: false,
            },
        });

        const results = await prisma.score.findMany({
            where: {
                genres: {
                    has: genre,
                },
                instrumentations: {
                    has: instrumentations,
                },
                instruments: {
                    has: instruments,
                },
                is_download: false,
            },
            skip,
            take: pageSize,
            select: {
                id: true,
                musescore_id: true,
                url: true,
                artist: true,
                title: true,
                publisher: true,
            },
        });
        return { total, results };
    } catch (error) {
        console.log(error);

        throw new Error("Error while retrieving data");
    }
};

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
        return await prisma.score.update({
            where: { url },
            data: updateData,
        });
    } catch (error) {
        throw new Error(`Update error:${error.message} in url:${url}`);
    }
};
export const getScores = async (genre, instrumentations, instruments) => {
    try {
        return await prisma.score.findMany({
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
            },
        });
    } catch (error) {
        throw new Error("Error while retrieving data");
    }
};

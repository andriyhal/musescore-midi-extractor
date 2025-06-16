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
    return await prisma.score.update({
        where: { url },
        data: updateData,
    });
};

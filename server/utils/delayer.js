export const delayer = async (ms) => {
    console.log(`Waiting ${ms}...`);

    return new Promise((resolve) => setTimeout(resolve, ms));
};

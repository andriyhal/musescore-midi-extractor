import { updateScoreSf } from "../services/index.js";

export const updateScoreData = async (req, res) => {
    const { url, is_download } = req.body;
    if (!url || is_download === undefined || is_download === null) {
        throw new Error("Missing required fields");
    }
    console.log("Updating score data for URL:", url);
    console.log("New status:", is_download);

    try {
        await updateScoreSf({ url, is_download });
        res.json({
            status: "Success",
            message: `Score with url: ${url}, updated successfully`,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        });
    }
};

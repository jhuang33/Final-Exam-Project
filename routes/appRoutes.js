import express from "express";
import axios from "axios";
import Download from "../models/Download.js";

const router = express.Router();

/**
 * GET /
 * Main page with the form
 */
router.get("/", (req, res) => {
    res.render("index", { error: null });
});

/**
 * POST /convert
 * Calls RapidAPI, stores the metadata in MongoDB, then redirects to /downloads
 */
router.post("/convert", async (req, res) => {
    const youtubeUrl = (req.body.youtubeUrl || "").trim();
    const format = (req.body.format || "").trim(); // e.g. "720" or "mp3"

    if (!youtubeUrl) return res.render("index", { error: "Please paste a YouTube URL." });

    const record = await Download.create({
    youtubeUrl,
    format,
    status: "processing",
    });

    try {
    // Step 1: start job
    const startRes = await axios.request({
        method: "GET",
        url: "https://youtube-info-download-api.p.rapidapi.com/ajax/download.php",
        params: {
        format,
        add_info: "0",
        url: youtubeUrl,
        audio_quality: "128",
        allow_extended_duration: "false",
        no_merge: "false",
        audio_language: "en",
        },
        headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": process.env.RAPIDAPI_HOST,
        },
        timeout: 20000,
    });

    const data = startRes.data;

    if (!data?.success || !data?.progress_url) {
        record.status = "failed";
        record.error = data?.message || "Failed to start download job.";
        await record.save();
        return res.redirect("/downloads");
    }

    record.providerJobId = data.id || null;
    record.progressUrl = data.progress_url;
    record.title = data.title || data.info?.title || null;
    record.thumbnailUrl = data.info?.image || null;
    await record.save();

    // Step 2: poll progress_url until completed (up to ~20s total here should work for most videos unless downloading really large files)
    const maxAttempts = 10;
    const delayMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
        const progRes = await axios.get(record.progressUrl, { timeout: 20000 });
        const p = progRes.data;
        // matches the keys to check if it's complete
        const isComplete =
            p?.text === "Finished" ||
            p?.success === 1;

        const finalUrl = p?.download_url || null;

        if (isComplete && finalUrl) {
            record.downloadUrl = finalUrl;
            record.status = "done";
            await record.save();
            // auto downloads file upon success
            return res.redirect(finalUrl);
        }

        await new Promise(r => setTimeout(r, delayMs));
    }

    // If not ready in time, sends user to history page
    return res.redirect("/downloads");
    }catch (err) {
        record.status = "failed";
        record.error = err.response?.data?.message || err.message;
        await record.save();
        return res.redirect("/downloads");
    }
});


/**
 * GET /downloads
 * Shows all download history
 */
router.get("/downloads", async (req, res) => {
  const downloads = await Download.find().sort({ createdAt: -1 });
  res.render("downloads", { downloads });
});

/**
 * POST /downloads/clear
 * Clears all download records
 */
router.post("/downloads/clear", async (req, res) => {
  await Download.deleteMany({});
  res.redirect("/downloads");
});

export default router;

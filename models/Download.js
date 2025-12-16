import mongoose from "mongoose";

const DownloadSchema = new mongoose.Schema(
  {
    youtubeUrl: { type: String, required: true },
    format: { type: String, required: true },

    title: String,
    thumbnailUrl: String,

    status: {
      type: String,
      enum: ["processing", "done", "failed"],
      default: "processing",
    },

    providerJobId: String,
    progressUrl: String,
    downloadUrl: String,

    error: String,
  },
  { timestamps: true }
);

export default mongoose.model("Download", DownloadSchema);

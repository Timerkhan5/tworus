//server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get("/api/gallery", async (req, res) => {
    try {
        const result = await cloudinary.search
            .expression("folder:tworus_gallery")
            .sort_by("created_at", "desc")
            .max_results(100)
            .execute();

        const items = result.resources.map(item => ({
            type: item.resource_type,
            title: item.public_id.split("/").pop(),
            url: cloudinary.url(item.public_id, {
                secure: true,
                resource_type: item.resource_type,
                transformation: [
                    { angle: "auto" }, 
                    { quality: "auto" },
                    { fetch_format: "auto" }
                ]
            })
        }));

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Cloudinary error" });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

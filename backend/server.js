import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const allowedOrigins = [
    'https://xn--p1acbeb.xn--p1ai', // punycode for турус.рф
    'https://турус.рф', // unicode form (some clients may send this)
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser requests (curl, server-side)
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const buildGalleryItems = (resources = []) => {
    return (resources || []).map((item) => {
        const publicId = item.public_id;
        const type = item.resource_type; // 'image' | 'video'

        const url = cloudinary.url(publicId, {
            secure: true,
            resource_type: type,
            transformation: [
                { angle: "auto" },
                { quality: "auto" },
                { fetch_format: "auto" },
            ],
        });

        // For video assets we need an image thumbnail for the grid
        const thumbUrl =
            type === "video"
                ? cloudinary.url(publicId, {
                      secure: true,
                      resource_type: "video",
                      format: "jpg",
                      transformation: [
                          { quality: "auto" },
                          { fetch_format: "auto" },
                          { width: 900, crop: "limit" },
                      ],
                  })
                : cloudinary.url(publicId, {
                      secure: true,
                      resource_type: "image",
                      transformation: [
                          { quality: "auto" },
                          { fetch_format: "auto" },
                          { width: 900, crop: "limit" },
                      ],
                  });

        return {
            type,
            title: publicId.split("/").pop(),
            url,
            thumbUrl,
        };
    });
};

const listCloudinaryResourcesByPrefix = async ({ prefix, resourceType }) => {
    const safePrefix = String(prefix || "").trim();
    const safeResourceType = String(resourceType || "").trim();

    if (!safePrefix || !safeResourceType) return [];

    const result = await cloudinary.api.resources({
        type: "upload",
        prefix: safePrefix,
        resource_type: safeResourceType,
        max_results: 100,
    });

    return buildGalleryItems(result.resources);
};

const searchCloudinary = async ({ expression, resourceType }) => {
    const safeExpression = String(expression || "").trim();
    const safeResourceType = String(resourceType || "").trim();

    if (!safeExpression || !safeResourceType) return [];

    const result = await cloudinary.search
        .expression(`resource_type:${safeResourceType} AND (${safeExpression})`)
        .sort_by("created_at", "desc")
        .max_results(100)
        .execute();

    return buildGalleryItems(result.resources);
};

const getGalleryItems = async ({ folderPrefix, resourceType }) => {
    const safeFolderPrefix = String(folderPrefix || "").trim().replace(/\/+$/, "");

    if (!safeFolderPrefix || !resourceType) return [];

    // 1) Admin API: matches by public_id prefix
    const byPrefix = await listCloudinaryResourcesByPrefix({
        prefix: safeFolderPrefix,
        resourceType,
    });
    if (byPrefix.length > 0) return byPrefix;

    // 2) Search API: try folder selector (works for many accounts)
    const byFolder = await searchCloudinary({
        resourceType,
        expression: `folder:${safeFolderPrefix}`,
    });
    if (byFolder.length > 0) return byFolder;

    // 3) Search API: try public_id prefix match
    const byPublicId = await searchCloudinary({
        resourceType,
        expression: `public_id:${safeFolderPrefix}/*`,
    });
    if (byPublicId.length > 0) return byPublicId;

    return [];
};

// Gallery endpoint
// - /api/gallery?kind=videos  -> assets from tworus/videos
// - /api/gallery?kind=photos  -> assets from tworus/photos
// - /api/gallery             -> { videos: [...], photos: [...] }
app.get("/api/gallery", async (req, res) => {
    try {
        const kind = String(req.query.kind || "").toLowerCase();

        if (kind === "videos") {
            const items = await getGalleryItems({ folderPrefix: "tworus_gallery/videos", resourceType: "video" });
            return res.json(items);
        }

        if (kind === "photos") {
            const items = await getGalleryItems({ folderPrefix: "tworus_gallery/photos", resourceType: "image" });
            return res.json(items);
        }

        const [videos, photos] = await Promise.all([
            getGalleryItems({ folderPrefix: "tworus_gallery/videos", resourceType: "video" }),
            getGalleryItems({ folderPrefix: "tworus_gallery/photos", resourceType: "image" }),
        ]);

        return res.json({ videos, photos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Cloudinary error" });
    }
});

// API endpoint для получения иконок из Cloudinary
app.get("/api/icons", async (req, res) => {
    try {
        // Ищем иконки в папке tworus_icons (или другой, если у вас другая структура)
        const result = await cloudinary.search
            .expression("folder:tworus/icons")
            .sort_by("created_at", "desc")
            .max_results(50)
            .execute();

        const icons = {};
        result.resources.forEach(item => {
            const name = item.public_id.split("/").pop().replace(/\.[^/.]+$/, ""); // убираем расширение
            icons[name] = cloudinary.url(item.public_id, {
                secure: true,
                resource_type: item.resource_type
            });
        });

        res.json(icons);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Cloudinary error" });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, "../frontend");

// (опционально) mime для шрифтов
app.use((req, res, next) => {
  if (req.path.endsWith(".woff2")) res.type("font/woff2");
  if (req.path.endsWith(".woff")) res.type("font/woff");
  next();
});

app.use(express.static(FRONTEND_DIR));

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


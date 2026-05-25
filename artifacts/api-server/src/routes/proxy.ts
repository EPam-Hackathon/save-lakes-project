import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const AI_SERVICE_URL = process.env["AI_SERVICE_URL"] ?? "http://localhost:8001";

async function proxyJSON(req: Request, res: Response, path: string): Promise<void> {
  const url = `${AI_SERVICE_URL}${path}`;
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { "content-type": "application/json" },
      ...(req.method !== "GET" ? { body: JSON.stringify(req.body) } : {}),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error({ err, url }, "AI service proxy error");
    res.status(502).json({ error: "AI service unavailable" });
  }
}

router.get("/images", async (req, res): Promise<void> => {
  await proxyJSON(req, res, "/images");
});

router.post("/notify", async (req, res): Promise<void> => {
  await proxyJSON(req, res, "/notify");
});

router.post("/rsvp", async (req, res): Promise<void> => {
  await proxyJSON(req, res, "/rsvp");
});

router.get("/rsvp/:campaignId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.campaignId)
    ? req.params.campaignId[0]
    : req.params.campaignId;
  await proxyJSON(req, res, `/rsvp/${raw}`);
});

router.get("/ai-health", async (req, res): Promise<void> => {
  await proxyJSON(req, res, "/health");
});

router.post("/upload-image", async (req: Request, res: Response): Promise<void> => {
  const url = `${AI_SERVICE_URL}/upload-image`;
  try {
    const contentType = req.headers["content-type"] ?? "multipart/form-data";
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
    }
    const body = Buffer.concat(chunks);

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error({ err, url }, "Upload proxy error");
    res.status(502).json({ error: "AI service unavailable" });
  }
});

export default router;

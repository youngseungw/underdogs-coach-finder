import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude가 추출해야 할 결과 타입
interface RecommendResult {
  expertise: string[];
  industries: string[];
  roles: string[];
  freeKeywords: string[];
  summary: string;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // AI 추천 엔드포인트
  app.post("/api/recommend", async (req, res) => {
    const { query, availableExpertise, availableIndustries, availableRoles } =
      req.body as {
        query: string;
        availableExpertise: string[];
        availableIndustries: string[];
        availableRoles: string[];
      };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query is required" });
    }

    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are a coach recommendation assistant for a Korean startup accelerator program.
Extract structured filter parameters from the user's natural language query.
Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "expertise": string[],
  "industries": string[],
  "roles": string[],
  "freeKeywords": string[],
  "summary": string
}`,
        messages: [
          {
            role: "user",
            content: `Query: "${query}"

Available expertise options: ${availableExpertise.join(", ")}
Available industry options: ${availableIndustries.join(", ")}
Available role options: ${availableRoles.join(", ")}

Return JSON only.`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      const result: RecommendResult = JSON.parse(content.text);
      return res.json(result);
    } catch (err) {
      console.error("Recommend API error:", err);
      return res.status(500).json({ error: "AI 추천 처리 중 오류가 발생했습니다" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

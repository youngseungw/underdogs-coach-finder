import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RecommendResult {
  expertise: string[];
  industries: string[];
  roles: string[];
  freeKeywords: string[];
  summary: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // LLM이 ```json ... ``` 마크다운 코드블록으로 감쌀 수 있으므로 제거
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const result: RecommendResult = JSON.parse(jsonText);
    return res.json(result);
  } catch (err) {
    console.error("Recommend API error:", err);
    return res.status(500).json({ error: "AI 추천 처리 중 오류가 발생했습니다" });
  }
}

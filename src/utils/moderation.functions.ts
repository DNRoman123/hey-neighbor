import { createServerFn } from "@tanstack/react-start";

type Verdict = { allowed: boolean; reason?: string };

/**
 * Checks a photo for nudity / sexual or otherwise explicit content before it
 * is stored. Uses the Lovable AI gateway vision model.
 */
export const moderateImage = createServerFn({ method: "POST" })
  .inputValidator((data: { dataUrl: string }) => {
    if (typeof data?.dataUrl !== "string" || !data.dataUrl.startsWith("data:image/")) {
      throw new Error("An image is required");
    }
    if (data.dataUrl.length > 8_000_000) throw new Error("That image is too large");
    return data;
  })
  .handler(async ({ data }): Promise<Verdict> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { allowed: true };

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an image safety reviewer for a neighborhood item-sharing app. " +
                'Reply with exactly one word: "UNSAFE" if the image contains nudity, partial nudity, ' +
                "underwear-only or lingerie-clad people, sexual content, sex toys, pornography, " +
                "sexually suggestive posing, graphic violence or gore. Otherwise reply \"SAFE\".",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Review this photo." },
                { type: "image_url", image_url: { url: data.dataUrl } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("image moderation failed", response.status);
        return { allowed: true };
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const verdict = (json.choices?.[0]?.message?.content ?? "").toUpperCase();
      if (verdict.includes("UNSAFE")) return { allowed: false, reason: "explicit" };
      return { allowed: true };
    } catch (error) {
      console.error("image moderation error", error);
      return { allowed: true };
    }
  });

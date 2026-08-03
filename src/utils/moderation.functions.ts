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
    // Fail closed: if we cannot review the photo, we do not accept it.
    if (!apiKey) return { allowed: false, reason: "unverified" };

    const review = async (): Promise<Verdict> => {
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
        return { allowed: false, reason: "unverified" };
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const verdict = (json.choices?.[0]?.message?.content ?? "").toUpperCase();
      if (verdict.includes("UNSAFE")) return { allowed: false, reason: "explicit" };
      if (verdict.includes("SAFE")) return { allowed: true };
      return { allowed: false, reason: "unverified" };
    };

    // One retry, then block. An unreviewed photo is never stored.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const verdict = await review();
        if (verdict.reason !== "unverified") return verdict;
      } catch (error) {
        console.error("image moderation error", error);
      }
    }
    return { allowed: false, reason: "unverified" };
  });

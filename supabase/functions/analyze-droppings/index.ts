
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured.");

      return jsonResponse(
        {
          error:
            "AI analysis is temporarily unavailable. Please try again later.",
        },
        503,
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid request. Please select an image and try again." },
        400,
      );
    }

    const imageBase64 = body?.imageBase64;
    const mimeType = body?.mimeType;

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length === 0
    ) {
      return jsonResponse(
        { error: "Please select a photo before starting the analysis." },
        400,
      );
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      typeof mimeType !== "string" ||
      !allowedMimeTypes.includes(mimeType)
    ) {
      return jsonResponse(
        {
          error:
            "This image format isn't supported. Please choose a JPEG, PNG, or WebP photo.",
        },
        400,
      );
    }

    if (imageBase64.length > 5_000_000) {
      return jsonResponse(
        {
          error:
            "This photo is too large to analyze. Please choose a smaller photo and try again.",
        },
        413,
      );
    }

    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const prompt = [
      "You are assisting a poultry farmer by visually reviewing a photo that may show chicken droppings.",
      "",
      "Use these sections in your response:",
      "",
      "1. WHAT I CAN SEE",
      "Describe only visible features such as colour, consistency, and unusual appearance.",
      "",
      "2. POSSIBLE CONCERNS",
      "Explain possible reasons when reasonable. Do not claim the photo proves a disease.",
      "",
      "3. WHAT TO DO NEXT",
      "Suggest practical observation and poultry-management steps. Recommend monitoring appetite, activity, water intake, and whether other birds are affected.",
      "",
      "4. WHEN TO CONTACT A VET",
      "Explain when veterinary help is important, particularly if several birds are affected, birds are weak, blood is visible, or symptoms worsen.",
      "",
      "A photo alone cannot confirm a diagnosis. Do not prescribe medicines, antibiotics, or dosages. If the photo is unclear or does not show droppings, explain that limitation. Use plain language.",
    ].join("\n");

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          max_output_tokens: 800,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt,
                },
                {
                  type: "input_image",
                  image_url: imageUrl,
                  detail: "high",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();

      // Keep technical details in server logs, not in the user's message.
      console.error(
        `OpenAI request failed: ${openAIResponse.status} ${errorText.slice(0, 1000)}`,
      );

      let errorCode = "";
      let errorType = "";

      try {
        const errorData = JSON.parse(errorText);

        errorCode = errorData?.error?.code ?? "";
        errorType = errorData?.error?.type ?? "";
      } catch {
        // The response wasn't valid JSON.
      }

      // No credits or exhausted API quota.
      if (
        errorCode === "credit_balance_exhausted" ||
        errorType === "insufficient_quota"
      ) {
        return jsonResponse(
          {
            error:
              "AI analysis is temporarily unavailable. Please try again later.",
          },
          503,
        );
      }

      // Rate limiting or temporary usage restrictions.
      if (openAIResponse.status === 429) {
        return jsonResponse(
          {
            error:
              "The AI service is temporarily busy. Please wait a moment and try again.",
          },
          429,
        );
      }

      // Invalid API key or authentication failure.
      if (openAIResponse.status === 401) {
        return jsonResponse(
          {
            error:
              "AI analysis is temporarily unavailable. Please try again later.",
          },
          503,
        );
      }

      // OpenAI server errors.
      if (openAIResponse.status >= 500) {
        return jsonResponse(
          {
            error:
              "The AI service is experiencing a temporary problem. Please try again later.",
          },
          503,
        );
      }

      // Other unexpected API errors.
      return jsonResponse(
        {
          error:
            "We couldn't analyze this photo right now. Please try again later.",
        },
        502,
      );
    }

    const result = await openAIResponse.json();

    let analysis = result.output_text;

    if (typeof analysis !== "string" || !analysis.trim()) {
      const output = Array.isArray(result.output)
        ? result.output
        : [];

      analysis = output
        .flatMap(
          (item: {
            content?: Array<{
              type?: string;
              text?: string;
            }>;
          }) => Array.isArray(item.content) ? item.content : [],
        )
        .filter(
          (item: { type?: string }) => item.type === "output_text",
        )
        .map((item: { text?: string }) => item.text ?? "")
        .join("\n");
    }

    if (typeof analysis !== "string" || !analysis.trim()) {
      console.error("OpenAI returned no readable analysis.");

      return jsonResponse(
        {
          error:
            "We couldn't generate an analysis for this photo. Please try another photo later.",
        },
        502,
      );
    }

    return jsonResponse({ analysis });

  } catch (error) {
    console.error("Analysis function error:", error);

    return jsonResponse(
      {
        error:
          "Something went wrong while analyzing your photo. Please try again later.",
      },
      500,
    );
  }
});
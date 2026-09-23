export default async function handler(req, res) {
  try {
    const place = req.query.place;
    const hours = Number(req.query.hours) || 72;

    if (!place) {
      return res.status(400).json({
        error: "Missing place"
      });
    }

    const newsApiKey = process.env.GNEWS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!newsApiKey) {
      return res.status(500).json({
        error: "GNEWS_API_KEY is not configured"
      });
    }

    if (!geminiApiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    // ============================================
    // 1. GET NEWS FROM NEWSAPI
    // ============================================

    const from = new Date(
      Date.now() - hours * 60 * 60 * 1000
    ).toISOString();

    const newsUrl = new URL(
      "https://newsapi.org/v2/everything"
    );

    newsUrl.searchParams.set("q", place);
    newsUrl.searchParams.set("from", from);
    newsUrl.searchParams.set("sortBy", "publishedAt");
    newsUrl.searchParams.set("language", "en");
    newsUrl.searchParams.set("pageSize", "20");

    const newsResponse = await fetch(newsUrl, {
      headers: {
        "X-Api-Key": newsApiKey
      }
    });

    const newsData = await newsResponse.json();

    if (!newsResponse.ok) {
      return res.status(newsResponse.status).json({
        error: newsData.message || "NewsAPI request failed"
      });
    }

    const articles = newsData.articles || [];

    // ============================================
    // 2. IF NO NEWS
    // ============================================

    if (articles.length === 0) {
      return res.status(200).json({
        place,
        center: [26.7509, 94.2037],
        zoom: 11,
        radius: "12 km",
        coverage: 0,
        sourceTypes: 0,
        incidents: []
      });
    }

    // ============================================
    // 3. PREPARE NEWS FOR GEMINI
    // ============================================

    const simplifiedArticles = articles.map(
      (article, index) => ({
        id: index + 1,
        source: article.source?.name || "Unknown source",
        title: article.title || "",
        description: article.description || "",
        url: article.url || "",
        publishedAt: article.publishedAt || ""
      })
    );

    const prompt = `
You are the AI incident-analysis engine for Signal Atlas.

The user searched for:

${place}

Analyze the following recent news articles.

Your task:

1. Identify genuine incidents or important local developments.
2. Ignore articles that only mention the location without reporting a local event.
3. Group multiple articles about the SAME event into one incident.
4. Do not invent facts.
5. Only use information contained in the supplied articles.
6. Give each incident a category such as:
   Roads, Weather, Crime, Fire, Health, Transport,
   Infrastructure, Environment, Education, Business,
   Government, Community, Other.
7. Give each incident a short title.
8. Give a concise factual description.
9. Classify the incident as:
   urgent, watch, or update.
10. Keep the source article IDs so Signal Atlas can display the original sources.
11. Do NOT invent latitude or longitude.
12. If there is insufficient evidence for an incident, do not create one.

IMPORTANT:
The sourceIds field must contain the numeric IDs of the
articles that support that incident.

ARTICLES:

${JSON.stringify(simplifiedArticles)}
`;

    // ============================================
    // 4. ASK GEMINI
    // ============================================

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],

        generationConfig: {
          responseMimeType: "application/json",

          responseSchema: {
            type: "object",

            properties: {
              incidents: {
                type: "array",

                items: {
                  type: "object",

                  properties: {
                    id: {
                      type: "string"
                    },

                    type: {
                      type: "string",

                      enum: [
                        "urgent",
                        "watch",
                        "update"
                      ]
                    },

                    category: {
                      type: "string"
                    },

                    title: {
                      type: "string"
                    },

                    description: {
                      type: "string"
                    },

                    location: {
                      type: "string"
                    },

                    sourceIds: {
                      type: "array",

                      items: {
                        type: "integer"
                      }
                    }
                  },

                  required: [
                    "id",
                    "type",
                    "category",
                    "title",
                    "description",
                    "location",
                    "sourceIds"
                  ]
                }
              }
            },

            required: [
              "incidents"
            ]
          }
        }
      })
    });

    const geminiData = await geminiResponse.json();

    // ============================================
    // 5. HANDLE GEMINI ERRORS
    // ============================================

    if (!geminiResponse.ok) {
      console.error(
        "Gemini error:",
        geminiData
      );

      return res.status(500).json({
        error:
          geminiData.error?.message ||
          "Gemini request failed"
      });
    }

    // ============================================
    // 6. GET GEMINI TEXT
    // ============================================

    const aiText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(500).json({
        error: "Gemini returned no response"
      });
    }

    let aiResult;

    try {
      aiResult = JSON.parse(aiText);
    } catch (error) {
      console.error(
        "Gemini JSON parsing error:",
        aiText
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    // ============================================
    // 7. TEMPORARY MAP CENTER
    // ============================================

    // We will add proper location/geocoding later.
    const center = [26.7509, 94.2037];

    // ============================================
    // 8. CONVERT GEMINI RESULT
    //    TO SIGNAL ATLAS FORMAT
    // ============================================

    const incidents = (
      aiResult.incidents || []
    ).map((incident, index) => {

      const sources =
        (incident.sourceIds || [])
          .map(
            sourceId =>
              simplifiedArticles[sourceId - 1]
          )
          .filter(Boolean)
          .map(article => ({
            name: article.source,
            url: article.url
          }));

      const dates =
        (incident.sourceIds || [])
          .map(
            sourceId =>
              simplifiedArticles[sourceId - 1]
          )
          .filter(Boolean)
          .map(
            article =>
              new Date(article.publishedAt)
          )
          .filter(
            date =>
              !Number.isNaN(date.getTime())
          );

      let time = "Recently";

      if (dates.length > 0) {

        const newest = Math.max(
          ...dates.map(
            date => date.getTime()
          )
        );

        const diffMinutes = Math.max(
          0,
          Math.floor(
            (Date.now() - newest) / 60000
          )
        );

        if (diffMinutes < 60) {

          time =
            `${diffMinutes} min ago`;

        } else if (diffMinutes < 1440) {

          time =
            `${Math.floor(
              diffMinutes / 60
            )} hrs ago`;

        } else {

          time =
            `${Math.floor(
              diffMinutes / 1440
            )} days ago`;
        }
      }

      return {

        id:
          incident.id ||
          `incident-${index + 1}`,

        type:
          incident.type,

        category:
          incident.category,

        time,

        title:
          incident.title,

        description:
          incident.description,

        location:
          incident.location,

        // Temporary coordinates.
        point:
          center,

        sources
      };
    });

    // ============================================
    // 9. RETURN SIGNAL ATLAS DATA
    // ============================================

    const uniqueSources =
      new Set(
        articles.map(
          article =>
            article.source?.name
        )
      );

    return res.status(200).json({

      place,

      center,

      zoom: 11,

      radius: "12 km",

      coverage:
        Math.min(
          100,
          Math.round(
            (articles.length / 20) * 100
          )
        ),

      sourceTypes:
        uniqueSources.size,

      incidents
    });

  } catch (error) {

    console.error(
      "Server error:",
      error
    );

    return res.status(500).json({
      error: "Server error"
    });
  }
}

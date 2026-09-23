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
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!newsApiKey) {
      return res.status(500).json({
        error: "GNEWS_API_KEY is not configured"
      });
    }

    if (!openaiApiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured"
      });
    }

    // --------------------------------------------------
    // 1. GET NEWS FROM NEWSAPI
    // --------------------------------------------------

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

    if (articles.length === 0) {
      return res.status(200).json({
        place,
        center: [26.1445, 91.7362],
        zoom: 10,
        radius: "12 km",
        coverage: 0,
        sourceTypes: 0,
        incidents: []
      });
    }

    // --------------------------------------------------
    // 2. SEND NEWS TO OPENAI
    // --------------------------------------------------

    const simplifiedArticles = articles.map((article, index) => ({
      id: index + 1,
      source: article.source?.name || "Unknown source",
      title: article.title || "",
      description: article.description || "",
      url: article.url || "",
      publishedAt: article.publishedAt || ""
    }));

    const aiPrompt = `
You are the incident intelligence engine for a product called Signal Atlas.

The user searched for this location:

${place}

Below are recent news articles.

Your job is to identify genuine local incidents or important developments relevant to the searched location.

Rules:

1. Group articles that describe the same event into ONE incident.
2. Do not create an incident merely because an article mentions the location.
3. Ignore unrelated national or international stories.
4. Do not invent facts.
5. Use only information supported by the supplied articles.
6. Categorize each incident.
7. Give each incident a short useful title.
8. Write a concise description.
9. Use "urgent", "watch", or "update" for the type.
10. Keep the original article URLs as sources.
11. If an article does not provide enough evidence for a specific incident, do not invent one.
12. The "point" coordinates should NOT be invented from the article. For now, use the searched location's center coordinates provided by the server.

Return the incidents in the required JSON structure.

SEARCHED LOCATION:
${place}

ARTICLES:
${JSON.stringify(simplifiedArticles)}
`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5.5",
          input: aiPrompt,

          text: {
            format: {
              type: "json_schema",
              name: "signal_atlas_incidents",
              strict: true,
              schema: {
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
                      ],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  "incidents"
                ],
                additionalProperties: false
              }
            }
          }
        })
      }
    );

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", openaiData);

      return res.status(500).json({
        error:
          openaiData.error?.message ||
          "OpenAI request failed"
      });
    }

    // --------------------------------------------------
    // 3. EXTRACT AI JSON
    // --------------------------------------------------

    let aiText = "";

    if (openaiData.output) {
      for (const item of openaiData.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.type === "output_text") {
              aiText += content.text;
            }
          }
        }
      }
    }

    if (!aiText) {
      return res.status(500).json({
        error: "OpenAI returned no structured output"
      });
    }

    const aiResult = JSON.parse(aiText);

    // --------------------------------------------------
    // 4. CONVERT AI RESULT TO SIGNAL ATLAS FORMAT
    // --------------------------------------------------

    // Temporary center for Jorhat/other locations.
    // We will add proper geocoding in the next step.
    const center = [26.7509, 94.2037];

    const incidents = aiResult.incidents.map(
      (incident, index) => {

        const sources = incident.sourceIds
          .map(sourceId => simplifiedArticles[sourceId - 1])
          .filter(Boolean)
          .map(article => ({
            name: article.source,
            url: article.url
          }));

        const publishedDates = incident.sourceIds
          .map(sourceId => simplifiedArticles[sourceId - 1])
          .filter(Boolean)
          .map(article => new Date(article.publishedAt))
          .filter(date => !isNaN(date));

        let time = "Recently";

        if (publishedDates.length > 0) {
          const newest = Math.max(
            ...publishedDates.map(date => date.getTime())
          );

          const diffMinutes =
            Math.max(
              0,
              Math.floor(
                (Date.now() - newest) / 60000
              )
            );

          if (diffMinutes < 60) {
            time = `${diffMinutes} min ago`;
          } else if (diffMinutes < 1440) {
            time =
              `${Math.floor(diffMinutes / 60)} hrs ago`;
          } else {
            time =
              `${Math.floor(diffMinutes / 1440)} days ago`;
          }
        }

        return {
          id: incident.id || `incident-${index + 1}`,
          type: incident.type,
          category: incident.category,
          time,
          title: incident.title,
          description: incident.description,
          location: incident.location,

          // Temporary coordinates.
          // Proper incident geocoding comes next.
          point: center,

          sources
        };
      }
    );

    // --------------------------------------------------
    // 5. RETURN DATA TO SIGNAL ATLAS
    // --------------------------------------------------

    return res.status(200).json({
      place,
      center,
      zoom: 11,
      radius: "12 km",
      coverage: Math.min(
        100,
        Math.round(
          (articles.length / 20) * 100
        )
      ),
      sourceTypes: new Set(
        articles.map(
          article => article.source?.name
        )
      ).size,
      incidents
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}

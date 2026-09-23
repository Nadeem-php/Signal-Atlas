export default async function handler(req, res) {
  try {
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

    const place = String(req.query.place || "").trim();
    const hours = Math.min(
      Math.max(Number(req.query.hours || 72), 1),
      168
    );

    if (!place) {
      return res.status(400).json({
        error: "Missing place parameter"
      });
    }

    // ---------------------------------------------------------
    // 1. GEOCODE THE SEARCHED LOCATION
    // ---------------------------------------------------------

    const geocodeUrl =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: place,
        format: "jsonv2",
        limit: "1",
        addressdetails: "1"
      }).toString();

    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "SignalAtlas/1.0 (location-awareness prototype)"
      }
    });

    if (!geocodeResponse.ok) {
      throw new Error(
        `Location service returned ${geocodeResponse.status}`
      );
    }

    const geocodeData = await geocodeResponse.json();

    if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
      return res.status(404).json({
        error: `Could not find the location "${place}".`
      });
    }

    const searchedLocation = geocodeData[0];

    const center = [
      Number(searchedLocation.lat),
      Number(searchedLocation.lon)
    ];

    const displayPlace =
      searchedLocation.display_name || place;

    // ---------------------------------------------------------
    // 2. GET RECENT NEWS FROM NEWSAPI
    // ---------------------------------------------------------

const fromDate = new Date(
  Date.now() - hours * 60 * 60 * 1000
).toISOString();

// Get location information from the geocoder
const address = searchedLocation.address || {};

const city =
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  place;

const district =
  address.county ||
  address.state_district ||
  "";

const state =
  address.state ||
  "";

// Search several variations so smaller locations
// have a better chance of finding news.
const queries = [
  `"${city}"`,
  district ? `"${district}"` : "",
  state ? `"${city}" "${state}"` : ""
].filter(Boolean);

let allArticles = [];

for (const query of queries) {
  try {
    const newsUrl =
      "https://newsapi.org/v2/everything?" +
      new URLSearchParams({
        q: query,
        from: fromDate,
        sortBy: "publishedAt",
        language: "en",
        pageSize: "50"
      }).toString();

    const newsResponse = await fetch(newsUrl, {
      headers: {
        "X-Api-Key": newsApiKey,
        "Accept": "application/json"
      }
    });

    const newsData = await newsResponse.json();

    if (!newsResponse.ok) {
      console.warn(
        `NewsAPI query failed for ${query}:`,
        newsData?.message
      );
      continue;
    }

    if (Array.isArray(newsData.articles)) {
      allArticles.push(...newsData.articles);
    }

  } catch (error) {
    console.warn(
      `NewsAPI query error for ${query}:`,
      error.message
    );
  }
}

// Remove duplicate articles
const uniqueArticles = Array.from(
  new Map(
    allArticles
      .filter(
        (article) =>
          article.title &&
          article.url
      )
      .map((article) => [
        article.url,
        article
      ])
  ).values()
);

// Prepare articles for Gemini
const cleanedArticles =
  uniqueArticles.map((article, index) => ({
    id: `article-${index + 1}`,
    source:
      article.source?.name ||
      "Unknown source",
    title: article.title,
    description:
      article.description || "",
    url: article.url,
    publishedAt:
      article.publishedAt
  }));

    // ---------------------------------------------------------
    // 3. IF THERE IS NO NEWS
    // ---------------------------------------------------------

    if (cleanedArticles.length === 0) {
      return res.status(200).json({
        place: displayPlace,
        center,
        zoom: 12,
        radius: "12 km",
        coverage: 0,
        sourceTypes: 0,
        incidents: []
      });
    }

    // ---------------------------------------------------------
    // 4. ASK GEMINI TO ANALYZE THE NEWS
    // ---------------------------------------------------------

    const model =
      "gemini-3.5-flash-lite";

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    const prompt = `
You are the intelligence layer for a location-awareness product called Signal Atlas.

The user searched for:

"${place}"

The searched location coordinates are:

latitude: ${center[0]}
longitude: ${center[1]}

Below are recent news articles retrieved from NewsAPI.

Your task is to identify genuine and useful LOCAL NEWS SIGNALS related to the searched location.

IMPORTANT RULES:

1. Do NOT invent facts.
2. Do NOT invent locations.
3. Do NOT invent dates.
4. Do NOT invent sources.
5. Ignore articles where the searched place is only mentioned incidentally.
6. Prefer stories that actually happened in, affect, concern, or directly involve the searched location.
7. Local news does NOT have to be an emergency.
8. Include useful categories such as:
   - Public Safety
   - Accident
   - Crime
   - Fire
   - Weather
   - Flood
   - Roads
   - Traffic
   - Transit
   - Health
   - Education
   - Environment
   - Civic
   - Government
   - Community
   - Business
   - Other
9. A normal local news story can be a signal even if it is not an emergency.
10. Do not reject an article merely because it is a feature, environmental story, community story, government update, or development story.
11. Group multiple articles that clearly describe the SAME real-world event into one signal.
12. Keep all relevant original sources in the sourceIds array.
13. If only one article describes a genuine local story, it may still become one signal.
14. If an article is clearly unrelated to the searched location, exclude it.
15. Do not manufacture coordinates.
16. location should contain a human-readable location if the article provides one.
17. If the article does not provide a more specific location, use the searched place.
18. Use:
   - "urgent" for immediate or potentially dangerous situations
   - "watch" for developing, significant, or noteworthy situations
   - "update" for ordinary local information
19. Return only useful signals. Do not force an article into a signal if it is genuinely irrelevant.
20. Preserve the article source IDs exactly.

NEWS ARTICLES:

${JSON.stringify(cleanedArticles, null, 2)}
`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              incidents: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: {
                      type: "STRING"
                    },
                    description: {
                      type: "STRING"
                    },
                    category: {
                      type: "STRING"
                    },
                    type: {
                      type: "STRING",
                      enum: [
                        "urgent",
                        "watch",
                        "update"
                      ]
                    },
                    location: {
                      type: "STRING"
                    },
                    sourceIds: {
                      type: "ARRAY",
                      items: {
                        type: "STRING"
                      }
                    }
                  },
                  required: [
                    "title",
                    "description",
                    "category",
                    "type",
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

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error:
          geminiData?.error?.message ||
          "Gemini request failed"
      });
    }

    // ---------------------------------------------------------
    // 5. EXTRACT GEMINI JSON
    // ---------------------------------------------------------

    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    let aiResult;

    try {
      aiResult = JSON.parse(generatedText);
    } catch (error) {
      console.error(
        "Gemini JSON parsing failed:",
        generatedText
      );

      throw new Error(
        "Gemini returned invalid JSON."
      );
    }

    const aiIncidents = Array.isArray(aiResult?.incidents)
      ? aiResult.incidents
      : [];

    // ---------------------------------------------------------
    // 6. CONVERT AI RESULTS INTO SIGNAL ATLAS FORMAT
    // ---------------------------------------------------------

    const incidents = [];

    for (let i = 0; i < aiIncidents.length; i++) {
      const item = aiIncidents[i];

      if (
        !item ||
        !item.title ||
        !Array.isArray(item.sourceIds)
      ) {
        continue;
      }

      const matchingArticles =
        item.sourceIds
          .map((sourceId) =>
            cleanedArticles.find(
              (article) => article.id === sourceId
            )
          )
          .filter(Boolean);

      if (matchingArticles.length === 0) {
        continue;
      }

      const primaryArticle =
        matchingArticles[0];

      // -------------------------------------------------------
      // Try to geocode the specific location mentioned by AI.
      // If it fails, safely fall back to the searched location.
      // -------------------------------------------------------

      let point = center;
      let locationText =
        item.location || place;

      if (
        item.location &&
        item.location.toLowerCase() !==
          place.toLowerCase()
      ) {
        try {
          const incidentGeocodeUrl =
            "https://nominatim.openstreetmap.org/search?" +
            new URLSearchParams({
              q: `${item.location}, ${place}`,
              format: "jsonv2",
              limit: "1"
            }).toString();

          const incidentGeocodeResponse =
            await fetch(incidentGeocodeUrl, {
              headers: {
                "User-Agent":
                  "SignalAtlas/1.0 (location-awareness prototype)"
              }
            });

          if (incidentGeocodeResponse.ok) {
            const incidentLocations =
              await incidentGeocodeResponse.json();

            if (
              Array.isArray(incidentLocations) &&
              incidentLocations.length > 0
            ) {
              const candidate =
                incidentLocations[0];

              const lat = Number(candidate.lat);
              const lon = Number(candidate.lon);

              if (
                Number.isFinite(lat) &&
                Number.isFinite(lon)
              ) {
                point = [lat, lon];
              }
            }
          }
        } catch (error) {
          console.warn(
            "Specific incident geocoding failed:",
            error.message
          );
        }
      }

      // -------------------------------------------------------
      // Human-readable time
      // -------------------------------------------------------

      const publishedDate =
        new Date(primaryArticle.publishedAt);

      const minutesAgo = Math.max(
        0,
        Math.round(
          (Date.now() - publishedDate.getTime()) /
            60000
        )
      );

      let time;

      if (minutesAgo < 60) {
        time =
          minutesAgo <= 1
            ? "1 min ago"
            : `${minutesAgo} min ago`;
      } else {
        const hoursAgo =
          Math.round(minutesAgo / 60);

        time =
          hoursAgo <= 1
            ? "1 hr ago"
            : `${hoursAgo} hrs ago`;
      }

      // -------------------------------------------------------
      // Sources
      // -------------------------------------------------------

      const sources =
        matchingArticles.map((article) => ({
          name: article.source,
          url: article.url
        }));

      incidents.push({
        id: `signal-${i + 1}`,
        type:
          ["urgent", "watch", "update"].includes(
            item.type
          )
            ? item.type
            : "update",

        category:
          item.category || "Other",

        time,

        title:
          item.title,

        description:
          item.description ||
          primaryArticle.description ||
          "",

        location:
          locationText,

        point,

        sources
      });
    }

    // ---------------------------------------------------------
    // 7. SOURCE DIVERSITY
    // ---------------------------------------------------------

    const uniqueSources =
      new Set(
        cleanedArticles.map(
          (article) => article.source
        )
      );

    const sourceTypes =
      uniqueSources.size;

    // Coverage is a simple source-diversity indicator.
    // It is NOT a claim that every news source has been searched.
    const coverage =
      Math.min(
        100,
        sourceTypes * 20
      );

    // ---------------------------------------------------------
    // 8. FINAL SIGNAL ATLAS RESPONSE
    // ---------------------------------------------------------

    return res.status(200).json({
      place: displayPlace,

      center,

      zoom:
        incidents.length > 0
          ? 12
          : 11,

      radius: "12 km",

      coverage,

      sourceTypes,

      incidents
    });

  } catch (error) {
    console.error(
      "Signal Atlas API error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Unexpected server error"
    });
  }
}

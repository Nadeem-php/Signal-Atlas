export default async function handler(req, res) {
  try {
    const place = req.query.place;

    if (!place) {
      return res.status(400).json({
        error: "Missing place"
      });
    }

    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "NEWS_API_KEY is not configured"
      });
    }

    // Get news from the last 72 hours
    const from = new Date(
      Date.now() - 72 * 60 * 60 * 1000
    ).toISOString();

    const newsUrl = new URL(
      "https://newsapi.org/v2/everything"
    );

    newsUrl.searchParams.set("q", place);
    newsUrl.searchParams.set("from", from);
    newsUrl.searchParams.set("sortBy", "publishedAt");
    newsUrl.searchParams.set("language", "en");
    newsUrl.searchParams.set("pageSize", "20");

    const response = await fetch(newsUrl, {
      headers: {
        "X-Api-Key": apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "NewsAPI request failed"
      });
    }

    return res.status(200).json({
      place,
      totalResults: data.totalResults,
      articles: data.articles
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}

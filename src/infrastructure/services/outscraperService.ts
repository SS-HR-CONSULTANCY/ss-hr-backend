export interface NormalizedGoogleReview {
  googleReviewId: string;
  clientName: string;
  designation?: string;
  testimonial: string;
  rating: number;
  reviewDate: Date;
}

export class OutscraperService {
  private serpApiKey: string;
  private serpDataId: string;
  private outscraperApiKey: string;
  private outscraperQuery: string;

  constructor() {
    this.serpApiKey = process.env.SERPAPI_API_KEY || "";
    // Default data_id is the exact Google Maps place ID for SS HR Consultancy Tours and Travels
    this.serpDataId =
      process.env.SERPAPI_DATA_ID || "0x3e5f5d3945927241:0xec15a179df5da7c0";
    this.outscraperApiKey = process.env.OUTSCRAPER_API_KEY || "";
    this.outscraperQuery =
      process.env.OUTSCRAPER_QUERY ||
      "SS HR Consultancy Tours and Travels, Dubai";
  }

  async fetchGoogleReviews(limit: number = 50): Promise<NormalizedGoogleReview[]> {
    // 1. Prefer SerpApi if SERPAPI_API_KEY is configured
    if (this.serpApiKey) {
      return this.fetchWithSerpApi();
    }

    // 2. Fall back to Outscraper if OUTSCRAPER_API_KEY is configured
    if (this.outscraperApiKey) {
      return this.fetchWithOutscraper(limit);
    }

    throw new Error(
      "No API key configured for Google Reviews sync. Please add SERPAPI_API_KEY (or OUTSCRAPER_API_KEY) to your ss-hr-BE/.env file."
    );
  }

  private async fetchWithSerpApi(): Promise<NormalizedGoogleReview[]> {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_maps_reviews");
    url.searchParams.set("data_id", this.serpDataId);
    url.searchParams.set("sort_by", "newestFirst");
    url.searchParams.set("api_key", this.serpApiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `SerpApi error (${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error) errorMsg = `SerpApi: ${parsed.error}`;
      } catch {
        if (errorText) errorMsg += ` - ${errorText}`;
      }
      throw new Error(errorMsg);
    }

    const data: any = await response.json();
    if (data?.error) {
      throw new Error(`SerpApi error: ${data.error}`);
    }

    const reviews = data?.reviews || [];
    const normalizedReviews: NormalizedGoogleReview[] = [];

    for (const r of reviews) {
      const googleReviewId =
        r.review_id || `${r.user?.name || "reviewer"}_${r.date || Date.now()}`;
      const clientName = (r.user?.name || "Google Reviewer").trim();
      const testimonial = (
        r.snippet ||
        r.extracted_snippet?.original ||
        (r.rating ? `Rated ${r.rating} stars on Google` : "Customer Google Review")
      ).trim();

      const rating = Math.min(5, Math.max(1, Number(r.rating) || 5));
      const reviewDate = r.iso_date ? new Date(r.iso_date) : new Date();
      const designation = r.user?.local_guide ? "Local Guide" : "Customer";

      normalizedReviews.push({
        googleReviewId,
        clientName,
        designation,
        testimonial,
        rating,
        reviewDate,
      });
    }

    return normalizedReviews;
  }

  private async fetchWithOutscraper(limit: number): Promise<NormalizedGoogleReview[]> {
    const url = new URL("https://api.app.outscraper.com/maps/reviews-v3");
    url.searchParams.set("query", this.outscraperQuery);
    url.searchParams.set("reviewsLimit", String(limit));
    url.searchParams.set("sort", "newest");
    url.searchParams.set("async", "false");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-KEY": this.outscraperApiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Outscraper API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.message) {
          errorMsg = `Outscraper: ${errorJson.message}`;
        }
      } catch {
        if (errorText) errorMsg += ` - ${errorText}`;
      }
      throw new Error(errorMsg);
    }

    const json: any = await response.json();

    let places: any[] = [];
    if (Array.isArray(json?.data)) {
      places = json.data.flat(2).filter(Boolean);
    }

    const normalizedReviews: NormalizedGoogleReview[] = [];

    for (const place of places) {
      const reviews = place?.reviews_data || [];
      for (const review of reviews) {
        const googleReviewId =
          review.google_id ||
          review.review_id ||
          review.id ||
          `${review.author_title || "reviewer"}_${review.review_timestamp || Date.now()}`;

        const clientName = (review.author_title || "Google Reviewer").trim();
        const testimonial = (
          review.review_text ||
          (review.review_rating
            ? `Rated ${review.review_rating} stars on Google`
            : "Customer Google Review")
        ).trim();

        const rawRating = Number(review.review_rating);
        const rating = !isNaN(rawRating) ? Math.min(5, Math.max(1, rawRating)) : 5;

        let reviewDate = new Date();
        if (review.review_datetime_utc) {
          const parsed = new Date(review.review_datetime_utc);
          if (!isNaN(parsed.getTime())) reviewDate = parsed;
        } else if (review.review_timestamp) {
          reviewDate = new Date(review.review_timestamp * 1000);
        }

        const designation = review.author_badge || "Google Reviewer";

        normalizedReviews.push({
          googleReviewId,
          clientName,
          designation,
          testimonial,
          rating,
          reviewDate,
        });
      }
    }

    return normalizedReviews;
  }
}

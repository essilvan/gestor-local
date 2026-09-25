import { NextResponse } from "next/server";
import type { CompetitorItem, BenchmarkMetrics } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractInstagramHandle(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
  if (match && match[1]) {
    const handle = match[1].replace(/\/$/, "");
    if (!["p", "explore", "reel", "stories", "tv"].includes(handle.toLowerCase())) {
      return handle;
    }
  }
  return null;
}

interface BenchmarkRequestBody {
  query?: string;
  city?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as BenchmarkRequestBody;
    const { query, city } = body;

    if (!query || !city || typeof query !== "string" || typeof city !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros 'query' (Nicho) e 'city' (Cidade) são obrigatórios e devem ser textos válidos.",
        },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim();
    const cleanCity = city.trim();

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chave da Google Places API (GOOGLE_PLACES_API_KEY) não configurada no servidor.",
        },
        { status: 500 }
      );
    }

    // 1. Consulta via Google Places API (New) places:searchText com paginação de até 3 ciclos (até 60 leads)
    const allPlaces: any[] = [];
    let isV1Success = false;

    try {
      let pageToken: string | null = null;
      let cycle = 0;

      do {
        cycle++;
        const requestBody: Record<string, any> = {
          textQuery: `${cleanQuery} em ${cleanCity}`,
          pageSize: 20,
        };
        if (pageToken) {
          requestBody.pageToken = pageToken;
        }

        const v1Res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos,nextPageToken",
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
        });

        if (v1Res.ok) {
          const v1Data = await v1Res.json();
          if (Array.isArray(v1Data.places) && v1Data.places.length > 0) {
            allPlaces.push(...v1Data.places);
            isV1Success = true;
          }
          pageToken = v1Data.nextPageToken || null;
        } else {
          console.warn(`[places/benchmark] v1 searchText retornou HTTP ${v1Res.status}`);
          pageToken = null;
        }
      } while (pageToken && cycle < 3);
    } catch (v1Err) {
      console.error("[places/benchmark] Falha ao consultar Places API (New):", v1Err);
    }

    // Fallback para Google Places Legacy Text Search se a v1 não retornar estabelecimentos
    if (!isV1Success || allPlaces.length === 0) {
      console.log("[places/benchmark] Ativando fallback para Legacy Text Search...");
      let nextPageToken: string | null = null;
      let attempts = 0;

      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        `${cleanQuery} em ${cleanCity}`
      )}&key=${apiKey}`;

      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (Array.isArray(data.results)) {
        allPlaces.push(...data.results);
      }
      nextPageToken = data.next_page_token || null;

      while (nextPageToken && attempts < 2) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2100));
        const pageUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
        const pageRes = await fetch(pageUrl, { cache: "no-store" });
        const pageData = await pageRes.json();
        if (pageData.results && pageData.results.length > 0) {
          allPlaces.push(...pageData.results);
          nextPageToken = pageData.next_page_token || null;
        } else {
          nextPageToken = null;
        }
      }
    }

    // 2. Concatena e deduplica todos os lugares por ID
    const uniqueMap = new Map<string, any>();
    for (const item of allPlaces) {
      const placeId = item?.id || item?.place_id;
      if (placeId && !uniqueMap.has(placeId)) {
        uniqueMap.set(placeId, item);
      }
    }
    const rawResults: any[] = Array.from(uniqueMap.values());

    if (rawResults.length === 0) {
      const emptyMetrics: BenchmarkMetrics = {
        totalCompetitors: 0,
        withoutWebsiteCount: 0,
        avgRating: 0,
        avgReviews: 0,
        marketLeader: null,
      };

      return NextResponse.json({
        success: true,
        metrics: emptyMetrics,
        competitors: [],
      });
    }

    // 3. Monta todos os concorrentes combinando dados (compatível com New v1 e Legacy)
    const competitors: CompetitorItem[] = rawResults.map((item) => {
      const placeId = item.id || item.place_id;
      const name =
        item.displayName?.text ||
        item.name ||
        "Empresa Sem Nome";
      const formatted_address =
        item.formattedAddress ||
        item.formatted_address ||
        "";
      const rating =
        typeof item.rating === "number"
          ? item.rating
          : 0;
      const user_ratings_total =
        typeof item.userRatingCount === "number"
          ? item.userRatingCount
          : typeof item.user_ratings_total === "number"
          ? item.user_ratings_total
          : 0;
      const formatted_phone_number =
        item.nationalPhoneNumber ||
        item.internationalPhoneNumber ||
        item.formatted_phone_number ||
        null;
      const website = item.websiteUri || item.website || null;
      const has_website = Boolean(website && website.trim().length > 0);
      const instagram = extractInstagramHandle(website);

      const photos: string[] = [];
      let photo_reference: string | null = null;
      const rawPhotos = item.photos;
      if (Array.isArray(rawPhotos) && rawPhotos.length > 0) {
        const firstPhoto = rawPhotos[0];
        const firstPhotoRef = firstPhoto?.name || firstPhoto?.photo_reference;
        if (firstPhotoRef) {
          photo_reference = firstPhotoRef;
        }
        for (const photo of rawPhotos.slice(0, 3)) {
          const ref = photo.name || photo.photo_reference;
          if (ref) {
            photos.push(`/api/places/photo?ref=${encodeURIComponent(ref)}`);
          }
        }
      }

      return {
        place_id: placeId,
        name,
        formatted_address,
        rating,
        user_ratings_total,
        formatted_phone_number,
        phone: formatted_phone_number,
        website,
        has_website,
        photos,
        photo_url: photos[0] || null,
        photo_reference,
        instagram,
        deficit: 0,
      };
    });

    // 4. Ordenação decrescente pelo número total de avaliações
    competitors.sort((a, b) => b.user_ratings_total - a.user_ratings_total);

    // 5. Determinação do Líder de Mercado e cálculo de déficit
    const marketLeader = competitors.length > 0 ? competitors[0] : null;
    const leaderReviews = marketLeader ? marketLeader.user_ratings_total : 0;

    competitors.forEach((comp) => {
      comp.deficit = Math.max(0, leaderReviews - comp.user_ratings_total);
    });

    // 6. Cálculo das métricas globais
    const totalCompetitors = competitors.length;
    const withoutWebsiteCount = competitors.filter((c) => !c.has_website).length;
    const totalRatings = competitors.reduce((acc, c) => acc + c.rating, 0);
    const totalReviewsSum = competitors.reduce(
      (acc, c) => acc + c.user_ratings_total,
      0
    );

    const avgRating =
      totalCompetitors > 0
        ? Number((totalRatings / totalCompetitors).toFixed(1))
        : 0;
    const avgReviews =
      totalCompetitors > 0 ? Math.round(totalReviewsSum / totalCompetitors) : 0;

    const metrics: BenchmarkMetrics = {
      totalCompetitors,
      withoutWebsiteCount,
      avgRating,
      avgReviews,
      marketLeader,
    };

    return NextResponse.json({
      success: true,
      metrics,
      competitors,
    });
  } catch (error) {
    console.error("[POST /api/places/benchmark] Exceção:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno no servidor ao processar benchmark.",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import type { CompetitorItem, BenchmarkMetrics } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    // 1. Consulta ao Text Search do Google Places
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      `${cleanQuery} em ${cleanCity}`
    )}&language=pt-BR&key=${apiKey}`;

    const textSearchRes = await fetch(textSearchUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!textSearchRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao conectar com Google Places API: HTTP ${textSearchRes.status}`,
        },
        { status: textSearchRes.status }
      );
    }

    const textSearchData = await textSearchRes.json();

    if (textSearchData.status !== "OK" && textSearchData.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        {
          success: false,
          error:
            textSearchData.error_message ||
            `Google Places retornou status: ${textSearchData.status}`,
        },
        { status: 400 }
      );
    }

    const rawResults: any[] = Array.isArray(textSearchData.results)
      ? textSearchData.results
      : [];

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

    // 2. Filtra os 15 primeiros resultados e busca detalhes completos
    const top15 = rawResults.slice(0, 15);

    const detailsPromises = top15.map(async (item) => {
      if (!item.place_id) {
        return null;
      }

      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
          item.place_id
        )}&fields=name,formatted_address,rating,user_ratings_total,formatted_phone_number,website,photos&language=pt-BR&key=${apiKey}`;

        const detailsRes = await fetch(detailsUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!detailsRes.ok) {
          return null;
        }

        const detailsData = await detailsRes.json();
        return detailsData.status === "OK" ? detailsData.result : null;
      } catch (err) {
        console.error(`[places/benchmark] Falha ao obter detalhes de ${item.place_id}:`, err);
        return null;
      }
    });

    const settledDetails = await Promise.all(detailsPromises);

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

    // 3. Monta os concorrentes combinando dados da busca e detalhes
    const competitors: CompetitorItem[] = top15.map((item, index) => {
      const details = settledDetails[index] || {};

      const name = details.name || item.name || "Empresa Sem Nome";
      const formatted_address =
        details.formatted_address || item.formatted_address || "";
      const rating =
        typeof details.rating === "number"
          ? details.rating
          : typeof item.rating === "number"
          ? item.rating
          : 0;
      const user_ratings_total =
        typeof details.user_ratings_total === "number"
          ? details.user_ratings_total
          : typeof item.user_ratings_total === "number"
          ? item.user_ratings_total
          : 0;
      const formatted_phone_number =
        details.formatted_phone_number || item.formatted_phone_number || null;
      const website = details.website || item.website || null;
      const has_website = Boolean(website && website.trim().length > 0);
      const instagram = extractInstagramHandle(website);

      const photos: string[] = [];
      let photo_reference: string | null = null;
      const rawPhotos = details.photos || item.photos;
      if (Array.isArray(rawPhotos) && rawPhotos.length > 0) {
        const firstPhoto = rawPhotos[0];
        if (firstPhoto?.photo_reference) {
          photo_reference = firstPhoto.photo_reference;
        }
        for (const photo of rawPhotos.slice(0, 3)) {
          if (photo.photo_reference) {
            // Serve via proxy seguro para evitar contaminação de canvas (CORS) no html-to-image
            photos.push(`/api/places/photo?ref=${encodeURIComponent(photo.photo_reference)}`);
          }
        }
      }

      return {
        place_id: item.place_id,
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
        deficit: 0, // calculado após ordenação
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

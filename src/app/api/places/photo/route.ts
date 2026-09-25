import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ref = searchParams.get("ref") || searchParams.get("photo_reference");

  if (!ref) {
    return new NextResponse("Missing 'ref' parameter", { status: 400 });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return new NextResponse("Google Places API key not configured", { status: 500 });
  }

  try {
    const photoUrl = ref.startsWith("places/")
      ? `https://places.googleapis.com/v1/${ref}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
          ref
        )}&key=${apiKey}`;

    const res = await fetch(photoUrl, {
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch photo from Google", {
        status: res.status,
      });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[GET /api/places/photo] Erro ao obter foto:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

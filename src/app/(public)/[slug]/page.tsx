import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicTenantHub } from "@/components/public/PublicTenantHub";
import { sanitizePhoneNumber } from "@/utils/phone";
import { getBusinessStatus } from "@/utils/opening-hours";
import { extractNeighborhoodAndCity, sanitizeDescription } from "@/utils/address";
import type { Service, TenantProfile, PortfolioItem, TenantReview, TenantPost, TenantProduct } from "@/types";

interface PublicPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 1. Geração Dinâmica de Metadados SEO Local Avançado
 */
export async function generateMetadata({
  params,
}: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (["comparativo", "prospeccao", "api", "admin", "login"].includes(slug)) {
    return {
      title: "Página Não Encontrada",
    };
  }

  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    return {
      title: "Estabelecimento Não Encontrado | EssMendes Local",
      description: "A página solicitada não foi encontrada.",
    };
  }

  const { data: profile } = await supabase
    .from("tenant_profiles")
    .select("name, description, editorial_summary, logo_url, address, phone_whatsapp, phone, business_category, place_photos")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  // Busca tags dos posts ativos para enriquecer as palavras-chave de SEO
  const { data: rawPosts } = await supabase
    .from("tenant_posts")
    .select("tags, title")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .limit(5);

  const postTags: string[] = (rawPosts || []).flatMap((p) => p.tags || []);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://local.essmendes.com.br";
  const canonicalUrl = `${baseUrl}/${tenant.slug}`;

  // Trata fotos do local para Open Graph
  let ogImage = profile?.logo_url || null;
  if (!ogImage && profile?.place_photos) {
    if (Array.isArray(profile.place_photos) && profile.place_photos.length > 0) {
      ogImage = profile.place_photos[0];
    } else if (typeof profile.place_photos === "string") {
      try {
        const parsed = JSON.parse(profile.place_photos);
        if (Array.isArray(parsed) && parsed.length > 0) ogImage = parsed[0];
      } catch {
        if (profile.place_photos.startsWith("http")) ogImage = profile.place_photos;
      }
    }
  }

  const cleanLocation = extractNeighborhoodAndCity(profile?.address);
  const cleanDescription = sanitizeDescription(profile?.description, profile?.address);

  const title = `${profile?.name || tenant.name} | Agendamento Online & Catálogo`;
  const description =
    profile?.editorial_summary ||
    cleanDescription ||
    `Conheça os serviços, preços e faça seu agendamento de horário online em ${profile?.name || tenant.name}. Localizado em ${cleanLocation || profile?.address || "Atendimento local"}. WhatsApp: ${profile?.phone_whatsapp || profile?.phone || ""}.`;

  const ogImages = ogImage
    ? [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Fotos e presença digital de ${profile?.name || tenant.name}`,
        },
      ]
    : [];

  const dynamicKeywords = Array.from(
    new Set([
      profile?.name || tenant.name,
      profile?.business_category || "",
      "agendamento online",
      "horário marcado",
      "catálogo de serviços",
      "atendimento local",
      cleanLocation,
      ...postTags,
    ])
  ).filter(Boolean);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "EssMendes Local",
      locale: "pt_BR",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((i) => i.url),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    keywords: dynamicKeywords,
  };
}

/**
 * 2. Página Pública do Estabelecimento (Local Business Hub)
 */
export default async function PublicTenantPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const cleanSlug = typeof slug === "string" ? slug.trim() : slug;

  if (["comparativo", "prospeccao", "api", "admin", "login"].includes(cleanSlug)) {
    notFound();
  }

  const supabase = await createClient();

  // 2.1 Busca o tenant pelo slug selecionando todas as colunas
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", cleanSlug)
    .maybeSingle();

  console.log("Dados do Tenant carregados:", { slug: cleanSlug, theme_niche: tenant?.theme_niche });

  if (!tenant) {
    notFound();
  }

  // 2.2 Fetch paralelo e resiliente de todas as tabelas filhas vinculadas ao tenant.id
  const [
    profileRes,
    servicesRes,
    portfolioRes,
    reviewsRes,
    postsRes,
    productsRes,
  ] = await Promise.all([
    supabase
      .from("tenant_profiles")
      .select("*")
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
    supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_reviews")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_posts")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("published_at", { ascending: false }),
    supabase
      .from("tenant_products")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_available", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data;

  // 2.2.1 Tratamento Seguro de Produtos Físicos
  const products: TenantProduct[] = (productsRes.data || []).map((p: any) => ({
    id: p.id,
    tenant_id: p.tenant_id,
    name: p.name,
    description: p.description || null,
    category: p.category || null,
    price: Number(p.price) || 0,
    promotional_price: p.promotional_price ? Number(p.promotional_price) : null,
    image_url: p.image_url || null,
    is_available: p.is_available ?? true,
    is_featured: p.is_featured ?? false,
    display_order: p.display_order ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  // 2.3 Tratamento Seguro e Tipagem dos Serviços
  const activeServices: Service[] = (servicesRes.data || []).map((s: any) => ({
    id: s.id,
    tenant_id: s.tenant_id,
    name: s.name,
    description: s.description,
    price: s.price !== null && s.price !== undefined ? Number(s.price) : null,
    duration_minutes: s.duration_minutes,
    is_active: s.is_active,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  // 2.4 Tratamento do Portfólio de Transformações (Apenas itens reais)
  const portfolioItems = (portfolioRes.data || []) as PortfolioItem[];

  // 2.5 Tratamento e Mapeamento Seguro de Avaliações Oficiais do Google Maps
  const { data: rawReviews, error: reviewsError } = reviewsRes;
  console.log('Reviews carregadas na vitrine:', rawReviews?.length, reviewsError);

  const reviews: TenantReview[] = (rawReviews || []).map((r: any) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    author_name: r.author_name || r.author || "Cliente Google",
    author_photo_url: r.author_photo_url || r.profile_photo_url || r.photo_url || null,
    profile_photo_url: r.author_photo_url || r.profile_photo_url || null,
    author_url: r.author_url || null,
    rating: Number(r.rating) || 5,
    text: r.review_text || r.text || "",
    review_text: r.review_text || r.text || "",
    relative_time: r.relative_time_description || r.relative_time || "recentemente",
    relative_time_description: r.relative_time_description || r.relative_time || "recentemente",
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  // 2.6 Tratamento e Filtragem de Posts / Artigos de SEO Ativos
  const rawPostsList = postsRes.data || [];
  const posts: TenantPost[] = rawPostsList
    .filter((p: any) => p.is_active !== false && p.is_published !== false)
    .map((p: any) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      title: p.title,
      content: p.content,
      image_url: p.image_url || null,
      cta_type: p.cta_type || "booking",
      cta_label: p.cta_label || "Agendar Horário",
      cta_url: p.cta_url || null,
      tags: Array.isArray(p.tags) ? p.tags : [],
      meta_description: p.meta_description || null,
      slug: p.slug || null,
      is_active: p.is_active ?? p.is_published ?? true,
      published_at: p.published_at || p.created_at,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

  // 2.7 Parsing Robusto de Fotos do Google Maps (place_photos)
  let cleanPlacePhotos: string[] = [];
  if (profile?.place_photos) {
    if (Array.isArray(profile.place_photos)) {
      cleanPlacePhotos = profile.place_photos.filter((p: any) => Boolean(p) && typeof p === "string");
    } else if (typeof profile.place_photos === "string") {
      try {
        const parsed = JSON.parse(profile.place_photos);
        if (Array.isArray(parsed)) {
          cleanPlacePhotos = parsed.filter((p: any) => Boolean(p) && typeof p === "string");
        }
      } catch {
        if (profile.place_photos.startsWith("http")) {
          cleanPlacePhotos = [profile.place_photos];
        }
      }
    }
  }

  // 2.8 Parsing Robusto de Horários de Funcionamento (opening_hours_json ou tenant.opening_hours)
  const rawHoursSource = profile?.opening_hours_json || (tenant as any)?.opening_hours || (profile as any)?.opening_hours;
  let cleanOpeningHours: string[] = [];
  if (rawHoursSource) {
    if (Array.isArray(rawHoursSource)) {
      cleanOpeningHours = rawHoursSource.filter((h: any) => Boolean(h) && typeof h === "string");
    } else if (typeof rawHoursSource === "string") {
      try {
        const parsed = JSON.parse(rawHoursSource);
        if (Array.isArray(parsed)) {
          cleanOpeningHours = parsed.filter((h: any) => Boolean(h) && typeof h === "string");
        }
      } catch {
        cleanOpeningHours = [rawHoursSource];
      }
    }
  }

  // 2.9 Objeto de Perfil Tipado com Todos os Campos Enriquecidos
  const fallbackLogo = profile?.logo_url || (cleanPlacePhotos.length > 0 ? cleanPlacePhotos[0] : null);
  const cleanDescription = sanitizeDescription(profile?.description, profile?.address);
  const typedProfile: TenantProfile | null = profile
    ? {
        id: profile.id,
        tenant_id: profile.tenant_id,
        name: profile.name || tenant.name,
        description: cleanDescription || null,
        editorial_summary: profile.editorial_summary || cleanDescription || null,
        phone_whatsapp: profile.phone_whatsapp || profile.phone || null,
        phone: profile.phone || profile.phone_whatsapp || null,
        address: profile.address || null,
        logo_url: fallbackLogo,
        template_id: profile.template_id || "default",
        primary_color: profile.primary_color || "#0d9488",
        google_maps_url: profile.google_maps_url || null,
        google_place_id: profile.google_place_id || null,
        rating: profile.rating ?? profile.google_rating ?? null,
        google_rating: profile.google_rating ?? profile.rating ?? null,
        review_count: profile.review_count ?? profile.google_reviews_count ?? null,
        google_reviews_count: profile.google_reviews_count ?? profile.review_count ?? null,
        business_category: profile.business_category || null,
        opening_hours_json: cleanOpeningHours.length > 0 ? cleanOpeningHours : null,
        latitude: typeof profile.latitude === "number" ? profile.latitude : null,
        longitude: typeof profile.longitude === "number" ? profile.longitude : null,
        hero_image_url: profile.hero_image_url || (cleanPlacePhotos.length > 0 ? cleanPlacePhotos[0] : null),
        place_photos: cleanPlacePhotos,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://local.essmendes.com.br";
  const canonicalUrl = `${baseUrl}/${tenant.slug}`;
  const cleanPhone = profile?.phone_whatsapp || profile?.phone ? sanitizePhoneNumber(profile.phone_whatsapp || profile.phone) : null;
  const internationalPhone = cleanPhone ? `+55${cleanPhone}` : undefined;
  
  // Cálculo dinâmico do horário de funcionamento real do estabelecimento
  const businessStatus = getBusinessStatus(cleanOpeningHours);

  // 2.10 Schemas Estruturados Rich Data (Schema.org LocalBusiness + OfferCatalog + BlogPosting)
  const localBusinessJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": canonicalUrl,
    name: typedProfile?.name || tenant.name,
    description: typedProfile?.editorial_summary || typedProfile?.description || (typedProfile?.business_category ? `${typedProfile.business_category} - ${tenant.name}` : `Presença profissional e catálogo de serviços de ${tenant.name}.`),
    url: canonicalUrl,
    telephone: internationalPhone,
    image: typedProfile?.logo_url || (cleanPlacePhotos.length > 0 ? cleanPlacePhotos[0] : undefined),
    priceRange: "R$",
    address: typedProfile?.address
      ? {
          "@type": "PostalAddress",
          streetAddress: typedProfile.address,
          addressCountry: "BR",
        }
      : undefined,
    geo: typedProfile?.latitude && typedProfile?.longitude
      ? {
          "@type": "GeoCoordinates",
          latitude: typedProfile.latitude,
          longitude: typedProfile.longitude,
        }
      : undefined,
    aggregateRating: typedProfile?.google_rating || typedProfile?.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: typedProfile.google_rating || typedProfile.rating,
          reviewCount: typedProfile.google_reviews_count || typedProfile.review_count || 1,
        }
      : undefined,
    hasOfferCatalog: activeServices.length > 0
      ? {
          "@type": "OfferCatalog",
          name: "Catálogo de Serviços Disponíveis",
          itemListElement: activeServices.map((srv, idx) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: srv.name,
              description: srv.description || undefined,
            },
            price: srv.price && Number(srv.price) > 0 ? Number(srv.price).toFixed(2) : undefined,
            priceCurrency: srv.price && Number(srv.price) > 0 ? "BRL" : undefined,
            position: idx + 1,
          })),
        }
      : undefined,
  };

  // Schemas Estruturados para Artigos e Posts de SEO Local (Schema.org BlogPosting)
  const articleJsonLdList = posts.map((post) => ({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.content.substring(0, 160),
    articleBody: post.content,
    image: post.image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      "@type": "Organization",
      name: typedProfile?.name || tenant.name,
    },
    publisher: {
      "@type": "Organization",
      name: typedProfile?.name || tenant.name,
    },
    keywords: post.tags && post.tags.length > 0 ? post.tags.join(", ") : undefined,
    mainEntityOfPage: `${canonicalUrl}#novidades`,
  }));

  // Schemas Estruturados para Catálogo de Produtos Físicos (Schema.org Product + Offer)
  const productJsonLdList = products.map((prod) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: prod.name,
    description: prod.description || `${prod.name} disponível em ${typedProfile?.name || tenant.name}`,
    image: prod.image_url || undefined,
    offers: {
      "@type": "Offer",
      price: (prod.promotional_price && prod.promotional_price > 0 ? prod.promotional_price : prod.price).toFixed(2),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "LocalBusiness",
        name: typedProfile?.name || tenant.name,
        address: typedProfile?.address || undefined,
        telephone: internationalPhone,
      },
    },
  }));

  const allStructuredData = [localBusinessJsonLd, ...articleJsonLdList, ...productJsonLdList];

  const templateId = tenant.theme_settings?.template_id || typedProfile?.template_id || "premium";
  const primaryColor = tenant.theme_settings?.primary_color || typedProfile?.primary_color || "#e11d48";

  const templateClasses: Record<string, string> = {
    premium: "template-premium font-serif-headings",
    modern: "template-modern bento-layout",
    minimal: "template-minimal font-mono-accents",
    conversion: "template-conversion cta-high-contrast",
  };
  const selectedTemplateClass = templateClasses[templateId] || templateClasses.premium;

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden ${selectedTemplateClass}`}
      style={{ "--brand-primary": primaryColor } as React.CSSProperties}
    >
      {/* Injeção JSON-LD para SEO Local, Artigos e Produtos */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(allStructuredData) }}
      />

      {/* Renderização do Local Business Hub */}
      <PublicTenantHub
        tenant={tenant}
        profile={typedProfile}
        services={activeServices}
        portfolioItems={portfolioItems}
        reviews={reviews}
        posts={posts}
        products={products}
        isOpenNow={businessStatus.isOpenNow}
        statusBadgeText={businessStatus.badgeText}
        statusDetailText={businessStatus.detailText}
      />
    </div>
  );
}

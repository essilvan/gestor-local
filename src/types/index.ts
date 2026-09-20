export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "super_admin" | "tenant_owner" | "owner" | "admin" | "staff";

export interface SuperAdminTenantItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  phone?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  google_place_id?: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  opening_hours?: string[] | null;
  total_products: number;
  presence_score: number;
  status: string;
  permissions?: TenantPermissions | null;
  created_at: string;
}

export interface TenantPermissions {
  dashboard: boolean;          // Dashboard
  appointments: boolean;       // Agendamentos
  services: boolean;           // Serviços
  products: boolean;           // Vitrine Produtos
  before_after: boolean;       // Antes & Depois
  reviews: boolean;            // Avaliações Google
  posts_seo: boolean;          // Posts & SEO
  reports: boolean;            // Resultados & Relatórios
  subscription_pro: boolean;   // Assinatura Pro
  billing_plans: boolean;      // Faturamento & Planos
  settings: boolean;           // Configurações

  // Compatibilidade Legada (opcional)
  showcase?: boolean;
  billing?: boolean;
}

export const DEFAULT_TENANT_PERMISSIONS: TenantPermissions = {
  dashboard: true,
  appointments: true,
  services: true,
  products: true,
  before_after: true,
  reviews: true,
  posts_seo: true,
  reports: true,
  subscription_pro: true,
  billing_plans: true,
  settings: true,
  showcase: true,
  billing: true,
};

export interface BusinessAttributes {
  menu_options?: string[];
  dining_options?: string[];
  amenities?: string[];
  atmosphere?: string[];
  [key: string]: string[] | undefined;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  custom_domain?: string | null;
  plan_tier: "free" | "pro" | "enterprise";
  subscription_status?: "active" | "trialing" | "pending" | "overdue" | "canceled" | null;
  subscription_plan?: "setup_monthly" | "semiannual" | "monthly_renewal" | string | null;
  subscription_expires_at?: string | null;
  setup_paid?: boolean;
  current_period_end?: string | null;
  mp_payment_id?: string | null;
  permissions?: TenantPermissions | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  presence_score?: number | null;
  business_attributes?: BusinessAttributes | null;
  theme_niche?: string | null;
  theme_settings?: {
    template_id?: string;
    template?: string;
    niche?: string;
    primary_color?: string;
    [key: string]: any;
  } | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type OfferType = "setup_monthly" | "semiannual" | "monthly_renewal";

export interface TenantProfile {
  id: string;
  tenant_id: string;
  name?: string | null;
  description?: string | null;
  editorial_summary?: string | null;
  phone_whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  template_id: string;
  primary_color?: string | null;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  rating?: number | null;
  google_rating?: number | null;
  review_count?: number | null;
  google_reviews_count?: number | null;
  business_category?: string | null;
  opening_hours_json?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  hero_image_url?: string | null;
  place_photos?: string[] | null;
  business_attributes?: BusinessAttributes | null;
  created_at: string;
  updated_at: string;
}

export interface TenantReview {
  id: string;
  tenant_id: string;
  author_name: string;
  author_photo_url?: string | null;
  profile_photo_url?: string | null;
  author_url?: string | null;
  rating: number;
  text: string;
  review_text?: string | null;
  relative_time?: string | null;
  relative_time_description?: string | null;
  reply_text?: string | null;
  replied_at?: string | null;
  is_official_google?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantPost {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  image_url?: string | null;
  cta_type?: "booking" | "whatsapp" | "link" | null;
  cta_label?: string | null;
  cta_url?: string | null;
  tags?: string[] | null;
  meta_description?: string | null;
  slug?: string | null;
  is_active: boolean;
  is_published?: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  price: number | null;
  duration_minutes: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "canceled";

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  service_id?: string | null;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  start_time: string;
  end_time: string;
  total_duration: number;
  price: number;
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  time: string; // "09:00"
  available: boolean;
  reason?: string;
}

export interface PortfolioItem {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  before_image_url: string;
  after_image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantProduct {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  promotional_price?: number | null;
  image_url?: string | null;
  is_available: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TenantOpportunity {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  action_label: string;
  action_url: string;
  category: "profile" | "reputation" | "content" | "catalog" | "seo";
  status: "pending" | "in_progress" | "completed" | "dismissed";
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  provider: "google_business" | "google_places" | string;
  is_connected: boolean;
  account_id?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  last_synced_at?: string | null;
  sync_status: "idle" | "syncing" | "success" | "error";
  sync_message?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LeadDiagnostic {
  id: string;
  company_name: string;
  city: string;
  whatsapp: string;
  calculated_score: number;
  google_found: boolean;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  issues_detected: string[];
  opportunities_detected: string[];
  created_at: string;
}

export interface PresenceScoreCategory {
  category: "profile" | "reputation" | "content" | "catalog" | "seo";
  title: string;
  score: number;
  maxScore: number;
  weight: number;
  status: "excellent" | "good" | "needs_attention" | "poor";
  items: Array<{
    name: string;
    pointsEarned: number;
    maxPoints: number;
    completed: boolean;
    recommendation?: string;
  }>;
}

export interface LocalScoreResult {
  totalScore: number; // 0 - 100
  statusLevel: "excelente" | "forte" | "moderada" | "critica";
  categories: PresenceScoreCategory[];
  totalOpportunities: number;
}

export type ProspectStatus = "NOVO" | "CONTATADO" | "EM_NEGOCIACAO" | "FECHADO";

export interface Prospect {
  id: string;
  place_id: string;
  name: string;
  category?: string | null;
  city?: string | null;
  address?: string | null;
  formatted_address?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  website?: string | null;
  has_website: boolean;
  rating: number;
  total_reviews: number;
  reviews_count: number;
  review_gap_to_leader: number;
  review_deficit: number;
  leader_reviews_count: number;
  status: ProspectStatus;
  ai_status: string;
  company_name?: string | null;
  pitch_generated?: string | null;
  demo_url?: string | null;
  instagram?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CompetitorItem {
  place_id: string;
  name: string;
  formatted_address: string;
  rating: number;
  user_ratings_total: number;
  formatted_phone_number?: string | null;
  phone?: string | null;
  website?: string | null;
  has_website: boolean;
  photos?: string[];
  photo_url?: string | null;
  photo_reference?: string | null;
  instagram?: string | null;
  deficit: number;
}

export interface BenchmarkMetrics {
  totalCompetitors: number;
  withoutWebsiteCount: number;
  avgRating: number;
  avgReviews: number;
  marketLeader: CompetitorItem | null;
}


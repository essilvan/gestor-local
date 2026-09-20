"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Prospect, ProspectStatus } from "@/types";

export interface SaveProspectInput {
  place_id: string;
  name: string;
  category?: string;
  city?: string;
  formatted_address?: string;
  phone?: string;
  website?: string | null;
  has_website?: boolean;
  rating?: number;
  total_reviews?: number;
  reviews_count?: number;
  review_deficit?: number;
  leader_reviews_count?: number;
  pitch_generated?: string;
  instagram?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

import {
  sanitizeInstagramHandle,
  resolveProspectInstagram,
} from "@/lib/instagram";

/**
 * Insere ou atualiza múltiplos leads na tabela `prospects` com status 'NOVO' e ai_status 'ATIVO'.
 * Garante que o ID do Google fique estritamente em `place_id`, deixando o Postgres gerar o UUID `id`.
 */
export async function saveProspectsAction(
  leads: SaveProspectInput[]
): Promise<ActionResult<Prospect[]>> {
  try {
    if (!Array.isArray(leads) || leads.length === 0) {
      return { success: false, error: "Nenhum lead fornecido para salvar." };
    }

    const supabase = await createClient();

    const recordsToUpsert = leads.map((lead) => {
      const cleanPhone = (lead.phone || "").replace(/\D/g, "");
      const totalReviews = lead.total_reviews ?? lead.reviews_count ?? 0;
      const deficit = lead.review_deficit ?? 0;
      const leaderReviews = lead.leader_reviews_count ?? (totalReviews + deficit);
      const cleanIg = sanitizeInstagramHandle(lead.instagram);

      const notesPayload = cleanIg ? JSON.stringify({ instagram: cleanIg }) : null;

      return {
        place_id: lead.place_id,
        name: lead.name,
        company_name: lead.name,
        category: lead.category || "Comércio / Serviços",
        city: lead.city || "",
        formatted_address: lead.formatted_address || null,
        phone: lead.phone || null,
        whatsapp_number: cleanPhone || null,
        website: lead.website || null,
        has_website: Boolean(lead.has_website),
        rating: lead.rating || 0,
        total_reviews: totalReviews,
        reviews_count: totalReviews,
        review_gap_to_leader: deficit,
        review_deficit: deficit,
        leader_reviews_count: leaderReviews,
        pitch_generated: lead.pitch_generated || null,
        notes: notesPayload,
        status: "NOVO" as ProspectStatus,
        ai_status: "ATIVO",
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("prospects")
      .upsert(recordsToUpsert, { onConflict: "place_id" })
      .select();

    if (error) {
      console.error("[saveProspectsAction] Erro no Supabase:", error);
      return {
        success: false,
        error: `Erro ao salvar leads no funil: ${error.message}`,
      };
    }

    const enriched = (data || []).map((p) => ({
      ...p,
      instagram: resolveProspectInstagram(p),
    }));

    revalidatePath("/prospeccao");
    revalidatePath("/comparativo");
    revalidatePath("/");

    return {
      success: true,
      data: (enriched as Prospect[]) || [],
      count: data?.length || 0,
    };
  } catch (err) {
    console.error("[saveProspectsAction] Exceção:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao salvar leads.",
    };
  }
}

/**
 * Busca todos os prospects do banco de dados ordenados pelos mais recentes.
 */
export async function getProspectsAction(): Promise<ActionResult<Prospect[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getProspectsAction] Erro:", error);
      return { success: false, error: error.message };
    }

    const enriched = (data || []).map((p) => ({
      ...p,
      instagram: resolveProspectInstagram(p),
    }));

    return { success: true, data: (enriched as Prospect[]) || [] };
  } catch (err) {
    console.error("[getProspectsAction] Exceção:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao carregar prospects.",
    };
  }
}

/**
 * Atualiza o status de um lead no Kanban ('NOVO' | 'CONTATADO' | 'EM_NEGOCIACAO' | 'FECHADO').
 */
export async function updateProspectStatusAction(
  id: string,
  newStatus: ProspectStatus
): Promise<ActionResult<Prospect>> {
  try {
    if (!id || !newStatus) {
      return { success: false, error: "ID e novo status são obrigatórios." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prospects")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[updateProspectStatusAction] Erro:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/prospeccao");
    revalidatePath("/");

    return { success: true, data: data as Prospect };
  } catch (err) {
    console.error("[updateProspectStatusAction] Exceção:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar status do lead.",
    };
  }
}

/**
 * Atualiza ou salva o Instagram de um lead no Supabase.
 * Tenta atualizar a coluna `instagram`; se não existir na migration remota, salva em `notes` como JSON.
 */
export async function updateProspectInstagramAction(
  id: string,
  rawInstagram: string
): Promise<ActionResult<{ id: string; instagram: string | null }>> {
  try {
    if (!id) {
      return { success: false, error: "ID do lead é obrigatório." };
    }

    const cleanHandle = sanitizeInstagramHandle(rawInstagram);
    const supabase = await createClient();

    // 1. Tenta atualizar a coluna instagram
    const { data: colData, error: colError } = await supabase
      .from("prospects")
      .update({
        instagram: cleanHandle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!colError) {
      revalidatePath("/prospeccao");
      revalidatePath("/comparativo");
      return {
        success: true,
        data: { id, instagram: cleanHandle },
      };
    }

    // 2. Fallback resiliente: salva dentro de notes como JSON
    console.warn("[updateProspectInstagramAction] Coluna instagram não encontrada, salvando em notes:", colError.message);

    const { data: current } = await supabase
      .from("prospects")
      .select("notes")
      .eq("id", id)
      .maybeSingle();

    let notesObj: Record<string, any> = {};
    try {
      notesObj = JSON.parse(current?.notes || "{}");
    } catch {
      notesObj = current?.notes ? { raw_note: current.notes } : {};
    }

    notesObj.instagram = cleanHandle;

    const { error: notesError } = await supabase
      .from("prospects")
      .update({
        notes: JSON.stringify(notesObj),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (notesError) {
      console.error("[updateProspectInstagramAction] Erro ao salvar em notes:", notesError);
      return { success: false, error: notesError.message };
    }

    revalidatePath("/prospeccao");
    revalidatePath("/comparativo");

    return {
      success: true,
      data: { id, instagram: cleanHandle },
    };
  } catch (err) {
    console.error("[updateProspectInstagramAction] Exceção:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar Instagram.",
    };
  }
}

/**
 * Remove um lead do pipeline de prospecção.
 */
export async function deleteProspectAction(id: string): Promise<ActionResult<boolean>> {
  try {
    if (!id) {
      return { success: false, error: "ID do lead é obrigatório." };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("prospects").delete().eq("id", id);

    if (error) {
      console.error("[deleteProspectAction] Erro:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/prospeccao");
    revalidatePath("/");

    return { success: true, data: true };
  } catch (err) {
    console.error("[deleteProspectAction] Exceção:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir lead.",
    };
  }
}

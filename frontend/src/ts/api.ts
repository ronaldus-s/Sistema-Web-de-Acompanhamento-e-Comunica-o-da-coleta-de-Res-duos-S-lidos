/**
 * Camada de dados (Firestore). Mesmas funções e DTOs do api.ts do Strapi,
 * então regiao.ts, aviso.ts, coleta.ts e mapa.ts continuam sem alteração.
 *
 * Coleções: regioes, avisos, coletas  (usuarios fica no auth.ts)
 * "documentId" = id do documento no Firestore.
 */
import { db } from "./firebase.js";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { auth } from "./firebase.js";

/* ---------- Tipos ---------- */

export type Situacao = "normal" | "atrasado" | "interrompido";

export interface RegiaoDTO {
  documentId: string;
  nome: string;
  dias: string;
  horario: string;
}

export interface AvisoDTO {
  documentId: string;
  titulo: string;
  msg: string;
  createdAt?: string; // ISO
}

export interface ColetaDTO {
  documentId?: string;
  rota: string;
  emAndamento: boolean;
  situacao?: Situacao;
  latitude?: number | null;
  longitude?: number | null;
  horaInicio?: string;
}

/** Timestamp do Firestore -> ISO (ou undefined enquanto o servidor ainda não gravou) */
function paraIso(valor: any): string | undefined {
  return valor && typeof valor.toDate === "function" ? valor.toDate().toISOString() : undefined;
}

/* ---------- Regiões ---------- */

export async function listarRegioes(): Promise<RegiaoDTO[]> {
  const snap = await getDocs(query(collection(db, "regioes"), orderBy("nome")));
  return snap.docs.map((d: any) => ({ documentId: d.id, ...d.data() }) as RegiaoDTO);
}

export async function criarRegiao(nome: string, dias: string, horario: string): Promise<void> {
  await addDoc(collection(db, "regioes"), { nome, dias, horario, criadoEm: serverTimestamp() });
}

export async function atualizarHorarioRegiao(documentId: string, horario: string): Promise<void> {
  await updateDoc(doc(db, "regioes", documentId), { horario });
}

export async function removerRegiaoPorId(documentId: string): Promise<void> {
  await deleteDoc(doc(db, "regioes", documentId));
}

/* ---------- Avisos ---------- */

export async function listarAvisos(): Promise<AvisoDTO[]> {
  const snap = await getDocs(query(collection(db, "avisos"), orderBy("createdAt", "desc")));
  return snap.docs.map((d: any) => {
    const dados = d.data();
    return { documentId: d.id, titulo: dados.titulo, msg: dados.msg, createdAt: paraIso(dados.createdAt) } as AvisoDTO;
  });
}

export async function criarAviso(titulo: string, msg: string): Promise<void> {
  await addDoc(collection(db, "avisos"), { titulo, msg, createdAt: serverTimestamp() });
}

export async function removerAvisoPorId(documentId: string): Promise<void> {
  await deleteDoc(doc(db, "avisos", documentId));
}

/* ---------- Coletas ---------- */

const CHAVE_COLETA_ATIVA = "coletaAtivaId";
const INTERVALO_ENVIO_MS = 10_000; // limita escritas (cota do plano gratuito)
let ultimoEnvio = 0;

function paraColeta(d: any): ColetaDTO {
  const x = d.data();
  return {
    documentId: d.id,
    rota: x.rota,
    emAndamento: !!x.emAndamento,
    situacao: (x.situacao as Situacao) || "normal",
    latitude: x.latitude ?? null,
    longitude: x.longitude ?? null,
    horaInicio: x.horaInicio,
  };
}

export function obterColetaAtivaIdLocal(): string | null {
  try { return localStorage.getItem(CHAVE_COLETA_ATIVA); } catch { return null; }
}

export async function iniciarColeta(rota: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sessão expirada. Entre novamente.");

  const ref = await addDoc(collection(db, "coletas"), {
    rota,
    emAndamento: true,
    situacao: "normal",
    latitude: null,
    longitude: null,
    coletorUid: uid,
    horaInicio: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  ultimoEnvio = 0; // a primeira posição sai na hora
  try { localStorage.setItem(CHAVE_COLETA_ATIVA, ref.id); } catch { /* ignora */ }
  return ref.id;
}

export async function atualizarPosicaoColeta(documentId: string, latitude: number, longitude: number): Promise<void> {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO_MS) return;
  ultimoEnvio = agora;
  await updateDoc(doc(db, "coletas", documentId), { latitude, longitude, atualizadoEm: serverTimestamp() });
}

export async function atualizarSituacaoColeta(documentId: string, situacao: Situacao): Promise<void> {
  await updateDoc(doc(db, "coletas", documentId), { situacao, atualizadoEm: serverTimestamp() });
}

export async function finalizarColeta(documentId: string): Promise<void> {
  try { localStorage.removeItem(CHAVE_COLETA_ATIVA); } catch { /* ignora */ }
  await updateDoc(doc(db, "coletas", documentId), { emAndamento: false, atualizadoEm: serverTimestamp() });
}

/** Coleta em andamento mais recente (ou null). Ordena no cliente para não exigir índice composto. */
export async function buscarColetaAtiva(): Promise<ColetaDTO | null> {
  const snap = await getDocs(query(collection(db, "coletas"), where("emAndamento", "==", true), limit(20)));
  if (snap.empty) return null;

  const ordenadas = snap.docs
    .map((d: any) => ({ d, t: d.data().atualizadoEm?.toMillis?.() ?? 0 }))
    .sort((a: any, b: any) => b.t - a.t);
  return paraColeta(ordenadas[0].d);
}

export async function listarColetas(): Promise<ColetaDTO[]> {
  const snap = await getDocs(query(collection(db, "coletas"), orderBy("criadoEm", "desc"), limit(50)));
  return snap.docs.map(paraColeta);
}

export async function removerColetaPorId(documentId: string): Promise<void> {
  await deleteDoc(doc(db, "coletas", documentId));
}

export async function forcarEncerrarColetaPorId(documentId: string): Promise<void> {
  await updateDoc(doc(db, "coletas", documentId), { emAndamento: false, atualizadoEm: serverTimestamp() });
}

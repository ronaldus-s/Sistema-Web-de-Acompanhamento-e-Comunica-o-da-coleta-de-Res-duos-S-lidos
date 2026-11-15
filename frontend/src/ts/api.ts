/**
 * Camada de dados (Firestore). Mesmas funções e DTOs do api.ts do Strapi,
 * então regiao.ts, aviso.ts, coleta.ts e mapa.ts continuam sem alteração.
 *
 * Coleções: regioes, avisos, coletas  (usuarios fica no auth.ts)
 * "documentId" = id do documento no Firestore.
 */
import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
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
const SEM_SINAL_MS = 10 * 60_000;  // coleta sem atualização há mais que isso não aparece mais no mapa
let ultimoEnvio = 0;

/** Coletas que o coletor já mandou encerrar: posições atrasadas do GPS são descartadas. */
const encerradas = new Set<string>();

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

/**
 * Encerra coletas que ficaram abertas por este coletor (aba fechada, celular sem bateria,
 * erro de rede ao encerrar). Sem isso elas continuam "em andamento" para sempre.
 */
export async function encerrarColetasAbertasDoColetor(uid?: string): Promise<void> {
  const dono = uid ?? auth.currentUser?.uid;
  if (!dono) return;

  const snap = await getDocs(
    query(collection(db, "coletas"), where("coletorUid", "==", dono), where("emAndamento", "==", true))
  );
  await Promise.all(
    snap.docs.map((d: any) => {
      encerradas.add(d.id);
      return updateDoc(d.ref, { emAndamento: false, atualizadoEm: serverTimestamp() });
    })
  );
  try { localStorage.removeItem(CHAVE_COLETA_ATIVA); } catch { /* ignora */ }
}

/** Esquece a coleta guardada neste celular (sem mexer no servidor). */
export function esquecerColetaLocal(): void {
  try { localStorage.removeItem(CHAVE_COLETA_ATIVA); } catch { /* ignora */ }
}

/** Lê uma coleta pelo id (usado para retomar a transmissão depois de recarregar a página). */
export async function buscarColetaPorId(documentId: string): Promise<ColetaDTO | null> {
  await auth.authStateReady?.(); // espera o Firebase restaurar o login antes de ler
  const snap = await getDoc(doc(db, "coletas", documentId));
  return snap.exists() ? paraColeta(snap) : null;
}

export async function iniciarColeta(rota: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sessão expirada. Entre novamente.");

  // Uma coleta aberta por coletor: limpa as que ficaram para trás.
  try { await encerrarColetasAbertasDoColetor(uid); } catch (e) { console.warn("Não foi possível limpar coletas antigas:", e); }

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
  if (encerradas.has(documentId)) return; // já encerrada: ignora posição que chegou atrasada

  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO_MS) return;
  ultimoEnvio = agora;
  await updateDoc(doc(db, "coletas", documentId), { latitude, longitude, atualizadoEm: serverTimestamp() });
}

export async function atualizarSituacaoColeta(documentId: string, situacao: Situacao): Promise<void> {
  await updateDoc(doc(db, "coletas", documentId), { situacao, atualizadoEm: serverTimestamp() });
}

/**
 * Só esquece a coleta local DEPOIS de o servidor confirmar. Antes, se a rede falhasse,
 * o celular "esquecia" a coleta e ela ficava aberta no servidor para sempre.
 * Em caso de erro, a exceção sobe para a tela avisar o coletor e ele poder tentar de novo.
 */
export async function finalizarColeta(documentId: string): Promise<void> {
  encerradas.add(documentId); // para de aceitar novas posições imediatamente
  try {
    await updateDoc(doc(db, "coletas", documentId), { emAndamento: false, atualizadoEm: serverTimestamp() });
  } catch (erro) {
    encerradas.delete(documentId); // falhou: continua valendo, o coletor pode tentar de novo
    throw erro;
  }
  try { localStorage.removeItem(CHAVE_COLETA_ATIVA); } catch { /* ignora */ }
}

/** Coleta em andamento mais recente (ou null). Ordena no cliente para não exigir índice composto. */
export async function buscarColetaAtiva(): Promise<ColetaDTO | null> {
  const snap = await getDocs(query(collection(db, "coletas"), where("emAndamento", "==", true), limit(20)));
  if (snap.empty) return null;

  // atualizadoEm ausente = o servidor ainda não gravou (acabou de ser escrito): conta como recente.
  const agora = Date.now();
  const recentes = snap.docs
    .map((d: any) => ({ d, t: d.data().atualizadoEm?.toMillis?.() ?? agora }))
    .filter((x: any) => agora - x.t < SEM_SINAL_MS) // celular desligou ou perdeu sinal: não mostra caminhão parado
    .sort((a: any, b: any) => b.t - a.t);

  return recentes.length ? paraColeta(recentes[0].d) : null;
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

/** Admin: encerra todas as coletas que estão "em andamento". Devolve quantas encerrou. */
export async function encerrarTodasColetasAbertas(): Promise<number> {
  const snap = await getDocs(query(collection(db, "coletas"), where("emAndamento", "==", true), limit(500)));
  await Promise.all(
    snap.docs.map((d: any) => updateDoc(d.ref, { emAndamento: false, atualizadoEm: serverTimestamp() }))
  );
  return snap.size;
}

/** Admin: apaga TODOS os registros de coleta. Devolve quantos apagou. */
export async function apagarTodasColetas(): Promise<number> {
  let total = 0;
  for (let rodada = 0; rodada < 20; rodada++) { // lotes de 500, com trava de segurança
    const snap = await getDocs(query(collection(db, "coletas"), limit(500)));
    if (snap.empty) break;
    await Promise.all(snap.docs.map((d: any) => deleteDoc(d.ref)));
    total += snap.size;
  }
  try { localStorage.removeItem(CHAVE_COLETA_ATIVA); } catch { /* ignora */ }
  return total;
}
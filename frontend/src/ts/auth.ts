/**
 * Autenticação com Firebase Authentication + perfil no Firestore (usuarios/{uid}).
 * Mantém as funções que as páginas já usam: exigirPerfil, exibirCabecalhoSessao, sair.
 *
 * O perfil em cache (localStorage) só serve para decidir rápido o redirecionamento.
 * Quem protege os dados de verdade são as regras do Firestore (firestore.rules).
 */
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export type Perfil = "usuario" | "coletor" | "admin";

export interface Sessao {
  uid: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

/* Ajuste aqui se renomear as páginas */
const PAGINA_LOGIN = "index.html";
const RAIZ = location.pathname.includes("/pages/") ? "../../" : "";
const DESTINO: Record<Perfil, string> = {
  usuario: "pages/publico/mapa.html",
  coletor: "pages/coletor/painel.html",
  admin: "pages/admin/regioes.html",
};
const NOMES_PERFIL: Record<Perfil, string> = {
  usuario: "Morador",
  coletor: "Coletor",
  admin: "Administrador",
};
const CHAVE_SESSAO = "sessao";

/* ---------- Sessão em cache ---------- */

export function obterSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}

function guardarSessao(s: Sessao): void {
  try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch { /* ignora */ }
}

function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
    localStorage.removeItem("coletaAtivaId");
  } catch { /* ignora */ }
}

export function destinoDoPerfil(perfil: Perfil): string {
  return RAIZ + DESTINO[perfil];
}

/* ---------- Erros em português ---------- */

export function traduzirErro(erro: any): string {
  const codigo: string = erro?.code ?? "";
  const mapa: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
    "auth/network-request-failed": "Sem conexão com a internet.",
    "permission-denied": "Você não tem permissão para fazer isso.",
  };
  return mapa[codigo] ?? erro?.message ?? "Algo deu errado. Tente novamente.";
}

/* ---------- Perfil no Firestore ---------- */

async function carregarPerfil(uid: string, emailAuth: string): Promise<Sessao> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) {
    throw new Error("Conta sem perfil no sistema. Peça ajuda ao administrador.");
  }
  const d = snap.data();
  return { uid, nome: d.nome ?? emailAuth, email: d.email ?? emailAuth, perfil: d.perfil as Perfil };
}

/* ---------- Login, cadastro, sair ---------- */

/** lembrar = true mantém a sessão ao fechar o navegador; false encerra ao fechar. */
export async function entrar(email: string, senha: string, lembrar = true): Promise<Sessao> {
  await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
  try {
    const sessao = await carregarPerfil(cred.user.uid, cred.user.email ?? email);
    guardarSessao(sessao);
    return sessao;
  } catch (e) {
    await signOut(auth);
    limparSessao();
    throw e;
  }
}

/**
 * Todo cadastro entra como "usuario" (as regras do Firestore exigem isso).
 * Quem pede para ser coletor fica em perfilSolicitado; o admin promove depois.
 */
export async function cadastrar(
  nome: string,
  email: string,
  senha: string,
  perfilSolicitado: "usuario" | "coletor" = "usuario"
): Promise<Sessao> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
  const nomeLimpo = nome.trim();

  await updateProfile(cred.user, { displayName: nomeLimpo });
  await setDoc(doc(db, "usuarios", cred.user.uid), {
    nome: nomeLimpo,
    email: email.trim(),
    perfil: "usuario",
    perfilSolicitado,
    criadoEm: serverTimestamp(),
  });

  const sessao: Sessao = { uid: cred.user.uid, nome: nomeLimpo, email: email.trim(), perfil: "usuario" };
  guardarSessao(sessao);
  return sessao;
}

export async function redefinirSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function sair(): Promise<void> {
  try { await signOut(auth); } catch (e) { console.error(e); }
  limparSessao();
  location.href = RAIZ + PAGINA_LOGIN;
}

/* ---------- Proteção de páginas ---------- */

/**
 * Chame no topo da página. Decide na hora pelo cache e depois confirma
 * com o Firebase (se o perfil mudou ou a sessão expirou, redireciona).
 */
export function exigirPerfil(permitidos: Perfil[]): void {
  const cache = obterSessao();

  if (!cache) {
    location.replace(RAIZ + PAGINA_LOGIN);
    return;
  }
  if (!permitidos.includes(cache.perfil)) {
    location.replace(destinoDoPerfil(cache.perfil));
    return;
  }

  // Confirmação assíncrona
  const cancelar = onAuthStateChanged(auth, async (usuario: any) => {
    cancelar();

    if (!usuario) {
      limparSessao();
      location.replace(RAIZ + PAGINA_LOGIN);
      return;
    }

    try {
      const atual = await carregarPerfil(usuario.uid, usuario.email ?? "");
      guardarSessao(atual);
      if (!permitidos.includes(atual.perfil)) {
        location.replace(destinoDoPerfil(atual.perfil));
      } else {
        exibirCabecalhoSessao();
      }
    } catch (e) {
      console.error(e);
    }
  });
}

/** Preenche #boas-vindas, #info-perfil e #badge-nivel (só o texto; não mexe nas classes). */
export function exibirCabecalhoSessao(): void {
  const s = obterSessao();
  if (!s) return;

  const primeiroNome = s.nome.split(" ")[0];
  const boasVindas = document.getElementById("boas-vindas");
  const info = document.getElementById("info-perfil");
  const badge = document.getElementById("badge-nivel");

  if (boasVindas) boasVindas.textContent = `Olá, ${primeiroNome}!`;
  if (info) info.textContent = s.email;
  if (badge) badge.textContent = NOMES_PERFIL[s.perfil];
}
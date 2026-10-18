/**
 * Tela de login (index.html). Substitui o antigo src/js/login.js.
 * No HTML:  <script type="module" src="src/ts/login.js"></script>
 */
import { entrar, redefinirSenha, destinoDoPerfil, traduzirErro } from "./auth.js";

declare const bootstrap: any;

const form = document.getElementById("loginForm") as HTMLFormElement | null;
const campoEmail = document.getElementById("usernameInput") as HTMLInputElement | null;
const campoSenha = document.getElementById("passwordInput") as HTMLInputElement | null;
const botaoOlho = document.getElementById("togglePasswordButton");
const iconeOlho = document.getElementById("togglePasswordIcon");
const linkEsqueci = document.getElementById("forgotPasswordLink");
const lembrarMe = document.getElementById("rememberMe") as HTMLInputElement | null;
const toastEl = document.getElementById("appToast");
const toastTexto = document.getElementById("toastText");

/* Notificação (usa textContent: nada do que o usuário digita vira HTML) */
function notificar(mensagem: string, cor = "bg-success", icone = "bi-info-circle-fill"): void {
  if (!toastEl || !toastTexto) {
    alert(mensagem);
    return;
  }
  toastEl.className = `toast align-items-center text-white ${cor} border-0 rounded-3 shadow-lg`;

  const i = document.createElement("i");
  i.className = `bi ${icone} fs-5`;
  const span = document.createElement("span");
  span.textContent = mensagem;
  toastTexto.replaceChildren(i, span);

  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4500 }).show();
}

/* Mostrar / ocultar senha */
botaoOlho?.addEventListener("click", () => {
  if (!campoSenha) return;
  const oculta = campoSenha.type === "password";
  campoSenha.type = oculta ? "text" : "password";
  if (iconeOlho) iconeOlho.className = oculta ? "bi bi-eye-slash" : "bi bi-eye";
  botaoOlho.setAttribute("aria-label", oculta ? "Ocultar senha" : "Mostrar senha");
});

/* Entrar */
form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = campoEmail?.value.trim() ?? "";
  const senha = campoSenha?.value ?? "";

  if (!email || !senha) {
    notificar("Informe e-mail e senha para continuar.", "bg-danger", "bi-exclamation-triangle-fill");
    return;
  }

  const botao = form.querySelector("button[type=submit]") as HTMLButtonElement;
  botao.disabled = true;

  try {
    const sessao = await entrar(email, senha, lembrarMe?.checked ?? true);
    notificar(`Bem-vindo(a), ${sessao.nome.split(" ")[0]}!`, "bg-success", "bi-check-circle-fill");
    setTimeout(() => { location.href = destinoDoPerfil(sessao.perfil); }, 600);
  } catch (erro) {
    console.error(erro);
    notificar(traduzirErro(erro), "bg-danger", "bi-exclamation-triangle-fill");
    botao.disabled = false;
  }
});

/* Esqueci a senha: o Firebase envia o e-mail de redefinição */
linkEsqueci?.addEventListener("click", async (evento) => {
  evento.preventDefault();

  const email = campoEmail?.value.trim() ?? "";
  if (!email) {
    notificar("Digite seu e-mail no campo acima e clique em \"Esqueceu a senha?\" de novo.", "bg-primary");
    return;
  }

  try {
    await redefinirSenha(email);
  } catch (erro) {
    // Não revelamos se o e-mail existe; só avisamos de erros de formato/rede.
    const codigo = (erro as { code?: string }).code;
    if (codigo === "auth/invalid-email" || codigo === "auth/network-request-failed") {
      notificar(traduzirErro(erro), "bg-danger", "bi-exclamation-triangle-fill");
      return;
    }
    console.error(erro);
  }
  notificar("Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.", "bg-primary");
});
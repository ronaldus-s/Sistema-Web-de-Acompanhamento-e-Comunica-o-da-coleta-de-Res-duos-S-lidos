/**
 * Tela de cadastro (a página que hoje está em login.html).
 * No HTML use:  <script type="module" src="src/ts/cadastro.js"></script>
 */
import { cadastrar, destinoDoPerfil, traduzirErro } from "./auth.js";

const form = document.getElementById("cadastroForm") as HTMLFormElement | null;
const campoSenha = document.getElementById("senha") as HTMLInputElement | null;
const botaoOlho = document.getElementById("toggleSenha");
const iconeOlho = document.getElementById("iconeSenha");

/* Mostrar / ocultar senha */
botaoOlho?.addEventListener("click", () => {
  if (!campoSenha) return;
  const mostrar = campoSenha.type === "password";
  campoSenha.type = mostrar ? "text" : "password";
  iconeOlho?.classList.toggle("bi-eye", !mostrar);
  iconeOlho?.classList.toggle("bi-eye-slash", mostrar);
});

/* Mensagem de erro/sucesso (criada aqui para não depender do HTML) */
function mostrarMensagem(texto: string, tipo: "erro" | "sucesso"): void {
  let el = document.getElementById("cadastro-msg");
  if (!el) {
    el = document.createElement("div");
    el.id = "cadastro-msg";
    el.setAttribute("role", "alert");
    form?.querySelector("button[type=submit]")?.before(el);
  }
  const cores = tipo === "erro"
    ? { fundo: "#fee2e2", texto: "#991b1b", borda: "#fca5a5" }
    : { fundo: "#d1fae5", texto: "#065f46", borda: "#6ee7b7" };

  el.textContent = texto;
  el.style.cssText = `background:${cores.fundo};color:${cores.texto};border:1px solid ${cores.borda};` +
    "border-radius:14px;padding:.8rem 1rem;margin-bottom:1rem;font-size:.88rem;font-weight:600;";
}

form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = (document.getElementById("nome") as HTMLInputElement).value.trim();
  const email = (document.getElementById("email") as HTMLInputElement).value.trim();
  const senha = (document.getElementById("senha") as HTMLInputElement).value;
  const confirmar = (document.getElementById("confirmarSenha") as HTMLInputElement).value;
  const perfil = (document.getElementById("perfil") as HTMLSelectElement).value as "usuario" | "coletor";

  if (nome.length < 3) return mostrarMensagem("Informe seu nome completo.", "erro");
  if (senha.length < 6) return mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", "erro");
  if (senha !== confirmar) return mostrarMensagem("As senhas não coincidem.", "erro");
  if (!perfil) return mostrarMensagem("Selecione o tipo de acesso.", "erro");

  const botao = form.querySelector("button[type=submit]") as HTMLButtonElement;
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Criando conta...";

  try {
    const sessao = await cadastrar(nome, email, senha, perfil);

    mostrarMensagem(
      perfil === "coletor"
        ? "Conta criada! O acesso de coletor precisa ser liberado por um administrador. Por enquanto você entra como morador."
        : "Conta criada com sucesso! Redirecionando...",
      "sucesso"
    );
    setTimeout(() => { location.href = destinoDoPerfil(sessao.perfil); }, perfil === "coletor" ? 3500 : 900);
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(traduzirErro(erro), "erro");
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
});

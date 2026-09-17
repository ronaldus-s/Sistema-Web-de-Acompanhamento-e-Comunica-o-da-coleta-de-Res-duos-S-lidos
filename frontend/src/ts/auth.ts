import { salvarSessao, obterSessao, encerrarSessao } from './api.js';

// Adaptado do script.js antigo: os campos mudaram de
// 'identifier' / 'perfil-selecionado' para 'email' / 'senha' / 'perfil',
// que são os IDs reais usados no login.html atual.
export function realizarLogin(event: Event): void {
  event.preventDefault();

  const email = (document.getElementById('email') as HTMLInputElement).value;
  const perfil = (document.getElementById('perfil') as HTMLSelectElement).value;

  salvarSessao(email, perfil);

  const destino =
    perfil === 'admin' ? 'pages/admin/aviso.html' :
    perfil === 'coletor' ? 'pages/coletor/painel.html' :
    'pages/publico/avisos.html';

  window.location.href = destino;
}

export function sair(): void {
  encerrarSessao();
  window.location.href = '../../login.html';
}

export function exibirCabecalhoSessao(): void {
  const { usuario, perfil } = obterSessao();

  const boasVindas = document.getElementById('boas-vindas');
  const infoPerfil = document.getElementById('info-perfil');
  const badgeNivel = document.getElementById('badge-nivel');

  if (boasVindas) boasVindas.innerText = `Olá, ${usuario}!`;
  if (infoPerfil) infoPerfil.innerText = 'Sessão ativa no Sistema de Coleta Sólida de Quixadá.';
  if (badgeNivel) badgeNivel.innerText = perfil.toUpperCase();
}

/** Redireciona para o login se o perfil da sessão não estiver entre os permitidos. */
export function exigirPerfil(perfisPermitidos: string[]): void {
  const { perfil } = obterSessao();
  if (!perfisPermitidos.includes(perfil)) {
    window.location.href = '../../login.html';
  }
}

(window as any).realizarLogin = realizarLogin;
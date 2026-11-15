import {
  iniciarColeta,
  atualizarPosicaoColeta,
  atualizarSituacaoColeta,
  finalizarColeta,
  encerrarColetasAbertasDoColetor,
  buscarColetaPorId,
  esquecerColetaLocal,
  obterColetaAtivaIdLocal,
  listarColetas,
  removerColetaPorId,
  forcarEncerrarColetaPorId,
  encerrarTodasColetasAbertas,
  apagarTodasColetas,
  type ColetaDTO,
} from './api.js';

/* ---------- Estado da transmissão (painel do coletor) ---------- */

let watchId: number | null = null;       // GPS ligado
let batimentoId: number | null = null;   // reenvia a última posição se o caminhão ficar parado
let coletaAtualId: string | null = null; // coleta que esta aba está transmitindo
let ultimaPosicao: { lat: number; lng: number } | null = null;
let iniciando = false;
let avisouErroGps = false;
let wakeLock: any = null;                // mantém a tela acesa (celular bloqueado = GPS parado)

const BATIMENTO_MS = 60_000;

function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function manterTelaAcesa(): Promise<void> {
  try {
    if (!('wakeLock' in navigator)) return;
    try { wakeLock?.release(); } catch { /* ignora */ }
    wakeLock = await (navigator as any).wakeLock.request('screen');
  } catch {
    /* sem suporte ou negado: segue sem */
  }
}

function liberarTela(): void {
  try { wakeLock?.release(); } catch { /* ignora */ }
  wakeLock = null;
}

// O navegador solta o "tela acesa" quando a aba some; pedimos de novo ao voltar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && coletaAtualId) manterTelaAcesa();
});

/** Desliga TUDO que envia posição: GPS, batimento e tela acesa. Seguro chamar várias vezes. */
function pararTransmissao(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (batimentoId !== null) {
    clearInterval(batimentoId);
    batimentoId = null;
  }
  coletaAtualId = null;
  ultimaPosicao = null;
  liberarTela();
}

/** Liga o GPS para uma coleta. Sempre desliga o anterior antes: nunca existem dois GPS ligados. */
function comecarTransmissao(documentId: string, rota: string, inicio: string): void {
  pararTransmissao();
  coletaAtualId = documentId;
  avisouErroGps = false;

  watchId = navigator.geolocation.watchPosition(
    (posicao) => {
      // Leitura que chegou depois de encerrar: ignora (e não reescreve a tela).
      if (coletaAtualId !== documentId) return;

      ultimaPosicao = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
      atualizarPosicaoColeta(documentId, ultimaPosicao.lat, ultimaPosicao.lng).catch(console.error);
      atualizarTabela(rota, `Transmitindo desde ${inicio}`, 'Transmitindo ao Vivo', 'bg-success');
    },
    (erro) => {
      console.error('Erro ao obter localização:', erro);
      // Só avisa (uma vez) quando a permissão foi negada. Timeout e sinal fraco se resolvem sozinhos.
      if (erro.code === 1 && !avisouErroGps) {
        avisouErroGps = true;
        alert('Não foi possível acessar sua localização. Verifique as permissões do navegador.');
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );

  // Caminhão parado: o GPS pode não avisar nada. Reenviamos a última posição para a coleta não "expirar".
  batimentoId = window.setInterval(() => {
    if (coletaAtualId === documentId && ultimaPosicao) {
      atualizarPosicaoColeta(documentId, ultimaPosicao.lat, ultimaPosicao.lng).catch(console.error);
    }
  }, BATIMENTO_MS);

  manterTelaAcesa();
}

/* ---------- Ações do coletor ---------- */

export async function iniciarRotaColetor(): Promise<void> {
  if (iniciando || coletaAtualId) {
    alert('Já existe uma transmissão em andamento. Cancele a atual antes de iniciar outra.');
    return;
  }

  const rota = (document.getElementById('coletor-rota') as HTMLSelectElement).value;

  if (!('geolocation' in navigator)) {
    alert('Seu navegador não suporta geolocalização.');
    return;
  }

  iniciando = true;
  try {
    const documentId = await iniciarColeta(rota);
    comecarTransmissao(documentId, rota, horaAgora());
  } catch (erro) {
    console.error(erro);
    alert((erro as Error)?.message || 'Não foi possível iniciar a transmissão. Tente novamente.');
  } finally {
    iniciando = false;
  }
}

export async function cancelarRotaColetor(): Promise<void> {
  const documentId = coletaAtualId ?? obterColetaAtivaIdLocal();

  pararTransmissao(); // primeiro desliga o GPS

  try {
    if (documentId) {
      await finalizarColeta(documentId);
    } else {
      // Sem id neste celular: encerra qualquer coleta que ainda esteja aberta para este coletor.
      await encerrarColetasAbertasDoColetor();
    }
  } catch (erro) {
    console.error(erro);
    atualizarTabela('-', '-', 'Falha ao encerrar', 'bg-warning text-dark');
    alert('Não foi possível encerrar agora (sem conexão?). Toque em cancelar de novo quando a internet voltar.');
    return;
  }

  atualizarTabela('-', '-', 'Transmissão Encerrada', 'bg-danger');
  alert('Transmissão da rota cancelada com sucesso!');
}

/**
 * Se o coletor recarregou a página (ou voltou a ela) com uma coleta ainda aberta,
 * retoma a transmissão. Se a coleta já foi encerrada (ex.: pelo admin), só limpa o celular.
 */
async function retomarTransmissaoSeHouver(): Promise<void> {
  if (!document.getElementById('coletor-rota')) return; // só vale no painel do coletor

  const documentId = obterColetaAtivaIdLocal();
  if (!documentId || !('geolocation' in navigator)) return;

  try {
    const coleta = await buscarColetaPorId(documentId);
    if (coleta && coleta.emAndamento) {
      comecarTransmissao(documentId, coleta.rota, coleta.horaInicio ?? '--:--');
      atualizarTabela(coleta.rota, `Transmitindo desde ${coleta.horaInicio ?? '--:--'}`, 'Transmitindo ao Vivo', 'bg-success');
    } else {
      esquecerColetaLocal();
    }
  } catch (erro) {
    console.warn('Não foi possível retomar a transmissão:', erro);
  }
}

document.addEventListener('DOMContentLoaded', retomarTransmissaoSeHouver);

export async function informarAtraso(): Promise<void> {
  const documentId = obterColetaAtivaIdLocal();
  if (!documentId) {
    alert('Inicie a transmissão antes de informar um atraso.');
    return;
  }
  await atualizarSituacaoColeta(documentId, 'atrasado');
  atualizarBadgeSituacao('Atrasado', 'bg-warning text-dark');
}

export async function informarInterrupcao(): Promise<void> {
  const documentId = obterColetaAtivaIdLocal();
  if (!documentId) {
    alert('Inicie a transmissão antes de informar uma interrupção.');
    return;
  }
  await atualizarSituacaoColeta(documentId, 'interrompido');
  atualizarBadgeSituacao('Interrompido', 'bg-danger');
}

export async function normalizarSituacao(): Promise<void> {
  const documentId = obterColetaAtivaIdLocal();
  if (!documentId) return;
  await atualizarSituacaoColeta(documentId, 'normal');
  atualizarBadgeSituacao('Normal', 'bg-success');
}

function atualizarTabela(rota: string, inicio: string, statusTexto: string, statusClasse: string): void {
  const tabelaRota = document.getElementById('tabela-rota');
  const tabelaInicio = document.getElementById('tabela-inicio');
  const tabelaStatus = document.getElementById('tabela-status');

  if (tabelaRota) tabelaRota.innerText = rota;
  if (tabelaInicio) tabelaInicio.innerText = inicio;
  if (tabelaStatus) {
    tabelaStatus.innerText = statusTexto;
    tabelaStatus.className = `badge ${statusClasse}`;
  }
}

function atualizarBadgeSituacao(texto: string, classe: string): void {
  const badge = document.getElementById('badge-situacao');
  if (badge) {
    badge.innerText = texto;
    badge.className = `badge ${classe}`;
  }
}

function esc(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- Painel do administrador ---------- */

/** Cria (uma vez) os botões de ação em lote acima da tabela de coletas. */
function garantirBarraAcoes(tbody: HTMLElement): void {
  if (document.getElementById('barra-acoes-coletas')) return;

  const alvo = tbody.closest('table')?.parentElement;
  if (!alvo) return;

  const barra = document.createElement('div');
  barra.id = 'barra-acoes-coletas';
  barra.className = 'd-flex flex-wrap gap-2 justify-content-end px-3 py-3';
  barra.innerHTML = `
    <button type="button" id="btn-encerrar-todas" class="btn btn-sm btn-outline-warning">
      <i class="bi bi-stop-circle me-1"></i>Encerrar todas abertas</button>
    <button type="button" id="btn-apagar-todas" class="btn btn-sm btn-outline-danger">
      <i class="bi bi-trash me-1"></i>Apagar todas</button>`;
  alvo.insertAdjacentElement('beforebegin', barra);

  barra.querySelector('#btn-encerrar-todas')?.addEventListener('click', encerrarTodasColetas);
  barra.querySelector('#btn-apagar-todas')?.addEventListener('click', apagarTodasAsColetas);
}

function atualizarBarraAcoes(total: number, abertas: number): void {
  const encerrar = document.getElementById('btn-encerrar-todas') as HTMLButtonElement | null;
  const apagar = document.getElementById('btn-apagar-todas') as HTMLButtonElement | null;

  if (encerrar) {
    encerrar.disabled = abertas === 0;
    encerrar.innerHTML = `<i class="bi bi-stop-circle me-1"></i>Encerrar todas abertas (${abertas})`;
  }
  if (apagar) {
    apagar.disabled = total === 0;
    apagar.innerHTML = `<i class="bi bi-trash me-1"></i>Apagar todas (${total})`;
  }
}

export async function carregarColetasAdmin(): Promise<void> {
  const tbody = document.getElementById('tabela-coletas-admin');
  if (!tbody) return;

  garantirBarraAcoes(tbody);

  let coletas: ColetaDTO[];
  try {
    coletas = await listarColetas();
  } catch (erro) {
    console.error(erro);
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger small text-center py-4">
      <i class="bi bi-wifi-off me-1"></i>Não foi possível carregar as coletas.</td></tr>`;
    return;
  }

  atualizarBarraAcoes(coletas.length, coletas.filter((c) => c.emAndamento).length);

  if (coletas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted small text-center py-4">Nenhuma coleta registrada ainda.</td></tr>`;
    return;
  }

  const situacaoBadges: Record<string, string> = {
    normal: '<span class="sit-badge sit-normal"><i class="bi bi-check-circle-fill"></i>Normal</span>',
    atrasado: '<span class="sit-badge sit-atrasado"><i class="bi bi-clock-history"></i>Atrasado</span>',
    interrompido: '<span class="sit-badge sit-interrompido"><i class="bi bi-exclamation-octagon-fill"></i>Interrompido</span>',
  };

  tbody.innerHTML = coletas.map((c: ColetaDTO) => `
    <tr>
      <td data-label="Rota">${esc(c.rota)}</td>
      <td data-label="Status">
        ${c.emAndamento
          ? '<span class="status-pill estado-ativo">Em andamento</span>'
          : '<span class="status-pill estado-aguardando">Encerrada</span>'}
      </td>
      <td data-label="Situação">${situacaoBadges[c.situacao || 'normal'] ?? situacaoBadges['normal']}</td>
      <td data-label="Última posição">
        ${c.latitude != null && c.longitude != null
          ? `<span class="coord-chip"><i class="bi bi-geo-alt"></i>${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}</span>`
          : '<span class="text-muted">-</span>'}
      </td>
      <td data-label="Ações">
        <div class="acoes-linha">
          ${c.emAndamento && c.documentId
            ? `<button class="btn-icone warn" title="Forçar encerramento" onclick="forcarEncerrarColeta('${esc(c.documentId)}')"><i class="bi bi-stop-circle"></i></button>`
            : ''}
          ${c.documentId
            ? `<button class="btn-icone danger" title="Apagar registro" onclick="removerColeta('${esc(c.documentId)}')"><i class="bi bi-trash"></i></button>`
            : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

export async function removerColeta(documentId: string): Promise<void> {
  if (!confirm('Apagar este registro de coleta permanentemente?')) return;
  await removerColetaPorId(documentId);
  await carregarColetasAdmin();
}

export async function forcarEncerrarColeta(documentId: string): Promise<void> {
  if (!confirm('Forçar o encerramento desta coleta? (útil se o coletor esqueceu de cancelar)')) return;
  await forcarEncerrarColetaPorId(documentId);
  await carregarColetasAdmin();
}

export async function encerrarTodasColetas(): Promise<void> {
  if (!confirm('Encerrar TODAS as coletas que estão em andamento?')) return;
  try {
    const qtd = await encerrarTodasColetasAbertas();
    alert(`${qtd} coleta(s) encerrada(s).`);
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível encerrar agora. Tente novamente.');
  }
  await carregarColetasAdmin();
}

export async function apagarTodasAsColetas(): Promise<void> {
  if (!confirm('Apagar TODOS os registros de coleta? Isso não pode ser desfeito.')) return;
  try {
    const qtd = await apagarTodasColetas();
    alert(`${qtd} registro(s) apagado(s).`);
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível apagar agora. Tente novamente.');
  }
  await carregarColetasAdmin();
}

(window as any).removerColeta = removerColeta;
(window as any).forcarEncerrarColeta = forcarEncerrarColeta;

(window as any).iniciarRotaColetor = iniciarRotaColetor;
(window as any).cancelarRotaColetor = cancelarRotaColetor;
(window as any).informarAtraso = informarAtraso;
(window as any).informarInterrupcao = informarInterrupcao;
(window as any).normalizarSituacao = normalizarSituacao;
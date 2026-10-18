import {
  iniciarColeta,
  atualizarPosicaoColeta,
  atualizarSituacaoColeta,
  finalizarColeta,
  obterColetaAtivaIdLocal,
  listarColetas,
  removerColetaPorId,
  forcarEncerrarColetaPorId,
  type ColetaDTO,
} from './api.js';

let watchId: number | null = null;

export async function iniciarRotaColetor(): Promise<void> {
  const rota = (document.getElementById('coletor-rota') as HTMLSelectElement).value;

  if (!('geolocation' in navigator)) {
    alert('Seu navegador não suporta geolocalização.');
    return;
  }

  const documentId = await iniciarColeta(rota);

  watchId = navigator.geolocation.watchPosition(
    (posicao) => {
      atualizarPosicaoColeta(documentId, posicao.coords.latitude, posicao.coords.longitude);
      atualizarTabela(rota, `Transmitindo desde ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'Transmitindo ao Vivo', 'bg-success');
    },
    (erro) => {
      console.error('Erro ao obter localização:', erro);
      alert('Não foi possível acessar sua localização. Verifique as permissões do navegador.');
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

export async function cancelarRotaColetor(): Promise<void> {
  const documentId = obterColetaAtivaIdLocal();

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (documentId) {
    await finalizarColeta(documentId);
  }

  atualizarTabela('-', '-', 'Transmissão Encerrada', 'bg-danger');
  alert('Transmissão da rota cancelada com sucesso!');
}

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

export async function carregarColetasAdmin(): Promise<void> {
  const tbody = document.getElementById('tabela-coletas-admin');
  if (!tbody) return;

  let coletas: ColetaDTO[];
  try {
    coletas = await listarColetas();
  } catch (erro) {
    console.error(erro);
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger small text-center py-4">
      <i class="bi bi-wifi-off me-1"></i>Não foi possível carregar as coletas.</td></tr>`;
    return;
  }

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

(window as any).removerColeta = removerColeta;
(window as any).forcarEncerrarColeta = forcarEncerrarColeta;

(window as any).iniciarRotaColetor = iniciarRotaColetor;
(window as any).cancelarRotaColetor = cancelarRotaColetor;
(window as any).informarAtraso = informarAtraso;
(window as any).informarInterrupcao = informarInterrupcao;
(window as any).normalizarSituacao = normalizarSituacao;
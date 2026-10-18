import { buscarColetaAtiva } from './api.js';

declare const L: any;

type EstadoGps = 'inativo' | 'aguardando' | 'ativo' | 'negado' | 'erro';

let mapa: any;
let marcadorCaminhao: any;
let marcadorUsuario: any;
let posicaoUsuario: [number, number] | null = null;
let posicaoCaminhao: [number, number] | null = null;
let jaCentralizouNoCaminhao = false;
let observadorGps: number | null = null;
let estadoGps: EstadoGps = 'inativo';

function esc(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const iconeCaminhao = () =>
  L.divIcon({
    className: 'marcador-wrap',
    html: '<div class="marcador-caminhao"><i class="bi bi-truck-front-fill"></i></div>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

const iconeUsuario = () =>
  L.divIcon({
    className: 'marcador-wrap',
    html: '<div class="marcador-usuario"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export function inicializarMapaMorador(): void {
  mapa = L.map('mapa').setView([-4.9689, -39.0161], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(mapa);

  configurarBotoes();
  renderizarDistancia();
  prepararLocalizacao();
  atualizarPosicaoNoMapa();
  setInterval(atualizarPosicaoNoMapa, 5000);
}

function configurarBotoes(): void {
  document.getElementById('btn-ver-caminhao')?.addEventListener('click', () => {
    if (marcadorCaminhao) mapa.flyTo(marcadorCaminhao.getLatLng(), 16);
  });

  // Este clique conta como "gesto do usuário", que os celulares exigem para pedir permissão.
  document.getElementById('btn-ver-eu')?.addEventListener('click', () => {
    if (posicaoUsuario) mapa.flyTo(posicaoUsuario, 16);
    else iniciarLocalizacaoUsuario();
  });

  // O conteúdo da linha de distância é recriado a cada atualização: delegamos o clique.
  document.getElementById('distancia-caminhao')?.addEventListener('click', (evento) => {
    if ((evento.target as HTMLElement).closest('#btn-ativar-localizacao')) {
      iniciarLocalizacaoUsuario();
    }
  });
}

/**
 * Celulares costumam ignorar pedidos de localização feitos ao abrir a página (sem toque).
 * Por isso: se a permissão já foi dada, começamos sozinhos; senão, esperamos o toque no botão.
 */
async function prepararLocalizacao(): Promise<void> {
  try {
    const permissao = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

    if (permissao.state === 'granted') {
      iniciarLocalizacaoUsuario();
    } else if (permissao.state === 'denied') {
      estadoGps = 'negado';
      renderizarDistancia();
    }

    permissao.onchange = () => {
      if (permissao.state === 'granted') iniciarLocalizacaoUsuario();
    };
  } catch {
    // Navegador sem Permissions API para localização: o botão resolve.
  }
}

function iniciarLocalizacaoUsuario(): void {
  if (observadorGps !== null) {
    if (estadoGps !== 'erro') return;
    navigator.geolocation.clearWatch(observadorGps); // "Tentar de novo"
    observadorGps = null;
  }

  if (!('geolocation' in navigator)) {
    estadoGps = 'erro';
    renderizarDistancia();
    return;
  }

  estadoGps = 'aguardando';
  renderizarDistancia();

  observadorGps = navigator.geolocation.watchPosition(
    (posicao) => {
      posicaoUsuario = [posicao.coords.latitude, posicao.coords.longitude];
      estadoGps = 'ativo';

      if (!marcadorUsuario) {
        marcadorUsuario = L.marker(posicaoUsuario, { icon: iconeUsuario() }).addTo(mapa);
        marcadorUsuario.bindPopup('Você está aqui');
        if (!posicaoCaminhao) mapa.setView(posicaoUsuario, 15);
      } else {
        marcadorUsuario.setLatLng(posicaoUsuario);
      }
      renderizarDistancia();
    },
    (erro) => {
      console.warn('Não foi possível obter sua localização:', erro.message);

      if (erro.code === 1) {
        // Permissão negada: não adianta continuar tentando.
        if (observadorGps !== null) navigator.geolocation.clearWatch(observadorGps);
        observadorGps = null;
        estadoGps = 'negado';
      } else if (!posicaoUsuario) {
        estadoGps = 'erro';
      }
      renderizarDistancia();
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

/** Fórmula de Haversine: distância em linha reta (km) entre duas coordenadas */
function calcularDistanciaKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function htmlSemPosicao(): string {
  switch (estadoGps) {
    case 'negado':
      return `<i class="bi bi-geo-alt-fill"></i>
        <span class="text-danger">Localização bloqueada. Toque no cadeado, ao lado do endereço do site, e permita a localização.</span>`;
    case 'aguardando':
      return `<i class="bi bi-hourglass-split"></i>
        <span class="text-muted">Obtendo sua localização...</span>`;
    case 'erro':
      return `<i class="bi bi-geo-alt"></i>
        <span class="text-muted">Não foi possível obter sua localização.
        <button type="button" id="btn-ativar-localizacao" class="btn-link-gps">Tentar de novo</button></span>`;
    default:
      return `<button type="button" id="btn-ativar-localizacao" class="btn-ativar-gps">
        <i class="bi bi-crosshair"></i>Ativar minha localização</button>`;
  }
}

/** Linha "Distância até você": mostra a distância, ou o botão/aviso de localização. */
function renderizarDistancia(): void {
  const el = document.getElementById('distancia-caminhao');
  if (!el) return;

  if (!posicaoUsuario) {
    el.innerHTML = htmlSemPosicao();
    return;
  }

  if (!posicaoCaminhao) {
    el.innerHTML = '';
    return;
  }

  const distanciaKm = calcularDistanciaKm(posicaoUsuario, posicaoCaminhao);
  const texto = distanciaKm < 1
    ? `${Math.round(distanciaKm * 1000)} m`
    : `${distanciaKm.toFixed(1)} km`;
  el.innerHTML = `
    <i class="bi bi-signpost-split"></i>
    <span>Distância até você <strong>${texto}</strong> <small>(linha reta)</small></span>`;
}

const situacaoBadges: Record<string, string> = {
  normal: '<span class="sit-badge sit-normal"><i class="bi bi-check-circle-fill"></i>Normal</span>',
  atrasado: '<span class="sit-badge sit-atrasado"><i class="bi bi-clock-history"></i>Atrasado</span>',
  interrompido: '<span class="sit-badge sit-interrompido"><i class="bi bi-exclamation-octagon-fill"></i>Interrompido</span>',
};

function marcarHoraAtualizacao(): void {
  const el = document.getElementById('ultima-atualizacao');
  if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function atualizarPosicaoNoMapa(): Promise<void> {
  const status = document.getElementById('status-coleta');

  let coleta;
  try {
    coleta = await buscarColetaAtiva();
  } catch (erro) {
    console.error(erro);
    if (status) {
      status.className = 'status-line is-error';
      status.innerHTML = '<i class="bi bi-wifi-off"></i>Não foi possível atualizar. Tentando novamente...';
    }
    return;
  }

  marcarHoraAtualizacao();

  if (!coleta || coleta.latitude == null || coleta.longitude == null) {
    if (status) {
      status.className = 'status-line is-idle';
      status.innerHTML = '<i class="bi bi-moon-stars"></i>Nenhuma coleta em andamento no momento.';
    }
    posicaoCaminhao = null;
    renderizarDistancia();
    if (marcadorCaminhao) {
      mapa.removeLayer(marcadorCaminhao);
      marcadorCaminhao = null;
    }
    jaCentralizouNoCaminhao = false;
    return;
  }

  posicaoCaminhao = [coleta.latitude, coleta.longitude];
  const badgeSituacao = situacaoBadges[coleta.situacao || 'normal'] ?? situacaoBadges['normal'];

  if (status) {
    status.className = 'status-line is-active';
    status.innerHTML = `<i class="bi bi-broadcast"></i>Rota ativa: <strong>${esc(coleta.rota)}</strong> ${badgeSituacao}`;
  }

  renderizarDistancia();

  if (!marcadorCaminhao) {
    marcadorCaminhao = L.marker(posicaoCaminhao, { icon: iconeCaminhao() }).addTo(mapa);
    marcadorCaminhao.bindPopup('<b>Caminhão de Coleta</b><br>Em operação');
  } else {
    marcadorCaminhao.setLatLng(posicaoCaminhao);
  }

  // Centraliza só na primeira vez, para o morador poder navegar livremente
  if (!jaCentralizouNoCaminhao) {
    mapa.setView(posicaoCaminhao, 15);
    jaCentralizouNoCaminhao = true;
  }
}

document.addEventListener('DOMContentLoaded', inicializarMapaMorador);
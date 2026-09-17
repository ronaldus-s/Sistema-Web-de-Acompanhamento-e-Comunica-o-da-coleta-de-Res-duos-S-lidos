// Depende do Leaflet, carregado globalmente via <script> no HTML.
declare const L: any;

export function inicializarMapaMorador(): void {
  const mapa = L.map('mapa').setView([-4.9689, -39.0161], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

  const iconePontoVermelho = L.divIcon({
    className: 'ponto-vermelho',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  const marcadorCaminhao = L.marker([-4.9689, -39.0161], { icon: iconePontoVermelho }).addTo(mapa);
  marcadorCaminhao.bindPopup('<b>Caminhão de Coleta</b><br>Status: Em Operação');

  const rotaColeta: [number, number][] = [
    [-4.9689, -39.0161],
    [-4.9700, -39.0150],
    [-4.9720, -39.0135],
    [-4.9740, -39.0125],
    [-4.9750, -39.0120],
  ];

  let passo = 0;
  setInterval(() => {
    marcadorCaminhao.setLatLng(rotaColeta[passo % rotaColeta.length]);
    passo++;
  }, 3000);
}

document.addEventListener('DOMContentLoaded', inicializarMapaMorador);
import { salvarStatusRota, obterStatusRota, removerStatusRota } from './api.js';

export function iniciarRotaColetor(): void {
  const rota = (document.getElementById('coletor-rota') as HTMLSelectElement).value;
  const horaInicio = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  atualizarTabela(rota, `Caminhão em rota desde ${horaInicio}`, 'Transmitindo ao Vivo', 'bg-success');
  salvarStatusRota({ rota, horaInicio, emAndamento: true });
}

export function cancelarRotaColetor(): void {
  atualizarTabela('-', '-', 'Transmissão Encerrada', 'bg-danger');
  removerStatusRota();
  alert('Transmissão da rota cancelada com sucesso!');
}

export function carregarStatusColetor(): void {
  const status = obterStatusRota();
  if (status) {
    atualizarTabela(status.rota, `Caminhão em rota desde ${status.horaInicio}`, 'Transmitindo ao Vivo', 'bg-success');
  }
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

document.addEventListener('DOMContentLoaded', carregarStatusColetor);

(window as any).iniciarRotaColetor = iniciarRotaColetor;
(window as any).cancelarRotaColetor = cancelarRotaColetor;
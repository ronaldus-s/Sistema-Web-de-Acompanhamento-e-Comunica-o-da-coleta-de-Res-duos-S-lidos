import { salvarHorarioBairro, obterHorariosBairros } from './api.js';

export function alterarHorarioBairro(event: Event): void {
  event.preventDefault();

  const bairroSelect = document.getElementById('admin-bairro') as HTMLSelectElement;
  const novoHorarioInput = document.getElementById('admin-novo-horario') as HTMLInputElement;

  const bairro = bairroSelect.value;
  const novoHorario = novoHorarioInput.value;

  salvarHorarioBairro(bairro, novoHorario);
  alert(`Horário do bairro ${bairro} atualizado para ${novoHorario}!`);
  novoHorarioInput.value = '';
  carregarHorariosAtualizados();
}

export function carregarHorariosAtualizados(): void {
  const horarios = obterHorariosBairros();
  for (const [bairro, horario] of Object.entries(horarios)) {
    const el = document.getElementById(`horario-${bairro}`);
    if (el) el.innerText = horario;
  }
}

document.addEventListener('DOMContentLoaded', carregarHorariosAtualizados);

(window as any).alterarHorarioBairro = alterarHorarioBairro;
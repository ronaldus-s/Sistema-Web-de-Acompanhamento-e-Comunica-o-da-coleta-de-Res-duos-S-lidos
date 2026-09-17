import { salvarAviso, obterAviso, removerAvisoSalvo, AvisoDTO } from './api.js';

export function publicarAviso(event: Event): void {
  event.preventDefault();

  const tituloInput = document.getElementById('admin-titulo') as HTMLInputElement;
  const msgInput = document.getElementById('admin-msg') as HTMLTextAreaElement;

  const titulo = tituloInput.value.trim();
  const msg = msgInput.value.trim();

  if (!titulo || !msg) {
    alert('Preencha todos os campos antes de publicar.');
    return;
  }

  const aviso: AvisoDTO = {
    titulo,
    msg,
    data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  salvarAviso(aviso);
  carregarAvisoSalvo();

  alert('Aviso publicado no mural com sucesso!');
  tituloInput.value = '';
  msgInput.value = '';
}

export function removerAviso(): void {
  if (obterAviso()) {
    removerAvisoSalvo();
    carregarAvisoSalvo();
    alert('O aviso foi removido do mural.');
  } else {
    alert('Não há nenhum aviso ativo para remover.');
  }
}

export function carregarAvisoSalvo(): void {
  const mural = document.getElementById('mural-avisos');
  if (!mural) return;

  const aviso = obterAviso();
  mural.innerHTML = aviso
    ? `<div class="bg-white p-3 rounded border shadow-sm">
         <div class="d-flex justify-content-between align-items-center mb-1">
           <strong class="text-dark fs-6">${aviso.titulo}</strong>
           <span class="badge bg-secondary">${aviso.data}</span>
         </div>
         <p class="text-muted small mb-0">${aviso.msg}</p>
       </div>`
    : `<p class="text-muted small mb-0">Nenhum aviso urgente publicado no momento.</p>`;
}

window.addEventListener('storage', (e) => {
  if (e.key === 'ultimoAvisoQuixada') carregarAvisoSalvo();
});

document.addEventListener('DOMContentLoaded', carregarAvisoSalvo);

(window as any).publicarAviso = publicarAviso;
(window as any).removerAviso = removerAviso;
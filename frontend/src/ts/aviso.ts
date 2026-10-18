import { listarAvisos, criarAviso, removerAvisoPorId } from './api.js';
import type { AvisoDTO } from './api.js';

export async function publicarAviso(event: Event): Promise<void> {
  event.preventDefault();

  const tituloInput = document.getElementById('admin-titulo') as HTMLInputElement;
  const msgInput = document.getElementById('admin-msg') as HTMLTextAreaElement;

  const titulo = tituloInput.value.trim();
  const msg = msgInput.value.trim();

  if (!titulo || !msg) {
    alert('Preencha todos os campos antes de publicar.');
    return;
  }

  await criarAviso(titulo, msg);
  await carregarAvisos();

  tituloInput.value = '';
  msgInput.value = '';
}

export async function removerAviso(documentId: string): Promise<void> {
  if (!confirm('Remover este aviso?')) return;
  await removerAvisoPorId(documentId);
  await carregarAvisos();
}

export async function carregarAvisos(): Promise<void> {
  const mural = document.getElementById('mural-avisos');
  if (!mural) return;

  const avisos: AvisoDTO[] = await listarAvisos();
  const ehAdmin = document.body.dataset.admin === 'true';

  if (avisos.length === 0) {
    mural.innerHTML = `<p class="text-muted small mb-0">Nenhum aviso publicado no momento.</p>`;
    return;
  }

  mural.innerHTML = avisos.map((aviso) => `
    <div class="bg-white p-3 rounded border shadow-sm mb-2">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <strong class="text-dark fs-6">${aviso.titulo}</strong>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-secondary">${new Date(aviso.createdAt || '').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          ${ehAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="removerAviso('${aviso.documentId}')"><i class="bi bi-trash"></i></button>` : ''}
        </div>
      </div>
      <p class="text-muted small mb-0">${aviso.msg}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', carregarAvisos);

(window as any).publicarAviso = publicarAviso;
(window as any).removerAviso = removerAviso;
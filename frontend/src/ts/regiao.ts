import { listarRegioes, atualizarHorarioRegiao, criarRegiao, removerRegiaoPorId } from './api.js';
import type { RegiaoDTO } from './api.js';

function esc(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "Seg, Qua e Sex" -> ["Seg", "Qua", "Sex"] */
function separarDias(dias: string): string[] {
  return String(dias ?? '')
    .split(/,|;|\/|\se\s/i)
    .map(d => d.trim())
    .filter(Boolean);
}

function renderizarTabelaPublica(regioes: RegiaoDTO[]): void {
  const tbody = document.getElementById('tabela-regioes');
  if (!tbody) return;

  if (regioes.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="3" class="text-muted small text-center py-4">
        Nenhum bairro cadastrado ainda.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = regioes.map((r: RegiaoDTO) => `
    <tr>
      <td data-label="Bairro">${esc(r.nome)}</td>
      <td data-label="Dias">
        <div class="chips-dias">
          ${separarDias(r.dias).map(d => `<span class="chip-dia">${esc(d)}</span>`).join('')}
        </div>
      </td>
      <td data-label="Horário">
        <span class="chip-horario"><i class="bi bi-clock"></i>${esc(r.horario)}</span>
      </td>
    </tr>
  `).join('');
}

function renderizarTabelaAdmin(regioes: RegiaoDTO[]): void {
  const tbody = document.getElementById('tabela-regioes-admin');
  if (!tbody) return;

  if (regioes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted small text-center py-4">Nenhuma região cadastrada ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = regioes.map((r: RegiaoDTO) => `
    <tr>
      <td data-label="Bairro">${esc(r.nome)}</td>
      <td data-label="Dias">
        <div class="chips-dias">
          ${separarDias(r.dias).map(d => `<span class="chip-dia">${esc(d)}</span>`).join('')}
        </div>
      </td>
      <td data-label="Horário">
        <span class="chip-horario"><i class="bi bi-clock"></i>${esc(r.horario)}</span>
      </td>
      <td data-label="Ação">
        <div class="acoes-linha">
          <button class="btn-icone danger" title="Remover região" onclick="removerRegiao('${esc(r.documentId)}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}
/** cronograma.html (público) */
export async function carregarCronograma(): Promise<void> {
  try {
    const regioes = await listarRegioes();
    renderizarTabelaPublica(regioes);
  } catch (erro) {
    const tbody = document.getElementById('tabela-regioes');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="3" class="text-danger small text-center py-4">
          <i class="bi bi-wifi-off me-1"></i>
          Não foi possível carregar o cronograma. Tente novamente em instantes.
        </td></tr>`;
    }
    console.error(erro);
  }
}

/** regioes.html (admin) */
export async function carregarPainelAdminRegioes(): Promise<void> {
  const regioes = await listarRegioes();
  renderizarTabelaAdmin(regioes);

  const select = document.getElementById('admin-bairro') as HTMLSelectElement;
  if (select) {
    select.innerHTML = regioes.map((r: RegiaoDTO) => `<option value="${r.documentId}">${r.nome}</option>`).join('');
  }
}

export async function alterarHorarioBairro(event: Event): Promise<void> {
  event.preventDefault();

  const select = document.getElementById('admin-bairro') as HTMLSelectElement;
  const novoHorarioInput = document.getElementById('admin-novo-horario') as HTMLInputElement;

  const documentId = select.value;
  const novoHorario = novoHorarioInput.value.trim();

  if (!documentId || !novoHorario) {
    alert('Selecione um bairro e informe o novo horário.');
    return;
  }

  await atualizarHorarioRegiao(documentId, novoHorario);
  alert('Horário atualizado com sucesso!');
  novoHorarioInput.value = '';
  await carregarPainelAdminRegioes();
}

export async function criarNovaRegiao(event: Event): Promise<void> {
  event.preventDefault();

  const nomeInput = document.getElementById('nova-regiao-nome') as HTMLInputElement;
  const diasInput = document.getElementById('nova-regiao-dias') as HTMLInputElement;
  const horarioInput = document.getElementById('nova-regiao-horario') as HTMLInputElement;

  const nome = nomeInput.value.trim();
  const dias = diasInput.value.trim();
  const horario = horarioInput.value.trim();

  if (!nome || !dias || !horario) {
    alert('Preencha todos os campos da nova região.');
    return;
  }

  await criarRegiao(nome, dias, horario);
  nomeInput.value = '';
  diasInput.value = '';
  horarioInput.value = '';
  await carregarPainelAdminRegioes();
}

export async function removerRegiao(documentId: string): Promise<void> {
  if (!confirm('Tem certeza que deseja remover esta região? Avisos ligados a ela podem ficar sem vínculo.')) return;
  await removerRegiaoPorId(documentId);
  await carregarPainelAdminRegioes();
}

(window as any).alterarHorarioBairro = alterarHorarioBairro;
(window as any).criarNovaRegiao = criarNovaRegiao;
(window as any).removerRegiao = removerRegiao;


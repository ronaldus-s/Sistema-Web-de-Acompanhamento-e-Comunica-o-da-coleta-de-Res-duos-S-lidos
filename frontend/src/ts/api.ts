// Camada de acesso a dados. Ainda não existe backend, então
// simulamos a "API" com localStorage. Quando o backend estiver pronto,
// basta trocar a implementação destas funções por chamadas fetch().

export interface AvisoDTO {
  titulo: string;
  msg: string;
  data: string;
}

export interface StatusRotaDTO {
  rota: string;
  horaInicio: string;
  emAndamento: boolean;
}

const KEYS = {
  usuarioLogado: 'usuarioLogado',
  perfilLogado: 'perfilLogado',
  ultimoAviso: 'ultimoAvisoQuixada',
  statusRota: 'statusRotaColetor',
  horariosBairros: 'horariosBairros',
} as const;

export function salvarSessao(usuario: string, perfil: string): void {
  localStorage.setItem(KEYS.usuarioLogado, usuario);
  localStorage.setItem(KEYS.perfilLogado, perfil);
}

export function obterSessao(): { usuario: string; perfil: string } {
  return {
    usuario: localStorage.getItem(KEYS.usuarioLogado) || 'Usuário',
    perfil: localStorage.getItem(KEYS.perfilLogado) || 'usuario',
  };
}

export function encerrarSessao(): void {
  localStorage.clear();
}

export function salvarAviso(aviso: AvisoDTO): void {
  localStorage.setItem(KEYS.ultimoAviso, JSON.stringify(aviso));
}

export function obterAviso(): AvisoDTO | null {
  const raw = localStorage.getItem(KEYS.ultimoAviso);
  return raw ? JSON.parse(raw) : null;
}

export function removerAvisoSalvo(): void {
  localStorage.removeItem(KEYS.ultimoAviso);
}

export function salvarStatusRota(status: StatusRotaDTO): void {
  localStorage.setItem(KEYS.statusRota, JSON.stringify(status));
}

export function obterStatusRota(): StatusRotaDTO | null {
  const raw = localStorage.getItem(KEYS.statusRota);
  return raw ? JSON.parse(raw) : null;
}

export function removerStatusRota(): void {
  localStorage.removeItem(KEYS.statusRota);
}

export function salvarHorarioBairro(bairro: string, horario: string): void {
  const horarios = obterHorariosBairros();
  horarios[bairro] = horario;
  localStorage.setItem(KEYS.horariosBairros, JSON.stringify(horarios));
}

export function obterHorariosBairros(): Record<string, string> {
  const raw = localStorage.getItem(KEYS.horariosBairros);
  return raw ? JSON.parse(raw) : {};
}

export const STORAGE_KEYS = KEYS;
// Função para alternar as abas do perfil
function selecionarPerfil(perfil, nomeExibicao) {
    document.getElementById('perfil-selecionado').value = perfil;

    const badge = document.getElementById('badge-perfil');
    badge.innerHTML = `Acesso: <strong>${nomeExibicao}</strong>`;

    const botoes = document.querySelectorAll('.nav-link');
    botoes.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Função executada ao clicar em "Entrar no Sistema"
function efetuarLogin(event) {
    event.preventDefault();

    const perfil = document.getElementById('perfil-selecionado').value;
    const identifier = document.getElementById('identifier').value;

    // Guarda temporariamente os dados do usuário no navegador
    localStorage.setItem('usuarioLogado', identifier);
    localStorage.setItem('perfilLogado', perfil);

    // Redireciona para a tela do sistema
    window.location.href = "dashboard.html";
}

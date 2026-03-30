// ==================== COMPONENTE: MENU DE NAVEGAÇÃO ====================

window.renderizarMenu = function() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    container.innerHTML = `
        <nav class="main-nav">
            <button class="nav-item active" data-tab="escala">📅 Escala Semanal</button>
            <button class="nav-item" data-tab="alocacao">🔄 Alocação Geral</button>
            
            <div class="nav-dropdown">
                <button class="nav-item dropdown-toggle">📋 Cadastros ▾</button>
                <div class="dropdown-menu">
                    <button class="dropdown-item" data-tab="motoristas">👨‍✈️ Motoristas</button>
                    <button class="dropdown-item" data-tab="caminhoes">🚛 Conjuntos & Caminhões</button>
                </div>
            </div>

            <button class="nav-item" data-tab="os">🛠️ Ordem de Serviço</button>
            <button id="navConfigBtn" class="nav-item" data-tab="config">⚙️ Configurações</button>
            
            <button class="nav-item" data-tab="troca">⏱️ Painel de Troca</button>
            
            <button class="nav-item" data-tab="jornada">⏳ Controle de Jornada</button>
            
            <button class="nav-item" data-tab="treinamento">🎓 Treinamento</button>
        </nav>
    `;
};
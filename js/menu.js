// ==================== COMPONENTE: MENU DE NAVEGAÇÃO ====================

const pageCache = {}; 

window.renderizarMenu = function() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    // Pega as permissões dinâmicas criadas pelo Admin
    const permissoesAtuais = (typeof window.getPermissoes === 'function') ? window.getPermissoes() : {};
    const userRole = (currentUser && currentUser.role) ? currentUser.role : 'Admin';
    
    // Lista de menus que ESTE usuário pode ver
    let meusMenus = permissoesAtuais[userRole] || [];

    // O botão Configurações é EXCLUSIVO e FIXO do Administrador
    const isAdmin = userRole === 'Admin';

    let navHtml = '<nav class="main-nav">';

    if (meusMenus.includes('escala')) navHtml += `<button class="nav-item" onclick="navegarPara('escala', this)">📅 Escala Semanal</button>`;
    if (meusMenus.includes('alocacao')) navHtml += `<button class="nav-item" onclick="navegarPara('alocacao', this)">🔄 Alocação Geral</button>`;
    
    // NOVO MENU: RECADOS E ANOTAÇÕES (Livre para todos verem)
    navHtml += `<button class="nav-item" onclick="navegarPara('recados', this)">📝 Recados e Anotações</button>`;

    // Dropdown Cadastros
    if (meusMenus.includes('motoristas') || meusMenus.includes('caminhoes')) {
        navHtml += `<div class="nav-dropdown">
            <button class="nav-item dropdown-toggle" onclick="toggleDropdown(event)">📋 Cadastros ▾</button>
            <div class="dropdown-menu">`;
        if (meusMenus.includes('motoristas')) navHtml += `<button class="dropdown-item" onclick="navegarPara('motoristas', this)">👨‍✈️ Motoristas</button>`;
        if (meusMenus.includes('caminhoes')) navHtml += `<button class="dropdown-item" onclick="navegarPara('caminhoes', this)">🚛 Conjuntos & Caminhões</button>`;
        navHtml += `</div></div>`;
    }

    if (meusMenus.includes('os')) navHtml += `<button class="nav-item" onclick="navegarPara('os', this)">🛠️ Ordem de Serviço</button>`;
    
    // NOVO MENU: STATUS FROTA (Aparece se tiver acesso a OS ou for Admin)
    if (meusMenus.includes('os') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('status_frota', this)" style="color: var(--ccol-green-bright); font-weight: bold;">📊 Status Frota</button>`;
    }

    if (meusMenus.includes('troca')) navHtml += `<button class="nav-item" onclick="navegarPara('troca', this)">⏱️ Painel de Troca</button>`;
    if (meusMenus.includes('jornada')) navHtml += `<button class="nav-item" onclick="navegarPara('jornada', this)">⏳ Controle de Jornada</button>`;
    if (meusMenus.includes('treinamento')) navHtml += `<button class="nav-item" onclick="navegarPara('treinamento', this)">🎓 Treinamento</button>`;
    
    // MENU SSMA ADICIONADO AQUI
    if (meusMenus.includes('ssma') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('ssma', this)" style="color: #f59e0b; font-weight: bold;">⚠️ SSMA</button>`;
    }

    // Configurações: Apenas o Admin vê (Questão de segurança máxima)
    if (isAdmin) navHtml += `<button id="navConfigBtn" class="nav-item" onclick="navegarPara('config', this)">⚙️ Configurações</button>`;

    navHtml += '</nav>';
    container.innerHTML = navHtml;

    // Clica automaticamente no primeiro botão disponível ao carregar o menu
    setTimeout(() => {
        const firstBtn = container.querySelector('.nav-item:not(.dropdown-toggle)');
        if (firstBtn) {
            firstBtn.click();
        } else {
            const dropItem = container.querySelector('.dropdown-item');
            if (dropItem) dropItem.click();
        }
    }, 100);
};

window.toggleDropdown = function(event) {
    const menu = event.target.nextElementSibling;
    menu.classList.toggle('show');
}

window.navegarPara = async function(pagina, elementoClicado) {
    // Dupla verificação de segurança no clique
    const userRole = (currentUser && currentUser.role) ? currentUser.role : 'Admin';
    if (pagina === 'config' && userRole !== 'Admin') {
        alert('⛔ Acesso Negado.');
        return; 
    }

    if (elementoClicado) {
        document.querySelectorAll('.nav-item, .dropdown-item').forEach(el => el.classList.remove('active'));
        elementoClicado.classList.add('active');
        
        if(elementoClicado.classList.contains('dropdown-item')) {
            elementoClicado.closest('.nav-dropdown').querySelector('.dropdown-toggle').classList.add('active');
            document.querySelector('.dropdown-menu').classList.remove('show');
        }
    }

    const mainContent = document.getElementById('conteudo-principal');

    try {
        if (!pageCache[pagina]) {
            mainContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #fff;">A carregar módulo...</div>';
            const response = await fetch(`pages/${pagina}.html`);
            if (!response.ok) throw new Error('Página não encontrada');
            pageCache[pagina] = await response.text();
        }
        
        mainContent.innerHTML = pageCache[pagina];

        // Chama as funções de renderização específicas de cada módulo após carregar o HTML
        if (pagina === 'escala' && typeof window.renderizarEscala === 'function') window.renderizarEscala();
        if (pagina === 'alocacao' && typeof window.renderizarAlocacao === 'function') window.renderizarAlocacao();
        if (pagina === 'motoristas' && typeof window.renderizarMotoristas === 'function') window.renderizarMotoristas();
        if (pagina === 'caminhoes' && typeof window.renderizarConjuntos === 'function') window.renderizarConjuntos();
        
        if (pagina === 'status_frota' && typeof window.renderizarStatusFrota === 'function') window.renderizarStatusFrota();
        if (pagina === 'os' && typeof window.alternarTelaOS === 'function') window.alternarTelaOS('lista');
        
        if (pagina === 'troca' && typeof window.renderizarTrocaTurno === 'function') window.renderizarTrocaTurno();
        if (pagina === 'treinamento' && typeof window.renderizarCronogramaTreinamento === 'function') window.renderizarCronogramaTreinamento();
        
        // NOVO: SSMA
        if (pagina === 'ssma' && typeof window.renderizarSSMA === 'function') window.renderizarSSMA();

        // NOVO: RECADOS
        if (pagina === 'recados' && typeof window.carregarRecados === 'function') window.carregarRecados();

        if (pagina === 'jornada') {
            if (typeof window.initJornadaTab === 'function') window.initJornadaTab();
        } else {
            if (typeof window.deactivateJornadaTab === 'function') window.deactivateJornadaTab();
        }

        if (pagina === 'config') {
            if (typeof window.renderizarUsuarios === 'function') window.renderizarUsuarios();
            if (typeof window.renderizarLogs === 'function') window.renderizarLogs();
            if (typeof window.carregarCheckboxesPermissoes === 'function') window.carregarCheckboxesPermissoes();
        }

    } catch (error) {
        console.error('Erro ao carregar página:', error);
        mainContent.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>❌ Erro de Navegação</h3>
                <p>O módulo <b>${pagina}.html</b> não foi encontrado na pasta "pages".</p>
            </div>`;
    }
};
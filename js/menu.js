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
    
    // NOVO MENU: TROCA DE TURNO
    if (meusMenus.includes('troca_turno') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('troca_turno', this)" style="color: #f1c40f; font-weight: bold;">🔄 Troca de Turno</button>`;
    }

    if (meusMenus.includes('alocacao')) navHtml += `<button class="nav-item" onclick="navegarPara('alocacao', this)">🔄 Alocação Geral</button>`;
    
    // RECADOS E ANOTAÇÕES (Livre para todos)
    if (meusMenus.includes('recados') || isAdmin) navHtml += `<button class="nav-item" onclick="navegarPara('recados', this)">📝 Recados e Anotações</button>`;

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
    
    // RELATÓRIO GERENCIAL (Agora com permissão própria!)
    if (meusMenus.includes('relatorio_gerencial') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('relatorio_gerencial', this)" style="color: var(--ccol-green-bright); font-weight: bold;">📊 Relatório Gerencial</button>`;
    }
    
    // SSMA
    if (meusMenus.includes('ssma') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('ssma', this)" style="color: #f59e0b; font-weight: bold;">⚠️ SSMA</button>`;
    }

    // NOVO MENU: TREINAMENTO (VIAGEM ASSISTIDA)
    if (meusMenus.includes('treinamento') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('treinamento', this)" style="color: #a855f7; font-weight: bold;">🎓 Treinamento</button>`;
    }

    // INDICADORES (DASHBOARD) - NOME ALTERADO PARA SUZANO
    if (meusMenus.includes('indicadores') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('indicadores', this)" style="color: #3498db; font-weight: bold;">📈 Indicadores Suzano</button>`;
    }

    // NOVO MENU: INDICADORES SERRANA
    if (meusMenus.includes('indicadores_serrana') || isAdmin) {
        navHtml += `<button class="nav-item" onclick="navegarPara('indicadores_serrana', this)" style="color: #2ecc71; font-weight: bold;">📊 Indicadores Serrana</button>`;
    }

    // Configurações: Apenas o Admin vê
    if (isAdmin) navHtml += `<button id="navConfigBtn" class="nav-item" onclick="navegarPara('config', this)">⚙️ Configurações</button>`;

    navHtml += '</nav>';
    container.innerHTML = navHtml;

    // Seleciona o primeiro item disponível
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
    if (menu) menu.classList.toggle('show');
}

window.navegarPara = async function(pagina, elementoClicado) {
    const userRole = (currentUser && currentUser.role) ? currentUser.role : 'Admin';
    if (pagina === 'config' && userRole !== 'Admin') {
        alert('⛔ Acesso Negado.');
        return; 
    }

    if (elementoClicado) {
        document.querySelectorAll('.nav-item, .dropdown-item').forEach(el => el.classList.remove('active'));
        elementoClicado.classList.add('active');
        
        if(elementoClicado.classList.contains('dropdown-item')) {
            const dropdown = elementoClicado.closest('.nav-dropdown');
            if (dropdown) dropdown.querySelector('.dropdown-toggle').classList.add('active');
            const menu = document.querySelector('.dropdown-menu');
            if (menu) menu.classList.remove('show');
        }
    }

    const mainContent = document.getElementById('conteudo-principal');

    try {
        if (!pageCache[pagina]) {
            mainContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #fff;">A carregar módulo...</div>';
            
            const response = await fetch(`pages/${pagina}.html?v=` + new Date().getTime());
            
            if (!response.ok) throw new Error('Página não encontrada');
            pageCache[pagina] = await response.text();
        }
        
        mainContent.innerHTML = pageCache[pagina];

        // Inicialização de módulos específicos
        if (pagina === 'escala' && typeof window.renderizarEscala === 'function') window.renderizarEscala();
        if (pagina === 'troca_turno' && typeof window.renderizarTrocaTurno === 'function') window.renderizarTrocaTurno();
        if (pagina === 'alocacao' && typeof window.renderizarAlocacao === 'function') window.renderizarAlocacao();
        if (pagina === 'motoristas' && typeof window.renderizarMotoristas === 'function') window.renderizarMotoristas();
        if (pagina === 'caminhoes' && typeof window.renderizarConjuntos === 'function') window.renderizarConjuntos();
        
        // INICIALIZAÇÃO DO NOVO RELATÓRIO GERENCIAL
        if (pagina === 'relatorio_gerencial') {
            if (typeof window.carregarDadosOS === 'function') await window.carregarDadosOS();
            if (typeof window.renderizarRelatorioGerencialOS === 'function') window.renderizarRelatorioGerencialOS();
        }

        if (pagina === 'os' && typeof window.alternarTelaOS === 'function') window.alternarTelaOS('lista');
        if (pagina === 'ssma' && typeof window.renderizarSSMA === 'function') window.renderizarSSMA();
        if (pagina === 'recados' && typeof window.carregarRecados === 'function') window.carregarRecados();

        // INICIALIZAÇÃO TREINAMENTO
        if (pagina === 'treinamento' && typeof window.renderizarPaginaTreinamento === 'function') {
            window.renderizarPaginaTreinamento();
        }

        if (pagina === 'indicadores') {
            if (typeof window.carregarDadosDashboard === 'function') window.carregarDadosDashboard();
            if (typeof window.atualizarRelogio === 'function') {
                window.atualizarRelogio();
                if (window.intervaloRelogio) clearInterval(window.intervaloRelogio);
                window.intervaloRelogio = setInterval(window.atualizarRelogio, 1000);
            }
        }

        // INICIALIZAÇÃO INDICADORES SERRANA
        if (pagina === 'indicadores_serrana') {
            if (typeof window.carregarDadosDashboardSerrana === 'function') window.carregarDadosDashboardSerrana();
            if (typeof window.atualizarRelogioSerrana === 'function') {
                window.atualizarRelogioSerrana();
                if (window.intervaloRelogioSerrana) clearInterval(window.intervaloRelogioSerrana);
                window.intervaloRelogioSerrana = setInterval(window.atualizarRelogioSerrana, 1000);
            }
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
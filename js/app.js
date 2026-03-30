// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO DO DASHBOARD ====================

function initTabs() {
    const tabs = document.querySelectorAll('.nav-item[data-tab], .dropdown-item[data-tab]');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = tab.getAttribute('data-tab');
            if(!tabId) return; 
            
            // --- BLOQUEIO DA ABA DE CONFIGURAÇÃO PARA NÃO-ADMINS ---
            if (tabId === 'config' && currentUser && currentUser.role !== 'Admin') {
                alert('⛔ Acesso Restrito: Apenas Administradores podem acessar as configurações e logs do sistema.');
                return; 
            }
            
            document.querySelectorAll('.nav-item, .dropdown-item').forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            if(tab.classList.contains('dropdown-item')) {
                tab.classList.add('active');
                tab.closest('.nav-dropdown').querySelector('.dropdown-toggle').classList.add('active');
                document.querySelector('.dropdown-menu').classList.remove('show');
            } else {
                tab.classList.add('active');
            }
            
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') window.renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
            else if (tabId === 'troca') renderizarTrocaTurno();
            else if (tabId === 'treinamento') renderizarCronogramaTreinamento();
            else if (tabId === 'os') {
                if (typeof renderizarTabelaOS === 'function') renderizarTabelaOS();
            }
        });
    });

    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

window.atualizarStats = function() {
    const statConjuntos = document.getElementById('statConjuntos');
    const statCaminhoes = document.getElementById('statCaminhoes');
    const statMotoristas = document.getElementById('statMotoristas');
    const statDisponiveis = document.getElementById('statDisponiveis');
    
    if (statConjuntos) statConjuntos.innerText = conjuntos.length;
    if (statCaminhoes) statCaminhoes.innerText = conjuntos.reduce((acc, c) => acc + (c.caminhoes?.length || 0), 0);
    if (statMotoristas) statMotoristas.innerText = motoristas.length;
    
    if (statDisponiveis) {
        const qtdeDisponiveis = motoristas.filter(m => !m.conjuntoId).length;
        statDisponiveis.innerText = qtdeDisponiveis;
    }
}

window.initDashboard = async function() {
    initTabs();
    await carregarDadosIniciais();
    
    if(typeof carregarDadosTreinamento === 'function') {
        await carregarDadosTreinamento(); 
    }
    
    const dataInicioInput = document.getElementById('dataInicioEscala');
    if (dataInicioInput) {
        const hojeStr = new Date().toISOString().split('T')[0];
        dataInicioInput.value = hojeStr;
    }

    window.renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    const btnAddMotorista = document.getElementById('btnAddMotorista');
    if (btnAddMotorista) btnAddMotorista.addEventListener('click', adicionarMotorista);
    
    const btnAddConjunto = document.getElementById('btnAddConjunto');
    if (btnAddConjunto) btnAddConjunto.addEventListener('click', adicionarConjunto);
    
    const searchMotorista = document.getElementById('searchMotorista');
    if (searchMotorista) searchMotorista.addEventListener('input', renderizarMotoristas);
}
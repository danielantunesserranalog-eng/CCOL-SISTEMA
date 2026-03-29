// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO ====================

function initTabs() {
    // Pega as abas principais E os itens do dropdown
    const tabs = document.querySelectorAll('.nav-item[data-tab], .dropdown-item[data-tab]');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = tab.getAttribute('data-tab');
            if(!tabId) return; // Segurança
            
            // Remove a classe ativa de todas as abas e menus
            document.querySelectorAll('.nav-item, .dropdown-item').forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Se for um item de dentro do dropdown, ativa ele E o botão pai "Cadastros"
            if(tab.classList.contains('dropdown-item')) {
                tab.classList.add('active');
                tab.closest('.nav-dropdown').querySelector('.dropdown-toggle').classList.add('active');
                
                // ESCONDE O MENU APÓS CLICAR NUMA OPÇÃO
                document.querySelector('.dropdown-menu').classList.remove('show');
            } else {
                tab.classList.add('active');
            }
            
            // Mostra o conteúdo da aba
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            // Renderiza os dados corretos
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
        });
    });

    // ==================== LÓGICA DO MENU CADASTROS (CLIQUE) ====================
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
        // Abre/Fecha ao clicar no botão "Cadastros"
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Evita que o clique se espalhe
            dropdownMenu.classList.toggle('show');
        });

        // Fecha o menu se o utilizador clicar em qualquer outro lugar da página
        document.addEventListener('click', (e) => {
            if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

// INICIALIZAÇÃO PRINCIPAL DA APLICAÇÃO
async function init() {
    initTabs();
    await carregarDadosIniciais();
    
    renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    // Listeners Globais
    const btnAddMotorista = document.getElementById('btnAddMotorista');
    if (btnAddMotorista) btnAddMotorista.addEventListener('click', adicionarMotorista);
    
    const btnAddConjunto = document.getElementById('btnAddConjunto');
    if (btnAddConjunto) btnAddConjunto.addEventListener('click', adicionarConjunto);
    
    const searchMotorista = document.getElementById('searchMotorista');
    if (searchMotorista) searchMotorista.addEventListener('input', renderizarMotoristas);
    
    const btnGerar = document.getElementById('btnGerarEscalaAuto');
    if (btnGerar) btnGerar.addEventListener('click', gerarEscala4x2);
    
    const btnZerar = document.getElementById('btnZerarEscala');
    if (btnZerar) btnZerar.addEventListener('click', zerarEscala);
    
    const filtroConjunto = document.getElementById('filtroConjuntoEscala');
    if (filtroConjunto) filtroConjunto.addEventListener('change', renderizarEscala);

    const refreshEscalaBtn = document.getElementById('refreshEscalaBtn');
    if (refreshEscalaBtn) refreshEscalaBtn.addEventListener('click', () => {
        currentDatas = getDatasSemana(); 
        renderizarEscala();
    });

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', () => {
        window.print();
    });
}

document.addEventListener('DOMContentLoaded', init);
// ==================== MÓDULO: RECADOS E ANOTAÇÕES ====================

// DADOS FALSOS PARA TESTE VISUAL (Funciona na memória até recarregar a página)
let recadosMock = [
    { id: 1, titulo: "Verificar documentação", descricao: "Checar CNH do motorista da placa ABC-1234", data_agendamento: "2026-04-06T15:00" },
    { id: 2, titulo: "Retorno via Rádio", descricao: "Avisar equipe de manutenção sobre o pneu do caminhão 05", data_agendamento: "2026-04-06T16:30" }
];

// Função principal chamada pelo menu.js quando a tela abre
window.carregarRecados = function() {
    const container = document.getElementById('lista-recados');
    if (!container) return; 

    // Configura o evento do formulário
    const formRecado = document.getElementById('form-recado');
    if (formRecado && !formRecado.hasAttribute('data-listener')) {
        formRecado.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarRecado();
        });
        formRecado.setAttribute('data-listener', 'true');
    }

    // Chama a função para desenhar os cards na tela
    atualizarListaRecados();
};

// Função para salvar o recado
async function salvarRecado() {
    // Cria o recado na nossa memória temporária (Mock)
    const novoRecado = {
        id: Date.now(), // Gera um ID único falso baseado na hora
        titulo: document.getElementById('titulo-recado').value,
        descricao: document.getElementById('desc-recado').value,
        data_agendamento: document.getElementById('data-recado').value
    };

    try {
        // ========== INTEGRAÇÃO BANCO DE DADOS (FUTURO) ==========
        /*
        await fetch('/api/recados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoRecado)
        });
        */
        
        // Simulação de sucesso adicionando na lista temporária
        recadosMock.push(novoRecado);
        
        document.getElementById('form-recado').reset();
        atualizarListaRecados(); 
    } catch (error) {
        console.error('Erro ao salvar recado:', error);
        alert('Erro ao salvar o recado. Tente novamente.');
    }
}

// Função para renderizar no HTML
async function atualizarListaRecados() {
    const container = document.getElementById('lista-recados');
    container.innerHTML = ''; // Limpa a tela

    try {
        // ========== INTEGRAÇÃO BANCO DE DADOS (FUTURO) ==========
        /*
        const response = await fetch('/api/recados/pendentes');
        recadosMock = await response.json();
        */

        if (recadosMock.length === 0) {
            container.innerHTML = '<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #10b981; margin: 0; font-weight: bold;">🎉 Tudo limpo! Nenhum recado pendente.</p></div>';
            return;
        }

        // Ordena os recados por data (do mais antigo pro mais novo)
        recadosMock.sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento));

        recadosMock.forEach(recado => {
            let dataFormatada = '';
            if(recado.data_agendamento) {
                dataFormatada = new Date(recado.data_agendamento).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
            } else {
                dataFormatada = 'Sem data';
            }
            
            const div = document.createElement('div');
            div.className = 'card-recado-modern';
            div.innerHTML = `
                <div class="recado-info">
                    <h4>${recado.titulo}</h4>
                    <p>${recado.descricao}</p>
                    <div class="recado-meta">🕒 Para: <strong>${dataFormatada}</strong></div>
                </div>
                <button class="btn-concluir-modern" onclick="concluirRecado(${recado.id})">✔ Concluir</button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar recados:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center;">Erro ao carregar os recados.</p>';
    }
}

// Função para dar baixa na tarefa (fazer ela sumir)
window.concluirRecado = async function(id) {
    if(confirm('Deseja marcar esta tarefa como concluída? Ela sumirá do painel.')) {
        try {
            // ========== INTEGRAÇÃO BANCO DE DADOS (FUTURO) ==========
            /*
            await fetch(`/api/recados/${id}/concluir`, { method: 'PUT' });
            */
            
            // Remove o recado da nossa lista temporária filtrando o ID
            recadosMock = recadosMock.filter(recado => recado.id !== id);
            
            // Atualiza a tela (agora sem a tarefa que você concluiu!)
            atualizarListaRecados(); 
        } catch (error) {
            console.error('Erro ao concluir recado:', error);
            alert('Erro ao concluir tarefa. Tente novamente.');
        }
    }
}
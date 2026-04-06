// ==================== MÓDULO: RECADOS E ANOTAÇÕES ====================

// Função principal chamada pelo menu.js quando a tela abre
window.carregarRecados = function() {
    const container = document.getElementById('lista-recados');
    if (!container) return; // Evita erro se a tela não estiver visível

    // 1. Configura o evento do formulário (Garante que só adiciona o evento uma vez)
    const formRecado = document.getElementById('form-recado');
    if (formRecado && !formRecado.hasAttribute('data-listener')) {
        formRecado.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarRecado();
        });
        formRecado.setAttribute('data-listener', 'true');
    }

    // 2. Chama a função para desenhar os cards na tela
    atualizarListaRecados();
};

// Função para salvar o recado
async function salvarRecado() {
    const recado = {
        titulo: document.getElementById('titulo-recado').value,
        descricao: document.getElementById('desc-recado').value,
        data_agendamento: document.getElementById('data-recado').value
    };

    try {
        // ========== INTEGRAÇÃO BANCO DE DADOS ==========
        // Descomente e ajuste esta parte quando for plugar no seu Node/Supabase
        /*
        await fetch('/api/recados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recado)
        });
        */
        
        // Simulação de sucesso
        document.getElementById('form-recado').reset();
        
        // Recarrega a lista para mostrar o novo recado inserido
        atualizarListaRecados(); 
    } catch (error) {
        console.error('Erro ao salvar recado:', error);
        alert('Erro ao salvar o recado. Tente novamente.');
    }
}

// Função para buscar recados do banco e renderizar no HTML
async function atualizarListaRecados() {
    const container = document.getElementById('lista-recados');
    container.innerHTML = '<p style="color: #94a3b8; text-align: center;">Carregando recados...</p>';

    try {
        // ========== INTEGRAÇÃO BANCO DE DADOS ==========
        // (Sua API deve retornar apenas recados WHERE status = 'pendente')
        /*
        const response = await fetch('/api/recados/pendentes');
        const recados = await response.json();
        */

        // DADOS FALSOS PARA TESTE VISUAL (Apague quando ligar o backend)
        const recados = [
            { id: 1, titulo: "Verificar documentação", descricao: "Checar CNH do motorista da placa ABC-1234", data_agendamento: "2026-04-06T15:00" },
            { id: 2, titulo: "Retorno via Rádio", descricao: "Avisar equipe de manutenção sobre o pneu do caminhão 05", data_agendamento: "2026-04-06T16:30" }
        ];

        container.innerHTML = ''; // Limpa o texto de "Carregando"

        if (recados.length === 0) {
            container.innerHTML = '<p style="color: #10b981; text-align: center; padding: 20px;">Nenhum recado pendente no momento. Tudo limpo! ✅</p>';
            return;
        }

        recados.forEach(recado => {
            // Formata a data para ficar bonitinha (Ex: 06/04/2026 15:00)
            const dataFormatada = new Date(recado.data_agendamento).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            
            const div = document.createElement('div');
            div.className = 'card-recado-modern';
            div.innerHTML = `
                <div class="recado-info">
                    <h4>${recado.titulo}</h4>
                    <p>${recado.descricao}</p>
                    <div class="recado-meta">🕒 Agendado para: <strong>${dataFormatada}</strong></div>
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
            // ========== INTEGRAÇÃO BANCO DE DADOS ==========
            // (Fazer um UPDATE no banco mudando status para 'concluido')
            /*
            await fetch(`/api/recados/${id}/concluir`, {
                method: 'PUT'
            });
            */
            
            // Recarrega a lista após concluir
            // Como o backend só traz os 'pendentes', ele vai sumir da tela automaticamente
            atualizarListaRecados(); 
        } catch (error) {
            console.error('Erro ao concluir recado:', error);
            alert('Erro ao concluir tarefa. Tente novamente.');
        }
    }
}
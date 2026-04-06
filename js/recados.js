// js/recados.js

document.addEventListener('DOMContentLoaded', () => {
    carregarRecados();

    // Evento para salvar novo recado
    document.getElementById('form-recado').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recado = {
            titulo: document.getElementById('titulo-recado').value,
            descricao: document.getElementById('desc-recado').value,
            data_agendamento: document.getElementById('data-recado').value
        };

        try {
            // ROTA BACKEND (Descomente e ajuste quando criar a rota no Node)
            /*
            await fetch('/api/recados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recado)
            });
            */
            
            alert('Recado agendado com sucesso!');
            document.getElementById('form-recado').reset();
            carregarRecados(); // Atualiza a lista automaticamente
        } catch (error) {
            console.error('Erro ao salvar recado:', error);
        }
    });
});

// Função para buscar recados do banco
async function carregarRecados() {
    const container = document.getElementById('lista-recados');
    container.innerHTML = '<p>Carregando recados...</p>';

    try {
        // ROTA BACKEND (Deve retornar apenas WHERE status = 'pendente')
        /*
        const response = await fetch('/api/recados/pendentes');
        const recados = await response.json();
        */

        // DADO FALSO PARA TESTE DE INTERFACE (Apague quando ligar o backend)
        const recados = [
            { id: 1, titulo: "Verificar documentação", descricao: "Checar CNH do motorista da placa ABC-1234", data_agendamento: "2026-04-06T15:00" }
        ];

        container.innerHTML = ''; // Limpa o "Carregando..."

        if (recados.length === 0) {
            container.innerHTML = '<p>Nenhum recado pendente no momento.</p>';
            return;
        }

        recados.forEach(recado => {
            const dataFormatada = new Date(recado.data_agendamento).toLocaleString('pt-BR');
            
            const div = document.createElement('div');
            div.className = 'card-recado';
            div.innerHTML = `
                <div class="recado-info">
                    <h3>${recado.titulo}</h3>
                    <p>${recado.descricao}</p>
                    <small><strong>Agendado para:</strong> ${dataFormatada}</small>
                </div>
                <button class="btn-concluir" onclick="concluirRecado(${recado.id})">✔ Concluir</button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar recados:', error);
        container.innerHTML = '<p>Erro ao carregar os recados.</p>';
    }
}

// Função para dar baixa na tarefa (fazer ela sumir)
async function concluirRecado(id) {
    if(confirm('Deseja marcar esta tarefa como concluída?')) {
        try {
            // ROTA BACKEND (Fazer um UPDATE mudando status para 'concluido')
            /*
            await fetch(`/api/recados/${id}/concluir`, {
                method: 'PUT'
            });
            */
            
            // Recarrega a lista. Como o backend só traz os pendentes, a tarefa vai sumir da tela.
            carregarRecados(); 
        } catch (error) {
            console.error('Erro ao concluir recado:', error);
        }
    }
}
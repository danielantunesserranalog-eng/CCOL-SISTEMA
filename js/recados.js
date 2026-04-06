// ==================== MÓDULO: RECADOS E ANOTAÇÕES ====================

window.carregarRecados = function() {
    const container = document.getElementById('lista-recados');
    if (!container) return; 

    const formRecado = document.getElementById('form-recado');
    if (formRecado && !formRecado.hasAttribute('data-listener')) {
        formRecado.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarRecado();
        });
        formRecado.setAttribute('data-listener', 'true');
    }

    atualizarListaRecados();
};

async function salvarRecado() {
    const titulo = document.getElementById('titulo-recado').value;
    const descricao = document.getElementById('desc-recado').value;
    const data_agendamento = document.getElementById('data-recado').value;

    try {
        // CORREÇÃO AQUI: Usando supabaseClient no lugar de window.supabase
        const { error } = await supabaseClient
            .from('recados_anotacoes')
            .insert([
                { 
                    titulo: titulo, 
                    descricao: descricao, 
                    data_agendamento: data_agendamento,
                    status: 'pendente' 
                }
            ]);

        if (error) throw error;
        
        document.getElementById('form-recado').reset();
        atualizarListaRecados(); 
    } catch (error) {
        console.error('Erro ao salvar recado:', error);
        alert('Erro ao salvar o recado no banco: ' + error.message);
    }
}

async function atualizarListaRecados() {
    const container = document.getElementById('lista-recados');
    container.innerHTML = '<p style="color: #94a3b8; text-align: center;">Buscando do banco de dados...</p>';

    try {
        // CORREÇÃO AQUI: Usando supabaseClient
        const { data: recados, error } = await supabaseClient
            .from('recados_anotacoes')
            .select('*')
            .eq('status', 'pendente')
            .order('data_agendamento', { ascending: true });

        if (error) throw error;

        container.innerHTML = ''; 

        if (!recados || recados.length === 0) {
            container.innerHTML = '<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #10b981; margin: 0; font-weight: bold;">🎉 Tudo limpo! Nenhum recado pendente.</p></div>';
            return;
        }

        recados.forEach(recado => {
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
        container.innerHTML = '<p style="color: #ef4444; text-align: center;">Erro de conexão com o banco de dados.</p>';
    }
}

window.concluirRecado = async function(id) {
    if(confirm('Deseja marcar esta tarefa como concluída? Ela sumirá do painel.')) {
        try {
            // CORREÇÃO AQUI: Usando supabaseClient
            const { error } = await supabaseClient
                .from('recados_anotacoes')
                .update({ status: 'concluido' })
                .eq('id', id);

            if (error) throw error;
            
            atualizarListaRecados(); 
        } catch (error) {
            console.error('Erro ao concluir recado no banco:', error);
            alert('Erro ao concluir tarefa: ' + error.message);
        }
    }
}
// js/jornada.js

// ==================== MÓDULO: CONTROLE DE JORNADA (12 HORAS) ====================

let intervalJornada = null; // Armazena o ID do intervalo do cronômetro
const LIMITE_JORNADA_MS = 12 * 60 * 60 * 1000; // 12 horas em milissegundos
const ALERTA_JORNADA_MS = 11 * 60 * 60 * 1000; // 11 horas para o primeiro alerta

// Inicializa a aba de jornada
function initJornadaTab() {
    console.log("Iniciando Módulo de Jornada...");
    
    // Configura o relógio digital no cabeçalho
    iniciarRelogioJornada();

    // Inicia o cronômetro para atualizar a tabela a cada segundo
    if (intervalJornada) clearInterval(intervalJornada);
    intervalJornada = setInterval(renderWorkdayTable, 1000);
    
    // Renderiza a primeira vez para não esperar 1 segundo
    renderWorkdayTable();
}

// Desativa o cronômetro quando sair da aba (para performance)
function deactivateJornadaTab() {
    if (intervalJornada) clearInterval(intervalJornada);
}

// Função para renderizar a tabela, cruzando motoristas com a escala do dia
function renderWorkdayTable() {
    const tbody = document.getElementById('listaJornadaAtiva');
    if (!tbody) return;

    const hojeStr = new Date().toISOString().split('T')[0]; // Data de hoje em formato ISO
    const agora = new Date(); // Hora atual para o cálculo
    
    let html = '';
    let temGenteRodando = false;

    // Supomos que a variável 'motoristas' (lista completa) já exista no escopo global
    // Caso contrário, você precisaria pegá-la de 'window.estadoApp.motoristas'
    const motoristasList = typeof motoristas !== 'undefined' ? motoristas : [];

    motoristasList.forEach(m => {
        // 1. Cruzamento com a escala: A função 'getEscalaDiaComputada' deve existir no seu sistema
        // Ela retorna 'T' para Trabalho ou 'F' para Folga para aquele motorista naquele dia.
        const escalaHoje = window.getEscalaDiaComputada ? window.getEscalaDiaComputada(m, hojeStr) : 'T';
        
        // Se ele está de folga, pula. Só queremos quem está trabalhando hoje
        if (escalaHoje === 'F') return;

        // Se ele não tem turno definido, pula.
        if (!m.turno || m.turno === '-' || m.turno === 'Misto') return;

        // 2. Extrai hora de início do turno (Ex: "06:00-18:00" -> "06:00")
        const horaInicioStr = m.turno.split('-')[0];
        const horaInicioSplit = horaInicioStr.split(':');
        
        // Cria o objeto Date do início do turno baseado na data de hoje
        let dataInicioTurno = new Date();
        dataInicioTurno.setHours(parseInt(horaInicioSplit[0]), parseInt(horaInicioSplit[1]), 0, 0);

        // Lógica inteligente para turno da noite:
        // Se o turno começa às 18:00 e agora é 03:00 da manhã, o turno começou ontem.
        if (parseInt(horaInicioSplit[0]) >= 18 && agora.getHours() < 12) {
            dataInicioTurno.setDate(dataInicioTurno.getDate() - 1);
        }

        // Se o turno ainda não começou, não mostra na tabela ativa
        if (agora < dataInicioTurno) return;

        temGenteRodando = true;

        // 3. Calcula o tempo decorrido
        const diffMs = agora - dataInicioTurno;
        
        // Converte milissegundos para horas e minutos formatados (Ex: "09h 45m")
        const horasTotais = Math.floor(diffMs / (1000 * 60 * 60));
        const minutosTotais = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const tempoDecorridoStr = `${String(horasTotais).padStart(2, '0')}h ${String(minutosTotais).padStart(2, '0')}m`;

        // 4. Define o status visual e o tempo decorrido com as cores corretas
        let statusHtml = '';
        let corTempo = 'var(--ccol-blue-bright)'; // Azul padrão
        let animacao = '';

        if (diffMs >= LIMITE_JORNADA_MS) {
            // EXCEDEU 12 HORAS (Vermelho piscando)
            corTempo = '#ef4444'; 
            animacao = 'piscar 1s infinite';
            statusHtml = `<span style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">🚨 EXCEDEU 12 HORAS</span>`;
        } else if (diffMs >= ALERTA_JORNADA_MS) {
            // ALERTA 11 HORAS (Laranja)
            corTempo = 'var(--ccol-rust-bright)';
            statusHtml = `<span style="background: rgba(251, 146, 60, 0.2); border: 1px solid var(--ccol-rust-bright); color: var(--ccol-rust-bright); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">⚠️ ALERTA: FIM PRÓXIMO</span>`;
        } else {
            // EM ROTA (Azul padrão)
            statusHtml = `<span style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--ccol-blue-bright); color: var(--ccol-blue-bright); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">EM ROTA</span>`;
        }

        html += `
            <tr style="transition: background-color 0.3s;">
                <td style="text-align: left; padding-left: 20px;">
                    <strong style="font-size: 1.05rem;">${m.nome}</strong><br>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Conj. ${m.conjuntoId || '-'} | Eq: ${m.equipe}</span>
                </td>
                <td style="font-weight: bold; color: #cbd5e1;">${m.turno}</td>
                <td style="font-size: 1.1rem; letter-spacing: 1px; font-weight: 700; color: ${corTempo}; animation: ${animacao};">${tempoDecorridoStr}</td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn-primary-green" onclick="abrirModalJornada('${m.id}', '${m.nome}', '${m.turno}')" style="font-size: 0.8rem; padding: 6px 12px; font-weight: bold;">🏁 Bater Ponto (Fim)</button>
                </td>
            </tr>
        `;
    });

    if (!temGenteRodando) {
        html = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">Nenhum motorista em rota neste momento de acordo com a escala de hoje.</td></tr>';
    }

    tbody.innerHTML = html;
}

// Configura o relógio digital no cabeçalho
function iniciarRelogioJornada() {
    const relogioEl = document.getElementById('relogioJornada');
    if (relogioEl) {
        setInterval(() => {
            const agora = new Date();
            relogioEl.innerText = agora.toLocaleTimeString('pt-BR');
        }, 1000);
    }
}

// --- LÓGICA DO MODAL ---

function abrirModalJornada(motoristaId, nomeMotorista, turnoInfo) {
    const modal = document.getElementById('modalFinalizarJornada');
    
    // Preenche os dados fixos
    document.getElementById('jornadaMotId').value = motoristaId;
    document.getElementById('jornadaMotNome').innerText = nomeMotorista;
    document.getElementById('jornadaTurnoPrevisto').innerText = turnoInfo;

    // Preenche os campos de input com a data e hora atual
    const agora = new Date();
    const dataAtualInput = agora.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const horaAtualInput = agora.toTimeString().substring(0, 5); // Formato HH:MM

    document.getElementById('jornadaDataFim').value = dataAtualInput;
    document.getElementById('jornadaHoraFim').value = horaAtualInput;

    // Exibe o modal
    modal.classList.add('show');
}

function fecharModalJornada() {
    document.getElementById('modalFinalizarJornada').classList.remove('show');
}

function confirmarFinalizarJornada() {
    const motoristaId = document.getElementById('jornadaMotId').value;
    const nomeMotorista = document.getElementById('jornadaMotNome').innerText;
    const dataFim = document.getElementById('jornadaDataFim').value;
    const horaFim = document.getElementById('jornadaHoraFim').value;

    if (!dataFim || !horaFim) {
        alert("Por favor, preencha a data e a hora de finalização corretamente.");
        return;
    }

    // Cria o objeto Date completo da finalização
    const dataFinalizacaoCompleta = new Date(`${dataFim}T${horaFim}`);
    
    // Confirmação para simular o salvamento (já que o backend não foi pedido)
    const confirmaSalvamento = confirm(`Confirmar finalização da jornada para ${nomeMotorista}?\nData/Hora Escolhida: ${dataFinalizacaoCompleta.toLocaleString('pt-BR')}`);
    
    if (confirmaSalvamento) {
        console.log(`Finalizando jornada do motorista ${motoristaId} em ${dataFinalizacaoCompleta}`);
        // AQUI você adicionaria a lógica para salvar no Supabase.
        // Como o pedido foi apenas o front-end, apenas fechamos o modal.
        fecharModalJornada();
        // Você poderia adicionar uma flag no motorista para ele não aparecer mais na tabela até o dia seguinte.
    }
}
// ==================== MÓDULO: CONTROLE DE JORNADA (12 HORAS) ====================

// Armazena as jornadas finalizadas no cache local
let jornadasFinalizadas = JSON.parse(localStorage.getItem('ccol_jornadas_finalizadas') || '{}');
let intervaloJornada = null;

function iniciarRelogioJornada() {
    if (intervaloJornada) clearInterval(intervaloJornada);
    intervaloJornada = setInterval(() => {
        const agora = new Date();
        const relogioEl = document.getElementById('relogioJornada');
        if (relogioEl) relogioEl.innerText = agora.toLocaleTimeString('pt-BR');
        
        const tabJornada = document.getElementById('tab-jornada');
        if (tabJornada && tabJornada.classList.contains('active')) {
            renderizarJornada(false); 
        }
    }, 1000); 
}

window.renderizarJornada = function(forcarReload = true) {
    const tbody = document.getElementById('listaJornadaAtiva');
    if (!tbody) return;

    const hojeStr = new Date().toISOString().split('T')[0];
    const agora = new Date();
    
    if (!jornadasFinalizadas[hojeStr]) jornadasFinalizadas[hojeStr] = {};

    let html = '';
    let temGenteRodando = false;

    const motoristasHoje = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));

    motoristasHoje.forEach(m => {
        if (m.masterDrive === 'Não' || m.destra === 'Não') return;
        
        const escalaHoje = window.getEscalaDiaComputada(m, hojeStr);
        const caminhaoHoje = escalaHoje ? escalaHoje.caminhao : 'F';
        
        if (caminhaoHoje === 'F') return;

        const turnoStr = m.turno; 
        if (!turnoStr || turnoStr === '-' || turnoStr === 'Misto') return;

        const horaInicioStr = turnoStr.split('-')[0];
        const horaInicioSplit = horaInicioStr.split(':');
        
        let dataInicioTurno = new Date(agora);
        dataInicioTurno.setHours(parseInt(horaInicioSplit[0]), parseInt(horaInicioSplit[1]), 0, 0);

        if (parseInt(horaInicioSplit[0]) >= 18 && agora.getHours() < 12) {
            dataInicioTurno.setDate(dataInicioTurno.getDate() - 1);
        }

        if (agora < dataInicioTurno && (dataInicioTurno - agora) > 3600000) return;

        temGenteRodando = true;

        const finalizouHoje = jornadasFinalizadas[hojeStr][m.id];

        let tempoDecorridoStr = '';
        let statusHtml = '';
        let linhaStyle = '';
        let btnFinalizar = '';

        if (finalizouHoje) {
            linhaStyle = 'background-color: rgba(61, 220, 132, 0.05); opacity: 0.8;';
            const dataFim = new Date(finalizouHoje.data_fim);
            
            const diffMsTotal = dataFim - dataInicioTurno;
            const diffHorasTotal = Math.floor(diffMsTotal / 3600000);
            const diffMinsTotal = Math.floor((diffMsTotal % 3600000) / 60000);
            
            let corDestaque = diffHorasTotal >= 12 ? '#ef4444' : 'var(--ccol-green-bright)';
            let statusTexto = diffHorasTotal >= 12 ? 'ENCERRADO (ESTOUROU)' : `ENCERRADO ÀS ${dataFim.toLocaleTimeString('pt-BR').substring(0,5)}`;
            let statusBorda = diffHorasTotal >= 12 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(61, 220, 132, 0.2)';

            tempoDecorridoStr = `<span style="color: ${corDestaque}; font-weight: bold;">${String(diffHorasTotal).padStart(2, '0')}h ${String(diffMinsTotal).padStart(2, '0')}m (Fechado)</span>`;
            statusHtml = `<span style="background: ${statusBorda}; border: 1px solid ${corDestaque}; color: ${corDestaque}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">${statusTexto}</span>`;
            btnFinalizar = `<button onclick="desfazerJornada(${m.id})" style="background: transparent; border: 1px solid var(--border-dim); color: var(--text-secondary); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">↩️ Desfazer</button>`;
        } else {
            const diffMs = agora - dataInicioTurno;
            const diffHoras = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);

            if (diffMs < 0) {
                 tempoDecorridoStr = '<span style="color: #888;">Vai iniciar...</span>';
                 statusHtml = '<span style="color: #888;">Aguardando Início</span>';
            } else {
                tempoDecorridoStr = `${String(diffHoras).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
                
                if (diffHoras >= 12) {
                    linhaStyle = 'background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444;';
                    tempoDecorridoStr = `<span style="color: #ef4444; font-weight: 800; font-size: 1.1rem; animation: piscar 1s infinite;">${tempoDecorridoStr} ⏳ ESTOUROU</span>`;
                    statusHtml = `<span style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">🚨 EXCEDEU 12 HORAS</span>`;
                } else if (diffHoras >= 11) {
                    linhaStyle = 'background-color: rgba(251, 146, 60, 0.1);';
                    tempoDecorridoStr = `<span style="color: #fb923c; font-weight: bold;">${tempoDecorridoStr}</span>`;
                    statusHtml = `<span style="background: rgba(251, 146, 60, 0.2); border: 1px solid #fb923c; color: #fb923c; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">⚠️ ALERTA: FIM PRÓXIMO</span>`;
                } else {
                    tempoDecorridoStr = `<span style="color: var(--ccol-blue-bright); font-weight: bold;">${tempoDecorridoStr}</span>`;
                    statusHtml = `<span style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--ccol-blue-bright); color: var(--ccol-blue-bright); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">EM ROTA</span>`;
                }
            }

            // Passamos o ID, Nome e a Data de Início para a função do prompt
            btnFinalizar = `<button onclick="finalizarJornadaComHora(${m.id}, '${m.nome}', '${dataInicioTurno.toISOString()}')" style="background: var(--ccol-blue-bright); border: none; color: #000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; box-shadow: 0 0 10px rgba(96,165,250,0.3);">🏁 Bater Ponto (Fim)</button>`;
        }

        html += `
            <tr style="${linhaStyle} transition: all 0.3s;">
                <td style="text-align: left; padding-left: 20px;">
                    <strong style="font-size: 1.05rem;">${m.nome}</strong><br>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Conj. ${m.conjuntoId || '-'} | Placa: ${caminhaoHoje} | Eq: ${m.equipe}</span>
                </td>
                <td style="font-weight: bold; color: #cbd5e1;">${turnoStr}</td>
                <td style="font-size: 1.1rem; letter-spacing: 1px;">${tempoDecorridoStr}</td>
                <td>${statusHtml}</td>
                <td>${btnFinalizar}</td>
            </tr>
        `;
    });

    if (!temGenteRodando) {
        html = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">Nenhum motorista em rota neste momento de acordo com a escala de hoje.</td></tr>';
    }

    if (forcarReload || !tbody.dataset.rendered) {
        tbody.innerHTML = html;
        tbody.dataset.rendered = "true";
    } else {
        tbody.innerHTML = html;
    }
}

// NOVA FUNÇÃO COM PROMPT PARA INSERIR A HORA EXATA
window.finalizarJornadaComHora = function(motoristaId, nomeMotorista, inicioIsoStr) {
    const inputHora = prompt(`Encerrando jornada de ${nomeMotorista}.\n\nDigite a HORA EXATA que ele encerrou o turno (Formato HH:MM):\nExemplo: 18:30 ou 06:15`, "");
    
    // Se o usuário clicar em Cancelar ou deixar em branco
    if (!inputHora) return; 

    // Validação básica do formato de hora (00:00 até 23:59)
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(inputHora)) {
        alert("Formato inválido! Por favor, use exatamente o formato HH:MM (com os dois pontos).");
        return;
    }

    const [horas, minutos] = inputHora.split(':');
    const dataInicio = new Date(inicioIsoStr);
    let dataFim = new Date(dataInicio);
    
    // Aplica a hora digitada na data de fim
    dataFim.setHours(parseInt(horas), parseInt(minutos), 0, 0);

    // Lógica inteligente: Se a hora de fim for menor que a hora de início, 
    // significa que a jornada virou o dia (Ex: Começou 18h e terminou 06h do dia seguinte)
    if (dataFim < dataInicio) {
        dataFim.setDate(dataFim.getDate() + 1);
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    
    if (!jornadasFinalizadas[hojeStr]) jornadasFinalizadas[hojeStr] = {};
    
    jornadasFinalizadas[hojeStr][motoristaId] = {
        data_fim: dataFim.toISOString(),
        hora_digitada: inputHora
    };
    
    localStorage.setItem('ccol_jornadas_finalizadas', JSON.stringify(jornadasFinalizadas));
    
    renderizarJornada(true);
}

window.desfazerJornada = function(motoristaId) {
    const hojeStr = new Date().toISOString().split('T')[0];
    if (jornadasFinalizadas[hojeStr] && jornadasFinalizadas[hojeStr][motoristaId]) {
        delete jornadasFinalizadas[hojeStr][motoristaId];
        localStorage.setItem('ccol_jornadas_finalizadas', JSON.stringify(jornadasFinalizadas));
        renderizarJornada(true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarRelogioJornada();

    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item') && e.target.closest('.nav-item').getAttribute('data-tab') === 'jornada') {
            setTimeout(() => {
                renderizarJornada(true);
            }, 100);
        }
    });
});
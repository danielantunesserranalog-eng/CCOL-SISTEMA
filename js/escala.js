// ==================== MÓDULO: ESCALA & ALOCAÇÃO ====================

function renderizarEscala() {
    const container = document.getElementById('escalaContainer');
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';
    if (!container) return;

    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    if (filtroSelectEl && filtroSelectEl.options.length <= 1) {
        conjuntos.forEach(c => filtroSelectEl.innerHTML += `<option value="${c.id}">Conjunto ${c.id}</option>`);
    }

    if (motoristas.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum motorista cadastrado.</p>';
        return;
    }

    let html = '';
    const inputData = document.getElementById('dataInicioEscala');
    currentDatas = getDatasSemana(inputData ? inputData.value : null);

    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id == filtroSelec) : conjuntos;

    conjuntosRender.forEach(conj => {
        const motoristasDoConjunto = motoristas.filter(m => m.conjuntoId === conj.id);
        if (motoristasDoConjunto.length === 0) return;

        // Estrutura Visual (Número gigante na esquerda)
        html += `
        <div class="escala-conjunto-box">
            <div class="escala-conjunto-numero">${conj.id}</div>
            <div class="escala-conjunto-tabelas">
        `;

        // Divisão Lógica: Equipes do Dia (A, B, C) e Equipes da Noite (D, E, F)
        const grupoCaminhao1 = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const grupoCaminhao2 = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const outros = motoristasDoConjunto.filter(m => !['A', 'B', 'C', 'D', 'E', 'F'].includes(m.equipe));

        const renderTable = (grupo, isFirst) => {
            if (grupo.length === 0) return '';
            let tHtml = `
                <table class="tabela-excel ${isFirst ? '' : 'tabela-subsequente'}">
                    <thead>
                        <tr>
                            <th class="name-main-h">NOME DO COLABORADOR</th>
                            <th class="turno-h">HORÁRIO</th>
                            <th class="go-h">GO</th>
                            <th class="equipe-h">EQUIPE</th>
                            ${currentDatas.map(d => `<th class="th-dia">${d.diaNum}<br>${d.diaTexto}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

            grupo.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                const goStr = conj.caminhoes?.map(c => typeof c === 'string' ? '' : c.go).filter(go=>go).join(' e ') || '-';
                
                // Se for folguista, mostramos "Misto" ou o turno original no layout
                let displayTurno = (m.equipe === 'C' || m.equipe === 'F') ? 'Misto' : (m.turno || '-');

                tHtml += `<tr>`;
                tHtml += `<td class="td-name" style="${isBlocked ? 'color: red;' : ''}"><strong>${m.nome}</strong></td>`;
                tHtml += `<td style="text-align: center;">${displayTurno}</td>`;
                tHtml += `<td style="text-align: center;">${goStr}</td>`;
                tHtml += `<td style="text-align: center;"><strong>${m.equipe !== '-' ? m.equipe : ''}</strong></td>`;

                currentDatas.forEach(d => {
                    const escala = escalas[m.id]?.[d.dateKey] || { caminhao: 'F' };
                    const isFolga = escala.caminhao === 'F';
                    const tdClass = isBlocked ? '' : (isFolga ? 'celula-folga' : 'celula-trabalho');
                    
                    let opcoes = `<option value="F">F</option>`;
                    opcoes += `<optgroup label="Neste Conjunto">`;
                    conj.caminhoes?.forEach(cam => {
                        const placa = typeof cam === 'string' ? cam : cam.placa;
                        opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''}>${placa}</option>`;
                    });
                    opcoes += `</optgroup>`;

                    const outrosConjuntos = conjuntos.filter(c => c.id !== conj.id);
                    if (outrosConjuntos.length > 0) {
                        opcoes += `<optgroup label="Outros Caminhões">`;
                        outrosConjuntos.forEach(outro => {
                            outro.caminhoes?.forEach(cam => {
                                const placa = typeof cam === 'string' ? cam : cam.placa;
                                opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''}>${placa}</option>`;
                            });
                        });
                        opcoes += `</optgroup>`;
                    }

                    tHtml += `<td class="${tdClass}"><select class="select-escala-excel" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''}>${isBlocked ? '<option value="F">Bloq</option>' : opcoes}</select></td>`;
                });
                tHtml += `</tr>`;
            });
            tHtml += `</tbody></table>`;
            return tHtml;
        };

        html += renderTable(grupoCaminhao1, true);
        html += renderTable(grupoCaminhao2, grupoCaminhao1.length === 0);
        html += renderTable(outros, grupoCaminhao1.length === 0 && grupoCaminhao2.length === 0);
        
        html += `</div></div>`;
    });

    container.innerHTML = html;
    document.querySelectorAll('.select-escala-excel').forEach(select => select.addEventListener('change', handleEscalaChange));
    atualizarStats();
}

function handleEscalaChange(e) {
    const select = e.target;
    const motoristaId = parseInt(select.dataset.motorista);
    const data = select.dataset.data;
    const novoCaminhao = select.value;
    
    if (escalas[motoristaId] && escalas[motoristaId][data]) {
        escalas[motoristaId][data].caminhao = novoCaminhao;
        select.closest('td').className = novoCaminhao === 'F' ? 'celula-folga' : 'celula-trabalho';
        
        db.upsertEscala({ id: `${motoristaId}_${data}`, motorista_id: motoristaId, data: data, turno: escalas[motoristaId][data].turno, caminhao: novoCaminhao, status: 'normal' });
        salvarBackupLocal();
    }
}

function renderizarAlocacao() {
    const tbody = document.getElementById('alocacaoList');
    if (!tbody) return;
    
    if (motoristas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum motorista cadastrado</td></tr>'; return;
    }
    
    tbody.innerHTML = motoristas.map(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        
        let equipeSelect = `<select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="-" ${m.equipe === '-' ? 'selected' : ''}>Sem Equipe</option>
            ${['A','B','C','D','E','F'].map(eq => `<option value="${eq}" ${m.equipe === eq ? 'selected' : ''}>Equipe ${eq}</option>`).join('')}
        </select>`;
        
        let turnoSelect = `<select class="select-aloc-turno select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            ${isBlocked ? '<option value="-">-</option>' : TURNOS.map(t => `<option value="${t.periodo}" ${m.turno === t.periodo ? 'selected' : ''}>${t.periodo}</option>`).join('')}
        </select>`;
        
        let conjuntoSelect = `<select class="select-aloc-conjunto select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="">Não Alocado</option>
            ${isBlocked ? '' : conjuntos.map(c => `<option value="${c.id}" ${m.conjuntoId === c.id ? 'selected' : ''}>Conjunto ${c.id}</option>`).join('')}
        </select>`;
        
        // Novo input para Data Âncora Individual
        let dataAncoraInput = `<input type="date" class="input-aloc-data dark-select" data-id="${m.id}" value="${m.data_ancora || ''}" ${isBlocked ? 'disabled' : ''} style="padding: 8px; width: 140px; text-align: center;">`;
        
        return `<tr style="${isBlocked ? 'background-color: #ffe6e6;' : ''}">
            <td style="${isBlocked ? 'color: #cc0000;' : ''}"><strong>${m.nome}</strong></td>
            <td>${equipeSelect}</td>
            <td>${turnoSelect}</td>
            <td>${conjuntoSelect}</td>
            <td>${dataAncoraInput}</td>
        </tr>`;
    }).join('');
    
    document.querySelectorAll('.select-aloc-equipe, .select-aloc-turno, .select-aloc-conjunto, .input-aloc-data').forEach(el => el.addEventListener('change', updateAlocacao));
}

function updateAlocacao(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    const tr = e.target.closest('tr');
    
    motorista.equipe = tr.querySelector('.select-aloc-equipe').value;
    motorista.turno = tr.querySelector('.select-aloc-turno').value;
    const conjVal = tr.querySelector('.select-aloc-conjunto').value;
    motorista.conjuntoId = conjVal ? parseInt(conjVal) : null;
    motorista.data_ancora = tr.querySelector('.input-aloc-data').value; // Puxa a data digitada
    
    db.updateMotorista(id, { 
        equipe: motorista.equipe, 
        turno: motorista.turno, 
        conjuntoId: motorista.conjuntoId,
        data_ancora: motorista.data_ancora 
    });
    
    salvarBackupLocal();
    renderizarEscala(); atualizarStats();
}

function gerarEscala4x2() {
    if (!confirm("Gerar escala inteligente 4x2? Isso substituirá a tela atual.")) return;
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';
    
    let motoristasAtualizados = 0;

    motoristas.forEach(m => {
        if (filtroSelec !== 'todos' && m.conjuntoId != filtroSelec) return;
        if (m.masterDrive === 'Não' || m.destra === 'Não' || !m.equipe || m.equipe === '-' || !m.conjuntoId) return;

        const conjunto = conjuntos.find(c => c.id === m.conjuntoId);
        if (!conjunto || !conjunto.caminhoes) return;

        motoristasAtualizados++;
        
        // Se o motorista tem uma data específica usa ela, senão usa uma data global padrão
        const dataAncoraStr = m.data_ancora ? `${m.data_ancora}T00:00:00` : '2026-03-25T00:00:00';
        const dataAncora = new Date(dataAncoraStr);
        
        // Identifica as placas dos caminhões 1 e 2 do conjunto
        let placa1 = conjunto.caminhoes.length > 0 ? (typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa) : 'F';
        let placa2 = conjunto.caminhoes.length > 1 ? (typeof conjunto.caminhoes[1] === 'string' ? conjunto.caminhoes[1] : conjunto.caminhoes[1].placa) : placa1;

        currentDatas.forEach(d => {
            const dataAtual = new Date(d.dateKey + 'T00:00:00');
            const msPorDia = 1000 * 60 * 60 * 24;
            const diffDays = Math.floor((dataAtual - dataAncora) / msPorDia);
            
            // Ciclo de 6 dias (0 a 5). Fórmula segura que aceita cálculos retroativos
            let cicloDia = ((diffDays % 6) + 6) % 6; 
            
            let statusCaminhao = 'F';

            // LÓGICA EXATA DO PDF SERRANA FLORESTAL
            switch (m.equipe) {
                case 'A': // Fixo Caminhão 1 (Dia)
                case 'D': // Fixo Caminhão 1 (Noite)
                    statusCaminhao = (cicloDia === 0 || cicloDia === 1) ? 'F' : placa1;
                    break;
                case 'B': // Fixo Caminhão 2 (Dia)
                case 'E': // Fixo Caminhão 2 (Noite)
                    statusCaminhao = (cicloDia === 2 || cicloDia === 3) ? 'F' : placa2;
                    break;
                case 'C': // Folguista (Dia)
                case 'F': // Folguista (Noite)
                    if (cicloDia === 0 || cicloDia === 1) {
                        statusCaminhao = placa1; // Cobre A/D no caminhão 1
                    } else if (cicloDia === 2 || cicloDia === 3) {
                        statusCaminhao = placa2; // Cobre B/E no caminhão 2
                    } else {
                        statusCaminhao = 'F'; // Dias 4 e 5 o folguista descansa
                    }
                    break;
            }

            if (!escalas[m.id]) escalas[m.id] = {};
            if (!escalas[m.id][d.dateKey]) escalas[m.id][d.dateKey] = { turno: m.turno };
            
            escalas[m.id][d.dateKey].caminhao = statusCaminhao;

            db.upsertEscala({ id: `${m.id}_${d.dateKey}`, motorista_id: m.id, data: d.dateKey, turno: m.turno, caminhao: statusCaminhao, status: 'normal' });
        });
    });

    if (motoristasAtualizados === 0) {
        alert("Nenhum motorista válido foi gerado! Verifique as equipes e o Master/Destra.");
        return;
    }

    salvarBackupLocal();
    renderizarEscala(); 
    alert(`Escala automática gerada com a lógica de Folguistas!`);
}

function zerarEscala() {
    if (!confirm("Deseja ZERAR a escala na tela?")) return;
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';

    motoristas.forEach(m => {
        if (filtroSelec !== 'todos' && m.conjuntoId != filtroSelec) return;
        currentDatas.forEach(d => {
            if (escalas[m.id]?.[d.dateKey]) {
                escalas[m.id][d.dateKey].caminhao = 'F';
                db.upsertEscala({ id: `${m.id}_${d.dateKey}`, motorista_id: m.id, data: d.dateKey, turno: m.turno, caminhao: 'F', status: 'normal' });
            }
        });
    });
    salvarBackupLocal();
    renderizarEscala();
}
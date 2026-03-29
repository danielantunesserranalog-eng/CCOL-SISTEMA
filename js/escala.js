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
    
    // Atualiza as datas com base no input antes de renderizar
    const inputData = document.getElementById('dataInicioEscala');
    currentDatas = getDatasSemana(inputData ? inputData.value : null);

    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id == filtroSelec) : conjuntos;

    conjuntosRender.forEach(conj => {
        const motoristasDoConjunto = motoristas.filter(m => m.conjuntoId === conj.id);
        if (motoristasDoConjunto.length === 0) return;

        // Agrupar os motoristas pelo Turno (ex: 08h00-20h00 e 20h00-08h00)
        const gruposTurno = {};
        motoristasDoConjunto.forEach(m => {
            const t = m.turno || 'Sem Turno';
            if (!gruposTurno[t]) gruposTurno[t] = [];
            gruposTurno[t].push(m);
        });

        // Estrutura Visual idêntica à imagem (Número grande na esquerda, tabelas na direita)
        html += `
        <div class="escala-conjunto-box">
            <div class="escala-conjunto-numero">${conj.id}</div>
            <div class="escala-conjunto-tabelas">
        `;

        // Renderiza uma mini-tabela para cada turno dentro do conjunto
        Object.keys(gruposTurno).sort().forEach((turno, idx) => {
            const motoristasTurno = gruposTurno[turno].sort((a, b) => (a.equipe || '').localeCompare(b.equipe || ''));
            const isFirst = idx === 0;

            html += `
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

            motoristasTurno.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                const goStr = conj.caminhoes?.map(c => c.go).filter(go=>go).join(' e ') || '-';

                html += `<tr>`;
                html += `<td class="td-name" style="${isBlocked ? 'color: red;' : ''}"><strong>${m.nome}</strong></td>`;
                html += `<td style="text-align: center;">${m.turno || '-'}</td>`;
                html += `<td style="text-align: center;">${goStr}</td>`;
                html += `<td style="text-align: center;"><strong>${m.equipe !== '-' ? m.equipe : ''}</strong></td>`;

                currentDatas.forEach(d => {
                    const escala = escalas[m.id]?.[d.dateKey] || { caminhao: 'F' };
                    const isFolga = escala.caminhao === 'F';
                    const tdClass = isBlocked ? '' : (isFolga ? 'celula-folga' : 'celula-trabalho');
                    
                    let opcoes = `<option value="F">F</option>`;
                    
                    // Opções de caminhões do próprio conjunto
                    opcoes += `<optgroup label="Neste Conjunto">`;
                    conj.caminhoes?.forEach(cam => {
                        const placa = typeof cam === 'string' ? cam : cam.placa;
                        opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''}>${placa}</option>`;
                    });
                    opcoes += `</optgroup>`;

                    // Opções para alocar noutros caminhões da frota
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

                    html += `<td class="${tdClass}"><select class="select-escala-excel" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''}>${isBlocked ? '<option value="F">Bloq</option>' : opcoes}</select></td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
        });
        
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
        tbody.innerHTML = '<tr><td colspan="4">Nenhum motorista cadastrado</td></tr>'; return;
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
        
        return `<tr style="${isBlocked ? 'background-color: #ffe6e6;' : ''}"><td style="${isBlocked ? 'color: #cc0000;' : ''}"><strong>${m.nome}</strong></td><td>${equipeSelect}</td><td>${turnoSelect}</td><td>${conjuntoSelect}</td></tr>`;
    }).join('');
    
    document.querySelectorAll('.select-aloc-equipe, .select-aloc-turno, .select-aloc-conjunto').forEach(el => el.addEventListener('change', updateAlocacao));
}

function updateAlocacao(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    const tr = e.target.closest('tr');
    
    motorista.equipe = tr.querySelector('.select-aloc-equipe').value;
    motorista.turno = tr.querySelector('.select-aloc-turno').value;
    const conjVal = tr.querySelector('.select-aloc-conjunto').value;
    motorista.conjuntoId = conjVal ? parseInt(conjVal) : null;
    
    db.updateMotorista(id, { equipe: motorista.equipe, turno: motorista.turno, conjuntoId: motorista.conjuntoId });
    salvarBackupLocal();
    renderizarEscala(); atualizarStats();
}

function gerarEscala4x2() {
    if (!confirm("Gerar escala 4x2 automática? Isso substituirá a tela atual.")) return;
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';
    
    // A âncora bate EXATAMENTE com a sua imagem: Dia 25/03/2026 é o 1º dia de folga da Equipe A e D
    const dataAncora = new Date('2026-03-25T00:00:00'); 

    // Alinhamento exato baseado na IMAGEM que você mandou:
    // A e D folgam dias 25 e 26 (Offset 0)
    // B e E folgam dias 29 e 30 (Offset 2)
    // C e F folgam dias 27 e 28 (Offset 4)
    const offsetsEquipe = { 'A': 0, 'D': 0, 'B': 2, 'E': 2, 'C': 4, 'F': 4 };

    let motoristasAtualizados = 0;

    motoristas.forEach(m => {
        if (filtroSelec !== 'todos' && m.conjuntoId != filtroSelec) return;
        // Se o motorista estiver bloqueado ou não tiver equipe, o sistema PULA ele.
        if (m.masterDrive === 'Não' || m.destra === 'Não' || !m.equipe || m.equipe === '-' || !m.conjuntoId) return;

        motoristasAtualizados++;
        const offset = offsetsEquipe[m.equipe] || 0;
        const conjunto = conjuntos.find(c => c.id === m.conjuntoId);
        
        let caminhaoPadrao = 'F';
        if (conjunto?.caminhoes?.length > 0) {
            // Equipe A e D assumem o Caminhão 1. Equipe B e E assumem o Caminhão 2. C e F cobrem.
            if (m.equipe === 'A' || m.equipe === 'D') {
                caminhaoPadrao = typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa;
            } else if (m.equipe === 'B' || m.equipe === 'E') {
                const idx = conjunto.caminhoes.length > 1 ? 1 : 0;
                caminhaoPadrao = typeof conjunto.caminhoes[idx] === 'string' ? conjunto.caminhoes[idx] : conjunto.caminhoes[idx].placa;
            } else {
                caminhaoPadrao = typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa;
            }
        }

        currentDatas.forEach(d => {
            const dataAtual = new Date(d.dateKey + 'T00:00:00');
            const diffTime = dataAtual - dataAncora;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Lógica do ciclo de 6 dias
            let cicloDia = ((diffDays + offset) % 6 + 6) % 6; 
            let statusCaminhao = (cicloDia === 0 || cicloDia === 1) ? 'F' : caminhaoPadrao;
            
            if (!escalas[m.id]) escalas[m.id] = {};
            if (!escalas[m.id][d.dateKey]) escalas[m.id][d.dateKey] = { turno: m.turno };
            escalas[m.id][d.dateKey].caminhao = statusCaminhao;

            db.upsertEscala({ id: `${m.id}_${d.dateKey}`, motorista_id: m.id, data: d.dateKey, turno: m.turno, caminhao: statusCaminhao, status: 'normal' });
        });
    });

    if (motoristasAtualizados === 0) {
        alert("Nenhum motorista foi gerado! Lembre-se de ir na aba '🔄 Alocação Geral' e definir a EQUIPE e o CONJUNTO deles antes de gerar.");
        return;
    }

    salvarBackupLocal();
    renderizarEscala(); 
    alert(`Sucesso! Escala automática gerada para ${motoristasAtualizados} motoristas.`);
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
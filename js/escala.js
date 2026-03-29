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
    currentDatas = getDatasSemana();
    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id == filtroSelec) : conjuntos;

    conjuntosRender.forEach(conj => {
        const motoristasDoConjunto = motoristas.filter(m => m.conjuntoId === conj.id).sort((a, b) => (a.equipe || '').localeCompare(b.equipe || ''));
        if (motoristasDoConjunto.length === 0) return;

        html += `
        <div class="tabela-conjunto-wrapper">
            <table class="tabela-excel">
                <thead>
                    <tr>
                        <th>CONJUNTO</th><th>NOME DO COLABORADOR</th><th>HORÁRIO</th><th>GO</th><th>EQUIPE</th>
                        ${currentDatas.map(d => `<th class="th-dia">${d.diaNum}<br>${d.diaTexto}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

        motoristasDoConjunto.forEach((m, index) => {
            const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
            const goStr = conj.caminhoes?.map(c => c.go).filter(go=>go).join(' e ') || '-';

            html += `<tr>`;
            if (index === 0) html += `<td class="conjunto-col" rowspan="${motoristasDoConjunto.length}">${conj.id}</td>`;
            html += `<td style="text-align: left; padding-left: 10px; ${isBlocked ? 'color: red;' : ''}"><strong>${m.nome}</strong></td>`;
            html += `<td>${m.turno || '-'}</td><td>${goStr}</td><td><strong>${m.equipe !== '-' ? m.equipe : ''}</strong></td>`;

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

                // Opções para alocar pontualmente noutros caminhões da frota
                const outrosConjuntos = conjuntos.filter(c => c.id !== conj.id);
                if (outrosConjuntos.length > 0) {
                    opcoes += `<optgroup label="Outros Caminhões">`;
                    outrosConjuntos.forEach(outro => {
                        outro.caminhoes?.forEach(cam => {
                            const placa = typeof cam === 'string' ? cam : cam.placa;
                            opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''}>${placa} (Conj. ${outro.id})</option>`;
                        });
                    });
                    opcoes += `</optgroup>`;
                }

                html += `<td class="${tdClass}"><select class="select-escala-excel" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''}>${isBlocked ? '<option value="F">Bloq</option>' : opcoes}</select></td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
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
    if (!confirm("Isso irá gerar um padrão 4x2 automático. Deseja continuar?")) return;
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';
    const offsetsEquipe = { 'A': 0, 'B': 2, 'C': 4, 'D': 0, 'E': 2, 'F': 4 };

    motoristas.forEach(m => {
        if (filtroSelec !== 'todos' && m.conjuntoId != filtroSelec) return;
        if (m.masterDrive === 'Não' || m.destra === 'Não' || !m.equipe || m.equipe === '-') return;

        const offset = offsetsEquipe[m.equipe] || 0;
        const conjunto = conjuntos.find(c => c.id === m.conjuntoId);
        let caminhaoPadrao = 'F';
        if (conjunto?.caminhoes?.length > 0) {
            const idxCam = (m.equipe === 'B' || m.equipe === 'E') && conjunto.caminhoes.length > 1 ? 1 : 0;
            caminhaoPadrao = typeof conjunto.caminhoes[idxCam] === 'string' ? conjunto.caminhoes[idxCam] : conjunto.caminhoes[idxCam].placa;
        }

        currentDatas.forEach(d => {
            const diffDays = Math.floor(Math.abs(new Date(d.dateKey + 'T00:00:00') - new Date('2024-01-01T00:00:00')) / (1000 * 60 * 60 * 24));
            const statusCaminhao = (diffDays + offset) % 6 < 4 ? caminhaoPadrao : 'F';
            
            if (!escalas[m.id]) escalas[m.id] = {};
            if (!escalas[m.id][d.dateKey]) escalas[m.id][d.dateKey] = { turno: m.turno };
            escalas[m.id][d.dateKey].caminhao = statusCaminhao;

            db.upsertEscala({ id: `${m.id}_${d.dateKey}`, motorista_id: m.id, data: d.dateKey, turno: m.turno, caminhao: statusCaminhao, status: 'normal' });
        });
    });

    salvarBackupLocal();
    renderizarEscala(); alert("Escala gerada com sucesso!");
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
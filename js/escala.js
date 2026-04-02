// ==================== MÓDULO: ESCALA & ALOCAÇÃO ====================

window.popularSelectMotoristas = function() {
    const select = document.getElementById('buscaMotoristaEscala');
    if (!select) return;
    
    const valorAtual = select.value;
    let html = '<option value="">Selecione o motorista...</option>';
    
    const motoristasOrdenados = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));
    
    motoristasOrdenados.forEach(m => {
        html += `<option value="${m.nome}">${m.nome}</option>`;
    });
    
    select.innerHTML = html;
    if (valorAtual && motoristas.some(m => m.nome === valorAtual)) {
        select.value = valorAtual;
    }
};

window.getStatusMotorista = function(m, dDate) {
    if (!m || !m.data_ancora) return 'F';
    const strAncora = m.data_ancora.split('T')[0];
    const dataAncora = new Date(strAncora + 'T00:00:00');
    
    const utcAncora = Date.UTC(dataAncora.getFullYear(), dataAncora.getMonth(), dataAncora.getDate());
    const utcAtual = Date.UTC(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
    const diffDays = Math.round((utcAtual - utcAncora) / (1000 * 60 * 60 * 24));
    
    const cicloDia = ((diffDays % 6) + 6) % 6;
    return cicloDia < 4 ? 'TRAB' : 'F';
}

window.calcularEscalaMatematica = function(motorista, dateKey) {
    if (!motorista.data_ancora || motorista.masterDrive === 'Não' || motorista.destra === 'Não') {
        return { caminhao: 'F', turno: motorista.turno, status: 'fallback' };
    }
    if (motorista.conjuntoId && (!motorista.equipe || motorista.equipe === '-')) {
        return { caminhao: 'F', turno: motorista.turno, status: 'fallback' };
    }

    const dDate = new Date(dateKey + 'T00:00:00');
    const statusMot = window.getStatusMotorista(motorista, dDate);

    if (statusMot === 'F') return { caminhao: 'F', turno: motorista.turno, status: 'fallback' };

    const conjunto = conjuntos.find(c => c.id === motorista.conjuntoId);
    if (!conjunto || !conjunto.caminhoes) return { caminhao: 'TRAB', turno: motorista.turno, status: 'fallback' };

    let placa1 = conjunto.caminhoes.length > 0 ? (typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa) : 'F';
    let placa2 = conjunto.caminhoes.length > 1 ? (typeof conjunto.caminhoes[1] === 'string' ? conjunto.caminhoes[1] : conjunto.caminhoes[1].placa) : placa1;
    let statusCaminhao = 'F';

    if (motorista.equipe === 'A' || motorista.equipe === 'D') statusCaminhao = placa1;
    else if (motorista.equipe === 'B' || motorista.equipe === 'E') statusCaminhao = placa2;
    else if (motorista.equipe === 'C') { 
        const fixoA = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'A');
        const fixoB = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'B');
        const statusA = fixoA ? window.getStatusMotorista(fixoA, dDate) : 'F';
        const statusB = fixoB ? window.getStatusMotorista(fixoB, dDate) : 'F';
        if (statusA === 'F') statusCaminhao = placa1;
        else if (statusB === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1; 
    } 
    else if (motorista.equipe === 'F') {
        const fixoD = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'D');
        const fixoE = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'E');
        const statusD = fixoD ? window.getStatusMotorista(fixoD, dDate) : 'F';
        const statusE = fixoE ? window.getStatusMotorista(fixoE, dDate) : 'F';
        if (statusD === 'F') statusCaminhao = placa1;
        else if (statusE === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1;
    }
    return { caminhao: statusCaminhao, turno: motorista.turno, status: 'fallback' };
}

window.getEscalaDiaComputada = function(motorista, dateKey) {
    if (escalas[motorista.id] && escalas[motorista.id][dateKey]) {
        return escalas[motorista.id][dateKey];
    }
    return window.calcularEscalaMatematica(motorista, dateKey);
}

window.renderizarEscala = function() {
    const container = document.getElementById('escalaContainer');
    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    window.popularSelectMotoristas();

    if (filtroSelectEl) {
        const valAtual = filtroSelectEl.value;
        let optHtml = '<option value="todos">Todos</option>';
        conjuntos.forEach(c => optHtml += `<option value="${c.id}">Conjunto ${c.id}</option>`);
        if (filtroSelectEl.innerHTML !== optHtml) {
            filtroSelectEl.innerHTML = optHtml;
            if (conjuntos.some(c => c.id.toString() === valAtual)) filtroSelectEl.value = valAtual;
            else filtroSelectEl.value = 'todos';
        }
    }

    if (!container) return;

    if (motoristas.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum motorista cadastrado.</p>';
        return;
    }

    const inputData = document.getElementById('dataInicioEscala');
    let dataBaseStr = inputData && inputData.value ? inputData.value : new Date().toISOString().split('T')[0];
    let dataBase = new Date(dataBaseStr + 'T00:00:00');
    
    // Gerar 7 dias
    let diasRender = [];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for(let i = 0; i < 7; i++) {
        let d = new Date(dataBase);
        d.setDate(d.getDate() + i);
        let ano = d.getFullYear();
        let mes = String(d.getMonth() + 1).padStart(2, '0');
        let dia = String(d.getDate()).padStart(2, '0');
        diasRender.push({
            dateKey: `${ano}-${mes}-${dia}`,
            diaNum: dia + '/' + mes,
            diaTexto: diasSemana[d.getDay()]
        });
    }
    window.currentDatas = diasRender;

    const filtroSelec = filtroSelectEl ? filtroSelectEl.value : 'todos';
    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id.toString() === filtroSelec.toString()) : [...conjuntos];

    if (filtroSelec === 'todos') {
        if (motoristas.some(m => !m.conjuntoId)) {
            conjuntosRender.push({ id: 'S/F', isSemFrota: true, caminhoes: [] });
        }
    }

    conjuntosRender.sort((a, b) => {
        if (a.isSemFrota) return 1; 
        if (b.isSemFrota) return -1;
        return parseInt(a.id) - parseInt(b.id);
    });

    let html = '';

    conjuntosRender.forEach(conj => {
        let motoristasDoConjunto = conj.isSemFrota ? motoristas.filter(m => !m.conjuntoId) : motoristas.filter(m => m.conjuntoId === conj.id);

        if (motoristasDoConjunto.length === 0) return;

        let numeroDisplay = conj.isSemFrota ? 'SEM FROTA / RESERVAS' : `TRINCA ${String(conj.id).padStart(2, '0')}`;

        const grupoDia = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const grupoNoite = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const outros = motoristasDoConjunto.filter(m => !['A', 'B', 'C', 'D', 'E', 'F'].includes(m.equipe));

        // CONTAINER DA TRINCA
        html += `<div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">`;
        
        // TÍTULO DA TRINCA (TOPO)
        html += `<div style="background: #0f172a; padding: 12px 20px; font-size: 1.1rem; font-weight: 800; color: #fff; border-bottom: 2px solid #3b82f6; text-align: left; letter-spacing: 1px;">
                    🚛 ${numeroDisplay}
                 </div>`;

        // TABELA UNIFICADA (Para alinhar perfeitamente as colunas)
        html += `<div style="overflow-x: auto; width: 100%;">`;
        html += `<table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.85rem; min-width: 950px;">`;
        
        // CABEÇALHO DA TABELA
        html += `<thead>
                    <tr style="background-color: rgba(30, 41, 59, 0.9); color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 12%;">Horário</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 10%;">GO/Placa</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 6%;">Equipe</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 10%;">Posição</th>
                        <th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.05); text-align: left; width: 22%;">Colaborador</th>
                        ${diasRender.map(d => `<th style="padding: 10px 5px; border: 1px solid rgba(255,255,255,0.05); width: 5.7%; color: #cbd5e1;">${d.diaTexto}<br><span style="font-size:0.85rem; font-weight:800; color: #fff;">${d.diaNum}</span></th>`).join('')}
                    </tr>
                 </thead>`;
        
        html += `<tbody>`;

        const renderRows = (grupo, tituloGrupo) => {
            if (grupo.length === 0) return '';
            let rowsHtml = '';
            
            // LINHA SEPARADORA DO TURNO
            rowsHtml += `<tr style="background-color: rgba(0,0,0,0.6);">
                            <td colspan="${5 + diasRender.length}" style="padding: 8px 15px; font-weight: 800; font-size: 0.8rem; color: #e2e8f0; text-align: left; border: 1px solid rgba(255,255,255,0.05);">
                                ${tituloGrupo}
                            </td>
                         </tr>`;

            grupo.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                
                let goStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    let go1 = (typeof cam1 === 'string' || !cam1.go) ? '-' : cam1.go;
                    let go2 = (typeof cam2 === 'string' || !cam2.go) ? '-' : cam2.go;

                    if (m.equipe === 'A' || m.equipe === 'D') goStr = go1;
                    else if (m.equipe === 'B' || m.equipe === 'E') goStr = go2;
                    else if (m.equipe === 'C' || m.equipe === 'F') goStr = (go1 !== '-' && go2 !== '-' && go1 !== go2) ? `${go1} / ${go2}` : (go1 !== '-' ? go1 : go2);
                    else goStr = go1 !== '-' ? go1 : '-';
                }
                
                let posicaoStr = '-';
                if (m.equipe === 'A' || m.equipe === 'D') posicaoStr = 'FROTA 1';
                else if (m.equipe === 'B' || m.equipe === 'E') posicaoStr = 'FROTA 2';
                else if (m.equipe === 'C' || m.equipe === 'F') posicaoStr = 'FOLGUISTA';

                rowsHtml += `<tr style="background-color: transparent; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;">`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05);">${m.turno || '-'}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: bold; color: #93c5fd;">${goStr}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: 800; color: #f8fafc;">${m.equipe && m.equipe !== '-' ? m.equipe : ''}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: 600; color: #cbd5e1;">${posicaoStr}</td>`;
                rowsHtml += `<td class="td-name" style="padding: 8px 15px; border: 1px solid rgba(255,255,255,0.05); text-align: left; ${isBlocked ? 'color: #f87171;' : 'color: #fff;'} font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.nome}</td>`;

                diasRender.forEach(d => {
                    const escala = window.getEscalaDiaComputada(m, d.dateKey);
                    const isFolga = escala.caminhao === 'F';
                    
                    // Cores CCOL: Azul para Trabalho (T), Laranja para Folga (F)
                    let bgCell = isFolga ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)';
                    let colorCell = isFolga ? '#fb923c' : '#93c5fd';
                    let borderSide = isFolga ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
                    
                    let opcoes = `<option value="F" ${isFolga ? 'selected' : ''} style="background: #1e293b; color: #fff;">F</option>`;
                    if (!isFolga) {
                        opcoes += `<option value="TRAB" ${escala.caminhao === 'TRAB' ? 'selected' : ''} style="background: #1e293b; color: #fff;">T</option>`;
                        if (!conj.isSemFrota) {
                            conj.caminhoes?.forEach(cam => {
                                const placa = typeof cam === 'string' ? cam : cam.placa;
                                opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''} style="background: #1e293b; color: #fff;">${placa}</option>`;
                            });
                        }
                    }

                    rowsHtml += `<td style="padding: 4px; border: 1px solid rgba(255,255,255,0.05); border-left: ${borderSide}; border-right: ${borderSide}; background-color: ${bgCell}; text-align: center; vertical-align: middle;">
                        <select class="select-escala-excel" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''} style="width: 100%; padding: 6px 0; background: transparent; border: none; color: ${colorCell}; font-weight: 800; font-size: 0.9rem; text-align: center; appearance: none; cursor: pointer; outline: none; text-align-last: center;">
                            ${isBlocked ? '<option value="F">Bloq</option>' : opcoes}
                        </select>
                    </td>`;
                });
                rowsHtml += `</tr>`;
            });
            return rowsHtml;
        };

        html += renderRows(grupoDia, '☀️ TURNO DO DIA (EQUIPES A, B, C)');
        html += renderRows(grupoNoite, '🌙 TURNO DA NOITE (EQUIPES D, E, F)');
        html += renderRows(outros, '⚠️ OUTROS / SEM TURNO FIXO');

        html += `</tbody></table></div></div>`;
    });

    container.innerHTML = html;
    document.querySelectorAll('.select-escala-excel').forEach(select => select.addEventListener('change', handleEscalaChange));
    if(typeof atualizarStats === 'function') atualizarStats();
    
    if (document.getElementById('buscaMotoristaEscala') && document.getElementById('buscaMotoristaEscala').value.trim() !== '') {
        window.buscarMotoristaEscala();
    }
}

window.limparDestaqueMotorista = function() {
    const linhas = document.querySelectorAll('#escalaContainer tbody tr');
    linhas.forEach(tr => {
        Array.from(tr.children).forEach(td => {
            td.style.removeProperty('background-color');
            const select = td.querySelector('select');
            if (select) select.style.removeProperty('color');
        });
    });
};

window.limparBuscaMotorista = function() {
    const selectBusca = document.getElementById('buscaMotoristaEscala');
    if(selectBusca) selectBusca.value = '';
    window.limparDestaqueMotorista();
};

window.buscarMotoristaEscala = function() {
    const selectBusca = document.getElementById('buscaMotoristaEscala');
    if (!selectBusca) return;
    const termo = selectBusca.value.trim().toLowerCase();
    window.limparDestaqueMotorista();
    if (termo === '') return;

    let encontrou = false;
    document.querySelectorAll('#escalaContainer tbody tr').forEach(tr => {
        const tdNome = tr.querySelector('.td-name');
        if (tdNome && tdNome.textContent.toLowerCase().includes(termo)) {
            Array.from(tr.children).forEach(td => {
                td.style.setProperty('background-color', 'rgba(253, 224, 71, 0.8)', 'important'); // Amarelo destaque
                const select = td.querySelector('select');
                if (select) select.style.setProperty('color', '#000', 'important');
            });
            if (!encontrou) {
                tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                encontrou = true;
            }
        }
    });
}

function handleEscalaChange(e) {
    const select = e.target;
    const motoristaId = parseInt(select.dataset.motorista);
    const data = select.dataset.data;
    const novoCaminhao = select.value;
    
    const m = motoristas.find(mot => mot.id === motoristaId);
    if(m) {
        if (!escalas[motoristaId]) escalas[motoristaId] = {};
        escalas[motoristaId][data] = { turno: m.turno, caminhao: novoCaminhao, status: 'manual' };
        
        let isFolga = novoCaminhao === 'F';
        let tdParent = select.closest('td');
        
        tdParent.style.backgroundColor = isFolga ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)';
        tdParent.style.borderLeft = isFolga ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
        tdParent.style.borderRight = isFolga ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
        select.style.color = isFolga ? '#fb923c' : '#93c5fd';

        db.upsertEscala({ id: `${motoristaId}_${data}`, motorista_id: motoristaId, data: data, turno: m.turno, caminhao: novoCaminhao, status: 'manual' });
        salvarBackupLocal();
        if(typeof atualizarStats === 'function') atualizarStats();
    }
}

function renderizarAlocacao() {
    const tbody = document.getElementById('alocacaoList');
    if (!tbody) return;
    
    if (motoristas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum motorista cadastrado</td></tr>'; return;
    }

    const motoristasOrdenados = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId || 999999;
        const conjB = b.conjuntoId || 999999;
        if (conjA !== conjB) return conjA - conjB; 
        return a.nome.localeCompare(b.nome);
    });

    let html = '';
    let lastConjunto = null;
    
    motoristasOrdenados.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const currentConjunto = m.conjuntoId || 'sem_conjunto';

        if (currentConjunto !== lastConjunto) {
            const tituloConjunto = m.conjuntoId ? `🚛 TRINCA / CONJUNTO ${m.conjuntoId}` : `🚨 MOTORISTAS NÃO LIBERADOS / SEM FROTA`;
            const btnReset = m.conjuntoId ? `<button onclick="resetarCicloConjunto(${m.conjuntoId})" style="float: right; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">🔄 ZERAR CICLO</button>` : '';

            html += `
                <tr style="background-color: rgba(255, 255, 255, 0.05); border-top: 2px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td colspan="5" style="text-align: left; padding-left: 15px; font-weight: 800; color: #3b82f6; padding-top: 12px; padding-bottom: 12px; font-size: 0.95rem;">
                        ${tituloConjunto}
                        ${btnReset}
                    </td>
                </tr>
            `;
            lastConjunto = currentConjunto;
        }
        
        let equipeSelect = `<select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="-" ${m.equipe === '-' || !m.equipe ? 'selected' : ''}>Sem Equipe</option>
            <option value="A" ${m.equipe === 'A' ? 'selected' : ''}>A (Dia - Frota 1)</option>
            <option value="B" ${m.equipe === 'B' ? 'selected' : ''}>B (Dia - Frota 2)</option>
            <option value="C" ${m.equipe === 'C' ? 'selected' : ''}>C (Dia - FOLGUISTA)</option>
            <option value="D" ${m.equipe === 'D' ? 'selected' : ''}>D (Noite - Frota 1)</option>
            <option value="E" ${m.equipe === 'E' ? 'selected' : ''}>E (Noite - Frota 2)</option>
            <option value="F" ${m.equipe === 'F' ? 'selected' : ''}>F (Noite - FOLGUISTA)</option>
        </select>`;
        
        let turnoSelect = `<select class="select-aloc-turno select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            ${isBlocked ? '<option value="-">-</option>' : TURNOS.map(t => `<option value="${t.periodo}" ${m.turno === t.periodo ? 'selected' : ''}>${t.periodo}</option>`).join('')}
        </select>`;
        
        let conjuntoSelect = `<select class="select-aloc-conjunto select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="">Não Alocado</option>
            ${isBlocked ? '' : conjuntos.map(c => `<option value="${c.id}" ${m.conjuntoId === c.id ? 'selected' : ''}>Conjunto ${c.id}</option>`).join('')}
        </select>`;
        
        let botaoManual = '';
        if (m.data_ancora) {
            const partesData = m.data_ancora.split('-'); 
            const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}` : 'Ajustado';
            botaoManual = `<button class="btn-primary-green" style="padding: 8px 12px; font-size: 0.8rem; font-weight: bold;" onclick="abrirModalEscalaManual(${m.id})" ${isBlocked ? 'disabled' : ''}>✅ Ciclo (${dataFormatada})</button>`;
        } else {
            botaoManual = `<button class="btn-primary-blue" style="padding: 8px 12px; font-size: 0.8rem;" onclick="abrirModalEscalaManual(${m.id})" ${isBlocked ? 'disabled' : ''}>⚙️ Ajustar Ciclo</button>`;
        }
        
        html += `<tr style="${isBlocked ? 'background-color: rgba(239, 68, 68, 0.1);' : ''}">
            <td style="${isBlocked ? 'color: #ef4444;' : ''}"><strong>${m.nome}</strong></td>
            <td>${equipeSelect}</td>
            <td>${turnoSelect}</td>
            <td>${conjuntoSelect}</td>
            <td>${botaoManual}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
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
    window.renderizarEscala(); 
    if(typeof atualizarStats === 'function') atualizarStats();
    renderizarAlocacao();
}

window.resetarCicloConjunto = async function(conjuntoId) {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem zerar o ciclo.'); return; }
    if (!confirm(`Deseja ZERAR as datas e as edições da escala da Trinca/Conjunto ${conjuntoId} do Banco de Dados?`)) return;

    let promisesExclusao = [];
    motoristas.forEach(m => {
        if (m.conjuntoId === conjuntoId) {
            if (m.data_ancora) { m.data_ancora = null; db.updateMotorista(m.id, { data_ancora: null }); }
            if (escalas[m.id]) escalas[m.id] = {};
            if (typeof db.deleteEscalasPorMotorista === 'function') promisesExclusao.push(db.deleteEscalasPorMotorista(m.id));
        }
    });

    await Promise.all(promisesExclusao);
    await db.addLog('Reset de Ciclo', `Datas âncora e escalas removidas para o Conjunto ${conjuntoId}.`);
    salvarBackupLocal();
    renderizarAlocacao();
    window.renderizarEscala();
    alert(`O ciclo e a escala do Conjunto ${conjuntoId} foram completamente zerados!`);
};

window.abrirModalEscalaManual = function(id) {
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;
    if (m.conjuntoId && (!m.equipe || m.equipe === '-')) { 
        alert("O motorista precisa ter uma equipe (A-F) antes de configurar a escala!"); 
        return; 
    }

    document.getElementById('manualMotId').value = m.id;
    document.getElementById('manualMotNome').innerText = m.nome;
    document.getElementById('manualMotEquipe').innerText = m.equipe || "Sem Equipe";
    
    let dia1 = new Date();
    if (m.data_ancora) {
        const strAncora = m.data_ancora.split('T')[0];
        dia1 = new Date(strAncora + 'T00:00:00');
    }
    document.getElementById('manualDataInicio').value = dia1.toISOString().split('T')[0];
    window.atualizarPreviewManual();
    document.getElementById('modalEscalaManual').classList.add('show');
}

window.fecharModalManual = function() { document.getElementById('modalEscalaManual').classList.remove('show'); }

window.atualizarPreviewManual = function() {
    const dataStr = document.getElementById('manualDataInicio').value;
    const container = document.getElementById('previewManualContainer');
    if(!dataStr) return;

    const dBase = new Date(dataStr + 'T00:00:00');
    let html = '';
    
    for(let i = 0; i < 6; i++) {
        let d = new Date(dBase);
        d.setDate(d.getDate() + i);
        let isTrab = i < 4; 
        let txt = isTrab ? 'TRAB' : 'FOLGA';
        let icon = isTrab ? '🚚' : '🛋️';
        let colorBorder = isTrab ? '#3b82f6' : '#f97316';
        let colorBg = isTrab ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)';
        
        html += `<div style="background: ${colorBg}; border: 1px solid ${colorBorder}; padding: 12px 10px; border-radius: 8px; flex: 1; text-align: center;">
            <div style="font-size: 0.8rem; margin-bottom: 5px;">${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}</div>
            <div style="font-size: 1.8rem; margin-bottom: 5px;">${icon}</div>
            <div style="font-size: 0.85rem; font-weight: 800; color: ${colorBorder};">${txt}</div>
        </div>`;
    }
    container.innerHTML = html;
}

window.salvarEscalaManual = async function() {
    const id = parseInt(document.getElementById('manualMotId').value);
    const dataEscolhida = document.getElementById('manualDataInicio').value; 
    const m = motoristas.find(mot => mot.id === id);
    
    if (m && dataEscolhida) {
        m.data_ancora = dataEscolhida;
        db.updateMotorista(id, { data_ancora: dataEscolhida });
        if (escalas[id]) escalas[id] = {};
        if (typeof db.deleteEscalasPorMotorista === 'function') await db.deleteEscalasPorMotorista(id);

        const inputDataTela = document.getElementById('dataInicioEscala');
        const dataBaseParaGerarStr = inputDataTela && inputDataTela.value ? inputDataTela.value : new Date().toISOString().split('T')[0];
        const dataBaseParaGerar = new Date(dataBaseParaGerarStr + 'T00:00:00');
        
        let novasEscalasLote = [];
        for (let i = 0; i < 30; i++) {
            let d = new Date(dataBaseParaGerar);
            d.setDate(d.getDate() + i);
            let dataAtualStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const calc = window.calcularEscalaMatematica(m, dataAtualStr);

            const novaEscala = { id: `${m.id}_${dataAtualStr}`, motorista_id: m.id, data: dataAtualStr, turno: calc.turno, caminhao: calc.caminhao, status: 'auto' };
            novasEscalasLote.push(novaEscala);
            escalas[m.id][dataAtualStr] = novaEscala; 
        }

        if(typeof db.upsertEscalasLote === 'function') await db.upsertEscalasLote(novasEscalasLote);
        salvarBackupLocal();
        fecharModalManual();
        window.renderizarEscala(); 
        renderizarAlocacao();
    }
}

window.gerarEscala4x2 = async function(silencioso = false) {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado.'); return; }
    if (!silencioso && !confirm("Gerar a escala automática dos próximos 30 dias para TODOS os motoristas baseado nos ciclos?")) return;
    
    const inputData = document.getElementById('dataInicioEscala');
    const dataBaseStr = inputData && inputData.value ? inputData.value : new Date().toISOString().split('T')[0];
    const dataBase = new Date(dataBaseStr + 'T00:00:00');

    let novasEscalasLote = [];
    for (let m of motoristas) {
        if (!escalas[m.id]) escalas[m.id] = {};
        for (let i = 0; i < 30; i++) {
            let d = new Date(dataBase);
            d.setDate(d.getDate() + i);
            let dataAtualStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const calc = window.calcularEscalaMatematica(m, dataAtualStr);

            const novaEscala = { id: `${m.id}_${dataAtualStr}`, motorista_id: m.id, data: dataAtualStr, turno: calc.turno, caminhao: calc.caminhao, status: 'auto' };
            novasEscalasLote.push(novaEscala);
            escalas[m.id][dataAtualStr] = novaEscala;
        }
    }

    const chunkSize = 500;
    for (let i = 0; i < novasEscalasLote.length; i += chunkSize) {
        if(typeof db.upsertEscalasLote === 'function') await db.upsertEscalasLote(novasEscalasLote.slice(i, i + chunkSize));
    }

    await db.addLog('Escala', 'Geração em lote de 30 dias disparada para todos.');
    salvarBackupLocal();
    window.renderizarEscala(); 
    if (!silencioso) alert(`Sucesso! Banco de dados preenchido (30 dias)!`);
}

window.zerarEscala = async function() {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado.'); return; }
    if (!confirm("Isso reescreverá todas as edições manuais e recalculará o ciclo 4x2 automático nos próximos 30 dias. Continuar?")) return;
    window.gerarEscala4x2(true);
}

// ==================== PAINEL DE TROCA DE TURNO ====================
window.renderizarTrocaTurno = function() {
    /* Funcao mantida intocada conforme escopo original de app.js para nao quebrar dashboard */
};

window.abrirModalImpressao = function() {
    document.getElementById('printData').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalImpressaoDiaria').classList.add('show');
}
window.fecharModalImpressao = function() { document.getElementById('modalImpressaoDiaria').classList.remove('show'); }
window.gerarRelatorioImpressao = function() { /* Mantido para uso diário se necessário */ };

// ==================== IMPRESSÃO DA ESCALA SEMANAL (NOVO LAYOUT) ====================
window.imprimirRelatorioEscalaSemanal = function() {
    if (!window.currentDatas || window.currentDatas.length === 0) {
        alert("Nenhuma semana renderizada. Selecione a data no painel primeiro.");
        return;
    }
    
    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    const filtroSelec = filtroSelectEl ? filtroSelectEl.value : 'todos';
    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id.toString() === filtroSelec.toString()) : [...conjuntos];

    if (conjuntosRender.length === 0) { alert("Nenhum dado para imprimir."); return; }

    let html = `
    <html>
    <head>
        <title>Escala Semanal 4x2</title>
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #000; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
            h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .trinca-box { margin-bottom: 15px; border: 2px solid #000; display: flex; break-inside: avoid; flex-direction: column; }
            .trinca-num { background: #eee; border-bottom: 2px solid #000; font-weight: bold; font-size: 14px; padding: 5px 10px; }
            table { width: 100%; border-collapse: collapse; text-align: center; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #d1d5db; }
            .dia-bg { background-color: #fef9c3; }
            .noite-bg { background-color: #dbeafe; }
            .trab { background-color: #d4edda; font-weight: bold; }
            .folga { background-color: #f8d7da; color: #721c24; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Serrana Florestal - Escala Automática 4x2</h1>
            <p><strong>Semana Iniciada em: ${window.currentDatas[0].diaNum}</strong></p>
        </div>
    `;

    conjuntosRender.forEach(conj => {
        let motoristasDoConjunto = motoristas.filter(m => m.conjuntoId === conj.id);
        if (motoristasDoConjunto.length === 0) return;

        const gDia = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(m.equipe)).sort((a,b)=>a.equipe.localeCompare(b.equipe));
        const gNoite = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(m.equipe)).sort((a,b)=>a.equipe.localeCompare(b.equipe));

        const renderTable = (grupo, titulo, classeTr) => {
            if (grupo.length === 0) return '';
            let tHtml = `
                <tr><td colspan="12" style="background: #e5e7eb; font-weight: bold; text-align: left; padding-left: 10px;">${titulo}</td></tr>
            `;
            
            grupo.forEach(m => {
                let goStr = '-', posStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    let go1 = cam1.go || '-', go2 = cam2.go || '-';
                    if (m.equipe === 'A' || m.equipe === 'D') { goStr = go1; posStr = 'FROTA 1'; }
                    else if (m.equipe === 'B' || m.equipe === 'E') { goStr = go2; posStr = 'FROTA 2'; }
                    else { goStr = (go1!=='-' && go2!=='-' && go1!==go2)?`${go1}/${go2}`:go1; posStr = 'FOLGUISTA'; }
                }
                
                tHtml += `<tr class="${classeTr}">
                    <td>${m.turno || '-'}</td><td>${goStr}</td><td>${m.equipe || '-'}</td><td>${posStr}</td><td style="text-align:left;"><b>${m.nome}</b></td>`;
                
                window.currentDatas.forEach(d => {
                    const esc = window.getEscalaDiaComputada(m, d.dateKey);
                    const isF = esc.caminhao === 'F';
                    tHtml += `<td class="${isF ? 'folga' : 'trab'}">${isF ? 'F' : 'T'}</td>`;
                });
                tHtml += `</tr>`;
            });
            return tHtml;
        };

        html += `<div class="trinca-box"><div class="trinca-num">TRINCA ${conj.id}</div>`;
        html += `<table>
                <thead>
                    <tr>
                        <th style="width:10%;">HORÁRIO</th>
                        <th style="width:12%;">GO/PLACA</th>
                        <th style="width:6%;">EQ</th>
                        <th style="width:12%;">POSIÇÃO</th>
                        <th style="text-align:left;">COLABORADOR</th>
                        ${window.currentDatas.map(d => `<th style="width:6%;">${d.diaTexto}<br>${d.diaNum}</th>`).join('')}
                    </tr>
                </thead><tbody>`;
        html += renderTable(gDia, '☀️ TURNO DO DIA (EQUIPES A, B, C)', 'dia-bg');
        html += renderTable(gNoite, '🌙 TURNO DA NOITE (EQUIPES D, E, F)', 'noite-bg');
        html += `</tbody></table></div>`;
    });

    html += `<script>window.print();</script></body></html>`;
    const w = window.open('', '', 'width=1200,height=800');
    w.document.write(html);
    w.document.close();
}

// ==================== EXPORTAÇÃO EXCEL (ESCALA MENSAL) ====================
window.exportarEscalaMensalExcel = function() {
    const inputData = document.getElementById('dataInicioEscala');
    let dataBase = inputData && inputData.value ? new Date(inputData.value + 'T00:00:00') : new Date();
    
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth(); 
    const diasNoMes = new Date(ano, mes + 1, 0).getDate(); 

    let csvContent = "\uFEFFHorário;GO/Placa;Equipe;Posição;Colaborador";
    for (let dia = 1; dia <= diasNoMes; dia++) csvContent += `;${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}`;
    csvContent += "\n";

    let mOrdenados = [...motoristas].sort((a, b) => (a.conjuntoId || 999) - (b.conjuntoId || 999) || a.equipe.localeCompare(b.equipe));

    mOrdenados.forEach(m => {
        let posStr = '-', goStr = '-';
        if (m.equipe === 'A' || m.equipe === 'D') posStr = 'FROTA 1';
        else if (m.equipe === 'B' || m.equipe === 'E') posStr = 'FROTA 2';
        else if (m.equipe === 'C' || m.equipe === 'F') posStr = 'FOLGUISTA';
        
        let linha = `${m.turno||'-'};-;${m.equipe||'-'};${posStr};${m.nome}`;

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtualStr = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            const escalaDia = window.getEscalaDiaComputada(m, dataAtualStr);
            linha += `;${escalaDia.caminhao === 'F' ? 'F' : 'T'}`;
        }
        csvContent += linha + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Escala_Mensal_${(mes + 1).toString().padStart(2, '0')}_${ano}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};
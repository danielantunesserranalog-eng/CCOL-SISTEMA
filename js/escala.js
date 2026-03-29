// ==================== MÓDULO: ESCALA & ALOCAÇÃO ====================

// LÓGICA DE INTELIGÊNCIA EM TEMPO REAL (ON-THE-FLY)
window.getStatusMotorista = function(m, dDate) {
    if (!m || !m.data_ancora) return 'F';
    const dataAncora = new Date(m.data_ancora + 'T00:00:00');
    const diffDays = Math.floor((dDate - dataAncora) / (1000 * 60 * 60 * 24));
    const cicloDia = ((diffDays % 6) + 6) % 6;
    return cicloDia < 4 ? 'TRAB' : 'F';
}

window.getEscalaDiaComputada = function(motorista, dateKey) {
    // 1. MANUAL: Se o usuário alterou na mão e salvou no banco, prevalece.
    if (escalas[motorista.id] && escalas[motorista.id][dateKey] && escalas[motorista.id][dateKey].status === 'manual') {
        return escalas[motorista.id][dateKey];
    }

    // 2. BLOQUEIOS: Sem âncora, sem curso ou sem equipe = Folga F
    if (!motorista.data_ancora || motorista.masterDrive === 'Não' || motorista.destra === 'Não' || !motorista.equipe || motorista.equipe === '-') {
        return { caminhao: 'F', turno: motorista.turno };
    }

    const dDate = new Date(dateKey + 'T00:00:00');
    const statusMot = window.getStatusMotorista(motorista, dDate);

    if (statusMot === 'F') return { caminhao: 'F', turno: motorista.turno };

    // 3. SE TRABALHA, QUAL CAMINHÃO PEGAR?
    const conjunto = conjuntos.find(c => c.id === motorista.conjuntoId);
    if (!conjunto || !conjunto.caminhoes) return { caminhao: 'F', turno: motorista.turno };

    let placa1 = conjunto.caminhoes.length > 0 ? (typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa) : 'F';
    let placa2 = conjunto.caminhoes.length > 1 ? (typeof conjunto.caminhoes[1] === 'string' ? conjunto.caminhoes[1] : conjunto.caminhoes[1].placa) : placa1;

    let statusCaminhao = 'F';

    if (motorista.equipe === 'A' || motorista.equipe === 'D') statusCaminhao = placa1;
    else if (motorista.equipe === 'B' || motorista.equipe === 'E') statusCaminhao = placa2;
    else if (motorista.equipe === 'C') { 
        const fixoA = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'A');
        const fixoB = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'B');
        const statusA = window.getStatusMotorista(fixoA, dDate);
        const statusB = window.getStatusMotorista(fixoB, dDate);
        
        if (statusA === 'F') statusCaminhao = placa1;
        else if (statusB === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1; 
    } 
    else if (motorista.equipe === 'F') {
        const fixoD = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'D');
        const fixoE = motoristas.find(mot => mot.conjuntoId === motorista.conjuntoId && mot.equipe === 'E');
        const statusD = window.getStatusMotorista(fixoD, dDate);
        const statusE = window.getStatusMotorista(fixoE, dDate);
        
        if (statusD === 'F') statusCaminhao = placa1;
        else if (statusE === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1;
    }

    return { caminhao: statusCaminhao, turno: motorista.turno, status: 'auto' };
}

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
    
    if (typeof getDatasSemana === 'function') {
        currentDatas = getDatasSemana(inputData ? inputData.value : null);
    }

    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id == filtroSelec) : conjuntos;

    conjuntosRender.forEach(conj => {
        const motoristasDoConjunto = motoristas.filter(m => m.conjuntoId === conj.id);
        if (motoristasDoConjunto.length === 0) return;

        html += `
        <div class="escala-conjunto-box">
            <div class="escala-conjunto-numero">${conj.id}</div>
            <div class="escala-conjunto-tabelas">
        `;

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
                
                const isFolguista = (m.equipe === 'C' || m.equipe === 'F');
                const tagFolguista = isFolguista ? `<span style="background:#f97316; color:#fff; font-size:0.65rem; font-weight:bold; padding:2px 5px; border-radius:4px; margin-left:8px; vertical-align:middle; letter-spacing:0.5px;">FOLGUISTA</span>` : '';
                let displayTurno = isFolguista ? 'Misto' : (m.turno || '-');

                tHtml += `<tr>`;
                tHtml += `<td class="td-name" style="${isBlocked ? 'color: red;' : ''}"><strong>${m.nome}</strong> ${tagFolguista}</td>`;
                tHtml += `<td style="text-align: center;">${displayTurno}</td>`;
                tHtml += `<td style="text-align: center;">${goStr}</td>`;
                tHtml += `<td style="text-align: center;"><strong>${m.equipe !== '-' ? m.equipe : ''}</strong></td>`;

                currentDatas.forEach(d => {
                    const escala = window.getEscalaDiaComputada(m, d.dateKey);
                    const isFolga = escala.caminhao === 'F';
                    const tdClass = isBlocked ? '' : (isFolga ? 'celula-folga' : 'celula-trabalho');
                    
                    let temTreinamento = false;
                    let instrutorTreinamento = '';
                    if (typeof cronogramaTreinamento !== 'undefined') {
                        const treinoDia = cronogramaTreinamento.find(t => t.motoristaId === m.id && t.data === d.dateKey && t.status === 'agendado');
                        if (treinoDia) {
                            temTreinamento = true;
                            instrutorTreinamento = treinoDia.instrutor;
                        }
                    }

                    let estiloTdExtra = temTreinamento ? 'background-color: #fde047 !important; color: #000 !important; border: 2px solid #ca8a04; font-weight: 800;' : '';
                    let estiloSelectExtra = temTreinamento ? 'background-color: transparent !important; color: #000 !important; font-weight: 800;' : '';
                    let hoverTitle = temTreinamento ? `Treinamento marcado com: ${instrutorTreinamento}` : '';

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

                    tHtml += `<td class="${tdClass}" style="${estiloTdExtra}" title="${hoverTitle}"><select class="select-escala-excel" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''} style="${estiloSelectExtra}">${isBlocked ? '<option value="F">Bloq</option>' : opcoes}</select></td>`;
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
    if(typeof atualizarStats === 'function') atualizarStats();
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
        select.closest('td').className = novoCaminhao === 'F' ? 'celula-folga' : 'celula-trabalho';
        
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

        if (conjA !== conjB) { return conjA - conjB; }
        return a.nome.localeCompare(b.nome);
    });

    let html = '';
    let lastConjunto = null;
    
    motoristasOrdenados.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const currentConjunto = m.conjuntoId || 'sem_conjunto';

        if (currentConjunto !== lastConjunto) {
            const tituloConjunto = m.conjuntoId ? `🚛 CONJUNTO ${m.conjuntoId}` : `⚠️ NÃO ALOCADOS / SEM CONJUNTO`;
            const btnReset = m.conjuntoId ? `<button onclick="resetarCicloConjunto(${m.conjuntoId})" style="float: right; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold; transition: all 0.2s;">🔄 ZERAR CICLO</button>` : '';

            html += `
                <tr style="background-color: rgba(255, 255, 255, 0.05); border-top: 2px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td colspan="5" style="text-align: left; padding-left: 15px; font-weight: 800; color: #3b82f6; padding-top: 12px; padding-bottom: 12px; font-size: 0.95rem; letter-spacing: 1.5px; vertical-align: middle;">
                        ${tituloConjunto}
                        ${btnReset}
                    </td>
                </tr>
            `;
            lastConjunto = currentConjunto;
        }
        
        let equipeSelect = `<select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="-" ${m.equipe === '-' ? 'selected' : ''}>Sem Equipe</option>
            <option value="A" ${m.equipe === 'A' ? 'selected' : ''}>A (Fixo Dia - Cami 1)</option>
            <option value="B" ${m.equipe === 'B' ? 'selected' : ''}>B (Fixo Dia - Cami 2)</option>
            <option value="C" ${m.equipe === 'C' ? 'selected' : ''}>C (⭐ FOLGUISTA DIA)</option>
            <option value="D" ${m.equipe === 'D' ? 'selected' : ''}>D (Fixo Noite - Cami 1)</option>
            <option value="E" ${m.equipe === 'E' ? 'selected' : ''}>E (Fixo Noite - Cami 2)</option>
            <option value="F" ${m.equipe === 'F' ? 'selected' : ''}>F (⭐ FOLGUISTA NOITE)</option>
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
            botaoManual = `<button class="btn-primary-green" style="padding: 8px 12px; font-size: 0.8rem; font-weight: bold;" onclick="abrirModalEscalaManual(${m.id})" ${isBlocked ? 'disabled' : ''}>✅ Ajustado (${dataFormatada})</button>`;
        } else {
            botaoManual = `<button class="btn-primary-blue" style="padding: 8px 12px; font-size: 0.8rem;" onclick="abrirModalEscalaManual(${m.id})" ${isBlocked ? 'disabled' : ''}>⚙️ Ajustar Ciclo</button>`;
        }
        
        html += `<tr style="${isBlocked ? 'background-color: #ffe6e6;' : ''}">
            <td style="${isBlocked ? 'color: #cc0000;' : ''}"><strong>${m.nome}</strong></td>
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
    
    renderizarEscala(); 
    if(typeof atualizarStats === 'function') atualizarStats();
    renderizarAlocacao();
}

window.resetarCicloConjunto = function(conjuntoId) {
    if (!confirm(`Deseja realmente ZERAR as datas de todos os motoristas do Conjunto ${conjuntoId}?\nEles voltarão para o status azul "Ajustar Ciclo".`)) return;

    motoristas.forEach(m => {
        if (m.conjuntoId === conjuntoId && m.data_ancora) {
            m.data_ancora = null;
            db.updateMotorista(m.id, { data_ancora: null });
        }
    });

    salvarBackupLocal();
    renderizarAlocacao();
    renderizarEscala();
    alert(`O ciclo do Conjunto ${conjuntoId} foi zerado com sucesso!`);
};

window.abrirModalEscalaManual = function(id) {
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;
    
    if(!m.equipe || m.equipe === '-') { alert("O motorista precisa ter uma equipe (A-F) antes de configurar a escala!"); return; }
    if(!m.conjuntoId) { alert("O motorista precisa estar alocado a um Conjunto!"); return; }

    document.getElementById('manualMotId').value = m.id;
    document.getElementById('manualMotNome').innerText = m.nome;
    
    let nomeEquipe = m.equipe;
    if(m.equipe === 'C' || m.equipe === 'F') nomeEquipe += " (Folguista)";
    document.getElementById('manualMotEquipe').innerText = nomeEquipe;
    
    let dia1 = new Date();
    if (m.data_ancora) dia1 = new Date(m.data_ancora + 'T00:00:00');
    
    document.getElementById('manualDataInicio').value = dia1.toISOString().split('T')[0];
    window.atualizarPreviewManual();
    document.getElementById('modalEscalaManual').classList.add('show');
}

window.fecharModalManual = function() {
    document.getElementById('modalEscalaManual').classList.remove('show');
}

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
        let colorBg = isTrab ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)';
        let colorBorder = isTrab ? '#3b82f6' : '#f97316';
        
        html += `<div style="background: ${colorBg}; border: 1px solid ${colorBorder}; padding: 12px 10px; border-radius: 8px; flex: 1; text-align: center; min-width: 60px;">
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}</div>
            <div style="font-size: 1.8rem; margin-bottom: 5px;">${icon}</div>
            <div style="font-size: 0.85rem; font-weight: 800; color: ${colorBorder};">${txt}</div>
        </div>`;
    }
    container.innerHTML = html;
}

window.salvarEscalaManual = function() {
    const id = parseInt(document.getElementById('manualMotId').value);
    const dataEscolhida = document.getElementById('manualDataInicio').value;
    const m = motoristas.find(mot => mot.id === id);
    
    if (m && dataEscolhida) {
        m.data_ancora = dataEscolhida;
        db.updateMotorista(id, { data_ancora: dataEscolhida });
        salvarBackupLocal();
        fecharModalManual();
        renderizarEscala(); 
        renderizarAlocacao();
    }
}

window.gerarEscala4x2 = async function(silencioso = false) {
    if (!silencioso && !confirm("Atenção: A inteligência do sistema agora limpa todos os resíduos do banco de dados (que causam lentidão) e aplica a escala matemática baseada na data ajustada (âncora). Confirmar?")) return;
    
    await db.limparApenasEscalas();
    escalas = {};
    motoristas.forEach(m => { escalas[m.id] = {}; });
    salvarBackupLocal();

    renderizarEscala(); 
    if (!silencioso) alert(`Sucesso! Banco de dados limpo e escala perfeita reconstruída on-the-fly!`);
}

window.zerarEscala = function() {
    if (!confirm("Isso apagará todas as edições manuais que você fez diretamente na grade. Continuar?")) return;
    window.gerarEscala4x2(true);
}

// ==================== PAINEL DE TROCA DE TURNO ====================

window.renderizarTrocaTurno = function() {
    const listaProximos = document.getElementById('listaProximosTroca');
    const listaSemCaminhao = document.getElementById('listaPlantaoSemCaminhao');
    const listaFolga = document.getElementById('listaFolga');
    
    if (!listaProximos || !listaSemCaminhao || !listaFolga) return;

    const hojeStr = new Date().toISOString().split('T')[0];
    const agora = new Date();
    const minutosAtuaisTotais = (agora.getHours() * 60) + agora.getMinutes();

    let htmlProximos = '';
    let htmlSemCaminhao = '';
    let htmlFolga = '';

    motoristas.forEach(m => {
        if (m.masterDrive === 'Não' || m.destra === 'Não') return;

        const dDate = new Date(hojeStr + 'T00:00:00');
        const statusCiclo = window.getStatusMotorista(m, dDate); 
        const escalaHoje = window.getEscalaDiaComputada(m, hojeStr);
        const caminhaoHoje = escalaHoje ? escalaHoje.caminhao : 'F';
        const statusEscala = escalaHoje ? escalaHoje.status : 'auto';

        let trabalhando = false;
        let plantaoSemCaminhao = false;
        let emFolga = false;

        // SEPARAÇÃO INTELIGENTE (ATB / PLANTÃO / FOLGA)
        if (statusEscala === 'manual') {
            if (caminhaoHoje === 'F') emFolga = true;
            else trabalhando = true;
        } else {
            if (statusCiclo === 'TRAB' && caminhaoHoje === 'F') plantaoSemCaminhao = true;
            else if (statusCiclo === 'F' || caminhaoHoje === 'F') emFolga = true;
            else trabalhando = true;
        }

        if (trabalhando) {
            const turno = m.turno; 
            if (turno && turno !== '-') {
                const fimStr = turno.split('-')[1]; 
                if (fimStr) {
                    const fimHoras = parseInt(fimStr.split(':')[0]);
                    const fimMinutos = parseInt(fimStr.split(':')[1]);
                    let tempoFimTotais = (fimHoras * 60) + fimMinutos;

                    let diferenca = tempoFimTotais - minutosAtuaisTotais;
                    if (diferenca < -720) diferenca += (24 * 60); 

                    // Mostra todos que estão ativos trabalhando e o tempo que falta para acabar o turno
                    let avisoStatus = '';
                    if(diferenca < 0) {
                        avisoStatus = `<span style="color: #ef4444; font-size: 0.75rem;">(Atrasado)</span>`;
                    } else if(diferenca <= 120) {
                        avisoStatus = `<span style="color: #fb923c; font-size: 0.75rem;">(Falta ${diferenca}m)</span>`;
                    } else {
                        avisoStatus = `<span style="color: var(--text-secondary); font-size: 0.75rem;">(Ativo)</span>`;
                    }

                    htmlProximos += `
                        <tr>
                            <td style="text-align: left; padding-left: 15px;"><strong>${m.nome}</strong></td>
                            <td>Conjunto ${m.conjuntoId || '-'}</td>
                            <td><strong style="color: var(--ccol-rust-bright);">${fimStr}</strong> ${avisoStatus}</td>
                            <td>${m.cidade || '-'}</td>
                        </tr>
                    `;
                }
            }
        } else if (plantaoSemCaminhao) {
            htmlSemCaminhao += `
                <tr>
                    <td style="text-align: left; padding-left: 15px; color: var(--ccol-blue-bright);"><strong>${m.nome}</strong></td>
                    <td><strong>${m.equipe || '-'}</strong></td>
                    <td>${m.turno || '-'}</td>
                    <td>${m.cidade || '-'}</td>
                </tr>
            `;
        } else if (emFolga) {
            htmlFolga += `
                <tr>
                    <td style="text-align: left; padding-left: 15px; color: #a1a1aa;"><strong>${m.nome}</strong></td>
                    <td><strong>${m.equipe || '-'}</strong></td>
                    <td><span style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid #444;">🔕 Não Incomodar</span></td>
                    <td>${m.cidade || '-'}</td>
                </tr>
            `;
        }
    });

    if (htmlProximos === '') htmlProximos = '<tr><td colspan="4" style="padding: 20px; color: var(--text-secondary); text-align:center;">Ninguém trabalhando no momento.</td></tr>';
    if (htmlSemCaminhao === '') htmlSemCaminhao = '<tr><td colspan="4" style="padding: 20px; color: var(--text-secondary); text-align:center;">Nenhum motorista de plantão sem caminhão.</td></tr>';
    if (htmlFolga === '') htmlFolga = '<tr><td colspan="4" style="padding: 20px; color: var(--text-secondary); text-align:center;">Nenhum motorista de folga hoje.</td></tr>';

    listaProximos.innerHTML = htmlProximos;
    listaSemCaminhao.innerHTML = htmlSemCaminhao;
    listaFolga.innerHTML = htmlFolga;
};

// ==================== IMPRESSÃO DO RELATÓRIO DO DIA ====================

window.imprimirRelatorioTrabalhoHoje = function() {
    const hojeStr = new Date().toISOString().split('T')[0];
    
    // Formata a data para exibir no título
    const partes = hojeStr.split('-');
    const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let trabalhandoDia = [];
    let trabalhandoNoite = [];

    motoristas.forEach(m => {
        if (m.masterDrive === 'Não' || m.destra === 'Não') return;
        const escalaHoje = window.getEscalaDiaComputada(m, hojeStr);
        const caminhaoHoje = escalaHoje ? escalaHoje.caminhao : 'F';
        
        if (caminhaoHoje !== 'F') {
            const isDia = ['A', 'B', 'C'].includes(m.equipe);
            if (isDia) trabalhandoDia.push({ ...m, caminhaoHoje });
            else trabalhandoNoite.push({ ...m, caminhaoHoje });
        }
    });

    // Ordenar pelo número do conjunto, e depois pelo nome do motorista
    const sortFn = (a, b) => (a.conjuntoId || 999) - (b.conjuntoId || 999) || a.nome.localeCompare(b.nome);
    trabalhandoDia.sort(sortFn);
    trabalhandoNoite.sort(sortFn);

    const buildTable = (titulo, lista) => {
        if (lista.length === 0) return `<p style="text-align: center; color: #555;">Nenhum motorista alocado para este turno hoje.</p>`;
        let html = `
            <h3 style="margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 5px; font-size: 18px;">${titulo}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background-color: #f4f4f5; color: #333;">
                        <th style="border: 1px solid #d4d4d8; padding: 10px; text-align: left;">Motorista</th>
                        <th style="border: 1px solid #d4d4d8; padding: 10px; text-align: center;">Conjunto</th>
                        <th style="border: 1px solid #d4d4d8; padding: 10px; text-align: center;">Placa Alocada</th>
                        <th style="border: 1px solid #d4d4d8; padding: 10px; text-align: center;">Equipe</th>
                        <th style="border: 1px solid #d4d4d8; padding: 10px; text-align: left;">Cidade / Base</th>
                    </tr>
                </thead>
                <tbody>
        `;
        lista.forEach(m => {
            html += `
                <tr>
                    <td style="border: 1px solid #d4d4d8; padding: 8px;"><strong>${m.nome}</strong></td>
                    <td style="border: 1px solid #d4d4d8; padding: 8px; text-align: center;">${m.conjuntoId || '-'}</td>
                    <td style="border: 1px solid #d4d4d8; padding: 8px; text-align: center; font-weight: bold; color: #2563eb;">${m.caminhaoHoje}</td>
                    <td style="border: 1px solid #d4d4d8; padding: 8px; text-align: center;">${m.equipe || '-'}</td>
                    <td style="border: 1px solid #d4d4d8; padding: 8px;">${m.cidade || '-'}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        return html;
    };

    const janelaImp = window.open('', '', 'width=900,height=700');
    janelaImp.document.write(`
        <html>
            <head>
                <title>Relatório de Escala Diária - ${dataFormatada}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1f2937; }
                    .print-header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                    .print-header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
                    .print-header p { margin: 5px 0 0 0; color: #4b5563; font-size: 16px; }
                    
                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; padding: 20px; }
                    }
                    
                    .btn-print {
                        background-color: #2563eb;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        font-size: 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
                    }
                    .btn-print:hover { background-color: #1d4ed8; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Serrana Florestal - Divisão CCOL</h1>
                    <p><strong>Relatório Operacional: Escala de Trabalho Diária</strong></p>
                    <p style="font-size: 14px; margin-top: 10px;">Data de Referência: <strong>${dataFormatada}</strong></p>
                </div>
                
                ${buildTable('☀️ TURNO DO DIA (Equipes A, B e Folguista C)', trabalhandoDia)}
                
                <div style="margin-top: 40px;"></div>
                
                ${buildTable('🌙 TURNO DA NOITE (Equipes D, E e Folguista F)', trabalhandoNoite)}
                
                <div class="no-print" style="text-align: center; margin-top: 50px;">
                    <button class="btn-print" onclick="window.print()">🖨️ Imprimir Agora</button>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 15px;">Dica: Salve em PDF ou envie direto para sua impressora.</p>
                </div>
            </body>
        </html>
    `);
    janelaImp.document.close();
};
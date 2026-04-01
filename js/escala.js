// ==================== MÓDULO: ESCALA & ALOCAÇÃO ====================

window.popularSelectMotoristas = function() {
    const select = document.getElementById('buscaMotoristaEscala');
    if (!select) return;
    
    const valorAtual = select.value;
    let html = '<option value="">Selecione o motorista...</option>';
    
    // Clona e ordena os motoristas por ordem alfabética
    const motoristasOrdenados = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));
    
    motoristasOrdenados.forEach(m => {
        html += `<option value="${m.nome}">${m.nome}</option>`;
    });
    
    select.innerHTML = html;
    
    // Mantém a seleção anterior caso a tela re-renderize
    if (valorAtual && motoristas.some(m => m.nome === valorAtual)) {
        select.value = valorAtual;
    }
};

window.getStatusMotorista = function(m, dDate) {
    if (!m || !m.data_ancora) return 'F';
    const dataAncora = new Date(m.data_ancora + 'T00:00:00');
    const diffDays = Math.floor((dDate - dataAncora) / (1000 * 60 * 60 * 24));
    const cicloDia = ((diffDays % 6) + 6) % 6;
    return cicloDia < 4 ? 'TRAB' : 'F';
}

window.getEscalaDiaComputada = function(motorista, dateKey) {
    if (escalas[motorista.id] && escalas[motorista.id][dateKey] && escalas[motorista.id][dateKey].status === 'manual') {
        return escalas[motorista.id][dateKey];
    }
    
    if (!motorista.data_ancora || motorista.masterDrive === 'Não' || motorista.destra === 'Não') {
        return { caminhao: 'F', turno: motorista.turno };
    }
    
    if (motorista.conjuntoId && (!motorista.equipe || motorista.equipe === '-')) {
        return { caminhao: 'F', turno: motorista.turno };
    }

    const dDate = new Date(dateKey + 'T00:00:00');
    const statusMot = window.getStatusMotorista(motorista, dDate);

    if (statusMot === 'F') return { caminhao: 'F', turno: motorista.turno };

    const conjunto = conjuntos.find(c => c.id === motorista.conjuntoId);
    
    if (!conjunto || !conjunto.caminhoes) return { caminhao: 'TRAB', turno: motorista.turno, status: 'auto' };

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

window.renderizarEscala = function() {
    const container = document.getElementById('escalaContainer');
    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    
    // Atualiza o select de busca de motoristas com os cadastrados no banco
    window.popularSelectMotoristas();

    if (filtroSelectEl) {
        const valAtual = filtroSelectEl.value;
        let optHtml = '<option value="todos">Todos</option>';
        conjuntos.forEach(c => optHtml += `<option value="${c.id}">Conjunto ${c.id}</option>`);
        if (filtroSelectEl.innerHTML !== optHtml) {
            filtroSelectEl.innerHTML = optHtml;
            if (conjuntos.some(c => c.id.toString() === valAtual)) {
                filtroSelectEl.value = valAtual;
            } else {
                filtroSelectEl.value = 'todos';
            }
        }
    }

    const filtroSelec = filtroSelectEl ? filtroSelectEl.value : 'todos';

    if (!container) return;

    if (motoristas.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum motorista cadastrado.</p>';
        return;
    }

    let html = '';
    const inputData = document.getElementById('dataInicioEscala');
    
    if (typeof getDatasSemana === 'function') {
        window.currentDatas = getDatasSemana(inputData ? inputData.value : null);
    }

    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id.toString() === filtroSelec.toString()) : [...conjuntos];

    if (filtroSelec === 'todos') {
        const motoristasSemConjunto = motoristas.filter(m => !m.conjuntoId);
        if (motoristasSemConjunto.length > 0) {
            conjuntosRender.push({
                id: 'S/F', 
                isSemFrota: true,
                caminhoes: []
            });
        }
    }

    // Ordenação numérica dos conjuntos (1, 2, 3...)
    conjuntosRender.sort((a, b) => {
        if (a.isSemFrota) return 1; 
        if (b.isSemFrota) return -1;
        return parseInt(a.id) - parseInt(b.id);
    });

    if (conjuntosRender.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum conjunto encontrado para este filtro.</p>';
        return;
    }

    conjuntosRender.forEach(conj => {
        let motoristasDoConjunto = conj.isSemFrota ? motoristas.filter(m => !m.conjuntoId) : motoristas.filter(m => m.conjuntoId === conj.id);

        let numeroDisplay = conj.isSemFrota ? '<span style="font-size: 1.1rem; text-align:center; line-height: 1.2;">SEM<br>FROTA</span>' : conj.id;
        let borderStyle = conj.isSemFrota ? 'border: 2px solid #f59e0b;' : 'border: 2px solid #000;';
        let bgNumero = conj.isSemFrota ? 'background-color: #fef3c7; color: #d97706; border-right: 2px solid #f59e0b;' : 'background-color: #f8f9fa; color: #000; border-right: 2px solid #000;';

        html += `<div class="escala-conjunto-box" style="${borderStyle}"><div class="escala-conjunto-numero" style="${bgNumero}">${numeroDisplay}</div><div class="escala-conjunto-tabelas">`;

        if (motoristasDoConjunto.length === 0) {
            html += `<p style="padding: 15px; color: #555;">Nenhum motorista alocado neste conjunto.</p></div></div>`;
            return;
        }

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
                            ${(window.currentDatas || []).map(d => `<th class="th-dia">${d.diaNum}<br>${d.diaTexto}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

            grupo.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                const isFolguista = (m.equipe === 'C' || m.equipe === 'F');
                
                // --- LÓGICA DO GO ---
                let goStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    
                    let go1 = (typeof cam1 === 'string' || !cam1.go) ? '-' : cam1.go;
                    let go2 = (typeof cam2 === 'string' || !cam2.go) ? '-' : cam2.go;

                    if (m.equipe === 'A' || m.equipe === 'D') {
                        goStr = go1;
                    } else if (m.equipe === 'B' || m.equipe === 'E') {
                        goStr = go2;
                    } else if (isFolguista) {
                        goStr = (go1 !== '-' && go2 !== '-' && go1 !== go2) ? `${go1} e ${go2}` : (go1 !== '-' ? go1 : go2);
                    } else {
                        goStr = go1 !== '-' ? go1 : '-';
                    }
                }
                
                const tagFolguista = isFolguista ? `<span style="background:#f97316; color:#fff; font-size:0.65rem; font-weight:bold; padding:2px 5px; border-radius:4px; margin-left:8px; vertical-align:middle;">FOLGUISTA</span>` : '';
                let displayTurno = isFolguista ? 'Misto' : (m.turno || '-');

                tHtml += `<tr>`;
                tHtml += `<td class="td-name" style="${isBlocked ? 'color: red;' : ''}"><strong>${m.nome}</strong> ${tagFolguista}</td>`;
                tHtml += `<td style="text-align: center;">${displayTurno}</td>`;
                tHtml += `<td style="text-align: center; font-weight: bold; color: #1e3a8a;">${goStr}</td>`;
                tHtml += `<td style="text-align: center;"><strong>${m.equipe && m.equipe !== '-' ? m.equipe : ''}</strong></td>`;

                (window.currentDatas || []).forEach(d => {
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
                    
                    if (escala.caminhao === 'TRAB' || escala.caminhao === 'RES' || conj.isSemFrota) {
                        opcoes += `<option value="TRAB" ${escala.caminhao === 'TRAB' ? 'selected' : ''}>TRAB</option>`;
                        opcoes += `<option value="RES" ${escala.caminhao === 'RES' ? 'selected' : ''}>RES</option>`;
                    }
                    
                    if (!conj.isSemFrota) {
                        opcoes += `<optgroup label="Neste Conjunto">`;
                        conj.caminhoes?.forEach(cam => {
                            const placa = typeof cam === 'string' ? cam : cam.placa;
                            opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''}>${placa}</option>`;
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
    
    // Reaplica o destaque caso algum motorista já esteja selecionado no dropdown e a tela for recarregada/mudança de data
    if (document.getElementById('buscaMotoristaEscala') && document.getElementById('buscaMotoristaEscala').value.trim() !== '') {
        window.buscarMotoristaEscala();
    }
}

// Limpa todas as marcações amarelas
window.limparDestaqueMotorista = function() {
    const linhas = document.querySelectorAll('#escalaContainer tbody tr');
    linhas.forEach(tr => {
        Array.from(tr.children).forEach(td => {
            td.style.removeProperty('background-color');
            td.style.removeProperty('color');
            const select = td.querySelector('select.select-escala-excel');
            if (select) {
                select.style.removeProperty('color');
            }
        });
    });
};

// Reseta o filtro para a opção "Selecione..." e limpa a tabela
window.limparBuscaMotorista = function() {
    const selectBusca = document.getElementById('buscaMotoristaEscala');
    if(selectBusca) selectBusca.value = '';
    window.limparDestaqueMotorista();
};

// Nova Lógica da busca via Select (Menu Suspenso) com destaque amarelo
window.buscarMotoristaEscala = function() {
    const selectBusca = document.getElementById('buscaMotoristaEscala');
    if (!selectBusca) return;
    
    const termo = selectBusca.value.trim().toLowerCase();
    
    // Remove destaques de procuras anteriores primeiro
    window.limparDestaqueMotorista();

    if (termo === '') return;

    let encontrou = false;
    const linhas = document.querySelectorAll('#escalaContainer tbody tr');
    
    linhas.forEach(tr => {
        const tdNome = tr.querySelector('.td-name');
        if (tdNome) {
            const nomeText = tdNome.textContent.toLowerCase();
            
            // Como é um select exato, a busca se torna mais precisa
            if (nomeText.includes(termo)) {
                // Pinta todas as TDs desta linha de amarelo forte (#fef08a)
                Array.from(tr.children).forEach(td => {
                    td.style.setProperty('background-color', '#fef08a', 'important');
                    td.style.setProperty('color', '#000', 'important');
                    
                    const select = td.querySelector('select.select-escala-excel');
                    if (select) {
                        select.style.setProperty('color', '#000', 'important');
                    }
                });
                
                // Rola suavemente a tela até a linha encontrada
                if (!encontrou) {
                    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    encontrou = true;
                }
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
        if (conjA !== conjB) return conjA - conjB; 
        return a.nome.localeCompare(b.nome);
    });

    let html = '';
    let lastConjunto = null;
    
    motoristasOrdenados.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const currentConjunto = m.conjuntoId || 'sem_conjunto';

        if (currentConjunto !== lastConjunto) {
            const tituloConjunto = m.conjuntoId ? `🚛 CONJUNTO ${m.conjuntoId}` : `🚨 MOTORISTAS NÃO LIBERADOS / SEM FROTA`;
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
            <option value="A" ${m.equipe === 'A' ? 'selected' : ''}>A (Fixo Dia - Frota 1 )</option>
            <option value="B" ${m.equipe === 'B' ? 'selected' : ''}>B (Fixo Dia - Frota 2)</option>
            <option value="C" ${m.equipe === 'C' ? 'selected' : ''}>C (⭐ FOLGUISTA DIA)</option>
            <option value="D" ${m.equipe === 'D' ? 'selected' : ''}>D (Fixo Noite - Frota 1 )</option>
            <option value="E" ${m.equipe === 'E' ? 'selected' : ''}>E (Fixo Noite - Frota 2)</option>
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
    
    window.renderizarEscala(); 
    if(typeof atualizarStats === 'function') atualizarStats();
    renderizarAlocacao();
}

window.resetarCicloConjunto = async function(conjuntoId) {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem zerar o ciclo de um conjunto.'); return; }
    if (!confirm(`Deseja ZERAR as datas do Conjunto ${conjuntoId}?`)) return;

    motoristas.forEach(m => {
        if (m.conjuntoId === conjuntoId && m.data_ancora) {
            m.data_ancora = null;
            db.updateMotorista(m.id, { data_ancora: null });
        }
    });

    await db.addLog('Reset de Ciclo', `Datas âncora removidas para todos do Conjunto ${conjuntoId}.`);
    if(typeof renderizarLogs === 'function') renderizarLogs();

    salvarBackupLocal();
    renderizarAlocacao();
    window.renderizarEscala();
    alert(`O ciclo do Conjunto ${conjuntoId} foi zerado com sucesso!`);
};

window.abrirModalEscalaManual = function(id) {
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;
    
    // MODIFICAÇÃO: Só exigir equipe se ele tiver um Conjunto atribuído.
    if (m.conjuntoId && (!m.equipe || m.equipe === '-')) { 
        alert("O motorista precisa ter uma equipe (A-F) antes de configurar a escala neste conjunto!"); 
        return; 
    }

    document.getElementById('manualMotId').value = m.id;
    document.getElementById('manualMotNome').innerText = m.nome;
    
    let displayEquipe = "Sem Equipe";
    if (m.equipe && m.equipe !== '-') {
        displayEquipe = m.equipe + (m.equipe === 'C' || m.equipe === 'F' ? " (Folguista)" : "");
    }
    document.getElementById('manualMotEquipe').innerText = displayEquipe;
    
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

window.salvarEscalaManual = function() {
    const id = parseInt(document.getElementById('manualMotId').value);
    const dataEscolhida = document.getElementById('manualDataInicio').value;
    const m = motoristas.find(mot => mot.id === id);
    
    if (m && dataEscolhida) {
        m.data_ancora = dataEscolhida;
        db.updateMotorista(id, { data_ancora: dataEscolhida });
        salvarBackupLocal();
        fecharModalManual();
        window.renderizarEscala(); 
        renderizarAlocacao();
    }
}

window.gerarEscala4x2 = async function(silencioso = false) {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem usar a Geração Automática.'); return; }
    if (!silencioso && !confirm("Atenção: A inteligência do sistema agora limpa todos os resíduos do banco de dados e aplica a escala matemática baseada na data ajustada (âncora). Confirmar?")) return;
    
    await db.limparApenasEscalas();
    await db.addLog('Escala', 'Escala Automática 4x2 e limpeza de banco disparadas.');
    if(typeof renderizarLogs === 'function') renderizarLogs();

    escalas = {};
    motoristas.forEach(m => { escalas[m.id] = {}; });
    salvarBackupLocal();

    window.renderizarEscala(); 
    if (!silencioso) alert(`Sucesso! Banco de dados limpo e escala perfeita reconstruída!`);
}

window.zerarEscala = async function() {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem excluir a grade de Escalas.'); return; }
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
        const isBlocked = (m.masterDrive === 'Não' || m.destra === 'Não');
        const dDate = new Date(hojeStr + 'T00:00:00');
        const statusCiclo = window.getStatusMotorista(m, dDate); 
        const escalaHoje = window.getEscalaDiaComputada(m, hojeStr);
        const caminhaoHoje = escalaHoje ? escalaHoje.caminhao : 'F';
        const statusEscala = escalaHoje ? escalaHoje.status : 'auto';

        let trabalhando = false, plantaoSemCaminhao = false, emFolga = false;

        if (!m.conjuntoId || isBlocked) {
            plantaoSemCaminhao = true;
        } else if (statusEscala === 'manual') {
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

                    if (diferenca >= 0) {
                        let avisoStatus = diferenca <= 120 ? `<span style="color: #fb923c;">(Falta ${diferenca}m)</span>` : `<span style="color: var(--text-secondary);">(Ativo)</span>`;
                        htmlProximos += `<tr><td><strong>${m.nome}</strong></td><td>Conj. ${m.conjuntoId}</td><td><strong style="color: var(--ccol-rust-bright);">${fimStr}</strong> <span style="font-size:0.75rem;">${avisoStatus}</span></td><td>${m.cidade || '-'}</td></tr>`;
                    }
                }
            }
        } else if (plantaoSemCaminhao) {
            let tags = [];
            if (isBlocked) tags.push(`<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 5px;">Bloqueado</span>`);
            if (!m.conjuntoId) tags.push(`<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 5px;">Reserva/Inativo</span>`);

            htmlSemCaminhao += `<tr><td style="color: var(--ccol-blue-bright);"><strong>${m.nome}</strong> ${tags.join('')}</td><td><strong>${m.equipe && m.equipe !== '-' ? m.equipe : 'N/A'}</strong></td><td>${m.turno && m.turno !== '-' ? m.turno : 'N/A'}</td><td>${m.cidade || '-'}</td></tr>`;
        } else if (emFolga) {
            htmlFolga += `<tr><td style="color: #a1a1aa;"><strong>${m.nome}</strong></td><td><strong>${m.equipe || '-'}</strong></td><td><span style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid #444;">🔕 Não Incomodar</span></td><td>${m.cidade || '-'}</td></tr>`;
        }
    });

    if (htmlProximos === '') htmlProximos = '<tr><td colspan="4" style="text-align:center;">Ninguém próximo da troca.</td></tr>';
    if (htmlSemCaminhao === '') htmlSemCaminhao = '<tr><td colspan="4" style="text-align:center;">Nenhum motorista de plantão.</td></tr>';
    if (htmlFolga === '') htmlFolga = '<tr><td colspan="4" style="text-align:center;">Nenhum motorista de folga hoje.</td></tr>';

    listaProximos.innerHTML = htmlProximos;
    listaSemCaminhao.innerHTML = htmlSemCaminhao;
    listaFolga.innerHTML = htmlFolga;
};

// ==================== MODAL DE IMPRESSÃO DIÁRIA ====================
window.abrirModalImpressao = function() {
    document.getElementById('printData').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalImpressaoDiaria').classList.add('show');
}

window.fecharModalImpressao = function() {
    document.getElementById('modalImpressaoDiaria').classList.remove('show');
}

// ==================== IMPRESSÃO DO RELATÓRIO DA TROCA DE TURNO ====================
window.gerarRelatorioImpressao = function() {
    const dataEscolhida = document.getElementById('printData').value;
    const turnoEscolhido = document.getElementById('printTurno').value;
    
    if (!dataEscolhida) {
        alert("Por favor, selecione uma data.");
        return;
    }

    const partes = dataEscolhida.split('-');
    const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let trabalhandoDia = [];
    let trabalhandoNoite = [];

    motoristas.forEach(m => {
        if (m.masterDrive === 'Não' || m.destra === 'Não') return;
        const escalaDia = window.getEscalaDiaComputada(m, dataEscolhida);
        const caminhaoAtivo = escalaDia ? escalaDia.caminhao : 'F';
        
        if (caminhaoAtivo !== 'F') {
            const isDia = ['A', 'B', 'C'].includes(m.equipe);
            
            let hrEntrada = '-';
            let hrSaida = '-';
            
            if (m.turno && m.turno !== '-' && m.turno !== 'Misto') {
                const p = m.turno.split('-');
                hrEntrada = p[0] || '-';
                hrSaida = p[1] || '-';
            } else if (m.turno === 'Misto') {
                hrEntrada = 'Misto';
                hrSaida = 'Misto';
            }

            if (isDia) trabalhandoDia.push({ ...m, caminhaoAtivo, hrEntrada, hrSaida });
            else trabalhandoNoite.push({ ...m, caminhaoAtivo, hrEntrada, hrSaida });
        }
    });

    const sortFn = (a, b) => {
        const timeA = a.hrEntrada !== '-' ? a.hrEntrada : '24:00';
        const timeB = b.hrEntrada !== '-' ? b.hrEntrada : '24:00';
        
        if (timeA !== timeB) {
            return timeA.localeCompare(timeB); 
        }
        return (a.conjuntoId || 999) - (b.conjuntoId || 999) || a.nome.localeCompare(b.nome);
    };

    trabalhandoDia.sort(sortFn); 
    trabalhandoNoite.sort(sortFn);

    const buildTable = (titulo, lista) => {
        if (lista.length === 0) return `<p style="text-align: center; color: #555; font-size: 11px;">Nenhum motorista alocado neste turno.</p>`;
        
        let html = `<h3 style="margin-top: 15px; margin-bottom: 5px; border-bottom: 2px solid #333; padding-bottom: 3px; font-size: 13px;">${titulo}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px;">
                <thead>
                    <tr style="background-color: #f4f4f5;">
                        <th style="border: 1px solid #d4d4d8; padding: 4px; text-align: left;">Motorista</th>
                        <th style="border: 1px solid #d4d4d8; padding: 4px;">Conjunto</th>
                        <th style="border: 1px solid #d4d4d8; padding: 4px;">Placa Alocada</th>
                        <th style="border: 1px solid #d4d4d8; padding: 4px;">Entrada</th>
                        <th style="border: 1px solid #d4d4d8; padding: 4px;">Saída</th>
                        <th style="border: 1px solid #d4d4d8; padding: 4px; text-align: left;">Base</th>
                    </tr>
                </thead>
                <tbody>`;
        
        lista.forEach(m => {
            html += `<tr>
                <td style="border: 1px solid #d4d4d8; padding: 3px;"><strong>${m.nome}</strong></td>
                <td style="border: 1px solid #d4d4d8; padding: 3px; text-align: center;">${m.conjuntoId || '-'}</td>
                <td style="border: 1px solid #d4d4d8; padding: 3px; text-align: center; font-weight: bold; color: #2563eb;">${m.caminhaoAtivo}</td>
                <td style="border: 1px solid #d4d4d8; padding: 3px; text-align: center; font-weight: bold; color: #16a34a;">${m.hrEntrada}</td>
                <td style="border: 1px solid #d4d4d8; padding: 3px; text-align: center; font-weight: bold; color: #ea580c;">${m.hrSaida}</td>
                <td style="border: 1px solid #d4d4d8; padding: 3px;">${m.cidade || '-'}</td>
            </tr>`;
        });
        return html + `</tbody></table>`;
    };

    let conteudoRelatorio = '';
    
    if (turnoEscolhido === 'Todos' || turnoEscolhido === 'Dia') {
        conteudoRelatorio += buildTable('☀️ TURNO DO DIA', trabalhandoDia);
    }
    
    if (turnoEscolhido === 'Todos' || turnoEscolhido === 'Noite') {
        conteudoRelatorio += buildTable('🌙 TURNO DA NOITE', trabalhandoNoite);
    }

    const janelaImp = window.open('', '', 'width=900,height=700');
    janelaImp.document.write(`
        <html>
        <head>
            <title>Escala Diária - ${dataFormatada}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 15px; color: #000; } 
                .print-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 10px; } 
                h1 { font-size: 16px; margin: 0 0 5px 0; }
                p { margin: 2px 0; font-size: 11px; }
                
                @media print { 
                    @page { size: A4 portrait; margin: 10mm; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; } 
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Serrana Florestal - CCOL</h1>
                <p><strong>Relatório: Escala Diária</strong> | Data: <strong>${dataFormatada}</strong> | Turno: <strong>${turnoEscolhido}</strong></p>
            </div>
            
            ${conteudoRelatorio}
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; cursor: pointer; border-radius: 6px; font-weight: bold; font-size: 14px;" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
            </div>
        </body>
        </html>
    `);
    janelaImp.document.close();
    
    fecharModalImpressao();
};

// ==================== IMPRESSÃO DA ESCALA SEMANAL ====================
window.imprimirRelatorioEscalaSemanal = function() {
    const inputData = document.getElementById('dataInicioEscala');
    const dataStr = inputData && inputData.value ? inputData.value : new Date().toISOString().split('T')[0];
    const partes = dataStr.split('-');
    const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    const filtroSelec = filtroSelectEl ? filtroSelectEl.value : 'todos';

    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => c.id.toString() === filtroSelec.toString()) : [...conjuntos];

    if (filtroSelec === 'todos') {
        const motoristasSemConjunto = motoristas.filter(m => !m.conjuntoId);
        if (motoristasSemConjunto.length > 0) {
            conjuntosRender.push({ id: 'S/F', isSemFrota: true, caminhoes: [] });
        }
    }

    conjuntosRender.sort((a, b) => {
        if (a.isSemFrota) return 1;
        if (b.isSemFrota) return -1;
        return parseInt(a.id) - parseInt(b.id);
    });

    if (conjuntosRender.length === 0) {
        alert("Nenhum dado para imprimir com este filtro.");
        return;
    }

    let html = `
    <html>
    <head>
        <title>Escala Semanal - Serrana Florestal</title>
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px;}
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #555; }
            
            .conjunto-box { display: flex; margin-bottom: 20px; border: 2px solid #000; border-radius: 4px; page-break-inside: avoid; }
            .conjunto-num { width: 60px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; background-color: #f8f9fa; border-right: 2px solid #000; text-align: center;}
            .conjunto-num.sf { background-color: #fef3c7; color: #d97706; border-right: 2px solid #f59e0b; font-size: 14px; border-color: #f59e0b;}
            .conjunto-tabelas { flex: 1; }
            
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            .tabela-subsequente { border-top: 2px solid #000; }
            th, td { border: 1px solid #000; text-align: center; vertical-align: middle; padding: 6px 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            th { background-color: #a9d08e; font-weight: bold; text-transform: uppercase; color: #000; }
            th.th-dia { background-color: #bdd7ee; }
            
            .col-nome { width: 22%; text-align: left; padding-left: 8px; font-weight: bold; }
            .col-turno { width: 8%; }
            .col-go { width: 10%; font-weight: bold; color: #1e3a8a; }
            .col-eq { width: 5%; font-weight: bold; }
            .col-dia { width: 7.8%; font-weight: bold; }
            
            .celula-trabalho { background-color: #8faadc; color: #000; font-weight: bold; }
            .celula-folga { background-color: #f4b084; color: #000; font-weight: bold; }
            .celula-treino { background-color: #fde047; color: #000; font-weight: bold; }
            
            .tag-folguista { font-size: 9px; background: #ea580c; color: #fff; padding: 2px 4px; border-radius: 4px; margin-left: 5px; }
            
            .btn-print-container { text-align: center; margin: 30px 0; }
            @media print { .btn-print-container { display: none; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Serrana Florestal - CCOL</h1>
            <p><strong>Relatório Completo de Escala Semanal</strong> | Semana Iniciada em: <strong>${dataFormatada}</strong></p>
        </div>
    `;

    conjuntosRender.forEach(conj => {
        let motoristasDoConjunto = conj.isSemFrota ? motoristas.filter(m => !m.conjuntoId) : motoristas.filter(m => m.conjuntoId === conj.id);
        
        let numClass = conj.isSemFrota ? "conjunto-num sf" : "conjunto-num";
        let numBorder = conj.isSemFrota ? "border: 2px solid #f59e0b;" : "border: 2px solid #000;";
        let numeroDisplay = conj.isSemFrota ? "SEM<br>FROTA" : conj.id;

        html += `<div class="conjunto-box" style="${numBorder}"><div class="${numClass}">${numeroDisplay}</div><div class="conjunto-tabelas">`;

        if (motoristasDoConjunto.length === 0) {
            html += `<p style="padding: 15px; color: #555; font-size: 13px; margin:0;">Nenhum motorista alocado neste conjunto.</p></div></div>`;
            return;
        }

        const grupoA = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const grupoB = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(m.equipe)).sort((a, b) => a.equipe.localeCompare(b.equipe));
        const grupoC = motoristasDoConjunto.filter(m => !['A', 'B', 'C', 'D', 'E', 'F'].includes(m.equipe));

        const renderTable = (grupo, isFirst) => {
            if (grupo.length === 0) return '';
            let tHtml = `<table class="${isFirst ? '' : 'tabela-subsequente'}"><thead><tr>
                <th class="col-nome">NOME DO COLABORADOR</th>
                <th class="col-turno">HORÁRIO</th>
                <th class="col-go">GO</th>
                <th class="col-eq">EQ</th>`;
            
            (window.currentDatas || []).forEach(d => {
                tHtml += `<th class="th-dia col-dia">${d.diaNum}<br>${d.diaTexto}</th>`;
            });
            tHtml += `</tr></thead><tbody>`;

            grupo.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                const isFolguista = (m.equipe === 'C' || m.equipe === 'F');
                
                let goStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    let go1 = (typeof cam1 === 'string' || !cam1.go) ? '-' : cam1.go;
                    let go2 = (typeof cam2 === 'string' || !cam2.go) ? '-' : cam2.go;

                    if (m.equipe === 'A' || m.equipe === 'D') goStr = go1;
                    else if (m.equipe === 'B' || m.equipe === 'E') goStr = go2;
                    else if (isFolguista) goStr = (go1 !== '-' && go2 !== '-' && go1 !== go2) ? `${go1} / ${go2}` : (go1 !== '-' ? go1 : go2);
                    else goStr = go1 !== '-' ? go1 : '-';
                }

                let tagFolguista = isFolguista ? `<span class="tag-folguista">FOLG</span>` : '';
                let displayTurno = isFolguista ? 'Misto' : (m.turno || '-');

                tHtml += `<tr>`;
                tHtml += `<td class="col-nome" style="${isBlocked ? 'color: red;' : ''}">${m.nome} ${tagFolguista}</td>`;
                tHtml += `<td class="col-turno">${displayTurno}</td>`;
                tHtml += `<td class="col-go">${goStr}</td>`;
                tHtml += `<td class="col-eq">${m.equipe && m.equipe !== '-' ? m.equipe : ''}</td>`;

                (window.currentDatas || []).forEach(d => {
                    const escala = window.getEscalaDiaComputada(m, d.dateKey);
                    let val = isBlocked ? 'Bloq' : escala.caminhao;
                    
                    let tdClass = '';
                    if (!isBlocked) {
                        if (val === 'F') tdClass = 'celula-folga';
                        else tdClass = 'celula-trabalho';
                    }
                    
                    let temTreinamento = false;
                    if (typeof cronogramaTreinamento !== 'undefined') {
                        const treinoDia = cronogramaTreinamento.find(t => t.motoristaId === m.id && t.data === d.dateKey && t.status === 'agendado');
                        if (treinoDia) temTreinamento = true;
                    }
                    
                    if (temTreinamento) tdClass = 'celula-treino';

                    tHtml += `<td class="${tdClass}">${val}</td>`;
                });
                tHtml += `</tr>`;
            });
            tHtml += `</tbody></table>`;
            return tHtml;
        };

        html += renderTable(grupoA, true);
        html += renderTable(grupoB, grupoA.length === 0);
        html += renderTable(grupoC, grupoA.length === 0 && grupoB.length === 0);
        
        html += `</div></div>`;
    });

    html += `
        <div class="btn-print-container">
            <button style="padding: 12px 25px; background: #2563eb; color: #fff; border: none; cursor: pointer; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" onclick="window.print()">🖨️ Salvar como PDF / Imprimir Agora</button>
        </div>
    </body></html>`;

    const janelaImp = window.open('', '', 'width=1200,height=800');
    janelaImp.document.write(html);
    janelaImp.document.close();
}

// ==================== EXPORTAÇÃO EXCEL (ESCALA MENSAL) ====================
window.exportarEscalaMensalExcel = function() {
    const inputData = document.getElementById('dataInicioEscala');
    let dataBase = new Date();
    
    if (inputData && inputData.value) {
        dataBase = new Date(inputData.value + 'T00:00:00');
    }

    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth(); 
    
    const diasNoMes = new Date(ano, mes + 1, 0).getDate(); 

    let csvContent = "\uFEFF"; 
    csvContent += "Motorista;Conjunto;Equipe;Horário (Turno)";
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        csvContent += `;${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}`;
    }
    csvContent += "\n";

    let motoristasOrdenados = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId || 999999;
        const conjB = b.conjuntoId || 999999;
        if (conjA !== conjB) return conjA - conjB;
        return a.nome.localeCompare(b.nome);
    });

    motoristasOrdenados.forEach(m => {
        let linha = `${m.nome};${m.conjuntoId ? 'Conjunto ' + m.conjuntoId : 'Sem Frota'};${m.equipe || '-'};${m.turno || '-'}`;

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtualStr = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            
            const escalaDia = window.getEscalaDiaComputada(m, dataAtualStr);
            
            let statusCelula = escalaDia.caminhao;

            if (statusCelula === 'F') {
                statusCelula = 'FOLGA';
            }
            linha += `;${statusCelula}`;
        }
        
        csvContent += linha + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `Escala_Mensal_${(mes + 1).toString().padStart(2, '0')}_${ano}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
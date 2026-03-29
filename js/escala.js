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

    // Ordenar por Conjunto (Crescente) e depois por Ordem Alfabética (Nome)
    const motoristasOrdenados = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId || 999999;
        const conjB = b.conjuntoId || 999999;

        if (conjA !== conjB) {
            return conjA - conjB;
        }
        return a.nome.localeCompare(b.nome);
    });

    let html = '';
    let lastConjunto = null;
    
    motoristasOrdenados.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const currentConjunto = m.conjuntoId || 'sem_conjunto';

        // Criar a linha divisória sempre que mudar o conjunto
        if (currentConjunto !== lastConjunto) {
            const tituloConjunto = m.conjuntoId ? `🚛 CONJUNTO ${m.conjuntoId}` : `⚠️ NÃO ALOCADOS / SEM CONJUNTO`;
            html += `
                <tr style="background-color: rgba(255, 255, 255, 0.05); border-top: 2px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td colspan="5" style="text-align: center; font-weight: 800; color: #3b82f6; padding: 12px 10px; font-size: 0.95rem; letter-spacing: 1.5px;">
                        ${tituloConjunto}
                    </td>
                </tr>
            `;
            lastConjunto = currentConjunto;
        }
        
        let equipeSelect = `<select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="-" ${m.equipe === '-' ? 'selected' : ''}>Sem Equipe</option>
            <option value="A" ${m.equipe === 'A' ? 'selected' : ''}>A (Fixo Dia)</option>
            <option value="B" ${m.equipe === 'B' ? 'selected' : ''}>B (Fixo Dia)</option>
            <option value="C" ${m.equipe === 'C' ? 'selected' : ''}>C (⭐ FOLGUISTA DIA)</option>
            <option value="D" ${m.equipe === 'D' ? 'selected' : ''}>D (Fixo Noite)</option>
            <option value="E" ${m.equipe === 'E' ? 'selected' : ''}>E (Fixo Noite)</option>
            <option value="F" ${m.equipe === 'F' ? 'selected' : ''}>F (⭐ FOLGUISTA NOITE)</option>
        </select>`;
        
        let turnoSelect = `<select class="select-aloc-turno select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            ${isBlocked ? '<option value="-">-</option>' : TURNOS.map(t => `<option value="${t.periodo}" ${m.turno === t.periodo ? 'selected' : ''}>${t.periodo}</option>`).join('')}
        </select>`;
        
        let conjuntoSelect = `<select class="select-aloc-conjunto select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="">Não Alocado</option>
            ${isBlocked ? '' : conjuntos.map(c => `<option value="${c.id}" ${m.conjuntoId === c.id ? 'selected' : ''}>Conjunto ${c.id}</option>`).join('')}
        </select>`;
        
        // --- NOVA LÓGICA DO BOTÃO VERDE COM VISTO ---
        let botaoManual = '';
        if (m.data_ancora) {
            // Se tem data_ancora, significa que já foi editado. Mostra verde e a data em formato DD/MM
            const partesData = m.data_ancora.split('-'); // ex: 2026-04-15
            const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}` : 'Ajustado';
            botaoManual = `<button class="btn-primary-green" style="padding: 8px 12px; font-size: 0.8rem; font-weight: bold;" onclick="abrirModalEscalaManual(${m.id})" ${isBlocked ? 'disabled' : ''}>✅ Ajustado (${dataFormatada})</button>`;
        } else {
            // Se nunca foi editado, mostra azul padrão
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
    atualizarStats();

    // Re-renderiza a tabela de alocação na hora para mover o motorista para a nova sessão
    renderizarAlocacao();
}

// ==================== LÓGICA DO MENU DE ESCALA MANUAL ====================

window.abrirModalEscalaManual = function(id) {
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;
    
    if(!m.equipe || m.equipe === '-') {
        alert("O motorista precisa ter uma equipe (A-F) antes de configurar a escala!");
        return;
    }

    document.getElementById('manualMotId').value = m.id;
    document.getElementById('manualMotNome').innerText = m.nome;
    
    let nomeEquipe = m.equipe;
    if(m.equipe === 'C' || m.equipe === 'F') nomeEquipe += " (Folguista)";
    document.getElementById('manualMotEquipe').innerText = nomeEquipe;
    
    let dia1 = new Date();
    if (m.data_ancora) {
        let offset = 0;
        if (m.equipe === 'A' || m.equipe === 'D') offset = 2;
        if (m.equipe === 'B' || m.equipe === 'E') offset = 4;
        if (m.equipe === 'C' || m.equipe === 'F') offset = 0;
        
        let d = new Date(m.data_ancora + 'T00:00:00');
        d.setDate(d.getDate() + offset);
        dia1 = d;
    }
    
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
        let colorBg = isTrab ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)';
        let colorBorder = isTrab ? '#3b82f6' : '#f97316';
        let icon = isTrab ? '🚚' : '🛋️';
        let txt = isTrab ? 'TRAB' : 'FOLGA';
        
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
        let offset = 0;
        if (m.equipe === 'A' || m.equipe === 'D') offset = 2;
        if (m.equipe === 'B' || m.equipe === 'E') offset = 4;
        if (m.equipe === 'C' || m.equipe === 'F') offset = 0;

        let dAncora = new Date(dataEscolhida + 'T00:00:00');
        dAncora.setDate(dAncora.getDate() - offset);
        
        m.data_ancora = dAncora.toISOString().split('T')[0];
        db.updateMotorista(id, { data_ancora: m.data_ancora });
        
        recalcularEscalaUnica(id);
        salvarBackupLocal();
        
        fecharModalManual();

        const inputDataPrincipal = document.getElementById('dataInicioEscala');
        if (inputDataPrincipal) {
            inputDataPrincipal.value = dataEscolhida;
            if (typeof getDatasSemana === 'function') {
                currentDatas = getDatasSemana(dataEscolhida);
            }
        }
        
        renderizarEscala(); 
        
        // Também forçamos a renderização da alocação nos bastidores para que o botão fique verde
        renderizarAlocacao();
        
        const abaEscala = document.querySelector('.nav-item[data-tab="escala"]');
        if (abaEscala) {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            abaEscala.classList.add('active');
            const tabContent = document.getElementById('tab-escala');
            if (tabContent) tabContent.classList.add('active');
        }
    }
}

// ==================== RECALCULO INDIVIDUAL ====================
function recalcularEscalaUnica(motoristaId) {
    const m = motoristas.find(mot => mot.id === motoristaId);
    if (!m || m.masterDrive === 'Não' || m.destra === 'Não' || !m.equipe || m.equipe === '-' || !m.conjuntoId) return;

    const conjunto = conjuntos.find(c => c.id === m.conjuntoId);
    if (!conjunto || !conjunto.caminhoes) return;

    const dataAncoraStr = m.data_ancora ? `${m.data_ancora}T00:00:00` : '2026-03-25T00:00:00';
    const dataAncora = new Date(dataAncoraStr);
    
    let placa1 = conjunto.caminhoes.length > 0 ? (typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa) : 'F';
    let placa2 = conjunto.caminhoes.length > 1 ? (typeof conjunto.caminhoes[1] === 'string' ? conjunto.caminhoes[1] : conjunto.caminhoes[1].placa) : placa1;

    const baseDate = new Date(dataAncoraStr);
    for(let i = -10; i <= 30; i++) {
        let dDate = new Date(baseDate);
        dDate.setDate(dDate.getDate() + i);
        let dKey = dDate.toISOString().split('T')[0];

        const diffDays = Math.floor((dDate - dataAncora) / (1000 * 60 * 60 * 24));
        let cicloDia = ((diffDays % 6) + 6) % 6; 
        let statusCaminhao = 'F';

        switch (m.equipe) {
            case 'A': 
            case 'D': 
                statusCaminhao = (cicloDia === 0 || cicloDia === 1) ? 'F' : placa1;
                break;
            case 'B': 
            case 'E': 
                statusCaminhao = (cicloDia === 2 || cicloDia === 3) ? 'F' : placa2;
                break;
            case 'C': 
            case 'F': 
                if (cicloDia === 0 || cicloDia === 1) statusCaminhao = placa1;
                else if (cicloDia === 2 || cicloDia === 3) statusCaminhao = placa2;
                else statusCaminhao = 'F'; 
                break;
        }

        if (!escalas[m.id]) escalas[m.id] = {};
        if (!escalas[m.id][dKey]) escalas[m.id][dKey] = { turno: m.turno };
        
        escalas[m.id][dKey].caminhao = statusCaminhao;
        db.upsertEscala({ id: `${m.id}_${dKey}`, motorista_id: m.id, data: dKey, turno: m.turno, caminhao: statusCaminhao, status: 'normal' });
    }
}

// ==================== GERAÇÃO AUTOMÁTICA GERAL ====================

function gerarEscala4x2(silencioso = false) {
    if (!silencioso && !confirm("Gerar escala inteligente 4x2 global? Isso substituirá a tela atual para TODOS.")) return;
    
    const filtroSelec = document.getElementById('filtroConjuntoEscala')?.value || 'todos';
    let motoristasAtualizados = 0;

    motoristas.forEach(m => {
        if (filtroSelec !== 'todos' && m.conjuntoId != filtroSelec) return;
        if (m.masterDrive === 'Não' || m.destra === 'Não' || !m.equipe || m.equipe === '-' || !m.conjuntoId) return;

        motoristasAtualizados++;
        recalcularEscalaUnica(m.id);
    });

    if (motoristasAtualizados === 0 && !silencioso) {
        alert("Nenhum motorista válido foi encontrado! Verifique as equipes e o Master/Destra.");
        return;
    }

    salvarBackupLocal();
    renderizarEscala(); 
    if (!silencioso) alert(`Escala automática global gerada com sucesso!`);
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
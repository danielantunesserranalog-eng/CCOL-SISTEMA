// ==================== MÓDULO: ESCALA & ALOCAÇÃO ====================

const getEq = (m) => m && m.equipe ? m.equipe.trim().toUpperCase() : '-';
const pesoEquipe = (eq) => ({'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6}[eq] || 99);

window.popularSelectMotoristas = function() {
    const select = document.getElementById('buscaMotoristaEscala');
    if (!select) return;
    
    const valorAtual = select.value;
    let html = '<option value="">Selecione o motorista...</option>';
    
    const motoristasOrdenados = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));
    motoristasOrdenados.forEach(m => { html += `<option value="${m.nome}">${m.nome}</option>`; });
    
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
    const eq = getEq(motorista);
    if (motorista.conjuntoId && eq === '-') {
        return { caminhao: 'F', turno: motorista.turno, status: 'fallback' };
    }

    const dDate = new Date(dateKey + 'T00:00:00');
    const statusMot = window.getStatusMotorista(motorista, dDate);

    if (statusMot === 'F') return { caminhao: 'F', turno: motorista.turno, status: 'fallback' };

    const conjunto = conjuntos.find(c => String(c.id) === String(motorista.conjuntoId));
    if (!conjunto || !conjunto.caminhoes) return { caminhao: 'T', turno: motorista.turno, status: 'fallback' };

    let placa1 = conjunto.caminhoes.length > 0 ? (typeof conjunto.caminhoes[0] === 'string' ? conjunto.caminhoes[0] : conjunto.caminhoes[0].placa) : 'F';
    let placa2 = conjunto.caminhoes.length > 1 ? (typeof conjunto.caminhoes[1] === 'string' ? conjunto.caminhoes[1] : conjunto.caminhoes[1].placa) : placa1;
    let statusCaminhao = 'F';

    if (eq === 'A' || eq === 'D') statusCaminhao = placa1;
    else if (eq === 'B' || eq === 'E') statusCaminhao = placa2;
    else if (eq === 'C') { 
        const fixoA = motoristas.find(mot => String(mot.conjuntoId) === String(motorista.conjuntoId) && getEq(mot) === 'A');
        const fixoB = motoristas.find(mot => String(mot.conjuntoId) === String(motorista.conjuntoId) && getEq(mot) === 'B');
        const statusA = fixoA ? window.getStatusMotorista(fixoA, dDate) : 'F';
        const statusB = fixoB ? window.getStatusMotorista(fixoB, dDate) : 'F';
        if (statusA === 'F') statusCaminhao = placa1;
        else if (statusB === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1; 
    } 
    else if (eq === 'F') {
        const fixoD = motoristas.find(mot => String(mot.conjuntoId) === String(motorista.conjuntoId) && getEq(mot) === 'D');
        const fixoE = motoristas.find(mot => String(mot.conjuntoId) === String(motorista.conjuntoId) && getEq(mot) === 'E');
        const statusD = fixoD ? window.getStatusMotorista(fixoD, dDate) : 'F';
        const statusE = fixoE ? window.getStatusMotorista(fixoE, dDate) : 'F';
        if (statusD === 'F') statusCaminhao = placa1;
        else if (statusE === 'F') statusCaminhao = placa2;
        else statusCaminhao = placa1;
    }
    
    if (statusCaminhao === 'TRAB') statusCaminhao = 'T';
    return { caminhao: statusCaminhao, turno: motorista.turno, status: 'auto' };
}

window.getEscalaDiaComputada = function(motorista, dateKey) {
    // 1. VERIFICA EXCEÇÕES MANUAIS: Verifica se guardou um ajuste manual para este dia específico na base de dados
    if (escalas[motorista.id] && escalas[motorista.id][dateKey] && escalas[motorista.id][dateKey].status === 'manual') {
        return escalas[motorista.id][dateKey];
    }
    // 2. SE NÃO TEM AJUSTE: Calcula a matemática padrão infinitamente
    return window.calcularEscalaMatematica(motorista, dateKey);
}

window.renderizarEscala = function() {
    const container = document.getElementById('escalaContainer');
    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    window.popularSelectMotoristas();

    if (filtroSelectEl) {
        const valAtual = filtroSelectEl.value;
        let optHtml = '<option value="todos">Todos</option>';
        conjuntos.forEach(c => optHtml += `<option value="${c.id}">Conjunto ${String(c.id).padStart(2, '0')}</option>`);
        if (filtroSelectEl.innerHTML !== optHtml) {
            filtroSelectEl.innerHTML = optHtml;
            if (conjuntos.some(c => String(c.id) === String(valAtual))) filtroSelectEl.value = valAtual;
            else filtroSelectEl.value = 'todos';
        }
    }

    if (!container) return;

    if (motoristas.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum motorista registado.</p>';
        return;
    }

    const inputData = document.getElementById('dataInicioEscala');
    let dataBaseStr = inputData && inputData.value ? inputData.value : new Date().toISOString().split('T')[0];
    let dataBase = new Date(dataBaseStr + 'T00:00:00');
    
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
    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => String(c.id) === String(filtroSelec)) : [...conjuntos];

    if (filtroSelec === 'todos') {
        if (motoristas.some(m => !m.conjuntoId)) {
            conjuntosRender.push({ id: 'S/F', isSemFrota: true, caminhoes: [] });
        }
    }

    conjuntosRender.sort((a, b) => {
        if (a.isSemFrota) return 1; 
        if (b.isSemFrota) return -1;
        return Number(a.id) - Number(b.id);
    });

    let html = '';

    conjuntosRender.forEach(conj => {
        let motoristasDoConjunto = conj.isSemFrota 
            ? motoristas.filter(m => !m.conjuntoId) 
            : motoristas.filter(m => String(m.conjuntoId) === String(conj.id));

        if (motoristasDoConjunto.length === 0) return;

        let numeroDisplay = conj.isSemFrota ? 'SEM FROTA / RESERVAS' : `TRINCA ${String(conj.id).padStart(2, '0')}`;

        const grupoDia = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(getEq(m)))
            .sort((a, b) => pesoEquipe(getEq(a)) - pesoEquipe(getEq(b)) || a.nome.localeCompare(b.nome));
            
        const grupoNoite = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(getEq(m)))
            .sort((a, b) => pesoEquipe(getEq(a)) - pesoEquipe(getEq(b)) || a.nome.localeCompare(b.nome));
            
        const outros = motoristasDoConjunto.filter(m => !['A', 'B', 'C', 'D', 'E', 'F'].includes(getEq(m)))
            .sort((a, b) => a.nome.localeCompare(b.nome));

        html += `<div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">`;
        html += `<div style="background: #0f172a; padding: 12px 20px; font-size: 1.1rem; font-weight: 800; color: #fff; border-bottom: 2px solid #3b82f6; text-align: left; letter-spacing: 1px;">
                    🚛 ${numeroDisplay}
                 </div>`;
        html += `<div style="overflow-x: auto; width: 100%;">`;
        html += `<table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.85rem; min-width: 950px;">`;
        html += `<thead>
                    <tr style="background-color: rgba(30, 41, 59, 0.9); color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 12%;">Horário</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 10%;">GO/Placa</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 6%;">Equipa</th>
                        <th style="padding: 12px 8px; border: 1px solid rgba(255,255,255,0.05); width: 10%;">Posição</th>
                        <th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.05); text-align: left; width: 22%;">Colaborador</th>
                        ${diasRender.map(d => `<th style="padding: 10px 5px; border: 1px solid rgba(255,255,255,0.05); width: 5.7%; color: #cbd5e1;">${d.diaTexto}<br><span style="font-size:0.85rem; font-weight:800; color: #fff;">${d.diaNum}</span></th>`).join('')}
                    </tr>
                 </thead><tbody>`;

        const renderRows = (grupo, tituloGrupo) => {
            if (grupo.length === 0) return '';
            let rowsHtml = `<tr style="background-color: rgba(0,0,0,0.6);">
                            <td colspan="${5 + diasRender.length}" style="padding: 8px 15px; font-weight: 800; font-size: 0.8rem; color: #e2e8f0; text-align: left; border: 1px solid rgba(255,255,255,0.05);">
                                ${tituloGrupo}
                            </td>
                         </tr>`;

            grupo.forEach(m => {
                const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
                let eq = getEq(m);
                
                let goStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    let go1 = (typeof cam1 === 'string' || !cam1.go) ? '-' : cam1.go;
                    let go2 = (typeof cam2 === 'string' || !cam2.go) ? '-' : cam2.go;

                    if (eq === 'A' || eq === 'D') goStr = go1;
                    else if (eq === 'B' || eq === 'E') goStr = go2;
                    else if (eq === 'C' || eq === 'F') goStr = (go1 !== '-' && go2 !== '-' && go1 !== go2) ? `${go1} / ${go2}` : (go1 !== '-' ? go1 : go2);
                    else goStr = go1 !== '-' ? go1 : '-';
                }
                
                let posicaoStr = '-';
                if (eq === 'A' || eq === 'D') posicaoStr = 'FROTA 1';
                else if (eq === 'B' || eq === 'E') posicaoStr = 'FROTA 2';
                else if (eq === 'C' || eq === 'F') posicaoStr = 'FOLGUISTA';

                rowsHtml += `<tr style="background-color: transparent; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;">`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05);">${m.turno || '-'}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: bold; color: #93c5fd;">${goStr}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: 800; color: #f8fafc;">${eq !== '-' ? eq : ''}</td>`;
                rowsHtml += `<td style="padding: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: 600; color: #cbd5e1;">${posicaoStr}</td>`;
                rowsHtml += `<td class="td-name" style="padding: 8px 15px; border: 1px solid rgba(255,255,255,0.05); text-align: left; ${isBlocked ? 'color: #f87171;' : 'color: #fff;'} font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.nome}</td>`;

                diasRender.forEach(d => {
                    const escala = window.getEscalaDiaComputada(m, d.dateKey);
                    const isFolga = escala.caminhao === 'F';
                    const isManual = escala.status === 'manual';
                    
                    let bgCell = isFolga ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)';
                    let colorCell = isFolga ? '#fb923c' : '#93c5fd';
                    let borderSide = isFolga ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
                    
                    if (isManual) {
                        bgCell = 'rgba(168, 85, 247, 0.15)';
                        borderSide = '1px solid rgba(168, 85, 247, 0.5)';
                    }
                    
                    let opcoes = `<option value="F" ${isFolga ? 'selected' : ''} style="background: #1e293b; color: #fff;">F</option>`;
                    if (!isFolga || isManual) {
                        opcoes += `<option value="T" ${escala.caminhao === 'T' || escala.caminhao === 'TRAB' ? 'selected' : ''} style="background: #1e293b; color: #fff;">T</option>`;
                        if (!conj.isSemFrota) {
                            conj.caminhoes?.forEach(cam => {
                                const placa = typeof cam === 'string' ? cam : cam.placa;
                                opcoes += `<option value="${placa}" ${escala.caminhao === placa ? 'selected' : ''} style="background: #1e293b; color: #fff;">${placa}</option>`;
                            });
                        }
                    }
                    
                    if (isManual) {
                        opcoes += `<option value="AUTO" style="background: #0f172a; color: #fbbf24; font-weight: bold;">🔄 Voltar para Auto</option>`;
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

        html += renderRows(grupoDia, '☀️ TURNO DO DIA (EQUIPAS A, B, C)');
        html += renderRows(grupoNoite, '🌙 TURNO DA NOITE (EQUIPAS D, E, F)');
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
                td.style.setProperty('background-color', 'rgba(253, 224, 71, 0.8)', 'important');
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

// LÓGICA DE EXCEÇÕES: Grava APENAS se houver ajuste, e APAGA se pedir "AUTO"
async function handleEscalaChange(e) {
    const select = e.target;
    const motoristaIdStr = String(select.dataset.motorista); 
    const data = select.dataset.data;
    const novoCaminhao = select.value;
    
    const m = motoristas.find(mot => String(mot.id) === motoristaIdStr);
    if(m) {
        const idExcecao = String(`${m.id}_${data}`);
        
        if (novoCaminhao === 'AUTO') {
            try {
                await db.deleteEscalaDia(idExcecao);
                if (escalas[m.id]) delete escalas[m.id][data];
                window.renderizarEscala(); 
            } catch (err) {
                console.error(err);
            }
            return;
        }

        try {
            await db.upsertEscala({ 
                id: idExcecao, 
                motorista_id: Number(m.id),  
                data: data, 
                turno: m.turno, 
                caminhao: novoCaminhao, 
                status: 'manual' 
            });

            if (!escalas[m.id]) escalas[m.id] = {};
            escalas[m.id][data] = { turno: m.turno, caminhao: novoCaminhao, status: 'manual' };
            
            window.renderizarEscala(); 
            if(typeof atualizarStats === 'function') atualizarStats();
        } catch (error) {
            window.renderizarEscala(); 
        }
    }
}

function renderizarAlocacao() {
    const tbody = document.getElementById('alocacaoList');
    if (!tbody) return;
    
    if (motoristas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum motorista registado</td></tr>'; 
        return;
    }

    const motoristasOrdenados = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId ? Number(a.conjuntoId) : 999999;
        const conjB = b.conjuntoId ? Number(b.conjuntoId) : 999999;
        if (conjA !== conjB) return conjA - conjB; 
        
        const eqA = getEq(a);
        const eqB = getEq(b);
        if (pesoEquipe(eqA) !== pesoEquipe(eqB)) return pesoEquipe(eqA) - pesoEquipe(eqB);
        
        return a.nome.localeCompare(b.nome);
    });

    let html = '';
    let lastConjunto = null;
    
    motoristasOrdenados.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const currentConjunto = m.conjuntoId ? Number(m.conjuntoId) : 'sem_conjunto';
        let eq = getEq(m);

        if (currentConjunto !== lastConjunto) {
            const tituloConjunto = m.conjuntoId ? `🚛 TRINCA ${String(m.conjuntoId).padStart(2, '0')}` : `🚨 RESERVAS / SEM TRINCA`;
            const btnReset = m.conjuntoId ? `<button onclick="resetarCicloConjunto(${m.conjuntoId})" style="float: right; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold; transition: 0.2s;">🔄 ZERAR CICLO</button>` : '';

            html += `
                <tr style="background-color: #0f172a; border-top: 2px solid #3b82f6;">
                    <td colspan="5" style="text-align: left; padding: 12px 15px; font-weight: 800; color: #fff; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px;">
                        ${tituloConjunto}
                        ${btnReset}
                    </td>
                </tr>
            `;
            lastConjunto = currentConjunto;
        }
        
        let posicaoTag = '';
        if (eq === 'A' || eq === 'D') posicaoTag = '<span style="display:inline-block; width: 75px; font-size: 0.65rem; background: #2563eb; color: #fff; padding: 3px; border-radius: 4px; text-align: center; font-weight: bold; margin-right: 8px;">FROTA 1</span>';
        else if (eq === 'B' || eq === 'E') posicaoTag = '<span style="display:inline-block; width: 75px; font-size: 0.65rem; background: #7c3aed; color: #fff; padding: 3px; border-radius: 4px; text-align: center; font-weight: bold; margin-right: 8px;">FROTA 2</span>';
        else if (eq === 'C' || eq === 'F') posicaoTag = '<span style="display:inline-block; width: 75px; font-size: 0.65rem; background: #ea580c; color: #fff; padding: 3px; border-radius: 4px; text-align: center; font-weight: bold; margin-right: 8px;">FOLGUISTA</span>';
        else posicaoTag = '<span style="display:inline-block; width: 75px; font-size: 0.65rem; background: #475569; color: #fff; padding: 3px; border-radius: 4px; text-align: center; font-weight: bold; margin-right: 8px;">RESERVA</span>';

        let turnoDisplay = '';
        if (['A', 'B', 'C'].includes(eq)) turnoDisplay = '<span style="color: #fbbf24; font-size: 0.75rem;">☀️ Turno Dia</span>';
        else if (['D', 'E', 'F'].includes(eq)) turnoDisplay = '<span style="color: #93c5fd; font-size: 0.75rem;">🌙 Turno Noite</span>';

        let equipeSelect = `
            <div style="display: flex; align-items: center; justify-content: flex-start;">
                ${posicaoTag}
                <select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''} style="width: 140px; font-weight: bold; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px;">
                    <option value="-" ${eq === '-' ? 'selected' : ''}>Sem Equipa</option>
                    <option value="A" ${eq === 'A' ? 'selected' : ''}>A (Dia)</option>
                    <option value="B" ${eq === 'B' ? 'selected' : ''}>B (Dia)</option>
                    <option value="C" ${eq === 'C' ? 'selected' : ''}>C (Dia)</option>
                    <option value="D" ${eq === 'D' ? 'selected' : ''}>D (Noite)</option>
                    <option value="E" ${eq === 'E' ? 'selected' : ''}>E (Noite)</option>
                    <option value="F" ${eq === 'F' ? 'selected' : ''}>F (Noite)</option>
                </select>
            </div>`;
        
        let turnoSelect = `<select class="select-aloc-turno select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px;">
            ${isBlocked ? '<option value="-">-</option>' : TURNOS.map(t => `<option value="${t.periodo}" ${m.turno === t.periodo ? 'selected' : ''}>${t.periodo}</option>`).join('')}
        </select>`;
        
        let conjuntoSelect = `<select class="select-aloc-conjunto select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px;">
            <option value="">Não Alocado</option>
            ${isBlocked ? '' : conjuntos.map(c => `<option value="${c.id}" ${String(m.conjuntoId) === String(c.id) ? 'selected' : ''}>Trinca ${String(c.id).padStart(2, '0')}</option>`).join('')}
        </select>`;
        
        let botaoManual = '';
        if (m.data_ancora) {
            const partesData = m.data_ancora.split('-'); 
            const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}` : 'Ajustado';
            botaoManual = `<button class="btn-primary-green" style="width: 100%; padding: 7px; font-size: 0.75rem; font-weight: bold; border-radius: 4px;" onclick="abrirModalEscalaManual('${m.id}')" ${isBlocked ? 'disabled' : ''}>✅ Ciclo (${dataFormatada})</button>`;
        } else {
            botaoManual = `<button class="btn-primary-blue" style="width: 100%; padding: 7px; font-size: 0.75rem; font-weight: bold; border-radius: 4px;" onclick="abrirModalEscalaManual('${m.id}')" ${isBlocked ? 'disabled' : ''}>⚙️ Ajustar Ciclo</button>`;
        }
        
        let bgRow = 'transparent';
        if (!isBlocked) {
            if (['A', 'B', 'C'].includes(eq)) bgRow = 'rgba(253, 230, 138, 0.05)';
            else if (['D', 'E', 'F'].includes(eq)) bgRow = 'rgba(191, 219, 254, 0.05)';
        }

        html += `<tr style="${isBlocked ? 'background-color: rgba(239, 68, 68, 0.1);' : `background-color: ${bgRow};`} border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 12px 15px; vertical-align: middle; width: 25%;">
                <div style="${isBlocked ? 'color: #ef4444;' : 'color: #f8fafc;'} font-weight: 800; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.nome}</div>
                ${turnoDisplay}
            </td>
            <td style="padding: 10px; vertical-align: middle; width: 32%;">${equipeSelect}</td>
            <td style="padding: 10px; vertical-align: middle; width: 15%;">${turnoSelect}</td>
            <td style="padding: 10px; vertical-align: middle; width: 13%;">${conjuntoSelect}</td>
            <td style="padding: 10px; vertical-align: middle; width: 15%;">${botaoManual}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
    document.querySelectorAll('.select-aloc-equipe, .select-aloc-turno, .select-aloc-conjunto').forEach(el => el.addEventListener('change', updateAlocacao));
}

async function updateAlocacao(e) {
    const idStr = String(e.target.dataset.id);
    const motorista = motoristas.find(m => String(m.id) === idStr);
    const tr = e.target.closest('tr');
    
    if (!motorista) return;

    const oldEquipe = motorista.equipe;
    const oldTurno = motorista.turno;
    const oldConjuntoId = motorista.conjuntoId;

    let novaEquipe = tr.querySelector('.select-aloc-equipe').value;
    let novoTurno = tr.querySelector('.select-aloc-turno').value;
    let conjVal = tr.querySelector('.select-aloc-conjunto').value;
    
    novaEquipe = (novaEquipe && novaEquipe !== '-') ? novaEquipe : null;
    novoTurno = (novoTurno && novoTurno !== '-') ? novoTurno : null;

    let novoConjuntoId = null;
    if (conjVal && conjVal !== "") {
        const conjuntoOriginal = conjuntos.find(c => String(c.id) === String(conjVal));
        novoConjuntoId = conjuntoOriginal ? conjuntoOriginal.id : Number(conjVal);
    }
    
    try {
        await db.updateMotorista(Number(motorista.id), { 
            equipe: novaEquipe, 
            turno: novoTurno, 
            conjuntoId: novoConjuntoId 
        });
        
        motorista.equipe = novaEquipe;
        motorista.turno = novoTurno;
        motorista.conjuntoId = novoConjuntoId;
        
        salvarBackupLocal();
        window.renderizarEscala(); 
        if(typeof atualizarStats === 'function') atualizarStats();
        renderizarAlocacao();
        
    } catch (error) {
        tr.querySelector('.select-aloc-equipe').value = oldEquipe || '-';
        tr.querySelector('.select-aloc-turno').value = oldTurno || '-';
        tr.querySelector('.select-aloc-conjunto').value = (oldConjuntoId !== null && oldConjuntoId !== undefined) ? String(oldConjuntoId) : '';
    }
}

window.resetarCicloConjunto = async function(conjuntoId) {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem zerar o ciclo.'); return; }
    if (!confirm(`Deseja ZERAR as datas e as edições manuais da escala da Trinca ${conjuntoId}?`)) return;

    let promisesExclusao = [];
    motoristas.forEach(m => {
        if (String(m.conjuntoId) === String(conjuntoId)) {
            if (m.data_ancora) { m.data_ancora = null; db.updateMotorista(Number(m.id), { data_ancora: null }); }
            if (escalas[m.id]) escalas[m.id] = {};
            if (typeof db.deleteEscalasPorMotorista === 'function') promisesExclusao.push(db.deleteEscalasPorMotorista(Number(m.id)));
        }
    });

    await Promise.all(promisesExclusao);
    await db.addLog('Reset de Ciclo', `Datas âncora e escalas manuais removidas para a Trinca ${conjuntoId}.`);
    salvarBackupLocal();
    renderizarAlocacao();
    window.renderizarEscala();
    alert(`O ciclo e a escala da Trinca ${conjuntoId} foram completamente zerados!`);
};

window.abrirModalEscalaManual = function(id) {
    const idStr = String(id);
    const m = motoristas.find(mot => String(mot.id) === idStr);
    if (!m) return;
    let eq = getEq(m);
    if (m.conjuntoId && eq === '-') { 
        alert("O motorista precisa ter uma equipa (A-F) antes de configurar a data do ciclo!"); 
        return; 
    }

    document.getElementById('manualMotId').value = m.id;
    document.getElementById('manualMotNome').innerText = m.nome;
    document.getElementById('manualMotEquipe').innerText = eq;
    
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
    const idStr = String(document.getElementById('manualMotId').value);
    const dataEscolhida = document.getElementById('manualDataInicio').value; 
    const m = motoristas.find(mot => String(mot.id) === idStr);
    
    if (m && dataEscolhida) {
        try {
            await db.updateMotorista(Number(m.id), { data_ancora: dataEscolhida });
            m.data_ancora = dataEscolhida; 
        } catch(e) {
            return; 
        }
        
        if (escalas[m.id]) escalas[m.id] = {};
        if (typeof db.deleteEscalasPorMotorista === 'function') await db.deleteEscalasPorMotorista(Number(m.id));

        salvarBackupLocal();
        fecharModalManual();
        window.renderizarEscala(); 
        renderizarAlocacao();
    }
}

window.gerarEscala4x2 = async function(silencioso = false) {
    if (!silencioso) {
        alert("✔️ A escala 4x2 automática já é calculada infinitamente pelo sistema a partir da data do ciclo!\nA base de dados não sofrerá mais sobrecargas com dados repetitivos.");
    }
    window.renderizarEscala(); 
}

window.zerarEscala = async function() {
    if(currentUser.role !== 'Admin') { alert('⛔ Acesso Negado.'); return; }
    if (!confirm("Isto apagará TODAS as exceções manuais gravadas e a escala voltará para o ciclo automático perfeito. Continuar?")) return;
    try {
        await db.limparApenasEscalas();
        escalas = {}; 
        salvarBackupLocal();
        window.renderizarEscala();
        alert("✔️ Exceções removidas. Escala 100% no automático!");
    } catch (e) {
        console.error(e);
    }
}

window.abrirModalImpressao = function() {
    document.getElementById('printData').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalImpressaoDiaria').classList.add('show');
}

window.fecharModalImpressao = function() { document.getElementById('modalImpressaoDiaria').classList.remove('show'); }

window.imprimirRelatorioEscalaSemanal = function() {
    if (!window.currentDatas || window.currentDatas.length === 0) {
        alert("Nenhuma semana renderizada. Selecione a data no painel primeiro."); return;
    }
    const filtroSelectEl = document.getElementById('filtroConjuntoEscala');
    const filtroSelec = filtroSelectEl ? filtroSelectEl.value : 'todos';
    let conjuntosRender = filtroSelec !== 'todos' ? conjuntos.filter(c => String(c.id) === String(filtroSelec)) : [...conjuntos];
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
            th, td { border: 1px solid #000; padding: 4px; font-size: 10px; }
            th { background-color: #d1d5db; }
            .dia-bg { background-color: #fef9c3; }
            .noite-bg { background-color: #dbeafe; }
            .trab { background-color: #d4edda; font-weight: bold; color: #000; }
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
        let motoristasDoConjunto = motoristas.filter(m => String(m.conjuntoId) === String(conj.id));
        if (motoristasDoConjunto.length === 0) return;

        const gDia = motoristasDoConjunto.filter(m => ['A', 'B', 'C'].includes(getEq(m))).sort((a,b) => pesoEquipe(getEq(a)) - pesoEquipe(getEq(b)));
        const gNoite = motoristasDoConjunto.filter(m => ['D', 'E', 'F'].includes(getEq(m))).sort((a,b) => pesoEquipe(getEq(a)) - pesoEquipe(getEq(b)));

        const renderTable = (grupo, titulo, classeTr) => {
            if (grupo.length === 0) return '';
            let tHtml = `<tr><td colspan="12" style="background: #e5e7eb; font-weight: bold; text-align: left; padding-left: 10px; font-size: 12px;">${titulo}</td></tr>`;
            
            grupo.forEach(m => {
                let eq = getEq(m);
                let goStr = '-', posStr = '-';
                if (conj.caminhoes && conj.caminhoes.length > 0) {
                    let cam1 = conj.caminhoes[0];
                    let cam2 = conj.caminhoes.length > 1 ? conj.caminhoes[1] : cam1;
                    let go1 = cam1.go || '-', go2 = cam2.go || '-';
                    if (eq === 'A' || eq === 'D') { goStr = go1; posStr = 'FROTA 1'; }
                    else if (eq === 'B' || eq === 'E') { goStr = go2; posStr = 'FROTA 2'; }
                    else { goStr = (go1!=='-' && go2!=='-' && go1!==go2)?`${go1}/${go2}`:go1; posStr = 'FOLGUISTA'; }
                }
                
                tHtml += `<tr class="${classeTr}"><td>${m.turno || '-'}</td><td>${goStr}</td><td>${eq}</td><td>${posStr}</td><td style="text-align:left;"><b>${m.nome}</b></td>`;
                
                window.currentDatas.forEach(d => {
                    const esc = window.getEscalaDiaComputada(m, d.dateKey);
                    const isF = esc.caminhao === 'F';
                    const valorExibicao = isF ? 'F' : esc.caminhao;
                    tHtml += `<td class="${isF ? 'folga' : 'trab'}">${valorExibicao}</td>`;
                });
                tHtml += `</tr>`;
            });
            return tHtml;
        };

        html += `<div class="trinca-box"><div class="trinca-num">TRINCA ${String(conj.id).padStart(2, '0')}</div>`;
        html += `<table><thead><tr><th style="width:9%;">HORÁRIO</th><th style="width:11%;">GO/PLACA</th><th style="width:5%;">EQ</th><th style="width:11%;">POSIÇÃO</th><th style="text-align:left;">COLABORADOR</th>${window.currentDatas.map(d => `<th style="width:8%;">${d.diaTexto}<br>${d.diaNum}</th>`).join('')}</tr></thead><tbody>`;
        html += renderTable(gDia, '☀️ TURNO DO DIA (EQUIPAS A, B, C)', 'dia-bg');
        html += renderTable(gNoite, '🌙 TURNO DA NOITE (EQUIPAS D, E, F)', 'noite-bg');
        html += `</tbody></table></div>`;
    });

    html += `<script>window.print();</script></body></html>`;
    const w = window.open('', '', 'width=1200,height=800');
    w.document.write(html);
    w.document.close();
}

window.exportarEscalaMensalExcel = function() {
    const inputData = document.getElementById('dataInicioEscala');
    let dataBase = inputData && inputData.value ? new Date(inputData.value + 'T00:00:00') : new Date();
    
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth(); 
    const diasNoMes = new Date(ano, mes + 1, 0).getDate(); 

    let csvContent = "\uFEFFHorário;GO/Placa;Equipa;Posição;Colaborador";
    for (let dia = 1; dia <= diasNoMes; dia++) csvContent += `;${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}`;
    csvContent += "\n";

    let mOrdenados = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId ? Number(a.conjuntoId) : 999999;
        const conjB = b.conjuntoId ? Number(b.conjuntoId) : 999999;
        return conjA - conjB || pesoEquipe(getEq(a)) - pesoEquipe(getEq(b));
    });

    mOrdenados.forEach(m => {
        let eq = getEq(m);
        let posStr = '-';
        if (eq === 'A' || eq === 'D') posStr = 'FROTA 1';
        else if (eq === 'B' || eq === 'E') posStr = 'FROTA 2';
        else if (eq === 'C' || eq === 'F') posStr = 'FOLGUISTA';
        
        let linha = `${m.turno||'-'};-;${eq !== '-' ? eq : '-'};${posStr};${m.nome}`;

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtualStr = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            const escalaDia = window.getEscalaDiaComputada(m, dataAtualStr);
            const valorExibicao = escalaDia.caminhao === 'F' ? 'F' : escalaDia.caminhao;
            linha += `;${valorExibicao}`;
        }
        csvContent += linha + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Escala_Mensal_${(mes + 1).toString().padStart(2, '0')}_${ano}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// ==================== RESTAURAÇÃO DAS FUNÇÕES DO PAINEL DE TROCA ====================

window.renderizarTrocaTurno = function() {
    const tbodyProximos = document.getElementById('listaProximosTroca');
    const tbodyPlantao = document.getElementById('listaPlantaoSemCaminhao');
    const tbodyFolga = document.getElementById('listaFolga');

    if (!tbodyProximos || !tbodyPlantao || !tbodyFolga) return;

    const hojeStr = new Date().toISOString().split('T')[0];

    let htmlProximos = '';
    let htmlPlantao = '';
    let htmlFolga = '';

    const motoristasOrd = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));

    motoristasOrd.forEach(m => {
        const eq = getEq(m);
        const escala = window.getEscalaDiaComputada(m, hojeStr);
        const cidade = m.cidade || '-';
        const turno = m.turno || '-';

        let conjuntoDisplay = m.conjuntoId ? `Trinca ${String(m.conjuntoId).padStart(2, '0')}` : 'S/ Trinca';
        if (escala.caminhao !== 'F' && escala.caminhao !== 'T' && escala.caminhao !== 'TRAB') {
            conjuntoDisplay += ` (${escala.caminhao})`;
        }

        if (escala.caminhao === 'F') {
            htmlFolga += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="font-weight: bold; color: #f8fafc;">${eq}</td>
                <td style="color: #fb923c; font-weight: bold;">Em Folga</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        } else if (escala.caminhao === 'T' || escala.caminhao === 'TRAB') {
            htmlPlantao += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="font-weight: bold; color: #f8fafc;">${eq}</td>
                <td>${turno}</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        } else {
            htmlProximos += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="color: #93c5fd; font-weight: bold;">${conjuntoDisplay}</td>
                <td>${turno}</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        }
    });

    tbodyProximos.innerHTML = htmlProximos || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista ativo no momento</td></tr>';
    tbodyPlantao.innerHTML = htmlPlantao || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista de plantão</td></tr>';
    tbodyFolga.innerHTML = htmlFolga || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista em folga</td></tr>';
};

window.gerarRelatorioImpressao = function() {
    const dataStr = document.getElementById('printData').value;
    const turnoFiltro = document.getElementById('printTurno').value; 

    if (!dataStr) {
        alert('Selecione uma data para impressão.');
        return;
    }

    const partesData = dataStr.split('-');
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    let html = `
    <html>
    <head>
        <title>Escala Diária - ${dataFormatada}</title>
        <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #000; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 11px; }
            th { background-color: #d1d5db; text-transform: uppercase; }
            .trab { background-color: #d4edda; font-weight: bold; }
            .folga { background-color: #f8d7da; color: #721c24; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; background: #eee; padding: 5px; border: 1px solid #000; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Serrana Florestal - Escala Diária</h1>
            <p><strong>Data: ${dataFormatada} | Turno: ${turnoFiltro}</strong></p>
        </div>
    `;

    const motoristasOrd = [...motoristas].sort((a, b) => {
        const conjA = a.conjuntoId ? Number(a.conjuntoId) : 9999;
        const conjB = b.conjuntoId ? Number(b.conjuntoId) : 9999;
        return conjA - conjB || getEq(a).localeCompare(getEq(b)) || a.nome.localeCompare(b.nome);
    });

    let motoristasFiltrados = motoristasOrd;
    if (turnoFiltro === 'Dia') {
        motoristasFiltrados = motoristasOrd.filter(m => ['A', 'B', 'C'].includes(getEq(m)));
    } else if (turnoFiltro === 'Noite') {
        motoristasFiltrados = motoristasOrd.filter(m => ['D', 'E', 'F'].includes(getEq(m)));
    }

    const trabs = [];
    const folgas = [];

    motoristasFiltrados.forEach(m => {
        const eq = getEq(m);
        const escala = window.getEscalaDiaComputada(m, dataStr);
        const trinca = m.conjuntoId ? String(m.conjuntoId).padStart(2, '0') : 'S/F';

        const linha = { nome: m.nome, trinca: trinca, eq: eq, turno: m.turno || '-', caminhao: escala.caminhao };
        
        if (escala.caminhao === 'F') {
            folgas.push(linha);
        } else {
            trabs.push(linha);
        }
    });

    const renderTabela = (lista, titulo) => {
        if (lista.length === 0) return '';
        let tHtml = `<div class="section-title">${titulo} (${lista.length} motoristas)</div>`;
        tHtml += `<table><thead><tr><th>TRINCA</th><th>MOTORISTA</th><th>EQUIPA</th><th>HORÁRIO</th><th>STATUS / CAMINHÃO</th></tr></thead><tbody>`;
        lista.forEach(l => {
            const classe = l.caminhao === 'F' ? 'folga' : 'trab';
            const statusStr = l.caminhao === 'F' ? 'FOLGA' : (l.caminhao === 'T' || l.caminhao === 'TRAB' ? 'TRABALHO (SEM CAMINHÃO)' : l.caminhao);
            tHtml += `<tr>
                <td>${l.trinca}</td>
                <td style="text-align:left; font-weight:bold;">${l.nome}</td>
                <td>${l.eq}</td>
                <td>${l.turno}</td>
                <td class="${classe}">${statusStr}</td>
            </tr>`;
        });
        tHtml += `</tbody></table>`;
        return tHtml;
    };

    html += renderTabela(trabs, '🚛 EM SERVIÇO / ESCALADOS');
    html += renderTabela(folgas, '🛋️ EM FOLGA');

    html += `
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #555;">
            Relatório gerado pelo sistema CCOL em ${new Date().toLocaleString('pt-BR')}
        </div>
        <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
    `;

    const w = window.open('', '', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    window.fecharModalImpressao();
};
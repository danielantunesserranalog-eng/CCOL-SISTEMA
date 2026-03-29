// ==================== ESTRUTURA DE DADOS ====================
let conjuntos = [];
let motoristas = [];
let escalas = {}; // { motoristaId: { data: { turno, caminhao, status } } }

// Configurações
const HORARIOS_PROIBIDOS = ['23:00', '00:00', '01:00'];

// Gerar turnos de 12 horas dinamicamente (excluindo os horários proibidos)
const TURNOS = [];
for (let i = 0; i < 24; i++) {
    const horaInicio = `${String(i).padStart(2, '0')}:00`;
    
    if (!HORARIOS_PROIBIDOS.includes(horaInicio)) {
        const horaFimNum = (i + 12) % 24;
        const horaFim = `${String(horaFimNum).padStart(2, '0')}:00`;
        
        TURNOS.push({
            nome: `12h`,
            inicio: horaInicio,
            fim: horaFim,
            periodo: `${horaInicio}-${horaFim}`
        });
    }
}

// Datas da semana atual
function getDatasSemana() {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const segundona = new Date(hoje);
    segundona.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    
    const datas = [];
    for (let i = 0; i < 7; i++) {
        const data = new Date(segundona);
        data.setDate(segundona.getDate() + i);
        const dataStr = data.toISOString().split('T')[0];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        datas.push({
            dateKey: dataStr,
            label: `${data.getDate()}/${data.getMonth()+1} ${diasSemana[data.getDay()]}`
        });
    }
    return datas;
}

// ==================== DADOS INICIAIS / BANCO ====================
async function carregarDadosIniciais() {
    try {
        const dbConjuntos = await db.getConjuntos();
        const dbMotoristas = await db.getMotoristas();
        const dbEscalas = await db.getEscalas();

        if (dbConjuntos.length === 0 && dbMotoristas.length === 0) {
            gerarDadosExemploLocais();
            
            for (let c of conjuntos) await db.addConjunto(c);
            for (let m of motoristas) await db.addMotorista(m);
            for (let mId in escalas) {
                for (let data in escalas[mId]) {
                    const esc = escalas[mId][data];
                    await db.upsertEscala({
                        id: `${mId}_${data}`,
                        motorista_id: parseInt(mId),
                        data: data,
                        turno: esc.turno,
                        caminhao: esc.caminhao,
                        status: esc.status
                    });
                }
            }
        } else {
            conjuntos = dbConjuntos;
            motoristas = dbMotoristas;
            
            escalas = {};
            motoristas.forEach(m => { escalas[m.id] = {}; });
            
            dbEscalas.forEach(e => {
                if (!escalas[e.motorista_id]) escalas[e.motorista_id] = {};
                escalas[e.motorista_id][e.data] = {
                    turno: e.turno,
                    caminhao: e.caminhao,
                    status: e.status
                };
            });
        }

        const datas = getDatasSemana();
        motoristas.forEach(m => {
            if (!escalas[m.id]) escalas[m.id] = {};
            datas.forEach(d => {
                if (!escalas[m.id][d.dateKey]) {
                    escalas[m.id][d.dateKey] = {
                        turno: m.turno || TURNOS[0].periodo,
                        caminhao: 'F',
                        status: 'normal'
                    };
                }
            });
        });

    } catch (e) {
        console.error("Erro ao comunicar com Supabase. Carregando offline...", e);
        gerarDadosExemploLocais();
    }
}

function gerarDadosExemploLocais() {
    conjuntos = [
        { id: 34, caminhoes: [{placa: 'TOQ-2A02', go: 'GO-101'}, {placa: 'TOQ-A02', go: 'GO-102'}] },
        { id: 35, caminhoes: [{placa: 'TOQ-2B24', go: 'GO-201'}, {placa: 'TOQ-2B24-2', go: 'GO-202'}] }
    ];
    
    motoristas = [
        { id: 1, nome: 'ANTONIO GINELI CORREIA', masterDrive: 'Sim', destra: 'Sim', cidade: 'Itabatan', equipe: 'A', turno: '06:00-18:00', conjuntoId: 34 },
        { id: 2, nome: 'ALESSANDRO BITTA SANTOS', masterDrive: 'Sim', destra: 'Sim', cidade: 'Mucuri', equipe: 'B', turno: '06:00-18:00', conjuntoId: 35 },
        { id: 3, nome: 'FABIO MAGALHÃES ROSA', masterDrive: 'Não', destra: 'Não', cidade: 'Itabatan', equipe: 'C', turno: '18:00-06:00', conjuntoId: null }
    ];
    
    escalas = {};
    const datas = getDatasSemana();
    motoristas.forEach(m => {
        escalas[m.id] = {};
        datas.forEach(d => {
            const caminhoesConj = m.conjuntoId ? conjuntos.find(c => c.id === m.conjuntoId)?.caminhoes || [] : [];
            const camAleatorio = caminhoesConj.length > 0 ? caminhoesConj[Math.floor(Math.random() * caminhoesConj.length)] : null;
            const placa = camAleatorio ? camAleatorio.placa : 'F';
            
            escalas[m.id][d.dateKey] = {
                turno: m.turno || '06:00-18:00',
                caminhao: Math.random() > 0.2 ? placa : 'F',
                status: 'normal'
            };
        });
    });
}

// ==================== FUNÇÕES DE VALIDAÇÃO ====================
function validarTrocaTurno(motoristaId, novaData, novoTurno) {
    const horaInicio = parseInt(novoTurno.split('-')[0].split(':')[0]);
    const minInicio = parseInt(novoTurno.split('-')[0].split(':')[1]);
    const horaInicioStr = `${String(horaInicio).padStart(2,'0')}:${String(minInicio).padStart(2,'0')}`;
    
    if (HORARIOS_PROIBIDOS.includes(horaInicioStr)) {
        return { valido: false, motivo: `Horário ${horaInicioStr} é proibido para troca de turno` };
    }
    
    const motorista = motoristas.find(m => m.id === motoristaId);
    
    if (motorista.conjuntoId !== null) {
        const mesmoConjunto = motoristas.filter(m => m.conjuntoId === motorista.conjuntoId && m.id !== motoristaId);
        
        for (let outro of mesmoConjunto) {
            const escalaOutro = escalas[outro.id]?.[novaData];
            if (escalaOutro && escalaOutro.turno === novoTurno && escalaOutro.caminhao !== 'F') {
                return { valido: false, motivo: `Motorista ${outro.nome} já está escalado neste turno no mesmo conjunto` };
            }
        }
    }
    
    return { valido: true };
}

// ==================== RENDERIZAÇÃO E DB UPDATE ====================
let currentDatas = getDatasSemana();

function renderizarEscala() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    
    if (!thead || !tbody) return;
    
    let headerHtml = `<tr><th>Conjunto</th><th>Motorista</th><th>Equipe</th><th>Turno Padrão</th>`;
    currentDatas.forEach(d => {
        headerHtml += `<th>${d.label}</th>`;
    });
    headerHtml += `<th>Ações</th></tr>`;
    thead.innerHTML = headerHtml;
    
    if (motoristas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%">Nenhum motorista cadastrado</td></tr>';
        atualizarStats();
        return;
    }
    
    let bodyHtml = '';
    motoristas.forEach(m => {
        const conjunto = m.conjuntoId ? conjuntos.find(c => c.id === m.conjuntoId) : null;
        
        // Verifica se o motorista está bloqueado por falta de curso
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const rowStyle = isBlocked ? 'background-color: #ffe6e6;' : '';
        const blockedIcon = isBlocked ? ' ⛔' : '';
        
        bodyHtml += `<tr data-motorista-id="${m.id}" style="${rowStyle}">`;
        bodyHtml += `<td><strong>${conjunto?.id || 'Sem Conjunto'}</strong></td>`;
        bodyHtml += `<td style="${isBlocked ? 'color: #cc0000; font-weight: bold;' : ''}">${m.nome}${blockedIcon}</td>`;
        bodyHtml += `<td>Equipe ${m.equipe || '-'}</td>`;
        bodyHtml += `<td>${m.turno || '-'}</td>`;
        
        currentDatas.forEach(d => {
            const escala = escalas[m.id]?.[d.dateKey] || { turno: m.turno, caminhao: 'F', status: 'normal' };
            const caminhoesConj = conjunto?.caminhoes || [];
            
            const opcoes = [{ placa: 'F', go: '' }];
            caminhoesConj.forEach(cam => {
                const placa = typeof cam === 'string' ? cam : cam.placa;
                const go = typeof cam === 'string' ? '' : cam.go;
                opcoes.push({ placa, go });
            });
            
            let selectHtml = `<select class="select-escala" data-motorista="${m.id}" data-data="${d.dateKey}" ${isBlocked ? 'disabled' : ''}>`;
            if (isBlocked) {
                selectHtml += `<option value="F" selected>Bloqueado</option>`;
            } else {
                opcoes.forEach(opt => {
                    const selected = escala.caminhao === opt.placa ? 'selected' : '';
                    const label = opt.placa === 'F' ? 'F (Folga)' : `${opt.placa} ${opt.go ? `[${opt.go}]` : ''}`;
                    selectHtml += `<option value="${opt.placa}" ${selected}>${label}</option>`;
                });
            }
            selectHtml += `</select>`;
            
            let turnoSelect = `<select class="select-turno" data-motorista="${m.id}" data-data="${d.dateKey}" style="margin-top:5px; width:100%; padding:4px;" ${isBlocked ? 'disabled' : ''}>`;
            if (isBlocked) {
                turnoSelect += `<option value="-" selected>-</option>`;
            } else {
                TURNOS.forEach(t => {
                    const selected = escala.turno === t.periodo ? 'selected' : '';
                    turnoSelect += `<option value="${t.periodo}" ${selected}>${t.periodo}</option>`;
                });
            }
            turnoSelect += `</select>`;
            
            bodyHtml += `<td style="min-width:140px;">
                            ${selectHtml}
                            ${turnoSelect}
                          </td>`;
        });
        
        bodyHtml += `<td><button class="btn-remove-motorista" data-id="${m.id}" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:6px;">🗑️</button></td>`;
        bodyHtml += `</tr>`;
    });
    
    tbody.innerHTML = bodyHtml;
    
    document.querySelectorAll('.select-escala').forEach(select => {
        select.removeEventListener('change', handleEscalaChange);
        select.addEventListener('change', handleEscalaChange);
    });
    
    document.querySelectorAll('.select-turno').forEach(select => {
        select.removeEventListener('change', handleTurnoChange);
        select.addEventListener('change', handleTurnoChange);
    });
    
    document.querySelectorAll('.btn-remove-motorista').forEach(btn => {
        btn.removeEventListener('click', handleRemoveMotorista);
        btn.addEventListener('click', handleRemoveMotorista);
    });
    
    atualizarStats();
}

function handleEscalaChange(e) {
    const select = e.target;
    const motoristaId = parseInt(select.dataset.motorista);
    const data = select.dataset.data;
    const novoCaminhao = select.value;
    
    if (escalas[motoristaId] && escalas[motoristaId][data]) {
        escalas[motoristaId][data].caminhao = novoCaminhao;
        renderizarEscala();
        
        db.upsertEscala({
            id: `${motoristaId}_${data}`,
            motorista_id: motoristaId,
            data: data,
            turno: escalas[motoristaId][data].turno,
            caminhao: novoCaminhao,
            status: escalas[motoristaId][data].status
        });
    }
}

function handleTurnoChange(e) {
    const select = e.target;
    const motoristaId = parseInt(select.dataset.motorista);
    const data = select.dataset.data;
    const novoTurno = select.value;
    
    const validacao = validarTrocaTurno(motoristaId, data, novoTurno);
    if (!validacao.valido) {
        alert(`❌ Troca não permitida: ${validacao.motivo}`);
        renderizarEscala();
        return;
    }
    
    if (escalas[motoristaId] && escalas[motoristaId][data]) {
        escalas[motoristaId][data].turno = novoTurno;
        renderizarEscala();
        
        db.upsertEscala({
            id: `${motoristaId}_${data}`,
            motorista_id: motoristaId,
            data: data,
            turno: novoTurno,
            caminhao: escalas[motoristaId][data].caminhao,
            status: escalas[motoristaId][data].status
        });
    }
}

// ==================== ALOCAÇÃO ====================
function renderizarAlocacao() {
    const tbody = document.getElementById('alocacaoList');
    if (!tbody) return;
    
    if (motoristas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum motorista cadastrado</td></tr>';
        return;
    }
    
    let html = '';
    motoristas.forEach(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const rowStyle = isBlocked ? 'background-color: #ffe6e6;' : '';
        const blockedIcon = isBlocked ? ' ⛔' : '';

        let equipeSelect = `
            <select class="select-aloc-equipe select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
                <option value="-" ${m.equipe === '-' ? 'selected' : ''}>Sem Equipe</option>
                <option value="A" ${m.equipe === 'A' ? 'selected' : ''}>Equipe A</option>
                <option value="B" ${m.equipe === 'B' ? 'selected' : ''}>Equipe B</option>
                <option value="C" ${m.equipe === 'C' ? 'selected' : ''}>Equipe C</option>
            </select>
        `;
        
        let turnoSelect = `<select class="select-aloc-turno select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>`;
        if (isBlocked) {
            turnoSelect += `<option value="-" selected>-</option>`;
        } else {
            TURNOS.forEach(t => {
                turnoSelect += `<option value="${t.periodo}" ${m.turno === t.periodo ? 'selected' : ''}>${t.periodo}</option>`;
            });
        }
        turnoSelect += `</select>`;
        
        let conjuntoSelect = `<select class="select-aloc-conjunto select-turno" data-id="${m.id}" ${isBlocked ? 'disabled' : ''}>
            <option value="">Não Alocado</option>`;
        if (!isBlocked) {
            conjuntos.forEach(c => {
                conjuntoSelect += `<option value="${c.id}" ${m.conjuntoId === c.id ? 'selected' : ''}>Conjunto ${c.id}</option>`;
            });
        }
        conjuntoSelect += `</select>`;
        
        html += `
            <tr style="${rowStyle}">
                <td style="${isBlocked ? 'color: #cc0000;' : ''}"><strong>${m.nome}${blockedIcon}</strong></td>
                <td>${equipeSelect}</td>
                <td>${turnoSelect}</td>
                <td>${conjuntoSelect}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.querySelectorAll('.select-aloc-equipe').forEach(el => el.addEventListener('change', updateAlocacao));
    document.querySelectorAll('.select-aloc-turno').forEach(el => el.addEventListener('change', updateAlocacao));
    document.querySelectorAll('.select-aloc-conjunto').forEach(el => el.addEventListener('change', updateAlocacao));
}

function updateAlocacao(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    if(!motorista) return;
    
    const tr = e.target.closest('tr');
    motorista.equipe = tr.querySelector('.select-aloc-equipe').value;
    motorista.turno = tr.querySelector('.select-aloc-turno').value;
    const conjVal = tr.querySelector('.select-aloc-conjunto').value;
    motorista.conjuntoId = conjVal ? parseInt(conjVal) : null;
    
    // Atualiza no banco
    db.updateMotorista(id, {
        equipe: motorista.equipe,
        turno: motorista.turno,
        conjuntoId: motorista.conjuntoId
    });
    
    renderizarEscala();
    atualizarStats();
}

function renderizarMotoristas() {
    const tbody = document.getElementById('motoristasList');
    const searchTerm = document.getElementById('searchMotorista')?.value.toLowerCase() || '';
    
    if (!tbody) return;
    
    const filtered = motoristas.filter(m => m.nome.toLowerCase().includes(searchTerm));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum motorista encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const rowStyle = isBlocked ? 'background-color: #ffe6e6; color: #cc0000;' : '';
        const blockedIcon = isBlocked ? ' ⛔ (Bloqueado)' : '';

        return `
            <tr style="${rowStyle}">
                <td><strong>${m.nome}${blockedIcon}</strong></td>
                <td>${m.masterDrive || 'Não informado'}</td>
                <td>${m.destra || 'Não informado'}</td>
                <td>${m.cidade || '-'}</td>
                <td>
                    <button class="btn-edit-motorista" data-id="${m.id}" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:6px; margin-right:5px;">✏️</button>
                    <button class="btn-delete-motorista" data-id="${m.id}" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:6px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-edit-motorista').forEach(btn => {
        btn.removeEventListener('click', handleEditMotorista);
        btn.addEventListener('click', handleEditMotorista);
    });
    
    document.querySelectorAll('.btn-delete-motorista').forEach(btn => {
        btn.removeEventListener('click', handleRemoveMotorista); 
        btn.addEventListener('click', handleRemoveMotorista);
    });
}

function handleEditMotorista(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    if (!motorista) return;
    
    const novoNome = prompt('Nome do Motorista:', motorista.nome);
    if (novoNome === null) return;
    
    const novoMaster = prompt('Possui Master Drive? (Sim ou Não):', motorista.masterDrive || 'Sim');
    const novoDestra = prompt('Possui curso Destra? (Sim ou Não):', motorista.destra || 'Sim');
    const novaCidade = prompt('Cidade que mora:', motorista.cidade || '');
    
    motorista.nome = novoNome.trim() || motorista.nome;
    motorista.masterDrive = novoMaster?.trim() || motorista.masterDrive;
    motorista.destra = novoDestra?.trim() || motorista.destra;
    motorista.cidade = novaCidade?.trim() || motorista.cidade;
    
    renderizarMotoristas();
    renderizarEscala();
    renderizarAlocacao();
    
    db.updateMotorista(id, { 
        nome: motorista.nome, 
        masterDrive: motorista.masterDrive,
        destra: motorista.destra,
        cidade: motorista.cidade
    });
}

function handleRemoveMotorista(e) {
    const btn = e.target;
    const id = parseInt(btn.dataset.id);
    if (confirm('Remover este motorista?')) {
        motoristas = motoristas.filter(m => m.id !== id);
        delete escalas[id];
        
        renderizarEscala();
        renderizarMotoristas();
        renderizarAlocacao();
        atualizarStats();
        
        db.deleteMotorista(id);
        db.deleteEscalasPorMotorista(id);
    }
}

function renderizarConjuntos() {
    const container = document.getElementById('conjuntosList');
    
    if (!container) return;
    
    if (conjuntos.length === 0) {
        container.innerHTML = '<p>Nenhum conjunto cadastrado</p>';
        return;
    }
    
    container.innerHTML = conjuntos.map(conj => `
        <div class="conjunto-card">
            <div class="conjunto-header">
                <span class="conjunto-id">Conjunto ${conj.id}</span>
                <button class="btn-remove-conjunto" data-id="${conj.id}">🗑️ Remover</button>
            </div>
            <div class="caminhoes-list">
                <strong>Caminhões:</strong>
                ${conj.caminhoes.map(cam => {
                    const placa = typeof cam === 'string' ? cam : cam.placa;
                    const go = typeof cam === 'string' ? '' : cam.go;
                    return `
                        <div class="caminhao-item">
                            <span>🚛 ${placa} ${go ? `<strong>[${go}]</strong>` : ''}</span>
                            <button class="btn-remove-caminhao" data-conj="${conj.id}" data-placa="${placa}">Remover</button>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="add-caminhao" style="flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px;">
                    <input type="text" placeholder="Placa" id="novaPlaca-${conj.id}" style="width: 50%;">
                    <input type="text" placeholder="GO" id="novoGo-${conj.id}" style="width: 50%;">
                </div>
                <button class="btn-add-caminhao btn-secondary" data-id="${conj.id}" style="width: 100%;">➕ Adicionar Caminhão</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-remove-conjunto').forEach(btn => {
        btn.removeEventListener('click', handleRemoveConjunto);
        btn.addEventListener('click', handleRemoveConjunto);
    });
    
    document.querySelectorAll('.btn-remove-caminhao').forEach(btn => {
        btn.removeEventListener('click', handleRemoveCaminhao);
        btn.addEventListener('click', handleRemoveCaminhao);
    });
    
    document.querySelectorAll('.btn-add-caminhao').forEach(btn => {
        btn.removeEventListener('click', handleAddCaminhao);
        btn.addEventListener('click', handleAddCaminhao);
    });
}

function handleRemoveConjunto(e) {
    const id = parseInt(e.target.dataset.id);
    if (confirm(`Remover Conjunto ${id} e todos os motoristas associados a ele?`)) {
        conjuntos = conjuntos.filter(c => c.id !== id);
        
        const motoristasRemover = motoristas.filter(m => m.conjuntoId === id);
        motoristas = motoristas.filter(m => m.conjuntoId !== id);
        
        motoristasRemover.forEach(m => {
            delete escalas[m.id];
            db.deleteMotorista(m.id);
            db.deleteEscalasPorMotorista(m.id);
        });

        renderizarConjuntos();
        renderizarMotoristas();
        renderizarEscala();
        renderizarAlocacao();
        atualizarStats();
        
        db.deleteConjunto(id);
    }
}

function handleRemoveCaminhao(e) {
    const conjId = parseInt(e.target.dataset.conj);
    const placa = e.target.dataset.placa;
    const conjunto = conjuntos.find(c => c.id === conjId);
    
    if (conjunto && conjunto.caminhoes.length > 1) {
        conjunto.caminhoes = conjunto.caminhoes.filter(p => {
            const pPlaca = typeof p === 'string' ? p : p.placa;
            return pPlaca !== placa;
        });
        
        renderizarConjuntos();
        renderizarEscala();
        
        db.updateConjunto(conjId, conjunto.caminhoes);
    } else {
        alert('Cada conjunto deve ter pelo menos 1 caminhão');
    }
}

function handleAddCaminhao(e) {
    const conjId = parseInt(e.target.dataset.id);
    const inputPlaca = document.getElementById(`novaPlaca-${conjId}`);
    const inputGo = document.getElementById(`novoGo-${conjId}`);
    
    const novaPlaca = inputPlaca.value.trim();
    const novoGo = inputGo.value.trim();
    
    if (novaPlaca) {
        const conjunto = conjuntos.find(c => c.id === conjId);
        if (conjunto) {
            conjunto.caminhoes.push({ placa: novaPlaca, go: novoGo });
            renderizarConjuntos();
            renderizarEscala();
            
            inputPlaca.value = '';
            inputGo.value = '';
            
            db.updateConjunto(conjId, conjunto.caminhoes);
        }
    } else {
        alert("A placa do caminhão é obrigatória.");
    }
}

function atualizarStats() {
    const statConjuntos = document.getElementById('statConjuntos');
    const statCaminhoes = document.getElementById('statCaminhoes');
    const statMotoristas = document.getElementById('statMotoristas');
    const statEscalasHoje = document.getElementById('statEscalasHoje');
    
    if (statConjuntos) statConjuntos.innerText = conjuntos.length;
    if (statCaminhoes) {
        const totalCaminhoes = conjuntos.reduce((acc, c) => acc + c.caminhoes.length, 0);
        statCaminhoes.innerText = totalCaminhoes;
    }
    if (statMotoristas) statMotoristas.innerText = motoristas.length;
    
    if (statEscalasHoje) {
        const hoje = new Date().toISOString().split('T')[0];
        const escalasHoje = motoristas.filter(m => escalas[m.id]?.[hoje]?.caminhao !== 'F').length;
        statEscalasHoje.innerText = escalasHoje;
    }
}

// ==================== CRUD ====================
function adicionarMotorista() {
    const nome = document.getElementById('motoristaNome')?.value.trim();
    const masterDrive = document.getElementById('motoristaMasterDrive')?.value;
    const destra = document.getElementById('motoristaDestra')?.value;
    const cidade = document.getElementById('motoristaCidade')?.value.trim();
    
    if (!nome) {
        alert('Digite o nome do motorista');
        return;
    }
    
    const novoId = motoristas.length > 0 ? Math.max(...motoristas.map(m => m.id)) + 1 : 1;
    const turnoPadrao = TURNOS.length > 0 ? TURNOS[0].periodo : '06:00-18:00';

    const novoMot = {
        id: novoId,
        nome,
        masterDrive,
        destra,
        cidade,
        equipe: '-',
        turno: turnoPadrao,
        conjuntoId: null
    };
    
    motoristas.push(novoMot);
    escalas[novoId] = {};
    const datas = getDatasSemana();
    
    datas.forEach(d => {
        escalas[novoId][d.dateKey] = {
            turno: turnoPadrao,
            caminhao: 'F',
            status: 'normal'
        };
        db.upsertEscala({
            id: `${novoId}_${d.dateKey}`,
            motorista_id: novoId,
            data: d.dateKey,
            turno: turnoPadrao,
            caminhao: 'F',
            status: 'normal'
        });
    });
    
    if (document.getElementById('motoristaNome')) {
        document.getElementById('motoristaNome').value = '';
        document.getElementById('motoristaMasterDrive').value = 'Sim';
        document.getElementById('motoristaDestra').value = 'Sim';
        document.getElementById('motoristaCidade').value = '';
    }
    
    renderizarMotoristas();
    renderizarEscala();
    renderizarAlocacao();
    atualizarStats();
    
    db.addMotorista(novoMot);
}

function adicionarConjunto() {
    const id = parseInt(document.getElementById('conjuntoId')?.value);
    const placa1 = document.getElementById('caminhao1Placa')?.value.trim();
    const go1 = document.getElementById('caminhao1Go')?.value.trim();
    const placa2 = document.getElementById('caminhao2Placa')?.value.trim();
    const go2 = document.getElementById('caminhao2Go')?.value.trim();
    
    if (!id) {
        alert('Informe o ID do Conjunto');
        return;
    }
    
    if (!placa1 && !placa2) {
        alert('Informe pelo menos 1 caminhão para o conjunto');
        return;
    }
    
    if (conjuntos.find(c => c.id === id)) {
        alert('ID do conjunto já existe');
        return;
    }
    
    const caminhoes = [];
    if (placa1) caminhoes.push({ placa: placa1, go: go1 || '' });
    if (placa2) caminhoes.push({ placa: placa2, go: go2 || '' });
    
    const novoConjunto = { id, caminhoes };
    conjuntos.push(novoConjunto);
    
    if (document.getElementById('conjuntoId')) {
        document.getElementById('conjuntoId').value = '';
        document.getElementById('caminhao1Placa').value = '';
        document.getElementById('caminhao1Go').value = '';
        document.getElementById('caminhao2Placa').value = '';
        document.getElementById('caminhao2Go').value = '';
    }
    
    renderizarConjuntos();
    renderizarEscala();
    renderizarAlocacao();
    atualizarStats();
    
    db.addConjunto(novoConjunto);
}

function popularSelectTurnos() {
    const turnosInfo = document.querySelector('.turnos-info');
    if (turnosInfo) {
        turnosInfo.innerHTML = `<div style="width:100%">⏱️ Escalas de 12 horas disponíveis para todos os horários permitidos.</div>`;
    }
}

// ==================== NAVEGAÇÃO DAS TABS ====================
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
        });
    });
}

// ==================== EVENTOS ====================
async function init() {
    initTabs();
    popularSelectTurnos();
    
    await carregarDadosIniciais();
    
    renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    const btnAddMotorista = document.getElementById('btnAddMotorista');
    if (btnAddMotorista) btnAddMotorista.addEventListener('click', adicionarMotorista);
    
    const btnAddConjunto = document.getElementById('btnAddConjunto');
    if (btnAddConjunto) btnAddConjunto.addEventListener('click', adicionarConjunto);
    
    const refreshEscalaBtn = document.getElementById('refreshEscalaBtn');
    if (refreshEscalaBtn) {
        refreshEscalaBtn.addEventListener('click', () => {
            currentDatas = getDatasSemana();
            renderizarEscala();
        });
    }
    
    const searchMotorista = document.getElementById('searchMotorista');
    if (searchMotorista) {
        searchMotorista.addEventListener('input', () => renderizarMotoristas());
    }
    
    const btnResetData = document.getElementById('btnResetData');
    if (btnResetData) {
        btnResetData.addEventListener('click', async () => {
            if (confirm('Resetar todos os dados e começar com o exemplo do zero? Todos os dados do banco serão APAGADOS.')) {
                await db.limparTudo();
                gerarDadosExemploLocais();
                for (let c of conjuntos) await db.addConjunto(c);
                for (let m of motoristas) await db.addMotorista(m);
                for (let mId in escalas) {
                    for (let data in escalas[mId]) {
                        const esc = escalas[mId][data];
                        await db.upsertEscala({ id: `${mId}_${data}`, motorista_id: parseInt(mId), data: data, turno: esc.turno, caminhao: esc.caminhao, status: esc.status });
                    }
                }
                renderizarEscala();
                renderizarMotoristas();
                renderizarConjuntos();
                renderizarAlocacao();
                atualizarStats();
                alert('Banco de dados resetado com sucesso!');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
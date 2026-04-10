// ==================== MÓDULO: TREINAMENTO (VIAGEM ASSISTIDA) ====================

let instrutores = [];
let treinamentos = [];

window.renderizarPaginaTreinamento = async function() {
    await carregarDadosTreinamento();
    popularSelectMasterDrive();
    renderizarListaTreinamentos();
    atualizarIndicadoresTreinamento();
};

async function carregarDadosTreinamento() {
    instrutores = await db.getInstrutores();
    treinamentos = await db.getTreinamentos();
}

function popularSelectMasterDrive() {
    const select = document.getElementById('treinoMasterDrive');
    if (!select) return;
    let html = '<option value="">Selecione o Master...</option>';
    instrutores.forEach(ins => {
        html += `<option value="${ins.nome}">${ins.nome}</option>`;
    });
    select.innerHTML = html;
}

window.gerarCronogramaAutomatico = async function() {
    const dataInicioStr = document.getElementById('treinoDataInicio').value;
    const masterNome = document.getElementById('treinoMasterDrive').value;
    const turnoOpcao = document.getElementById('treinoTurnoOpcao').value;
    const qtdViagens = parseInt(document.getElementById('treinoQtdViagens').value);

    if (!dataInicioStr || !masterNome) {
        alert("Preencha a data inicial e selecione o Master Drive!");
        return;
    }

    if (!confirm("Isso gerará uma escala automática baseada na disponibilidade 4x2 dos motoristas. Continuar?")) return;

    let dataAtual = new Date(dataInicioStr + 'T00:00:00');
    let listaNovosTreinos = [];
    
    // Configurações de Ciclo do Master Drive
    // Semana 1: Master trabalha de DIA (Equipes A,B,C)
    // Semana 2: Master trabalha de NOITE (Equipes D,E,F)
    
    let turnoMasterAtual = "Dia"; // Começa no escolhido ou padrão
    if (turnoOpcao === "Noite") turnoMasterAtual = "Noite";

    // Vamos gerar para os próximos 30 dias como exemplo
    for (let d = 0; d < 30; d++) {
        let dataLoop = new Date(dataAtual);
        dataLoop.setDate(dataLoop.getDate() + d);
        let dataKey = dataLoop.toISOString().split('T')[0];
        
        // Verifica se é fim de semana para "Virada de Turno" do Master
        // Se for Segunda-feira, e a opção for "Ambos", inverte o turno do Master
        if (dataLoop.getDay() === 1 && turnoOpcao === "Ambos") {
            turnoMasterAtual = (turnoMasterAtual === "Dia") ? "Noite" : "Dia";
        }

        // Filtra motoristas que estão TRABALHANDO (escala 4x2) no turno do Master
        const motoristasDisponiveis = motoristas.filter(m => {
            const escala = window.getEscalaDiaComputada(m, dataKey);
            const estaTrabalhando = escala.caminhao !== 'F';
            
            let noTurnoCerto = false;
            const eq = (m.equipe || '').toUpperCase();
            if (turnoMasterAtual === "Dia") {
                noTurnoCerto = ['A', 'B', 'C'].includes(eq);
            } else {
                noTurnoCerto = ['D', 'E', 'F'].includes(eq);
            }
            
            return estaTrabalhando && noTurnoCerto;
        });

        // Pega até 2 motoristas por dia (ou de acordo com a jornada)
        // Aqui simulamos que o Master consegue atender o horário do motorista
        motoristasDisponiveis.slice(0, qtdViagens).forEach((mot, index) => {
            listaNovosTreinos.push({
                id: `${mot.id}_${dataKey}_${index}`,
                motorista_id: mot.id,
                motorista_nome: mot.nome,
                equipe: mot.equipe,
                master_drive: masterNome,
                data: dataKey,
                horario: mot.turno || '06:00',
                status: 'Agendado',
                turno_treino: turnoMasterAtual
            });
        });
    }

    // Salva no Banco
    for (const t of listaNovosTreinos) {
        await db.upsertTreinamento(t);
    }

    alert("Cronograma gerado com sucesso! Foram criados " + listaNovosTreinos.length + " agendamentos.");
    window.renderizarPaginaTreinamento();
};

function renderizarListaTreinamentos() {
    const tbody = document.getElementById('listaTreinamentos');
    if (!tbody) return;

    if (treinamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum treinamento agendado.</td></tr>';
        return;
    }

    // Ordena por data
    const ordenados = [...treinamentos].sort((a, b) => new Date(a.data) - new Date(b.data));

    tbody.innerHTML = ordenados.map(t => {
        let corStatus = "#3b82f6";
        if (t.status === 'Concluído') corStatus = "#10b981";
        if (t.status === 'Pendente') corStatus = "#f59e0b";

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding:12px;">${t.data.split('-').reverse().join('/')}</td>
                <td style="padding:12px;">${t.horario}</td>
                <td style="padding:12px; font-weight:bold;">${t.motorista_nome}</td>
                <td style="padding:12px;">${t.equipe || '-'}</td>
                <td style="padding:12px;">${t.master_drive}</td>
                <td style="padding:12px;"><span style="color:${corStatus}; font-weight:bold;">● ${t.status}</span></td>
                <td style="padding:12px;">
                    <button onclick="alterarStatusTreino('${t.id}', 'Concluído')" style="background:none; border:none; color:#10b981; cursor:pointer;" title="Concluir">✅</button>
                    <button onclick="deletarTreinamento('${t.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:10px;" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.alterarStatusTreino = async function(id, novoStatus) {
    const treino = treinamentos.find(t => t.id === id);
    if (treino) {
        treino.status = novoStatus;
        await db.upsertTreinamento(treino);
        window.renderizarPaginaTreinamento();
    }
};

window.deletarTreinamento = async function(id) {
    if (!confirm("Excluir este agendamento?")) return;
    await db.deleteTreinamento(id);
    window.renderizarPaginaTreinamento();
};

window.limparTodosTreinamentos = async function() {
    if (!confirm("ATENÇÃO: Isso apagará TODOS os treinamentos da base de dados. Confirma?")) return;
    for (const t of treinamentos) {
        await db.deleteTreinamento(t.id);
    }
    window.renderizarPaginaTreinamento();
};

function atualizarIndicadoresTreinamento() {
    const concluidos = treinamentos.filter(t => t.status === 'Concluído').length;
    const agendados = treinamentos.filter(t => t.status === 'Agendado').length;
    const pendentes = treinamentos.filter(t => t.status === 'Pendente').length;

    if (document.getElementById('treinoStatConcluido')) document.getElementById('treinoStatConcluido').innerText = concluidos;
    if (document.getElementById('treinoStatAgendado')) document.getElementById('treinoStatAgendado').innerText = agendados;
    if (document.getElementById('treinoStatPendente')) document.getElementById('treinoStatPendente').innerText = pendentes;
}

// Gestão de Master Drives (Instrutores)
window.abrirModalMasterDrive = function() {
    document.getElementById('modalMasterDrive').classList.add('show');
    renderizarListaMasterDrives();
};

window.fecharModalMasterDrive = function() {
    document.getElementById('modalMasterDrive').classList.remove('show');
};

async function renderizarListaMasterDrives() {
    const lista = document.getElementById('listaMasterDrivesCadastrados');
    if (!lista) return;
    
    lista.innerHTML = instrutores.map(ins => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <span>${ins.nome}</span>
            <button onclick="removerMasterDrive('${ins.nome}')" style="color:#ef4444; background:none; border:none; cursor:pointer;">Remover</button>
        </div>
    `).join('');
}

window.salvarMasterDrive = async function() {
    const nome = document.getElementById('novoMasterNome').value;
    if (!nome) return;
    await db.addInstrutor({ nome: nome });
    document.getElementById('novoMasterNome').value = '';
    await carregarDadosTreinamento();
    renderizarListaMasterDrives();
    popularSelectMasterDrive();
};

window.removerMasterDrive = async function(nome) {
    await db.deleteInstrutor(nome);
    await carregarDadosTreinamento();
    renderizarListaMasterDrives();
    popularSelectMasterDrive();
};

window.exportarTreinamentosExcel = function() {
    let csv = "\uFEFFData;Horario;Motorista;Equipe;Master Drive;Status\n";
    treinamentos.forEach(t => {
        csv += `${t.data};${t.horario};${t.motorista_nome};${t.equipe};${t.master_drive};${t.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Cronograma_Viagem_Assistida.csv";
    link.click();
};
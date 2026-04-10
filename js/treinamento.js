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

// Atualizado: Popula tanto a seleção principal de criação, quanto os de Realocação
function popularSelectMasterDrive() {
    const selectPrincipal = document.getElementById('treinoMasterDrive');
    const selectDe = document.getElementById('realocarDe');
    const selectPara = document.getElementById('realocarPara');
    
    // Lista para Criação
    let html = '<option value="">Selecione o Master...</option>';
    instrutores.forEach(ins => {
        html += `<option value="${ins.nome}">${ins.nome}</option>`;
    });
    if (selectPrincipal) selectPrincipal.innerHTML = html;
    
    // Lista para Realocação
    let htmlDe = '<option value="">De (Master Atual)...</option>';
    let htmlPara = '<option value="">Para (Novo Master)...</option>';
    instrutores.forEach(ins => {
        htmlDe += `<option value="${ins.nome}">${ins.nome}</option>`;
        htmlPara += `<option value="${ins.nome}">${ins.nome}</option>`;
    });
    
    if (selectDe) selectDe.innerHTML = htmlDe;
    if (selectPara) selectPara.innerHTML = htmlPara;
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
    
    let turnoMasterAtual = "Dia";
    if (turnoOpcao === "Noite") turnoMasterAtual = "Noite";

    for (let d = 0; d < 30; d++) {
        let dataLoop = new Date(dataAtual);
        dataLoop.setDate(dataLoop.getDate() + d);
        let dataKey = dataLoop.toISOString().split('T')[0];
        
        // Virada de Turno (Segunda-Feira)
        if (dataLoop.getDay() === 1 && turnoOpcao === "Ambos") {
            turnoMasterAtual = (turnoMasterAtual === "Dia") ? "Noite" : "Dia";
        }

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

        motoristasDisponiveis.slice(0, qtdViagens).forEach((mot, index) => {
            listaNovosTreinos.push({
                // A LINHA ABAIXO FOI COMENTADA PARA O SUPABASE GERAR O ID AUTOMATICAMENTE
                // id: `${mot.id}_${dataKey}_${index}`,
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

// ==================== GESTÃO E REALOCAÇÃO DE MASTER DRIVES ====================

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
    popularSelectMasterDrive(); // Atualiza todos os selects
};

window.removerMasterDrive = async function(nome) {
    if(!confirm(`Tem certeza que deseja apagar o instrutor ${nome}?`)) return;
    await db.deleteInstrutor(nome);
    await carregarDadosTreinamento();
    renderizarListaMasterDrives();
    popularSelectMasterDrive(); // Atualiza todos os selects
};

// NOVA FUNÇÃO: Realocar Treinamentos de um Master para Outro
window.realocarTreinamentosMaster = async function() {
    const deMaster = document.getElementById('realocarDe').value;
    const paraMaster = document.getElementById('realocarPara').value;

    if (!deMaster || !paraMaster) {
        alert("Selecione os dois Master Drives para realizar a transferência.");
        return;
    }
    
    if (deMaster === paraMaster) {
        alert("O Master de origem e destino não podem ser a mesma pessoa.");
        return;
    }

    if (!confirm(`Confirma a transferência de TODOS os treinamentos agendados de "${deMaster}" para "${paraMaster}"?`)) return;

    let alterados = 0;
    
    // Procura na lista local e manda atualizar no BD
    for (let t of treinamentos) {
        if (t.master_drive === deMaster) {
            t.master_drive = paraMaster;
            await db.upsertTreinamento(t); // Atualiza no banco
            alterados++;
        }
    }

    alert(`Transferência concluída! ${alterados} viagens foram transferidas para ${paraMaster}.`);
    
    // Atualiza a tela
    await carregarDadosTreinamento();
    window.renderizarPaginaTreinamento();
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

// NOVA FUNÇÃO: Exportar / Imprimir PDF
window.exportarTreinamentosPDF = function() {
    if (treinamentos.length === 0) {
        alert("Não há treinamentos agendados para gerar relatório.");
        return;
    }

    // Ordena os treinamentos por data
    const ordenados = [...treinamentos].sort((a, b) => new Date(a.data) - new Date(b.data));

    // Monta a estrutura do HTML para impressão
    let html = `
        <html>
        <head>
            <title>Cronograma de Viagem Assistida</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
                h2 { margin: 0; color: #1e293b; }
                p { margin: 5px 0; color: #64748b; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
                .status-concluido { color: #10b981; font-weight: bold; }
                .status-pendente { color: #f59e0b; font-weight: bold; }
                .status-agendado { color: #3b82f6; font-weight: bold; }
                @media print {
                    @page { margin: 1cm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Cronograma de Viagem Assistida - Master Drive</h2>
                <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Motorista</th>
                        <th>Equipe</th>
                        <th>Master Drive</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Preenche as linhas da tabela
    ordenados.forEach(t => {
        let classStatus = "";
        if (t.status === 'Concluído') classStatus = "status-concluido";
        else if (t.status === 'Pendente') classStatus = "status-pendente";
        else classStatus = "status-agendado";

        html += `
            <tr>
                <td>${t.data.split('-').reverse().join('/')}</td>
                <td>${t.horario}</td>
                <td style="font-weight: bold;">${t.motorista_nome}</td>
                <td>${t.equipe || '-'}</td>
                <td>${t.master_drive}</td>
                <td class="${classStatus}">${t.status}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <script>
                window.onload = function() { 
                    window.print(); 
                    // Fecha a aba de impressão logo depois
                    setTimeout(() => window.close(), 500);
                }
            </script>
        </body>
        </html>
    `;

    // Abre uma nova janela e injeta o HTML preparado
    let printWindow = window.open('', '_blank', 'width=1000,height=800');
    printWindow.document.write(html);
    printWindow.document.close();
};
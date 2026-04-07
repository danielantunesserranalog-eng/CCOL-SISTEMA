// ==================== MÓDULO: TREINAMENTO VIAGEM ASSISTIDA ====================

// Função inteligente que identifica 1, 2, 3 ou mais viagens no texto
function getViagensNecessarias(str) {
    if (!str) return 1;
    let nums = str.match(/\d+/g);
    if (nums && nums.length > 0) {
        let max = Math.max(...nums.map(Number));
        return max > 0 ? max : 1;
    }
    return 1;
}

const listaViagemAssistida = [
    { nome: "JOSÉ FERREIRA DE OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "BENILTON SANTOS DE OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ALEONILSON CAMPOS DE OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "VERGESON VIEIRA MARTINS", class: "C", viagens: "1 VIAGEM" },
    { nome: "ADENILSON BISPO MOREIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "RONIVALDO ARAUJO PESSOA", class: "E", viagens: "1 VIAGEM VAZIO 2 VIAGENS" },
    { nome: "JULIÃO LIRA DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ALFREDO LIMA FELIX", class: "C", viagens: "1 VIAGEM" },
    { nome: "RENATO JOSE ZATTA", class: "C", viagens: "1 VIAGEM" },
    { nome: "DOMINGOS DIAS DE SOUZA GAMA", class: "C", viagens: "1 VIAGEM" },
    { nome: "AILTON JESUS CHAVES", class: "N/A", viagens: "1 VIAGEM" },
    { nome: "ALEXSANDRO BITA SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "ANGELO MAXIMO GALVÃO DA SILVA", class: "D", viagens: "2 VIAGENS" },
    { nome: "ANTONIO GINELI CORREIA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ANTONIO SANTANA OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "CLAUDINEI DAS NEVES VIEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "DANIEL DA SILVA TAVARES", class: "C", viagens: "1 VIAGEM" },
    { nome: "DARIO GOMES DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "DIEGO DE ALMEIDA FERREIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "DINEI RODRIGUES CACIQUE", class: "C", viagens: "1 VIAGEM" },
    { nome: "EDIMAR SOARES LIMA", class: "C", viagens: "1 VIAGEM" },
    { nome: "EDIMILSON URSULINO", class: "D", viagens: "2 VIAGENS" },
    { nome: "ELIESER RIBEIRO MOREIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ERICSSON RIBEIRO SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "EVISON FIGUEREDO CHAGAS", class: "C", viagens: "1 VIAGEM" },
    { nome: "FABIO MAGALHAES ROSA", class: "C", viagens: "1 VIAGEM" },
    { nome: "FABIO SILVA GIL", class: "C", viagens: "1 VIAGEM" },
    { nome: "FABRICIO LEITE PRATE", class: "C", viagens: "1 VIAGEM" },
    { nome: "FERNANDO OLIVEIRA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "FRANCISCO IRANILDO DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "GILMAR SANTOS COSTA", class: "C", viagens: "1 VIAGEM" },
    { nome: "GILVAN NOGUEIRA DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOÃO DE JESUS DOS SANTOS", class: "D", viagens: "2 VIAGENS" },
    { nome: "JOAO MARCOS NOVAES", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOAO PAULO VITORIA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOMAR SANTOS SOUZA", class: "C", viagens: "1 VIAGEM" },
    { nome: "JONAS DE JESUS DE ALENCAR SOUTO", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSE GILBERTO PEREIRA DO NASCIMENTO", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSE LUCAS DO NASCIMENTO NETO", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSÉ LUCIO LEITE VILLAS BOAS", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSÉ CARLOS DE JESUS", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSEMAR SANTOS SOUZA", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSIVAN DA CONCEICAO LUIZ", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOSUE AMARO DE OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "LEANDRO BARBOSA DE JESUS", class: "C", viagens: "1 VIAGEM" },
    { nome: "LEANDRO SOUZA DE JESUS", class: "C", viagens: "1 VIAGEM" },
    { nome: "LEOGIDIO MATIAS DOS SANTOS", class: "D", viagens: "2 VIAGENS" },
    { nome: "LIDIOMAR DA CONCEICAO FIGUEIREDO", class: "C", viagens: "1 VIAGEM" },
    { nome: "LINDEMBERG MARTINS PEREIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "LUAN PEREIRA DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "MARCELO MIRANDA BARBOSA", class: "C", viagens: "1 VIAGEM" },
    { nome: "MARCIO FABIANE SIMOES", class: "C", viagens: "1 VIAGEM" },
    { nome: "MARCOS MESSIAS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "NELSON FELIPE DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "NIVALDO CARDOSO ROCHA", class: "C", viagens: "1 VIAGEM" },
    { nome: "RAFAEL SILVA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "RAMON GRAMA FONSECA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ROBSON EVANGELISTA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "RONALDO URSULINO SANTANA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ROSICLEI SOUZA DE JESUS", class: "C", viagens: "1 VIAGEM" },
    { nome: "THIAGO SANTOS NOBERTO", class: "C", viagens: "1 VIAGEM" },
    { nome: "VAGNER COSTA MOREIRA", class: "D", viagens: "2 VIAGENS" },
    { nome: "VAGNO DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "VALDEIR SOUZA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "VALDIR CONCEICAO SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "WALLACE VON DO RON", class: "C", viagens: "1 VIAGEM" },
    { nome: "VANDO DOS SANTOS BATISTA", class: "C", viagens: "1 VIAGEM" },
    { nome: "WEDIS ALVES EVANGELISTA", class: "C", viagens: "1 VIAGEM" },
    { nome: "WERCLES LIMA SOARES", class: "C", viagens: "1 VIAGEM" },
    { nome: "AMARILDO RODRIGUES DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "ANTÔNIO MARCELO MERILHO", class: "C", viagens: "1 VIAGEM" },
    { nome: "CLEITON SANTOS DA CRUZ", class: "C", viagens: "1 VIAGEM" },
    { nome: "ADENILTON BATISTA OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "DIONES DE SOUZA NEVES", class: "C", viagens: "1 VIAGEM" },
    { nome: "ALEX SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "GENILSON MANUEL SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "AUDIONE RIBEIRO SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "JOÃO ROCHA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "BERNARDO DA CONCEIÇÃO GONÇALVES", class: "C", viagens: "1 VIAGEM" },
    { nome: "EDIVINO JOSÉ CARDOSO DE OLIVEIRA", class: "C", viagens: "1 VIAGEM" },
    { nome: "MAGNO CARVALHO DO LIVRAMENTO", class: "C", viagens: "1 VIAGEM" },
    { nome: "MAXSANDRO PEREIRA DOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "RENAN FELIX SABARA", class: "C", viagens: "1 VIAGEM" },
    { nome: "ROGERIO DOS ANJOS SANTOS", class: "C", viagens: "1 VIAGEM" },
    { nome: "MARCELINO FERNANDES RODRIGUES", class: "D", viagens: "2 VIAGENS" },
    { nome: "SILVANO ALVES DA SILVA", class: "C", viagens: "1 VIAGEM" },
    { nome: "OSVALDO NASCIMENTO DOS SANTOS NETO", class: "C", viagens: "1 VIAGEM" },
    { nome: "WERLEN DUTRA FARIAS", class: "C", viagens: "1 VIAGEM" }
];

let instrutoresMaster = [];
let cronogramaTreinamento = [];
let treinamentosConcluidos = [];

const strNormalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : '';

// === FUNÇÃO DO DASHBOARD ===
window.atualizarDashboardTreinamentos = function() {
    const concluidos = treinamentosConcluidos ? treinamentosConcluidos.length : 0;
    const agendados = cronogramaTreinamento ? cronogramaTreinamento.length : 0;
    
    let pendentes = 0;
    if (typeof listaViagemAssistida !== 'undefined') {
        const alunosPendentesList = listaViagemAssistida.filter(req => {
            let necessarias = getViagensNecessarias(req.viagens);
            let realizadas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(req.nome)).length;
            let agendadosLista = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(req.nome)).length;
            return (realizadas + agendadosLista) < necessarias;
        });
        pendentes = alunosPendentesList.length;
    }

    const elConcluidos = document.getElementById('dashConcluidos');
    const elAgendados = document.getElementById('dashAgendados');
    const elPendentes = document.getElementById('dashPendentes');

    if(elConcluidos) elConcluidos.innerText = concluidos;
    if(elAgendados) elAgendados.innerText = agendados;
    if(elPendentes) elPendentes.innerText = pendentes;
};

window.carregarDadosTreinamento = async function() {
    try {
        const instDb = await db.getInstrutores();
        instrutoresMaster = instDb.map(i => i.nome);

        const treinosDb = await db.getTreinamentos();
        cronogramaTreinamento = treinosDb.filter(t => t.status === 'agendado');
        treinamentosConcluidos = treinosDb.filter(t => t.status === 'concluido');
        
        renderizarInstrutores();
        renderizarCronogramaTreinamento();
    } catch(e) {
        console.error("Erro ao carregar treinamentos do DB:", e);
    }
}

function renderizarInstrutores() {
    const lista = document.getElementById('listaInstrutores');
    const selectInstrutor = document.getElementById('treinamentoInstrutor');
    if (!lista) return;
    
    if(instrutoresMaster.length === 0) {
        lista.innerHTML = '<p style="font-size: 0.85rem; color: #ef4444;">Nenhum instrutor cadastrado no banco.</p>';
        if (selectInstrutor) selectInstrutor.innerHTML = '<option value="">Cadastre um instrutor primeiro</option>';
        return;
    }

    lista.innerHTML = instrutoresMaster.map((inst, index) => `
        <li style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px solid var(--border-dim); align-items: center;">
            <span style="font-weight: 600; color: var(--text-primary);">👨‍🏫 ${inst}</span>
            <button onclick="removerInstrutor(${index})" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size: 1.1rem;" title="Remover Instrutor">🗑️</button>
        </li>
    `).join('');

    if (selectInstrutor) {
        const valorAtual = selectInstrutor.value;
        selectInstrutor.innerHTML = '<option value="">Selecione o instrutor...</option>' +
            instrutoresMaster.map(inst => `<option value="${inst}">${inst}</option>`).join('');
        if (instrutoresMaster.includes(valorAtual)) selectInstrutor.value = valorAtual;
    }
}

window.adicionarInstrutor = async function() {
    const input = document.getElementById('novoInstrutorNome');
    const nome = input.value.trim();
    if (nome) {
        instrutoresMaster.push(nome);
        await db.addInstrutor({ nome: nome }); 
        input.value = '';
        renderizarInstrutores();
    }
}

window.removerInstrutor = async function(index) {
    if(currentUser && currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem excluir instrutores.'); return; }
    if(confirm("Remover este instrutor?")) {
        const nomeParaRemover = instrutoresMaster[index];
        instrutoresMaster.splice(index, 1);
        await db.deleteInstrutor(nomeParaRemover); 
        
        await db.addLog('Exclusão de Instrutor', `O Instrutor ${nomeParaRemover} foi removido do sistema.`);
        if(typeof renderizarLogs === 'function') renderizarLogs();
        
        renderizarInstrutores();
    }
}

window.renderizarCronogramaTreinamento = function() {
    renderizarInstrutores(); 
    
    const tbody = document.getElementById('tabelaTreinamentos');
    const tbodyConcluidos = document.getElementById('tabelaConcluidos');
    const tbodyPendentes = document.getElementById('tabelaPendentes'); 
    if (!tbody || !tbodyConcluidos || !tbodyPendentes) return;

    if (cronogramaTreinamento.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 30px; text-align: center; color: var(--text-secondary);">Nenhum treinamento agendado no momento.</td></tr>';
    } else {
        cronogramaTreinamento.sort((a, b) => a.data.localeCompare(b.data));
        tbody.innerHTML = cronogramaTreinamento.map(t => `
            <tr style="background-color: rgba(255,255,255,0.02);">
                <td><strong style="font-size: 1.05rem;">${t.dataTexto}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${t.data} - ${t.turno}</span></td>
                <td style="color: var(--ccol-blue-bright); font-size: 0.95rem;"><strong>${t.instrutor}</strong></td>
                <td style="color: var(--text-primary); font-size: 0.95rem;"><strong>${t.motoristaNome}</strong></td>
                <td><span style="background: rgba(251, 146, 60, 0.1); color: var(--ccol-rust-bright); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">Class: ${t.classificacao} | ${t.viagens}</span></td>
                <td>
                    <button onclick="concluirTreinamento('${t.id}')" style="background: var(--ccol-green-bright); border: none; color:#000; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:bold; margin-right: 5px;">✅ Concluir</button>
                    <button onclick="removerTreinamento('${t.id}')" style="background:transparent; border: 1px solid #ef4444; color:#ef4444; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:bold;">❌</button>
                </td>
            </tr>
        `).join('');
    }

    let alunosPendentes = listaViagemAssistida.filter(req => {
        let necessarias = getViagensNecessarias(req.viagens);
        let realizadas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(req.nome)).length;
        let agendadas = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(req.nome)).length;
        return (realizadas + agendadas) < necessarias;
    });

    if (alunosPendentes.length === 0) {
        tbodyPendentes.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--ccol-green-bright);">Todos os motoristas da lista já foram agendados ou concluídos! 🎉</td></tr>';
    } else {
        tbodyPendentes.innerHTML = alunosPendentes.map(p => {
            let necessarias = getViagensNecessarias(p.viagens);
            let realizadas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(p.nome)).length;
            let agendadas = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(p.nome)).length;
            let faltando = necessarias - (realizadas + agendadas);

            return `
            <tr style="background-color: rgba(251, 146, 60, 0.05);">
                <td style="color: var(--text-primary); font-size: 0.95rem;"><strong>${p.nome}</strong></td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">${p.class}</span></td>
                <td style="font-size: 0.9rem;">Falta: ${faltando} de ${necessarias} Viagem(ns)</td>
                <td><span style="background: #fb923c; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">PENDENTE</span></td>
            </tr>
        `}).join('');
    }

    if (treinamentosConcluidos.length === 0) {
        tbodyConcluidos.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhum treinamento concluído.</td></tr>';
    } else {
        treinamentosConcluidos.sort((a, b) => new Date(b.dataConclusao) - new Date(a.dataConclusao));
        tbodyConcluidos.innerHTML = treinamentosConcluidos.map(t => {
            const dataFormatada = new Date(t.dataConclusao).toLocaleDateString('pt-BR');
            return `
            <tr style="background-color: rgba(61, 220, 132, 0.05);">
                <td><strong style="color: var(--ccol-green-bright);">${dataFormatada}</strong></td>
                <td><strong>${t.motoristaNome}</strong></td>
                <td>Classificação: ${t.classificacao}</td>
                <td style="color: var(--text-secondary);">${t.instrutor}</td>
                <td><span style="background: #3ddc84; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">CONCLUÍDO</span></td>
            </tr>
        `}).join('');
    }

    // Atualiza os painéis numéricos do Dashboard
    if(typeof window.atualizarDashboardTreinamentos === 'function') {
        window.atualizarDashboardTreinamentos();
    }
}

window.removerTreinamento = async function(id) {
    if(currentUser && currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem excluir agendamentos.'); return; }
    if(confirm("Deseja cancelar e EXCLUIR este treinamento?")) {
        const treinoCancelado = cronogramaTreinamento.find(t => t.id == id);
        cronogramaTreinamento = cronogramaTreinamento.filter(t => t.id != id);
        
        await db.deleteTreinamento(id); 
        
        if (treinoCancelado) {
            await db.addLog('Exclusão de Treinamento', `Agendamento de ${treinoCancelado.motoristaNome} com Instrutor ${treinoCancelado.instrutor} foi cancelado.`);
            if(typeof renderizarLogs === 'function') renderizarLogs();
        }

        renderizarCronogramaTreinamento();
        if(typeof window.renderizarEscala === 'function') window.renderizarEscala();
    }
}

window.concluirTreinamento = async function(id) {
    if(confirm("Confirmar que este motorista CONCLUIU o treinamento de Viagem Assistida?")) {
        const treinamento = cronogramaTreinamento.find(t => t.id == id);
        if (treinamento) {
            cronogramaTreinamento = cronogramaTreinamento.filter(t => t.id != id);
            treinamento.dataConclusao = new Date().toISOString();
            treinamento.status = 'concluido';
            treinamentosConcluidos.push(treinamento);
            
            await db.upsertTreinamento(treinamento); 
            
            renderizarCronogramaTreinamento();
            if(typeof window.renderizarEscala === 'function') window.renderizarEscala();
        }
    }
}

window.gerarTreinamentoAuto = async function() {
    if(instrutoresMaster.length === 0) { alert('⚠️ Adicione um Instrutor Master Drive primeiro!'); return; }
    
    const dataInicioInput = document.getElementById('treinamentoDataInicio').value;
    const instrutorSelecionado = document.getElementById('treinamentoInstrutor').value;
    const turnoSelecionado = document.getElementById('treinamentoTurno').value;
    const checkboxDiasUteis = document.getElementById('apenasDiasUteis');
    const apenasDiasUteis = checkboxDiasUteis ? checkboxDiasUteis.checked : true;

    if(!dataInicioInput) { alert('⚠️ Selecione a Data de Início para agendar o treinamento!'); return; }
    if(!instrutorSelecionado) { alert('⚠️ Selecione qual Instrutor aplicará o treinamento!'); return; }
    
    let alunosPendentes = listaViagemAssistida.filter(req => {
        let necessarias = getViagensNecessarias(req.viagens);
        let realizadas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(req.nome)).length;
        let agendadas = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(req.nome)).length;
        return (realizadas + agendadas) < necessarias;
    });

    if(alunosPendentes.length === 0) { alert('✅ Todos os motoristas da Lista do PDF já foram agendados ou concluídos!'); return; }

    if(!confirm(`Deseja gerar o cronograma automaticamente para TODOS os motoristas pendentes a partir do dia ${dataInicioInput.split('-').reverse().join('/')}?`)) {
        return; 
    }

    const dataBase = new Date(dataInicioInput + 'T00:00:00');
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let dataAtual = new Date(dataBase);
    let agendamentosNovos = 0;
    
    let diasSemAgendarNinguem = 0; 

    let totalViagensFaltantes = 0;
    alunosPendentes.forEach(p => {
        let necessarias = getViagensNecessarias(p.viagens);
        let realizadas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(p.nome)).length;
        let agendadas = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(p.nome)).length;
        totalViagensFaltantes += (necessarias - (realizadas + agendadas));
    });

    let limiteSeguranca = 0;
    while(totalViagensFaltantes > 0 && limiteSeguranca < 3000) {
        let diaSemana = dataAtual.getDay();
        
        if (apenasDiasUteis && (diaSemana === 0 || diaSemana === 6)) {
            dataAtual.setDate(dataAtual.getDate() + 1);
            continue; 
        }

        const dataStr = dataAtual.toISOString().split('T')[0];
        const diaTexto = diasSemana[diaSemana];
        const diaNum = `${String(dataAtual.getDate()).padStart(2, '0')}/${String(dataAtual.getMonth()+1).padStart(2, '0')}`;
        
        let alunoEscolhido = null, infoPDF = null;
        
        let instrutorOcupadoHoje = cronogramaTreinamento.some(t => t.data === dataStr && t.instrutor === instrutorSelecionado && t.status === 'agendado');

        if (!instrutorOcupadoHoje) {
            for(let i = 0; i < alunosPendentes.length; i++) {
                let reqPDF = alunosPendentes[i];
                
                let jaAgendadoHoje = cronogramaTreinamento.some(t => t.data === dataStr && strNormalize(t.motoristaNome) === strNormalize(reqPDF.nome));
                if (jaAgendadoHoje) continue; 

                let motSistema = typeof motoristas !== 'undefined' ? motoristas.find(m => strNormalize(m.nome) === strNormalize(reqPDF.nome) || strNormalize(m.nome).includes(strNormalize(reqPDF.nome)) || strNormalize(reqPDF.nome).includes(strNormalize(m.nome))) : null;
                
                let isElegivel = true;

                if (motSistema) {
                    const equipeMot = motSistema.equipe || '-';
                    const isDia = ['A', 'B', 'C'].includes(equipeMot);
                    const isNoite = ['D', 'E', 'F'].includes(equipeMot);

                    let escalaDia = window.getEscalaDiaComputada ? window.getEscalaDiaComputada(motSistema, dataStr) : null;
                    if(escalaDia && (escalaDia.caminhao === 'F' || escalaDia.caminhao === 'FOLGA')) {
                        isElegivel = false;
                    }

                    if (isElegivel && diasSemAgendarNinguem < 5) {
                        if (turnoSelecionado === 'Dia' && !isDia) isElegivel = false;
                        if (turnoSelecionado === 'Noite' && !isNoite) isElegivel = false;
                    }
                } else {
                    if (turnoSelecionado !== 'Todos' && diasSemAgendarNinguem < 3) {
                        isElegivel = false;
                    }
                }

                if(isElegivel) {
                    alunoEscolhido = motSistema; 
                    infoPDF = reqPDF; 
                    break; 
                }
            }
        }
        
        if(infoPDF) {
            const novoTreino = {
                id: Date.now() + Math.floor(Math.random() * 100000), 
                data: dataStr, 
                dataTexto: diaNum,
                instrutor: instrutorSelecionado, 
                motoristaId: alunoEscolhido ? alunoEscolhido.id : null, 
                motoristaNome: infoPDF.nome,
                classificacao: infoPDF.class, 
                viagens: infoPDF.viagens, 
                turno: alunoEscolhido ? (alunoEscolhido.turno || 'Misto') : 'Misto',
                status: 'agendado', 
                dataConclusao: null
            };
            
            cronogramaTreinamento.push(novoTreino);
            try {
                await db.upsertTreinamento(novoTreino);
            } catch(dbErr) {
                console.error("Aviso ao salvar no BD, mas mantido local:", dbErr);
            }

            let necessarias = getViagensNecessarias(infoPDF.viagens);
            let feitas = treinamentosConcluidos.filter(c => strNormalize(c.motoristaNome) === strNormalize(infoPDF.nome)).length;
            let marcadas = cronogramaTreinamento.filter(a => strNormalize(a.motoristaNome) === strNormalize(infoPDF.nome)).length;
            
            if ((feitas + marcadas) >= necessarias) {
                alunosPendentes = alunosPendentes.filter(p => strNormalize(p.nome) !== strNormalize(infoPDF.nome));
            }

            agendamentosNovos++;
            totalViagensFaltantes--;
            diasSemAgendarNinguem = 0; 
        } else {
            diasSemAgendarNinguem++;
        }

        dataAtual.setDate(dataAtual.getDate() + 1); 
        limiteSeguranca++;
    }
    
    renderizarCronogramaTreinamento();
    if(typeof window.renderizarEscala === 'function') window.renderizarEscala(); 
    
    if (agendamentosNovos > 0) {
        alert(`🎉 SUCESSO TOTAL! A lista foi esgotada.\nForam criados ${agendamentosNovos} novos agendamentos com o Instrutor ${instrutorSelecionado}.`);
    } else {
        alert(`⚠️ Nenhum agendamento foi feito. O Instrutor pode estar ocupado.`);
    }
}

window.exportarCronogramaExcel = function() {
    if (cronogramaTreinamento.length === 0) {
        alert("⚠️ Não há treinamentos agendados para exportar!");
        return;
    }

    let agendados = [...cronogramaTreinamento].sort((a, b) => a.data.localeCompare(b.data));
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "Data Prevista;Instrutor;Motorista;Classificacao;Situacao de Viagens\n";

    agendados.forEach(t => {
        let dataPt = t.data.split('-').reverse().join('/');
        let dataCompleta = `${dataPt} (${t.dataTexto})`;
        csvContent += `"${dataCompleta}";"${t.instrutor}";"${t.motoristaNome}";"${t.classificacao}";"${t.viagens}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Cronograma_Viagem_Assistida.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.imprimirCronogramaPDF = function() {
    if (cronogramaTreinamento.length === 0) {
        alert("⚠️ Não há treinamentos agendados para imprimir!");
        return;
    }

    let janela = window.open('', '', 'width=900,height=700');
    let agendados = [...cronogramaTreinamento].sort((a, b) => a.data.localeCompare(b.data));

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cronograma: Viagem Assistida</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                h2 { text-align: center; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                th { background-color: #f1f5f9; color: #0f172a; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
            </style>
        </head>
        <body>
            <h2>Relatório de Cronograma: Viagem Assistida</h2>
            <table>
                <thead>
                    <tr>
                        <th>Data Agendada</th>
                        <th>Instrutor</th>
                        <th>Motorista</th>
                        <th>Classificação</th>
                        <th>Situação de Viagens</th>
                    </tr>
                </thead>
                <tbody>
    `;

    agendados.forEach(t => {
        let dataPt = t.data.split('-').reverse().join('/');
        html += `
            <tr>
                <td><strong>${dataPt}</strong> (${t.dataTexto})</td>
                <td>${t.instrutor}</td>
                <td><strong>${t.motoristaNome}</strong></td>
                <td>${t.classificacao}</td>
                <td>${t.viagens}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div class="footer">Gerado pelo CCOL - Controle Operacional e Logístico em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    janela.document.write(html);
    janela.document.close();
}
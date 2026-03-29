// ==================== MÓDULO: TREINAMENTO MASTER DRIVE (VIA BANCO DE DADOS) ====================

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

window.carregarDadosTreinamento = async function() {
    try {
        const instDb = await db.getInstrutores();
        instrutoresMaster = instDb.map(i => i.nome);

        const treinosDb = await db.getTreinamentos();
        cronogramaTreinamento = treinosDb.filter(t => t.status === 'agendado');
        treinamentosConcluidos = treinosDb.filter(t => t.status === 'concluido');
        
        renderizarInstrutores();
        renderizarCronogramaTreinamento();
        if(typeof renderizarEscala === 'function') renderizarEscala();
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
        if (instrutoresMaster.includes(valorAtual)) {
            selectInstrutor.value = valorAtual;
        }
    }
}

window.adicionarInstrutor = function() {
    const input = document.getElementById('novoInstrutorNome');
    const nome = input.value.trim();
    if (nome) {
        instrutoresMaster.push(nome);
        db.addInstrutor({ nome: nome }); 
        input.value = '';
        renderizarInstrutores();
    }
}

window.removerInstrutor = function(index) {
    if(confirm("Remover este instrutor?")) {
        const nomeParaRemover = instrutoresMaster[index];
        instrutoresMaster.splice(index, 1);
        db.deleteInstrutor(nomeParaRemover); 
        renderizarInstrutores();
    }
}

window.renderizarCronogramaTreinamento = function() {
    renderizarInstrutores(); 
    
    const tbody = document.getElementById('tabelaTreinamentos');
    const tbodyConcluidos = document.getElementById('tabelaConcluidos');
    if (!tbody || !tbodyConcluidos) return;

    if (cronogramaTreinamento.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 30px; text-align: center; color: var(--text-secondary);">Nenhum treinamento pendente ou agendado no momento.</td></tr>';
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

    if (treinamentosConcluidos.length === 0) {
        tbodyConcluidos.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhum treinamento foi marcado como concluído ainda.</td></tr>';
    } else {
        treinamentosConcluidos.sort((a, b) => new Date(b.dataConclusao) - new Date(a.dataConclusao));

        tbodyConcluidos.innerHTML = treinamentosConcluidos.map(t => {
            const dt = new Date(t.dataConclusao);
            const dataFormatada = dt.toLocaleDateString('pt-BR');
            
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
}

window.removerTreinamento = function(id) {
    if(confirm("Deseja cancelar o agendamento deste treinamento?")) {
        cronogramaTreinamento = cronogramaTreinamento.filter(t => t.id !== id);
        db.deleteTreinamento(id); 
        renderizarCronogramaTreinamento();
        if(typeof renderizarEscala === 'function') renderizarEscala();
    }
}

window.concluirTreinamento = function(id) {
    if(confirm("Confirmar que este motorista CONCLUIU o treinamento de Viagem Assistida?")) {
        const treinamento = cronogramaTreinamento.find(t => t.id === id);
        if (treinamento) {
            cronogramaTreinamento = cronogramaTreinamento.filter(t => t.id !== id);
            
            treinamento.dataConclusao = new Date().toISOString();
            treinamento.status = 'concluido';
            
            treinamentosConcluidos.push(treinamento);
            db.upsertTreinamento(treinamento); 
            
            renderizarCronogramaTreinamento();
            if(typeof renderizarEscala === 'function') renderizarEscala();
        }
    }
}

window.gerarTreinamentoAuto = function() {
    if(instrutoresMaster.length === 0) { 
        alert('⚠️ Adicione pelo menos um Instrutor Master Drive no painel ao lado primeiro!'); 
        return; 
    }

    const dataInicioInput = document.getElementById('treinamentoDataInicio').value;
    const instrutorSelecionado = document.getElementById('treinamentoInstrutor').value;
    const turnoSelecionado = document.getElementById('treinamentoTurno').value;

    if(!dataInicioInput) {
        alert('⚠️ Selecione a Data de Início para agendar o treinamento!');
        return;
    }

    if(!instrutorSelecionado) {
        alert('⚠️ Selecione qual Instrutor aplicará o treinamento!');
        return;
    }
    
    // Gera 7 dias a partir da data de início escolhida pelo usuário
    const dias = [];
    const dataBase = new Date(dataInicioInput + 'T00:00:00');
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 0; i < 7; i++) {
        const data = new Date(dataBase);
        data.setDate(dataBase.getDate() + i);
        const dataStr = data.toISOString().split('T')[0];
        dias.push({
            dateKey: dataStr,
            diaTexto: diasSemana[data.getDay()],
            diaNum: `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth()+1).padStart(2, '0')}`
        });
    }
    
    let alunosPendentes = listaViagemAssistida.filter(req => {
        const jaConcluido = treinamentosConcluidos.some(c => strNormalize(c.motoristaNome) === strNormalize(req.nome));
        const jaAgendado = cronogramaTreinamento.some(a => strNormalize(a.motoristaNome) === strNormalize(req.nome));
        return !jaConcluido && !jaAgendado;
    });

    if(alunosPendentes.length === 0) {
        alert('✅ Todos os motoristas da Lista do PDF já foram agendados ou concluídos!');
        return;
    }

    let msgConfirm = `Existem ${alunosPendentes.length} motoristas aguardando agendamento.\n\nDeseja distribuir para o instrutor ${instrutorSelecionado} a partir do dia ${dias[0].diaNum}?`;
    if (turnoSelecionado !== 'Todos') {
        msgConfirm += `\n(Aplicando filtro para agendar apenas quem é do turno do ${turnoSelecionado})`;
    }
    
    if(!confirm(msgConfirm)) return;

    let agendamentosNovos = 0;

    dias.forEach(dia => {
        let alunoEscolhido = null;
        let infoPDF = null;
        
        for(let i = 0; i < alunosPendentes.length; i++) {
            let reqPDF = alunosPendentes[i];
            let motSistema = motoristas.find(m => strNormalize(m.nome).includes(strNormalize(reqPDF.nome)) || strNormalize(reqPDF.nome).includes(strNormalize(m.nome)));
            
            if (motSistema) {
                // VERIFICAÇÃO DO TURNO BASEADO NA EQUIPE
                const equipeMot = motSistema.equipe || '-';
                const isDia = ['A', 'B', 'C'].includes(equipeMot);
                const isNoite = ['D', 'E', 'F'].includes(equipeMot);

                if (turnoSelecionado === 'Dia' && !isDia) continue;
                if (turnoSelecionado === 'Noite' && !isNoite) continue;

                let escalaDia = window.getEscalaDiaComputada(motSistema, dia.dateKey);
                if(escalaDia && escalaDia.caminhao !== 'F') {
                    // Verifica se o instrutor selecionado já está ocupado neste dia
                    const instrutorOcupado = cronogramaTreinamento.some(t => t.data === dia.dateKey && t.instrutor === instrutorSelecionado && t.status === 'agendado');
                    
                    if (!instrutorOcupado) {
                        alunoEscolhido = motSistema;
                        infoPDF = reqPDF;
                        break;
                    }
                }
            }
        }
        
        if(alunoEscolhido && infoPDF) {
            const novoTreino = {
                id: Date.now().toString() + Math.random().toString(),
                data: dia.dateKey,
                dataTexto: dia.diaNum,
                instrutor: instrutorSelecionado, 
                motoristaId: alunoEscolhido.id,
                motoristaNome: infoPDF.nome,
                classificacao: infoPDF.class,
                viagens: infoPDF.viagens,
                turno: alunoEscolhido.turno || 'Misto',
                status: 'agendado',
                dataConclusao: null
            };

            cronogramaTreinamento.push(novoTreino);
            db.upsertTreinamento(novoTreino); 
            
            alunosPendentes = alunosPendentes.filter(p => strNormalize(p.nome) !== strNormalize(infoPDF.nome));
            agendamentosNovos++;
        }
    });
    
    renderizarCronogramaTreinamento();
    if(typeof renderizarEscala === 'function') renderizarEscala(); 
    
    if (agendamentosNovos > 0) {
        alert(`🎉 Sucesso! Foram agendados e salvos no banco ${agendamentosNovos} novos treinamentos com o Instrutor ${instrutorSelecionado}.`);
    } else {
        alert(`⚠️ Nenhum agendamento foi feito. \nO Instrutor pode estar ocupado nesses dias ou os motoristas da lista não têm dias de trabalho agendados neste período/turno selecionado.`);
    }
}
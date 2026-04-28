// ==================== js/os_pequena.js ====================
// Módulo Exclusivo para Frota Pequena (Carros)

let ordensServicoPequena = [];
let frotasPequenas = [];
let osPequenaSelecionada = null;

// Carregar Dados Iniciais
async function carregarDadosOSPequena() {
    try {
        const { data: osData, error: osError } = await supabaseClient
            .from('ordens_servico_pequena')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!osError && osData) ordensServicoPequena = osData;

        const { data: frotaData, error: frotaError } = await supabaseClient
            .from('frotas_pequenas')
            .select('*')
            .order('placa', { ascending: true });
            
        if (!frotaError && frotaData) frotasPequenas = frotaData;
    } catch (error) {
        console.error("Erro ao carregar dados Frota Pequena:", error);
    }
}

// Navegação entre as telas do menu
async function alternarTelaOSPequena(tela) {
    const telas = ['telaListaOSPequena', 'telaHistoricoOSPequena', 'telaNovaOSPequena', 'telaFrotaOSPequena'];
    telas.forEach(t => {
        const el = document.getElementById(t);
        if(el) el.style.display = 'none';
    });

    await carregarDadosOSPequena();

    if (tela === 'lista') {
        document.getElementById('telaListaOSPequena').style.display = 'block';
        renderizarTabelaOSPequena();
    } else if (tela === 'historico') {
        document.getElementById('telaHistoricoOSPequena').style.display = 'block';
        carregarFiltrosSelectOSPequena();
        renderizarTabelaHistoricoOSPequena();
    } else if (tela === 'nova') {
        document.getElementById('telaNovaOSPequena').style.display = 'block';
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('osPeqDataAbertura').value = now.toISOString().slice(0,16);
    } else if (tela === 'frota') {
        document.getElementById('telaFrotaOSPequena').style.display = 'block';
        renderizarTabelaFrotaPequena();
    }
}

// Renderizar Acompanhamento (Abertas)
function renderizarTabelaOSPequena() {
    const tbody = document.getElementById('tabelaAcompanhamentoOSPequena');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const termoBusca = (document.getElementById('searchOSPequena')?.value || '').toLowerCase();
    const abertas = ordensServicoPequena.filter(os => os.status === 'Aberta');

    abertas.forEach(os => {
        if (termoBusca && !os.placa.toLowerCase().includes(termoBusca) && !os.motorista.toLowerCase().includes(termoBusca)) return;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--ccol-blue-bright);">#${os.numero_os}</td>
            <td>${formatarDataHoraBrasilPeq(os.data_abertura)}</td>
            <td style="font-weight: bold;">${os.placa}</td>
            <td>${os.motorista}</td>
            <td>${os.tipo_servico}</td>
            <td><span style="background: #f59e0b; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Em Andamento</span></td>
            <td>
                <button class="btn-primary-green" onclick="abrirModalConclusaoOSPequena('${os.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Concluir</button>
                <button class="btn-danger-outline" onclick="excluirOSPequena('${os.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderizar Histórico (Todas)
function renderizarTabelaHistoricoOSPequena() {
    const tbody = document.getElementById('tabelaHistoricoOSPequena');
    if (!tbody) return;
    tbody.innerHTML = '';

    const numFilter = document.getElementById('filtroHistOSNumPeq').value;
    const placaFilter = document.getElementById('filtroHistPlacaPeq').value;
    const inicioFilter = document.getElementById('filtroHistDataInicioPeq').value;
    const fimFilter = document.getElementById('filtroHistDataFimPeq').value;

    ordensServicoPequena.forEach(os => {
        if (numFilter && os.numero_os.toString() !== numFilter) return;
        if (placaFilter && os.placa !== placaFilter) return;
        
        if (inicioFilter || fimFilter) {
            const dataOs = new Date(os.data_abertura).toISOString().split('T')[0];
            if (inicioFilter && dataOs < inicioFilter) return;
            if (fimFilter && dataOs > fimFilter) return;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--text-primary);">#${os.numero_os}</td>
            <td>${formatarDataHoraBrasilPeq(os.data_abertura)}</td>
            <td>${os.data_conclusao ? formatarDataHoraBrasilPeq(os.data_conclusao) : '-'}</td>
            <td style="font-weight: bold;">${os.placa}</td>
            <td>${os.motorista}</td>
            <td>${os.tipo_servico}</td>
            <td>
                ${os.status === 'Aberta' 
                    ? '<span style="color: #f59e0b; font-weight: bold;">Aberta</span>' 
                    : '<span style="color: var(--ccol-green-bright); font-weight: bold;">Concluída</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Nova O.S.
async function salvarNovaOSPequena() {
    const placa = document.getElementById('osPeqPlaca').value;
    const motorista = document.getElementById('osPeqMotorista').value;
    const data_abertura = document.getElementById('osPeqDataAbertura').value;
    const hodometro = document.getElementById('osPeqHodometro').value;
    const prioridade = document.getElementById('osPeqPrioridade').value;
    const tipo_servico = document.getElementById('osPeqTipo').value;
    const problema = document.getElementById('osPeqProblema').value;
    const obs = document.getElementById('osPeqObservacoes').value;

    if(!placa || !motorista || !data_abertura) {
        alert("Preencha Placa, Motorista e Data de Abertura!");
        return;
    }

    const novaOS = {
        placa, motorista, data_abertura,
        hodometro: hodometro ? parseInt(hodometro) : null,
        prioridade, tipo_servico,
        problema_relatado: problema,
        observacoes: obs,
        status: 'Aberta'
    };

    const { error } = await supabaseClient.from('ordens_servico_pequena').insert([novaOS]);
    
    if(error) {
        alert("Erro ao salvar O.S.: " + error.message);
    } else {
        alert("O.S. de Frota Pequena aberta com sucesso!");
        alternarTelaOSPequena('lista');
    }
}

// Cadastro Frota Pequena
async function salvarFrotaPequena() {
    const id = document.getElementById('osPeqFrotaId').value;
    const placa = document.getElementById('osPeqFrotaPlaca').value.toUpperCase();
    const marca_modelo = document.getElementById('osPeqFrotaModelo').value;
    const cor = document.getElementById('osPeqFrotaCor').value;

    if(!placa) {
        alert("A placa é obrigatória!");
        return;
    }

    const frota = { placa, marca_modelo, cor };

    if (id) {
        const { error } = await supabaseClient.from('frotas_pequenas').update(frota).eq('id', id);
        if(error) alert("Erro: " + error.message); else alert("Veículo atualizado!");
    } else {
        const { error } = await supabaseClient.from('frotas_pequenas').insert([frota]);
        if(error) alert("Erro: " + error.message); else alert("Veículo cadastrado!");
    }

    document.getElementById('osPeqFrotaId').value = '';
    document.getElementById('osPeqFrotaPlaca').value = '';
    document.getElementById('osPeqFrotaModelo').value = '';
    document.getElementById('osPeqFrotaCor').value = '';
    
    await carregarDadosOSPequena();
    renderizarTabelaFrotaPequena();
}

function renderizarTabelaFrotaPequena() {
    const tbody = document.getElementById('tabelaFrotaPequena');
    if (!tbody) return;
    tbody.innerHTML = '';

    frotasPequenas.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--ccol-blue-bright);">${f.placa}</td>
            <td>${f.marca_modelo || '-'}</td>
            <td>${f.cor || '-'}</td>
            <td>
                <button class="btn-primary-blue" onclick="editarFrotaPequena('${f.id}')" style="padding: 4px 8px; font-size: 0.8rem;">Editar</button>
                <button class="btn-danger-outline" onclick="excluirFrotaPequena('${f.id}')" style="padding: 4px 8px; font-size: 0.8rem;">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarFrotaPequena(id) {
    const frota = frotasPequenas.find(f => f.id === id);
    if(frota) {
        document.getElementById('osPeqFrotaId').value = frota.id;
        document.getElementById('osPeqFrotaPlaca').value = frota.placa;
        document.getElementById('osPeqFrotaModelo').value = frota.marca_modelo;
        document.getElementById('osPeqFrotaCor').value = frota.cor;
    }
}

async function excluirFrotaPequena(id) {
    if(confirm("Tem certeza que deseja excluir este veículo da Frota Pequena?")) {
        await supabaseClient.from('frotas_pequenas').delete().eq('id', id);
        await carregarDadosOSPequena();
        renderizarTabelaFrotaPequena();
    }
}

// Conclusão de O.S.
function abrirModalConclusaoOSPequena(id) {
    osPequenaSelecionada = id;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('horaConclusaoOSPequena').value = now.toISOString().slice(0,16);
    document.getElementById('modalConclusaoOSPequena').style.display = 'flex';
}

function fecharModalConclusaoOSPequena() {
    document.getElementById('modalConclusaoOSPequena').style.display = 'none';
    osPequenaSelecionada = null;
}

async function salvarConclusaoOSPequena() {
    const dataConclusao = document.getElementById('horaConclusaoOSPequena').value;
    if(!osPequenaSelecionada || !dataConclusao) return;

    const { error } = await supabaseClient
        .from('ordens_servico_pequena')
        .update({ status: 'Concluída', data_conclusao: dataConclusao })
        .eq('id', osPequenaSelecionada);

    if(error) {
        alert("Erro ao concluir O.S.: " + error.message);
    } else {
        fecharModalConclusaoOSPequena();
        await carregarDadosOSPequena();
        renderizarTabelaOSPequena();
    }
}

async function excluirOSPequena(id) {
    if(confirm("Deseja deletar esta O.S. permanentemente?")) {
        await supabaseClient.from('ordens_servico_pequena').delete().eq('id', id);
        await carregarDadosOSPequena();
        renderizarTabelaOSPequena();
    }
}

// Utilitários de Selects e Formatação
function carregarSelectCavalosOSPequena() {
    const select = document.getElementById('osPeqPlaca');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione o Veículo...</option>';
    frotasPequenas.forEach(f => {
        select.innerHTML += `<option value="${f.placa}">${f.placa} (${f.marca_modelo})</option>`;
    });
}

function carregarFiltrosSelectOSPequena() {
    const selectPlaca = document.getElementById('filtroHistPlacaPeq');
    if(!selectPlaca) return;
    
    selectPlaca.innerHTML = '<option value="">Todas as Placas</option>';
    const placasUnicas = [...new Set(ordensServicoPequena.map(os => os.placa))];
    placasUnicas.sort().forEach(placa => {
        selectPlaca.innerHTML += `<option value="${placa}">${placa}</option>`;
    });
}

async function carregarMotoristasSelectOSPequena() {
    const select = document.getElementById('osPeqMotorista');
    if(!select) return;
    try {
        const { data } = await supabaseClient.from('motoristas').select('nome').order('nome', { ascending: true });
        select.innerHTML = '<option value="">Selecione o motorista...</option>';
        if(data) {
            data.forEach(m => {
                select.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
            });
        }
    } catch(e) { console.error("Erro ao puxar motoristas", e); }
}

function formatarDataHoraBrasilPeq(dataString) {
    if (!dataString) return '-';
    const partes = dataString.split('T');
    const data = partes[0].split('-').reverse().join('/');
    return partes[1] ? `${data} ${partes[1].substring(0, 5)}` : data;
}
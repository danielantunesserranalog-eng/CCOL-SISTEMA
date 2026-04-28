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
        document.getElementById('osPeqMotorista').value = ''; 
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
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-start; align-items: center;">
                    <button class="btn-primary-green" onclick="abrirModalConclusaoOSPequena('${os.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Concluir</button>
                    <button class="btn-danger-outline" onclick="excluirOSPequena('${os.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Excluir</button>
                    <button class="btn-secondary-dark" onclick="imprimirOSPequena('${os.id}')" title="Imprimir O.S." style="padding: 5px 10px; font-size: 0.8rem;">🖨️</button>
                </div>
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
            <td>
                <div style="display: flex; gap: 5px; justify-content: flex-start;">
                    <button class="btn-secondary-dark" onclick="imprimirOSPequena('${os.id}')" title="Imprimir O.S." style="padding: 4px 8px; font-size: 0.8rem; border-radius: 4px;">🖨️</button>
                    <button class="btn-danger-outline" onclick="excluirOSPequena('${os.id}')" title="Excluir" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 4px;">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Nova O.S.
async function salvarNovaOSPequena() {
    const placa = document.getElementById('osPeqPlaca').value;
    const motorista = document.getElementById('osPeqMotorista').value.toUpperCase();
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

function formatarDataHoraBrasilPeq(dataString) {
    if (!dataString) return '-';
    const partes = dataString.split('T');
    const data = partes[0].split('-').reverse().join('/');
    return partes[1] ? `${data} ${partes[1].substring(0, 5)}` : data;
}

// =========================================================================
// IMPRESSÃO DE O.S. (FROTA PEQUENA)
// =========================================================================
function imprimirOSPequena(osId) {
    const os = ordensServicoPequena.find(o => o.id === osId);
    if (!os) return;
    
    const frota = frotasPequenas.find(f => f.placa === os.placa) || {};
    
    let infoAbertoPor = 'Não Informado';
    try {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
            infoAbertoPor = currentUser.username;
        } else {
            const sessaoSalva = localStorage.getItem('ccol_user_session');
            if (sessaoSalva) {
                const userObj = JSON.parse(sessaoSalva);
                if (userObj && userObj.username) infoAbertoPor = userObj.username;
            }
        }
    } catch(e) {}
    
    const numeroOSFormatado = String(os.numero_os).padStart(4, '0');

    let dataAberturaFormatada = formatarDataHoraBrasilPeq(os.data_abertura);
    let dataConclusaoFormatada = os.data_conclusao ? formatarDataHoraBrasilPeq(os.data_conclusao) : 'Em andamento';
    
    let linhasServicos = '';
    for(let i=0; i<5; i++) {
        linhasServicos += `
        <tr style="height: 25px;">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    let linhasPecas = '';
    for(let i=0; i<5; i++) {
        linhasPecas += `
        <tr style="height: 25px;">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <base href="${baseUrl}">
            <title>OS ${os.placa} - #${numeroOSFormatado} (Frota Pequena)</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    color: #000; 
                    margin: 0; 
                    padding: 0; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                
                .header-container { display: flex; border: 2px solid #000; margin-bottom: 5px; }
                .header-left { padding: 10px; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center; width: 140px; }
                .header-left img { max-height: 45px; max-width: 100%; object-fit: contain; }
                .header-center { flex: 1; text-align: center; padding: 10px; }
                .header-center h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
                .header-center h2 { margin: 2px 0 0 0; font-size: 12px; font-weight: normal; }
                .header-right { padding: 10px; border-left: 2px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; background: #f0f0f0; }
                .header-right strong { font-size: 18px; color: red; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                th, td { border: 1px solid #000; padding: 3px 5px; font-size: 11px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                
                .info-table td { width: 25%; }
                
                .section-title { font-weight: bold; background-color: #f0f0f0; border: 1px solid #000; border-bottom: none; padding: 4px; font-size: 11px; text-align: center; text-transform: uppercase; margin-bottom: 0; }
                .box-content { border: 1px solid #000; padding: 5px; font-size: 11px; min-height: 35px; margin-bottom: 5px; }
                
                .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 20px; padding: 0 20px; text-align: center; }
                .linha-ass { border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="header-left">
                    <img src="assets/logoverde.png" alt="Serrana Log">
                </div>
                <div class="header-center">
                    <h1>ORDEM DE SERVIÇO DE MANUTENÇÃO (FROTA PEQUENA)</h1>
                    <h2>CCOL - Centro de Controle Operacional Logístico</h2>
                </div>
                <div class="header-right">
                    O.S. Nº<br>
                    <strong>${numeroOSFormatado}</strong>
                </div>
            </div>

            <table class="info-table">
                <tr>
                    <td><strong>Veículo (Placa):</strong> ${os.placa || '-'}</td>
                    <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                    <td><strong>Status:</strong> ${os.status}</td>
                    <td><strong>Emitido por :</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                </tr>
                <tr>
                    <td><strong>Motorista:</strong> ${os.motorista || '-'}</td>
                    <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                    <td><strong>Prioridade:</strong> ${os.prioridade || '-'}</td>
                    <td><strong>Tipo:</strong> ${os.tipo_servico || '-'}</td>
                </tr>
                <tr>
                    <td><strong>Hodômetro (Km):</strong> ${os.hodometro || '-'}</td>
                    <td colspan="3"></td>
                </tr>
            </table>

            <table style="margin-bottom: 5px;">
                <tr>
                    <td style="background-color: #f0f0f0; font-weight: bold; width: 20%; text-align: center;">Detalhes do Veículo</td>
                    <td style="width: 26%;"><strong>Marca/Modelo:</strong> ${frota.marca_modelo || '-'}</td>
                    <td style="width: 26%;"><strong>Cor:</strong> ${frota.cor || '-'}</td>
                    <td style="width: 28%;"><strong>Observações O.S:</strong> ${os.observacoes || '-'}</td>
                </tr>
            </table>

            <div class="section-title">Diagnóstico Inicial do Condutor / Problema / Detalhes Sinistro</div>
            <div class="box-content">
                ${os.problema_relatado ? os.problema_relatado.replace(/\n/g, '<br>') : ''}
            </div>

            <div class="section-title">Serviços Executados (Preenchimento da Oficina)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Descrição do Serviço</th>
                        <th style="width: 15%;">Início</th>
                        <th style="width: 20%;">Mecânico</th>
                        <th style="width: 15%;">Fim</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasServicos}
                </tbody>
            </table>

            <div class="section-title">Materiais e Peças Utilizados (CCOL / Estoque)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Código</th>
                        <th style="width: 45%;">Descrição da Peça / Material Utilizado</th>
                        <th style="width: 10%;">Qtd</th>
                        <th style="width: 15%;">Data/Hora Solicit.</th>
                        <th style="width: 15%;">Data/Hora Retirada</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasPecas}
                </tbody>
            </table>

            <div class="section-title" style="border-bottom: 1px solid #000; margin-bottom: 0;">Observações Gerais / Pendências</div>
            <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;"></div>

            <div class="assinaturas">
                <div class="linha-ass">Motorista / Responsável</div>
                <div class="linha-ass">Mecânico / Oficina</div>
                <div class="linha-ass">CCOL / Gestor</div>
            </div>
            
            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 250); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
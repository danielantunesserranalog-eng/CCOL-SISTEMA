// ==================== MÓDULO: ORDEM DE SERVIÇO E RELATÓRIO ====================

let ordensServico = [];
let frotasManutencao = [];

async function carregarDadosOS() {
    try {
        const { data: osData, error: osError } = await supabase
            .from('ordens_servico')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!osError && osData) ordensServico = osData;

        const { data: frotaData, error: frotaError } = await supabase
            .from('frotas_manutencao')
            .select('*')
            .order('cavalo', { ascending: true });
            
        if (!frotaError && frotaData) frotasManutencao = frotaData;
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
    }
}

async function alternarTelaOS(tela) {
    const telaLista = document.getElementById('telaListaOS');
    const telaNova = document.getElementById('telaNovaOS');
    const telaFrota = document.getElementById('telaFrotaOS');
    const telaRelatorio = document.getElementById('telaRelatorioOS');
    
    // Verificação de Segurança para o Relatório Gerencial
    if (tela === 'relatorio') {
        if (!currentUser || currentUser.role !== 'Admin') {
            alert('⛔ Acesso Restrito: Apenas Administradores do CCOL podem visualizar o Relatório Gerencial de Custos e Manutenção.');
            return;
        }
    }

    // Ocultar todas
    telaLista.style.display = 'none';
    telaNova.style.display = 'none';
    telaFrota.style.display = 'none';
    if(telaRelatorio) telaRelatorio.style.display = 'none';

    await carregarDadosOS();

    if (tela === 'lista') {
        telaLista.style.display = 'block';
        renderizarTabelaOS();
    } else if (tela === 'nova') {
        telaNova.style.display = 'block';
        carregarMotoristasSelectOS();
        carregarSelectCavalosOS();
        document.getElementById('osDataAbertura').value = new Date().toISOString().split('T')[0];
        togglePneuFields(); 
    } else if (tela === 'frota') {
        telaFrota.style.display = 'block';
        renderizarTabelaFrotaManutencao();
    } else if (tela === 'relatorio') {
        telaRelatorio.style.display = 'block';
        renderizarRelatorioGerencialOS();
    }
}

// ==================== PARTE 1: RELATÓRIO GERENCIAL ====================

function renderizarRelatorioGerencialOS() {
    if (ordensServico.length === 0) {
        document.getElementById('kpiTotalOS').innerText = '0';
        return;
    }

    const total = ordensServico.length;
    const abertas = ordensServico.filter(o => o.status === 'Aberta').length;
    const concluidas = ordensServico.filter(o => o.status === 'Concluída').length;
    const taxa = ((concluidas / total) * 100).toFixed(1);

    document.getElementById('kpiTotalOS').innerText = total;
    document.getElementById('kpiAbertasOS').innerText = abertas;
    document.getElementById('kpiConcluidasOS').innerText = concluidas;
    document.getElementById('kpiTaxaOS').innerText = taxa + '%';

    // 1. Agrupar por Cavalo (Top 5)
    const porCavalo = {};
    ordensServico.forEach(o => { porCavalo[o.placa] = (porCavalo[o.placa] || 0) + 1; });
    const topCavalos = Object.entries(porCavalo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const maxCavaloCount = topCavalos.length > 0 ? topCavalos[0][1] : 1;
    let htmlCavalos = '';
    topCavalos.forEach(([placa, qtd], index) => {
        const percent = (qtd / maxCavaloCount) * 100;
        let color = '#ef4444'; // Vermelho pro que mais quebra
        if (index > 1) color = '#f59e0b';
        if (index > 3) color = 'var(--ccol-blue-bright)';
        
        htmlCavalos += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #e2e8f0;">
                    <strong>${index + 1}º ${placa}</strong>
                    <span>${qtd} O.S. abertas</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 12px; overflow: hidden;">
                    <div style="background: ${color}; width: ${percent}%; height: 100%; border-radius: 4px;"></div>
                </div>
            </div>`;
    });
    document.getElementById('rankingCavalosOS').innerHTML = htmlCavalos || '<p>Sem dados.</p>';

    // 2. Agrupar por Tipo de Serviço
    const porTipo = {};
    ordensServico.forEach(o => { porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1; });
    const listaTipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
    
    let htmlTipos = '<ul style="list-style: none; padding: 0; margin: 0;">';
    listaTipos.forEach(([tipo, qtd]) => {
        const percGlobal = ((qtd / total) * 100).toFixed(1);
        htmlTipos += `
            <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 0.9rem;">
                <span>${tipo}</span>
                <strong style="color: var(--ccol-blue-bright);">${qtd} <span style="font-size:0.75rem; color:var(--text-secondary);">(${percGlobal}%)</span></strong>
            </li>`;
    });
    htmlTipos += '</ul>';
    document.getElementById('graficoTipoOS').innerHTML = htmlTipos;

    // 3. Agrupar por Prioridade
    const porPrioridade = { 'Urgente': 0, 'Alta': 0, 'Normal': 0, 'Baixa': 0 };
    ordensServico.forEach(o => { if(porPrioridade[o.prioridade] !== undefined) porPrioridade[o.prioridade]++; });
    
    const colors = { 'Urgente': '#ef4444', 'Alta': '#f97316', 'Normal': '#eab308', 'Baixa': 'var(--ccol-green-bright)' };
    
    let htmlPrio = '';
    Object.keys(porPrioridade).forEach(p => {
        const qtd = porPrioridade[p];
        const percent = total > 0 ? (qtd / total) * 100 : 0;
        htmlPrio += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #e2e8f0;">
                    <span>Prioridade <strong>${p}</strong></span>
                    <span>${qtd} ocorrências</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 10px; overflow: hidden;">
                    <div style="background: ${colors[p]}; width: ${percent}%; height: 100%; border-radius: 4px;"></div>
                </div>
            </div>`;
    });
    document.getElementById('graficoPrioridadeOS').innerHTML = htmlPrio;
}

// ==================== PARTE 2: GESTÃO DE FROTA (O.S.) ====================

async function salvarFrotaManutencao() {
    const cavalo = document.getElementById('osFrotaCavalo').value.toUpperCase().trim();
    const go = document.getElementById('osFrotaGo').value.toUpperCase().trim();
    const carreta1 = document.getElementById('osFrotaCarreta1').value.toUpperCase().trim();
    const carreta2 = document.getElementById('osFrotaCarreta2').value.toUpperCase().trim();
    const carreta3 = document.getElementById('osFrotaCarreta3').value.toUpperCase().trim();

    if (!cavalo) {
        alert("A Placa do Cavalo é obrigatória!");
        return;
    }

    const frotaExistente = frotasManutencao.find(f => f.cavalo === cavalo);
    const dadosFrota = { cavalo, go, carreta1, carreta2, carreta3 };

    if (frotaExistente) {
        const { error } = await supabase.from('frotas_manutencao').update(dadosFrota).eq('id', frotaExistente.id);
        if (error) { alert("Erro ao atualizar frota."); return; }
    } else {
        const { error } = await supabase.from('frotas_manutencao').insert([dadosFrota]);
        if (error) { alert("Erro ao inserir frota."); return; }
    }

    document.getElementById('osFrotaCavalo').value = '';
    document.getElementById('osFrotaGo').value = '';
    document.getElementById('osFrotaCarreta1').value = '';
    document.getElementById('osFrotaCarreta2').value = '';
    document.getElementById('osFrotaCarreta3').value = '';

    await carregarDadosOS();
    renderizarTabelaFrotaManutencao();
    alert("Frota guardada com sucesso na manutenção!");
}

function renderizarTabelaFrotaManutencao() {
    const tbody = document.getElementById('tabelaFrotaManutencao');
    if (!tbody) return;

    if (frotasManutencao.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhuma frota registada na manutenção.</td></tr>';
        return;
    }

    tbody.innerHTML = frotasManutencao.map(f => `
        <tr>
            <td style="color: var(--ccol-blue-bright); font-weight: bold;">${f.cavalo}</td>
            <td style="color: var(--ccol-rust-bright); font-weight: bold;">${f.go || '-'}</td>
            <td>${f.carreta1 || '-'}</td>
            <td>${f.carreta2 || '-'}</td>
            <td>${f.carreta3 || '-'}</td>
            <td>
                <button onclick="deletarFrotaManutencao(${f.id})" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer;" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deletarFrotaManutencao(id) {
    if (confirm("Excluir este conjunto da lista de manutenção?")) {
        const { error } = await supabase.from('frotas_manutencao').delete().eq('id', id);
        if (!error) {
            await carregarDadosOS();
            renderizarTabelaFrotaManutencao();
        } else {
            alert("Erro ao excluir o registo.");
        }
    }
}


// ==================== PARTE 3: ABERTURA E ACOMPANHAMENTO DE O.S. ====================

function carregarSelectCavalosOS() {
    const select = document.getElementById('osPlaca');
    if (!select) return;
    
    let options = '<option value="">Selecione o Conjunto...</option>';
    frotasManutencao.forEach(f => {
        const displayGo = f.go ? ` (GO: ${f.go})` : '';
        options += `<option value="${f.cavalo}">${f.cavalo}${displayGo}</option>`;
    });
    select.innerHTML = options;
}

function carregarMotoristasSelectOS() {
    const select = document.getElementById('osMotorista');
    if (!select) return;
    
    let motoristasOrdenados = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));

    let options = '<option value="">Selecione o motorista...</option>';
    motoristasOrdenados.forEach(m => {
        options += `<option value="${m.nome}">${m.nome}</option>`;
    });
    select.innerHTML = options;
}

function togglePneuFields() {
    const tipo = document.getElementById('osTipo').value;
    const camposPneu = document.getElementById('camposPneu');
    if (tipo === 'Borracharia (PNEU)') {
        camposPneu.style.display = 'block';
    } else {
        camposPneu.style.display = 'none';
        document.getElementById('osPneuPosicao').value = '';
        document.getElementById('osPneuServico').value = '';
        document.getElementById('osPneuMotivo').value = '';
    }
}

function renderizarTabelaOS() {
    const tbody = document.getElementById('tabelaAcompanhamentoOS');
    const termo = document.getElementById('searchOS').value.toLowerCase();
    if (!tbody) return;

    if (ordensServico.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhuma O.S. registada.</td></tr>';
        return;
    }

    const filtradas = ordensServico.filter(os => 
        os.placa.toLowerCase().includes(termo) || 
        os.motorista.toLowerCase().includes(termo)
    );

    tbody.innerHTML = filtradas.map(os => {
        const statusBadge = os.status === 'Aberta' 
            ? `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 4px 8px; border-radius: 4px;">Aberta</span>`
            : `<span style="background: rgba(61, 220, 132, 0.2); color: var(--ccol-green-bright); padding: 4px 8px; border-radius: 4px;">Concluída</span>`;

        return `
            <tr>
                <td><strong>#${os.id}</strong></td>
                <td>${os.data_abertura.split('-').reverse().join('/')}</td>
                <td style="color: var(--ccol-blue-bright); font-weight: bold;">${os.placa}</td>
                <td>${os.motorista}</td>
                <td>${os.tipo}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="imprimirOS(${os.id})" style="background: var(--bg-panel); border: 1px solid var(--ccol-blue-bright); color: var(--ccol-blue-bright); padding: 5px 10px; border-radius: 4px; cursor: pointer;">🖨️ Imprimir</button>
                    <button onclick="concluirOS(${os.id})" style="background: var(--bg-panel); border: 1px solid var(--ccol-green-bright); color: var(--ccol-green-bright); padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">✅ Concluir</button>
                    <button onclick="deletarOS(${os.id})" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer; margin-left: 5px;" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function salvarNovaOS() {
    const placa = document.getElementById('osPlaca').value;
    const motorista = document.getElementById('osMotorista').value;
    const data_abertura = document.getElementById('osDataAbertura').value;
    const hodometro = document.getElementById('osHodometro').value;
    const prioridade = document.getElementById('osPrioridade').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value;
    const observacoes = document.getElementById('osObservacoes').value;

    if (!placa || !motorista) {
        alert("Conjunto/Cavalo e Motorista são obrigatórios!");
        return;
    }

    const frotaVinculada = frotasManutencao.find(f => f.cavalo === placa);
    const go = frotaVinculada ? frotaVinculada.go : '';

    let detalhes_pneu = null;
    if (tipo === 'Borracharia (PNEU)') {
        detalhes_pneu = JSON.stringify({
            posicao: document.getElementById('osPneuPosicao').value,
            servico: document.getElementById('osPneuServico').value,
            motivo: document.getElementById('osPneuMotivo').value
        });
    }

    const novaOS = {
        placa, go, motorista, data_abertura, hodometro, prioridade, tipo, problema, observacoes, detalhes_pneu,
        status: 'Aberta'
    };

    const { error } = await supabase.from('ordens_servico').insert([novaOS]);

    if (error) {
        alert("Erro ao gravar O.S.");
        console.error(error);
        return;
    }
    
    document.getElementById('osPlaca').value = '';
    document.getElementById('osMotorista').value = '';
    document.getElementById('osHodometro').value = '';
    document.getElementById('osProblema').value = '';
    document.getElementById('osObservacoes').value = '';
    document.getElementById('osPneuPosicao').value = '';
    document.getElementById('osPneuServico').value = '';
    document.getElementById('osPneuMotivo').value = '';

    alert("O.S. Aberta com sucesso!");
    alternarTelaOS('lista');
}

async function concluirOS(id) {
    if (confirm("Marcar O.S. como concluída?")) {
        const { error } = await supabase
            .from('ordens_servico')
            .update({ status: 'Concluída' })
            .eq('id', id);

        if (!error) {
            await carregarDadosOS();
            renderizarTabelaOS();
        } else {
            alert("Erro ao concluir a O.S.");
        }
    }
}

async function deletarOS(id) {
    if (confirm("Deseja realmente excluir esta O.S.?")) {
        const { error } = await supabase
            .from('ordens_servico')
            .delete()
            .eq('id', id);

        if (!error) {
            await carregarDadosOS();
            renderizarTabelaOS();
        } else {
            alert("Erro ao excluir a O.S.");
        }
    }
}

function imprimirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;

    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || { carreta1: '', carreta2: '', carreta3: '' };
    const dataFormatada = os.data_abertura.split('-').reverse().join('/');
    
    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)' && os.detalhes_pneu) {
        try {
            const pneu = JSON.parse(os.detalhes_pneu);
            painelBorracharia = `
                <div class="full-box" style="background: #eef2ff; border-color: #3b82f6;">
                    <strong style="color: #1d4ed8;">🛞 DETALHES DE BORRACHARIA:</strong><br><br>
                    <strong>Posição/Eixo:</strong> ${pneu.posicao || 'Não informada'} <br>
                    <strong>Serviço Exigido:</strong> ${pneu.servico || 'Não informado'} <br>
                    <strong>Motivo/Diagnóstico:</strong> ${pneu.motivo || 'Não informado'}
                </div>
            `;
        } catch(e) {}
    }

    let linhasServicos = '';
    for(let i=0; i<5; i++) {
        linhasServicos += `
            <tr>
                <td style="height: 30px;"></td>
                <td></td>
                <td>1º( ) 2º( ) 3º( )</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
    }

    let linhasPecas = '';
    for(let i=0; i<4; i++) {
        linhasPecas += `<tr><td style="height: 25px;"></td><td></td></tr>`;
    }

    const htmlImpressao = `
        <html>
        <head>
            <title>O.S. #${os.id} - ${os.placa}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
                .header { text-align: center; border: 2px solid #000; padding: 10px; font-weight: bold; font-size: 16px; margin-bottom: 10px; background-color: #f0f0f0; }
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
                .info-box { border: 1px solid #000; padding: 8px; }
                .full-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; }
                th { background-color: #f0f0f0; }
                .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
                .sig-line { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px; }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .header, th, .full-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">ORDEM DE SERVIÇO - MANUTENÇÃO E FROTAS<br><span style="font-size: 12px;">Serrana Florestal - CCOL</span></div>
            
            <div class="info-grid">
                <div class="info-box"><strong>Cavalo:</strong> ${os.placa}</div>
                <div class="info-box"><strong>GO:</strong> ${os.go || '-'}</div>
                <div class="info-box"><strong>Data Abertura:</strong> ${dataFormatada}</div>
                <div class="info-box"><strong>Motorista:</strong> ${os.motorista}</div>
                <div class="info-box"><strong>Hodômetro (Km):</strong> ${os.hodometro || 'Não informado'}</div>
                <div class="info-box"><strong>Prioridade:</strong> ${os.prioridade}</div>
            </div>

            <div class="full-box" style="background: #fafafa; font-size: 11px;">
                <strong>Composição do Tritrem (Carretas vinculadas):</strong><br>
                1º Comp: <strong>${frota.carreta1 || 'Não registada'}</strong> &nbsp;|&nbsp; 
                2º Comp: <strong>${frota.carreta2 || 'Não registada'}</strong> &nbsp;|&nbsp; 
                3º Comp: <strong>${frota.carreta3 || 'Não registada'}</strong>
            </div>

            <div class="full-box">
                <strong>Classificação da Manutenção:</strong> ${os.tipo}
            </div>

            ${painelBorracharia}

            <div class="full-box">
                <strong>Diagnóstico Inicial do Condutor / Problema Relatado:</strong><br><br>
                ${os.problema || 'Nenhum problema detalhado.'}
            </div>

            <h3 style="margin: 0 0 5px 0;">Serviços Executados (Preenchimento da Oficina):</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Descrição do Serviço</th>
                        <th style="width: 10%;">Hora Início</th>
                        <th style="width: 15%;">Compartimentos<br>(Tritrem)</th>
                        <th style="width: 15%;">Eixo<br>LD/LE</th>
                        <th style="width: 10%;">PLACA</th>
                        <th style="width: 10%;">Mecânico</th>
                        <th style="width: 10%;">Hora Fim</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasServicos}
                </tbody>
            </table>

            <h3 style="margin: 0 0 5px 0;">Requisição de Peças / Almoxarifado:</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 80%;">Descrição da Peça</th>
                        <th style="width: 20%;">Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasPecas}
                </tbody>
            </table>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div class="info-box" style="height: 60px;"><strong>Movimentação Pneu:</strong><br>Saiu da Frota:<br>Para Entrar:</div>
                <div class="info-box" style="height: 60px;"><strong>Observações Administrativas:</strong><br>${os.observacoes || ''}</div>
            </div>

            <div class="signatures">
                <div class="sig-line">Assinatura do Condutor / CCOL</div>
                <div class="sig-line">Assinatura do Encarregado de Manutenção</div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; border: 1px solid #333; background: #fff;">🖨️ Imprimir Documento de O.S.</button>
            </div>
        </body>
        </html>
    `;

    const janela = window.open('', '', 'width=900,height=800');
    janela.document.write(htmlImpressao);
    janela.document.close();
}
// ==================== MÓDULO: ORDEM DE SERVIÇO (O.S.) ====================

// Variáveis locais para armazenar os dados temporariamente na interface
let ordensServico = [];
let frotasManutencao = [];

// Função para carregar os dados reais do Supabase
async function carregarDadosOS() {
    try {
        // Carrega as O.S.
        const { data: osData, error: osError } = await supabase
            .from('ordens_servico')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!osError && osData) {
            ordensServico = osData;
        }

        // Carrega as Frotas
        const { data: frotaData, error: frotaError } = await supabase
            .from('frotas_manutencao')
            .select('*');
            
        if (!frotaError && frotaData) {
            frotasManutencao = frotaData;
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
    }
}

async function alternarTelaOS(tela) {
    const telaLista = document.getElementById('telaListaOS');
    const telaNova = document.getElementById('telaNovaOS');
    const telaFrota = document.getElementById('telaFrotaOS');
    
    // Ocultar todas
    telaLista.style.display = 'none';
    telaNova.style.display = 'none';
    telaFrota.style.display = 'none';

    // Carregar os dados mais recentes do banco antes de mostrar a tela
    await carregarDadosOS();

    if (tela === 'lista') {
        telaLista.style.display = 'block';
        renderizarTabelaOS();
    } else if (tela === 'nova') {
        telaNova.style.display = 'block';
        carregarMotoristasSelectOS();
        carregarDatalistCavalos();
        document.getElementById('osDataAbertura').value = new Date().toISOString().split('T')[0];
    } else if (tela === 'frota') {
        telaFrota.style.display = 'block';
        renderizarTabelaFrotaManutencao();
    }
}

// ==================== PARTE 1: GESTÃO DE FROTA (O.S.) ====================

async function salvarFrotaManutencao() {
    const cavalo = document.getElementById('osFrotaCavalo').value.toUpperCase().trim();
    const carreta1 = document.getElementById('osFrotaCarreta1').value.toUpperCase().trim();
    const carreta2 = document.getElementById('osFrotaCarreta2').value.toUpperCase().trim();
    const carreta3 = document.getElementById('osFrotaCarreta3').value.toUpperCase().trim();

    if (!cavalo) {
        alert("A Placa do Cavalo é obrigatória!");
        return;
    }

    // Verifica se já existe para atualizar
    const frotaExistente = frotasManutencao.find(f => f.cavalo === cavalo);

    const dadosFrota = { cavalo, carreta1, carreta2, carreta3 };

    if (frotaExistente) {
        // Atualiza no Supabase
        const { error } = await supabase
            .from('frotas_manutencao')
            .update(dadosFrota)
            .eq('id', frotaExistente.id);
            
        if (error) {
            alert("Erro ao atualizar frota.");
            return;
        }
    } else {
        // Insere no Supabase
        const { error } = await supabase
            .from('frotas_manutencao')
            .insert([dadosFrota]);
            
        if (error) {
            alert("Erro ao inserir frota.");
            return;
        }
    }

    // Limpar campos
    document.getElementById('osFrotaCavalo').value = '';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma frota registada na manutenção.</td></tr>';
        return;
    }

    tbody.innerHTML = frotasManutencao.map(f => `
        <tr>
            <td style="color: var(--ccol-blue-bright); font-weight: bold;">${f.cavalo}</td>
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
        const { error } = await supabase
            .from('frotas_manutencao')
            .delete()
            .eq('id', id);

        if (!error) {
            await carregarDadosOS();
            renderizarTabelaFrotaManutencao();
        } else {
            alert("Erro ao excluir o registo.");
        }
    }
}

function carregarDatalistCavalos() {
    const datalist = document.getElementById('listaCavalosOS');
    if (!datalist) return;
    datalist.innerHTML = frotasManutencao.map(f => `<option value="${f.cavalo}">`).join('');
}


// ==================== PARTE 2: ABERTURA E ACOMPANHAMENTO DE O.S. ====================

function carregarMotoristasSelectOS() {
    const select = document.getElementById('osMotorista');
    if (!select) return;
    
    // Usa a variável global 'motoristas' do sistema CCOL
    let options = '<option value="">Selecione o motorista...</option>';
    motoristas.forEach(m => {
        options += `<option value="${m.nome}">${m.nome}</option>`;
    });
    select.innerHTML = options;
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
    const placa = document.getElementById('osPlaca').value.toUpperCase();
    const go = document.getElementById('osGo').value;
    const motorista = document.getElementById('osMotorista').value;
    const data_abertura = document.getElementById('osDataAbertura').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value;
    const observacoes = document.getElementById('osObservacoes').value;

    if (!placa || !motorista) {
        alert("Placa e Motorista são obrigatórios!");
        return;
    }

    const novaOS = {
        placa, go, motorista, data_abertura, tipo, problema, observacoes,
        status: 'Aberta'
    };

    const { error } = await supabase.from('ordens_servico').insert([novaOS]);

    if (error) {
        alert("Erro ao gravar O.S.");
        return;
    }
    
    // Limpar formulário
    document.getElementById('osPlaca').value = '';
    document.getElementById('osGo').value = '';
    document.getElementById('osProblema').value = '';
    document.getElementById('osObservacoes').value = '';

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

// Geração da versão de impressão
function imprimirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;

    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || { carreta1: '', carreta2: '', carreta3: '' };
    const dataFormatada = os.data_abertura.split('-').reverse().join('/');
    
    let linhasServicos = '';
    for(let i=0; i<6; i++) {
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
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                .info-box { border: 1px solid #000; padding: 8px; }
                .info-box strong { display: inline-block; width: 120px; }
                .full-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; }
                th { background-color: #f0f0f0; }
                .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
                .sig-line { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px; }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .header, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">ORDEM DE SERVIÇO - MANUTENÇÃO DE CARRETA<br><span style="font-size: 12px;">Serrana Florestal - CCOL</span></div>
            
            <div class="info-grid">
                <div class="info-box"><strong>Cavalo:</strong> ${os.placa}</div>
                <div class="info-box"><strong>GO:</strong> ${os.go || '-'}</div>
                <div class="info-box"><strong>Motorista:</strong> ${os.motorista}</div>
                <div class="info-box"><strong>Data Abertura:</strong> ${dataFormatada}</div>
            </div>

            <div class="full-box" style="background: #fafafa; font-size: 11px;">
                <strong>Composição do Tritrem (Carretas vinculadas):</strong><br>
                1º Comp: <strong>${frota.carreta1 || 'Não registada'}</strong> &nbsp;|&nbsp; 
                2º Comp: <strong>${frota.carreta2 || 'Não registada'}</strong> &nbsp;|&nbsp; 
                3º Comp: <strong>${frota.carreta3 || 'Não registada'}</strong>
            </div>

            <div class="full-box">
                <strong>Problema relatado pelo motorista:</strong><br><br>
                ${os.problema || 'Nenhum problema detalhado.'}
            </div>

            <div class="full-box">
                <strong>Tipo:</strong> 
                CNP(${os.tipo === 'CNP' ? 'X' : ' '}) &nbsp;&nbsp; 
                S.O.S(${os.tipo === 'S.O.S' ? 'X' : ' '}) &nbsp;&nbsp; 
                PNEU(${os.tipo === 'PNEU' ? 'X' : ' '})
            </div>

            <h3 style="margin: 0 0 5px 0;">Serviços Executados:</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Descrição do Serviço</th>
                        <th style="width: 10%;">Hora Início</th>
                        <th style="width: 15%;">Compartimentos<br>(Tritrem)</th>
                        <th style="width: 15%;">Eixo<br>LD/LE</th>
                        <th style="width: 10%;">PLACA</th>
                        <th style="width: 10%;">Executante</th>
                        <th style="width: 10%;">Hora Fim</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasServicos}
                </tbody>
            </table>

            <h3 style="margin: 0 0 5px 0;">Pedido de Peça Almoxarifado / Peças Utilizadas:</h3>
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

            <div class="info-grid">
                <div class="info-box" style="height: 60px;"><strong>Movimentação Pneu:</strong><br>Saiu da Frota:<br>Para Entrar:</div>
                <div class="info-box" style="height: 60px;"><strong>Observações:</strong><br>${os.observacoes || ''}</div>
            </div>

            <div class="signatures">
                <div class="sig-line">Ass. Controlador</div>
                <div class="sig-line">Ass. Encarregado de Manutenção</div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Imprimir O.S.</button>
            </div>
        </body>
        </html>
    `;

    const janela = window.open('', '', 'width=900,height=700');
    janela.document.write(htmlImpressao);
    janela.document.close();
}
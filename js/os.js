// ==================== MÓDULO: ORDEM DE SERVIÇO (O.S.) ====================

// Simulando banco de dados local para as O.S. (Depois você pode integrar no database.js)
let ordensServico = JSON.parse(localStorage.getItem('ccol_os')) || [];

function alternarTelaOS(tela) {
    const telaLista = document.getElementById('telaListaOS');
    const telaNova = document.getElementById('telaNovaOS');
    
    if (tela === 'lista') {
        telaLista.style.display = 'block';
        telaNova.style.display = 'none';
        renderizarTabelaOS();
    } else {
        telaLista.style.display = 'none';
        telaNova.style.display = 'block';
        carregarMotoristasSelectOS();
        document.getElementById('osDataAbertura').value = new Date().toISOString().split('T')[0];
    }
}

function carregarMotoristasSelectOS() {
    const select = document.getElementById('osMotorista');
    if (!select) return;
    
    // Usa a variável global 'motoristas' do seu sistema
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhuma O.S. registrada.</td></tr>';
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
                <td>${os.dataAbertura.split('-').reverse().join('/')}</td>
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

function salvarNovaOS() {
    const placa = document.getElementById('osPlaca').value.toUpperCase();
    const go = document.getElementById('osGo').value;
    const motorista = document.getElementById('osMotorista').value;
    const dataAbertura = document.getElementById('osDataAbertura').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value;
    const observacoes = document.getElementById('osObservacoes').value;

    if (!placa || !motorista) {
        alert("Placa e Motorista são obrigatórios!");
        return;
    }

    const novaOS = {
        id: Date.now(), // Gera um ID único
        placa, go, motorista, dataAbertura, tipo, problema, observacoes,
        status: 'Aberta'
    };

    ordensServico.push(novaOS);
    localStorage.setItem('ccol_os', JSON.stringify(ordensServico));
    
    // Limpar formulário
    document.getElementById('osPlaca').value = '';
    document.getElementById('osGo').value = '';
    document.getElementById('osProblema').value = '';
    document.getElementById('osObservacoes').value = '';

    alert("O.S. Aberta com sucesso!");
    alternarTelaOS('lista');
}

function concluirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (os && confirm("Marcar O.S. como concluída?")) {
        os.status = 'Concluída';
        localStorage.setItem('ccol_os', JSON.stringify(ordensServico));
        renderizarTabelaOS();
    }
}

function deletarOS(id) {
    if (confirm("Deseja realmente excluir esta O.S.?")) {
        ordensServico = ordensServico.filter(o => o.id !== id);
        localStorage.setItem('ccol_os', JSON.stringify(ordensServico));
        renderizarTabelaOS();
    }
}

// Geração da versão de impressão idêntica ao PDF fornecido
function imprimirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;

    const dataFormatada = os.dataAbertura.split('-').reverse().join('/');
    
    // Gerar linhas vazias para a tabela de serviços para o mecânico preencher à mão
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
                }
            </style>
        </head>
        <body>
            <div class="header">ORDEM DE SERVIÇO - MANUTENÇÃO DE CARRETA<br><span style="font-size: 12px;">Serranalog Transportes</span></div>
            
            <div class="info-grid">
                <div class="info-box"><strong>Placa:</strong> ${os.placa}</div>
                <div class="info-box"><strong>GO:</strong> ${os.go || '-'}</div>
                <div class="info-box"><strong>Motorista:</strong> ${os.motorista}</div>
                <div class="info-box"><strong>Data Abertura:</strong> ${dataFormatada}</div>
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
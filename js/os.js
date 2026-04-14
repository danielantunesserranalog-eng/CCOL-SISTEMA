// ==================== MÓDULO: ORDEM DE SERVIÇO E RELATÓRIO ====================

let ordensServico = [];
let frotasManutencao = [];
let tvInterval = null;
let osSelecionadaParaConclusao = null; 
let osSelecionadaParaServicoExtra = null; 
window.dmDataAtualExport = []; // Variável global para exportação de DM

async function carregarDadosOS() {
    try {
        const { data: osData, error: osError } = await supabaseClient
            .from('ordens_servico')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!osError && osData) ordensServico = osData;

        const { data: frotaData, error: frotaError } = await supabaseClient
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
    const telaListaSinistro = document.getElementById('telaListaSinistro');
    const telaHistorico = document.getElementById('telaHistoricoOS');
    const telaNova = document.getElementById('telaNovaOS');
    const telaFrota = document.getElementById('telaFrotaOS');
    const telaRelatorio = document.getElementById('telaRelatorioOS');
    const telaDisponibilidade = document.getElementById('telaDisponibilidadeOS');
    
    if(telaLista) telaLista.style.display = 'none';
    if(telaListaSinistro) telaListaSinistro.style.display = 'none';
    if(telaHistorico) telaHistorico.style.display = 'none';
    if(telaNova) telaNova.style.display = 'none';
    if(telaFrota) telaFrota.style.display = 'none';
    if(telaRelatorio) telaRelatorio.style.display = 'none';
    if(telaDisponibilidade) telaDisponibilidade.style.display = 'none';
    sairModoTV();

    await carregarDadosOS();

    if (tela === 'lista') {
        telaLista.style.display = 'block';
        renderizarTabelaOS();
    } else if (tela === 'sinistro') {
        if(telaListaSinistro) telaListaSinistro.style.display = 'block';
        renderizarTabelaSinistro();
    } else if (tela === 'historico') {
        telaHistorico.style.display = 'block';
        renderizarTabelaHistoricoOS();
    } else if (tela === 'nova') {
        telaNova.style.display = 'block';
        carregarMotoristasSelectOS();
        carregarSelectCavalosOS();
        
        document.getElementById('osModoEntrada').value = 'imediata';
        mudarModoEntrada();
        togglePneuFields(); 
    } else if (tela === 'frota') {
        telaFrota.style.display = 'block';
        renderizarTabelaFrotaManutencao();
    } else if (tela === 'relatorio') {
        telaRelatorio.style.display = 'block';
        renderizarRelatorioGerencialOS();
    } else if (tela === 'disponibilidade') {
        if(telaDisponibilidade) telaDisponibilidade.style.display = 'block';
        renderizarDisponibilidadeMecanica();
    } else if (tela === 'painel_tv') {
        entrarModoTV();
    }
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

function mudarModoEntrada() {
    const modo = document.getElementById('osModoEntrada').value;
    const label = document.getElementById('labelDataAbertura');
    const input = document.getElementById('osDataAbertura');
    
    if (modo === 'imediata') {
        label.innerText = 'Data e Hora da Entrada no Pátio (Ocorrência)';
        
        const agora = new Date();
        const fusoAjuste = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000));
        input.value = fusoAjuste.toISOString().slice(0, 16); 
    } else {
        label.innerText = 'Agendar para (Data e Hora Futura)';
        input.value = '';
    }
}

async function carregarMotoristasSelectOS() {
    const select = document.getElementById('osMotorista');
    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('motoristas')
            .select('nome')
            .order('nome', { ascending: true });
            
        if (error) throw error;

        let options = '<option value="">Selecione o motorista...</option>';
        if (data) {
            data.forEach(m => {
                options += `<option value="${m.nome}">${m.nome}</option>`;
            });
        }
        select.innerHTML = options;
    } catch (error) {
        console.error("Erro ao carregar motoristas para OS:", error);
    }
}

function renderizarTabelaOS() {
    const tbody = document.getElementById('tabelaAcompanhamentoOS');
    if (!tbody) return;

    const termo = (document.getElementById('searchOS')?.value || '').toLowerCase();
    
    // Filtra apenas OS que NÃO são sinistro (para a tela principal) e que não estão concluídas
    let filtradas = ordensServico.filter(o => o.status !== 'Concluída' && o.tipo !== 'Sinistro');

    if (termo) {
        filtradas = filtradas.filter(o => 
            (o.placa && o.placa.toLowerCase().includes(termo)) ||
            (o.motorista && o.motorista.toLowerCase().includes(termo))
        );
    }

    tbody.innerHTML = filtradas.map(os => {
        let corStatus = '#f59e0b'; 
        if (os.status === 'Em Manutenção') corStatus = '#3b82f6';
        if (os.status === 'Agendada') corStatus = '#8b5cf6';
        
        const modoIcon = os.status === 'Agendada' ? '📅' : '🚨';
        
        const inicioStr = os.data_abertura ? new Date(os.data_abertura).toLocaleString('pt-BR') : '-';
        const previsaoStr = os.previsao_entrega ? new Date(os.previsao_entrega).toLocaleString('pt-BR') : 'Não definida';

        let tempoDescricao = '-';
        if (os.data_abertura && os.status !== 'Agendada') {
            const inicio = new Date(os.data_abertura);
            const agora = new Date();
            const diffMs = agora - inicio;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            tempoDescricao = `<span style="color: #ef4444; font-weight: bold;">${diffHrs}h ${diffMin}m</span>`;
        } else if (os.status === 'Agendada') {
            tempoDescricao = `<span style="color: #8b5cf6;">Para o futuro</span>`;
        }

        let isVencida = false;
        if (os.previsao_entrega && os.status !== 'Agendada') {
            const previsao = new Date(os.previsao_entrega);
            if (new Date() > previsao) {
                isVencida = true;
            }
        }

        const linhaStyle = isVencida ? 'background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444;' : '';

        return `
            <tr style="${linhaStyle}">
                <td><strong>#${os.id}</strong></td>
                <td>${modoIcon} ${inicioStr}</td>
                <td>${previsaoStr} ${isVencida ? '⚠️' : ''}</td>
                <td style="color: var(--ccol-blue-bright); font-weight: bold;">${os.placa || '-'}</td>
                <td>${os.motorista || '-'}</td>
                <td>${os.tipo}</td>
                <td><span style="color: ${corStatus}; font-weight: bold;">${os.status}</span></td>
                <td>
                    <button class="btn-primary-blue" onclick="abrirModalServicoExtra(${os.id})" title="Adicionar Serviço e Prorrogar Prazo" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;">➕ Serviço Extra</button>
                    <button class="btn-primary-green" onclick="abrirModalConclusaoOS(${os.id})" style="padding: 4px 8px; font-size: 0.8rem;">✅ Concluir OS</button>
                    <button class="btn-secondary-dark" onclick="imprimirOS(${os.id})" title="Imprimir" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">🖨️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderizarTabelaSinistro() {
    const tbody = document.getElementById('tabelaAcompanhamentoSinistro');
    if (!tbody) return;

    const termo = (document.getElementById('searchSinistro')?.value || '').toLowerCase();
    
    // Filtra apenas OS do tipo Sinistro que NÃO estão concluídas
    let filtradas = ordensServico.filter(o => o.status !== 'Concluída' && (o.tipo === 'Sinistro' || o.status === 'Sinistrado'));

    if (termo) {
        filtradas = filtradas.filter(o => 
            (o.placa && o.placa.toLowerCase().includes(termo)) ||
            (o.motorista && o.motorista.toLowerCase().includes(termo))
        );
    }

    tbody.innerHTML = filtradas.map(os => {
        let corStatus = '#ef4444'; 
        
        const inicioStr = os.data_abertura ? new Date(os.data_abertura).toLocaleString('pt-BR') : '-';
        const previsaoStr = os.previsao_entrega ? new Date(os.previsao_entrega).toLocaleString('pt-BR') : 'Indeterminada';

        let tempoDescricao = '-';
        if (os.data_abertura) {
            const inicio = new Date(os.data_abertura);
            const agora = new Date();
            const diffMs = agora - inicio;
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            tempoDescricao = `<span style="color: #ef4444; font-weight: bold;">${diffDias} dias parado</span>`;
        }

        return `
            <tr style="background: rgba(239, 68, 68, 0.05); border-left: 4px solid #ef4444;">
                <td><strong>#${os.id}</strong></td>
                <td>💥 ${inicioStr}</td>
                <td>${previsaoStr}</td>
                <td style="color: #ef4444; font-weight: bold; font-size: 1.1rem;">${os.placa || '-'}</td>
                <td>${os.motorista || '-'}</td>
                <td style="font-size: 0.85rem; color: #fca5a5;">${os.problema || 'Sinistro Reportado'}</td>
                <td><span style="color: ${corStatus}; font-weight: bold; text-transform: uppercase;">Veículo Inativo (Sinistro)</span></td>
                <td>
                    <button class="btn-primary-blue" onclick="abrirModalServicoExtra(${os.id})" title="Atualizar Previsão de Retorno" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;">📅 Nova Previsão</button>
                    <button class="btn-primary-green" onclick="abrirModalConclusaoOS(${os.id})" style="padding: 4px 8px; font-size: 0.8rem;">✅ Retorno à Operação</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderizarTabelaHistoricoOS() {
    const tbody = document.getElementById('tabelaHistoricoOS');
    if (!tbody) return;

    const num = document.getElementById('filtroHistOSNum')?.value.toLowerCase();
    const placa = document.getElementById('filtroHistPlaca')?.value.toLowerCase();
    const motorista = document.getElementById('filtroHistMotorista')?.value.toLowerCase();
    const dataStr = document.getElementById('filtroHistData')?.value;

    let filtradas = ordensServico;

    if (num) filtradas = filtradas.filter(o => o.id.toString() === num);
    if (placa) filtradas = filtradas.filter(o => o.placa && o.placa.toLowerCase().includes(placa));
    if (motorista) filtradas = filtradas.filter(o => o.motorista && o.motorista.toLowerCase().includes(motorista));
    
    if (dataStr) {
        filtradas = filtradas.filter(o => {
            if (!o.data_abertura) return false;
            return o.data_abertura.startsWith(dataStr); 
        });
    }

    tbody.innerHTML = filtradas.map(os => {
        let corStatus = '#f59e0b';
        if (os.status === 'Concluída') corStatus = 'var(--ccol-green-bright)';
        if (os.status === 'Em Manutenção') corStatus = '#3b82f6';
        if (os.status === 'Sinistrado' || os.tipo === 'Sinistro') corStatus = '#ef4444';

        const dataAbertura = os.data_abertura ? new Date(os.data_abertura).toLocaleString('pt-BR') : '-';
        const dataConclusao = os.data_conclusao ? new Date(os.data_conclusao).toLocaleString('pt-BR') : '-';

        return `
            <tr>
                <td><strong>#${os.id}</strong></td>
                <td>${dataAbertura}</td>
                <td style="${os.status === 'Concluída' ? 'color: var(--ccol-green-bright);' : ''}">${dataConclusao}</td>
                <td style="color: var(--ccol-blue-bright); font-weight: bold;">${os.placa || '-'}</td>
                <td>${os.motorista || '-'}</td>
                <td>${os.tipo}</td>
                <td><span style="color: ${corStatus}; font-weight: bold;">${os.status}</span></td>
                <td>
                    <button class="btn-secondary-dark" onclick="imprimirOS(${os.id})" title="Imprimir O.S." style="padding: 4px 8px; font-size: 0.8rem;">🖨️ Imprimir</button>
                    <button class="btn-danger-outline" onclick="excluirOS(${os.id})" title="Excluir Definitivamente" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function salvarNovaOS() {
    const placa = document.getElementById('osPlaca').value.trim().toUpperCase();
    const motorista = document.getElementById('osMotorista').value;
    const modoEntrada = document.getElementById('osModoEntrada').value;
    let data_abertura = document.getElementById('osDataAbertura').value;
    const hodometro = document.getElementById('osHodometro').value;
    const prioridade = document.getElementById('osPrioridade').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value.trim();
    const observacoes = document.getElementById('osObservacoes').value.trim();

    // Campos de Pneu
    let pneuPosicao = null;
    let pneuServico = null;
    let pneuMotivo = null;

    if (tipo === 'Borracharia (PNEU)') {
        pneuPosicao = document.getElementById('osPneuPosicao').value.trim();
        pneuServico = document.getElementById('osPneuServico').value;
        pneuMotivo = document.getElementById('osPneuMotivo').value.trim();
    }

    if (!placa || !data_abertura || !tipo) {
        alert("Preencha ao menos Placa, Data de Abertura e Tipo de Serviço.");
        return;
    }

    // Se for entrada imediata, valida para não colocar data no futuro
    const dataSelecionada = new Date(data_abertura);
    const agora = new Date();
    
    if (modoEntrada === 'imediata' && dataSelecionada > agora) {
        alert("Modo Entrada Imediata selecionado, mas a data/hora colocada está no futuro. Use o modo 'Agendar' se for para o futuro.");
        return;
    }

    let statusInicial = 'Aguardando Oficina';
    
    // Se for agendado, muda o status para agendado e zera o TV
    if (modoEntrada === 'agendada') {
        statusInicial = 'Agendada';
    } else if (tipo === 'Sinistro') {
        statusInicial = 'Sinistrado'; // Força status Sinistrado
    }

    try {
        const { error } = await supabaseClient
            .from('ordens_servico')
            .insert([{
                placa,
                motorista,
                data_abertura,
                hodometro,
                prioridade,
                tipo,
                problema,
                observacoes,
                status: statusInicial,
                pneu_posicao: pneuPosicao,
                pneu_servico: pneuServico,
                pneu_motivo: pneuMotivo,
                criado_por: currentUserEmail
            }]);

        if (error) throw error;
        
        document.getElementById('osPlaca').value = '';
        document.getElementById('osMotorista').value = '';
        document.getElementById('osDataAbertura').value = '';
        document.getElementById('osHodometro').value = '';
        document.getElementById('osProblema').value = '';
        document.getElementById('osObservacoes').value = '';
        
        if (tipo === 'Borracharia (PNEU)') {
            document.getElementById('osPneuPosicao').value = '';
            document.getElementById('osPneuServico').value = '';
            document.getElementById('osPneuMotivo').value = '';
            togglePneuFields();
        }

        await carregarDadosOS();
        
        if (tipo === 'Sinistro') {
            alternarTelaOS('sinistro');
        } else if (modoEntrada === 'agendada') {
            alternarTelaOS('historico'); // Agendadas vão pro histórico até o dia
            alert("Ordem de Serviço Agendada com sucesso! Ela ficará no histórico até o momento da entrada no pátio.");
        } else {
            alternarTelaOS('lista');
        }
        
    } catch (error) {
        console.error("Erro ao abrir OS:", error);
        alert("Erro ao abrir Ordem de Serviço.");
    }
}

async function salvarFrotaManutencao() {
    const cavalo = document.getElementById('osFrotaCavalo').value.trim().toUpperCase();
    const go = document.getElementById('osFrotaGo').value.trim().toUpperCase();
    const carreta1 = document.getElementById('osFrotaCarreta1').value.trim().toUpperCase();
    const carreta2 = document.getElementById('osFrotaCarreta2').value.trim().toUpperCase();
    const carreta3 = document.getElementById('osFrotaCarreta3').value.trim().toUpperCase();

    if (!cavalo) {
        alert("A placa do cavalo é obrigatória.");
        return;
    }

    const existente = frotasManutencao.find(f => f.cavalo === cavalo);

    if (existente) {
        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .update({ go, carreta1, carreta2, carreta3 })
            .eq('id', existente.id);
        if (error) { alert("Erro ao atualizar frota."); return; }
    } else {
        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .insert([{ cavalo, go, carreta1, carreta2, carreta3 }]);
        if (error) { alert("Erro ao inserir frota."); return; }
    }

    document.getElementById('osFrotaCavalo').value = '';
    document.getElementById('osFrotaGo').value = '';
    document.getElementById('osFrotaCarreta1').value = '';
    document.getElementById('osFrotaCarreta2').value = '';
    document.getElementById('osFrotaCarreta3').value = '';

    await carregarDadosOS();
    renderizarTabelaFrotaManutencao();
}

async function carregarSelectCavalosOS() {
    const select = document.getElementById('osPlaca');
    if (!select) return;
    let linhasPecas = '';
    for(let i=0; i<4; i++) {
        linhasPecas += `
            <tr>
                <td style="height: 35px;"></td>
                <td></td>
                <td></td>
            </tr>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ordem de Serviço #${numeroOSFormatado}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
                body { 
                    font-family: 'Roboto', sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                }
                .container {
                    border: 2px solid #000;
                    padding: 15px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                }
                .header img {
                    height: 50px;
                }
                .header-title {
                    text-align: center;
                    flex: 1;
                }
                .header-title h2 {
                    margin: 0;
                    font-size: 22px;
                    text-transform: uppercase;
                }
                .header-title p {
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    font-weight: bold;
                }
                .os-number {
                    border: 2px solid #000;
                    padding: 10px;
                    text-align: center;
                    font-weight: bold;
                    background: #f3f4f6;
                    font-size: 18px;
                }
                
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
                
                .box {
                    border: 1px solid #000;
                    padding: 8px;
                }
                .box strong {
                    display: block;
                    font-size: 11px;
                    color: #555;
                    margin-bottom: 4px;
                }
                .box span {
                    font-size: 14px;
                    font-weight: bold;
                }
                .full-box {
                    border: 1px solid #000;
                    padding: 10px;
                    margin-bottom: 15px;
                    background: #f9fafb;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                }
                table, th, td {
                    border: 1px solid #000;
                }
                th {
                    background: #e5e7eb;
                    padding: 8px;
                    font-size: 11px;
                    text-align: left;
                }
                td {
                    padding: 6px;
                }
                
                .assinaturas {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 20px;
                    margin-top: 50px;
                    text-align: center;
                }
                .linha-assinatura {
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                @media print {
                    @page { margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="assets/logo.png" alt="Serrana Log">
                    <div class="header-title">
                        <h2>ORDEM DE SERVIÇO DE MANUTENÇÃO</h2>
                        <p>CCOL - Centro de Controle Operacional Logístico</p>
                    </div>
                    <div class="os-number">
                        O.S. Nº<br>
                        <span style="font-size: 24px; color: #dc2626;">${numeroOSFormatado}</span>
                    </div>
                </div>

                <div class="grid-4">
                    <div class="box"><strong>Data de Abertura:</strong> <span>${dataAberturaFormatada}</span></div>
                    <div class="box"><strong>Prioridade:</strong> <span>${os.prioridade}</span></div>
                    <div class="box"><strong>Tipo de Serviço:</strong> <span>${os.tipo}</span></div>
                    <div class="box"><strong>Status:</strong> <span>${os.status}</span></div>
                </div>

                <div class="grid-4">
                    <div class="box"><strong>Placa (Cavalo):</strong> <span>${os.placa || '-'}</span></div>
                    <div class="box"><strong>1ª Carreta:</strong> <span>${frota.carreta1 || '-'}</span></div>
                    <div class="box"><strong>2ª Carreta:</strong> <span>${frota.carreta2 || '-'}</span></div>
                    <div class="box"><strong>3ª Carreta:</strong> <span>${frota.carreta3 || '-'}</span></div>
                </div>

                <div class="grid-2">
                    <div class="box"><strong>Motorista Solicitante / Relator:</strong> <span>${os.motorista}</span></div>
                    <div class="box"><strong>Km / Hodômetro Atual:</strong> <span>${os.hodometro || 'Não informado'}</span></div>
                </div>

                <div class="full-box">
                    <strong>PROBLEMA RELATADO PELO MOTORISTA / DIAGNÓSTICO INICIAL:</strong>
                    <div style="margin-top: 5px; font-size: 14px;">${os.problema || 'Nenhum detalhe adicional informado.'}</div>
                </div>
                
                ${painelBorracharia}

                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px;">DESCRIÇÃO DE SERVIÇOS EXECUTADOS (A preencher pela Oficina)</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%;">Serviço Executado</th>
                            <th style="width: 15%;">Mecânico Resp.</th>
                            <th style="width: 15%;">Aplicação (Eixo/Comp)</th>
                            <th style="width: 10%;">Início</th>
                            <th style="width: 10%;">Fim</th>
                            <th style="width: 10%;">Total Hrs</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasServicos}
                    </tbody>
                </table>

                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px;">REQUISIÇÃO DE PEÇAS / MATERIAIS UTILIZADOS</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Código</th>
                            <th style="width: 65%;">Descrição da Peça / Material</th>
                            <th style="width: 20%;">Quantidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasPecas}
                    </tbody>
                </table>
                
                <div class="full-box" style="min-height: 60px;">
                    <strong>OBSERVAÇÕES GERAIS DA MANUTENÇÃO:</strong>
                </div>
                
                <div style="text-align: right; font-size: 11px; margin-top: 20px;">
                    O.S. Emitida eletronicamente por: <strong>${infoAbertoPor}</strong> via sistema CCOL.
                </div>

                <div class="assinaturas">
                    <div>
                        <div class="linha-assinatura">Assinatura do Motorista</div>
                    </div>
                    <div>
                        <div class="linha-assinatura">Assinatura Mecânico / Chefe Oficina</div>
                    </div>
                    <div>
                        <div class="linha-assinatura">Visto CCOL / Gestor Frota</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}


function renderizarTabelaFrotaManutencao() {
    const tbody = document.getElementById('tabelaFrotaManutencao');
    if (!tbody) return;

    tbody.innerHTML = frotasManutencao.map(f => `
        <tr>
            <td style="font-weight: bold; color: var(--ccol-blue-bright);">${f.cavalo}</td>
            <td>${f.go || '-'}</td>
            <td>${f.carreta1 || '-'}</td>
            <td>${f.carreta2 || '-'}</td>
            <td>${f.carreta3 || '-'}</td>
            <td>
                <button onclick="excluirFrotaManutencao(${f.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function excluirFrotaManutencao(id) {
    if (confirm("Excluir este vínculo de conjunto?")) {
        const { error } = await supabaseClient.from('frotas_manutencao').delete().eq('id', id);
        if (!error) {
            await carregarDadosOS();
            renderizarTabelaFrotaManutencao();
        } else {
            alert("Erro ao excluir.");
        }
    }
}

function renderizarRelatorioGerencialOS() {
    const osManutencao = ordensServico.filter(o => o.tipo !== 'Sinistro');

    if (osManutencao.length === 0) {
        document.getElementById('kpiTotalOS').innerText = '0';
        document.getElementById('kpiAbertasOS').innerText = '0';
        document.getElementById('kpiConcluidasOS').innerText = '0';
        document.getElementById('kpiTaxaOS').innerText = '0%';
        if(document.getElementById('kpiTempoMedioOS')) document.getElementById('kpiTempoMedioOS').innerText = '0h 0m';
        renderizarRelatorioDM();
        return;
    }

    const total = osManutencao.length;
    const abertas = osManutencao.filter(o => o.status === 'Aguardando Oficina' || o.status === 'Em Manutenção').length;
    const concluidas = osManutencao.filter(o => o.status === 'Concluída');
    const taxa = ((concluidas.length / total) * 100).toFixed(1);

    document.getElementById('kpiTotalOS').innerText = total;
    document.getElementById('kpiAbertasOS').innerText = abertas;
    document.getElementById('kpiConcluidasOS').innerText = concluidas.length;
    document.getElementById('kpiTaxaOS').innerText = taxa + '%';

    let tempoTotalMs = 0;
    let qtdValidas = 0;

    concluidas.forEach(o => {
        if (o.data_abertura && o.data_conclusao) {
            const inicio = new Date(o.data_abertura);
            const fim = new Date(o.data_conclusao);
            
            if (!isNaN(inicio) && !isNaN(fim) && fim > inicio) {
                tempoTotalMs += (fim - inicio);
                qtdValidas++;
            }
        }
    });

    let textoTempoMedio = '0h 0m';
    if (qtdValidas > 0) {
        const mediaMs = tempoTotalMs / qtdValidas;
        const mediaHoras = Math.floor(mediaMs / (1000 * 60 * 60));
        const mediaMinutos = Math.floor((mediaMs % (1000 * 60 * 60)) / (1000 * 60));
        textoTempoMedio = `${mediaHoras}h ${mediaMinutos}m`;
    }
    
    const elTempoMedio = document.getElementById('kpiTempoMedioOS');
    if (elTempoMedio) elTempoMedio.innerText = textoTempoMedio;

    const porCavalo = {};
    osManutencao.forEach(o => { porCavalo[o.placa] = (porCavalo[o.placa] || 0) + 1; });
    const topCavalos = Object.entries(porCavalo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const maxCavaloCount = topCavalos.length > 0 ? topCavalos[0][1] : 1;
    let htmlCavalos = '';
    topCavalos.forEach(([placa, qtd], index) => {
        const percent = (qtd / maxCavaloCount) * 100;
        let color = '#ef4444';
        if (index > 1) color = '#f59e0b';
        if (index > 3) color = 'var(--ccol-blue-bright)';
        
        htmlCavalos += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #e2e8f0;">
                    <strong>${index + 1}º ${placa}</strong>
                    <span>${qtd} O.S.</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 12px; overflow: hidden;">
                    <div style="background: ${color}; width: ${percent}%; height: 100%; border-radius: 4px;"></div>
                </div>
            </div>`;
    });
    document.getElementById('rankingCavalosOS').innerHTML = htmlCavalos || '<p>Sem dados.</p>';

    const porTipo = {};
    osManutencao.forEach(o => { porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1; });
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

    const porPrioridade = { 'Urgente': 0, 'Alta': 0, 'Normal': 0, 'Baixa': 0 };
    osManutencao.forEach(o => { if(porPrioridade[o.prioridade] !== undefined) porPrioridade[o.prioridade]++; });
    
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

    renderizarRelatorioDM();
}

function renderizarDisponibilidadeMecanica() {
    const tbody = document.getElementById('tabelaDisponibilidade');
    if (!tbody) return;

    let totalCavalos = frotasManutencao.length;
    let manutencao = 0;
    let sinistrados = 0;
    let disponiveis = 0;
    
    const filtroDataInput = document.getElementById('filtroDataDisponibilidade')?.value;
    const isTempoReal = !filtroDataInput; 
    let tituloH4 = document.getElementById('tituloTabelaDisponibilidade');
    
    if (tituloH4) {
        if (isTempoReal) {
            tituloH4.innerHTML = `Situação da Frota (Tempo Real - ${new Date().toLocaleDateString('pt-BR')})`;
        } else {
            const d = new Date(filtroDataInput + 'T12:00:00');
            tituloH4.innerHTML = `Histórico (Retrato do dia ${d.toLocaleDateString('pt-BR')})`;
        }
    }

    let linhasHtml = [];

    frotasManutencao.forEach(frota => {
        let status = 'Disponível';
        let osVinculada = null;
        let dataInicioParadaStr = '-';
        let descricaoMotivo = 'Operacional / Disponível';
        let tempoParadoTexto = '-';
        
        let dataAlvoInicio, dataAlvoFim;

        if (isTempoReal) {
            osVinculada = ordensServico.find(o => o.placa === frota.cavalo && o.status !== 'Concluída' && o.status !== 'Agendada');
            dataAlvoFim = new Date();
        } else {
            const dataFiltroStr = filtroDataInput;
            const fimDoDiaFiltro = new Date(dataFiltroStr + 'T23:59:59');
            dataAlvoFim = fimDoDiaFiltro;

            osVinculada = ordensServico.find(o => {
                if (o.placa !== frota.cavalo) return false;
                if (!o.data_abertura) return false;
                
                let osInicioStr = o.data_abertura;
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));

                if (osInicio > fimDoDiaFiltro) return false;

                if (o.status === 'Agendada' && o.data_conclusao === null) {
                    return false; 
                }

                if (o.status === 'Concluída' && o.data_conclusao) {
                    let osFimStr = o.data_conclusao;
                    if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                    const osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                    
                    if (osFim < fimDoDiaFiltro) {
                        return false;
                    }
                }

                return true; 
            });
        }

        if (osVinculada) {
            let osInicioStr = osVinculada.data_abertura;
            if (osInicioStr) {
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                dataAlvoInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                dataInicioParadaStr = dataAlvoInicio.toLocaleString('pt-BR');
                
                const diffMs = dataAlvoFim - dataAlvoInicio;
                if (diffMs > 0) {
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParadoTexto = `${diffHrs}h ${diffMin}m`;
                }
            }

            if (osVinculada.tipo === 'Sinistro' || osVinculada.status === 'Sinistrado') {
                status = 'Sinistrado';
                sinistrados++;
                descricaoMotivo = `[Sinistro] ${osVinculada.problema || 'Acidente/Avaria grave reportada'}`;
            } else {
                status = 'Oficina';
                manutencao++;
                descricaoMotivo = `[${osVinculada.tipo}] ${osVinculada.problema || 'Manutenção em andamento'}`;
            }
        } else {
            disponiveis++;
        }

        let bgRow = '';
        let statusBadge = `<span style="color: var(--ccol-green-bright); font-weight: bold;">✅ Disponível</span>`;
        if (status === 'Oficina') {
            bgRow = 'background: rgba(245, 158, 11, 0.05);';
            statusBadge = `<span style="color: #f59e0b; font-weight: bold;">🔧 Em Oficina</span>`;
        } else if (status === 'Sinistrado') {
            bgRow = 'background: rgba(239, 68, 68, 0.05);';
            statusBadge = `<span style="color: #ef4444; font-weight: bold;">🚨 Sinistrado</span>`;
        }

        linhasHtml.push({
            statusObj: status,
            html: `
            <tr style="${bgRow}">
                <td style="color: var(--ccol-blue-bright); font-weight: bold; font-size: 1.1rem;">${frota.cavalo}</td>
                <td>${frota.go || '-'}</td>
                <td>${statusBadge}</td>
                <td>${osVinculada ? `#${osVinculada.id}` : '-'}</td>
                <td>${dataInicioParadaStr}</td>
                <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${descricaoMotivo}">
                    ${descricaoMotivo}
                </td>
                <td style="color: #ef4444; font-weight: bold;">${tempoParadoTexto}</td>
            </tr>
            `
        });
    });

    linhasHtml.sort((a, b) => {
        const order = { 'Sinistrado': 1, 'Oficina': 2, 'Disponível': 3 };
        return order[a.statusObj] - order[b.statusObj];
    });

    tbody.innerHTML = linhasHtml.map(l => l.html).join('');

    const dmCalc = totalCavalos > 0 ? ((disponiveis / totalCavalos) * 100).toFixed(1) : 0;

    if (document.getElementById('kpiDispTotal')) document.getElementById('kpiDispTotal').innerText = totalCavalos;
    if (document.getElementById('kpiDispDisponiveis')) document.getElementById('kpiDispDisponiveis').innerText = disponiveis;
    if (document.getElementById('kpiDispManutencao')) document.getElementById('kpiDispManutencao').innerText = manutencao;
    if (document.getElementById('kpiDispSinistro')) document.getElementById('kpiDispSinistro').innerText = sinistrados;
    if (document.getElementById('kpiDispTaxa')) {
        const pTaxa = document.getElementById('kpiDispTaxa');
        pTaxa.innerText = dmCalc + '%';
        pTaxa.style.color = dmCalc >= 90 ? 'var(--ccol-green-bright)' : (dmCalc >= 80 ? '#f59e0b' : '#ef4444');
    }
}
function formatarDataHoraBrasil(dataString) {
    if (!dataString) return '-';
    if (dataString.includes('T')) {
        const [data, hora] = dataString.split('T');
        return data.split('-').reverse().join('/') + ' às ' + hora.substring(0, 5);
    }
    return dataString.split('-').reverse().join('/');
}

function renderizarRelatorioDM() {
    const tbody = document.getElementById('tabelaRelatorioDM');
    if (!tbody) return;

    const filtroValue = document.getElementById('filtroPeriodoDM').value;
    const agora = new Date();
    let inicioPeriodo;
    let totalMsPeriodo;
    let diasParaGrafico;

    // LÓGICA DO NOVO FILTRO (MÊS ATUAL VS DIAS CORRIDOS)
    if (filtroValue === 'mes_atual') {
        inicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        totalMsPeriodo = agora.getTime() - inicioPeriodo.getTime();
        diasParaGrafico = Math.ceil(totalMsPeriodo / (1000 * 60 * 60 * 24)); 
    } else {
        const dias = parseInt(filtroValue);
        totalMsPeriodo = dias * 24 * 60 * 60 * 1000;
        inicioPeriodo = new Date(agora.getTime() - totalMsPeriodo);
        diasParaGrafico = dias;
    }

    const totalHorasPeriodo = (totalMsPeriodo / (1000 * 60 * 60)).toFixed(1);

    let dmData = [];

    frotasManutencao.forEach(frota => {
        let manutencaoMs = 0;
        let statusAtual = `<span style="color: var(--ccol-green-bright); font-weight: bold;">✅ Disponível</span>`;
        
        const osAberta = ordensServico.find(o => o.placa === frota.cavalo && o.status !== 'Concluída');
        if (osAberta) {
             if (osAberta.tipo === 'Sinistro' || osAberta.status === 'Sinistrado') statusAtual = `<span style="color: #ef4444; font-weight: bold;">🚨 Sinistrado</span>`;
             else if (osAberta.status === 'Agendada') statusAtual = `<span style="color: #8b5cf6; font-weight: bold;">📅 Agendado</span>`;
             else statusAtual = `<span style="color: #f59e0b; font-weight: bold;">🔧 Em Oficina</span>`;
        }

        const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo);

        todasOSCavalo.forEach(os => {
            let osInicioStr = os.data_abertura;
            if (!osInicioStr) return; 

            if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
            const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
            let osFim = agora; 
            
            if (os.data_conclusao) {
                let osFimStr = os.data_conclusao;
                if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
            }

            const overlapInicio = osInicio > inicioPeriodo ? osInicio : inicioPeriodo;
            const overlapFim = osFim < agora ? osFim : agora;

            if (overlapInicio < overlapFim && os.status !== 'Agendada') { 
                manutencaoMs += (overlapFim - overlapInicio);
            }
        });

        if (manutencaoMs > totalMsPeriodo) manutencaoMs = totalMsPeriodo;

        const disponivelMs = totalMsPeriodo - manutencaoMs;
        const dmPercent = totalMsPeriodo > 0 ? ((disponivelMs / totalMsPeriodo) * 100).toFixed(2) : 100;
        
        const horasManutencao = Math.floor(manutencaoMs / (1000 * 60 * 60));
        const minManutencao = Math.floor((manutencaoMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const horasDisp = Math.floor(disponivelMs / (1000 * 60 * 60));
        const minDisp = Math.floor((disponivelMs % (1000 * 60 * 60)) / (1000 * 60));

        dmData.push({
            cavalo: frota.cavalo,
            totalHoras: `${totalHorasPeriodo}h`,
            manutencaoStr: `${horasManutencao}h ${minManutencao}m`,
            disponivelStr: `${horasDisp}h ${minDisp}m`,
            dm: parseFloat(dmPercent),
            statusAtual
        });
    });

    dmData.sort((a, b) => a.dm - b.dm);

    tbody.innerHTML = dmData.map(item => {
        let colorDM = 'var(--ccol-green-bright)'; 
        if (item.dm < 90) colorDM = '#f59e0b'; 
        if (item.dm < 80) colorDM = '#ef4444'; 

        return `
            <tr style="background: rgba(0,0,0,0.1);">
                <td style="color: var(--ccol-blue-bright); font-weight: bold; font-size: 1.1rem;">${item.cavalo}</td>
                <td style="color: var(--text-secondary);">${item.totalHoras}</td>
                <td style="color: #ef4444; font-weight: bold;">${item.manutencaoStr}</td>
                <td style="color: var(--ccol-green-bright);">${item.disponivelStr}</td>
                <td style="color: ${colorDM}; font-weight: 900; font-size: 1.2rem;">${item.dm}%</td>
                <td>${item.statusAtual}</td>
            </tr>
        `;
    }).join('');
    
    window.dmDataAtualExport = dmData;
    
    // Manda o valor do filtro selecionado para o gráfico da Oficina
    if(typeof renderizarGraficoEvolucaoDM === 'function') renderizarGraficoEvolucaoDM(filtroValue);

    // Manda o valor pro novo gráfico Operacional (Excel)  <--- ADICIONE ESTA LINHA:
    if(typeof renderizarGraficoOperacionalDM === 'function') renderizarGraficoOperacionalDM(filtroValue);
}


function exportarRelatorioDMExcel() {
    if (!window.dmDataAtualExport || window.dmDataAtualExport.length === 0) {
        alert("Não há dados de DM para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Placa Cavalo;Tempo Total Período;Tempo Manutenção;Tempo Disponível;Índice DM (%)\n";

    window.dmDataAtualExport.forEach(item => {
        const linha = [
            item.cavalo,
            item.totalHoras,
            item.manutencaoStr,
            item.disponivelStr,
            item.dm
        ].join(';');
        csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const periodo = document.getElementById('filtroPeriodoDM').options[document.getElementById('filtroPeriodoDM').selectedIndex].text;
    const nomeArquivo = `Relatorio_DM_${periodo.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("download", nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function entrarModoTV() {
    const mainScreen = document.getElementById('mainScreen');
    const painelTV = document.getElementById('telaPainelTV');
    
    mainScreen.style.display = 'none';
    painelTV.style.display = 'block';

    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Não foi possível entrar em modo tela cheia: ${err.message}`);
        });
    }

    if (tvInterval) clearInterval(tvInterval);
    
    renderizarCardsTV(); 
    
    tvInterval = setInterval(() => {
        carregarDadosOS().then(() => {
            renderizarCardsTV();
        });
    }, 15000); 

    atualizarRelogioTV();
    setInterval(atualizarRelogioTV, 1000);
}

function sairModoTV() {
    const mainScreen = document.getElementById('mainScreen');
    const painelTV = document.getElementById('telaPainelTV');
    
    if(tvInterval) clearInterval(tvInterval);

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
    }

    // ADICIONADOS IFs DE SEGURANÇA AQUI:
    if (painelTV) {
        painelTV.style.display = 'none';
    }
    if (mainScreen) {
        mainScreen.style.display = 'flex';
    }
}

function renderizarCardsTV() {
    const container = document.getElementById('tvCardsContainer');
    if (!container) return;

    const osAtivas = ordensServico.filter(o => 
        (o.status === 'Aguardando Oficina' || o.status === 'Em Manutenção') && 
        o.tipo !== 'Sinistro'
    );

    if (osAtivas.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
                <h1 style="color: var(--ccol-green-bright); font-size: 4rem; margin: 0;">PÁTIO VAZIO ✅</h1>
                <p style="color: #94a3b8; font-size: 2rem;">Nenhum veículo aguardando manutenção.</p>
            </div>
        `;
        return;
    }

    // Ordena as O.S. (As Urgentes primeiro, depois as que estão há mais tempo paradas)
    osAtivas.sort((a, b) => {
        const pesoPri = { 'Urgente': 4, 'Alta': 3, 'Normal': 2, 'Baixa': 1 };
        const pA = pesoPri[a.prioridade] || 0;
        const pB = pesoPri[b.prioridade] || 0;
        if (pA !== pB) return pB - pA;
        return new Date(a.data_abertura) - new Date(b.data_abertura);
    });

    const agora = new Date();

    container.innerHTML = osAtivas.map(os => {
        let corPrioridade = '#3b82f6'; 
        if (os.prioridade === 'Urgente') corPrioridade = '#ef4444';
        else if (os.prioridade === 'Alta') corPrioridade = '#f97316';
        else if (os.prioridade === 'Baixa') corPrioridade = '#10b981';

        const inicio = new Date(os.data_abertura);
        const diffMs = agora - inicio;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let colorCronometro = '#fff';
        let alertaClass = '';
        if (diffHrs >= 24) { colorCronometro = '#ef4444'; alertaClass = 'piscar-alerta'; } // Mais de 24h parado (Vermelho)
        else if (diffHrs >= 12) { colorCronometro = '#f59e0b'; } // Mais de 12h parado (Laranja)

        const frotaVinculada = frotasManutencao.find(f => f.cavalo === os.placa) || {};
        const conjuntosBadge = [frotaVinculada.carreta1, frotaVinculada.carreta2, frotaVinculada.carreta3]
            .filter(Boolean)
            .map(c => `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.2); margin-right: 5px;">${c}</span>`)
            .join('');

        let avisoPrevisao = '';
        if (os.previsao) {
            const dataPrevisao = new Date(os.previsao);
            if (agora > dataPrevisao) {
                avisoPrevisao = `<div style="background: #7f1d1d; color: #fca5a5; padding: 5px; text-align: center; font-weight: bold; border-radius: 4px; margin-top: 10px; font-size: 0.9rem;">⚠️ PREVISÃO DE ENTREGA VENCIDA</div>`;
            } else {
                avisoPrevisao = `<div style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; padding: 5px; text-align: center; border: 1px solid #8b5cf6; border-radius: 4px; margin-top: 10px; font-size: 0.9rem;">PREVISÃO: ${formatarDataHoraBrasil(os.previsao)}</div>`;
            }
        }

        const textoStatus = os.status === 'Em Manutenção' ? '🔧 EM OFICINA (ATENDIMENTO)' : '⏳ AGUARDANDO ATENDIMENTO';
        const bgStatus = os.status === 'Em Manutenção' ? '#1e3a8a' : '#1e293b'; 
        const borderStatus = os.status === 'Em Manutenção' ? '#3b82f6' : '#475569'; 

        return `
            <div class="${alertaClass}" style="background: ${bgStatus}; border: 3px solid ${borderStatus}; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 1rem; color: #94a3b8; margin-bottom: 5px;">O.S. #${os.id} | ${textoStatus}</div>
                        <div style="font-size: 3rem; font-weight: 900; color: #fff; line-height: 1;">${os.placa}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: ${corPrioridade}; color: #fff; font-weight: bold; padding: 5px 15px; border-radius: 20px; font-size: 1.1rem; text-transform: uppercase;">
                            ${os.prioridade}
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    ${conjuntosBadge}
                </div>

                <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 15px; margin-bottom: 15px; flex: 1;">
                    <div style="color: #60a5fa; font-weight: bold; font-size: 1.2rem; margin-bottom: 5px;">${os.tipo}</div>
                    <div style="color: #cbd5e1; font-size: 1.1rem;">Motorista: <strong style="color: #fff;">${os.motorista}</strong></div>
                    <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                        Detalhe: ${os.problema || 'Nenhum detalhe reportado'}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                    <div style="color: #94a3b8; font-size: 1rem;">
                        Entrada: <br><strong style="color: #fff;">${inicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</strong>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: #94a3b8;">TEMPO NO PÁTIO</div>
                        <div style="font-size: 2.2rem; font-weight: 900; color: ${colorCronometro}; font-family: monospace;">
                            ${String(diffHrs).padStart(2,'0')}:${String(diffMin).padStart(2,'0')}
                        </div>
                    </div>
                </div>

                ${avisoPrevisao}
            </div>
        `;
    }).join('');
}

function atualizarRelogioTV() {
    const elRelogio = document.getElementById('tvRelogio');
    const elData = document.getElementById('tvData');
    if (!elRelogio || !elData) return;

    const agora = new Date();
    elRelogio.innerText = agora.toLocaleTimeString('pt-BR');
    
    const opcoesData = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elData.innerText = agora.toLocaleDateString('pt-BR', opcoesData).toUpperCase();
}

function exportarDisponibilidadeExcel() {
    const tbody = document.getElementById('tabelaDisponibilidade');
    if (!tbody || tbody.rows.length === 0) {
        alert("Não há dados de disponibilidade para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Placa (Cavalo);GO;Status;OS Vinculada;Inicio Parada;Motivo / Diagnostico;Tempo Indisponivel\n";

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 7) {
            const linha = [
                `"${cols[0].innerText}"`,
                `"${cols[1].innerText}"`,
                `"${cols[2].innerText.replace('✅ ', '').replace('🔧 ', '').replace('🚨 ', '')}"`,
                `"${cols[3].innerText}"`,
                `"${cols[4].innerText}"`,
                `"${cols[5].innerText}"`,
                `"${cols[6].innerText}"`
            ].join(';');
            csvContent += linha + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const inputFiltro = document.getElementById('filtroDataDisponibilidade');
    const dataExcel = (inputFiltro && inputFiltro.value) ? inputFiltro.value : new Date().toISOString().split('T')[0];
    
    link.setAttribute("download", `Relatorio_Disponibilidade_${dataExcel}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
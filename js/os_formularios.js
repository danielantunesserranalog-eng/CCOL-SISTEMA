// ==================== js/os_formularios.js ====================
// Módulo de Formulários, Modais e Ações (Salvar, Editar, Excluir, Imprimir)

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

async function carregarSelectCavalosOS() {
    const select = document.getElementById('osPlaca');
    if (!select) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('frotas_manutencao')
            .select('cavalo')
            .order('cavalo', { ascending: true });

        if (error) throw error;

        let options = '<option value="">Selecione o Conjunto...</option>';
        if (data && data.length > 0) {
            data.forEach(f => {
                if (f.cavalo) {
                    options += `<option value="${f.cavalo.trim().toUpperCase()}">${f.cavalo.trim().toUpperCase()}</option>`;
                }
            });
        } else {
            options = '<option value="">Nenhum conjunto cadastrado...</option>';
        }
        
        select.innerHTML = options;
    } catch(e) {
        console.error("Erro ao carregar placas da frota na O.S:", e);
        select.innerHTML = '<option value="">Erro ao carregar placas</option>';
    }
}

async function salvarNovaOS() {
    const placa = document.getElementById('osPlaca').value.trim().toUpperCase();
    const motorista = document.getElementById('osMotorista').value;
    const modoEntrada = document.getElementById('osModoEntrada').value;
    let data_abertura = document.getElementById('osDataAbertura').value;
    const hodometro = document.getElementById('osHodometro').value.trim();
    const prioridade = document.getElementById('osPrioridade').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value.trim();
    const observacoes = document.getElementById('osObservacoes').value.trim();

    if (!placa || !data_abertura || !tipo) {
        alert("Preencha ao menos Placa, Data de Abertura e Tipo de Serviço.");
        return;
    }

    const dataSelecionada = new Date(data_abertura);
    const agora = new Date();
    
    if (modoEntrada === 'imediata' && dataSelecionada > agora) {
        alert("Modo Entrada Imediata selecionado, mas a data/hora colocada está no futuro.");
        return;
    }

    let statusInicial = 'Aguardando Oficina';
    if (modoEntrada === 'agendada') statusInicial = 'Agendada';
    else if (tipo === 'Sinistro') statusInicial = 'Sinistrado';

    let pacoteDadosOS = {
        placa: placa,
        data_abertura: data_abertura,
        prioridade: prioridade,
        tipo: tipo,
        status: statusInicial
    };

    // CAPTURANDO QUEM ESTÁ ABRINDO A O.S ATRAVÉS DO SISTEMA DE AUTENTICAÇÃO LOCAL
    try {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
            pacoteDadosOS.aberto_por = currentUser.username;
        } else {
            // Tenta resgatar da sessão salva no navegador caso o currentUser esteja vazio
            const sessaoSalva = localStorage.getItem('ccol_user_session');
            if (sessaoSalva) {
                const userObj = JSON.parse(sessaoSalva);
                if (userObj && userObj.username) {
                    pacoteDadosOS.aberto_por = userObj.username;
                }
            }
        }
    } catch (e) {
        console.warn("Não foi possível capturar o usuário logado automaticamente.", e);
    }

    if (motorista) pacoteDadosOS.motorista = motorista;
    if (observacoes) pacoteDadosOS.observacoes = observacoes;

    if (hodometro) {
        let apenasNumeros = hodometro.replace(/[^0-9]/g, '');
        if (apenasNumeros !== '') {
            pacoteDadosOS.hodometro = Number(apenasNumeros);
        }
    }

    let problemaFinal = problema;
    let pneuPosicao = '';
    let pneuServico = '';
    let pneuMotivo = '';
    
    if (tipo === 'Borracharia (PNEU)') {
        pneuPosicao = document.getElementById('osPneuPosicao').value.trim();
        pneuServico = document.getElementById('osPneuServico').value;
        pneuMotivo = document.getElementById('osPneuMotivo').value.trim();
        
        const textoPneu = `[PNEU] Posição: ${pneuPosicao || 'N/I'} | Serviço: ${pneuServico || 'N/I'} | Motivo: ${pneuMotivo || 'N/I'}`;
        problemaFinal = problemaFinal ? textoPneu + "\n" + problemaFinal : textoPneu;
    }

    if (problemaFinal) pacoteDadosOS.problema = problemaFinal;

    try {
        const { error } = await supabaseClient.from('ordens_servico').insert([pacoteDadosOS]);

        if (error) {
            console.error("ERRO SUPABASE DETALHADO:", error);
            alert("A Base de Dados recusou a gravação. Verifique os dados.");
            return;
        }
        
        await carregarDadosOS();
        
        if (tipo === 'Sinistro') alternarTelaOS('sinistro');
        else if (modoEntrada === 'agendada') alternarTelaOS('historico');
        else alternarTelaOS('lista');
        
    } catch (error) {
        console.error("Erro ao tentar salvar O.S:", error);
        alert("Falha na conexão ao tentar salvar a Ordem de Serviço.");
    }
}

function editarFrotaManutencao(id) {
    const frota = frotasManutencao.find(f => f.id === id);
    if (!frota) return;

    document.getElementById('osFrotaId').value = frota.id;
    document.getElementById('osFrotaCavalo').value = frota.cavalo || '';
    document.getElementById('osFrotaCor').value = frota.cor || '';
    document.getElementById('osFrotaGo').value = frota.go || '';
    document.getElementById('osFrotaCarreta1').value = frota.carreta1 || '';
    document.getElementById('osFrotaCarreta2').value = frota.carreta2 || '';
    document.getElementById('osFrotaCarreta3').value = frota.carreta3 || '';
    
    document.getElementById('osFrotaCavalo').focus();
}

async function salvarFrotaManutencao() {
    const id = document.getElementById('osFrotaId').value;
    const cavalo = document.getElementById('osFrotaCavalo').value.trim().toUpperCase();
    const cor = document.getElementById('osFrotaCor').value.trim();
    const go = document.getElementById('osFrotaGo').value.trim().toUpperCase();
    const carreta1 = document.getElementById('osFrotaCarreta1').value.trim().toUpperCase();
    const carreta2 = document.getElementById('osFrotaCarreta2').value.trim().toUpperCase();
    const carreta3 = document.getElementById('osFrotaCarreta3').value.trim().toUpperCase();

    if (!cavalo) {
        alert("A placa do cavalo é obrigatória.");
        return;
    }

    if (id) {
        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .update({ cavalo, cor, go, carreta1, carreta2, carreta3 })
            .eq('id', id);
        
        if (error) { alert("Erro ao atualizar o conjunto."); return; }
        alert("Vínculo atualizado com sucesso!");
    } else {
        const existente = frotasManutencao.find(f => f.cavalo === cavalo);
        if (existente) {
            alert("Já existe um conjunto cadastrado para esta placa de cavalo. Use a opção de editar (ícone do lápis).");
            return;
        }

        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .insert([{ cavalo, cor, go, carreta1, carreta2, carreta3 }]);
            
        if (error) { alert("Erro ao inserir o novo conjunto."); return; }
        alert("Vínculo salvo com sucesso!");
    }

    // Limpar os campos após salvar
    document.getElementById('osFrotaId').value = '';
    document.getElementById('osFrotaCavalo').value = '';
    document.getElementById('osFrotaCor').value = '';
    document.getElementById('osFrotaGo').value = '';
    document.getElementById('osFrotaCarreta1').value = '';
    document.getElementById('osFrotaCarreta2').value = '';
    document.getElementById('osFrotaCarreta3').value = '';

    await carregarDadosOS();
    renderizarTabelaFrotaManutencao();
}

async function excluirFrotaManutencao(id) {
    if (confirm("Excluir este conjunto da frota?")) {
        await supabaseClient.from('frotas_manutencao').delete().eq('id', id);
        await carregarDadosOS();
        renderizarTabelaFrotaManutencao();
    }
}

function exportarFrotaManutencaoExcel() {
    if (frotasManutencao.length === 0) {
        alert("Não há dados de frota para exportar.");
        return;
    }

    let csvContent = "\uFEFF"; // BOM para o Excel ler acentos
    csvContent += "Cavalo;Cor;GO;Carreta 1;Carreta 2;Carreta 3\n";

    frotasManutencao.forEach(f => {
        let linha = [
            f.cavalo || '',
            f.cor || '',
            f.go || '',
            f.carreta1 || '',
            f.carreta2 || '',
            f.carreta3 || ''
        ].join(";");
        csvContent += linha + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Cadastro_Frotas_OS.csv";
    link.click();
    URL.revokeObjectURL(url);
}

async function excluirOS(id) {
    if(confirm("Excluir esta O.S.?")) {
        await supabaseClient.from('ordens_servico').delete().eq('id', id);
        await carregarDadosOS();
        renderizarTabelaHistoricoOS();
    }
}

function abrirModalConclusaoOS(id) {
    osSelecionadaParaConclusao = id;
    const modal = document.getElementById('modalConclusaoOS');
    const inputHora = document.getElementById('horaConclusaoOS');

    const agora = new Date();
    const fusoAjuste = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000));
    if (inputHora) inputHora.value = fusoAjuste.toISOString().slice(0, 16);

    if (modal) modal.style.display = 'flex';
}

function fecharModalConclusaoOS() {
    osSelecionadaParaConclusao = null;
    const modal = document.getElementById('modalConclusaoOS');
    if (modal) modal.style.display = 'none';
}

async function salvarConclusaoOS() {
    if (!osSelecionadaParaConclusao) return;
    const inputHora = document.getElementById('horaConclusaoOS').value;

    if (!inputHora) {
        alert("Por favor, informe o horário de conclusão.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('ordens_servico')
            .update({
                status: 'Concluída',
                data_conclusao: inputHora
            })
            .eq('id', osSelecionadaParaConclusao);

        if (error) throw error;

        fecharModalConclusaoOS();
        await carregarDadosOS();
        
        if(typeof renderizarTabelaOS === 'function') renderizarTabelaOS();
        if(typeof renderizarTabelaSinistro === 'function') renderizarTabelaSinistro();
        
        alert("Ordem de Serviço concluída com sucesso!");

    } catch (error) {
        console.error("Erro ao concluir OS:", error);
        alert("Erro ao concluir a O.S.");
    }
}

function abrirModalServicoExtra(id) {
    osSelecionadaParaServicoExtra = id;
    const modal = document.getElementById('modalServicoExtra');
    const inputDesc = document.getElementById('extraServicoDescricao');
    const inputPrev = document.getElementById('extraServicoPrevisao');

    if (inputDesc) inputDesc.value = '';
    if (inputPrev) inputPrev.value = '';

    if (modal) modal.style.display = 'flex';
}

function fecharModalServicoExtra() {
    osSelecionadaParaServicoExtra = null;
    const modal = document.getElementById('modalServicoExtra');
    if (modal) modal.style.display = 'none';
}

async function salvarServicoExtra() {
    if (!osSelecionadaParaServicoExtra) return;

    const descricao = document.getElementById('extraServicoDescricao').value.trim();
    const previsao = document.getElementById('extraServicoPrevisao').value;

    if (!descricao && !previsao) {
        alert("Preencha ao menos a descrição do serviço extra ou a nova previsão.");
        return;
    }

    try {
        const osAtual = ordensServico.find(o => o.id === osSelecionadaParaServicoExtra);
        let novoProblema = osAtual.problema || '';
        
        if (descricao) {
            novoProblema += `\n[SERVIÇO EXTRA]: ${descricao}`;
        }

        const updateData = { problema: novoProblema };
        if (previsao) {
            updateData.previsao_entrega = previsao;
        }

        const { error } = await supabaseClient
            .from('ordens_servico')
            .update(updateData)
            .eq('id', osSelecionadaParaServicoExtra);

        if (error) throw error;

        fecharModalServicoExtra();
        await carregarDadosOS();
        
        if(typeof renderizarTabelaOS === 'function') renderizarTabelaOS();
        if(typeof renderizarTabelaSinistro === 'function') renderizarTabelaSinistro();
        
        alert("Atualização salva com sucesso!");

    } catch (error) {
        console.error("Erro ao adicionar serviço extra:", error);
        alert("Erro ao salvar serviço extra.");
    }
}

// =========================================================================
// LAYOUT DE IMPRESSÃO: COMPACTO, PRETO E BRANCO (TABULAR CLÁSSICO)
// =========================================================================
async function imprimirOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    
    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
    const infoAbertoPor = os.aberto_por || os.usuario || os.aberto_por || 'Não Informado';
    
    const numeroOSFormatado = String(os.id).padStart(4, '0');

    let dataAberturaFormatada = os.data_abertura;
    let dataConclusaoFormatada = os.data_conclusao || 'Em andamento';
    
    try {
        if(typeof formatarDataHoraBrasil === 'function') {
            dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
            if(os.data_conclusao) dataConclusaoFormatada = formatarDataHoraBrasil(os.data_conclusao);
        } else if (os.data_abertura) {
            dataAberturaFormatada = new Date(os.data_abertura).toLocaleString('pt-BR');
            if(os.data_conclusao) dataConclusaoFormatada = new Date(os.data_conclusao).toLocaleString('pt-BR');
        }
    } catch(e) {}
    
    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)') {
        painelBorracharia = `
            <div class="box-content" style="margin-top: 5px;">
                <strong>🛞 DETALHES DE BORRACHARIA:</strong>
                Posição: <b>${os.pneu_posicao || '-'}</b> &nbsp;|&nbsp; Serviço: <b>${os.pneu_servico || '-'}</b> &nbsp;|&nbsp; Motivo: <b>${os.pneu_motivo || '-'}</b>
            </div>
        `;
    }

    let linhasServicos = '';
    for(let i=0; i<5; i++) {
        linhasServicos += `
        <tr style="height: 25px;">
            <td></td>
            <td></td>
            <td style="text-align:center; font-size:10px; font-weight:bold;">1º(&nbsp;&nbsp;)&nbsp;&nbsp;2º(&nbsp;&nbsp;)&nbsp;&nbsp;3º(&nbsp;&nbsp;)</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    // ALTERAÇÃO AQUI: Adicionado a coluna de compartimentos na lista de Peças/Materiais
    let linhasPecas = '';
    for(let i=0; i<5; i++) {
        linhasPecas += `
        <tr style="height: 25px;">
            <td></td>
            <td></td>
            <td style="text-align:center; font-size:10px; font-weight:bold;">1º(&nbsp;&nbsp;)&nbsp;&nbsp;2º(&nbsp;&nbsp;)&nbsp;&nbsp;3º(&nbsp;&nbsp;)</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>OS ${os.placa} - #${numeroOSFormatado}</title>
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
                .header-left { padding: 10px; border-right: 2px solid #000; display: flex; align-items: center; font-weight: bold; font-size: 18px; }
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
                <div class="header-left">SERRANA LOG</div>
                <div class="header-center">
                    <h1>ORDEM DE SERVIÇO DE MANUTENÇÃO E FROTAS</h1>
                    <h2>CCOL - Centro de Controle Operacional Logístico</h2>
                </div>
                <div class="header-right">
                    O.S. Nº<br>
                    <strong>${numeroOSFormatado}</strong>
                </div>
            </div>

            <table class="info-table">
                <tr>
                    <td><strong>Cavalo:</strong> ${os.placa || '-'}</td>
                    <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                    <td><strong>Status:</strong> ${os.status}</td>
                    <td><strong>Emitido por :</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                </tr>
                <tr>
                    <td><strong>Motorista:</strong> ${os.motorista || '-'}</td>
                    <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                    <td><strong>Prioridade:</strong> ${os.prioridade}</td>
                    <td><strong>Tipo:</strong> ${os.tipo}</td>
                </tr>
            </table>

            <table style="margin-bottom: 5px;">
                <tr>
                    <td style="background-color: #f0f0f0; font-weight: bold; width: 20%; text-align: center;">Composição (Tritrem)</td>
                    <td style="width: 20%;"><strong>GO:</strong> ${frota.go || '-'}</td>
                    <td style="width: 20%;"><strong>1º Comp:</strong> ${frota.carreta1 || '-'}</td>
                    <td style="width: 20%;"><strong>2º Comp:</strong> ${frota.carreta2 || '-'}</td>
                    <td style="width: 20%;"><strong>3º Comp:</strong> ${frota.carreta3 || '-'}</td>
                </tr>
            </table>

            <div class="section-title">Diagnóstico Inicial do Condutor / Problema / Detalhes Sinistro</div>
            <div class="box-content">
                ${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}
            </div>

            ${painelBorracharia}

            <div class="section-title">Serviços Executados (Preenchimento da Oficina)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35%;">Descrição do Serviço</th>
                        <th style="width: 10%;">Início</th>
                        <th style="width: 15%;">Compartimentos</th>
                        <th style="width: 10%;">LD/LE (Eixo)</th>
                        <th style="width: 10%;">Placa</th>
                        <th style="width: 10%;">Mecânico</th>
                        <th style="width: 10%;">Fim</th>
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
                        <th style="width: 10%;">Código</th>
                        <th style="width: 35%;">Descrição da Peça / Material Utilizado</th>
                        <th style="width: 15%;">Compartimentos</th>
                        <th style="width: 5%;">Qtd</th>
                        <th style="width: 15%;">Data/Hora Solicit.</th>
                        <th style="width: 20%;">Data/Hora Retirada</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasPecas}
                </tbody>
            </table>

            <div class="section-title" style="border-bottom: 1px solid #000; margin-bottom: 0;">Observações Gerais / Pendências</div>
            <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;"></div>

            <div class="assinaturas">
                <div class="linha-ass">Motorista / Relator</div>
                <div class="linha-ass">Chefe de Oficina / Mecânico</div>
                <div class="linha-ass">CCOL / Gestor</div>
            </div>
            
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
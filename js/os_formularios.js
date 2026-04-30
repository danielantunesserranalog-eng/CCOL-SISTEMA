// ==================== js/os_formularios.js ====================
// Módulo de Formulários, Modais, Ações (Salvar, Editar, Excluir, Imprimir) e Filtros

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

    try {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
            pacoteDadosOS.aberto_por = currentUser.username;
        } else {
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

async function salvarFrotaManutencao() {
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

    const existente = frotasManutencao.find(f => f.cavalo === cavalo);
    if (existente) {
        alert("Já existe um conjunto cadastrado para esta placa de cavalo. Use a opção de editar (ícone do lápis) na tabela.");
        return;
    }

    const { error } = await supabaseClient
        .from('frotas_manutencao')
        .insert([{ cavalo, cor, go, carreta1, carreta2, carreta3 }]);
        
    if (error) { alert("Erro ao inserir o novo conjunto."); return; }

    alert("Vínculo salvo com sucesso!");
    document.getElementById('osFrotaCavalo').value = '';
    document.getElementById('osFrotaCor').value = '';
    document.getElementById('osFrotaGo').value = '';
    document.getElementById('osFrotaCarreta1').value = '';
    document.getElementById('osFrotaCarreta2').value = '';
    document.getElementById('osFrotaCarreta3').value = '';

    await carregarDadosOS();
    if(typeof renderizarTabelaFrotaManutencao === 'function') renderizarTabelaFrotaManutencao();
}

function editarFrotaManutencao(id) {
    const frota = frotasManutencao.find(f => f.id === id);
    if (!frota) return;

    document.getElementById('editFrotaId').value = frota.id;
    document.getElementById('editFrotaCavalo').value = frota.cavalo || '';
    document.getElementById('editFrotaCor').value = frota.cor || '';
    document.getElementById('editFrotaGo').value = frota.go || '';
    document.getElementById('editFrotaCarreta1').value = frota.carreta1 || '';
    document.getElementById('editFrotaCarreta2').value = frota.carreta2 || '';
    document.getElementById('editFrotaCarreta3').value = frota.carreta3 || '';
    
    document.getElementById('modalEditarFrota').style.display = 'flex';
}

function fecharModalEditarFrota() {
    document.getElementById('modalEditarFrota').style.display = 'none';
}

async function salvarEdicaoFrota() {
    const id = document.getElementById('editFrotaId').value;
    const cavalo = document.getElementById('editFrotaCavalo').value.trim().toUpperCase();
    const cor = document.getElementById('editFrotaCor').value.trim();
    const go = document.getElementById('editFrotaGo').value.trim().toUpperCase();
    const carreta1 = document.getElementById('editFrotaCarreta1').value.trim().toUpperCase();
    const carreta2 = document.getElementById('editFrotaCarreta2').value.trim().toUpperCase();
    const carreta3 = document.getElementById('editFrotaCarreta3').value.trim().toUpperCase();

    if (!cavalo) {
        alert("A placa do cavalo é obrigatória.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .update({ cavalo, cor, go, carreta1, carreta2, carreta3 })
            .eq('id', id);
            
        if (error) throw error;
        
        alert("Conjunto atualizado com sucesso!");
        fecharModalEditarFrota();
        
        await carregarDadosOS();
        if(typeof renderizarTabelaFrotaManutencao === 'function') renderizarTabelaFrotaManutencao();
    } catch(error) {
        console.error("Erro ao editar conjunto:", error);
        alert("Ocorreu um erro ao tentar salvar as alterações no banco de dados.");
    }
}

async function excluirFrotaManutencao(id) {
    if (confirm("Excluir este conjunto da frota?")) {
        await supabaseClient.from('frotas_manutencao').delete().eq('id', id);
        await carregarDadosOS();
        if(typeof renderizarTabelaFrotaManutencao === 'function') renderizarTabelaFrotaManutencao();
    }
}

function exportarFrotaManutencaoExcel() {
    if (frotasManutencao.length === 0) {
        alert("Não há dados de frota para exportar.");
        return;
    }
    let csvContent = "\uFEFF"; 
    csvContent += "Cavalo;Cor;Frota;Carreta 1;Carreta 2;Carreta 3\n";
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
        if(typeof renderizarTabelaHistoricoOS === 'function') renderizarTabelaHistoricoOS();
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

async function imprimirOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    
    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
    const infoAbertoPor = os.aberto_por || os.usuario || 'Não Informado';
    
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
                <strong>🛠️ DETALHES DE BORRACHARIA:</strong>
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
            <td style="text-align:center; font-size:10px; font-weight:bold;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
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
            <td style="text-align:center; font-size:10px; font-weight:bold;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
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
                    <td><strong>Conjunto (Cavalo):</strong> ${os.placa || '-'}</td>
                    <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                    <td><strong>Status:</strong> ${os.status}</td>
                    <td><strong>Emitido por :</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                </tr>
                <tr>
                    <td><strong>Motorista Solicitante:</strong> ${os.motorista || '-'}</td>
                    <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                    <td><strong>Prioridade:</strong> ${os.prioridade || '-'}</td>
                    <td><strong>Tipo de Serviço:</strong> ${os.tipo || '-'}</td>
                </tr>
                <tr>
                    <td><strong>Hodômetro:</strong> ${os.hodometro || '-'}</td>
                    <td colspan="3"></td>
                </tr>
            </table>
            <table style="margin-bottom: 5px;">
                <tr>
                    <td style="background-color: #f0f0f0; font-weight: bold; width: 20%; text-align: center;">Composição Atual</td>
                    <td style="width: 26%;"><strong>Frota:</strong> ${frota.go || '-'}</td>
                    <td style="width: 26%;"><strong>Carretas:</strong> ${frota.carreta1 || '-'} | ${frota.carreta2 || '-'} | ${frota.carreta3 || '-'}</td>
                    <td style="width: 28%;"><strong>Cor do Cavalo:</strong> ${frota.cor || '-'}</td>
                </tr>
            </table>
            ${painelBorracharia}
            <div class="section-title">Diagnóstico Inicial do Condutor / Problema</div>
            <div class="box-content">
                ${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}
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
            <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;">
                ${os.observacoes ? os.observacoes.replace(/\n/g, '<br>') : ''}
            </div>
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

window.imprimirTodasOSFiltradas = async function() {
    const numFilter = document.getElementById('filtroHistOSNum')?.value.trim();
    const placaFilter = document.getElementById('filtroHistPlaca')?.value;
    const motoristaFilter = document.getElementById('filtroHistMotorista')?.value;
    const tipoFilter = document.getElementById('filtroHistTipo')?.value;
    const mesAnoFilter = document.getElementById('filtroHistMesAno')?.value;
    const inicioFilter = document.getElementById('filtroHistDataInicio')?.value;
    const fimFilter = document.getElementById('filtroHistDataFim')?.value;

    let osParaImprimir = ordensServico.filter(os => {
        if (numFilter && os.id.toString() !== numFilter && (os.numero_os && os.numero_os.toString() !== numFilter)) return false;
        if (placaFilter && os.placa !== placaFilter) return false;
        if (motoristaFilter && os.motorista !== motoristaFilter) return false;
        if (tipoFilter && os.tipo !== tipoFilter) return false;

        if (mesAnoFilter && os.data_abertura) {
            const dataOs = new Date(os.data_abertura);
            const mesOs = String(dataOs.getMonth() + 1).padStart(2, '0');
            const anoOs = dataOs.getFullYear();
            if (`${mesOs}/${anoOs}` !== mesAnoFilter) return false;
        }

        if (inicioFilter || fimFilter) {
            const dataOs = new Date(os.data_abertura).toISOString().split('T')[0];
            if (inicioFilter && dataOs < inicioFilter) return false;
            if (fimFilter && dataOs > fimFilter) return false;
        }

        return true;
    });

    if (osParaImprimir.length === 0) {
        alert('Nenhuma O.S. encontrada com os filtros atuais para imprimir.');
        return;
    }

    if (osParaImprimir.length > 50) {
        if (!confirm(`Você está prestes a imprimir ${osParaImprimir.length} Ordens de Serviço de uma vez. Deseja continuar?`)) {
            return;
        }
    }

    let conteudoImpressao = '';
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    osParaImprimir.forEach((os, index) => {
        const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
        const infoAbertoPor = os.aberto_por || os.usuario || 'Não Informado';
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
                    <strong>🛠️ DETALHES DE BORRACHARIA:</strong>
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
                <td style="text-align:center; font-size:10px; font-weight:bold;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
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
                <td style="text-align:center; font-size:10px; font-weight:bold;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
        }

        // Estilo de quebra de página a partir da segunda O.S. em diante
        const pageBreak = index < osParaImprimir.length - 1 ? 'page-break-after: always;' : '';

        conteudoImpressao += `
            <div class="os-page" style="${pageBreak}">
                <div class="header-container">
                    <div class="header-left">
                        <img src="assets/logoverde.png" alt="Serrana Log">
                    </div>
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
                        <td><strong>Conjunto (Cavalo):</strong> ${os.placa || '-'}</td>
                        <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                        <td><strong>Status:</strong> ${os.status}</td>
                        <td><strong>Emitido por :</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Motorista Solicitante:</strong> ${os.motorista || '-'}</td>
                        <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                        <td><strong>Prioridade:</strong> ${os.prioridade || '-'}</td>
                        <td><strong>Tipo de Serviço:</strong> ${os.tipo || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Hodômetro:</strong> ${os.hodometro || '-'}</td>
                        <td colspan="3"></td>
                    </tr>
                </table>
                <table style="margin-bottom: 5px;">
                    <tr>
                        <td style="background-color: #f0f0f0; font-weight: bold; width: 20%; text-align: center;">Composição Atual</td>
                        <td style="width: 26%;"><strong>Frota:</strong> ${frota.go || '-'}</td>
                        <td style="width: 26%;"><strong>Carretas:</strong> ${frota.carreta1 || '-'} | ${frota.carreta2 || '-'} | ${frota.carreta3 || '-'}</td>
                        <td style="width: 28%;"><strong>Cor do Cavalo:</strong> ${frota.cor || '-'}</td>
                    </tr>
                </table>
                ${painelBorracharia}
                <div class="section-title">Diagnóstico Inicial do Condutor / Problema</div>
                <div class="box-content">
                    ${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}
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
                <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;">
                    ${os.observacoes ? os.observacoes.replace(/\n/g, '<br>') : ''}
                </div>
                <div class="assinaturas">
                    <div class="linha-ass">Motorista / Responsável</div>
                    <div class="linha-ass">Mecânico / Oficina</div>
                    <div class="linha-ass">CCOL / Gestor</div>
                </div>
            </div>
        `;
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <base href="${baseUrl}">
            <title>Impressão Lote - Ordens de Serviço</title>
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
                
                .os-page {
                    width: 100%;
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
            ${conteudoImpressao}
            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 500); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};


// =========================================================================
// FUNÇÕES DE EXPORTAÇÃO E CARREGAMENTO DE FILTROS RESTAURADAS
// =========================================================================

window.carregarFiltrosSelectHistoricoOS = function() {
    const selectPlaca = document.getElementById('filtroHistPlaca');
    const selectMotorista = document.getElementById('filtroHistMotorista');
    const selectMesAno = document.getElementById('filtroHistMesAno');

    if (selectPlaca && typeof ordensServico !== 'undefined') {
        let optionsPlaca = '<option value="">Todas as Placas</option>';
        const placasUnicas = [...new Set(ordensServico.map(os => os.placa))].filter(Boolean).sort();
        placasUnicas.forEach(p => optionsPlaca += `<option value="${p}">${p}</option>`);
        selectPlaca.innerHTML = optionsPlaca;
    }

    if (selectMotorista && typeof ordensServico !== 'undefined') {
        let optionsMot = '<option value="">Todos os Motoristas</option>';
        const motUnicos = [...new Set(ordensServico.map(os => os.motorista))].filter(Boolean).sort();
        motUnicos.forEach(m => optionsMot += `<option value="${m}">${m}</option>`);
        selectMotorista.innerHTML = optionsMot;
    }

    if (selectMesAno && typeof ordensServico !== 'undefined') {
        let optionsMes = '<option value="">Todos os Meses</option>';
        const mesesUnicos = new Set();
        ordensServico.forEach(os => {
            if (os.data_abertura) {
                const d = new Date(os.data_abertura);
                if(!isNaN(d)) {
                    const mesAno = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    mesesUnicos.add(mesAno);
                }
            }
        });
        [...mesesUnicos].sort((a,b) => {
            const [mA, yA] = a.split('/');
            const [mB, yB] = b.split('/');
            return yB - yA || mB - mA;
        }).forEach(ma => optionsMes += `<option value="${ma}">${ma}</option>`);
        selectMesAno.innerHTML = optionsMes;
    }
};

window.setFiltroMesAtualOS = function() {
    const agora = new Date();
    const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    const formatarData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const inputInicio = document.getElementById('filtroHistDataInicio');
    const inputFim = document.getElementById('filtroHistDataFim');
    
    if (inputInicio) inputInicio.value = formatarData(primeiroDia);
    if (inputFim) inputFim.value = formatarData(ultimoDia);

    if (typeof renderizarTabelaHistoricoOS === 'function') {
        renderizarTabelaHistoricoOS();
    }
};

window.exportarHistoricoOSExcel = function() {
    const table = document.querySelector('#telaHistoricoOS .data-table-modern');
    if (!table) {
        alert("Nenhuma tabela encontrada para exportar.");
        return;
    }
    let csvContent = "\uFEFF"; // Para garantir a acentuação correta no Excel
    const rows = table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length - 1; j++) { // Ignora a última coluna (Ações)
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        }
        csvContent += row.join(';') + "\n";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Historico_OS_${new Date().getTime()}.csv`;
    link.click();
};

window.exportarHistoricoOSPDF = function() {
    const table = document.querySelector('#telaHistoricoOS .data-table-modern');
    if (!table) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Histórico de O.S.</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                th { background-color: #f0f0f0; }
            </style>
        </head>
        <body>
            <h2>Histórico de Ordens de Serviço</h2>
            ${table.outerHTML}
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};
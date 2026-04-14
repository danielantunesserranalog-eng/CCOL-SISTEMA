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
        if (error) { alert("Erro ao atualizar."); return; }
    } else {
        const { error } = await supabaseClient
            .from('frotas_manutencao')
            .insert([{ cavalo, go, carreta1, carreta2, carreta3 }]);
        if (error) { alert("Erro ao inserir."); return; }
    }

    await carregarDadosOS();
    renderizarTabelaFrotaManutencao();
}

async function excluirFrotaManutencao(id) {
    if (confirm("Excluir vínculo?")) {
        await supabaseClient.from('frotas_manutencao').delete().eq('id', id);
        await carregarDadosOS();
        renderizarTabelaFrotaManutencao();
    }
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
// NOVO LAYOUT DE IMPRESSÃO: EXATAMENTE IGUAL AO PDF FORNECIDO
// =========================================================================
async function imprimirOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    
    // Busca dados do Tritrem na frota de manutenção
    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
    const go = frota.go || 'N/I';
    const c1 = frota.carreta1 || '-';
    const c2 = frota.carreta2 || '-';
    const c3 = frota.carreta3 || '-';

    let dataAberturaFormatada = os.data_abertura;
    let dataConclusaoFormatada = os.data_conclusao || 'Em andamento';
    
    try {
        if(typeof formatarDataHoraBrasil === 'function') {
            dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
            if(os.data_conclusao) dataConclusaoFormatada = formatarDataHoraBrasil(os.data_conclusao);
        }
    } catch(e) {}
    
    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)') {
        painelBorracharia = `
            <div style="margin-top:10px; padding: 5px; border: 1px dashed #000;">
                <strong>🛞 DETALHES DE BORRACHARIA:</strong>
                <p style="margin: 3px 0;">Posição: <b>${os.pneu_posicao || '-'}</b> | Serviço: <b>${os.pneu_servico || '-'}</b> | Motivo: <b>${os.pneu_motivo || '-'}</b></p>
            </div>
        `;
    }

    // Linhas da Tabela de Serviços (com o 1°() 2°() 3°() em todas as linhas como no modelo)
    let linhasServicos = '';
    for(let i=0; i<8; i++) {
        linhasServicos += `
        <tr style="height: 35px;">
            <td></td>
            <td></td>
            <td style="text-align:center; font-size:10px;">1°( ) 2°( ) 3°( )</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>OS ${os.placa}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; color: #000; }
                .header-title { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 5px; text-transform: uppercase; }
                .header-subtitle { text-align: center; font-size: 14px; margin-bottom: 25px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
                .info-line { margin-bottom: 10px; }
                .info-label { font-weight: bold; }
                
                .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 5px; }
                .box-diagnostico { padding: 5px; min-height: 40px; border-bottom: 1px solid #ccc; font-weight: bold; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; font-size: 11px; }
                th { text-align: center; font-weight: bold; }
                
                .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 70px; text-align: center; }
                .linha-ass { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">ORDEM DE SERVIÇO / OCORRÊNCIA - MANUTENÇÃO E FROTAS</div>
            <div class="header-subtitle">Serrana Florestal - CCOL</div>

            <div class="info-grid">
                <div>
                    <div class="info-line"><span class="info-label">Cavalo:</span> ${os.placa}</div>
                    <div class="info-line"><span class="info-label">Abertura:</span> ${dataAberturaFormatada}</div>
                </div>
                <div>
                    <div class="info-line"><span class="info-label">GO:</span> ${go}</div>
                    <div class="info-line"><span class="info-label">Conclusão:</span> ${dataConclusaoFormatada}</div>
                    <div class="info-line"><span class="info-label">Mecânico/Responsável:</span> A Definir</div>
                    <div class="info-line"><span class="info-label">Status:</span> ${os.status}</div>
                </div>
            </div>

            <div class="info-line">
                <span class="info-label">Composição do Tritrem (Carretas vinculadas):</span><br>
                1º Comp: ${c1} | 2° Comp: ${c2} | 3° Comp: ${c3}
            </div>

            <div class="info-line" style="margin-top: 15px;">
                <span class="info-label">Classificação da Manutenção / Tipo:</span> ${os.tipo}
            </div>

            <div class="section-title">Diagnóstico Inicial do Condutor / Problema / Detalhes Sinistro:</div>
            <div class="box-diagnostico">${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}</div>
            ${painelBorracharia}

            <div class="section-title">Serviços Executados (Preenchimento da Oficina):</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35%;">Descrição do Serviço</th>
                        <th style="width: 8%;">Hora<br>Início</th>
                        <th style="width: 15%;">Compartimentos<br>(Tritrem)</th>
                        <th style="width: 8%;">LD/LE<br>Eixo</th>
                        <th style="width: 12%;">PLACA</th>
                        <th style="width: 14%;">Mecânico</th>
                        <th style="width: 8%;">Hora<br>Fim</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasServicos}
                </tbody>
            </table>

            <div class="assinaturas">
                <div class="linha-ass">Motorista</div>
                <div class="linha-ass">Oficina</div>
                <div class="linha-ass">CCOL</div>
            </div>
            <script>window.onload = function(){ window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
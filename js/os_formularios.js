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

// CORREÇÃO DEFINITIVA: Busca os cavalos cadastrados na tabela de Manutenção ('frotas_manutencao')
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
    const hodometro = document.getElementById('osHodometro').value;
    const prioridade = document.getElementById('osPrioridade').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value.trim();
    const observacoes = document.getElementById('osObservacoes').value.trim();

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

    const dataSelecionada = new Date(data_abertura);
    const agora = new Date();
    
    if (modoEntrada === 'imediata' && dataSelecionada > agora) {
        alert("Modo Entrada Imediata selecionado, mas a data/hora colocada está no futuro.");
        return;
    }

    let statusInicial = 'Aguardando Oficina';
    if (modoEntrada === 'agendada') statusInicial = 'Agendada';
    else if (tipo === 'Sinistro') statusInicial = 'Sinistrado';

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
                criado_por: typeof currentUserEmail !== 'undefined' ? currentUserEmail : 'Sistema'
            }]);

        if (error) throw error;
        
        await carregarDadosOS();
        
        if (tipo === 'Sinistro') alternarTelaOS('sinistro');
        else if (modoEntrada === 'agendada') alternarTelaOS('historico');
        else alternarTelaOS('lista');
        
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

async function imprimirOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
    const numeroOSFormatado = String(os.id).padStart(5, '0');
    
    let dataAberturaFormatada = os.data_abertura;
    try {
        if(typeof formatarDataHoraBrasil === 'function') {
            dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
        }
    } catch(e) {}
    
    const infoAbertoPor = os.criado_por || 'Sistema CCOL';

    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)') {
        painelBorracharia = `
            <div class="full-box" style="border-color: #3b82f6; background: rgba(59, 130, 246, 0.05);">
                <strong>🛞 DETALHES DE BORRACHARIA:</strong>
                <p>Posição: <b>${os.pneu_posicao || '-'}</b> | Serviço: <b>${os.pneu_servico || '-'}</b> | Motivo: <b>${os.pneu_motivo || '-'}</b></p>
            </div>
        `;
    }

    let linhasServicos = '';
    for(let i=0; i<5; i++) {
        linhasServicos += `<tr style="height: 30px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ordem de Serviço #${numeroOSFormatado}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                .container { border: 2px solid #000; padding: 15px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
                .box { border: 1px solid #000; padding: 5px; }
                .box strong { display: block; font-size: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; text-align: center; }
                .linha { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>ORDEM DE SERVIÇO DE MANUTENÇÃO</h2>
                    <div style="text-align:right">Nº <b>${numeroOSFormatado}</b></div>
                </div>
                <div class="grid-4">
                    <div class="box"><strong>Abertura:</strong> ${dataAberturaFormatada}</div>
                    <div class="box"><strong>Prioridade:</strong> ${os.prioridade}</div>
                    <div class="box"><strong>Cavalo:</strong> ${os.placa}</div>
                    <div class="box"><strong>Motorista:</strong> ${os.motorista}</div>
                </div>
                ${painelBorracharia}
                <p><b>Diagnóstico:</b> ${os.problema || '-'}</p>
                <table>
                    <thead><tr><th>Serviço Executado</th><th>Mecânico</th><th>Eixo</th><th>Hrs</th></tr></thead>
                    <tbody>${linhasServicos}</tbody>
                </table>
                <div class="assinaturas">
                    <div class="linha">Motorista</div>
                    <div class="linha">Oficina</div>
                    <div class="linha">CCOL</div>
                </div>
            </div>
            <script>window.onload = function(){ window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
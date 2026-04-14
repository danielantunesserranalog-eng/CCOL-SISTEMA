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
// LAYOUT DE IMPRESSÃO ANTIGO: PADRÃO CCOL ORIGINAL RESTAURADO
// =========================================================================
async function imprimirOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    
    const frota = frotasManutencao.find(f => f.cavalo === os.placa) || {};
    const infoAbertoPor = typeof currentUserEmail !== 'undefined' ? currentUserEmail : (os.criado_por || 'Sistema CCOL');
    const numeroOSFormatado = String(os.id).padStart(4, '0');

    let dataAberturaFormatada = os.data_abertura;
    try {
        if(typeof formatarDataHoraBrasil === 'function') {
            dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
        } else if (os.data_abertura) {
            dataAberturaFormatada = new Date(os.data_abertura).toLocaleString('pt-BR');
        }
    } catch(e) {}
    
    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)') {
        painelBorracharia = `
            <div class="full-box">
                <strong>🛞 DETALHES DE BORRACHARIA:</strong>
                <div style="margin-top: 5px; font-size: 14px;">
                    Posição: <b>${os.pneu_posicao || '-'}</b> | Serviço: <b>${os.pneu_servico || '-'}</b> | Motivo: <b>${os.pneu_motivo || '-'}</b>
                </div>
            </div>
        `;
    }

    let linhasServicos = '';
    for(let i=0; i<8; i++) {
        linhasServicos += `
            <tr>
                <td style="height: 35px;"></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
    }

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
                    <img src="assets/logo.png" alt="Serrana Log" onerror="this.style.display='none'">
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
                    <div class="box"><strong>Motorista Solicitante / Relator:</strong> <span>${os.motorista || 'Não informado'}</span></div>
                    <div class="box"><strong>Km / Hodômetro Atual:</strong> <span>${os.hodometro || 'Não informado'}</span></div>
                </div>

                <div class="full-box">
                    <strong>PROBLEMA RELATADO PELO MOTORISTA / DIAGNÓSTICO INICIAL:</strong>
                    <div style="margin-top: 5px; font-size: 14px;">${os.problema ? os.problema.replace(/\n/g, '<br>') : 'Nenhum detalhe adicional informado.'}</div>
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
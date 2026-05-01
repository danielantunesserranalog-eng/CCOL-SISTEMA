// ==================== js/os_formularios.js ====================
// Módulo de Formulários, Modais, Ações (Salvar, Editar, Excluir, Filtros e Transferência)

window.togglePneuFields = function() {
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
};

window.mudarModoEntrada = function() {
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
};

window.carregarMotoristasSelectOS = async function() {
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
};

window.mudarTipoReferenciaOS = function() {
    const tipoRef = document.getElementById('osTipoReferencia').value;
    const selectPlaca = document.getElementById('osPlaca');
    const labelPlaca = document.getElementById('labelOsPlaca');
    const wrapperMotorista = document.getElementById('wrapperMotorista');
    const wrapperHodometro = document.getElementById('wrapperHodometro');
    
    if (!selectPlaca) return;
    
    selectPlaca.innerHTML = '<option value="">Selecione...</option>';
    
    if (!frotasManutencao || frotasManutencao.length === 0) {
        selectPlaca.innerHTML = '<option value="">Nenhum cadastro encontrado...</option>';
        return;
    }

    if (tipoRef === 'cavalo') {
        labelPlaca.innerText = 'Selecione o Cavalo (Conjunto Completo)';
        if(wrapperMotorista) wrapperMotorista.style.display = 'block';
        if(wrapperHodometro) wrapperHodometro.style.display = 'block';
        
        frotasManutencao.forEach(f => {
            if (f.cavalo) {
                const texto = `${f.cavalo.trim().toUpperCase()} ${f.go ? ' - ' + f.go : ''}`;
                selectPlaca.innerHTML += `<option value="${f.cavalo.trim().toUpperCase()}">${texto}</option>`;
            }
        });
    } else if (tipoRef === 'go') {
        labelPlaca.innerText = 'Selecione apenas o GO (Sem Cavalo)';
        if(wrapperMotorista) wrapperMotorista.style.display = 'none';
        if(wrapperHodometro) wrapperHodometro.style.display = 'none';
        
        const osMotorista = document.getElementById('osMotorista');
        const osHodometro = document.getElementById('osHodometro');
        if (osMotorista) osMotorista.value = '';
        if (osHodometro) osHodometro.value = '';
        
        const gosUnicos = [];
        frotasManutencao.forEach(f => {
            if (f.go && f.go.trim() !== '') {
                if (!gosUnicos.find(item => item.go.trim().toUpperCase() === f.go.trim().toUpperCase())) {
                    gosUnicos.push(f);
                }
            }
        });

        if (gosUnicos.length === 0) {
            selectPlaca.innerHTML = '<option value="">Nenhum GO cadastrado...</option>';
        } else {
            gosUnicos.forEach(f => {
                let carretas = [f.carreta1, f.carreta2, f.carreta3].filter(c => c && c.trim() !== '').join(' / ');
                let textoExibicao = `${f.go.trim().toUpperCase()} ${carretas ? '(' + carretas + ')' : ''}`;
                selectPlaca.innerHTML += `<option value="${f.go.trim().toUpperCase()}">${textoExibicao}</option>`;
            });
        }
    }
};

window.carregarSelectCavalosOS = async function() {
    if (typeof window.mudarTipoReferenciaOS === 'function') {
        window.mudarTipoReferenciaOS();
    }
};

window.salvarNovaOS = async function() {
    const tipoRef = document.getElementById('osTipoReferencia').value;
    const placa = document.getElementById('osPlaca').value.trim().toUpperCase();
    let motorista = document.getElementById('osMotorista').value;
    const modoEntrada = document.getElementById('osModoEntrada').value;
    let data_abertura = document.getElementById('osDataAbertura').value;
    const hodometro = document.getElementById('osHodometro').value.trim();
    const prioridade = document.getElementById('osPrioridade').value;
    const tipo = document.getElementById('osTipo').value;
    const problema = document.getElementById('osProblema').value.trim();
    const observacoes = document.getElementById('osObservacoes').value.trim();

    if (!placa || !data_abertura || !tipo) {
        alert("Preencha ao menos a Placa (Cavalo ou GO), Data de Abertura e Tipo de Serviço.");
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

    if (tipoRef === 'go' && !motorista) {
        motorista = 'N/A (APENAS GO)'; 
    }

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
    
    if (tipoRef === 'go') {
        const frotaObj = frotasManutencao.find(f => f.go && f.go.trim().toUpperCase() === placa);
        if (frotaObj) {
            let carretas = [frotaObj.carreta1, frotaObj.carreta2, frotaObj.carreta3].filter(c => c && c.trim() !== '').join(' / ');
            if (carretas) {
                problemaFinal = `[MANUTENÇÃO APENAS DO GO] Carretas atreladas: ${carretas}\n${problemaFinal}`;
            } else {
                problemaFinal = `[MANUTENÇÃO APENAS DO GO]\n${problemaFinal}`;
            }
        }
    }
    
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
            alert(`Erro na gravação (400).\nDetalhes do Supabase: ${error.message}\nSe disser "Foreign key constraint", vá ao painel e retire a restrição da coluna "placa".`);
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
};

window.salvarFrotaManutencao = async function() {
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
};

window.editarFrotaManutencao = function(id) {
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
};

window.fecharModalEditarFrota = function() {
    document.getElementById('modalEditarFrota').style.display = 'none';
};

window.salvarEdicaoFrota = async function() {
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
};

window.excluirFrotaManutencao = async function(id) {
    if (confirm("Excluir este conjunto da frota?")) {
        await supabaseClient.from('frotas_manutencao').delete().eq('id', id);
        await carregarDadosOS();
        if(typeof renderizarTabelaFrotaManutencao === 'function') renderizarTabelaFrotaManutencao();
    }
};

window.abrirModalTransferenciaFrota = function(idOriginal) {
    const frotaOrigem = frotasManutencao.find(f => f.id === idOriginal);
    if (!frotaOrigem) return;
    document.getElementById('transfFrotaOrigemId').value = frotaOrigem.id;
    document.getElementById('transfFrotaOrigemText').innerText = frotaOrigem.cavalo;

    const selectDestino = document.getElementById('selectFrotaDestino');
    selectDestino.innerHTML = '<option value="">Selecione o Cavalo de Destino...</option>';
    frotasManutencao.forEach(f => {
        if (f.id !== frotaOrigem.id) {
            selectDestino.innerHTML += `<option value="${f.id}">${f.cavalo}</option>`;
        }
    });
    document.getElementById('modalTransferenciaFrota').style.display = 'flex';
};

window.fecharModalTransferenciaFrota = function() {
    document.getElementById('modalTransferenciaFrota').style.display = 'none';
};

window.confirmarTransferenciaFrota = async function() {
    const idOrigem = document.getElementById('transfFrotaOrigemId').value;
    const idDestino = document.getElementById('selectFrotaDestino').value;

    if (!idDestino) {
        alert("Selecione um Cavalo de destino.");
        return;
    }

    const frotaOrigem = frotasManutencao.find(f => String(f.id) === String(idOrigem));
    const frotaDestino = frotasManutencao.find(f => String(f.id) === String(idDestino));

    if (!frotaOrigem || !frotaDestino) return;

    try {
        const origGo = frotaOrigem.go;
        const origC1 = frotaOrigem.carreta1;
        const origC2 = frotaOrigem.carreta2;
        const origC3 = frotaOrigem.carreta3;

        const destGo = frotaDestino.go;
        const destC1 = frotaDestino.carreta1;
        const destC2 = frotaDestino.carreta2;
        const destC3 = frotaDestino.carreta3;

        await supabaseClient.from('frotas_manutencao').update({
            go: destGo, carreta1: destC1, carreta2: destC2, carreta3: destC3
        }).eq('id', frotaOrigem.id);

        await supabaseClient.from('frotas_manutencao').update({
            go: origGo, carreta1: origC1, carreta2: origC2, carreta3: origC3
        }).eq('id', frotaDestino.id);

        alert("Transferência de composição realizada com sucesso!");
        fecharModalTransferenciaFrota();
        await carregarDadosOS();
        if(typeof renderizarTabelaFrotaManutencao === 'function') renderizarTabelaFrotaManutencao();
    } catch (e) {
        console.error("Erro na transferência:", e);
        alert("Erro ao transferir frota.");
    }
};

window.exportarFrotaManutencaoExcel = function() {
    if (frotasManutencao.length === 0) {
        alert("Não há dados de frota para exportar.");
        return;
    }
    let csvContent = "\uFEFF"; 
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
};

window.excluirOS = async function(id) {
    if(confirm("Excluir esta O.S.?")) {
        await supabaseClient.from('ordens_servico').delete().eq('id', id);
        await carregarDadosOS();
        if(typeof renderizarTabelaHistoricoOS === 'function') renderizarTabelaHistoricoOS();
    }
};

window.abrirModalConclusaoOS = function(id) {
    osSelecionadaParaConclusao = id;
    const modal = document.getElementById('modalConclusaoOS');
    const inputHora = document.getElementById('horaConclusaoOS');
    const agora = new Date();
    const fusoAjuste = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000));
    if (inputHora) inputHora.value = fusoAjuste.toISOString().slice(0, 16);
    if (modal) modal.style.display = 'flex';
};

window.fecharModalConclusaoOS = function() {
    osSelecionadaParaConclusao = null;
    const modal = document.getElementById('modalConclusaoOS');
    if (modal) modal.style.display = 'none';
};

window.salvarConclusaoOS = async function() {
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
};

window.abrirModalServicoExtra = function(id) {
    osSelecionadaParaServicoExtra = id;
    const modal = document.getElementById('modalServicoExtra');
    const inputDesc = document.getElementById('extraServicoDescricao');
    const inputPrev = document.getElementById('extraServicoPrevisao');
    
    if (inputDesc) inputDesc.value = '';
    if (inputPrev) inputPrev.value = '';
    
    if (modal) modal.style.display = 'flex';
};

window.fecharModalServicoExtra = function() {
    osSelecionadaParaServicoExtra = null;
    const modal = document.getElementById('modalServicoExtra');
    if (modal) modal.style.display = 'none';
};

window.salvarServicoExtra = async function() {
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
};

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
    let csvContent = "\uFEFF";
    const rows = table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length - 1; j++) {
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
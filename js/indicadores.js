let graficoFrota;
let graficoManutencao;

window.carregarDadosDashboard = async function() {
    inicializarGraficos();
    await atualizarPonteiros();
    carregarControladorAtual();
    carregarFrentesTv();
    carregarOcorrenciasTv();
}

window.atualizarRelogio = function() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    
    const elHora = document.getElementById('dash-hora');
    const elData = document.getElementById('dash-data');
    if(elHora) elHora.textContent = `${horas}:${minutos}:${segundos}`;
    if(elData) elData.textContent = `${dia}/${mes}/${ano}`;

    let turno = "Turno Dia";
    if (agora.getHours() >= 18 || agora.getHours() < 6) turno = "Turno Noite";
    const elTurno = document.getElementById('dash-turno');
    if(elTurno) elTurno.textContent = turno;
}

function inicializarGraficos() {
    const baseConfig = {
        series: [{
            type: 'gauge',
            startAngle: 210, 
            endAngle: -30,
            min: 0,
            max: 100,
            splitNumber: 5,
            itemStyle: { color: '#38bdf8' },
            progress: { show: true, width: 14, roundCap: true },
            pointer: { show: true, length: '75%', width: 5, itemStyle: { color: '#ffffff' } },
            axisLine: { roundCap: true, lineStyle: { width: 14, color: [[1, '#1e293b']] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: { show: false }, 
            data: [{ value: 0 }]
        }]
    };

    const domFrota = document.getElementById('gauge-frota');
    if (domFrota) {
        graficoFrota = echarts.init(domFrota);
        baseConfig.series[0].itemStyle.color = '#38bdf8'; 
        graficoFrota.setOption(baseConfig);
    }

    const domManut = document.getElementById('gauge-manutencao');
    if (domManut) {
        graficoManutencao = echarts.init(domManut);
        let configManut = JSON.parse(JSON.stringify(baseConfig));
        configManut.series[0].itemStyle.color = '#ef4444'; 
        graficoManutencao.setOption(configManut);
    }

    window.addEventListener('resize', () => {
        if(graficoFrota) graficoFrota.resize();
        if(graficoManutencao) graficoManutencao.resize();
    });
}

async function atualizarPonteiros() {
    let totalPlacasCadastradas = 0;
    let totalManutencao = 0;
    let totalOcorrencias = 0;

    // 1. Busca total de Frotas (Contando as PLACAS dentro de cada conjunto)
    try {
        const { data: conjuntosData, error } = await supabaseClient.from('conjuntos').select('caminhoes');
        if (!error && conjuntosData) {
            conjuntosData.forEach(conj => {
                // Verifica se a coluna caminhões existe e é um array
                if (conj.caminhoes && Array.isArray(conj.caminhoes)) {
                    totalPlacasCadastradas += conj.caminhoes.length;
                } else if (typeof conj.caminhoes === 'string') {
                    // Caso tenha sido salvo como string JSON
                    try {
                        const arr = JSON.parse(conj.caminhoes);
                        if (Array.isArray(arr)) totalPlacasCadastradas += arr.length;
                    } catch(e) {}
                }
            });
        }
    } catch (e) { console.error("Erro na busca de Placas:", e); }

    // 2. Busca Manutenções Pendentes
    try {
        const queryManutencao = await supabaseClient.from('ordens_servico').select('*', { count: 'exact', head: true }).neq('status', 'Concluída');
        if(queryManutencao.count !== null) totalManutencao = queryManutencao.count;
    } catch (e) { console.error("Erro na busca de Manutenções:", e); }

    // 3. Busca Ocorrências Pendentes
    try {
        const queryOcorrencias = await supabaseClient.from('dashboard_ocorrencias').select('*', { count: 'exact', head: true }).eq('status', 'Pendente');
        if(queryOcorrencias.count !== null) totalOcorrencias = queryOcorrencias.count;
    } catch (e) { console.error("Erro na busca de Ocorrencias:", e); }


    // CÁLCULO DE DISPONIBILIDADE: Placas Totais - Manutenções - Ocorrências
    let frotaDisponivel = totalPlacasCadastradas - totalManutencao - totalOcorrencias;
    if(frotaDisponivel < 0) frotaDisponivel = 0;

    // Atualiza os ponteiros (O máximo do gráfico se ajusta baseado na frota total)
    if(graficoFrota) {
        let maxFrota = totalPlacasCadastradas < 20 ? 20 : totalPlacasCadastradas + 10;
        graficoFrota.setOption({ series: [{ max: maxFrota, data: [{ value: frotaDisponivel }] }] });
    }
    if(graficoManutencao) {
        let maxManut = totalPlacasCadastradas > 0 ? totalPlacasCadastradas : 20;
        graficoManutencao.setOption({ series: [{ max: maxManut, data: [{ value: totalManutencao }] }] });
    }

    // Atualiza os textos na tela
    const elFrotaDisp = document.getElementById('texto-frota-disponivel');
    const elFrotaTotal = document.getElementById('texto-frota-total');
    const elManut = document.getElementById('texto-manut-total');
    const elOcorrencias = document.getElementById('kpi-ocorrencias');

    if(elFrotaDisp) elFrotaDisp.textContent = frotaDisponivel;
    if(elFrotaTotal) elFrotaTotal.textContent = totalPlacasCadastradas;
    if(elManut) elManut.textContent = totalManutencao;
    if(elOcorrencias) elOcorrencias.textContent = totalOcorrencias;
}

async function carregarControladorAtual() {
    const { data } = await supabaseClient.from('dashboard_status').select('controlador').limit(1);
    const nome = (data && data.length > 0 && data[0].controlador) ? data[0].controlador : 'NÃO DEFINIDO';
    document.getElementById('dash-controlador-nome').textContent = nome;
    document.getElementById('configControlador').value = nome === 'NÃO DEFINIDO' ? '' : nome;
}

window.salvarControladorDash = async function() {
    const nome = document.getElementById('configControlador').value;
    const { data } = await supabaseClient.from('dashboard_status').select('id').limit(1);
    if(data && data.length > 0) {
        await supabaseClient.from('dashboard_status').update({ controlador: nome }).eq('id', data[0].id);
        carregarControladorAtual();
    }
}

async function carregarFrentesTv() {
    const { data } = await supabaseClient.from('frentes_trabalho').select('*').eq('status', 'Ativa');
    const container = document.getElementById('lista-frentes-tv');
    const containerConfig = document.getElementById('config-lista-frentes');
    
    if (data && data.length > 0) {
        document.getElementById('kpi-frentes').textContent = data.length;
        container.innerHTML = ''; containerConfig.innerHTML = '';
        data.forEach(f => {
            container.innerHTML += `<div class="pro-list-item"><i class="fas fa-check-circle text-green"></i> <div class="item-text">${f.nome}</div></div>`;
            containerConfig.innerHTML += `<div class="mini-item"><span>${f.nome}</span> <button class="btn-remover-mini" onclick="removerFrenteDash('${f.id}')"><i class="fas fa-trash"></i></button></div>`;
        });
    } else {
        document.getElementById('kpi-frentes').textContent = '0';
        container.innerHTML = '<div class="empty-state">Nenhuma frente ativa.</div>';
        containerConfig.innerHTML = '';
    }
}

async function carregarOcorrenciasTv() {
    const { data } = await supabaseClient.from('dashboard_ocorrencias').select('*').eq('status', 'Pendente');
    const containerConfig = document.getElementById('config-lista-ocorrencias');
    
    if (data && data.length > 0) {
        containerConfig.innerHTML = '';
        data.forEach(o => {
            containerConfig.innerHTML += `<div class="mini-item"><span><strong>${o.tipo}:</strong> ${o.descricao}</span> <button class="btn-remover-mini text-green" onclick="removerOcorrenciaDash('${o.id}')"><i class="fas fa-check"></i></button></div>`;
        });
    } else {
        containerConfig.innerHTML = '';
    }
    // Re-calcula e movimenta o ponteiro das frotas quando uma ocorrência é carregada
    atualizarPonteiros();
}

window.abrirConfigDash = () => document.getElementById('modalConfigDash').style.display = 'flex';
window.fecharConfigDash = () => document.getElementById('modalConfigDash').style.display = 'none';

window.addFrenteDash = async function() {
    const nome = document.getElementById('novaFrenteInput').value;
    if(!nome) return;
    await supabaseClient.from('frentes_trabalho').insert([{ nome: nome }]);
    document.getElementById('novaFrenteInput').value = '';
    carregarFrentesTv();
}
window.removerFrenteDash = async function(id) {
    await supabaseClient.from('frentes_trabalho').update({ status: 'Inativa' }).eq('id', id);
    carregarFrentesTv();
}
window.addOcorrenciaDash = async function() {
    const tipo = document.getElementById('novaOcorrenciaTipo').value;
    const desc = document.getElementById('novaOcorrenciaDesc').value;
    if(!desc) return;
    await supabaseClient.from('dashboard_ocorrencias').insert([{ tipo: tipo, descricao: desc }]);
    document.getElementById('novaOcorrenciaDesc').value = '';
    carregarOcorrenciasTv();
}
window.removerOcorrenciaDash = async function(id) {
    await supabaseClient.from('dashboard_ocorrencias').update({ status: 'Resolvido' }).eq('id', id);
    carregarOcorrenciasTv();
}

window.exportarDashboardPNG = function() {
    const elemento = document.getElementById('area-print-dash');
    const botaoPrint = document.getElementById('btn-gerar-print');
    const botaoFlutuante = document.getElementById('btn-floating-config');
    
    botaoPrint.style.display = 'none';
    if(botaoFlutuante) botaoFlutuante.style.display = 'none';
    
    html2canvas(elemento, { 
        backgroundColor: '#070b14',
        scale: 2,
        useCORS: true 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `CCOL_Operacao_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        botaoPrint.style.display = 'flex';
        if(botaoFlutuante) botaoFlutuante.style.display = 'block';
    });
}
window.carregarDadosDashboardSerrana = async function() {
    await atualizarPonteirosSerrana();
    carregarControladorAtualSerrana();
    carregarFrentesTvSerrana();
    carregarOcorrenciasTvSerrana();
    
    // Pequeno atraso para garantir que a tela HTML carregou as larguras corretas
    setTimeout(() => {
        renderizarGraficoEvolucaoDmSerrana();
    }, 300);
    
    setInterval(() => {
        carregarOcorrenciasTvSerrana(); 
        renderizarGraficoEvolucaoDmSerrana(); 
    }, 60000); 

    if(typeof atualizarFrentesDeTrabalhoSerrana === 'function') {
        atualizarFrentesDeTrabalhoSerrana();
        setInterval(atualizarFrentesDeTrabalhoSerrana, 60000);
    }
}

window.atualizarRelogioSerrana = function() {
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
}

window.atualizarFrentesDeTrabalhoSerrana = function() {
    const agora = new Date();
    const hora = agora.getHours();
    
    const elTurnoBarText = document.getElementById('dash-turno');
    const elTurnoBarIcon = document.getElementById('dash-turno-icon');
    const elTurnoBarContainer = document.getElementById('container-barra-turno');

    if (hora >= 6 && hora < 18) {
        if(elTurnoBarText) { elTurnoBarText.textContent = "TURNO: 06:00 às 18:00"; elTurnoBarText.style.color = "#ffffff"; }
        if(elTurnoBarIcon) elTurnoBarIcon.className = "fas fa-sun";
        if(elTurnoBarContainer) elTurnoBarContainer.style.borderLeftColor = "#f59e0b";
    } else {
        if(elTurnoBarText) { elTurnoBarText.textContent = "TURNO: 18:00 às 06:00"; elTurnoBarText.style.color = "#ffffff"; }
        if(elTurnoBarIcon) elTurnoBarIcon.className = "fas fa-moon";
        if(elTurnoBarContainer) elTurnoBarContainer.style.borderLeftColor = "#38bdf8";
    }
}

async function atualizarPonteirosSerrana() {
    let totalPlacasCadastradas = 0;
    let totalManutencao = 0;
    let totalOcorrencias = 0;

    try {
        const { data: conjuntosData, error } = await supabaseClient.from('conjuntos').select('caminhoes');
        if (!error && conjuntosData) {
            conjuntosData.forEach(conj => {
                if (conj.caminhoes && Array.isArray(conj.caminhoes)) {
                    totalPlacasCadastradas += conj.caminhoes.length;
                } else if (typeof conj.caminhoes === 'string') {
                    try {
                        const arr = JSON.parse(conj.caminhoes);
                        if (Array.isArray(arr)) totalPlacasCadastradas += arr.length;
                    } catch(e) {}
                }
            });
        }
    } catch (e) { console.error("Erro Placas Serrana:", e); }

    try {
        const { data: osData, error: osError } = await supabaseClient
            .from('ordens_servico')
            .select('status');
            
        if (!osError && osData) {
            totalManutencao = osData.filter(os => 
                os.status === 'Aguardando Oficina' || os.status === 'Em Manutenção'
            ).length;
        }
    } catch (e) { console.error("Erro O.S. Serrana:", e); }

    try {
        const { count } = await supabaseClient.from('dashboard_ocorrencias').select('*', { count: 'exact', head: true }).eq('status', 'Pendente');
        totalOcorrencias = count || 0;
    } catch (e) { console.error("Erro Sinistros Serrana:", e); }

    let frotaDisponivel = totalPlacasCadastradas - totalManutencao - totalOcorrencias;
    if(frotaDisponivel < 0) frotaDisponivel = 0;

    const elGaugeFill = document.getElementById('gauge-fill-frota');
    const elPonteiro = document.getElementById('gauge-ponteiro-frota'); 

    if (elGaugeFill && totalPlacasCadastradas > 0) {
        const perc = (frotaDisponivel / totalPlacasCadastradas) * 100;
        const fillRotation = -225 + (1.8 * perc);
        elGaugeFill.style.transform = `rotate(${fillRotation}deg)`;

        if (elPonteiro) {
            const ponteiroRotation = -90 + (1.8 * perc);
            elPonteiro.style.transform = `translateX(-50%) rotate(${ponteiroRotation}deg)`;
        }
    } else {
        if (elGaugeFill) elGaugeFill.style.transform = `rotate(-225deg)`;
        if (elPonteiro) elPonteiro.style.transform = `translateX(-50%) rotate(-90deg)`;
    }

    const elFrotaDisp = document.getElementById('texto-frota-disponivel');
    const elFrotaTotal = document.getElementById('texto-frota-total');
    const elManut = document.getElementById('texto-manut-total');
    const elOcorrencias = document.getElementById('kpi-ocorrencias');

    if(elFrotaDisp) elFrotaDisp.textContent = frotaDisponivel;
    if(elFrotaTotal) elFrotaTotal.textContent = totalPlacasCadastradas;
    if(elManut) elManut.textContent = totalManutencao;
    if(elOcorrencias) elOcorrencias.textContent = totalOcorrencias;
}

async function carregarControladorAtualSerrana() {
    const { data } = await supabaseClient.from('dashboard_status').select('controlador').limit(1);
    const nome = (data && data.length > 0 && data[0].controlador) ? data[0].controlador : 'NÃO DEFINIDO';
    document.getElementById('dash-controlador-nome').textContent = nome;
    document.getElementById('configControlador').value = nome === 'NÃO DEFINIDO' ? '' : nome;
}

window.salvarControladorDashSerrana = async function() {
    const nome = document.getElementById('configControlador').value;
    const { data } = await supabaseClient.from('dashboard_status').select('id').limit(1);
    if(data && data.length > 0) {
        await supabaseClient.from('dashboard_status').update({ controlador: nome }).eq('id', data[0].id);
        carregarControladorAtualSerrana();
    }
}

async function carregarFrentesTvSerrana() {
    try {
        const { data } = await supabaseClient.from('frentes_trabalho').select('*').eq('status', 'Ativa');
        
        const containerNovo = document.getElementById('kpi-lista-frentes-nomes');
        const containerConfig = document.getElementById('config-lista-frentes');
        const elKpiFrentes = document.getElementById('kpi-frentes');
        
        if (data && data.length > 0) {
            if(elKpiFrentes) elKpiFrentes.textContent = data.length;
            
            let htmlCaixinhas = '';
            let htmlConfig = '';
            
            data.forEach(f => {
                htmlCaixinhas += `
                <div style="background: rgba(34, 197, 94, 0.15); padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; border: 1px solid rgba(34, 197, 94, 0.4); display: flex; align-items: center; gap: 10px; color: #22c55e; text-align: left; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 6px;">
                    <i class="fas fa-truck-loading" style="font-size: 1.1rem;"></i> 
                    <span style="flex-grow: 1;">${f.nome}</span>
                </div>`;
                
                htmlConfig += `<div class="mini-item"><span>${f.nome}</span> <button class="btn-remover-mini" onclick="removerFrenteDashSerrana('${f.id}')"><i class="fas fa-trash"></i></button></div>`;
            });
            
            if(containerNovo) containerNovo.innerHTML = htmlCaixinhas;
            if(containerConfig) containerConfig.innerHTML = htmlConfig;
            
        } else {
            if(elKpiFrentes) elKpiFrentes.textContent = '0';
            const msgVazia = '<div class="empty-state" style="font-size: 0.85rem; color: #94a3b8; font-weight: bold;">Nenhuma frente ativa.</div>';
            if(containerNovo) containerNovo.innerHTML = msgVazia;
            if(containerConfig) containerConfig.innerHTML = '';
        }
    } catch(e) { console.error("Erro Frentes:", e); }
}

// =========================================================================
// GRÁFICO EVOLUÇÃO DIÁRIA DA DISPONIBILIDADE MECÂNICA (DM) SERRANA
// =========================================================================
async function renderizarGraficoEvolucaoDmSerrana() {
    const chartDom = document.getElementById('graficoEvolucaoDmSerrana');
    if (!chartDom) return;

    try {
        // 1. Busca total da frota
        const { data: conjuntosData } = await supabaseClient.from('conjuntos').select('caminhoes');
        let frotas = [];
        if (conjuntosData) {
            conjuntosData.forEach(conj => {
                if (conj.caminhoes && Array.isArray(conj.caminhoes)) {
                    frotas.push(...conj.caminhoes);
                } else if (typeof conj.caminhoes === 'string') {
                    try {
                        const arr = JSON.parse(conj.caminhoes);
                        if (Array.isArray(arr)) frotas.push(...arr);
                    } catch(e) {}
                }
            });
        }
        frotas = [...new Set(frotas)]; // Remove duplicações

        if(frotas.length === 0) {
            chartDom.innerHTML = '<div class="empty-state">Sem dados de frota para calcular DM.</div>';
            return;
        }

        // 2. Busca todas O.S. (Ignorando as 'Agendadas')
        const { data: osData } = await supabaseClient.from('ordens_servico').select('placa, data_abertura, data_conclusao, status').neq('status', 'Agendada');
        let ordensServico = osData || [];

        // 3. Cálculo de intersecção de tempo Diário (00:00 até 23:59)
        const agora = new Date();
        const categoriasDias = [];
        const dadosDM = [];
        const msPorDia = 24 * 60 * 60 * 1000;
        const totalMsDisponivelPorDia = frotas.length * msPorDia;
        
        const diasARenderizar = 15; 

        for (let i = diasARenderizar - 1; i >= 0; i--) {
            const dataDia = new Date(agora.getTime() - (i * msPorDia));
            const inicioDia = new Date(dataDia.getFullYear(), dataDia.getMonth(), dataDia.getDate(), 0, 0, 0);
            const fimDia = new Date(dataDia.getFullYear(), dataDia.getMonth(), dataDia.getDate(), 23, 59, 59, 999);
            
            let msManutencaoNesteDia = 0;

            frotas.forEach(placa => {
                let manutencaoCavalo = 0;
                const todasOSCavalo = ordensServico.filter(o => o.placa === placa);
                
                todasOSCavalo.forEach(os => {
                    // Proteção extra contra datas inválidas no banco
                    let osInicioStr = String(os.data_abertura || '');
                    if (!osInicioStr || osInicioStr === 'null') return; 
                    if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                    
                    const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                    
                    let osFim = agora;
                    if (os.data_conclusao && os.data_conclusao !== 'null') {
                        let osFimStr = String(os.data_conclusao);
                        if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                        osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                    }

                    // Se a data for inválida, pula
                    if (isNaN(osInicio.getTime())) return;

                    const overlapInicio = osInicio > inicioDia ? osInicio : inicioDia;
                    const overlapFim = osFim < fimDia ? osFim : fimDia;

                    if (overlapInicio < overlapFim) {
                        manutencaoCavalo += (overlapFim - overlapInicio);
                    }
                });
                
                if (manutencaoCavalo > msPorDia) manutencaoCavalo = msPorDia;
                msManutencaoNesteDia += manutencaoCavalo;
            });

            let dispNesteDia = totalMsDisponivelPorDia - msManutencaoNesteDia;
            if(dispNesteDia < 0) dispNesteDia = 0;
            
            let percentDM = 100;
            if (totalMsDisponivelPorDia > 0) {
                percentDM = (dispNesteDia / totalMsDisponivelPorDia) * 100;
            }
            
            categoriasDias.push(`${String(dataDia.getDate()).padStart(2,'0')}/${String(dataDia.getMonth()+1).padStart(2,'0')}`);
            dadosDM.push(percentDM.toFixed(1));
        }

        // 4. Injeta os dados no ECharts
        if (typeof echarts === 'undefined') {
            chartDom.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erro: Biblioteca de gráficos ECharts não encontrada.</div>';
            return;
        }

        // LIMPA QUALQUER TEXTO ANTES DE RENDERIZAR
        chartDom.innerHTML = '';

        let myChart = echarts.getInstanceByDom(chartDom);
        if (!myChart) myChart = echarts.init(chartDom);

        const option = {
            tooltip: { 
                trigger: 'axis', 
                formatter: '{b} <br/> DM Serrana: <b>{c}%</b>', 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                borderColor: '#38bdf8',
                textStyle: { color: '#fff' } 
            },
            grid: { left: '3%', right: '4%', bottom: '5%', top: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: categoriasDias,
                axisLabel: { color: '#94a3b8', fontWeight: 'bold' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { formatter: '{value}%', color: '#94a3b8' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
            },
            series: [{
                name: 'DM Diário',
                type: 'line',
                data: dadosDM,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textBorderColor: 'rgba(0,0,0,0.8)',
                    textBorderWidth: 2
                },
                itemStyle: { color: '#38bdf8' },
                lineStyle: { width: 3, color: '#38bdf8' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(56, 189, 248, 0.4)' },
                        { offset: 1, color: 'rgba(56, 189, 248, 0)' }
                    ])
                }
            }]
        };

        myChart.setOption(option);
        
        window.removeEventListener('resize', myChart.resize);
        window.addEventListener('resize', () => myChart.resize());
        
    } catch(e) {
        console.error("Erro Crítico DM Serrana:", e);
        // Em caso de erro, mostramos o motivo real na tela
        if (chartDom) {
            chartDom.innerHTML = `<div class="empty-state" style="color:#ef4444; font-size:0.9rem;">Falha ao desenhar gráfico: ${e.message}</div>`;
        }
    }
}

async function carregarOcorrenciasTvSerrana() {
    const { data } = await supabaseClient.from('dashboard_ocorrencias').select('*').eq('status', 'Pendente');
    const containerConfig = document.getElementById('config-lista-ocorrencias');
    if (data && data.length > 0) {
        let htmlOcorrencias = '';
        data.forEach(o => {
            htmlOcorrencias += `<div class="mini-item"><span><strong>${o.tipo}:</strong> ${o.descricao}</span> <button class="btn-remover-mini text-green" onclick="removerOcorrenciaDashSerrana('${o.id}')"><i class="fas fa-check"></i></button></div>`;
        });
        containerConfig.innerHTML = htmlOcorrencias;
    } else {
        if(containerConfig) containerConfig.innerHTML = '';
    }
    atualizarPonteirosSerrana();
}

window.abrirConfigDashSerrana = () => document.getElementById('modalConfigDash').style.display = 'flex';
window.fecharConfigDashSerrana = () => document.getElementById('modalConfigDash').style.display = 'none';

window.addFrenteDashSerrana = async function() {
    const nome = document.getElementById('novaFrenteInput').value;
    if(!nome) return;
    await supabaseClient.from('frentes_trabalho').insert([{ nome: nome }]);
    document.getElementById('novaFrenteInput').value = '';
    carregarFrentesTvSerrana();
}
window.removerFrenteDashSerrana = async function(id) {
    await supabaseClient.from('frentes_trabalho').update({ status: 'Inativa' }).eq('id', id);
    carregarFrentesTvSerrana();
}
window.addOcorrenciaDashSerrana = async function() {
    const tipo = document.getElementById('novaOcorrenciaTipo').value;
    const desc = document.getElementById('novaOcorrenciaDesc').value;
    if(!desc) return;
    await supabaseClient.from('dashboard_ocorrencias').insert([{ tipo: tipo, descricao: desc }]);
    document.getElementById('novaOcorrenciaDesc').value = '';
    carregarOcorrenciasTvSerrana();
}
window.removerOcorrenciaDashSerrana = async function(id) {
    await supabaseClient.from('dashboard_ocorrencias').update({ status: 'Resolvido' }).eq('id', id);
    carregarOcorrenciasTvSerrana();
}

window.exportarDashboardPNGSerrana = function() {
    const elemento = document.getElementById('area-print-dash');
    const botaoPrint = document.getElementById('btn-gerar-print');
    const botaoFlutuante = document.getElementById('btn-floating-config');
    
    botaoPrint.style.display = 'none';
    if(botaoFlutuante) botaoFlutuante.style.display = 'none';
    
    html2canvas(elemento, { 
        backgroundColor: '#070b14', 
        scale: 4, 
        useCORS: true,
        logging: false 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `CCOL_SERRANA_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png'); 
        link.click(); 
        
        botaoPrint.style.display = 'flex';
        if(botaoFlutuante) botaoFlutuante.style.display = 'block';
    });
}
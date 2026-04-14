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
// GRÁFICO EVOLUÇÃO DIÁRIA (POR HORA) DA DISPONIBILIDADE MECÂNICA (DM) 
// =========================================================================
async function renderizarGraficoEvolucaoDmSerrana() {
    const chartDom = document.getElementById('graficoEvolucaoDmSerrana');
    if (!chartDom) return;

    try {
        // 1. Busca total da frota para saber qual é o 100% de disponibilidade
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
        
        // Exemplo: Descobre que existem 30 frotas no total
        const totalFrotas = [...new Set(frotas)].length; 

        if(totalFrotas === 0) {
            chartDom.innerHTML = '<div class="empty-state">Sem dados de frota para calcular DM.</div>';
            return;
        }

        // 2. Busca TODAS as O.S. e Sinistros
        const { data: osData } = await supabaseClient.from('ordens_servico').select('placa, data_abertura, data_conclusao, status').neq('status', 'Agendada');
        let ordensServico = osData || [];

        // 3. Busca a quantidade de Sinistros Pendentes (Frotas que estão paradas fora da oficina)
        const { count: countSinistros } = await supabaseClient.from('dashboard_ocorrencias').select('*', { count: 'exact', head: true }).eq('status', 'Pendente');
        const qtdSinistrosPendentes = countSinistros || 0;

        // 4. Lógica de cálculo Hora a Hora
        const agora = new Date();
        const categoriasHoras = [];
        const dadosDM = [];
        const msPorHora = 60 * 60 * 1000; 
        
        // Se temos 30 caminhões, temos 30 "horas disponíveis" em cada intervalo de 1 hora
        const totalMsDisponivelPorHora = totalFrotas * msPorHora; 
        
        // Função para garantir que não haja erros de digitação nas placas
        const limpaPlaca = p => String(p || 'DESCONHECIDO').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const placasEmOS = [...new Set(ordensServico.map(os => limpaPlaca(os.placa)))];

        // Loop de 00:00 até 23:59
        for (let h = 0; h < 24; h++) {
            const inicioHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, 0, 0, 0);
            const fimHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, 59, 59, 999);
            
            let msManutencaoNestaHora = 0;

            // Para cada placa que tem O.S. aberta
            placasEmOS.forEach(placaOS => {
                let tempoParadoDoCavalo = 0;
                const osDesteCavalo = ordensServico.filter(o => limpaPlaca(o.placa) === placaOS);
                
                osDesteCavalo.forEach(os => {
                    let osInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0); 
                    if (os.data_abertura && os.data_abertura !== 'null') {
                        let osInicioStr = String(os.data_abertura);
                        if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                        osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                    } else if (os.status === 'Concluída' || os.status === 'Resolvido') {
                        return; // O.S velha e já fechada
                    }
                    
                    let osFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
                    if (os.data_conclusao && os.data_conclusao !== 'null') {
                        let osFimStr = String(os.data_conclusao);
                        if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                        osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                    }

                    if (isNaN(osInicio.getTime())) osInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);

                    const overlapInicio = osInicio > inicioHora ? osInicio : inicioHora;
                    const overlapFim = osFim < fimHora ? osFim : fimHora;

                    if (overlapInicio < overlapFim) {
                        tempoParadoDoCavalo += (overlapFim - overlapInicio);
                    }
                });
                
                // Limita a 1 hora de manutenção por caminhão dentro dessa janela de 60 minutos
                if (tempoParadoDoCavalo > msPorHora) tempoParadoDoCavalo = msPorHora;
                msManutencaoNestaHora += tempoParadoDoCavalo;
            });

            // SOMA AS HORAS PERDIDAS POR SINISTROS (Ex: 1 sinistro = 1 caminhão parado aquela hora inteira)
            msManutencaoNestaHora += (qtdSinistrosPendentes * msPorHora);

            let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
            if(dispNestaHora < 0) dispNestaHora = 0;
            
            let percentDM = 100;
            if (totalMsDisponivelPorHora > 0) {
                percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
            }
            
            categoriasHoras.push(`${String(h).padStart(2,'0')}:00`);
            
            // Oculta a linha no gráfico se a hora ainda não chegou
            if (inicioHora > agora) {
                dadosDM.push(null); 
            } else {
                dadosDM.push(percentDM.toFixed(1));
            }
        }

        if (typeof echarts === 'undefined') return;

        // --- CORREÇÃO AQUI: Removemos o chartDom.innerHTML = ''; ---
        let myChart = echarts.getInstanceByDom(chartDom);
        if (!myChart) {
            myChart = echarts.init(chartDom);
            
            // O Evento de redimensionar agora só é criado uma única vez
            window.addEventListener('resize', () => {
                if(myChart) myChart.resize();
            });
        }

        const option = {
            tooltip: { 
                trigger: 'axis', 
                formatter: '{b} <br/> DM da Hora: <b>{c}%</b>', 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                borderColor: '#38bdf8',
                textStyle: { color: '#fff' } 
            },
            grid: { left: '3%', right: '4%', bottom: '5%', top: '25%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: categoriasHoras,
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
                name: 'DM Hora',
                type: 'line',
                data: dadosDM,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    color: '#e2e8f0', 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    distance: 6
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

        // setOption atualiza o gráfico nativamente, sem destruir a div
        myChart.setOption(option);
        
    } catch(e) {
        console.error("Erro Crítico DM Serrana:", e);
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
// js/dm_operacional.js

async function processarImportacaoDM(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert("A biblioteca de Excel ainda está carregando. Aguarde alguns segundos e tente novamente.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Pega os dados sem converter automaticamente para evitar conflitos de fuso horário
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const registrosParaSalvar = [];
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0 || !row[0]) continue;

            let dataStr = row[0];
            let rodou = parseInt(row[1]) || 0;
            let total = parseInt(row[2]) || 0;
            let dataFormatada = null;

            // TRATAMENTO DE DATA À PROVA DE FALHAS
            if (typeof dataStr === 'number') {
                // Excel salva data como número serial. A conta abaixo converte pra UTC real.
                const dateObj = new Date((dataStr - 25569) * 86400 * 1000);
                const d = dateObj.getUTCDate();
                const m = dateObj.getUTCMonth() + 1;
                const y = dateObj.getUTCFullYear();
                dataFormatada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            } else if (typeof dataStr === 'string') {
                // Se o Excel leu como texto (DD/MM/YYYY)
                const strTratada = dataStr.trim().replace(/-/g, '/');
                const partes = strTratada.split('/');
                if (partes.length >= 3) {
                    let ano = partes[2].substring(0, 4); // Previne caso tenha horas na string
                    if (ano.length === 2) ano = '20' + ano;
                    dataFormatada = `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                }
            }

            // Apenas envia pro banco se a data tiver o formato correto "YYYY-MM-DD"
            if (dataFormatada && dataFormatada.length === 10 && dataFormatada.startsWith('20')) {
                registrosParaSalvar.push({
                    data_registro: dataFormatada,
                    carros_rodaram: rodou,
                    total_frota: total
                });
            }
        }

        if (registrosParaSalvar.length === 0) {
            alert("Nenhum dado válido encontrado. O padrão é: Data (DD/MM/AAAA) | Rodaram | Total.");
            document.getElementById('uploadDMExcel').value = "";
            return;
        }

        try {
            // UPSERT: Graças ao 'onConflict: data_registro', ele atualiza a linha se o dia já existir!
            const { error } = await supabaseClient
                .from('dm_operacional')
                .upsert(registrosParaSalvar, { onConflict: 'data_registro' });

            if (error) throw error;
            
            alert(`✅ Sucesso! ${registrosParaSalvar.length} dias atualizados/importados.`);
            
            // Força a re-renderização do gráfico
            const chartDiv = document.getElementById('graficoDmOperacional');
            if (chartDiv) chartDiv.removeAttribute('data-rendered');
            window.renderizarGraficoDMOperacional();
            
        } catch (error) {
            console.error("Erro na importação:", error);
            alert("Erro ao salvar no banco. Motivo: " + error.message);
        }
        
        document.getElementById('uploadDMExcel').value = "";
    };
    reader.readAsArrayBuffer(file);
}

window.renderizarGraficoDMOperacional = async function() {
    const divGrafico = document.getElementById('graficoDmOperacional');
    if (!divGrafico || divGrafico.offsetWidth === 0) return;

    try {
        // CORREÇÃO AQUI: Puxa os 30 MAIS RECENTES (ascending: false)
        const { data, error } = await supabaseClient
            .from('dm_operacional')
            .select('*')
            .order('data_registro', { ascending: false })
            .limit(30);

        if (error) {
            divGrafico.innerHTML = `<div style="color:#ef4444; display:flex; justify-content:center; align-items:center; height:100%; font-weight:bold; text-align:center; padding: 20px;">🚨 Erro ao ler banco de dados. Motivo: ${error.message}</div>`;
            return;
        }

        if (!data || data.length === 0) {
            divGrafico.innerHTML = `<div style="color:#94a3b8; display:flex; justify-content:center; align-items:center; height:100%; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; text-align:center; padding: 20px;">📂 Nenhum dado operacional encontrado.<br>Vá no Painel de Controle e importe a planilha Excel para gerar o gráfico.</div>`;
            return;
        }

        divGrafico.innerHTML = '';
        
        // CORREÇÃO AQUI: Inverte o array para a linha do gráfico fluir da esquerda pra direita (cronológico)
        const dadosOrdenados = data.reverse();

        const eixoXDias = [];
        const eixoYPorcentagem = [];

        dadosOrdenados.forEach(reg => {
            const partes = reg.data_registro.split('-');
            const formatada = `${partes[2]}/${partes[1]}`; // Extrai apenas Dia/Mês
            eixoXDias.push(formatada);
            
            let pct = 0;
            if (reg.total_frota > 0) {
                pct = (reg.carros_rodaram / reg.total_frota) * 100;
            }
            eixoYPorcentagem.push(pct.toFixed(1));
        });

        if (typeof echarts === 'undefined') return;

        const chart = echarts.init(divGrafico);
        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: '{b}<br/>DM Operacional: <b>{c}%</b>',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderColor: '#10b981',
                textStyle: { color: '#fff' }
            },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: eixoXDias,
                axisLabel: { color: '#94a3b8' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
            },
            series: [{
                name: 'DM Operacional',
                type: 'line',
                data: eixoYPorcentagem,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                label: {
                    show: true,
                    position: 'top',
                    color: '#10b981',
                    formatter: '{c}%',
                    fontSize: 10
                },
                itemStyle: { color: '#10b981' },
                lineStyle: { color: '#10b981', width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                    ])
                }
            }]
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());

    } catch (err) {
        console.error("Erro interno do gráfico", err);
    }
}

// Observador inteligente
setInterval(() => {
    const divGrafico = document.getElementById('graficoDmOperacional');
    if (divGrafico && divGrafico.offsetWidth > 0 && !divGrafico.getAttribute('data-rendered')) {
        divGrafico.setAttribute('data-rendered', 'true');
        window.renderizarGraficoDMOperacional();
    }
}, 1000);
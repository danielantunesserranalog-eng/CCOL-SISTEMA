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
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const registrosParaSalvar = [];
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0 || !row[0]) continue;

            let dataStr = row[0];
            let rodou = parseInt(row[1]) || 0;
            let total = parseInt(row[2]) || 0;
            let dataFormatada = null;

            if (typeof dataStr === 'number') {
                const dateObj = new Date((dataStr - 25569) * 86400 * 1000);
                const d = dateObj.getUTCDate();
                const m = dateObj.getUTCMonth() + 1;
                const y = dateObj.getUTCFullYear();
                dataFormatada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            } else if (typeof dataStr === 'string') {
                const strTratada = dataStr.trim().replace(/-/g, '/');
                const partes = strTratada.split('/');
                if (partes.length >= 3) {
                    let ano = partes[2].substring(0, 4);
                    if (ano.length === 2) ano = '20' + ano;
                    dataFormatada = `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                }
            }

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
            // Upsert: Atualiza se a data já existir
            const { error } = await supabaseClient
                .from('dm_operacional')
                .upsert(registrosParaSalvar, { onConflict: 'data_registro' });

            if (error) throw error;
            
            alert(`✅ Sucesso! ${registrosParaSalvar.length} dias atualizados/importados.`);
            
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
        const { data, error } = await supabaseClient
            .from('dm_operacional')
            .select('*')
            .order('data_registro', { ascending: false })
            .limit(30);

        if (error) {
            divGrafico.innerHTML = `<div style="color:#ef4444; display:flex; justify-content:center; align-items:center; height:100%; font-weight:bold; text-align:center; padding: 20px;">🚨 Erro ao ler banco de dados: ${error.message}</div>`;
            return;
        }

        if (!data || data.length === 0) {
            divGrafico.innerHTML = `<div style="color:#94a3b8; display:flex; justify-content:center; align-items:center; height:100%; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; text-align:center; padding: 20px;">📂 Nenhum dado operacional encontrado.<br>Importe a planilha Excel nas configurações.</div>`;
            return;
        }

        divGrafico.innerHTML = '';
        const dadosOrdenados = data.reverse();

        const eixoXDias = [];
        const seriesData = [];

        dadosOrdenados.forEach(reg => {
            const partes = reg.data_registro.split('-');
            const formatada = `${partes[2]}/${partes[1]}`;
            eixoXDias.push(formatada);
            
            let pct = 0;
            if (reg.total_frota > 0) {
                pct = (reg.carros_rodaram / reg.total_frota) * 100;
            }
            
            // Armazenamos um objeto com todos os valores
            seriesData.push({
                value: pct.toFixed(1),
                rodaram: reg.carros_rodaram,
                total: reg.total_frota
            });
        });

        if (typeof echarts === 'undefined') return;

        const chart = echarts.init(divGrafico);
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderColor: '#10b981',
                textStyle: { color: '#fff' },
                formatter: function (params) {
                    const d = params[0].data;
                    return `<div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #444;">Data: ${params[0].name}</div>` +
                           `<span style="color:#10b981;">●</span> DM Operacional: <b>${d.value}%</b><br/>` +
                           `<span style="color:#38bdf8;">●</span> Rodando: <b>${d.rodaram}</b> cam.<br/>` +
                           `<span style="color:#94a3b8;">●</span> Frota Total: <b>${d.total}</b> cam.`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
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
                data: seriesData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                label: {
                    show: true,
                    position: 'top',
                    color: '#ffffff',
                    fontFamily: "'Inter', sans-serif", // Fonte mais limpa
                    fontSize: 12, // Tamanho ligeiramente maior
                    fontWeight: 800, // Fonte bem grossa
                    textBorderColor: 'rgba(0, 0, 0, 0.8)', // Contorno preto ao redor do texto
                    textBorderWidth: 2.5, // Grossura do contorno
                    formatter: function (params) {
                        return params.data.value + '%\n(' + params.data.rodaram + ' / ' + params.data.total + ')';
                    },
                    lineHeight: 16,
                    align: 'center'
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

setInterval(() => {
    const divGrafico = document.getElementById('graficoDmOperacional');
    if (divGrafico && divGrafico.offsetWidth > 0 && !divGrafico.getAttribute('data-rendered')) {
        divGrafico.setAttribute('data-rendered', 'true');
        window.renderizarGraficoDMOperacional();
    }
}, 1000);
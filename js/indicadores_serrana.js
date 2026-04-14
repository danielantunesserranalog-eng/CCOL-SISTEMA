window.carregarDadosDashboardSerrana = async function() {
    await atualizarPonteirosSerrana();
    carregarControladorAtualSerrana();
    carregarFrentesTvSerrana();
    carregarOcorrenciasTvSerrana();
    carregarFrotasParadasSerrana(); 
    
    setInterval(() => {
        carregarOcorrenciasTvSerrana(); 
        carregarFrotasParadasSerrana(); 
    }, 10000);

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
        
        // Procura tanto no ID novo quanto no antigo pra forçar a renderização
        const containerNovo = document.getElementById('kpi-lista-frentes-nomes');
        const containerAntigo = document.getElementById('lista-frentes-tv');
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
            
            // Injeta o HTML gerado onde quer que ele ache espaço
            if(containerNovo) containerNovo.innerHTML = htmlCaixinhas;
            if(containerAntigo) containerAntigo.innerHTML = htmlCaixinhas;
            if(containerConfig) containerConfig.innerHTML = htmlConfig;
            
            if(typeof atualizarFrentesDeTrabalhoSerrana === 'function') atualizarFrentesDeTrabalhoSerrana();
            
        } else {
            if(elKpiFrentes) elKpiFrentes.textContent = '0';
            const msgVazia = '<div class="empty-state" style="font-size: 0.85rem; color: #94a3b8; font-weight: bold;">Nenhuma frente ativa.</div>';
            if(containerNovo) containerNovo.innerHTML = msgVazia;
            if(containerAntigo) containerAntigo.innerHTML = msgVazia;
            if(containerConfig) containerConfig.innerHTML = '';
        }
    } catch(e) {
        console.error("Erro ao carregar Frentes Serrana:", e);
    }
}

async function carregarFrotasParadasSerrana() {
    try {
        const { data, error } = await supabaseClient
            .from('ordens_servico')
            .select('placa, tipo, status') 
            .in('status', ['Aguardando Oficina', 'Em Manutenção']); 

        if (error) throw error;

        const container = document.getElementById('frotas-paradas-list');
        if(!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; margin-top: 20px; grid-column: 1 / -1;">
                    ✅ Nenhuma frota parada no momento.
                </div>
            `;
            return;
        }

        let htmlParadas = '';
        data.forEach(os => {
            let tipoString = os.tipo ? os.tipo.toLowerCase() : 'corretiva';
            let classeCss = 'corretiva'; 
            let icone = 'fas fa-wrench';
            let textColor = 'text-red';
            
            if (tipoString.includes('preventiva')) {
                classeCss = 'preventiva';
                icone = 'fas fa-clipboard-check';
                textColor = 'text-orange';
            }
            if (tipoString.includes('borracharia') || tipoString.includes('pneu')) {
                classeCss = 'borracharia';
                icone = 'fas fa-life-ring';
                textColor = 'text-blue';
            }

            htmlParadas += `
                <div class="item-frota-parada ${classeCss}">
                    <div class="cavalo-info">
                        <i class="${icone} ${textColor}" style="font-size: 1.3rem;"></i>
                        <span class="identificacao-cavalo">${os.placa || 'N/I'}</span>
                    </div>
                    <div class="badge-tipo ${classeCss}">
                        ${os.tipo ? os.tipo.toUpperCase() : 'CORRETIVA'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = htmlParadas;

    } catch (error) {
        console.error("Erro frotas paradas Serrana:", error);
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
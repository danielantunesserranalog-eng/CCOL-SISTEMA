window.carregarDadosDashboard = async function() {
    await atualizarPonteiros();
    carregarControladorAtual();
    carregarFrentesTv();
    carregarOcorrenciasTv();
    carregarFrotasParadas(); 
    
    setInterval(() => {
        carregarOcorrenciasTv(); 
        carregarFrotasParadas(); 
    }, 10000);

    if(typeof atualizarFrentesDeTrabalho === 'function') {
        atualizarFrentesDeTrabalho();
        setInterval(atualizarFrentesDeTrabalho, 60000);
    }
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
}

window.atualizarFrentesDeTrabalho = function() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0'); 
    const ano = agora.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    const hora = agora.getHours();
    let textoTurnoFrente = "";
    let classeTurnoFrente = "";
    
    const elTurnoBarText = document.getElementById('dash-turno');
    const elTurnoBarIcon = document.getElementById('dash-turno-icon');
    const elTurnoBarContainer = document.getElementById('container-barra-turno');

    if (hora >= 6 && hora < 18) {
        textoTurnoFrente = "☀️ 06:00 às 18:00";
        classeTurnoFrente = "turno-dia-style";
        if(elTurnoBarText) { elTurnoBarText.textContent = "TURNO: 06:00 às 18:00"; elTurnoBarText.style.color = "#ffffff"; }
        if(elTurnoBarIcon) elTurnoBarIcon.className = "fas fa-sun";
        if(elTurnoBarContainer) elTurnoBarContainer.style.borderLeftColor = "#f59e0b";
    } else {
        textoTurnoFrente = "🌙 18:00 às 06:00";
        classeTurnoFrente = "turno-noite-style";
        if(elTurnoBarText) { elTurnoBarText.textContent = "TURNO: 18:00 às 06:00"; elTurnoBarText.style.color = "#ffffff"; }
        if(elTurnoBarIcon) elTurnoBarIcon.className = "fas fa-moon";
        if(elTurnoBarContainer) elTurnoBarContainer.style.borderLeftColor = "#38bdf8";
    }

    document.querySelectorAll('.dash-data-frente').forEach(el => el.textContent = dataFormatada);
    document.querySelectorAll('.dash-turno-frente').forEach(el => {
        el.textContent = textoTurnoFrente;
        el.className = `frente-turno dash-turno-frente ${classeTurnoFrente}`;
    });
}

async function atualizarPonteiros() {
    let totalPlacasCadastradas = 0;
    let totalManutencao = 0;
    let totalSinistrado = 0;

    try {
        const { data: frotaData, error } = await supabaseClient.from('frotas_manutencao').select('cavalo');
        if (!error && frotaData) {
            totalPlacasCadastradas = frotaData.length;
        }
    } catch (e) { console.error("Erro Placas:", e); }

    try {
        const { data: osData, error: osError } = await supabaseClient
            .from('ordens_servico')
            .select('placa, status');
            
        if (!osError && osData) {
            const placasUnicasManutencao = new Set();
            const placasUnicasSinistro = new Set();

            osData.forEach(os => {
                if (os.status === 'Sinistrado') {
                    placasUnicasSinistro.add(os.placa);
                } else if (os.status === 'Aguardando Oficina' || os.status === 'Em Manutenção') {
                    placasUnicasManutencao.add(os.placa);
                }
            });

            // Remove o sinistrado da contagem de manutenção para evitar duplicidades
            placasUnicasSinistro.forEach(placa => {
                placasUnicasManutencao.delete(placa);
            });

            totalSinistrado = placasUnicasSinistro.size;
            totalManutencao = placasUnicasManutencao.size;
        }
    } catch (e) { console.error("Erro O.S.:", e); }

    // MODIFICAÇÃO: O total se mantém inalterado independentemente do sinistro
    let frotaValidaTotal = totalPlacasCadastradas;

    // MODIFICAÇÃO: O sinistrado conta como manutenção para diminuir a disponibilidade
    let frotaDisponivel = frotaValidaTotal - totalManutencao - totalSinistrado;
    if(frotaDisponivel < 0) frotaDisponivel = 0;

    const elGaugeFill = document.getElementById('gauge-fill-frota');
    const elPonteiro = document.getElementById('gauge-ponteiro-frota'); 

    if (elGaugeFill && frotaValidaTotal > 0) {
        const perc = (frotaDisponivel / frotaValidaTotal) * 100;
        
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

    if(elFrotaDisp) elFrotaDisp.textContent = frotaDisponivel;
    if(elFrotaTotal) elFrotaTotal.textContent = frotaValidaTotal;
    
    // Mostramos a soma de Manutenção + Sinistrado na caixinha de Em Manutenção
    if(elManut) elManut.textContent = totalManutencao + totalSinistrado;
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
    const elKpiFrentes = document.getElementById('kpi-frentes');
    
    if (data && data.length > 0) {
        if(elKpiFrentes) elKpiFrentes.textContent = data.length;
        if(container) container.innerHTML = ''; 
        if(containerConfig) containerConfig.innerHTML = '';
        data.forEach(f => {
            if(container) {
                container.innerHTML += `
                <div class="frente-item-card">
                    <div class="frente-time-box">
                        <span class="frente-data dash-data-frente">--/--/----</span>
                        <span class="frente-turno dash-turno-frente">Carregando...</span>
                    </div>
                    <div class="frente-content-box">
                        <h4 class="frente-nome-titulo"><i class="fas fa-tractor text-green"></i> ${f.nome}</h4>
                    </div>
                </div>`;
            }
            if(containerConfig) containerConfig.innerHTML += `<div class="mini-item"><span>${f.nome}</span> <button class="btn-remover-mini" onclick="removerFrenteDash('${f.id}')"><i class="fas fa-trash"></i></button></div>`;
        });
        atualizarFrentesDeTrabalho();
    } else {
        if(elKpiFrentes) elKpiFrentes.textContent = '0';
        if(container) container.innerHTML = '<div class="empty-state">Nenhuma frente ativa.</div>';
    }
}

async function carregarFrotasParadas() {
    try {
        const { data, error } = await supabaseClient
            .from('ordens_servico')
            .select('placa, tipo, status') 
            .in('status', ['Aguardando Oficina', 'Em Manutenção']); 

        if (error) throw error;

        const container = document.getElementById('frotas-paradas-list');
        if(!container) return;

        container.innerHTML = ''; 

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; margin-top: 20px;">
                    ✅ Nenhuma frota parada no momento.
                </div>
            `;
            return;
        }

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

            container.innerHTML += `
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

    } catch (error) {
        console.error("Erro ao buscar frotas paradas:", error);
        const container = document.getElementById('frotas-paradas-list');
        if(container) {
            container.innerHTML = `<div class="empty-state" style="color: #ef4444; text-align: center;">Erro ao carregar dados da oficina.</div>`;
        }
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
        if(containerConfig) containerConfig.innerHTML = '';
    }
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
        scale: 4, 
        useCORS: true,
        logging: false 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `CCOL_DASHBOARD_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png'); 
        link.click(); 
        
        botaoPrint.style.display = 'flex';
        if(botaoFlutuante) botaoFlutuante.style.display = 'block';
    });
}
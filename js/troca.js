// ==================== MÓDULO: PAINEL DE TROCA E IMPRESSÃO DIÁRIA ====================

window.renderizarTrocaTurno = function() {
    const tbodyProximos = document.getElementById('listaProximosTroca');
    const tbodyPlantao = document.getElementById('listaPlantaoSemCaminhao');
    const tbodyFolga = document.getElementById('listaFolga');

    if (!tbodyProximos || !tbodyPlantao || !tbodyFolga) return;

    const hojeStr = new Date().toISOString().split('T')[0];

    let htmlProximos = '';
    let htmlPlantao = '';
    let htmlFolga = '';

    const motoristasOrd = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome));

    motoristasOrd.forEach(m => {
        const eq = typeof getEq === 'function' ? getEq(m) : (m.equipe || '-');
        const escala = window.getEscalaDiaComputada(m, hojeStr);
        const cidade = m.cidade || '-';
        const turno = m.turno || '-';

        let conjuntoDisplay = m.conjuntoId ? `Trinca ${String(m.conjuntoId).padStart(2, '0')}` : 'S/ Trinca';
        if (escala.caminhao !== 'F' && escala.caminhao !== 'T' && escala.caminhao !== 'TRAB') {
            conjuntoDisplay += ` (${escala.caminhao})`;
        }

        if (escala.caminhao === 'F') {
            htmlFolga += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="font-weight: bold; color: #f8fafc;">${eq}</td>
                <td style="color: #fb923c; font-weight: bold;">Em Folga</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        } else if (escala.caminhao === 'T' || escala.caminhao === 'TRAB') {
            htmlPlantao += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="font-weight: bold; color: #f8fafc;">${eq}</td>
                <td>${turno}</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        } else {
            htmlProximos += `<tr>
                <td style="font-weight: bold; color: #fff;">${m.nome}</td>
                <td style="color: #93c5fd; font-weight: bold;">${conjuntoDisplay}</td>
                <td>${turno}</td>
                <td style="color: #94a3b8;">${cidade}</td>
            </tr>`;
        }
    });

    tbodyProximos.innerHTML = htmlProximos || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista ativo no momento</td></tr>';
    tbodyPlantao.innerHTML = htmlPlantao || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista de plantão</td></tr>';
    tbodyFolga.innerHTML = htmlFolga || '<tr><td colspan="4" style="text-align:center;">Nenhum motorista em folga</td></tr>';
};

// ==================== IMPRESSÃO DIÁRIA MODIFICADA (INCLUI CAMINHÕES VAZIOS) ====================
window.gerarRelatorioImpressao = function() {
    const dataStr = document.getElementById('printData').value;
    const turnoFiltro = document.getElementById('printTurno').value; 

    if (!dataStr) {
        alert('Selecione uma data para impressão.');
        return;
    }

    const partesData = dataStr.split('-');
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    let html = `
    <html>
    <head>
        <title>Escala Diária - ${dataFormatada}</title>
        <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #000; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 11px; }
            th { background-color: #d1d5db; text-transform: uppercase; }
            .trab { background-color: #d4edda; font-weight: bold; }
            .vazio-row { background-color: #fee2e2; color: #ef4444; }
            .vazio-cell { background-color: #fca5a5; font-weight: bold; color: #7f1d1d;}
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; background: #eee; padding: 5px; border: 1px solid #000; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Serrana Florestal - Escala Diária</h1>
            <p><strong>Data: ${dataFormatada} | Turno: ${turnoFiltro}</strong></p>
        </div>
    `;

    // 1. Filtrar pelo select de turnos (Dia, Noite ou Todos)
    const motoristasOrd = [...motoristas];
    let motoristasFiltrados = motoristasOrd;
    if (turnoFiltro === 'Dia') {
        motoristasFiltrados = motoristasOrd.filter(m => ['A', 'B', 'C'].includes(typeof getEq === 'function' ? getEq(m) : m.equipe));
    } else if (turnoFiltro === 'Noite') {
        motoristasFiltrados = motoristasOrd.filter(m => ['D', 'E', 'F'].includes(typeof getEq === 'function' ? getEq(m) : m.equipe));
    }

    const trabs = [];
    const caminhoesOcupados = [];

    // 2. Guarda na lista quem VAI TRABALHAR
    motoristasFiltrados.forEach(m => {
        const eq = typeof getEq === 'function' ? getEq(m) : (m.equipe || '-');
        const escala = window.getEscalaDiaComputada(m, dataStr);
        const trinca = m.conjuntoId ? String(m.conjuntoId).padStart(2, '0') : 'S/F';

        if (escala.caminhao !== 'F') {
            trabs.push({ 
                nome: m.nome, 
                trinca: trinca, 
                eq: eq, 
                turno: m.turno || '-', 
                caminhao: escala.caminhao 
            });
            
            // Registra os caminhões que já têm alguém escalado neles
            if (escala.caminhao !== 'T' && escala.caminhao !== 'TRAB') {
                caminhoesOcupados.push(escala.caminhao);
            }
        }
    });

    // 3. Verifica TODOS os caminhões da empresa para encontrar os vazios
    conjuntos.forEach(conj => {
        if (conj.caminhoes) {
            conj.caminhoes.forEach(cam => {
                const placa = typeof cam === 'string' ? cam : cam.placa;
                
                // Se a placa não estiver na lista de ocupados, ele está sem motorista
                if (!caminhoesOcupados.includes(placa)) {
                    trabs.push({
                        nome: '', // Em branco
                        trinca: String(conj.id).padStart(2, '0'),
                        eq: '-',
                        turno: '-',
                        caminhao: placa
                    });
                }
            });
        }
    });

    // 4. Ordenação: Primeiro pelo Turno (Horário), depois pela Trinca, depois pela Placa
    trabs.sort((a, b) => {
        const turnoA = a.turno !== '-' && a.turno ? a.turno : '99:99';
        const turnoB = b.turno !== '-' && b.turno ? b.turno : '99:99';
        
        // Primeiro critério: Ordena pelo horário (Turno)
        if (turnoA !== turnoB) return turnoA.localeCompare(turnoB);
        
        // Segundo critério: Ordena pela trinca caso o horário seja igual
        const trincaA = a.trinca === 'S/F' ? 9999 : Number(a.trinca);
        const trincaB = b.trinca === 'S/F' ? 9999 : Number(b.trinca);
        
        if (trincaA !== trincaB) return trincaA - trincaB;
        
        // Terceiro critério: Ordena pela placa do caminhão
        if (a.caminhao !== b.caminhao) return a.caminhao.localeCompare(b.caminhao);
        
        return 0;
    });

    // 5. Renderizar a Tabela
    const renderTabela = (lista, titulo) => {
        if (lista.length === 0) return '<p style="text-align:center;">Nenhum registro para exibir.</p>';
        let tHtml = `<div class="section-title">${titulo} (${lista.length} registros)</div>`;
        tHtml += `<table><thead><tr><th style="width: 12%">HORÁRIO</th><th style="width: 10%">TRINCA</th><th style="width: 40%">MOTORISTA</th><th style="width: 10%">EQUIPA</th><th style="width: 28%">STATUS / CAMINHÃO</th></tr></thead><tbody>`;
        
        lista.forEach(l => {
            const isVazio = l.nome === ''; // Verifica se é um caminhão vazio
            const statusStr = (l.caminhao === 'T' || l.caminhao === 'TRAB') ? 'TRABALHO (SEM CAMINHÃO)' : l.caminhao;
            
            // Se estiver vazio, aplica classes em vermelho
            tHtml += `<tr class="${isVazio ? 'vazio-row' : ''}">
                <td style="font-weight:bold;">${l.turno === '99:99' ? '-' : l.turno}</td>
                <td>${l.trinca}</td>
                <td style="text-align:left; font-weight:bold;">${isVazio ? '⚠ SEM MOTORISTA' : l.nome}</td>
                <td>${l.eq}</td>
                <td class="${isVazio ? 'vazio-cell' : 'trab'}">${statusStr}</td>
            </tr>`;
        });
        tHtml += `</tbody></table>`;
        return tHtml;
    };

    html += renderTabela(trabs, '🚛 RELATÓRIO GERAL (ESCALADOS E CAMINHÕES DISPONÍVEIS)');

    html += `
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #555;">
            Relatório gerado pelo sistema CCOL em ${new Date().toLocaleString('pt-BR')}
        </div>
        <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
    `;

    const w = window.open('', '', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    window.fecharModalImpressao();
};
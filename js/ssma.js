// ==================== MÓDULO: SSMA (Saúde, Segurança e Meio Ambiente) ====================

window.calcularStatusSSMA = function(dataIso) {
    if (!dataIso) return { classe: 'color: var(--text-secondary);', texto: 'Sem Data' };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const partes = dataIso.split('-');
    const vencimento = new Date(partes[0], partes[1] - 1, partes[2]);
    vencimento.setHours(0, 0, 0, 0);

    const diferencaTempo = vencimento.getTime() - hoje.getTime();
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

    if (diferencaDias < 0) {
        return { classe: 'color: #ef4444; font-weight: bold;', texto: `Vencido há ${Math.abs(diferencaDias)} dias` };
    } else if (diferencaDias <= 60) {
        return { classe: 'color: #f59e0b; font-weight: bold;', texto: `Vence em ${diferencaDias} dias` };
    } else {
        return { classe: 'color: #10b981;', texto: `OK (${diferencaDias} dias)` };
    }
};

window.renderizarSSMA = function() {
    const tbody = document.getElementById('ssmaList');
    if (!tbody) return;

    const searchInput = document.getElementById('searchSsma');
    const termoBusca = searchInput?.value.toLowerCase() || '';
    
    const funcFiltrados = motoristas
        .filter(m => m.nome.toLowerCase().includes(termoBusca) || (m.cpf && m.cpf.includes(termoBusca)))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    let html = '';

    funcFiltrados.forEach(m => {
        const cargasInfo = calcularStatusSSMA(m.venc_cargas_indivisiveis);
        const cnhInfo = calcularStatusSSMA(m.venc_cnh);
        const asoInfo = calcularStatusSSMA(m.venc_aso);
        const integracaoInfo = calcularStatusSSMA(m.venc_integracao);

        const temAlertaCritico = [cargasInfo, cnhInfo, asoInfo, integracaoInfo].some(info => info.texto.includes('Vencido há'));
        const temAlertaAmarelo = [cargasInfo, cnhInfo, asoInfo, integracaoInfo].some(info => info.texto.includes('Vence em'));

        let backgroundTr = '';
        if (temAlertaCritico) {
            backgroundTr = 'background: rgba(239, 68, 68, 0.05);';
        } else if (temAlertaAmarelo) {
            backgroundTr = 'background: rgba(245, 158, 11, 0.05);';
        }

        // Formatação visual do CPF
        let cpfFormatado = '-';
        if (m.cpf && m.cpf.length === 11) {
            cpfFormatado = m.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        } else if (m.cpf) {
            cpfFormatado = m.cpf;
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${backgroundTr}">
                <td><strong style="font-size: 1.05rem; color: var(--text-primary);">${m.nome}</strong></td>
                <td><span style="color: var(--text-secondary);">${cpfFormatado}</span></td>
                <td>
                    <span style="${cargasInfo.classe}">${cargasInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_cargas_indivisiveis ? m.venc_cargas_indivisiveis.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${cnhInfo.classe}">${cnhInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_cnh ? m.venc_cnh.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${asoInfo.classe}">${asoInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_aso ? m.venc_aso.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${integracaoInfo.classe}">${integracaoInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_integracao ? m.venc_integracao.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <button onclick="abrirModalSSMA(${m.id})" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid #f59e0b; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">✏️ Editar</button>
                </td>
            </tr>
        `;
    });

    if (funcFiltrados.length === 0) {
        html = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>';
    }

    tbody.innerHTML = html;
};

// --- FUNÇÕES DE CONTROLE DO MODAL DE SSMA ---

window.abrirModalSSMA = function(id) {
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;

    document.getElementById('editSsmaId').value = m.id;
    document.getElementById('editSsmaNome').innerText = m.nome;

    const inputCpf = document.getElementById('editSsmaCPF');
    if (inputCpf) inputCpf.value = m.cpf || '';

    document.getElementById('editSsmaVencCargas').value = m.venc_cargas_indivisiveis || '';
    document.getElementById('editSsmaVencCNH').value = m.venc_cnh || '';
    document.getElementById('editSsmaVencASO').value = m.venc_aso || '';
    document.getElementById('editSsmaVencIntegracao').value = m.venc_integracao || '';

    document.getElementById('modalEdicaoSSMA').classList.add('show');
};

window.fecharModalSSMA = function() {
    document.getElementById('modalEdicaoSSMA').classList.remove('show');
};

window.salvarEdicaoSSMA = async function() {
    const id = parseInt(document.getElementById('editSsmaId').value);
    const m = motoristas.find(mot => mot.id === id);
    if (!m) return;

    const inputCpf = document.getElementById('editSsmaCPF');
    if (inputCpf) m.cpf = inputCpf.value || null;

    m.venc_cargas_indivisiveis = document.getElementById('editSsmaVencCargas').value || null;
    m.venc_cnh = document.getElementById('editSsmaVencCNH').value || null;
    m.venc_aso = document.getElementById('editSsmaVencASO').value || null;
    m.venc_integracao = document.getElementById('editSsmaVencIntegracao').value || null;

    await db.updateMotorista(id, {
        cpf: m.cpf,
        venc_cargas_indivisiveis: m.venc_cargas_indivisiveis,
        venc_cnh: m.venc_cnh,
        venc_aso: m.venc_aso,
        venc_integracao: m.venc_integracao
    });
    
    if(typeof salvarBackupLocal === 'function') salvarBackupLocal();
    window.fecharModalSSMA();
    window.renderizarSSMA();
    
    alert('✅ Dados e Datas de SSMA atualizados com sucesso!');
};
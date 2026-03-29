// ==================== MÓDULO: CONJUNTOS E CAMINHÕES ====================

window.renderizarConjuntos = function() {
    const grid = document.getElementById('conjuntosList');
    if (!grid) return;
    if (conjuntos.length === 0) {
        grid.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Nenhum conjunto cadastrado.</p>';
        return;
    }

    let html = '';
    conjuntos.forEach(c => {
        let caminhoesHtml = '';
        if(c.caminhoes) {
            c.caminhoes.forEach((cam, index) => {
                const placa = typeof cam === 'string' ? cam : cam.placa;
                const go = typeof cam === 'string' ? '' : cam.go;
                caminhoesHtml += `
                    <div class="caminhao-item">
                        <span>🚛 <strong>${placa}</strong> ${go ? `| GO: ${go}` : ''}</span>
                        <button class="btn-remove-caminhao" onclick="removerCaminhao(${c.id}, ${index})" title="Remover Caminhão">X</button>
                    </div>
                `;
            });
        }

        html += `
            <div class="conjunto-card">
                <div class="conjunto-header">
                    <span class="conjunto-id">Conjunto ${c.id}</span>
                    <button class="btn-remove-conjunto" onclick="removerConjunto(${c.id})">Excluir Conjunto</button>
                </div>
                <div class="caminhoes-list">
                    <strong>Caminhões Alocados:</strong>
                    ${caminhoesHtml || '<span style="font-size:0.8rem; color: #888;">Nenhum caminhão vinculado</span>'}
                </div>
                <div class="add-caminhao">
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="addCamPlaca_${c.id}" placeholder="Placa" style="width: 60%;" style="text-transform:uppercase;">
                        <input type="text" id="addCamGo_${c.id}" placeholder="GO" style="width: 40%;">
                    </div>
                    <button class="btn-add-caminhao" onclick="adicionarCaminhaoAoConjunto(${c.id})">➕ Adicionar Placa</button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

window.adicionarConjunto = async function() {
    const idInput = document.getElementById('conjuntoId').value;
    const c1Placa = document.getElementById('caminhao1Placa').value.toUpperCase();
    const c1Go = document.getElementById('caminhao1Go').value;
    const c2Placa = document.getElementById('caminhao2Placa').value.toUpperCase();
    const c2Go = document.getElementById('caminhao2Go').value;

    if (!idInput) { alert('Informe o ID do Conjunto!'); return; }
    const idNum = parseInt(idInput);
    if (conjuntos.find(c => c.id === idNum)) { alert('Este Conjunto já existe!'); return; }

    let caminhoesArr = [];
    if(c1Placa) caminhoesArr.push({ placa: c1Placa, go: c1Go });
    if(c2Placa) caminhoesArr.push({ placa: c2Placa, go: c2Go });

    const novoConjunto = { id: idNum, caminhoes: caminhoesArr };
    conjuntos.push(novoConjunto);
    await db.addConjunto(novoConjunto);
    salvarBackupLocal();

    document.getElementById('conjuntoId').value = '';
    document.getElementById('caminhao1Placa').value = '';
    document.getElementById('caminhao1Go').value = '';
    document.getElementById('caminhao2Placa').value = '';
    document.getElementById('caminhao2Go').value = '';

    renderizarConjuntos();
    if(typeof renderizarAlocacao === 'function') renderizarAlocacao();
    if(typeof atualizarStats === 'function') atualizarStats();
    alert('Conjunto criado com sucesso!');
}

window.removerConjunto = async function(id) {
    if(currentUser && currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem excluir conjuntos.'); return; }
    if (!confirm('Deseja excluir este conjunto inteiro?')) return;
    
    conjuntos = conjuntos.filter(c => c.id !== id);
    await db.deleteConjunto(id);
    
    await db.addLog('Exclusão de Conjunto', `O Conjunto ID ${id} foi inteiramente apagado.`);
    if(typeof renderizarLogs === 'function') renderizarLogs();
    
    salvarBackupLocal();
    renderizarConjuntos();
    if(typeof renderizarAlocacao === 'function') renderizarAlocacao();
    if(typeof atualizarStats === 'function') atualizarStats();
}

window.removerCaminhao = async function(conjId, index) {
    if(currentUser && currentUser.role !== 'Admin') { alert('⛔ Acesso Negado: Apenas Administradores podem remover caminhões dos conjuntos.'); return; }
    const c = conjuntos.find(x => x.id === conjId);
    if (!c) return;
    
    const camRemovido = c.caminhoes[index].placa || c.caminhoes[index];
    c.caminhoes.splice(index, 1);
    await db.updateConjunto(conjId, c.caminhoes);
    
    await db.addLog('Remoção de Caminhão', `Caminhão Placa ${camRemovido} removido do Conjunto ${conjId}.`);
    if(typeof renderizarLogs === 'function') renderizarLogs();

    salvarBackupLocal();
    renderizarConjuntos();
    if(typeof renderizarAlocacao === 'function') renderizarAlocacao();
    if(typeof atualizarStats === 'function') atualizarStats();
}

window.adicionarCaminhaoAoConjunto = async function(conjId) {
    const placa = document.getElementById(`addCamPlaca_${conjId}`).value.toUpperCase();
    const go = document.getElementById(`addCamGo_${conjId}`).value;
    if(!placa) { alert('Informe a placa do caminhão.'); return; }

    const c = conjuntos.find(x => x.id === conjId);
    if(!c) return;

    if(!c.caminhoes) c.caminhoes = [];
    c.caminhoes.push({ placa, go });
    await db.updateConjunto(conjId, c.caminhoes);
    
    salvarBackupLocal();
    renderizarConjuntos();
    if(typeof renderizarAlocacao === 'function') renderizarAlocacao();
    if(typeof atualizarStats === 'function') atualizarStats();
}
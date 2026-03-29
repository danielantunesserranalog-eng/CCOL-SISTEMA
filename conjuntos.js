// ==================== MÓDULO: CONJUNTOS & CAMINHÕES ====================

function renderizarConjuntos() {
    const container = document.getElementById('conjuntosList');
    if (!container) return;
    
    if (conjuntos.length === 0) {
        container.innerHTML = '<p>Nenhum conjunto cadastrado</p>';
        return;
    }
    
    container.innerHTML = conjuntos.map(conj => `
        <div class="conjunto-card">
            <div class="conjunto-header">
                <span class="conjunto-id">Conjunto ${conj.id}</span>
                <button class="btn-remove-conjunto" data-id="${conj.id}">🗑️ Remover</button>
            </div>
            <div class="caminhoes-list">
                <strong>Caminhões:</strong>
                ${conj.caminhoes.map(cam => {
                    const placa = typeof cam === 'string' ? cam : cam.placa;
                    const go = typeof cam === 'string' ? '' : cam.go;
                    return `
                        <div class="caminhao-item">
                            <span>🚛 ${placa} ${go ? `<strong>[${go}]</strong>` : ''}</span>
                            <button class="btn-remove-caminhao" data-conj="${conj.id}" data-placa="${placa}">Remover</button>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="add-caminhao" style="flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px;">
                    <input type="text" placeholder="Placa" id="novaPlaca-${conj.id}" style="width: 50%;">
                    <input type="text" placeholder="GO" id="novoGo-${conj.id}" style="width: 50%;">
                </div>
                <button class="btn-add-caminhao btn-secondary" data-id="${conj.id}" style="width: 100%;">➕ Adicionar Caminhão</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-remove-conjunto').forEach(btn => btn.addEventListener('click', handleRemoveConjunto));
    document.querySelectorAll('.btn-remove-caminhao').forEach(btn => btn.addEventListener('click', handleRemoveCaminhao));
    document.querySelectorAll('.btn-add-caminhao').forEach(btn => btn.addEventListener('click', handleAddCaminhao));
}

function adicionarConjunto() {
    const id = parseInt(document.getElementById('conjuntoId')?.value);
    const placa1 = document.getElementById('caminhao1Placa')?.value.trim();
    const go1 = document.getElementById('caminhao1Go')?.value.trim();
    const placa2 = document.getElementById('caminhao2Placa')?.value.trim();
    const go2 = document.getElementById('caminhao2Go')?.value.trim();
    
    if (!id || (!placa1 && !placa2)) { alert('Informe o ID e pelo menos 1 caminhão'); return; }
    if (conjuntos.find(c => c.id === id)) { alert('ID do conjunto já existe'); return; }
    
    const caminhoes = [];
    if (placa1) caminhoes.push({ placa: placa1, go: go1 || '' });
    if (placa2) caminhoes.push({ placa: placa2, go: go2 || '' });
    
    const novoConjunto = { id, caminhoes };
    conjuntos.push(novoConjunto);
    
    db.addConjunto(novoConjunto);
    salvarBackupLocal();
    
    renderizarConjuntos(); renderizarEscala(); renderizarAlocacao(); atualizarStats();
}

function handleRemoveConjunto(e) {
    const id = parseInt(e.target.dataset.id);
    if (confirm(`Remover Conjunto ${id} e desvincular motoristas?`)) {
        conjuntos = conjuntos.filter(c => c.id !== id);
        
        motoristas.forEach(m => {
            if(m.conjuntoId === id) {
                m.conjuntoId = null;
                db.updateMotorista(m.id, { conjuntoId: null });
            }
        });

        db.deleteConjunto(id);
        salvarBackupLocal();
        
        renderizarConjuntos(); renderizarMotoristas(); renderizarEscala(); renderizarAlocacao(); atualizarStats();
    }
}

function handleRemoveCaminhao(e) {
    const conjId = parseInt(e.target.dataset.conj);
    const placa = e.target.dataset.placa;
    const conjunto = conjuntos.find(c => c.id === conjId);
    
    if (conjunto && conjunto.caminhoes.length > 1) {
        conjunto.caminhoes = conjunto.caminhoes.filter(p => (typeof p === 'string' ? p : p.placa) !== placa);
        db.updateConjunto(conjId, conjunto.caminhoes);
        salvarBackupLocal();
        renderizarConjuntos(); renderizarEscala();
    } else { alert('Cada conjunto deve ter pelo menos 1 caminhão'); }
}

function handleAddCaminhao(e) {
    const conjId = parseInt(e.target.dataset.id);
    const novaPlaca = document.getElementById(`novaPlaca-${conjId}`).value.trim();
    const novoGo = document.getElementById(`novoGo-${conjId}`).value.trim();
    
    if (novaPlaca) {
        const conjunto = conjuntos.find(c => c.id === conjId);
        if (conjunto) {
            conjunto.caminhoes.push({ placa: novaPlaca, go: novoGo });
            db.updateConjunto(conjId, conjunto.caminhoes);
            salvarBackupLocal();
            renderizarConjuntos(); renderizarEscala();
        }
    } else { alert("Placa é obrigatória."); }
}
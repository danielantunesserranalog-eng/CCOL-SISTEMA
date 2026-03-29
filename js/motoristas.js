// ==================== MÓDULO: MOTORISTAS ====================

function renderizarMotoristas() {
    const tbody = document.getElementById('motoristasList');
    const searchTerm = document.getElementById('searchMotorista')?.value.toLowerCase() || '';
    if (!tbody) return;
    
    const filtered = motoristas.filter(m => m.nome.toLowerCase().includes(searchTerm));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum motorista encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(m => {
        const isBlocked = m.masterDrive === 'Não' || m.destra === 'Não';
        const rowStyle = isBlocked ? 'background-color: rgba(239, 68, 68, 0.05); color: #f87171;' : '';
        const blockedIcon = isBlocked ? ' ⛔' : '';

        return `
            <tr style="${rowStyle}">
                <td style="text-align: left; padding-left: 15px;"><strong>${m.nome}${blockedIcon}</strong></td>
                <td>${m.masterDrive || '-'}</td>
                <td>${m.destra || '-'}</td>
                <td>${m.cidade || '-'}</td>
                <td>
                    <button class="btn-edit-motorista" data-id="${m.id}" style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:6px; margin-right:5px; cursor:pointer; font-weight:bold;">✏️ Editar</button>
                    <button class="btn-delete-motorista" data-id="${m.id}" style="background:transparent; border: 1px solid #ef4444; color:#ef4444; padding:8px 12px; border-radius:6px; cursor:pointer;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-edit-motorista').forEach(btn => btn.addEventListener('click', handleEditMotorista));
    document.querySelectorAll('.btn-delete-motorista').forEach(btn => btn.addEventListener('click', handleRemoveMotorista));
}

function adicionarMotorista() {
    const nome = document.getElementById('motoristaNome')?.value.trim();
    const masterDrive = document.getElementById('motoristaMasterDrive')?.value;
    const destra = document.getElementById('motoristaDestra')?.value;
    const cidade = document.getElementById('motoristaCidade')?.value.trim();
    
    if (!nome) { alert('Digite o nome do motorista'); return; }
    
    const novoId = motoristas.length > 0 ? Math.max(...motoristas.map(m => m.id)) + 1 : 1;
    const turnoPadrao = TURNOS.length > 0 ? TURNOS[0].periodo : '06:00-18:00';

    const novoMot = { id: novoId, nome, masterDrive, destra, cidade, equipe: '-', turno: turnoPadrao, conjuntoId: null };
    motoristas.push(novoMot);
    escalas[novoId] = {};
    
    // Removida a linha que inseria lixo no banco
    document.getElementById('motoristaNome').value = '';
    document.getElementById('motoristaCidade').value = '';
    
    db.addMotorista(novoMot);
    salvarBackupLocal();
    
    renderizarMotoristas(); renderizarEscala(); renderizarAlocacao(); 
    if(typeof atualizarStats === 'function') atualizarStats();
}

function handleEditMotorista(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    if (!motorista) return;
    
    document.getElementById('editMotoristaId').value = motorista.id;
    document.getElementById('editMotoristaNome').value = motorista.nome;
    document.getElementById('editMotoristaMasterDrive').value = motorista.masterDrive || 'Sim';
    document.getElementById('editMotoristaDestra').value = motorista.destra || 'Sim';
    document.getElementById('editMotoristaCidade').value = motorista.cidade || '';
    
    document.getElementById('modalEdicaoMotorista').classList.add('show');
}

window.fecharModalEdicao = function() {
    document.getElementById('modalEdicaoMotorista').classList.remove('show');
};

window.salvarEdicaoMotorista = function() {
    const id = parseInt(document.getElementById('editMotoristaId').value);
    const nome = document.getElementById('editMotoristaNome').value.trim();
    const masterDrive = document.getElementById('editMotoristaMasterDrive').value;
    const destra = document.getElementById('editMotoristaDestra').value;
    const cidade = document.getElementById('editMotoristaCidade').value.trim();
    
    if (!nome) { alert('O nome do motorista é obrigatório!'); return; }
    
    const motorista = motoristas.find(m => m.id === id);
    if (motorista) {
        motorista.nome = nome;
        motorista.masterDrive = masterDrive;
        motorista.destra = destra;
        motorista.cidade = cidade;
        
        db.updateMotorista(id, { nome: motorista.nome, masterDrive: motorista.masterDrive, destra: motorista.destra, cidade: motorista.cidade });
        salvarBackupLocal();
        
        window.fecharModalEdicao(); 
        renderizarMotoristas(); renderizarEscala(); renderizarAlocacao();
    }
};

function handleRemoveMotorista(e) {
    const id = parseInt(e.target.dataset.id);
    if (confirm('Tem certeza que deseja remover este motorista?')) {
        motoristas = motoristas.filter(m => m.id !== id);
        delete escalas[id];
        
        db.deleteMotorista(id);
        db.deleteEscalasPorMotorista(id);
        salvarBackupLocal();
        
        renderizarEscala(); renderizarMotoristas(); renderizarAlocacao(); 
        if(typeof atualizarStats === 'function') atualizarStats();
    }
}
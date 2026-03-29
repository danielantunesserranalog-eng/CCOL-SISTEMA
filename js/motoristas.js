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
        const rowStyle = isBlocked ? 'background-color: #ffe6e6; color: #cc0000;' : '';
        const blockedIcon = isBlocked ? ' ⛔' : '';

        return `
            <tr style="${rowStyle}">
                <td><strong>${m.nome}${blockedIcon}</strong></td>
                <td>${m.masterDrive || '-'}</td>
                <td>${m.destra || '-'}</td>
                <td>${m.cidade || '-'}</td>
                <td>
                    <button class="btn-edit-motorista" data-id="${m.id}" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:6px; margin-right:5px;">✏️</button>
                    <button class="btn-delete-motorista" data-id="${m.id}" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:6px;">🗑️</button>
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
    
    getDatasSemana().forEach(d => {
        escalas[novoId][d.dateKey] = { turno: turnoPadrao, caminhao: 'F', status: 'normal' };
        db.upsertEscala({ id: `${novoId}_${d.dateKey}`, motorista_id: novoId, data: d.dateKey, turno: turnoPadrao, caminhao: 'F', status: 'normal' });
    });
    
    // Limpar campos
    document.getElementById('motoristaNome').value = '';
    document.getElementById('motoristaCidade').value = '';
    
    db.addMotorista(novoMot);
    salvarBackupLocal(); // Salva no LocalStorage
    
    renderizarMotoristas(); renderizarEscala(); renderizarAlocacao(); atualizarStats();
}

function handleEditMotorista(e) {
    const id = parseInt(e.target.dataset.id);
    const motorista = motoristas.find(m => m.id === id);
    if (!motorista) return;
    
    const novoNome = prompt('Nome do Motorista:', motorista.nome);
    if (novoNome === null) return;
    
    motorista.nome = novoNome.trim() || motorista.nome;
    motorista.masterDrive = prompt('Possui Master Drive? (Sim ou Não):', motorista.masterDrive) || motorista.masterDrive;
    motorista.destra = prompt('Possui curso Destra? (Sim ou Não):', motorista.destra) || motorista.destra;
    motorista.cidade = prompt('Cidade:', motorista.cidade) || motorista.cidade;
    
    db.updateMotorista(id, { nome: motorista.nome, masterDrive: motorista.masterDrive, destra: motorista.destra, cidade: motorista.cidade });
    salvarBackupLocal();
    
    renderizarMotoristas(); renderizarEscala(); renderizarAlocacao();
}

function handleRemoveMotorista(e) {
    const id = parseInt(e.target.dataset.id);
    if (confirm('Remover este motorista?')) {
        motoristas = motoristas.filter(m => m.id !== id);
        delete escalas[id];
        
        db.deleteMotorista(id);
        db.deleteEscalasPorMotorista(id);
        salvarBackupLocal();
        
        renderizarEscala(); renderizarMotoristas(); renderizarAlocacao(); atualizarStats();
    }
}
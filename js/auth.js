// ==================== MÓDULO: AUTENTICAÇÃO E USUÁRIOS ====================

let currentUser = null;
let listaUsuarios = [];

// Função nativa para criar Hash SHA-256 da senha
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------- LOGIN E ACESSO ----------------

window.realizarLogin = async function() {
    const userStr = document.getElementById('loginUser').value.trim().toUpperCase();
    const passStr = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLogin');

    if(!userStr || !passStr) { alert('Preencha seu usuário e senha.'); return; }

    btn.innerText = "Autenticando...";
    btn.disabled = true;

    try {
        const hashedPass = await hashPassword(passStr);
        const dbUser = await db.getUsuarioByUsername(userStr);

        if (dbUser && dbUser.senha_hash === hashedPass) {
            currentUser = dbUser;
            if (dbUser.primeiro_acesso) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('change-password-screen').style.display = 'flex';
            } else {
                iniciarSistemaAutorizado();
            }
        } else {
            alert('❌ Usuário ou senha incorretos.');
            btn.innerText = "Entrar";
            btn.disabled = false;
        }
    } catch(e) {
        console.error(e);
        alert('⚠️ Erro ao conectar com o servidor.');
        btn.innerText = "Entrar";
        btn.disabled = false;
    }
}

window.salvarNovaSenha = async function() {
    const p1 = document.getElementById('newPass1').value;
    const p2 = document.getElementById('newPass2').value;
    
    if(p1.length < 5) { alert('⚠️ A nova senha deve ter no mínimo 5 caracteres.'); return; }
    if(p1 !== p2) { alert('⚠️ As senhas digitadas não coincidem.'); return; }

    const hashedNewPass = await hashPassword(p1);
    await db.updateUsuarioSenha(currentUser.id, hashedNewPass);
    
    alert('✅ Senha alterada com sucesso! Bem-vindo(a) ao CCOL.');
    currentUser.primeiro_acesso = false;
    iniciarSistemaAutorizado();
}

window.fazerLogout = function() {
    if(confirm('Deseja realmente sair do sistema?')) {
        location.reload();
    }
}

function iniciarSistemaAutorizado() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('change-password-screen').style.display = 'none';
    document.getElementById('appLayout').style.display = 'flex';
    
    document.getElementById('loggedUserName').innerText = currentUser.username;
    document.getElementById('loggedUserRole').innerText = currentUser.role;

    // --- CONTROLE DE ACESSO (PERMISSÕES) ---
    const btnConfig = document.getElementById('navConfigBtn');
    if (currentUser.role === 'Admin') {
        btnConfig.style.display = 'block';
        carregarUsuarios(); // Puxa a lista de usuários para o painel de admin
    } else {
        btnConfig.style.display = 'none'; // Esconde menu configurações para Controlador
    }

    // Dispara a carga da aplicação original (em app.js)
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
}

// Escuta a tecla ENTER no login
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginPass')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') realizarLogin();
    });
});

// ---------------- GERENCIAMENTO DE USUÁRIOS (APENAS ADMIN) ----------------

window.carregarUsuarios = async function() {
    listaUsuarios = await db.getUsuarios();
    renderizarTabelaUsuarios();
}

window.renderizarTabelaUsuarios = function() {
    const tbody = document.getElementById('tabelaUsuarios');
    if (!tbody) return;

    if (listaUsuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = listaUsuarios.map(u => {
        const isCurrent = u.id === currentUser.id;
        const statusBadge = u.primeiro_acesso 
            ? `<span style="background: rgba(251, 146, 60, 0.1); color: var(--ccol-rust-bright); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; border: 1px solid var(--ccol-rust-bright);">Pendente (1º Acesso)</span>`
            : `<span style="background: rgba(61, 220, 132, 0.1); color: var(--ccol-green-bright); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; border: 1px solid var(--ccol-green-bright);">Ativo</span>`;
            
        return `
        <tr>
            <td style="font-weight: bold; color: var(--ccol-blue-bright);">${u.username} ${isCurrent ? '(Você)' : ''}</td>
            <td>${u.role}</td>
            <td>${statusBadge}</td>
            <td>
                <button onclick="resetarSenhaUsuario(${u.id})" ${isCurrent ? 'disabled' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid #666; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: ${isCurrent ? 'not-allowed' : 'pointer'}; font-size: 0.75rem;" title="Voltar a senha para 12345">🔄 Resetar Senha</button>
                <button onclick="excluirUsuario(${u.id})" ${isCurrent ? 'disabled' : ''} style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 5px 10px; border-radius: 4px; cursor: ${isCurrent ? 'not-allowed' : 'pointer'}; font-size: 0.75rem; margin-left: 5px;" title="Excluir Usuário">🗑️ Excluir</button>
            </td>
        </tr>
    `}).join('');
}

window.adicionarUsuario = async function() {
    const nome = document.getElementById('novoUsername').value.trim().toUpperCase();
    const role = document.getElementById('novoUserRole').value;

    if (!nome) { alert('Digite o nome de usuário (Ex: JOAO.SILVA)'); return; }
    if (listaUsuarios.some(u => u.username === nome)) { alert('⚠️ Este usuário já existe!'); return; }

    // O Hash gerado equivale à senha padrão "12345"
    const hashPadrao = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";

    const novoUser = {
        username: nome,
        senha_hash: hashPadrao,
        role: role,
        primeiro_acesso: true
    };

    try {
        await db.addUsuario(novoUser);
        document.getElementById('novoUsername').value = '';
        alert(`✅ Usuário ${nome} criado com sucesso!\nSenha provisória: 12345`);
        carregarUsuarios();
    } catch(e) {
        console.error(e);
        alert('Erro ao criar usuário no banco de dados.');
    }
}

window.resetarSenhaUsuario = async function(id) {
    const u = listaUsuarios.find(x => x.id === id);
    if (!u) return;

    if(confirm(`Tem certeza que deseja RESETAR a senha de ${u.username} para "12345"?\nEle será forçado a trocar a senha novamente.`)) {
        const hashPadrao = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";
        await db.updateUsuarioSenhaEReset(id, hashPadrao);
        alert(`A senha de ${u.username} foi resetada para 12345.`);
        carregarUsuarios();
    }
}

window.excluirUsuario = async function(id) {
    const u = listaUsuarios.find(x => x.id === id);
    if (!u) return;

    if(confirm(`🚨 ATENÇÃO: Deseja EXCLUIR permanentemente o acesso do usuário ${u.username}?`)) {
        await db.deleteUsuario(id);
        alert('Usuário excluído.');
        carregarUsuarios();
    }
}
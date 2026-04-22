// Configuração do Supabase
const supabaseUrl = 'https://ihgiyxzxdldqmrkziijl.supabase.co';
const supabaseKey = 'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================= CORREÇÃO DO ERRO SUPABASE =================
window.supabaseClient = supabaseClient; 
// ==============================================================

const db = {
    // --- LOGIN E USUÁRIOS ---
    async getUsuarioByUsername(username) {
        const { data, error } = await supabaseClient.from('usuarios').select('*').eq('username', username).single();
        if (error) return null;
        return data;
    },
    async updateUsuarioSenha(id, senha_hash) {
        await supabaseClient.from('usuarios').update({ senha_hash: senha_hash, primeiro_acesso: false }).eq('id', id);
    },
    async getUsuarios() {
        const { data } = await supabaseClient.from('usuarios').select('*').order('id', { ascending: true });
        return data || [];
    },
    async addUsuario(usuario) {
        await supabaseClient.from('usuarios').insert([usuario]);
    },
    async updateUsuarioSenhaEReset(id, senha_hash) {
        await supabaseClient.from('usuarios').update({ senha_hash: senha_hash, primeiro_acesso: true }).eq('id', id);
    },
    async deleteUsuario(id) {
        await supabaseClient.from('usuarios').delete().eq('id', id);
    },

    // --- LOGS DE SEGURANÇA ---
    async getLogs() {
        const { data } = await supabaseClient.from('logs_exclusao').select('*').order('data_hora', { ascending: false }).limit(50);
        return data || [];
    },
    async addLog(acao, detalhes) {
        if (!currentUser) return;
        await supabaseClient.from('logs_exclusao').insert([{ usuario: currentUser.username, acao, detalhes }]);
    },

    // --- CONJUNTOS / TRINCAS ---
    async getConjuntos() {
        const { data } = await supabaseClient.from('conjuntos').select('*').order('id', { ascending: true });
        return data || [];
    },
    async addConjunto(conjunto) {
        await supabaseClient.from('conjuntos').insert([conjunto]);
    },
    async deleteConjunto(id) {
        await supabaseClient.from('conjuntos').delete().eq('id', id);
    },
    async updateConjunto(id, caminhoes) {
        await supabaseClient.from('conjuntos').update({ caminhoes }).eq('id', id);
    },

    // --- MOTORISTAS ---
    async getMotoristas() {
        const { data } = await supabaseClient.from('motoristas').select('*');
        return data || [];
    },
    async addMotorista(motorista) {
        await supabaseClient.from('motoristas').insert([motorista]);
    },
    async updateMotorista(id, updates) {
        Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

        const { data, error } = await supabaseClient.from('motoristas')
            .update(updates)
            .eq('id', id)
            .select();
            
        if (error) {
            console.error("⛔ ERRO SUPABASE MOTORISTA:", error);
            alert("ERRO NA BASE DE DADOS (Motorista): A alteração foi rejeitada pelo servidor!\nMotivo: " + error.message);
            throw error;
        }

        if (!data || data.length === 0) {
            console.error("⚠️ Falha Invisível: Nenhuma linha afetada para o ID", id);
            alert("⚠️ ALERTA DE SINCRONIZAÇÃO: O Supabase falhou ao tentar guardar o motorista. Verifique o tipo de dado.");
            throw new Error("Zero rows updated in Supabase");
        }
    },
    async deleteMotorista(id) {
        await supabaseClient.from('motoristas').delete().eq('id', id);
    },

    // --- EXCEÇÕES DA ESCALA (Ajustes Manuais) ---
    async getEscalas() {
        const { data, error } = await supabaseClient.from('escalas').select('*');
        if (error) console.error("Erro a extrair exceções da escala:", error);
        return data || [];
    },
    async upsertEscala(escala) {
        const { error } = await supabaseClient.from('escalas').upsert([escala]);
        if (error) {
            console.error("⛔ ERRO EXCEÇÃO ESCALA:", error);
            alert("Erro ao guardar o ajuste desta escala!\nMotivo: " + error.message);
            throw error;
        }
    },
    async deleteEscalaDia(id) {
        const { error } = await supabaseClient.from('escalas').delete().eq('id', id);
        if (error) throw error;
    },
    async deleteEscalasPorMotorista(motorista_id) {
        await supabaseClient.from('escalas').delete().eq('motorista_id', motorista_id);
    },
    async limparApenasEscalas() {
        const { error } = await supabaseClient.from('escalas').delete().neq('id', '0');
        if (error) console.error("Erro ao limpar exceções:", error);
    },
    
    // --- TREINAMENTOS ---
    async getInstrutores() {
        const { data, error } = await supabaseClient.from('instrutores').select('*');
        if (error) console.error("Erro instrutores:", error);
        return data || [];
    },
    async addInstrutor(instrutor) {
        await supabaseClient.from('instrutores').insert([instrutor]);
    },
    async deleteInstrutor(nome) {
        await supabaseClient.from('instrutores').delete().eq('nome', nome);
    },
    async getTreinamentos() {
        const { data, error } = await supabaseClient.from('treinamentos').select('*');
        if (error) console.error("Erro treinamentos:", error);
        return data || [];
    },
    async upsertTreinamento(treinamento) {
        const { error } = await supabaseClient.from('treinamentos').upsert([treinamento]);
        if (error) {
            console.error("⛔ ERRO SUPABASE TREINAMENTOS:", error);
            alert("ERRO NA BASE DE DADOS (Treinamentos): A alteração não foi guardada!\nMotivo: " + error.message);
            throw error;
        }
    },
    async deleteTreinamento(id) {
        await supabaseClient.from('treinamentos').delete().eq('id', id);
    },

    // --- PERMISSÕES DE ACESSO ---
    async getPermissoesDB() {
        const { data, error } = await supabaseClient.from('permissoes_perfis').select('*');
        if (error || !data) return {};
        const permissoesObj = {};
        data.forEach(item => {
            permissoesObj[item.perfil] = item.menus;
        });
        return permissoesObj;
    },
    async updatePermissoesDB(perfil, menus) {
        const { error } = await supabaseClient.from('permissoes_perfis').upsert([{ perfil: perfil, menus: menus }]);
        if (error) {
            console.error("Erro ao guardar permissões:", error);
            alert("Erro ao guardar permissões na base de dados. Motivo: " + error.message);
        }
    }
};
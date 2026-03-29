// Configuração do Supabase fornecida
const supabaseUrl = 'https://ihgiyxzxdldqmrkziijl.supabase.co';
const supabaseKey = 'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const db = {
    // --- SISTEMA DE LOGIN E USUÁRIOS ---
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
        const { error } = await supabaseClient.from('usuarios').insert([usuario]);
        if (error) throw error;
    },
    async updateUsuarioSenhaEReset(id, senha_hash) {
        await supabaseClient.from('usuarios').update({ senha_hash: senha_hash, primeiro_acesso: true }).eq('id', id);
    },
    async deleteUsuario(id) {
        await supabaseClient.from('usuarios').delete().eq('id', id);
    },

    // --- CONJUNTOS ---
    async getConjuntos() {
        const { data } = await supabaseClient.from('conjuntos').select('*');
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
        await supabaseClient.from('motoristas').update(updates).eq('id', id);
    },
    async deleteMotorista(id) {
        await supabaseClient.from('motoristas').delete().eq('id', id);
    },

    // --- ESCALAS ---
    async getEscalas() {
        const { data } = await supabaseClient.from('escalas').select('*');
        return data || [];
    },
    async upsertEscala(escala) {
        await supabaseClient.from('escalas').upsert([escala]);
    },
    async deleteEscalasPorMotorista(motorista_id) {
        await supabaseClient.from('escalas').delete().eq('motorista_id', motorista_id);
    },
    
    // --- TREINAMENTOS ---
    async getInstrutores() {
        const { data } = await supabaseClient.from('instrutores').select('*');
        return data || [];
    },
    async addInstrutor(instrutor) {
        await supabaseClient.from('instrutores').insert([instrutor]);
    },
    async deleteInstrutor(nome) {
        await supabaseClient.from('instrutores').delete().eq('nome', nome);
    },
    async getTreinamentos() {
        const { data } = await supabaseClient.from('treinamentos').select('*');
        return data || [];
    },
    async upsertTreinamento(treinamento) {
        await supabaseClient.from('treinamentos').upsert([treinamento]);
    },
    async deleteTreinamento(id) {
        await supabaseClient.from('treinamentos').delete().eq('id', id);
    },

    async limparApenasEscalas() {
        const { error } = await supabaseClient.from('escalas').delete().neq('id', '0');
        if (error) console.error("Erro ao limpar escalas:", error);
    }
};
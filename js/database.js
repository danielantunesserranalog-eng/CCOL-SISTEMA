// Configuração do Supabase fornecida
const supabaseUrl = 'https://ihgiyxzxdldqmrkziijl.supabase.co';
const supabaseKey = 'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const db = {
    // --- CONJUNTOS ---
    async getConjuntos() {
        const { data, error } = await supabaseClient.from('conjuntos').select('*');
        if (error) console.error('Erro getConjuntos:', error);
        return data || [];
    },
    async addConjunto(conjunto) {
        const { error } = await supabaseClient.from('conjuntos').insert([conjunto]);
        if (error) console.error('Erro addConjunto:', error);
    },
    async deleteConjunto(id) {
        const { error } = await supabaseClient.from('conjuntos').delete().eq('id', id);
        if (error) console.error('Erro deleteConjunto:', error);
    },
    async updateConjunto(id, caminhoes) {
        const { error } = await supabaseClient.from('conjuntos').update({ caminhoes }).eq('id', id);
        if (error) console.error('Erro updateConjunto:', error);
    },

    // --- MOTORISTAS ---
    async getMotoristas() {
        const { data, error } = await supabaseClient.from('motoristas').select('*');
        if (error) console.error('Erro getMotoristas:', error);
        return data || [];
    },
    async addMotorista(motorista) {
        const { error } = await supabaseClient.from('motoristas').insert([motorista]);
        if (error) console.error('Erro addMotorista:', error);
    },
    async updateMotorista(id, updates) {
        const { error } = await supabaseClient.from('motoristas').update(updates).eq('id', id);
        if (error) console.error('Erro updateMotorista:', error);
    },
    async deleteMotorista(id) {
        const { error } = await supabaseClient.from('motoristas').delete().eq('id', id);
        if (error) console.error('Erro deleteMotorista:', error);
    },

    // --- ESCALAS ---
    async getEscalas() {
        const { data, error } = await supabaseClient.from('escalas').select('*');
        if (error) console.error('Erro getEscalas:', error);
        return data || [];
    },
    async upsertEscala(escala) {
        const { error } = await supabaseClient.from('escalas').upsert([escala]);
        if (error) console.error('Erro upsertEscala:', error);
    },
    async deleteEscalasPorMotorista(motorista_id) {
        const { error } = await supabaseClient.from('escalas').delete().eq('motorista_id', motorista_id);
        if (error) console.error('Erro deleteEscalasPorMotorista:', error);
    },
    
    // Função para deletar todos os dados (útil pro reset)
    async limparTudo() {
        await supabaseClient.from('escalas').delete().neq('id', '0');
        await supabaseClient.from('motoristas').delete().neq('id', 0);
        await supabaseClient.from('conjuntos').delete().neq('id', 0);
    }
};
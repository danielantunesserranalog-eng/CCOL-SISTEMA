// ==================== MÓDULO: ALMOXARIFADO ====================

let estoqueProdutos = [];

// Formatador de Moeda Brasileira (R$)
const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};

// Alternar as abas do Almoxarifado
async function alternarTelaAlmoxarifado(tela) {
    document.getElementById('telaListaAlmoxarifado').style.display = 'none';
    document.getElementById('telaNovoProduto').style.display = 'none';

    if (tela === 'lista') {
        document.getElementById('telaListaAlmoxarifado').style.display = 'block';
        await carregarEstoque();
    } else if (tela === 'novo') {
        document.getElementById('telaNovoProduto').style.display = 'block';
        limparFormularioProduto();
    }
}

// Buscar dados no Supabase
async function carregarEstoque() {
    try {
        const { data, error } = await supabaseClient
            .from('almoxarifado')
            .select('*')
            .order('nome_produto', { ascending: true });
        
        if (!error && data) {
            estoqueProdutos = data;
            renderizarTabelaEstoque();
        } else {
            console.error("Erro ao carregar almoxarifado:", error);
        }
    } catch (error) {
        console.error("Erro interno:", error);
    }
}

// Renderizar a tabela e os painéis de resumo
function renderizarTabelaEstoque() {
    const tbody = document.getElementById('tabelaEstoque');
    const termo = document.getElementById('searchEstoque').value.toLowerCase();
    
    let totalItens = estoqueProdutos.length;
    let valorTotalEstoque = 0;
    let qtdEstoqueBaixo = 0;

    if (estoqueProdutos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Estoque vazio. Nenhum produto cadastrado.</td></tr>';
        document.getElementById('kpiTotalItens').innerText = '0';
        document.getElementById('kpiValorTotal').innerText = 'R$ 0,00';
        document.getElementById('kpiEstoqueBaixo').innerText = '0';
        return;
    }

    const filtrados = estoqueProdutos.filter(p => 
        p.nome_produto.toLowerCase().includes(termo) || 
        p.categoria.toLowerCase().includes(termo) ||
        String(p.id).includes(termo)
    );

    tbody.innerHTML = filtrados.map(p => {
        // Cálculos Financeiros
        const valorTotalItem = (p.quantidade_estoque * p.valor_unitario);
        valorTotalEstoque += valorTotalItem;

        // Lógica Visual do Estoque (Verde = OK, Vermelho = Baixo/Zerad)
        let badgeEstoque = '';
        if (p.quantidade_estoque <= 0) {
            qtdEstoqueBaixo++;
            badgeEstoque = `<span style="color: #ef4444; font-weight: bold;">${p.quantidade_estoque} ${p.unidade_medida} (ZERADO)</span>`;
        } else if (p.quantidade_estoque <= p.estoque_minimo) {
            qtdEstoqueBaixo++;
            badgeEstoque = `<span style="color: #f59e0b; font-weight: bold;">${p.quantidade_estoque} ${p.unidade_medida} (BAIXO)</span>`;
        } else {
            badgeEstoque = `<span style="color: var(--ccol-green-bright);">${p.quantidade_estoque} ${p.unidade_medida}</span>`;
        }

        return `
            <tr>
                <td><strong>#${String(p.id).padStart(4, '0')}</strong></td>
                <td style="color: #fff; font-weight: bold;">${p.nome_produto}</td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${p.categoria}</span></td>
                <td>${badgeEstoque}</td>
                <td>${formatarMoeda(p.valor_unitario)}</td>
                <td style="color: var(--ccol-blue-bright); font-weight: bold;">${formatarMoeda(valorTotalItem)}</td>
                <td>
                    <button onclick="deletarProduto(${p.id})" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer;" title="Excluir Produto">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    // Atualiza os painéis (KPIs)
    document.getElementById('kpiTotalItens').innerText = totalItens;
    document.getElementById('kpiValorTotal').innerText = formatarMoeda(valorTotalEstoque);
    document.getElementById('kpiEstoqueBaixo').innerText = qtdEstoqueBaixo;
}

// Salvar (Inserir) novo produto no banco
async function salvarProduto() {
    const nome_produto = document.getElementById('prodNome').value.trim();
    const categoria = document.getElementById('prodCategoria').value;
    const unidade_medida = document.getElementById('prodUnidade').value;
    const quantidade_estoque = parseFloat(document.getElementById('prodQtd').value) || 0;
    const estoque_minimo = parseFloat(document.getElementById('prodMinimo').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('prodValor').value) || 0;

    if (!nome_produto) {
        alert("O nome/descrição do produto é obrigatório!");
        return;
    }

    const novoProduto = {
        nome_produto,
        categoria,
        unidade_medida,
        quantidade_estoque,
        estoque_minimo,
        valor_unitario
    };

    const { error } = await supabaseClient.from('almoxarifado').insert([novoProduto]);

    if (error) {
        alert("Erro ao cadastrar produto.");
        console.error(error);
        return;
    }

    alert("Produto cadastrado com sucesso!");
    alternarTelaAlmoxarifado('lista');
}

// Excluir produto
async function deletarProduto(id) {
    if (confirm("ATENÇÃO: Deseja realmente excluir este produto do catálogo?")) {
        const { error } = await supabaseClient.from('almoxarifado').delete().eq('id', id);
        
        if (!error) {
            await carregarEstoque();
        } else {
            alert("Erro ao excluir.");
            console.error(error);
        }
    }
}

function limparFormularioProduto() {
    document.getElementById('prodNome').value = '';
    document.getElementById('prodQtd').value = '';
    document.getElementById('prodMinimo').value = '';
    document.getElementById('prodValor').value = '';
}

// Inicia a tela carregando os dados caso seja chamada
// alternarTelaAlmoxarifado('lista');
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
                    <button onclick="abrirModalRetirada(${p.id})" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;" title="Retirar do Estoque">📤 Retirar</button>
                    <button onclick="abrirModalEdicaoProduto(${p.id})" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid #3b82f6; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold; margin-left: 5px;" title="Editar Produto">✏️ Editar</button>
                    <button onclick="deletarProduto(${p.id})" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer; margin-left: 5px;" title="Excluir Produto">🗑️</button>
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


// ================= EDIÇÃO DE PRODUTO =================

window.abrirModalEdicaoProduto = function(id) {
    const p = estoqueProdutos.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('editProdId').value = p.id;
    document.getElementById('editProdNome').value = p.nome_produto;
    document.getElementById('editProdQtd').value = p.quantidade_estoque;
    document.getElementById('editProdMinimo').value = p.estoque_minimo;
    document.getElementById('editProdValor').value = p.valor_unitario;

    document.getElementById('modalEdicaoProduto').classList.add('show');
}

window.fecharModalEdicaoProduto = function() {
    document.getElementById('modalEdicaoProduto').classList.remove('show');
}

window.salvarEdicaoProduto = async function() {
    const id = parseInt(document.getElementById('editProdId').value);
    const nome_produto = document.getElementById('editProdNome').value.trim();
    const quantidade_estoque = parseFloat(document.getElementById('editProdQtd').value) || 0;
    const estoque_minimo = parseFloat(document.getElementById('editProdMinimo').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('editProdValor').value) || 0;

    if (!nome_produto) {
        alert("O nome do produto é obrigatório!");
        return;
    }

    // Atualiza os dados no Supabase
    const { error } = await supabaseClient
        .from('almoxarifado')
        .update({ nome_produto, quantidade_estoque, estoque_minimo, valor_unitario })
        .eq('id', id);

    if (error) {
        alert("Erro ao editar produto.");
        console.error(error);
        return;
    }

    alert("Produto atualizado com sucesso!");
    fecharModalEdicaoProduto();
    carregarEstoque(); // Recarrega a tabela e os painéis de KPIs automaticamente
}

// ================= RETIRADA DE PRODUTO =================

window.abrirModalRetirada = function(id) {
    const p = estoqueProdutos.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('retiradaProdId').value = p.id;
    document.getElementById('retiradaProdNome').innerText = p.nome_produto;
    document.getElementById('retiradaEstoqueAtual').innerText = p.quantidade_estoque + ' ' + p.unidade_medida;
    document.getElementById('qtdRetirada').value = '';

    document.getElementById('modalRetiradaProduto').classList.add('show');
}

window.fecharModalRetirada = function() {
    document.getElementById('modalRetiradaProduto').classList.remove('show');
}

window.confirmarRetirada = async function() {
    const id = parseInt(document.getElementById('retiradaProdId').value);
    const qtdRetirar = parseFloat(document.getElementById('qtdRetirada').value);
    const p = estoqueProdutos.find(prod => prod.id === id);

    if (!p || isNaN(qtdRetirar) || qtdRetirar <= 0) {
        alert("Informe uma quantidade válida para retirar!");
        return;
    }

    if (qtdRetirar > p.quantidade_estoque) {
        alert("Quantidade insuficiente em estoque!");
        return;
    }

    // Subtrai a quantidade do estoque atual
    const novaQuantidade = p.quantidade_estoque - qtdRetirar;

    const { error } = await supabaseClient
        .from('almoxarifado')
        .update({ quantidade_estoque: novaQuantidade })
        .eq('id', id);

    if (error) {
        alert("Erro ao registrar a retirada.");
        console.error(error);
        return;
    }

    alert("Retirada (baixa) realizada com sucesso!");
    fecharModalRetirada();
    carregarEstoque(); // Recarrega a tabela atualizando o inventário e os KPIs
}
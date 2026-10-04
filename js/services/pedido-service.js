import { apiRequest, ApiError } from './api-service.js';
import { getProdutoById } from './produto-service.js';
import { getEstoqueByProdutoId, updateEstoqueQuantidade } from './estoque-service.js';
import { calcularTotal, pedidoCancelado, quantidadeValida } from '../domain/regras.js';

/**
 * Busca todos os pedidos cadastrados
 */
export async function getPedidos() {
    return await apiRequest('/pedidos');
}

/**
 * Busca um pedido específico pelo ID
 * @param {string} id
 */
export async function getPedidoById(id) {
    return await apiRequest(`/pedidos/${encodeURIComponent(id)}`);
}

/**
 * Cria um pedido, abate os itens do estoque e reavalia o status dos produtos.
 *
 * Segurança/integridade: o preço e o total NUNCA são confiados ao navegador; são lidos do cadastro
 * de produtos no momento da compra. Itens repetidos do mesmo produto são somados antes de validar.
 *
 * @param {{cliente: string, itens: Array<{produtoId: string, quantidade: number}>}} pedidoData
 */
export async function createPedido(pedidoData) {
    const cliente = String(pedidoData.cliente ?? '').trim();
    if (!cliente) throw new Error('Informe o nome do cliente.');
    if (!Array.isArray(pedidoData.itens) || pedidoData.itens.length === 0) {
        throw new Error('O pedido precisa conter pelo menos um item.');
    }

    // Consolida itens repetidos e valida quantidades
    const porProduto = new Map();
    for (const item of pedidoData.itens) {
        const qtd = quantidadeValida(item.quantidade);
        if (qtd < 1) throw new Error('A quantidade de cada item deve ser um inteiro maior que zero.');
        porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + qtd);
    }

    // 1. Valida estoque suficiente para TODOS os itens antes de alterar qualquer coisa
    const linhas = [];
    for (const [produtoId, quantidade] of porProduto) {
        const produto = await getProdutoById(produtoId);
        const estoque = await getEstoqueByProdutoId(produtoId);
        const disponivel = estoque ? Number(estoque.quantidade) : 0;
        if (disponivel < quantidade) {
            throw new Error(`Estoque insuficiente para "${produto.nome}". Restam apenas ${disponivel} unidades.`);
        }
        linhas.push({ produtoId, quantidade, precoUnitario: produto.preco, disponivel });
    }

    // 2. Abate do estoque (cada chamada recalcula o status do produto)
    for (const linha of linhas) {
        await updateEstoqueQuantidade(linha.produtoId, linha.disponivel - linha.quantidade);
    }

    // 3. Salva o pedido com o total calculado no servidor de regras
    const itens = linhas.map(({ produtoId, quantidade, precoUnitario }) => ({ produtoId, quantidade, precoUnitario }));
    return await apiRequest('/pedidos', 'POST', {
        cliente,
        itens,
        total: calcularTotal(itens),
        data: new Date().toISOString(),
        status: 'Concluído',
    });
}

/**
 * Cancela um pedido e devolve as quantidades ao estoque.
 * Produtos que já foram excluídos do catálogo são ignorados (não há o que repor).
 * @param {string} pedidoId
 */
export async function cancelarPedido(pedidoId) {
    const pedido = await getPedidoById(pedidoId);

    if (pedidoCancelado(pedido)) {
        throw new Error('Este pedido já se encontra cancelado.');
    }

    // Marca como cancelado ANTES de repor o estoque: se algo falhar no meio, nunca repomos duas vezes.
    const atualizado = await apiRequest(`/pedidos/${encodeURIComponent(pedidoId)}`, 'PATCH', { status: 'Cancelado' });

    for (const item of pedido.itens) {
        try {
            await getProdutoById(item.produtoId);
        } catch (erro) {
            if (erro instanceof ApiError && erro.status === 404) continue;
            throw erro;
        }
        const estoque = await getEstoqueByProdutoId(item.produtoId);
        const atual = estoque ? Number(estoque.quantidade) : 0;
        await updateEstoqueQuantidade(item.produtoId, atual + Number(item.quantidade));
    }

    return atualizado;
}

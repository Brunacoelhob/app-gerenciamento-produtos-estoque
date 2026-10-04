import { apiRequest } from './api-service.js';
import { calcularStatus, quantidadeValida } from '../domain/regras.js';
import { updateProdutoStatus } from './produto-service.js';

/**
 * Busca todos os registros de estoque
 */
export async function getEstoque() {
    return await apiRequest('/estoque');
}

/**
 * Busca o item de estoque correspondente a um determinado produto
 * @param {string} produtoId
 */
export async function getEstoqueByProdutoId(produtoId) {
    const itens = await apiRequest(`/estoque?produtoId=${encodeURIComponent(produtoId)}`);
    return Array.isArray(itens) && itens.length > 0 ? itens[0] : null;
}

/**
 * Atualiza ou cria o registro de estoque e RECALCULA o status do produto (propriedade derivada).
 * @param {string} produtoId
 * @param {number} novaQuantidade
 */
export async function updateEstoqueQuantidade(produtoId, novaQuantidade) {
    // Garante inteiro não negativo
    const quantidadeSanitizada = quantidadeValida(novaQuantidade);
    const itemEstoque = await getEstoqueByProdutoId(produtoId);
    const dataAtual = new Date().toISOString();
    let result;

    if (itemEstoque) {
        result = await apiRequest(`/estoque/${encodeURIComponent(itemEstoque.id)}`, 'PATCH', {
            quantidade: quantidadeSanitizada,
            atualizadoEm: dataAtual,
        });
    } else {
        result = await apiRequest('/estoque', 'POST', {
            produtoId,
            quantidade: quantidadeSanitizada,
            atualizadoEm: dataAtual,
        });
    }

    // REGRA DE NEGÓCIO: recalcula e grava o status do produto a partir da nova quantidade
    await updateProdutoStatus(produtoId, calcularStatus(quantidadeSanitizada));

    return result;
}

/**
 * Remove um registro de estoque pelo ID
 * @param {string} id
 */
export async function deleteEstoque(id) {
    return await apiRequest(`/estoque/${encodeURIComponent(id)}`, 'DELETE');
}

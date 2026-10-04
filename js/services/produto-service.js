import { apiRequest } from './api-service.js';
import { STATUS } from '../domain/regras.js';

// A regra do status derivado mora em domain/regras.js; reexportada aqui por compatibilidade.
export { calcularStatus } from '../domain/regras.js';

/**
 * Busca todos os produtos cadastrados
 */
export async function getProdutos() {
    return await apiRequest('/produtos');
}

/**
 * Busca um produto específico pelo ID
 * @param {string} id
 */
export async function getProdutoById(id) {
    return await apiRequest(`/produtos/${encodeURIComponent(id)}`);
}

/** Só estes campos podem ser digitados pelo usuário; o status NUNCA vem do formulário. */
function camposEditaveis({ nome, categoria, preco }) {
    const precoNumerico = Number(preco);
    if (!String(nome ?? '').trim()) throw new Error('O nome do produto é obrigatório.');
    if (!String(categoria ?? '').trim()) throw new Error('A categoria é obrigatória.');
    if (!Number.isFinite(precoNumerico) || precoNumerico < 0) throw new Error('O preço deve ser um número maior ou igual a zero.');
    return { nome: String(nome).trim(), categoria: String(categoria).trim(), preco: precoNumerico };
}

/**
 * Cadastra um novo produto. Nasce "Indisponível" até existir quantidade em estoque.
 * @param {Object} produtoData
 */
export async function createProduto(produtoData) {
    return await apiRequest('/produtos', 'POST', { ...camposEditaveis(produtoData), status: STATUS.INDISPONIVEL });
}

/**
 * Atualiza nome, categoria e preço. Preserva o status derivado atual (não pode ser sobrescrito).
 * @param {string} id
 * @param {Object} produtoData
 */
export async function updateProduto(id, produtoData) {
    return await apiRequest(`/produtos/${encodeURIComponent(id)}`, 'PATCH', camposEditaveis(produtoData));
}

/**
 * Atualiza apenas o status (chamado exclusivamente pelo módulo de estoque, a partir da quantidade).
 * @param {string} id
 * @param {string} novoStatus
 */
export async function updateProdutoStatus(id, novoStatus) {
    return await apiRequest(`/produtos/${encodeURIComponent(id)}`, 'PATCH', { status: novoStatus });
}

/**
 * Remove um produto pelo ID
 * @param {string} id
 */
export async function deleteProduto(id) {
    return await apiRequest(`/produtos/${encodeURIComponent(id)}`, 'DELETE');
}

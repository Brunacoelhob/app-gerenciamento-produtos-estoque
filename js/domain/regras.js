/**
 * Regras de negócio puras (sem rede, sem DOM): fáceis de testar e a única fonte da verdade.
 */

/** Acima deste valor o produto é "Disponível"; de 1 até este valor é "Estoque baixo". */
export const LIMITE_ESTOQUE_BAIXO = 10;

export const STATUS = Object.freeze({
    DISPONIVEL: 'Disponível',
    BAIXO: 'Estoque baixo',
    INDISPONIVEL: 'Indisponível',
});

/**
 * PROPRIEDADE DERIVADA (requisito central): o status do produto é SEMPRE calculado a partir da
 * quantidade em estoque e nunca digitado pelo usuário. Quem altera o estoque (ajuste manual,
 * novo pedido ou cancelamento) chama esta função e grava o resultado no produto.
 *
 *   quantidade > 10        -> Disponível
 *   1 <= quantidade <= 10  -> Estoque baixo
 *   quantidade = 0         -> Indisponível
 */
export function calcularStatus(quantidade) {
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) return STATUS.INDISPONIVEL;
    return qtd > LIMITE_ESTOQUE_BAIXO ? STATUS.DISPONIVEL : STATUS.BAIXO;
}

/** Converte para inteiro >= 0; qualquer valor inválido vira 0. */
export function quantidadeValida(valor) {
    const n = Math.trunc(Number(valor));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Total do pedido em reais, arredondado para centavos (evita 0.1 + 0.2 = 0.30000000000000004). */
export function calcularTotal(itens) {
    const centavos = itens.reduce(
        (acc, i) => acc + Math.round(Number(i.precoUnitario) * 100) * Number(i.quantidade),
        0
    );
    return centavos / 100;
}

export function pedidoCancelado(pedido) {
    return typeof pedido?.status === 'string' && pedido.status.startsWith('Cancelado');
}

/** Classe CSS do selo de status do produto. */
export function classeBadge(status) {
    if (status === STATUS.BAIXO) return 'badge-baixo';
    if (status === STATUS.INDISPONIVEL) return 'badge-indisponivel';
    return 'badge-disponivel';
}

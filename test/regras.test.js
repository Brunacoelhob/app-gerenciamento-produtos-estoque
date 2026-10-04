import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularStatus, calcularTotal, classeBadge, pedidoCancelado, quantidadeValida, STATUS,
} from '../js/domain/regras.js';
import { esc } from '../js/utils/html.js';

test('status derivado respeita os limites do enunciado (0, 1, 10, 11)', () => {
    assert.equal(calcularStatus(0), STATUS.INDISPONIVEL);
    assert.equal(calcularStatus(1), STATUS.BAIXO);
    assert.equal(calcularStatus(10), STATUS.BAIXO);
    assert.equal(calcularStatus(11), STATUS.DISPONIVEL);
});

test('status derivado trata entradas estranhas como indisponível', () => {
    for (const ruim of [-3, NaN, undefined, null, 'abc', Infinity * 0]) {
        assert.equal(calcularStatus(ruim), STATUS.INDISPONIVEL, `entrada: ${String(ruim)}`);
    }
    assert.equal(calcularStatus('25'), STATUS.DISPONIVEL, 'número em texto (vindo de formulário)');
});

test('quantidadeValida devolve inteiro positivo ou zero', () => {
    assert.equal(quantidadeValida('7'), 7);
    assert.equal(quantidadeValida(3.9), 3);
    assert.equal(quantidadeValida(-1), 0);
    assert.equal(quantidadeValida('x'), 0);
});

test('total do pedido não sofre erro de ponto flutuante', () => {
    // 0,1 * 3 + 0,2 em float puro daria 0.5000000000000001
    assert.equal(calcularTotal([{ precoUnitario: 0.1, quantidade: 3 }, { precoUnitario: 0.2, quantidade: 1 }]), 0.5);
    assert.equal(calcularTotal([{ precoUnitario: 259.9, quantidade: 2 }, { precoUnitario: 199.9, quantidade: 1 }]), 719.7);
});

test('pedido cancelado é reconhecido pelo prefixo do status', () => {
    assert.ok(pedidoCancelado({ status: 'Cancelado' }));
    assert.ok(pedidoCancelado({ status: 'Cancelado - sem estoque' }));
    assert.ok(!pedidoCancelado({ status: 'Concluído' }));
    assert.ok(!pedidoCancelado(undefined));
});

test('classe do selo por status', () => {
    assert.equal(classeBadge(STATUS.BAIXO), 'badge-baixo');
    assert.equal(classeBadge(STATUS.INDISPONIVEL), 'badge-indisponivel');
    assert.equal(classeBadge(STATUS.DISPONIVEL), 'badge-disponivel');
});

test('esc neutraliza HTML e aspas (proteção contra XSS)', () => {
    const malicioso = `<img src=x onerror="alert('x')">&`;
    const seguro = esc(malicioso);
    assert.ok(!seguro.includes('<') && !seguro.includes('>') && !seguro.includes('"') && !seguro.includes("'"));
    assert.equal(seguro, '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
    assert.equal(esc(null), '');
    assert.equal(esc(42), '42');
});

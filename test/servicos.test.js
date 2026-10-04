import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { instalar } from './helpers/json-server-falso.js';
import { createProduto, updateProduto } from '../js/services/produto-service.js';
import { updateEstoqueQuantidade, getEstoqueByProdutoId } from '../js/services/estoque-service.js';
import { createPedido, cancelarPedido } from '../js/services/pedido-service.js';

// Ids do seed: k3f7a9 Teclado (35, R$259,90) · p2x8m1 Mouse (4, R$89,90) · q9v4t6 Monitor (0, R$749)
let srv;
beforeEach(() => { srv = instalar(); });
afterEach(() => srv.restaurar());

const produto = (id) => srv.bd.produtos.find((p) => p.id === id);
const qtd = (id) => srv.bd.estoque.find((e) => e.produtoId === id).quantidade;

test('PROPRIEDADE DERIVADA: ajustar o estoque muda o status do produto automaticamente', async () => {
    await updateEstoqueQuantidade('k3f7a9', 3);
    assert.equal(produto('k3f7a9').status, 'Estoque baixo');
    await updateEstoqueQuantidade('k3f7a9', 0);
    assert.equal(produto('k3f7a9').status, 'Indisponível');
    await updateEstoqueQuantidade('k3f7a9', 50);
    assert.equal(produto('k3f7a9').status, 'Disponível');
});

test('quantidade negativa ou inválida vira zero', async () => {
    await updateEstoqueQuantidade('k3f7a9', -9);
    assert.equal(qtd('k3f7a9'), 0);
    await updateEstoqueQuantidade('k3f7a9', 'abc');
    assert.equal(qtd('k3f7a9'), 0);
});

test('o usuário não consegue definir o status ao criar ou editar produto', async () => {
    const criado = await createProduto({ nome: 'Webcam', categoria: 'Periféricos', preco: 150, status: 'Disponível' });
    assert.equal(criado.status, 'Indisponível');

    await updateProduto('k3f7a9', { nome: 'Teclado X', categoria: 'Periféricos', preco: 300, status: 'Indisponível' });
    assert.equal(produto('k3f7a9').status, 'Disponível', 'status derivado preservado');
    assert.equal(produto('k3f7a9').nome, 'Teclado X');
});

test('validações do cadastro de produto', async () => {
    await assert.rejects(createProduto({ nome: '  ', categoria: 'X', preco: 1 }), /nome/i);
    await assert.rejects(createProduto({ nome: 'A', categoria: '', preco: 1 }), /categoria/i);
    await assert.rejects(createProduto({ nome: 'A', categoria: 'X', preco: -5 }), /preço/i);
    await assert.rejects(createProduto({ nome: 'A', categoria: 'X', preco: 'abc' }), /preço/i);
});

test('pedido abate o estoque, recalcula o status e calcula o total no servidor', async () => {
    const pedido = await createPedido({ cliente: ' Ana ', itens: [{ produtoId: 'p2x8m1', quantidade: 4 }] });

    assert.equal(pedido.cliente, 'Ana');
    assert.equal(pedido.total, 359.6);
    assert.equal(qtd('p2x8m1'), 0);
    assert.equal(produto('p2x8m1').status, 'Indisponível');
});

test('SEGURANÇA: preço e total enviados pelo navegador são ignorados', async () => {
    const pedido = await createPedido({
        cliente: 'Fraude',
        itens: [{ produtoId: 'k3f7a9', quantidade: 1, precoUnitario: 0.01 }],
        total: 0.01,
    });
    assert.equal(pedido.itens[0].precoUnitario, 259.9);
    assert.equal(pedido.total, 259.9);
});

test('estoque insuficiente: nada é alterado (validação antes de qualquer escrita)', async () => {
    await assert.rejects(
        createPedido({ cliente: 'Bia', itens: [{ produtoId: 'k3f7a9', quantidade: 2 }, { produtoId: 'p2x8m1', quantidade: 5 }] }),
        /insuficiente/i
    );
    assert.equal(qtd('k3f7a9'), 35, 'o primeiro item não foi debitado');
    assert.equal(qtd('p2x8m1'), 4);
    assert.equal(srv.bd.pedidos.length, 3, 'nenhum pedido novo');
});

test('itens repetidos do mesmo produto são somados antes de validar o estoque', async () => {
    await assert.rejects(
        createPedido({ cliente: 'Caio', itens: [{ produtoId: 'p2x8m1', quantidade: 3 }, { produtoId: 'p2x8m1', quantidade: 3 }] }),
        /insuficiente/i
    );
    assert.equal(qtd('p2x8m1'), 4);
});

test('validações do pedido', async () => {
    await assert.rejects(createPedido({ cliente: '', itens: [{ produtoId: 'k3f7a9', quantidade: 1 }] }), /cliente/i);
    await assert.rejects(createPedido({ cliente: 'X', itens: [] }), /pelo menos um item/i);
    await assert.rejects(createPedido({ cliente: 'X', itens: [{ produtoId: 'k3f7a9', quantidade: 0 }] }), /maior que zero/i);
    await assert.rejects(createPedido({ cliente: 'X', itens: [{ produtoId: 'k3f7a9', quantidade: -2 }] }), /maior que zero/i);
    await assert.rejects(createPedido({ cliente: 'X', itens: [{ produtoId: 'nao-existe', quantidade: 1 }] }), /404/);
});

test('cancelar devolve o estoque uma única vez e atualiza o status do produto', async () => {
    const pedido = await createPedido({ cliente: 'Dan', itens: [{ produtoId: 'p2x8m1', quantidade: 4 }] });
    assert.equal(produto('p2x8m1').status, 'Indisponível');

    await cancelarPedido(pedido.id);
    assert.equal(qtd('p2x8m1'), 4);
    assert.equal(produto('p2x8m1').status, 'Estoque baixo');

    await assert.rejects(cancelarPedido(pedido.id), /já se encontra cancelado/);
    assert.equal(qtd('p2x8m1'), 4, 'segundo cancelamento não repõe de novo');
});

test('cancelar pedido de produto já excluído não quebra e não recria estoque órfão', async () => {
    const pedido = await createPedido({ cliente: 'Eva', itens: [{ produtoId: 'z5n2w8', quantidade: 1 }] });
    srv.bd.produtos.splice(srv.bd.produtos.findIndex((p) => p.id === 'z5n2w8'), 1);
    srv.bd.estoque.splice(srv.bd.estoque.findIndex((e) => e.produtoId === 'z5n2w8'), 1);

    await cancelarPedido(pedido.id);

    assert.equal(await getEstoqueByProdutoId('z5n2w8'), null);
    assert.equal(srv.bd.pedidos.find((p) => p.id === pedido.id).status, 'Cancelado');
});

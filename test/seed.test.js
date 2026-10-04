import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularStatus, calcularTotal } from '../js/domain/regras.js';

const seed = JSON.parse(readFileSync(new URL('../db.seed.json', import.meta.url), 'utf8'));

test('seed: o status de cada produto bate com a regra derivada do estoque', () => {
    for (const produto of seed.produtos) {
        const estoque = seed.estoque.find((e) => e.produtoId === produto.id);
        assert.ok(estoque, `produto ${produto.id} sem registro de estoque`);
        assert.equal(produto.status, calcularStatus(estoque.quantidade), `status incoerente em ${produto.nome}`);
    }
});

test('seed: integridade referencial (estoque e pedidos apontam para produtos existentes)', () => {
    const ids = new Set(seed.produtos.map((p) => p.id));
    for (const e of seed.estoque) assert.ok(ids.has(e.produtoId), `estoque órfão: ${e.produtoId}`);
    for (const p of seed.pedidos) for (const i of p.itens) assert.ok(ids.has(i.produtoId), `pedido ${p.id} órfão`);
    assert.equal(new Set(seed.estoque.map((e) => e.produtoId)).size, seed.estoque.length, 'estoque duplicado');
});

test('seed: totais dos pedidos conferem com os itens', () => {
    for (const p of seed.pedidos) assert.equal(p.total, calcularTotal(p.itens), `total errado no pedido ${p.id}`);
});

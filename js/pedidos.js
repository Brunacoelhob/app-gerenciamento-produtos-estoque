import { getPedidos, createPedido, cancelarPedido } from './services/pedido-service.js';
import { getProdutos } from './services/produto-service.js';
import { showToast } from './components/toast.js';
import { confirmAction } from './components/modal-confirm.js';
import { getTableSkeleton } from './components/skeleton-loader.js';
import { pedidoCancelado } from './domain/regras.js';
import { esc } from './utils/html.js';

const tbody = document.getElementById('tb-pedidos');
const modal = document.getElementById('modal-pedido');
const form = document.getElementById('form-pedido');
const selectProduto = document.getElementById('select-produto');

let produtosMap = new Map();

async function carregarDados() {
    tbody.innerHTML = getTableSkeleton(3, 7);
    try {
        const [pedidos, produtos] = await Promise.all([getPedidos(), getProdutos()]);
        produtosMap = new Map(produtos.map(p => [p.id, p]));

        popularSelectProdutos(produtos);
        renderTabela(pedidos);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function popularSelectProdutos(produtos) {
    // Filtra apenas produtos com estoque > 0 para a venda
    selectProduto.innerHTML = '<option value="">Selecione um produto...</option>' +
        produtos
            .filter(p => p.status !== 'Indisponível')
            .map(p => `<option value="${esc(p.id)}">${esc(p.nome)} - R$ ${Number(p.preco).toFixed(2)} (${esc(p.status)})</option>`)
            .join('');
}

function renderTabela(pedidos) {
    if (pedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Nenhum pedido registrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = pedidos.map(p => {
        const dataFmt = p.data ? new Date(p.data).toLocaleString('pt-BR') : '-';

        // Formata a lista de itens
        const itensTexto = p.itens ? p.itens.map(i => {
            const prod = produtosMap.get(i.produtoId);
            const nomeProd = prod ? prod.nome : i.produtoId;
            return `${esc(i.quantidade)}x ${esc(nomeProd)}`;
        }).join('<br>') : 'Sem itens';

        const ehCancelado = pedidoCancelado(p);
        const badgeClass = ehCancelado ? 'badge-indisponivel' : 'badge-disponivel';

        return `
      <tr>
        <td><code>${esc(p.id)}</code></td>
        <td><strong>${esc(p.cliente)}</strong></td>
        <td>${dataFmt}</td>
        <td style="font-size: 0.85rem">${itensTexto}</td>
        <td><strong>R$ ${Number(p.total).toFixed(2)}</strong></td>
        <td><span class="badge ${badgeClass}">${esc(p.status)}</span></td>
        <td>
          ${!ehCancelado ? `<button class="btn btn-danger btn-cancelar-pedido" data-id="${esc(p.id)}">Cancelar</button>` : '<span style="color:var(--text-muted)">-</span>'}
        </td>
      </tr>
    `;
    }).join('');
}

document.getElementById('btn-novo-pedido').addEventListener('click', () => {
    form.reset();
    modal.classList.add('open');
});

document.getElementById('btn-cancelar-ped').addEventListener('click', () => {
    modal.classList.remove('open');
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const produtoId = selectProduto.value;
    const quantidade = parseInt(document.getElementById('quantidade-pedido').value, 10);
    const cliente = document.getElementById('cliente').value;

    const produto = produtosMap.get(produtoId);
    if (!produto) {
        showToast('Selecione um produto válido', 'error');
        return;
    }

    const payload = {
        cliente,
        // Preço e total são calculados pelas regras no momento da compra; o navegador só informa o que e quanto.
        itens: [{ produtoId, quantidade }]
    };

    try {
        await createPedido(payload);
        showToast('Pedido realizado com sucesso!');
        modal.classList.remove('open');
        carregarDados();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-cancelar-pedido');
    if (btn) {
        const id = btn.dataset.id;
        const confirmou = await confirmAction(
            'Cancelar Pedido',
            'Deseja realmente cancelar este pedido? Os produtos retornarão ao estoque.'
        );

        if (confirmou) {
            try {
                await cancelarPedido(id);
                showToast('Pedido cancelado e estoque devolvido!');
                carregarDados();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    }
});

carregarDados();
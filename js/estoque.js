import { getEstoque, updateEstoqueQuantidade } from './services/estoque-service.js';
import { getProdutos } from './services/produto-service.js';
import { showToast } from './components/toast.js';
import { getTableSkeleton } from './components/skeleton-loader.js';
import { classeBadge } from './domain/regras.js';
import { esc } from './utils/html.js';

const tbody = document.getElementById('tb-estoque');
const modal = document.getElementById('modal-estoque');
const form = document.getElementById('form-estoque');

async function carregarEstoque() {
    tbody.innerHTML = getTableSkeleton(4, 6);
    try {
        const [estoqueLista, produtosLista] = await Promise.all([getEstoque(), getProdutos()]);

        // Mapeia o nome e status atual do produto para exibição
        const produtosMap = new Map(produtosLista.map(p => [p.id, p]));

        renderTabela(estoqueLista, produtosMap);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderTabela(estoqueLista, produtosMap) {
    if (estoqueLista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum item em estoque.</td></tr>`;
        return;
    }

    tbody.innerHTML = estoqueLista.map(e => {
        const prod = produtosMap.get(e.produtoId) || { nome: 'Desconhecido', status: 'N/A' };
        const dataFmt = e.atualizadoEm ? new Date(e.atualizadoEm).toLocaleString('pt-BR') : '-';

        const badgeClass = classeBadge(prod.status);

        return `
      <tr>
        <td><code>${esc(e.produtoId)}</code></td>
        <td><strong>${esc(prod.nome)}</strong></td>
        <td><strong>${esc(e.quantidade)}</strong> unid.</td>
        <td><span class="badge ${badgeClass}">${esc(prod.status)}</span></td>
        <td>${dataFmt}</td>
        <td>
          <button class="btn btn-secondary btn-edit-est" data-prodid="${esc(e.produtoId)}" data-nome="${esc(prod.nome)}" data-qtd="${esc(e.quantidade)}">
            Ajustar Quantidade
          </button>
        </td>
      </tr>
    `;
    }).join('');
}

tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-est');
    if (btn) {
        document.getElementById('estoque-produto-id').value = btn.dataset.prodid;
        document.getElementById('estoque-produto-nome').value = btn.dataset.nome;
        document.getElementById('quantidade').value = btn.dataset.qtd;
        modal.classList.add('open');
    }
});

document.getElementById('btn-cancelar-est').addEventListener('click', () => {
    modal.classList.remove('open');
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prodId = document.getElementById('estoque-produto-id').value;
    const novaQtd = parseInt(document.getElementById('quantidade').value, 10);
    if (!Number.isInteger(novaQtd) || novaQtd < 0) {
        showToast('Informe uma quantidade inteira maior ou igual a zero.', 'error');
        return;
    }

    try {
        await updateEstoqueQuantidade(prodId, novaQtd);
        showToast('Estoque e Status do Produto atualizados!');
        modal.classList.remove('open');
        carregarEstoque();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

carregarEstoque();
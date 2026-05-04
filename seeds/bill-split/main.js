(function () {
  'use strict';

  var AVATAR_COLORS = [
    '#7c6aff', '#22d3ee', '#f472b6', '#fb923c',
    '#a78bfa', '#34d399', '#fbbf24', '#60a5fa',
    '#e879f9', '#f87171', '#4ade80', '#818cf8'
  ];

  var state = {
    items: [],
    diners: [],
    assignments: {},
    splitMode: 'equal',
    nextItemId: 0,
    nextDinerId: 0
  };

  var dom = {};
  var dragState = null;

  function init() {
    cacheDom();
    bindEvents();
    render();
  }

  function cacheDom() {
    dom.itemName = document.getElementById('itemName');
    dom.itemPrice = document.getElementById('itemPrice');
    dom.btnAddItem = document.getElementById('btnAddItem');
    dom.itemsList = document.getElementById('itemsList');
    dom.billTotal = document.getElementById('billTotal');

    dom.dinerName = document.getElementById('dinerName');
    dom.btnAddDiner = document.getElementById('btnAddDiner');
    dom.dinersList = document.getElementById('dinersList');
    dom.dinerCount = document.getElementById('dinerCount');

    dom.splitModeToggle = document.getElementById('splitModeToggle');
    dom.assignHint = document.getElementById('assignHint');
    dom.assignGrid = document.getElementById('assignGrid');

    dom.resultList = document.getElementById('resultList');
    dom.resultSummary = document.getElementById('resultSummary');
    dom.summaryTotal = document.getElementById('summaryTotal');
    dom.summaryAssigned = document.getElementById('summaryAssigned');
    dom.summaryBalance = document.getElementById('summaryBalance');

    dom.btnReset = document.getElementById('btnReset');
    dom.toastContainer = document.getElementById('toastContainer');
    dom.dragGhost = document.getElementById('dragGhost');
  }

  function bindEvents() {
    dom.btnAddItem.addEventListener('click', addItem);
    dom.itemName.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addItem();
    });
    dom.itemPrice.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addItem();
    });

    dom.btnAddDiner.addEventListener('click', addDiner);
    dom.dinerName.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addDiner();
    });

    dom.btnReset.addEventListener('click', resetAll);

    dom.splitModeToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.mode-btn');
      if (!btn) return;
      var mode = btn.dataset.mode;
      if (mode === state.splitMode) return;
      state.splitMode = mode;
      dom.splitModeToggle.querySelectorAll('.mode-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      if (mode === 'equal') {
        recalcEqualAssignments();
      }
      renderAssignments();
      renderResults();
    });
  }

  function addItem() {
    var name = dom.itemName.value.trim();
    var price = parseFloat(dom.itemPrice.value);

    if (!name) {
      showToast('请输入项目名称', 'error');
      dom.itemName.focus();
      return;
    }
    if (isNaN(price) || price <= 0) {
      showToast('请输入有效金额', 'error');
      dom.itemPrice.focus();
      return;
    }

    var item = {
      id: state.nextItemId++,
      name: name,
      price: price
    };

    state.items.push(item);
    state.assignments[item.id] = {};

    dom.itemName.value = '';
    dom.itemPrice.value = '';
    dom.itemName.focus();

    render();
    showToast('已添加: ' + name, 'success');
  }

  function removeItem(id) {
    state.items = state.items.filter(function (it) { return it.id !== id; });
    delete state.assignments[id];
    render();
  }

  function addDiner() {
    var name = dom.dinerName.value.trim();
    if (!name) {
      showToast('请输入姓名', 'error');
      dom.dinerName.focus();
      return;
    }

    var diner = {
      id: state.nextDinerId++,
      name: name,
      color: AVATAR_COLORS[state.nextDinerId % AVATAR_COLORS.length]
    };

    state.diners.push(diner);
    dom.dinerName.value = '';
    dom.dinerName.focus();

    if (state.splitMode === 'equal') {
      recalcEqualAssignments();
    }

    render();
    showToast(name + ' 已加入', 'success');
  }

  function removeDiner(id) {
    state.diners = state.diners.filter(function (d) { return d.id !== id; });
    Object.keys(state.assignments).forEach(function (itemId) {
      delete state.assignments[itemId][id];
    });
    if (state.splitMode === 'equal') {
      recalcEqualAssignments();
    }
    render();
  }

  function recalcEqualAssignments() {
    state.items.forEach(function (item) {
      var assignedDiners = state.diners.filter(function (d) {
        return state.assignments[item.id] && state.assignments[item.id][d.id] !== undefined;
      });

      if (assignedDiners.length === 0 && state.diners.length > 0) {
        var equalShare = item.price / state.diners.length;
        state.assignments[item.id] = {};
        state.diners.forEach(function (d) {
          state.assignments[item.id][d.id] = round2(equalShare);
        });
      } else if (assignedDiners.length > 0) {
        var share = item.price / assignedDiners.length;
        var newAssignments = {};
        assignedDiners.forEach(function (d) {
          newAssignments[d.id] = round2(share);
        });
        state.assignments[item.id] = newAssignments;
      }
    });
  }

  function toggleDinerAssignment(itemId, dinerId) {
    if (!state.assignments[itemId]) {
      state.assignments[itemId] = {};
    }

    var assigned = state.assignments[itemId];
    var item = state.items.find(function (it) { return it.id === itemId; });
    if (!item) return;

    if (assigned[dinerId] !== undefined) {
      delete assigned[dinerId];
      if (state.splitMode === 'equal') {
        var keys = Object.keys(assigned);
        if (keys.length > 0) {
          var share = item.price / keys.length;
          keys.forEach(function (k) {
            assigned[k] = round2(share);
          });
        }
      }
    } else {
      if (state.splitMode === 'equal') {
        assigned[dinerId] = 0;
        var allKeys = Object.keys(assigned);
        var equalShare = item.price / allKeys.length;
        allKeys.forEach(function (k) {
          assigned[k] = round2(equalShare);
        });
      } else {
        var remaining = item.price;
        Object.keys(assigned).forEach(function (k) {
          remaining -= (assigned[k] || 0);
        });
        assigned[dinerId] = round2(Math.max(0, remaining));
      }
    }

    renderAssignments();
    renderResults();
  }

  function setCustomAmount(itemId, dinerId, amount) {
    if (!state.assignments[itemId]) return;
    var parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    state.assignments[itemId][dinerId] = round2(parsed);
    renderResults();
  }

  function getDinerTotal(dinerId) {
    var total = 0;
    state.items.forEach(function (item) {
      if (state.assignments[item.id] && state.assignments[item.id][dinerId] !== undefined) {
        total += state.assignments[item.id][dinerId];
      }
    });
    return round2(total);
  }

  function getDinerItems(dinerId) {
    var result = [];
    state.items.forEach(function (item) {
      if (state.assignments[item.id] && state.assignments[item.id][dinerId] !== undefined) {
        result.push(item.name);
      }
    });
    return result;
  }

  function getTotalBill() {
    return round2(state.items.reduce(function (sum, it) { return sum + it.price; }, 0));
  }

  function getTotalAssigned() {
    var total = 0;
    state.items.forEach(function (item) {
      var assigns = state.assignments[item.id] || {};
      Object.keys(assigns).forEach(function (dinerId) {
        total += assigns[dinerId];
      });
    });
    return round2(total);
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function formatPrice(n) {
    return '¥' + n.toFixed(2);
  }

  function getInitials(name) {
    if (/[\u4e00-\u9fff]/.test(name)) {
      return name.slice(0, 2);
    }
    return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
  }

  function render() {
    renderItems();
    renderDiners();
    renderAssignments();
    renderResults();
  }

  function renderItems() {
    var total = getTotalBill();
    dom.billTotal.textContent = formatPrice(total);

    if (state.items.length === 0) {
      dom.itemsList.innerHTML = '<div class="empty-state">还没有菜品，添加第一项吧</div>';
      return;
    }

    dom.itemsList.innerHTML = '';
    state.items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'item-card fade-in';
      card.draggable = true;
      card.dataset.itemId = item.id;

      card.innerHTML =
        '<span class="item-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="item-price">' + formatPrice(item.price) + '</span>' +
        '<button class="btn-remove" data-remove-item="' + item.id + '">×</button>';

      card.addEventListener('dragstart', function (e) {
        dragState = { itemId: item.id, name: item.name, price: item.price };
        e.dataTransfer.effectAllowed = 'copy';
        card.classList.add('dragging');
        showGhost(item.name + ' ' + formatPrice(item.price));
      });

      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        hideGhost();
        clearDropHighlights();
        dragState = null;
      });

      dom.itemsList.appendChild(card);
    });

    dom.itemsList.querySelectorAll('[data-remove-item]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeItem(parseInt(btn.dataset.removeItem));
      });
    });
  }

  function renderDiners() {
    dom.dinerCount.textContent = state.diners.length + ' 人';

    if (state.diners.length === 0) {
      dom.dinersList.innerHTML = '<div class="empty-state">添加用餐者开始分摊</div>';
      return;
    }

    dom.dinersList.innerHTML = '';
    state.diners.forEach(function (diner) {
      var total = getDinerTotal(diner.id);
      var card = document.createElement('div');
      card.className = 'diner-card fade-in';
      card.dataset.dinerId = diner.id;

      card.innerHTML =
        '<div class="avatar" style="background:' + diner.color + '">' + getInitials(diner.name) + '</div>' +
        '<span class="diner-label">' + escapeHtml(diner.name) + '</span>' +
        '<span class="diner-total">' + formatPrice(total) + '</span>' +
        '<button class="btn-remove" data-remove-diner="' + diner.id + '">×</button>';

      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        card.classList.add('drop-target-highlight');
      });

      card.addEventListener('dragleave', function () {
        card.classList.remove('drop-target-highlight');
      });

      card.addEventListener('drop', function (e) {
        e.preventDefault();
        card.classList.remove('drop-target-highlight');
        if (dragState) {
          var itemId = dragState.itemId;
          var dinerId = diner.id;
          if (!state.assignments[itemId]) {
            state.assignments[itemId] = {};
          }
          if (state.assignments[itemId][dinerId] === undefined) {
            if (state.splitMode === 'equal') {
              state.assignments[itemId][dinerId] = 0;
              var keys = Object.keys(state.assignments[itemId]);
              var item = state.items.find(function (it) { return it.id === itemId; });
              if (item) {
                var share = item.price / keys.length;
                keys.forEach(function (k) {
                  state.assignments[itemId][k] = round2(share);
                });
              }
            } else {
              state.assignments[itemId][dinerId] = 0;
            }
          }
          renderAssignments();
          renderResults();
          renderDiners();
          showToast(dragState.name + ' → ' + diner.name, 'success');
        }
      });

      dom.dinersList.appendChild(card);
    });

    dom.dinersList.querySelectorAll('[data-remove-diner]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeDiner(parseInt(btn.dataset.removeDiner));
      });
    });
  }

  function renderAssignments() {
    var hasItems = state.items.length > 0;
    var hasDiners = state.diners.length > 0;

    dom.assignHint.style.display = (hasItems && hasDiners) ? 'none' : 'block';
    dom.assignGrid.style.display = (hasItems && hasDiners) ? 'flex' : 'none';

    if (!hasItems || !hasDiners) return;

    dom.assignGrid.innerHTML = '';

    state.items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'assign-row fade-in';

      var assigns = state.assignments[item.id] || {};
      var assignedCount = Object.keys(assigns).length;

      var header = '<div class="assign-item-label"><span>' + escapeHtml(item.name) + '</span><span class="assign-price">' + formatPrice(item.price) + '</span></div>';
      var chips = '<div class="assign-diners">';

      state.diners.forEach(function (diner) {
        var isSelected = assigns[diner.id] !== undefined;
        var amount = isSelected ? assigns[diner.id] : 0;

        chips += '<div class="assign-chip' + (isSelected ? ' selected' : '') + '" data-toggle-item="' + item.id + '" data-toggle-diner="' + diner.id + '">';
        chips += '<span class="chip-avatar" style="background:' + diner.color + '">' + getInitials(diner.name) + '</span>';
        chips += '<span>' + escapeHtml(diner.name) + '</span>';

        if (state.splitMode === 'custom' && isSelected) {
          chips += '<input type="number" class="custom-amount-input" value="' + amount.toFixed(2) + '" data-custom-item="' + item.id + '" data-custom-diner="' + diner.id + '" min="0" step="0.01" />';
        } else if (isSelected) {
          chips += '<span class="chip-amount">' + formatPrice(amount) + '</span>';
        }

        chips += '</div>';
      });

      chips += '</div>';
      row.innerHTML = header + chips;
      dom.assignGrid.appendChild(row);
    });

    dom.assignGrid.querySelectorAll('[data-toggle-item]').forEach(function (chip) {
      if (chip.querySelector('.custom-amount-input')) return;
      chip.addEventListener('click', function (e) {
        if (e.target.closest('.custom-amount-input')) return;
        toggleDinerAssignment(
          parseInt(chip.dataset.toggleItem),
          parseInt(chip.dataset.toggleDiner)
        );
        renderDiners();
      });
    });

    dom.assignGrid.querySelectorAll('.custom-amount-input').forEach(function (input) {
      input.addEventListener('input', function () {
        setCustomAmount(
          parseInt(input.dataset.customItem),
          parseInt(input.dataset.customDiner),
          input.value
        );
      });
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    });
  }

  function renderResults() {
    if (state.diners.length === 0) {
      dom.resultList.innerHTML = '<div class="empty-state">添加用餐者后查看结算</div>';
      dom.resultSummary.style.display = 'none';
      return;
    }

    dom.resultList.innerHTML = '';

    var totalAssigned = 0;

    state.diners.forEach(function (diner) {
      var total = getDinerTotal(diner.id);
      var items = getDinerItems(diner.id);
      totalAssigned += total;

      var card = document.createElement('div');
      card.className = 'result-card fade-in';

      var itemsText = items.length > 0 ? items.join('、') : '未分配';
      card.innerHTML =
        '<div class="result-avatar" style="background:' + diner.color + '">' + getInitials(diner.name) + '</div>' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHtml(diner.name) + '</div>' +
          '<div class="result-items">' + escapeHtml(itemsText) + '</div>' +
        '</div>' +
        '<div class="result-amount" style="color:' + (total > 0 ? diner.color : 'var(--text-muted)') + '">' + formatPrice(total) + '</div>';

      dom.resultList.appendChild(card);
    });

    var totalBill = getTotalBill();
    var balance = round2(totalBill - totalAssigned);

    dom.summaryTotal.textContent = formatPrice(totalBill);
    dom.summaryAssigned.textContent = formatPrice(totalAssigned);
    dom.summaryBalance.textContent = formatPrice(Math.abs(balance));

    var balanceEl = dom.summaryBalance;
    if (Math.abs(balance) < 0.01) {
      balanceEl.className = 'summary-row summary-balance balanced';
      balanceEl.textContent = '✓ 已平衡';
    } else {
      balanceEl.className = 'summary-row summary-balance unbalanced';
      balanceEl.textContent = (balance > 0 ? '未分配 ' : '多分配 ') + formatPrice(Math.abs(balance));
    }

    dom.resultSummary.style.display = 'block';
  }

  function resetAll() {
    state.items = [];
    state.diners = [];
    state.assignments = {};
    state.splitMode = 'equal';
    state.nextItemId = 0;
    state.nextDinerId = 0;

    dom.splitModeToggle.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === 'equal');
    });

    render();
    showToast('已重置全部', 'success');
  }

  function showGhost(text) {
    dom.dragGhost.textContent = text;
    dom.dragGhost.classList.add('visible');
    document.addEventListener('mousemove', moveGhost);
  }

  function moveGhost(e) {
    dom.dragGhost.style.left = (e.clientX + 14) + 'px';
    dom.dragGhost.style.top = (e.clientY - 14) + 'px';
  }

  function hideGhost() {
    dom.dragGhost.classList.remove('visible');
    document.removeEventListener('mousemove', moveGhost);
  }

  function clearDropHighlights() {
    document.querySelectorAll('.drop-target-highlight').forEach(function (el) {
      el.classList.remove('drop-target-highlight');
    });
  }

  function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2200);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

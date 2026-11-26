const member = [];
const STORAGE_KEY = "splitwise-group-v1";

const elements = {
  addMember: document.getElementById("addMemeber"),
  addMemberButton: document.getElementById("Submit"),
  memberError: document.getElementById("member-error"),
  memberList: document.getElementById("showList"),
  memberCount: document.getElementById("member-count"),
  payer: document.getElementById("whoPaid"),
  expenseTitle: document.getElementById("reason"),
  expenseAmount: document.getElementById("amt"),
  splitMembers: document.getElementById("memberList"),
  addExpenseButton: document.getElementById("AddExpenses"),
  expenseError: document.getElementById("expense-error"),
  expenseList: document.getElementById("expense-list"),
  expenseCount: document.getElementById("expense-count"),
  balanceList: document.getElementById("balance-list"),
  settlementList: document.getElementById("settlement-list"),
  resetButton: document.getElementById("reset-btn"),
  appError: document.getElementById("app-error"),
};

let state = loadState();
let selectedSplitMemberIds = new Set(state.members.map((member) => member.id));

function emptyState() {
  return { members: [], expenses: [] };
}

function loadState() {
  let savedData;

  try {
    savedData = localStorage.getItem(STORAGE_KEY);
  } catch {
    showAppError("Your browser blocked local storage. Changes may not survive a refresh.");
    return emptyState();
  }

  if (!savedData) return emptyState();

  try {
    const parsed = JSON.parse(savedData);
    if (!Array.isArray(parsed.members) || !Array.isArray(parsed.expenses)) {
      throw new Error("Saved group data has an unexpected format.");
    }

    const members = parsed.members.map((member) => {
      if (
        typeof member.id !== "string" ||
        typeof member.name !== "string" ||
        !member.name.trim()
      ) {
        throw new Error("A saved group member is invalid.");
      }
      return { id: member.id, name: member.name.trim() };
    });

    const memberIds = new Set(members.map((member) => member.id));
    if (memberIds.size !== members.length || members.length > 10) {
      throw new Error("Saved group members are duplicated or exceed the group limit.");
    }

    const expenses = parsed.expenses.map((expense) => {
      if (
        typeof expense.id !== "string" ||
        typeof expense.title !== "string" ||
        !expense.title.trim() ||
        !Number.isSafeInteger(expense.amountCents) ||
        expense.amountCents <= 0 ||
        !Number.isFinite(expense.createdAt) ||
        !memberIds.has(expense.paidBy) ||
        !Array.isArray(expense.splits) ||
        expense.splits.length === 0 ||
        expense.splits.some((id) => !memberIds.has(id)) ||
        new Set(expense.splits).size !== expense.splits.length
      ) {
        throw new Error("A saved expense is invalid.");
      }
      return {
        id: expense.id,
        title: expense.title.trim(),
        amountCents: expense.amountCents,
        paidBy: expense.paidBy,
        splits: [...expense.splits],
        createdAt: expense.createdAt,
      };
    });

    return { members, expenses };
  } catch (error) {
    showAppError(
      `Could not read saved group data: ${error.message} Reset the group to start fresh.`,
    );
    return emptyState();
  }
}

function showAppError(message) {
  elements.appError.textContent = message;
  elements.appError.hidden = !message;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showAppError("");
    return true;
  } catch {
    showAppError("Could not save your changes to this browser. Check your storage settings.");
    return false;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatCurrency(cents) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function getMemberName(memberId) {
  return state.members.find((member) => member.id === memberId)?.name ?? "Unknown member";
}

function splitCentsEqually(amountCents, memberIds) {
  const baseShare = Math.floor(amountCents / memberIds.length);
  const remainder = amountCents % memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    shareCents: baseShare + (index < remainder ? 1 : 0),
  }));
}

function renderMembers() {
  const selectedIds = new Set(
    [...selectedSplitMemberIds].filter((id) =>
      state.members.some((member) => member.id === id),
    ),
  );
  selectedSplitMemberIds = selectedIds;

  elements.memberCount.textContent = `${state.members.length} / 10`;
  elements.memberList.replaceChildren();

  if (state.members.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-note";
    emptyMessage.textContent = "Your group members will show up here.";
    elements.memberList.append(emptyMessage);
  } else {
    state.members.forEach((member) => {
      const chip = document.createElement("div");
      chip.className = "member-chip";

      const avatar = document.createElement("span");
      avatar.className = "member-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = member.name.trim().charAt(0).toUpperCase();

      const name = document.createElement("span");
      name.textContent = member.name;

      const hasExpenses = state.expenses.some(
        (expense) => expense.paidBy === member.id || expense.splits.includes(member.id),
      );
      const removeButton = document.createElement("button");
      removeButton.className = "member-remove";
      removeButton.type = "button";
      removeButton.dataset.action = "remove-member";
      removeButton.dataset.memberId = member.id;
      removeButton.setAttribute("aria-label", `Remove ${member.name}`);
      removeButton.textContent = "×";
      removeButton.disabled = hasExpenses;
      if (hasExpenses) {
        removeButton.title = "Delete this member’s expenses before removing them.";
      }

      chip.append(avatar, name, removeButton);
      elements.memberList.append(chip);
    });
  }

  const previousPayer = elements.payer.value;
  elements.payer.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a member";
  elements.payer.append(placeholder);

  state.members.forEach((member) => {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = member.name;
    elements.payer.append(option);
  });
  if (state.members.some((member) => member.id === previousPayer)) {
    elements.payer.value = previousPayer;
  }

  elements.splitMembers.replaceChildren();
  if (state.members.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-note";
    emptyMessage.textContent = "Add group members first.";
    elements.splitMembers.append(emptyMessage);
    return;
  }

  state.members.forEach((member) => {
    const label = document.createElement("label");
    label.className = "split-member-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = member.id;
    checkbox.checked = selectedSplitMemberIds.has(member.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedSplitMemberIds.add(member.id);
      } else {
        selectedSplitMemberIds.delete(member.id);
      }
    });

    const name = document.createElement("span");
    name.textContent = member.name;
    label.append(checkbox, name);
    elements.splitMembers.append(label);
  });
}

function calculateBalances() {
  const balances = new Map(
    state.members.map((member) => [
      member.id,
      { memberId: member.id, paidCents: 0, shareCents: 0, netCents: 0 },
    ]),
  );

  state.expenses.forEach((expense) => {
    const payerBalance = balances.get(expense.paidBy);
    if (payerBalance) payerBalance.paidCents += expense.amountCents;

    splitCentsEqually(expense.amountCents, expense.splits).forEach(
      ({ memberId, shareCents }) => {
        const memberBalance = balances.get(memberId);
        if (memberBalance) memberBalance.shareCents += shareCents;
      },
    );
  });

  balances.forEach((balance) => {
    balance.netCents = balance.paidCents - balance.shareCents;
  });

  return [...balances.values()];
}

function renderBalances() {
  elements.balanceList.replaceChildren();
  const balances = calculateBalances();

  if (balances.length === 0) {
    const row = document.createElement("tr");
    row.className = "table-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "Add members and expenses to see balances.";
    row.append(cell);
    elements.balanceList.append(row);
    return;
  }

  balances.forEach((balance) => {
    const row = document.createElement("tr");
    const memberCell = document.createElement("td");
    memberCell.textContent = getMemberName(balance.memberId);

    const paidCell = document.createElement("td");
    paidCell.textContent = formatCurrency(balance.paidCents);

    const shareCell = document.createElement("td");
    shareCell.textContent = formatCurrency(balance.shareCents);

    const netCell = document.createElement("td");
    if (balance.netCents > 0) {
      netCell.className = "balance-positive";
      netCell.textContent = `+${formatCurrency(balance.netCents)} (gets back)`;
    } else if (balance.netCents < 0) {
      netCell.className = "balance-negative";
      netCell.textContent = `−${formatCurrency(Math.abs(balance.netCents))} (owes)`;
    } else {
      netCell.textContent = "Settled up";
    }

    row.append(memberCell, paidCell, shareCell, netCell);
    elements.balanceList.append(row);
  });
}

function getMinimumPaymentGroups(balances) {
  const people = balances.filter((balance) => balance.netCents !== 0);
  const count = people.length;
  if (count === 0) return [];

  const subsetSums = new Array(1 << count).fill(0);
  for (let mask = 1; mask < subsetSums.length; mask += 1) {
    const lowestBit = mask & -mask;
    const personIndex = 31 - Math.clz32(lowestBit);
    subsetSums[mask] = subsetSums[mask ^ lowestBit] + people[personIndex].netCents;
  }

  const memo = new Map([[0, []]]);
  function findBestPartition(mask) {
    if (memo.has(mask)) return memo.get(mask);

    const firstBit = mask & -mask;
    let bestGroups = null;
    for (let group = mask; group > 0; group = (group - 1) & mask) {
      if ((group & firstBit) === 0 || subsetSums[group] !== 0) continue;

      const remainder = findBestPartition(mask ^ group);
      if (remainder && (!bestGroups || remainder.length + 1 > bestGroups.length)) {
        bestGroups = [group, ...remainder];
      }
    }

    memo.set(mask, bestGroups);
    return bestGroups;
  }

  const groupMasks = findBestPartition((1 << count) - 1);
  if (!groupMasks) {
    throw new Error("Member balances do not add up to zero.");
  }

  return groupMasks.map((mask) =>
    people.filter((_, index) => (mask & (1 << index)) !== 0),
  );
}

function createPaymentsForGroup(group) {
  const debtors = group
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: -balance.netCents }))
    .sort((first, second) => second.remaining - first.remaining);
  const creditors = group
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: balance.netCents }))
    .sort((first, second) => second.remaining - first.remaining);
  const payments = [];

  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remaining, creditor.remaining);

    payments.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amountCents,
    });
    debtor.remaining -= amountCents;
    creditor.remaining -= amountCents;

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return payments;
}

function createMinimumPayments(balances) {
  return getMinimumPaymentGroups(balances).flatMap(createPaymentsForGroup);
}

function renderSettlements() {
  elements.settlementList.replaceChildren();
  let payments;

  try {
    payments = createMinimumPayments(calculateBalances());
  } catch (error) {
    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = `Could not calculate settlements: ${error.message}`;
    elements.settlementList.append(message);
    return;
  }

  if (payments.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = state.expenses.length
      ? "Everyone is settled up — no payments needed."
      : "Add an expense to see who needs to pay whom.";
    elements.settlementList.append(message);
    return;
  }

  payments.forEach((payment) => {
    const row = document.createElement("div");
    row.className = "settlement-row";

    const description = document.createElement("span");
    description.textContent = `${getMemberName(payment.from)} pays ${getMemberName(payment.to)}`;

    const amount = document.createElement("span");
    amount.className = "settlement-amount";
    amount.textContent = formatCurrency(payment.amountCents);

    row.append(description, amount);
    elements.settlementList.append(row);
  });
}

function formatExpenseDate(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function renderExpenses() {
  elements.expenseList.replaceChildren();
  elements.expenseCount.textContent = `${state.expenses.length} item${state.expenses.length === 1 ? "" : "s"}`;

  if (state.expenses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("span");
    icon.className = "empty-state-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "☼";

    const title = document.createElement("p");
    title.className = "empty-state-title";
    title.textContent = "Nothing on the tab yet";

    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = "Add your first expense and keep the group in sync.";

    empty.append(icon, title, message);
    elements.expenseList.append(empty);
    return;
  }

  [...state.expenses]
    .sort((first, second) => second.createdAt - first.createdAt)
    .forEach((expense) => {
      const card = document.createElement("article");
      card.className = "expense-card";

      const details = document.createElement("div");
      const title = document.createElement("p");
      title.className = "expense-title";
      title.textContent = expense.title;

      const metadata = document.createElement("p");
      metadata.className = "expense-meta";
      const splitNames = expense.splits.map(getMemberName).join(", ");
      metadata.textContent =
        `Paid by ${getMemberName(expense.paidBy)} · Split with ${splitNames} · ${formatExpenseDate(expense.createdAt)}`;
      details.append(title, metadata);

      const actions = document.createElement("div");
      actions.className = "expense-actions";

      const amount = document.createElement("span");
      amount.className = "expense-amount";
      amount.textContent = formatCurrency(expense.amountCents);

      const deleteButton = document.createElement("button");
      deleteButton.className = "expense-delete";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete-expense";
      deleteButton.dataset.expenseId = expense.id;
      deleteButton.setAttribute("aria-label", `Delete expense ${expense.title}`);
      deleteButton.title = "Delete expense";
      deleteButton.textContent = "×";

      actions.append(amount, deleteButton);
      card.append(details, actions);
      elements.expenseList.append(card);
    });
}

function renderAll() {
  renderMembers();
  renderBalances();
  renderSettlements();
  renderExpenses();
}

function addMember() {
  const name = elements.addMember.value.trim();
  elements.memberError.textContent = "";

  if (!name) {
    elements.memberError.textContent = "Enter a name before adding a member.";
    elements.addMember.focus();
    return;
  }
  if (state.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) {
    elements.memberError.textContent = "That name is already in the group.";
    elements.addMember.focus();
    return;
  }
  if (state.members.length >= 10) {
    elements.memberError.textContent = "A group can have at most 10 members.";
    return;
  }

  const member = { id: createId(), name };
  state.members.push(member);
  selectedSplitMemberIds.add(member.id);
  elements.addMember.value = "";
  saveState();
  renderAll();
  elements.addMember.focus();
}

function removeMember(memberId) {
  const member = state.members.find((candidate) => candidate.id === memberId);
  if (!member) return;

  const hasExpenses = state.expenses.some(
    (expense) => expense.paidBy === memberId || expense.splits.includes(memberId),
  );
  if (hasExpenses) {
    elements.memberError.textContent =
      "This member is part of an expense. Delete those expenses before removing them.";
    return;
  }

  state.members = state.members.filter((candidate) => candidate.id !== memberId);
  selectedSplitMemberIds.delete(memberId);
  elements.memberError.textContent = "";
  saveState();
  renderAll();
}

function parseAmountToCents(value) {
  const amountText = value.trim();
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(amountText)) return null;

  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function addExpense() {
  elements.expenseError.textContent = "";
  const title = elements.expenseTitle.value.trim();
  const amountCents = parseAmountToCents(elements.expenseAmount.value);
  const payerId = elements.payer.value;
  const splitIds = [...elements.splitMembers.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => checkbox.value);

  if (state.members.length < 2) {
    elements.expenseError.textContent = "Add at least 2 group members before adding expenses.";
    return;
  }
  if (!title) {
    elements.expenseError.textContent = "Enter a title for this expense.";
    elements.expenseTitle.focus();
    return;
  }
  if (amountCents === null) {
    elements.expenseError.textContent =
      "Enter an amount greater than ₹0 with no more than 2 decimal places.";
    elements.expenseAmount.focus();
    return;
  }
  if (!state.members.some((member) => member.id === payerId)) {
    elements.expenseError.textContent = "Choose who paid for this expense.";
    elements.payer.focus();
    return;
  }
  if (splitIds.length === 0) {
    elements.expenseError.textContent = "Select at least one member to split this expense.";
    return;
  }

  state.expenses.unshift({
    id: createId(),
    title,
    amountCents,
    paidBy: payerId,
    splits: splitIds,
    createdAt: Date.now(),
  });

  saveState();
  renderAll();
  elements.expenseTitle.value = "";
  elements.expenseAmount.value = "";
  elements.expenseTitle.focus();
}

function deleteExpense(expenseId) {
  state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
  saveState();
  renderAll();
}

function resetGroup() {
  if (!window.confirm("Reset the group and delete all members and expenses? This cannot be undone.")) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    showAppError("Could not clear saved group data. Check your browser storage settings.");
    return;
  }

  state = emptyState();
  selectedSplitMemberIds = new Set();
  elements.addMember.value = "";
  elements.expenseTitle.value = "";
  elements.expenseAmount.value = "";
  elements.memberError.textContent = "";
  elements.expenseError.textContent = "";
  showAppError("");
  renderAll();
}

elements.addMemberButton.addEventListener("click", addMember);
elements.addMember.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addMember();
  }
});
elements.addExpenseButton.addEventListener("click", addExpense);
elements.memberList.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="remove-member"]');
  if (button && !button.disabled) removeMember(button.dataset.memberId);
});
elements.expenseList.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="delete-expense"]');
  if (button) deleteExpense(button.dataset.expenseId);
});
elements.resetButton.addEventListener("click", resetGroup);

renderAll();

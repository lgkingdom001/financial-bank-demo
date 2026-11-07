import { useState, useEffect } from "react";
import "./App.css";
import Auth from "./Auth";
import { supabase } from "./supabase";

const openingBalances = {
  tng: 124.03,
  school: 204.7,
  cash: 1073,
};

const accountInfo = {
  tng: {
    name: "TNG eWallet",
    type: "E-WALLET",
    cardNumber: "•••• •••• •••• 4821",
    cardClass: "tng-card",
    logo: "TNG",
    icon: "💳",
  },
  school: {
    name: "School Card",
    type: "STUDENT ACCOUNT",
    cardNumber: "•••• •••• •••• 0918",
    cardClass: "school-card",
    logo: "STUDENT",
    icon: "🎓",
  },
  cash: {
    name: "Cash",
    type: "CASH ACCOUNT",
    cardNumber: "CASH •••• 2026",
    cardClass: "cash-card",
    logo: "CASH",
    icon: "💵",
  },
};

const accountOptions = [
  { value: "cash", label: "Cash" },
  { value: "tng", label: "TNG eWallet" },
  { value: "school", label: "School Card" },
];

function money(amount) {
  return `RM ${Number(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function BankCard({ type, name, balance, number, cardClass }) {
  return (
    <div className={`bank-card ${cardClass}`}>
      <div className="card-top">
        <span className="card-label">{type}</span>
        <span className="card-logo">{name}</span>
      </div>

      <div className="card-chip-row">
        <div className="chip">
          <span />
          <span />
          <span />
          <span />
        </div>
        <span className="contactless">)))</span>
      </div>

      <div className="card-number">{number}</div>

      <div className="card-bottom">
        <div>
          <span className="card-caption">AVAILABLE BALANCE</span>
          <h2>{money(balance)}</h2>
        </div>
        <div className="mastercard">
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function TransactionList({ transactions, onDelete }) {
  if (!transactions.length) {
    return (
      <div className="empty-activity">
        <div className="activity-icon">↕</div>
        <div>
          <h3>No transactions yet</h3>
          <p>Your transactions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "income";
        const isTransfer = transaction.type === "transfer";

        return (
          <div className="transaction" key={transaction.id}>
            <div className="transaction-icon">
              {isTransfer ? "⇄" : isIncome ? "↙" : "↗"}
            </div>

            <div className="transaction-info">
              <strong>{transaction.title}</strong>
              <span>
                {transaction.description || transaction.category}
                {" · "}
                {transaction.date}
              </span>
              <small>
                {isTransfer
                  ? `${accountInfo[transaction.from]?.name} → ${accountInfo[transaction.to]?.name}`
                  : accountInfo[transaction.account]?.name}
              </small>
            </div>

            <div className="transaction-right">
              <strong
                className={
                  isTransfer
                    ? "transfer-amount"
                    : isIncome
                      ? "income"
                      : "expense"
                }
              >
                {isTransfer ? "⇄ " : isIncome ? "+" : "−"}
                {money(transaction.amount)}
              </strong>

              <button
                className="delete-button small-delete"
                onClick={() => onDelete(transaction.id)}
                title="Delete transaction"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const [page, setPage] = useState("home");
  const [accounts, setAccounts] = useState({});
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");
  const [goals, setGoals] = useState([]);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityAccount, setActivityAccount] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activitySort, setActivitySort] = useState("newest");
  const [dashboardMonth, setDashboardMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [transactionType, setTransactionType] = useState("expense");
  const [transactionAccount, setTransactionAccount] = useState("cash");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("Food");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [transferFrom, setTransferFrom] = useState("cash");
  const [transferTo, setTransferTo] = useState("tng");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalImage, setGoalImage] = useState("");
  const [goalImageFile, setGoalImageFile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setAccountsLoading(true);
      setAccountsError("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (!cancelled) {
          setAccountsError(
            userError?.message || "Could not identify the logged-in user.",
          );
          setAccountsLoading(false);
        }
        return;
      }

      const userId = userData.user.id;
      const { data: existingAccounts, error: selectError } = await supabase
        .from("accounts")
        .select("id, user_id, name, balance")
        .eq("user_id", userId);

      if (selectError) {
        if (!cancelled) {
          setAccountsError(selectError.message);
          setAccountsLoading(false);
        }
        return;
      }

      const existingNames = new Set(
        (existingAccounts || []).map((account) => account.name),
      );
      const missingAccounts = Object.keys(openingBalances)
        .filter((name) => !existingNames.has(name))
        .map((name) => ({
          user_id: userId,
          name,
          balance: openingBalances[name],
        }));

      if (missingAccounts.length) {
        const { error: insertError } = await supabase
          .from("accounts")
          .insert(missingAccounts);

        if (insertError) {
          if (!cancelled) {
            setAccountsError(insertError.message);
            setAccountsLoading(false);
          }
          return;
        }
      }

      const { data: finalAccounts, error: finalError } = await supabase
        .from("accounts")
        .select("id, user_id, name, balance")
        .eq("user_id", userId);

      if (cancelled) return;

      if (finalError) {
        setAccountsError(finalError.message);
      } else {
        const accountMap = {};
        (finalAccounts || []).forEach((account) => {
          accountMap[account.name] = Number(account.balance);
        });
        setAccounts(accountMap);
      }

      setAccountsLoading(false);
    }

    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTransactions() {
      setTransactionsLoading(true);
      setTransactionsError("");
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setTransactionsError(error.message);
      } else {
        setTransactions(
          (data || []).map((row) => ({
            id: row.id,
            type: row.type,
            account:
              row.account === "school_card" || row.account === "School Card"
                ? "school"
                : row.account,
            from: row.from_account,
            to: row.to_account,
            amount: Number(row.amount),
            title: row.title,
            category: row.category,
            description: row.description,
            date: row.transaction_date,
          })),
        );
      }
      setTransactionsLoading(false);
    }
    loadTransactions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        alert(`Could not load savings goals: ${error.message}`);
        return;
      }

      const loadedGoals = await Promise.all(
        (data || []).map(async (row) => {
          let image = "";
          if (row.image_url) {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("goal-images")
                .createSignedUrl(row.image_url, 60 * 60);
            if (!signedError) image = signedData?.signedUrl || "";
          }

          return {
            id: row.id,
            name: row.name,
            target: Number(row.target),
            saved: Number(row.saved),
            deadline: row.deadline || "",
            image,
            imagePath: row.image_url || "",
          };
        }),
      );

      if (!cancelled) setGoals(loadedGoals);
    }

    loadGoals();
    return () => {
      cancelled = true;
    };
  }, []);

  function getBalance(accountKey) {
    let balance = accounts[accountKey] ?? openingBalances[accountKey];

    transactions.forEach((transaction) => {
      if (transaction.type === "transfer") {
        if (transaction.from === accountKey) {
          balance -= transaction.amount;
        }
        if (transaction.to === accountKey) {
          balance += transaction.amount;
        }
      } else if (transaction.account === accountKey) {
        balance +=
          transaction.type === "income"
            ? transaction.amount
            : -transaction.amount;
      }
    });

    return balance;
  }

  const totalBalance =
    getBalance("cash") + getBalance("tng") + getBalance("school");

  if (accountsLoading) {
    return (
      <div className="app" style={{ padding: 24 }}>
        Loading your Monify accounts...
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="app" style={{ padding: 24 }}>
        <h2>Could not load your accounts</h2>
        <p>{accountsError}</p>
        <p>Check your Supabase table permissions and try refreshing.</p>
      </div>
    );
  }

  async function addTransaction(event) {
    event.preventDefault();
    const amount = Number(transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert(userError?.message || "Please sign in again.");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userData.user.id,
        type: transactionType,
        account: transactionAccount,
        from_account: null,
        to_account: null,
        amount,
        title: transactionCategory,
        category: transactionCategory,
        description: transactionDescription || transactionCategory,
        transaction_date: transactionDate,
      })
      .select()
      .single();

    if (error) {
      alert(`Could not save transaction: ${error.message}`);
      return;
    }

    setTransactions((current) => [
      {
        id: data.id,
        type: data.type,
        account: data.account,
        from: data.from_account,
        to: data.to_account,
        amount: Number(data.amount),
        title: data.title,
        category: data.category,
        description: data.description,
        date: data.transaction_date,
      },
      ...current,
    ]);
    setTransactionAmount("");
    setTransactionDescription("");
    setShowTransactionForm(false);
  }

  async function addTransfer(event) {
    event.preventDefault();
    const amount = Number(transferAmount);

    if (transferFrom === transferTo) {
      alert("Choose two different accounts.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    if (amount > getBalance(transferFrom)) {
      alert("You don't have enough money in the source account.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert(userError?.message || "Please sign in again.");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userData.user.id,
        type: "transfer",
        account: null,
        from_account: transferFrom,
        to_account: transferTo,
        amount,
        title: "Money Transfer",
        category: "Transfer",
        description: transferDescription || "Account transfer",
        transaction_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) {
      alert(`Could not save transfer: ${error.message}`);
      return;
    }

    setTransactions((current) => [
      {
        id: data.id,
        type: data.type,
        account: data.account,
        from: data.from_account,
        to: data.to_account,
        amount: Number(data.amount),
        title: data.title,
        category: data.category,
        description: data.description,
        date: data.transaction_date,
      },
      ...current,
    ]);
    setTransferAmount("");
    setTransferDescription("");
    setShowTransferForm(false);
  }

  async function deleteTransaction(id) {
    if (
      !window.confirm(
        "Delete this transaction? Account balances will be updated.",
      )
    ) {
      return;
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      alert(`Could not delete transaction: ${error.message}`);
      return;
    }
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id),
    );
  }

  async function createGoal(event) {
    event.preventDefault();

    const target = Number(goalTarget);
    const saved = Number(goalSaved) || 0;
    if (
      !goalName.trim() ||
      !Number.isFinite(target) ||
      target <= 0 ||
      saved < 0
    ) {
      alert("Enter a valid goal name and amounts.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert(userError?.message || "Please sign in again.");
      return;
    }

    const userId = userData.user.id;
    let imagePath = null;

    if (goalImageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(goalImageFile.type)) {
        alert("Please choose a JPG, PNG, or WebP image.");
        return;
      }
      if (goalImageFile.size > 5 * 1024 * 1024) {
        alert("Image must be 5 MB or smaller.");
        return;
      }

      const extension =
        goalImageFile.type === "image/jpeg"
          ? "jpg"
          : goalImageFile.type === "image/png"
            ? "png"
            : "webp";
      imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("goal-images")
        .upload(imagePath, goalImageFile, {
          contentType: goalImageFile.type,
          upsert: false,
        });

      if (uploadError) {
        alert(`Could not upload goal image: ${uploadError.message}`);
        return;
      }
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: userId,
        name: goalName.trim(),
        target,
        saved,
        deadline: goalDeadline || null,
        image_url: imagePath,
      })
      .select()
      .single();

    if (error) {
      if (imagePath)
        await supabase.storage.from("goal-images").remove([imagePath]);
      alert(`Could not save savings goal: ${error.message}`);
      return;
    }

    let signedImage = "";
    if (imagePath) {
      const { data: signedData } = await supabase.storage
        .from("goal-images")
        .createSignedUrl(imagePath, 60 * 60);
      signedImage = signedData?.signedUrl || "";
    }

    setGoals((current) => [
      {
        id: data.id,
        name: data.name,
        target: Number(data.target),
        saved: Number(data.saved),
        deadline: data.deadline || "",
        image: signedImage,
        imagePath,
      },
      ...current,
    ]);

    setGoalName("");
    setGoalTarget("");
    setGoalSaved("");
    setGoalDeadline("");
    setGoalImage("");
    setGoalImageFile(null);
    setShowGoalForm(false);
  }

  async function updateGoalAmount(id, amount) {
    const newAmount = Number(amount);

    if (!Number.isFinite(newAmount) || newAmount < 0) {
      alert("Enter a valid saved amount.");
      return;
    }

    const { error } = await supabase
      .from("savings_goals")
      .update({ saved: newAmount })
      .eq("id", id);

    if (error) {
      alert(`Could not update savings goal: ${error.message}`);
      return;
    }

    setGoals((current) =>
      current.map((goal) =>
        goal.id === id ? { ...goal, saved: newAmount } : goal,
      ),
    );
  }

  async function deleteGoal(id) {
    if (!window.confirm("Delete this savings goal?")) return;

    const goalToDelete = goals.find((goal) => goal.id === id);

    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Could not delete savings goal: ${error.message}`);
      return;
    }

    if (goalToDelete?.imagePath) {
      const { error: imageError } = await supabase.storage
        .from("goal-images")
        .remove([goalToDelete.imagePath]);
      if (imageError)
        console.warn(
          "Goal deleted, but image cleanup failed:",
          imageError.message,
        );
    }

    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  function renderGoal(goal) {
    const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));

    return (
      <div className="goal-card" key={goal.id}>
        <div className="goal-top">
          {goal.image ? (
            <img className="goal-image" src={goal.image} alt={goal.name} />
          ) : (
            <div className="goal-image goal-placeholder">🐷</div>
          )}

          <div className="goal-info">
            <h3>{goal.name}</h3>
            <p>
              {goal.deadline
                ? `Target date: ${goal.deadline}`
                : "No deadline set"}
            </p>
            <strong>{money(goal.target)}</strong>
          </div>
        </div>

        <div className="goal-progress-labels">
          <span>{money(goal.saved)} saved</span>
          <strong>{percent}%</strong>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="goal-footer">
          <span>{money(Math.max(0, goal.target - goal.saved))} left</span>

          <div className="goal-actions">
            <button
              className="text-button"
              onClick={() => {
                const amount = prompt(
                  "Enter new saved amount (RM):",
                  String(goal.saved),
                );
                if (amount !== null) updateGoalAmount(goal.id, amount);
              }}
            >
              Update
            </button>

            <button
              className="delete-button"
              onClick={() => deleteGoal(goal.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAccount(accountKey) {
    const account = accountInfo[accountKey];
    const accountTransactions = transactions.filter((transaction) =>
      transaction.type === "transfer"
        ? transaction.from === accountKey || transaction.to === accountKey
        : transaction.account === accountKey,
    );

    return (
      <>
        <button className="back-button" onClick={() => setPage("home")}>
          ← Back to Home
        </button>

        <section className="account-heading">
          <p className="eyebrow">{account.type}</p>
          <h2>
            {account.icon} {account.name}
          </h2>
        </section>

        <BankCard
          type={account.type}
          name={account.logo}
          balance={getBalance(accountKey)}
          number={account.cardNumber}
          cardClass={account.cardClass}
        />

        <div className="action-row">
          <button
            className="primary-button"
            onClick={() => {
              setTransactionAccount(accountKey);
              setShowTransactionForm(true);
            }}
          >
            + Add Transaction
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setTransferFrom(accountKey);
              setShowTransferForm(true);
            }}
          >
            ⇄ Transfer
          </button>
        </div>

        <section className="section">
          <div className="section-header">
            <h2>Transactions</h2>
          </div>

          <TransactionList
            transactions={accountTransactions}
            onDelete={deleteTransaction}
          />
        </section>
      </>
    );
  }

  function renderHome() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR FINANCES</p>
            <h2>Good afternoon.</h2>
          </div>
          <span className="status">
            <span /> All accounts
          </span>
        </section>

        <BankCard
          type="TOTAL ASSETS"
          name="MONIFY"
          balance={totalBalance}
          number="•••• •••• •••• 2026"
          cardClass="main-card"
        />

        <div className="action-row">
          <button
            className="primary-button"
            onClick={() => {
              setTransactionAccount("cash");
              setShowTransactionForm(true);
            }}
          >
            + Add Transaction
          </button>

          <button
            className="secondary-button"
            onClick={() => setShowTransferForm(true)}
          >
            ⇄ Transfer Money
          </button>
        </div>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">YOUR ACCOUNTS</p>
              <h2>Wallets</h2>
            </div>
          </div>

          <div className="account-grid">
            {Object.keys(accountInfo).map((key) => (
              <button
                className="account-tile"
                key={key}
                onClick={() => setPage(key)}
              >
                <span className="tile-icon">{accountInfo[key].icon}</span>
                <span>{accountInfo[key].name}</span>
                <strong>{money(getBalance(key))}</strong>
                <small>View account →</small>
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h2>Recent activity</h2>
            </div>
            <button className="text-button" onClick={() => setPage("activity")}>
              View all →
            </button>
          </div>

          <TransactionList
            transactions={transactions.slice(0, 5)}
            onDelete={deleteTransaction}
          />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">YOUR FUTURE</p>
              <h2>🐷 Savings goals</h2>
            </div>
            <button className="text-button" onClick={() => setPage("savings")}>
              View all →
            </button>
          </div>

          {goals.length ? (
            goals.slice(0, 2).map(renderGoal)
          ) : (
            <div className="empty-activity">
              <div className="activity-icon">🐷</div>
              <div>
                <h3>Start saving for something</h3>
                <p>Create a goal and track your progress.</p>
              </div>
            </div>
          )}

          <button
            className="primary-button"
            onClick={() => {
              setPage("savings");
              setShowGoalForm(true);
            }}
          >
            🐷 Create savings goal
          </button>
        </section>
      </>
    );
  }

  function renderSavings() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">PLAN YOUR FUTURE</p>
            <h2>🐷 Savings goals</h2>
          </div>
          <div className="savings-jar">🐷</div>
        </section>

        <p className="page-description">
          Save toward the things you really want.
        </p>

        <button
          className="primary-button"
          onClick={() => setShowGoalForm(true)}
        >
          + Create new goal
        </button>

        {showGoalForm && (
          <form className="goal-form" onSubmit={createGoal}>
            <h2>🐷 Create a savings goal</h2>

            <label>Goal picture</label>
            <label className="upload-box">
              {goalImage ? (
                <img src={goalImage} alt="Goal preview" />
              ) : (
                <>
                  <span>＋</span>
                  <p>Upload a picture</p>
                  <small>Choose from your phone or PC</small>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                  ];
                  if (!allowedTypes.includes(file.type)) {
                    alert("Please choose a JPG, PNG, or WebP image.");
                    event.target.value = "";
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("Image must be 5 MB or smaller.");
                    event.target.value = "";
                    return;
                  }

                  setGoalImageFile(file);
                  setGoalImage(URL.createObjectURL(file));
                }}
              />
            </label>

            <label>Goal name</label>
            <input
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              required
            />

            <label>Target amount (RM)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={goalTarget}
              onChange={(event) => setGoalTarget(event.target.value)}
              required
            />

            <label>Already saved (RM)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={goalSaved}
              onChange={(event) => setGoalSaved(event.target.value)}
            />

            <label>Deadline (optional)</label>
            <input
              type="date"
              value={goalDeadline}
              onChange={(event) => setGoalDeadline(event.target.value)}
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowGoalForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Create goal
              </button>
            </div>
          </form>
        )}

        <div className="goals-list">{goals.map(renderGoal)}</div>

        {!goals.length && !showGoalForm && (
          <div className="empty-activity">
            <div className="activity-icon">🐷</div>
            <div>
              <h3>No savings goals yet</h3>
              <p>Create your first goal to get started.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderMonthlyDashboard() {
    const [year, month] = dashboardMonth.split("-").map(Number);
    const monthTransactions = transactions.filter((transaction) => {
      if (!transaction.date || transaction.date.slice(0, 7) !== dashboardMonth)
        return false;
      return transaction.type === "income" || transaction.type === "expense";
    });

    const income = monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const net = income - expenses;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;

    const categoryTotals = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((acc, transaction) => {
        const category = transaction.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + transaction.amount;
        return acc;
      }, {});
    const categories = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1],
    );
    const highestCategory = categories[0];
    const maxCategory = highestCategory?.[1] || 1;
    const maxBar = Math.max(income, expenses, 1);
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(
      "en-MY",
      {
        month: "long",
        year: "numeric",
      },
    );

    return (
      <section className="monthly-dashboard">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">YOUR FINANCES</p>
            <h2>Monthly Dashboard</h2>
            <p className="dashboard-subtitle">
              A clear picture of your money this month.
            </p>
          </div>
          <label className="month-picker">
            <span>Month</span>
            <input
              type="month"
              value={dashboardMonth}
              onChange={(event) => setDashboardMonth(event.target.value)}
              aria-label="Select dashboard month"
            />
          </label>
        </div>

        <div className="monthly-stat-grid">
          <article className="monthly-stat-card">
            <span className="stat-label">Income</span>
            <strong className="income">{money(income)}</strong>
            <small>Money received</small>
          </article>
          <article className="monthly-stat-card">
            <span className="stat-label">Expenses</span>
            <strong className="expense">{money(expenses)}</strong>
            <small>Money spent</small>
          </article>
          <article className="monthly-stat-card">
            <span className="stat-label">Net savings</span>
            <strong className={net >= 0 ? "income" : "expense"}>
              {money(net)}
            </strong>
            <small>Income minus expenses</small>
          </article>
          <article className="monthly-stat-card">
            <span className="stat-label">Savings rate</span>
            <strong>{income > 0 ? `${savingsRate.toFixed(1)}%` : "—"}</strong>
            <small>
              {income > 0 ? "Of monthly income" : "Add income to calculate"}
            </small>
          </article>
        </div>

        <div className="monthly-panels">
          <article className="monthly-panel">
            <div className="monthly-panel-heading">
              <div>
                <p className="eyebrow">CASH FLOW</p>
                <h3>Income vs expenses</h3>
              </div>
              <span className="month-label">{monthLabel}</span>
            </div>
            <div className="cashflow-chart">
              <div className="cashflow-row">
                <span>Income</span>
                <div className="cashflow-track">
                  <div
                    className="cashflow-bar income-bar"
                    style={{
                      width: `${Math.max(0, (income / maxBar) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{money(income)}</strong>
              </div>
              <div className="cashflow-row">
                <span>Expenses</span>
                <div className="cashflow-track">
                  <div
                    className="cashflow-bar expense-bar"
                    style={{
                      width: `${Math.max(0, (expenses / maxBar) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{money(expenses)}</strong>
              </div>
            </div>
            <div className="cashflow-legend">
              <span>
                <i className="legend-dot income-dot" /> Income
              </span>
              <span>
                <i className="legend-dot expense-dot" /> Expenses
              </span>
            </div>
          </article>

          <article className="monthly-panel">
            <div className="monthly-panel-heading">
              <div>
                <p className="eyebrow">SPENDING HABITS</p>
                <h3>Spending by category</h3>
              </div>
            </div>
            {categories.length ? (
              <div className="category-breakdown">
                {categories.map(([category, amount]) => (
                  <div className="category-row" key={category}>
                    <div className="category-row-top">
                      <span>{category}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                    <div className="category-track">
                      <div
                        className="category-fill"
                        style={{ width: `${(amount / maxCategory) * 100}%` }}
                      />
                    </div>
                    <small>
                      {expenses > 0
                        ? `${((amount / expenses) * 100).toFixed(1)}% of expenses`
                        : ""}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                No expenses recorded for {monthLabel}.
              </div>
            )}
          </article>
        </div>

        <div className="monthly-summary-card">
          <div className="summary-icon">✦</div>
          <div>
            <p className="eyebrow">MONTHLY SUMMARY</p>
            <h3>{monthLabel}</h3>
            {monthTransactions.length ? (
              <p>
                You received <strong>{money(income)}</strong> and spent{" "}
                <strong>{money(expenses)}</strong>.
                {net >= 0
                  ? ` You kept ${money(net)} (${income > 0 ? `${savingsRate.toFixed(1)}%` : "—"}) of your income.`
                  : ` Your spending exceeded income by ${money(Math.abs(net))}.`}
                {highestCategory
                  ? ` Your highest spending category was ${highestCategory[0]} (${money(highestCategory[1])}).`
                  : ""}
              </p>
            ) : (
              <p>No income or expense transactions found for this month yet.</p>
            )}
          </div>
          {highestCategory && (
            <div className="highest-category">
              <span>Top category</span>
              <strong>{highestCategory[0]}</strong>
              <b>{money(highestCategory[1])}</b>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderActivity() {
    const filteredTransactions = transactions
      .filter((transaction) => {
        const search = activitySearch.trim().toLowerCase();
        const matchesSearch =
          !search ||
          [
            transaction.title,
            transaction.description,
            transaction.category,
            accountInfo[transaction.account]?.name,
            accountInfo[transaction.from]?.name,
            accountInfo[transaction.to]?.name,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));

        const matchesAccount =
          activityAccount === "all" ||
          (transaction.type === "transfer"
            ? transaction.from === activityAccount ||
              transaction.to === activityAccount
            : transaction.account === activityAccount);
        const matchesType =
          activityType === "all" || transaction.type === activityType;
        const matchesStart =
          !activityStartDate || transaction.date >= activityStartDate;
        const matchesEnd =
          !activityEndDate || transaction.date <= activityEndDate;
        return (
          matchesSearch &&
          matchesAccount &&
          matchesType &&
          matchesStart &&
          matchesEnd
        );
      })
      .sort((a, b) =>
        activitySort === "newest"
          ? String(b.date).localeCompare(String(a.date))
          : String(a.date).localeCompare(String(b.date)),
      );

    return (
      <>
        <section className="account-heading">
          <p className="eyebrow">ALL ACCOUNTS</p>
          <h2>Activity</h2>
        </section>

        <div className="action-row">
          <button
            className="primary-button"
            onClick={() => setShowTransactionForm(true)}
          >
            + Add Transaction
          </button>
          <button
            className="secondary-button"
            onClick={() => setShowTransferForm(true)}
          >
            ⇄ Transfer Money
          </button>
        </div>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">FIND A RECORD</p>
              <h2>Filter transactions</h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setActivitySearch("");
                setActivityAccount("all");
                setActivityType("all");
                setActivityStartDate("");
                setActivityEndDate("");
                setActivitySort("newest");
              }}
            >
              Reset
            </button>
          </div>

          <div className="activity-filters">
            <input
              aria-label="Search transactions"
              placeholder="Search title, category, notes…"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
            />
            <select
              aria-label="Filter by account"
              value={activityAccount}
              onChange={(e) => setActivityAccount(e.target.value)}
            >
              <option value="all">All accounts</option>
              {accountOptions.map((account) => (
                <option key={account.value} value={account.value}>
                  {account.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by transaction type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <label>
              From{" "}
              <input
                type="date"
                value={activityStartDate}
                onChange={(e) => setActivityStartDate(e.target.value)}
              />
            </label>
            <label>
              To{" "}
              <input
                type="date"
                value={activityEndDate}
                onChange={(e) => setActivityEndDate(e.target.value)}
              />
            </label>
            <select
              aria-label="Sort transactions"
              value={activitySort}
              onChange={(e) => setActivitySort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <p className="filter-result-count">
            Showing {filteredTransactions.length} of {transactions.length}{" "}
            transactions
          </p>
        </section>

        <TransactionList
          transactions={filteredTransactions}
          onDelete={deleteTransaction}
        />
      </>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={() => setPage("home")}>
          <div className="brand-icon">M</div>
          <div>
            <h1>Monify</h1>
            <p>Your money. One place.</p>
          </div>
        </button>
        <div className="header-actions">
          <button
            className="dashboard-nav-button"
            onClick={() => setPage("monthly")}
          >
            Monthly Dashboard
          </button>
          <div className="profile-button">⌘</div>
        </div>
      </header>

      <main>
        {page === "home" && renderHome()}
        {page === "cash" && renderAccount("cash")}
        {page === "tng" && renderAccount("tng")}
        {page === "school" && renderAccount("school")}
        {page === "savings" && renderSavings()}
        {page === "activity" && renderActivity()}
        {page === "monthly" && renderMonthlyDashboard()}
      </main>

      {transactionsLoading && (
        <div style={{ padding: "8px 24px", opacity: 0.75 }}>
          Loading transactions from Supabase...
        </div>
      )}
      {transactionsError && (
        <div style={{ padding: "8px 24px", color: "#e57373" }}>
          Could not load transactions: {transactionsError}
        </div>
      )}

      {showTransactionForm && (
        <div className="modal-backdrop">
          <form className="goal-form modal-form" onSubmit={addTransaction}>
            <h2>＋ Add Transaction</h2>

            <label>Transaction type</label>
            <select
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <label>Account</label>
            <select
              value={transactionAccount}
              onChange={(event) => setTransactionAccount(event.target.value)}
            >
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label>Amount (RM)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={transactionAmount}
              onChange={(event) => setTransactionAmount(event.target.value)}
              required
            />

            <label>Category</label>
            <select
              value={transactionCategory}
              onChange={(event) => setTransactionCategory(event.target.value)}
            >
              <option>Food</option>
              <option>Allowance</option>
              <option>Shopping</option>
              <option>Transport</option>
              <option>School</option>
              <option>Entertainment</option>
              <option>Other</option>
            </select>

            <label>Description (optional)</label>
            <input
              value={transactionDescription}
              onChange={(event) =>
                setTransactionDescription(event.target.value)
              }
              placeholder="What was this for?"
            />

            <label>Date</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              required
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTransactionForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {showTransferForm && (
        <div className="modal-backdrop">
          <form className="goal-form modal-form" onSubmit={addTransfer}>
            <h2>⇄ Transfer Money</h2>

            <label>From account</label>
            <select
              value={transferFrom}
              onChange={(event) => setTransferFrom(event.target.value)}
            >
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label>To account</label>
            <select
              value={transferTo}
              onChange={(event) => setTransferTo(event.target.value)}
            >
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label>Amount (RM)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              required
            />

            <label>Description (optional)</label>
            <input
              value={transferDescription}
              onChange={(event) => setTransferDescription(event.target.value)}
              placeholder="e.g. TNG top up"
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTransferForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      <nav className="bottom-nav">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => setPage("home")}
        >
          <span>⌂</span>Home
        </button>
        <button
          className={page === "cash" ? "nav-active" : ""}
          onClick={() => setPage("cash")}
        >
          <span>💵</span>Cash
        </button>
        <button
          className={page === "tng" ? "nav-active" : ""}
          onClick={() => setPage("tng")}
        >
          <span>💳</span>TNG
        </button>
        <button
          className={page === "school" ? "nav-active" : ""}
          onClick={() => setPage("school")}
        >
          <span>🎓</span>School
        </button>
        <button
          className={page === "savings" ? "nav-active" : ""}
          onClick={() => setPage("savings")}
        >
          <span>🐷</span>Savings
        </button>
      </nav>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState("loading");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const pinStorageKey = session ? `monify_pin_hash_${session.user.id}` : null;

  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!error) setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !pinStorageKey) {
      setPinStatus("loading");
      return;
    }

    const savedHash = localStorage.getItem(pinStorageKey);
    setPinInput("");
    setPinConfirm("");
    setPinError("");
    // Lock whenever Monify is loaded or the signed-in user changes.
    setPinStatus(savedHash ? "locked" : "setup");
  }, [session?.user?.id]);

  async function hashPin(pin) {
    // Web Crypto is available only in secure contexts (HTTPS/localhost).
    // Phones visiting the Vite LAN address over HTTP may not have crypto.subtle.
    if (globalThis.crypto?.subtle && typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(pin);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    // Pure JavaScript SHA-256 fallback for local HTTP development on mobile.
    // This preserves hashing rather than storing the PIN as plain text.
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const bytes = Array.from(pin, (ch) => ch.charCodeAt(0));
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push(
      0,
      0,
      0,
      0,
      (bitLength >>> 24) & 255,
      (bitLength >>> 16) & 255,
      (bitLength >>> 8) & 255,
      bitLength & 255,
    );

    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
      0x1f83d9ab, 0x5be0cd19,
    ];
    for (let offset = 0; offset < bytes.length; offset += 64) {
      const w = new Uint32Array(64);
      for (let i = 0; i < 16; i++) {
        const j = offset + i * 4;
        w[i] =
          ((bytes[j] << 24) |
            (bytes[j + 1] << 16) |
            (bytes[j + 2] << 8) |
            bytes[j + 3]) >>>
          0;
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        [h, g, f, e, d, c, b, a] = [
          g,
          f,
          e,
          (d + t1) >>> 0,
          c,
          b,
          a,
          (t1 + t2) >>> 0,
        ];
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }
    return H.map((value) => value.toString(16).padStart(8, "0")).join("");
  }

  async function handlePinSubmit(event) {
    event.preventDefault();
    setPinError("");

    if (!/^\d{6}$/.test(pinInput)) {
      setPinError("Please enter a 6-digit PIN.");
      return;
    }

    setPinBusy(true);

    try {
      if (pinStatus === "setup") {
        if (pinInput !== pinConfirm) {
          setPinError("The PINs do not match. Try again.");
          setPinBusy(false);
          return;
        }

        const hash = await hashPin(pinInput);
        localStorage.setItem(pinStorageKey, hash);
        setPinStatus("unlocked");
        setPinInput("");
        setPinConfirm("");
      } else {
        const savedHash = localStorage.getItem(pinStorageKey);
        const enteredHash = await hashPin(pinInput);

        if (savedHash && savedHash === enteredHash) {
          setPinStatus("unlocked");
          setPinInput("");
        } else {
          setPinError("Incorrect PIN. Try again.");
          setPinInput("");
        }
      }
    } catch {
      setPinError("PIN setup failed in this browser. Please try again.");
    } finally {
      setPinBusy(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading Monify...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (pinStatus === "loading") {
    return <div style={{ padding: 24 }}>Loading PIN lock...</div>;
  }

  if (pinStatus === "setup" || pinStatus === "locked") {
    const isSetup = pinStatus === "setup";

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#10110f",
          color: "#f7f4ec",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <form
          onSubmit={handlePinSubmit}
          style={{
            width: "100%",
            maxWidth: 360,
            background: "#1b1c19",
            border: "1px solid #3a3527",
            borderRadius: 20,
            padding: 28,
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 8 }}>🐷</div>
          <h1 style={{ margin: "0 0 8px", color: "#e6bd65" }}>Monify</h1>
          <p style={{ color: "#b9b7ae", marginBottom: 24 }}>
            {isSetup
              ? "Create a 6-digit PIN to lock this browser."
              : "Enter your PIN to unlock Monify."}
          </p>

          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="off"
            value={pinInput}
            onChange={(event) =>
              setPinInput(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit PIN"
            aria-label="6-digit PIN"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 14,
              borderRadius: 10,
              border: "1px solid #51462d",
              background: "#11120f",
              color: "#fff",
              fontSize: 22,
              textAlign: "center",
              letterSpacing: 8,
              marginBottom: 12,
            }}
          />

          {isSetup && (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="off"
              value={pinConfirm}
              onChange={(event) =>
                setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Confirm PIN"
              aria-label="Confirm 6-digit PIN"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #51462d",
                background: "#11120f",
                color: "#fff",
                fontSize: 22,
                textAlign: "center",
                letterSpacing: 8,
                marginBottom: 12,
              }}
            />
          )}

          {pinError && (
            <p style={{ color: "#ff9a9a", fontSize: 14 }}>{pinError}</p>
          )}

          <button
            type="submit"
            disabled={pinBusy}
            style={{
              width: "100%",
              padding: 14,
              border: 0,
              borderRadius: 10,
              background: "#e6bd65",
              color: "#17140d",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {pinBusy ? "Please wait..." : isSetup ? "Set PIN" : "Unlock"}
          </button>

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            style={{
              marginTop: 14,
              background: "transparent",
              border: 0,
              color: "#b9b7ae",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div
        className="pin-session-actions"
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={() => {
            setPinStatus("locked");
            setPinInput("");
            setPinError("");
          }}
          style={{ cursor: "pointer" }}
        >
          Lock
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      <Dashboard />
    </>
  );
}

export default App;

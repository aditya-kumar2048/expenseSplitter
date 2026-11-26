# Splitwise – Expense Splitter

A simple and responsive expense-splitting web application that helps groups manage shared expenses, calculate individual balances, and find the minimum number of transactions required to settle debts.

## Features

### 1. Group Management
- Add members to a group (maximum 10).
- Prevent empty and duplicate member names (case-insensitive).
- Remove members who are not associated with any expenses.
- View all group members.

### 2. Expense Management
- Add expenses with a title and amount in INR.
- Select who paid for the expense.
- Select members among whom the expense should be divided.
- Split expenses equally among selected members.
- Validate expense amounts (positive values with a maximum of 2 decimal places).
- Delete existing expenses.
- Display expenses in newest-first order.

### 3. Balance Calculation
For every group member, the application calculates:
- **Total Paid:** Total amount paid by the member.
- **Total Share:** Member's share of all expenses.
- **Net Balance:** Difference between total paid and total share.

Formula:

`Net Balance = Total Paid - Total Share`

A positive balance means the member should receive money, while a negative balance means the member owes money.

### 4. Minimum Transaction Settlement
- Automatically identifies who owes money and who should receive money.
- Minimizes the number of transactions required to settle all balances.
- Uses subset-sum partitioning, bitmasking, dynamic programming and greedy payment matching.

### 5. Data Persistence
- Uses browser localStorage to save group members and expenses.
- Restores saved data after refreshing the page.
- Includes a Reset Group option to clear all group data.

### 6. Responsive Interface
- Dashboard-style user interface.
- Separate sections for members, expenses, balances and settlements.
- Responsive layout for different screen sizes.

## Technologies Used

- HTML5 – Application structure.
- CSS3 – Styling and responsive layout.
- JavaScript (Vanilla JS) – Application logic and DOM manipulation.
- Browser localStorage – Client-side data persistence.

No backend or database is required.

## Project Structure

```text
expenseSplitter/
│
├── index.html      # Application structure
├── style.css       # Styling and responsive design
├── script.js       # Application logic and calculations
└── README.md       # Project documentation
```

## How to Run

1. Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

2. Open the project folder in VS Code.

3. Run `index.html` using Live Server, or open it directly in your browser.

4. Add at least two group members.

5. Add expenses, select the payer and choose the members sharing each expense.

6. View the updated balances and settlement instructions.

## Sample Test Case

**Members:** Rahul, Priya, Aman

| Expense | Amount | Paid By | Split Among |
|---|---:|---|---|
| Dinner | ₹900 | Rahul | Rahul, Priya, Aman |
| Cab | ₹300 | Priya | Priya, Aman |
| Snacks | ₹150 | Aman | Rahul, Priya |

### Expected Balances

| Member | Paid | Share | Net Balance |
|---|---:|---:|---:|
| Rahul | ₹900 | ₹350 | +₹550 |
| Priya | ₹300 | ₹500 | -₹200 |
| Aman | ₹150 | ₹500 | -₹350 |

### Expected Settlement

1. Aman pays Rahul ₹350.
2. Priya pays Rahul ₹200.

Total transactions required: **2**

## Known Limitations

- Expenses are divided equally among selected members.
- Unequal splitting by exact amounts or percentages is not implemented.
- Marking individual settlement payments as completed is not implemented.
- Filtering expenses by member is not implemented.
- Data is stored locally in the browser and is not synchronized between devices.

## Author

**Aditya Kumar**

B.Tech – Computer Science and Engineering

## License

This project was developed as a frontend expense-splitting application for educational and practical learning purposes.
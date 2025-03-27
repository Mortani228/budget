document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const totalBalanceDisplay = document.getElementById('total');
    const transactionsList = document.getElementById('transactions');
    const adviceContainer = document.getElementById('advice');
    const monthlyPaymentsList = document.getElementById('monthlyPaymentsList');
    let editTransactionId = null;

    // Установка текущей даты
    const currentDateElement = document.getElementById('currentDate');
    const currentDate = new Date();
    currentDateElement.textContent = currentDate.toLocaleString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    let username = localStorage.getItem('username') || '';
    if (username) {
        usernameInput.value = username;
        loadUserData(username);
    }

    document.getElementById('setUsername').addEventListener('click', function() {
        username = usernameInput.value.trim();
        localStorage.setItem('username', username);
        loadUserData(username);
    });

    document.getElementById('add').addEventListener('click', function() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;

        if (description && !isNaN(amount)) {
            if (editTransactionId) {
                updateTransaction(editTransactionId, { description, amount, type, category });
                editTransactionId = null;
                document.getElementById('add').textContent = "Добавить"; // Сброс текста кнопки
            } else {
                addTransaction(username, description, amount, type, category);
            }
            updateBalance(amount, type);

            // Очистим поля ввода
            document.getElementById('description').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('category').selectedIndex = 0; // Сброс категории
        } else {
            alert('Пожалуйста, заполните все поля корректно.');
        }
    });

    document.getElementById('viewPreviousTransactions').addEventListener('click', function() {
        loadPreviousTransactions(username);
    });

    // Добавление функции расчета плана погашения долга
    document.getElementById('calculateDebtPayment').addEventListener('click', function() {
        const debtAmount = parseFloat(document.getElementById('debtAmount').value);
        const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;
        const paymentTerm = parseInt(document.getElementById('paymentTerm').value);

        if (!isNaN(debtAmount) && !isNaN(interestRate) && !isNaN(paymentTerm) && paymentTerm > 0) {
            const monthlyPayment = calculateMonthlyPayment(debtAmount, interestRate, paymentTerm);
            const resultText = `Ежемесячный платеж: ${monthlyPayment.toFixed(2)} ₽`;
            document.getElementById('debtPlanResult').textContent = resultText;

            // Сохраняем расчет ежемесячного платежа
            saveMonthlyPayment(monthlyPayment);
        } else {
            alert('Пожалуйста, заполните все поля корректно для расчета.');
        }
    });

    document.getElementById('addMonthlyPayment').addEventListener('click', function() {
        const monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value);
        if (!isNaN(monthlyPayment)) {
            addMonthlyPayment(monthlyPayment);
            document.getElementById('monthlyPayment').value = ''; // Очистка поля
        } else {
            alert('Пожалуйста, введите корректное значение выплаты.');
        }
    });

    document.getElementById('clearTransactions').addEventListener('click', function() {
        const confirmation = confirm('Вы уверены, что хотите очистить все транзакции?');
        if (confirmation) {
            localStorage.removeItem(`transactions_${username}`);
            localStorage.setItem(`totalBalance_${username}`, '0');
            totalBalanceDisplay.textContent = '0.00';
            transactionsList.innerHTML = '';
            monthlyPaymentsList.innerHTML = ''; // Очистка списка месячных платежей
            generateAdvice();
            document.getElementById('debtPlanResult').textContent = ''; // Очистка результата погашения долга
        }
    });

    document.getElementById('applyFilter').addEventListener('click', function() {
        const selectedCategory = document.getElementById('categoryFilter').value;
        transactionsList.innerHTML = ''; // Очистить список перед отображением

        const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`)) || [];
        const filteredTransactions = selectedCategory === 'all' ? transactions : transactions.filter(t => t.category === selectedCategory);

        filteredTransactions.forEach(transaction => displayTransaction(transaction));
    });

    function loadUserData(username) {
        const totalBalance = parseFloat(localStorage.getItem(`totalBalance_${username}`)) || 0;
        totalBalanceDisplay.textContent = totalBalance.toFixed(2);
        loadTransactions(username);
        loadMonthlyPayments(username);
        generateAdvice();
    }

    function addTransaction(username, description, amount, type, category) {
        const transaction = { id: Date.now(), description, amount, type, category };
        const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`)) || [];

        transactions.push(transaction);
        localStorage.setItem(`transactions_${username}`, JSON.stringify(transactions));

        displayTransaction(transaction);
    }

    function updateTransaction(id, updatedTransaction) {
        const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`)) || [];
        const transactionIndex = transactions.findIndex(t => t.id === id);

        if (transactionIndex !== -1) {
            transactions[transactionIndex] = { ...transactions[transactionIndex], ...updatedTransaction };
            localStorage.setItem(`transactions_${username}`, JSON.stringify(transactions));
            loadTransactions(username); // Перегружаем транзакции
        }
    }

    function editTransaction(id) {
        const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`)) || [];
        const transaction = transactions.find(t => t.id === id);

        if (transaction) {
            document.getElementById('description').value = transaction.description;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('type').value = transaction.type;
            document.getElementById('category').value = transaction.category;
            document.getElementById('add').textContent = "Сохранить"; // Меняем текст кнопки на "Сохранить"
            editTransactionId = id; // Сохраняем ID редактируемой транзакции
        }
    }

    function loadPreviousTransactions(username) {
        const previousMonths = [...Array(new Date().getMonth()).keys()].map(month => {
            const monthKey = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`;
            return {
                monthKey,
                transactions: JSON.parse(localStorage.getItem(`transactions_${username}_${monthKey}`)) || []
            };
        });

        previousMonths.forEach(month => {
            if (month.transactions.length) {
                const monthHeader = document.createElement('h3');
                monthHeader.textContent = `Транзакции за ${month.monthKey}:`;
                transactionsList.appendChild(monthHeader);

                month.transactions.forEach(transaction => {
                    const transactionItem = document.createElement('li');
                    transactionItem.textContent = `${transaction.description}: ${transaction.amount} ₽ (${transaction.type}, Категория: ${transaction.category})`;
                    transactionItem.addEventListener('click', () => editTransaction(transaction.id)); // Редактируем на клик
                    transactionsList.appendChild(transactionItem);
                });
            }
        });
    }

    function updateBalance(amount, type) {
        const totalBalance = parseFloat(totalBalanceDisplay.textContent) || 0;
        const newBalance = totalBalance + (type === 'income' ? amount : -amount);
        totalBalanceDisplay.textContent = newBalance.toFixed(2);
        localStorage.setItem(`totalBalance_${username}`, newBalance);
        generateAdvice();
    }

    function loadTransactions(username) {
        const transactions = JSON.parse(localStorage.getItem(`transactions_${username}`)) || [];
        transactionsList.innerHTML = ''; // Очистить список перед отображением

        transactions.forEach(transaction => displayTransaction(transaction));
    }

    function displayTransaction(transaction) {
        const newTransaction = document.createElement('li');
        newTransaction.classList.add('transaction', transaction.type);
        newTransaction.textContent = `${transaction.description}: ${transaction.type === 'income' ? '+' : '-'} ${transaction.amount} ₽ (Категория: ${transaction.category})`;
        newTransaction.addEventListener('click', () => editTransaction(transaction.id)); // Редактируем при клике
        transactionsList.appendChild(newTransaction);
    }

    function loadMonthlyPayments(username) {
        const monthlyPayments = JSON.parse(localStorage.getItem(`monthlyPayments_${username}`)) || [];
        monthlyPayments.forEach(payment => displayMonthlyPayment(payment));
    }

    function addMonthlyPayment(monthlyPayment) {
        const payments = JSON.parse(localStorage.getItem(`monthlyPayments_${username}`)) || [];
        payments.push(monthlyPayment);
        localStorage.setItem(`monthlyPayments_${username}`, JSON.stringify(payments));

        displayMonthlyPayment(monthlyPayment);
    }

    function displayMonthlyPayment(payment) {
        const newPayment = document.createElement('li');
        newPayment.classList.add('monthly-payment');
        newPayment.textContent = `${payment.toFixed(2)} ₽`;
        monthlyPaymentsList.appendChild(newPayment);
    }

    function generateAdvice() {
        adviceContainer.innerHTML = '';
        const totalBalance = parseFloat(totalBalanceDisplay.textContent);
        let advice = '';

        if (totalBalance > 10000) {
            advice = 'Отлично! Попробуйте инвестировать часть ваших средств.';
        } else if (totalBalance > 0) {
            advice = 'Вы в плюсе! Сохраните эту сумму для трудных времен.';
        } else {
            advice = 'Время задуматься о расходах. Постарайтесь не тратить лишнего.';
        }

        adviceContainer.innerHTML = `<p>${advice}</p>`;
    }

    function calculateMonthlyPayment(debtAmount, interestRate, paymentTerm) {
        const monthlyRate = interestRate / 12;
        return (debtAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -paymentTerm));
    }
});

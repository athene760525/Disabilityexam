let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let currentBankFile = '';
let mode = '';

async function selectBank(fileName, bankName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`找不到檔案: ${fileName}`);
        allQuestions = await response.json();
        currentBankFile = fileName.replace('.json', '');
        
        document.getElementById('bank-select').classList.add('hidden');
        document.getElementById('mode-select').classList.remove('hidden');
        document.getElementById('selected-bank-title').innerText = bankName;
        updateErrorCount();
    } catch (e) {
        alert("載入題庫失敗！錯誤: " + e.message);
    }
}

function updateErrorCount() {
    const errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    document.getElementById('error-count').innerText = errors.length;
}

function startMode(selectedMode) {
    mode = selectedMode;
    currentIndex = 0;
    userAnswers = [];
    document.getElementById('mode-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    if (mode === 'sequence') currentQuestions = [...allQuestions];
    else if (mode === 'random') currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
    else if (mode === 'exam') currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 40);
    else if (mode === 'error') {
        const errorIds = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
        currentQuestions = allQuestions.filter(q => errorIds.includes(q.id));
        if (currentQuestions.length === 0) { alert("目前沒有錯題！"); location.reload(); return; }
    }
    
    document.getElementById('quiz-mode-display').innerText = mode.toUpperCase();
    showQuestion();
}

function showQuestion() {
    const q = currentQuestions[currentIndex];
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('feedback').classList.add('hidden');
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 border-2 rounded-xl hover:bg-gray-50 transition font-medium option-btn";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(index, btn);
        container.appendChild(btn);
    });

    updateNavButtons();
}

function updateNavButtons() {
    const isLastQuestion = currentIndex === currentQuestions.length - 1;
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');

    prevBtn.style.display = (mode === 'exam' || currentIndex === 0) ? 'none' : 'block';

    if (isLastQuestion) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        submitBtn.innerText = mode === 'exam' ? "提交試卷 (看成績)" : "結束測驗 (回選單)";
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function handleAnswer(selectedIndex, btn) {
    const q = currentQuestions[currentIndex];
    const isCorrect = selectedIndex === q.answer;

    if (mode === 'exam') {
        userAnswers[currentIndex] = selectedIndex;
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected', 'bg-blue-100', 'border-blue-500'));
        btn.classList.add('selected', 'bg-blue-100', 'border-blue-500');
        if (currentIndex < currentQuestions.length - 1) {
            setTimeout(nextQuestion, 300);
        }
    } else {
        document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns[q.answer].classList.add('bg-green-100', 'border-green-500', 'text-green-700');
        if (!isCorrect) {
            btn.classList.add('bg-red-100', 'border-red-500', 'text-red-700');
            logError(q.id);
        } else if (mode === 'error') {
            removeError(q.id);
        }
        showFeedback(isCorrect, q.explanation);
    }
}

function showFeedback(isCorrect, explanation) {
    const fb = document.getElementById('feedback');
    fb.classList.remove('hidden', 'bg-green-50', 'bg-red-50');
    fb.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
    fb.innerHTML = `<p class="font-bold text-lg">${isCorrect ? '✓ 正確' : '✗ 錯誤'}</p><p class="mt-2 text-gray-600">${explanation}</p>`;
}

function logError(id) {
    let errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    if (!errors.includes(id)) { errors.push(id); localStorage.setItem('errors_' + currentBankFile, JSON.stringify(errors)); }
}

function removeError(id) {
    let errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    errors = errors.filter(e => e !== id);
    localStorage.setItem('errors_' + currentBankFile, JSON.stringify(errors));
}

function nextQuestion() { if (currentIndex < currentQuestions.length - 1) { currentIndex++; showQuestion(); } }
function prevQuestion() { if (currentIndex > 0) { currentIndex--; showQuestion(); } }

function finishExam() {
    if (mode === 'exam') {
        let score = 0;
        currentQuestions.forEach((q, i) => { if (userAnswers[i] === q.answer) score++; else logError(q.id); });
        const final = Math.round((score / currentQuestions.length) * 100);
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('result-container').classList.remove('hidden');
        document.getElementById('score-display').innerText = final + "%";
    } else {
        location.reload();
    }
}
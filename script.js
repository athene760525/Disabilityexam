let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let currentBankFile = '';
let mode = '';

// 1. 選擇題庫
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
        alert("載入題庫失敗！請確認倉庫中是否有 " + fileName + "\n錯誤資訊: " + e.message);
    }
}

function updateErrorCount() {
    const errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    document.getElementById('error-count').innerText = errors.length;
}

// 2. 開始練習
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
    }
    
    document.getElementById('quiz-mode-display').innerText = mode.toUpperCase();
    showQuestion();
}

// 3. 顯示題目
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

    document.getElementById('prev-btn').style.display = (mode === 'exam' || currentIndex === 0) ? 'none' : 'block';
    document.getElementById('next-btn').style.display = (currentIndex === currentQuestions.length - 1) ? 'none' : 'block';
    document.getElementById('submit-btn').style.display = (mode === 'exam' && currentIndex === currentQuestions.length - 1) ? 'block' : 'none';
}

// 4. 判斷答案
function handleAnswer(selectedIndex, btn) {
    const q = currentQuestions[currentIndex];
    const isCorrect = selectedIndex === q.answer;

    if (mode === 'exam') {
        userAnswers[currentIndex] = selectedIndex;
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        setTimeout(nextQuestion, 200);
    } else {
        document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns[q.answer].classList.add('correct');
        if (!isCorrect) {
            btn.classList.add('wrong');
            logError(q.id);
        } else if (mode === 'error') {
            removeError(q.id);
        }
        showFeedback(isCorrect, q.explanation);
    }
}

function showFeedback(isCorrect, explanation) {
    const fb = document.getElementById('feedback');
    fb.classList.remove('hidden', 'bg-green-100', 'bg-red-100');
    fb.classList.add(isCorrect ? 'bg-green-100' : 'bg-red-100');
    fb.innerHTML = `<p class="font-bold">${isCorrect ? '正確！' : '錯誤！'}</p><p class="mt-2 text-sm">${explanation}</p>`;
}

function logError(id) {
    let errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    if (!errors.includes(id)) {
        errors.push(id);
        localStorage.setItem('errors_' + currentBankFile, JSON.stringify(errors));
    }
}

function removeError(id) {
    let errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    errors = errors.filter(e => e !== id);
    localStorage.setItem('errors_' + currentBankFile, JSON.stringify(errors));
}

function nextQuestion() { if (currentIndex < currentQuestions.length - 1) { currentIndex++; showQuestion(); } }
function prevQuestion() { if (currentIndex > 0) { currentIndex--; showQuestion(); } }

function finishExam() {
    let score = 0;
    currentQuestions.forEach((q, i) => { if (userAnswers[i] === q.answer) score++; else logError(q.id); });
    const final = Math.round((score / currentQuestions.length) * 100);
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    document.getElementById('score-display').innerText = final + "%";
}
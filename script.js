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
        alert("載入題庫失敗！錯誤: " + e.message);
    }
}

function updateErrorCount() {
    const errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    document.getElementById('error-count').innerText = errors.length;
}

// 2. 開始模式
function startMode(selectedMode) {
    mode = selectedMode;
    currentIndex = 0;
    userAnswers = []; 

    if (mode === 'sequence') {
        currentQuestions = [...allQuestions];
    } else if (mode === 'random') {
        currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
    } else if (mode === 'exam') {
        currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 40);
        userAnswers = new Array(currentQuestions.length).fill(null);
    } else if (mode === 'error') {
        const errorIds = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
        currentQuestions = allQuestions.filter(q => errorIds.includes(q.id));
        if (currentQuestions.length === 0) {
            alert("目前沒有錯題！");
            location.reload();
            return;
        }
    }
    
    document.getElementById('mode-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    
    const modeNameMap = { 'sequence': '順序練習', 'random': '隨機練習', 'exam': '模擬考試', 'error': '錯題練習' };
    document.getElementById('quiz-mode-display').innerText = modeNameMap[mode];
    
    showQuestion();
}

// 3. 顯示題目
function showQuestion() {
    const q = currentQuestions[currentIndex];
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    
    const qText = document.getElementById('question-text');
    qText.style.whiteSpace = "pre-wrap"; // 保持表格對齊關鍵
    qText.innerText = q.question;
    
    document.getElementById('feedback').classList.add('hidden');
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 border-2 rounded-xl transition font-medium option-btn";
        btn.innerText = opt;
        
        if (mode === 'exam' && userAnswers[currentIndex] === index) {
            btn.classList.add('selected');
        }

        btn.onclick = () => handleAnswer(index, btn);
        container.appendChild(btn);
    });

    updateNavButtons();
}

// 4. 更新導覽按鈕
function updateNavButtons() {
    const isLastQuestion = currentIndex === currentQuestions.length - 1;
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');

    prevBtn.style.display = (currentIndex === 0) ? 'none' : 'block';

    if (isLastQuestion) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        submitBtn.innerText = mode === 'exam' ? "提交試卷 (看成績)" : "結束練習 (回選單)";
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

// 5. 處理回答
function handleAnswer(selectedIndex, btn) {
    const q = currentQuestions[currentIndex];

    if (mode === 'exam') {
        userAnswers[currentIndex] = selectedIndex;
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // 延遲跳題
        if (currentIndex < currentQuestions.length - 1) {
            setTimeout(nextQuestion, 300);
        }
    } else {
        document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
        const allBtns = document.querySelectorAll('.option-btn');
        const isCorrect = selectedIndex === q.answer;

        allBtns[q.answer].classList.add('correct');
        
        if (!isCorrect) {
            btn.classList.add('wrong');
            logError(q.id);
        } else if (mode === 'error') {
            removeError(q.id);
        }
        
        showFeedback(isCorrect, q.explanation, q.Source);
    }
}

// 6. 顯示詳解
function showFeedback(isCorrect, explanation, source) {
    const fb = document.getElementById('feedback');
    fb.classList.remove('hidden');
    fb.style.whiteSpace = "pre-wrap";
    fb.className = "mt-8 p-6 rounded-xl " + (isCorrect ? "correct" : "wrong");
    
    fb.innerHTML = `
        <p class="font-bold text-lg mb-2">${isCorrect ? '✓ 正確' : '✗ 錯誤'}</p>
        <div class="text-gray-700 leading-relaxed">${explanation}</div>
        ${source ? `<p class="mt-4 text-sm font-bold opacity-60">出處：${source}</p>` : ''}
    `;
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

function nextQuestion() { 
    if (currentIndex < currentQuestions.length - 1) { 
        currentIndex++; 
        showQuestion(); 
    } 
}
function prevQuestion() { 
    if (currentIndex > 0) { 
        currentIndex--; 
        showQuestion(); 
    } 
}

// 7. 結算
function finishExam() {
    if (mode === 'exam') {
        let score = 0;
        currentQuestions.forEach((q, i) => {
            if (userAnswers[i] === q.answer) {
                score++;
            } else {
                logError(q.id); 
            }
        });
        
        const finalScore = Math.round((score / currentQuestions.length) * 100);
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('result-container').classList.remove('hidden');
        document.getElementById('score-display').innerText = finalScore + " 分";
    } else {
        location.reload();
    }
}
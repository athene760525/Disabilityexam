let allQuestions = [];      // 當前載入的題庫原始數據
let currentQuestions = [];  // 根據模式篩選後的題目
let currentIndex = 0;
let userAnswers = [];
let currentBankName = '';   // 紀錄當前是哪一個題庫
let mode = '';              // sequence, random, exam, error

// 1. 選擇題庫並載入 JSON
async function selectBank(fileName, bankName) {
    try {
        const response = await fetch(fileName);
        allQuestions = await response.json();
        currentBankName = fileName.replace('.json', ''); // 用檔名當 localStorage 的 Key
        
        // 顯示模式選擇介面
        document.getElementById('bank-select').classList.add('hidden');
        document.getElementById('mode-select').classList.remove('hidden');
        document.getElementById('selected-bank-title').innerText = bankName;
        
        updateErrorCount();
    } catch (error) {
        alert('題庫載入失敗，請檢查 JSON 檔案路徑與內容是否正確！');
    }
}

// 2. 返回題庫選擇
function backToBank() {
    document.getElementById('bank-select').classList.remove('hidden');
    document.getElementById('mode-select').classList.add('hidden');
}

// 3. 更新錯題數
function updateErrorCount() {
    const errorIds = JSON.parse(localStorage.getItem(`errors_${currentBankName}`) || '[]');
    document.getElementById('error-count').innerText = errorIds.length;
}

// 4. 開始練習模式
function startMode(selectedMode) {
    mode = selectedMode;
    currentIndex = 0;
    userAnswers = [];
    document.getElementById('mode-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    
    let modeText = "";
    if (mode === 'sequence') {
        currentQuestions = [...allQuestions];
        modeText = "順序練習";
    } else if (mode === 'random') {
        currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
        modeText = "隨機練習";
    } else if (mode === 'exam') {
        currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 40); // 模擬考試抽40題
        modeText = "模擬考試 (結束才顯示正確答案)";
    } else if (mode === 'error') {
        const errorIds = JSON.parse(localStorage.getItem(`errors_${currentBankName}`) || '[]');
        currentQuestions = allQuestions.filter(q => errorIds.includes(q.id));
        if (currentQuestions.length === 0) {
            alert("目前沒有錯題紀錄！");
            location.reload();
            return;
        }
        modeText = "錯題強化練習";
    }
    
    document.getElementById('quiz-mode-display').innerText = modeText;
    showQuestion();
}

// 5. 顯示題目
function showQuestion() {
    const q = currentQuestions[currentIndex];
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('feedback').classList.add('hidden');
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full text-left p-4 border-2 border-slate-200 rounded-xl transition font-medium";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(index, btn);
        container.appendChild(btn);
    });

    // 按鈕控制
    document.getElementById('prev-btn').style.display = (mode === 'exam' || currentIndex === 0) ? 'none' : 'block';
    document.getElementById('next-btn').style.display = (currentIndex === currentQuestions.length - 1) ? 'none' : 'block';
    document.getElementById('submit-btn').style.display = (mode === 'exam' && currentIndex === currentQuestions.length - 1) ? 'block' : 'none';
}

// 6. 處理答案
function handleAnswer(selectedIndex, btnElement) {
    const q = currentQuestions[currentIndex];
    const isCorrect = selectedIndex === q.answer;

    if (mode === 'exam') {
        // 考試模式：紀錄答案但不反饋，直接跳下一題
        userAnswers[currentIndex] = selectedIndex;
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.classList.remove('border-blue-500', 'bg-blue-50'));
        btnElement.classList.add('border-blue-500', 'bg-blue-50');
        
        setTimeout(() => {
            if (currentIndex < currentQuestions.length - 1) {
                nextQuestion();
            }
        }, 300);
    } else {
        // 練習模式：即時反饋
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns[q.answer].classList.add('correct');
        
        if (!isCorrect) {
            btnElement.classList.add('wrong');
            saveError(q.id);
        } else {
            if (mode === 'error') removeError(q.id);
        }
        
        showFeedback(isCorrect, q.explanation);
    }
}

function showFeedback(isCorrect, explanation) {
    const fb = document.getElementById('feedback');
    fb.classList.remove('hidden', 'bg-green-50', 'bg-red-50');
    fb.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
    fb.innerHTML = `
        <p class="font-bold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}">
            ${isCorrect ? '✓ 回答正確' : '✗ 回答錯誤'}
        </p>
        <div class="mt-2 text-slate-600 text-sm leading-relaxed">${explanation}</div>
    `;
}

// 7. 錯題存取 (Key 加上題庫名稱區分)
function saveError(id) {
    let errors = JSON.parse(localStorage.getItem(`errors_${currentBankName}`) || '[]');
    if (!errors.includes(id)) {
        errors.push(id);
        localStorage.setItem(`errors_${currentBankName}`, JSON.stringify(errors));
    }
}

function removeError(id) {
    let errors = JSON.parse(localStorage.getItem(`errors_${currentBankName}`) || '[]');
    errors = errors.filter(eid => eid !== id);
    localStorage.setItem(`errors_${currentBankName}`, JSON.stringify(errors));
}

// 8. 導覽
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

// 9. 結束考試計算分數
function finishExam() {
    let correctCount = 0;
    currentQuestions.forEach((q, index) => {
        if (userAnswers[index] === q.answer) {
            correctCount++;
        } else {
            saveError(q.id);
        }
    });

    const score = Math.round((correctCount / currentQuestions.length) * 100);
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    document.getElementById('score-display').innerText = `${score}%`;
}
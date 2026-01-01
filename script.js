/**
 * 題庫練習系統 核心邏輯 (script.js)
 */

let allQuestions = [];      // 儲存從 JSON 載入的所有原始題目
let currentQuestions = [];  // 儲存當前模式下的題目順序 (洗牌後或篩選後)
let currentIndex = 0;       // 目前作答的索引
let userAnswers = [];       // 儲存使用者的答案 (主要用於考試模式)
let currentBankFile = '';   // 當前題庫檔案名稱 (用於 LocalStorage Key)
let mode = '';              // 當前練習模式 (sequence, random, exam, error)

// --- 1. 洗牌演算法 (Fisher-Yates Shuffle) ---
// 這是確保「隨機且不重複」的關鍵
function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// --- 2. 選擇題庫 ---
async function selectBank(fileName, bankName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`找不到檔案: ${fileName}`);
        allQuestions = await response.json();
        
        // 設定目前的題庫標示 (移除副檔名作為 Key)
        currentBankFile = fileName.replace('.json', '');
        
        // 切換介面
        document.getElementById('bank-select').classList.add('hidden');
        document.getElementById('mode-select').classList.remove('hidden');
        document.getElementById('selected-bank-title').innerText = bankName;
        
        updateErrorCount();
    } catch (e) {
        alert("載入題庫失敗！錯誤: " + e.message + "\n請確認 JSON 檔案路徑正確。");
    }
}

// 更新畫面上的錯題數量
function updateErrorCount() {
    const errors = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
    const countEl = document.getElementById('error-count');
    if (countEl) countEl.innerText = errors.length;
}

// --- 3. 開始練習模式 ---
function startMode(selectedMode) {
    mode = selectedMode;
    currentIndex = 0;
    userAnswers = []; 

    // 根據模式處理題目順序
    if (mode === 'sequence') {
        // 1. 順序練習：直接使用原始順序
        currentQuestions = [...allQuestions];
    } 
    else if (mode === 'random') {
        // 2. 隨機練習：將整份題庫進行洗牌
        // 在這一次循環中，currentIndex 從 0 走到最後，題目都不會重複
        currentQuestions = shuffleArray(allQuestions);
    } 
    else if (mode === 'exam') {
        // 3. 模擬考試：隨機抽 40 題
        currentQuestions = shuffleArray(allQuestions).slice(0, 40);
        userAnswers = new Array(currentQuestions.length).fill(null);
    } 
    else if (mode === 'error') {
        // 4. 錯題複習
        const errorIds = JSON.parse(localStorage.getItem('errors_' + currentBankFile) || '[]');
        currentQuestions = allQuestions.filter(q => errorIds.includes(q.id));
        
        if (currentQuestions.length === 0) {
            alert("目前沒有錯題可以複習！");
            location.reload();
            return;
        }
    }
    
    // 切換到測驗容器
    document.getElementById('mode-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    
    // 顯示當前模式名稱
    const modeNameMap = { 
        'sequence': '順序練習', 
        'random': '隨機練習 (不重複循環)', 
        'exam': '模擬考試', 
        'error': '錯題複習' 
    };
    document.getElementById('quiz-mode-display').innerText = modeNameMap[mode];
    
    showQuestion();
}

// --- 4. 顯示題目 ---
function showQuestion() {
    const q = currentQuestions[currentIndex];
    
    // 更新進度文字
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    
    // 顯示題目內容 (處理可能存在的表格對齊)
    const qText = document.getElementById('question-text');
    qText.style.whiteSpace = "pre-wrap"; 
    qText.innerText = q.question;
    
    // 重置解析區域與選項容器
    document.getElementById('feedback').classList.add('hidden');
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    // 建立選項按鈕
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 border-2 rounded-xl transition font-medium option-btn";
        btn.innerText = opt;
        
        // 考試模式回溯：標記先前選過的答案
        if (mode === 'exam' && userAnswers[currentIndex] === index) {
            btn.classList.add('selected');
        }

        btn.onclick = () => handleAnswer(index, btn);
        container.appendChild(btn);
    });

    updateNavButtons();
}

// --- 5. 更新導覽按鈕 (上一題/下一題/提交) ---
function updateNavButtons() {
    const isLastQuestion = currentIndex === currentQuestions.length - 1;
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');

    // 第一題時隱藏「上一題」
    prevBtn.style.display = (currentIndex === 0) ? 'none' : 'block';

    // 最後一題時切換為「提交/結束」
    if (isLastQuestion) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        submitBtn.innerText = (mode === 'exam') ? "提交試卷 (看成績)" : "結束練習 (回選單)";
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

// --- 6. 處理回答邏輯 ---
function handleAnswer(selectedIndex, btn) {
    const q = currentQuestions[currentIndex];

    if (mode === 'exam') {
        // 模擬考試模式：僅記錄選擇，不給即時回饋
        userAnswers[currentIndex] = selectedIndex;
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // 自動跳下一題 (可選功能)
        if (currentIndex < currentQuestions.length - 1) {
            setTimeout(nextQuestion, 300);
        }
    } else {
        // 練習模式：即時顯示對錯與解析
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true); // 禁止重複點選
        
        const isCorrect = (selectedIndex === q.answer);
        allBtns[q.answer].classList.add('correct');
        
        if (!isCorrect) {
            btn.classList.add('wrong');
            logError(q.id); // 記錄到錯題庫
        } else if (mode === 'error') {
            removeError(q.id); // 若在錯題模式答對，移除該錯題
        }
        
        showFeedback(isCorrect, q.explanation, q.Source);
    }
}

// --- 7. 顯示詳細解析 ---
function showFeedback(isCorrect, explanation, source) {
    const fb = document.getElementById('feedback');
    fb.classList.remove('hidden');
    fb.style.whiteSpace = "pre-wrap";
    
    // 根據對錯改變背景色
    fb.className = "mt-8 p-6 rounded-xl " + (isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200");
    
    fb.innerHTML = `
        <p class="font-bold text-lg mb-2" style="color: ${isCorrect ? '#059669' : '#dc2626'}">
            ${isCorrect ? '✓ 正確' : '✗ 錯誤'}
        </p>
        <div class="text-gray-700 leading-relaxed">${explanation || '無解析內容'}</div>
        ${source ? `<p class="mt-4 text-xs font-bold text-gray-400">出處：${source}</p>` : ''}
    `;
}

// --- 8. 錯題存取 (LocalStorage) ---
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

// --- 9. 換題控制 ---
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

// --- 10. 結算與結束 ---
function finishExam() {
    if (mode === 'exam') {
        // 計算分數
        let score = 0;
        currentQuestions.forEach((q, i) => {
            if (userAnswers[i] === q.answer) {
                score++;
            } else {
                logError(q.id); // 考試錯題也列入紀錄
            }
        });
        
        const finalScore = Math.round((score / currentQuestions.length) * 100);
        
        // 顯示結果畫面
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('result-container').classList.remove('hidden');
        document.getElementById('score-display').innerText = finalScore + " 分";
    } else {
        // 練習模式結束，確認後重新整理回首頁
        if (confirm("已完成本次練習，要回到主選單嗎？")) {
            location.reload();
        }
    }
}

// 初始化錯題顯示 (首頁)
window.onload = () => {
    // 如果有需要可以在這裡做初始檢查
};
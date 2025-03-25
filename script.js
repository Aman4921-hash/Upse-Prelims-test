/* script.js */
let questions = [];
let currentQuestionIndex = 0;
let timer;
let timeLeft = 30;
let userResponses = []; // Will hold objects: {question_id, answer}
let userData = {};
let totalQuestions = 0;
const timerMode = "perQuestion"; // Only per-question timer mode implemented

// Real-time clock update
function updateClock() {
  const now = new Date();
  document.getElementById("real-time-clock").innerText = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);

// Handle user form submission
document.getElementById('user-form').addEventListener('submit', function(e) {
  e.preventDefault();
  userData.name = document.getElementById('name').value;
  userData.email = document.getElementById('email').value;
  userData.phone = document.getElementById('phone').value;
  document.getElementById('user-info').classList.add('hidden');
  document.getElementById('quiz-section').classList.remove('hidden');
  fetchQuestions();
});

// Fetch questions from local questions.json
function fetchQuestions() {
  fetch('questions.json')
    .then(response => response.json())
    .then(data => {
      questions = data;
      totalQuestions = questions.length;
      // Shuffle questions if desired (set shuffleQuestions true in config, here hardcoded true)
      questions = shuffleArray(questions);
      // Shuffle options in each question
      questions.forEach(q => {
        q.options = shuffleArray(q.options);
      });
      userResponses = new Array(totalQuestions).fill(null);
      showQuestion();
    })
    .catch(err => console.error("Error fetching questions:", err));
}

// Utility: Shuffle an array
function shuffleArray(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Update progress information
function updateProgress() {
  const attempted = userResponses.filter(resp => resp !== null).length;
  const remaining = totalQuestions - attempted;
  document.getElementById("progress-text").innerText =
    `Question ${currentQuestionIndex + 1} of ${totalQuestions} | Attempted: ${attempted} | Remaining: ${remaining}`;
}

// Display the current question with fade effect
function showQuestion() {
  resetTimer();
  updateProgress();
  if (currentQuestionIndex < totalQuestions) {
    const question = questions[currentQuestionIndex];
    const container = document.getElementById('question-container');
    container.classList.remove('in');
    setTimeout(() => {
      document.getElementById('question-text').innerText = question.question;
      const optionsList = document.getElementById('options-list');
      optionsList.innerHTML = '';
      question.options.forEach(option => {
        const li = document.createElement('li');
        li.innerText = option;
        li.addEventListener('click', function() {
          selectOption(li, option);
        });
        // Highlight previously selected answer if exists
        if (userResponses[currentQuestionIndex] && userResponses[currentQuestionIndex].answer === option) {
          li.classList.add('selected');
        }
        optionsList.appendChild(li);
      });
      container.classList.add('in');
      updateNavButtons();
      if (timerMode === "perQuestion") startTimer();
    }, 300);
  } else {
    finishQuiz();
  }
}

// Record the selected option
function selectOption(element, selectedOption) {
  const question = questions[currentQuestionIndex];
  userResponses[currentQuestionIndex] = { question_id: question.id, answer: selectedOption };
  document.querySelectorAll('#options-list li').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
}

// Update navigation buttons (hide previous button on first question)
function updateNavButtons() {
  const prevBtn = document.getElementById('prev-button');
  prevBtn.classList.toggle('hidden', currentQuestionIndex === 0);
}

// Button event handlers
document.getElementById('next-button').addEventListener('click', function() {
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    showQuestion();
  } else {
    finishQuiz();
  }
});
document.getElementById('prev-button').addEventListener('click', function() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion();
  }
});
document.getElementById('skip-button').addEventListener('click', function() {
  if (!userResponses[currentQuestionIndex]) {
    const question = questions[currentQuestionIndex];
    userResponses[currentQuestionIndex] = { question_id: question.id, answer: "" };
  }
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    showQuestion();
  } else {
    finishQuiz();
  }
});

// Timer functions for per-question mode
function startTimer() {
  timeLeft = 30;
  document.getElementById('timer').innerText = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!userResponses[currentQuestionIndex]) {
        const question = questions[currentQuestionIndex];
        userResponses[currentQuestionIndex] = { question_id: question.id, answer: "" };
      }
      if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        showQuestion();
      } else {
        finishQuiz();
      }
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timer);
  timeLeft = 30;
  document.getElementById('timer').innerText = timeLeft;
}

// When quiz finishes, show a loading message, calculate score, display report, and enable PDF download
function finishQuiz() {
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('loading-section').classList.remove('hidden');
  setTimeout(() => {
    let score = 0;
    let report = [];
    questions.forEach((q, index) => {
      const response = userResponses[index];
      const isCorrect = response && (q.answer === response.answer);
      if (isCorrect) score++;
      report.push({
        question: q.question,
        selected: response ? response.answer : "No Answer",
        correct: q.answer,
        is_correct: isCorrect
      });
    });
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('final-score').innerText = `${score} / ${totalQuestions}`;
    displayReport(report);
    // Set up PDF download button
    document.getElementById('download-pdf').addEventListener('click', function() {
      generatePDFReport(userData.name, score, totalQuestions, report);
    });
  }, 2000);
}

// Display report card on the webpage
function displayReport(report) {
  const reportDiv = document.getElementById('report-card');
  reportDiv.innerHTML = "";
  report.forEach((item, index) => {
    const p = document.createElement('p');
    p.innerHTML = `<strong>Q${index+1}:</strong> ${item.question}<br>
                   <strong>Your Answer:</strong> ${item.selected}<br>
                   <strong>Correct Answer:</strong> ${item.correct}<br>
                   <strong>Result:</strong> ${item.is_correct ? "Correct" : "Incorrect"}<br><hr>`;
    reportDiv.appendChild(p);
  });
}

// Generate PDF report using jsPDF
function generatePDFReport(userName, score, total, report) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Quiz Report Card", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Name: ${userName}`, 20, 40);
  doc.text(`Score: ${score} / ${total}`, 20, 50);
  let yOffset = 60;
  report.forEach((item, index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`Q${index+1}: ${item.question}`, 20, yOffset);
    yOffset += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Your Answer: ${item.selected}`, 20, yOffset);
    yOffset += 10;
    doc.text(`Correct Answer: ${item.correct}`, 20, yOffset);
    yOffset += 10;
    doc.text(`Result: ${item.is_correct ? "Correct" : "Incorrect"}`, 20, yOffset);
    yOffset += 15;
    // Add new page if yOffset exceeds page height
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
  });
  doc.save(`report_${userName.replace(/ /g, "_")}.pdf`);
}

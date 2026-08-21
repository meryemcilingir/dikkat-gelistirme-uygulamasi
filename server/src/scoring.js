// Deneme sayısına göre puanlama: 1.deneme=10, 2.deneme=7, 3.deneme=5, 4+=3, çözülemedi=0
function scoreForAttempt(attemptCount, isCorrect) {
    if (!isCorrect) return 0;
    if (attemptCount <= 1) return 10;
    if (attemptCount === 2) return 7;
    if (attemptCount === 3) return 5;
    return 3;
}

module.exports = { scoreForAttempt };

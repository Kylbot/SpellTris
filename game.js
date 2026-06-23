// SpellTris - The Word-Building Tetris Game
// Core Game Logic, Physics, Word Detection, and Web Audio Synth

// --- GAME CONFIG & CONSTANTS ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // pixels

// Colors for tetrominoes (Neon theme)
const COLORS = {
    'I': '#00f0ff', // Cyan
    'O': '#ff0077', // Magenta
    'T': '#a020f0', // Purple
    'S': '#05ff85', // Green
    'Z': '#ff2a2a', // Red
    'J': '#ffb700', // Gold/Yellow
    'L': '#ff7700'  // Orange
};

const TETROMINOES = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'O': [
        [1, 1],
        [1, 1]
    ],
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'S': [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    'Z': [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    'J': [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// Scrabble tile distribution for letter bag
const TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2, 'I': 9, 
    'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2, 'Q': 1, 'R': 6, 
    'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
const RARE_LETTERS = new Set(['J', 'Q', 'X', 'Z', 'K']);

// --- DOM ELEMENTS ---
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');

const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const wordsVal = document.getElementById('words-val');
const highScoreVal = document.getElementById('high-score-val');

const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const finalScoreSpan = document.getElementById('final-score');
const finalWordsSpan = document.getElementById('final-words');

const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');

const audioToggleBtn = document.getElementById('audio-toggle-btn');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');
const pauseToggleBtn = document.getElementById('pause-toggle-btn');
const pauseIcon = document.getElementById('pause-icon');
const playIcon = document.getElementById('play-icon');

const wordsLogList = document.getElementById('words-log-list');
const wordsLogEmpty = document.getElementById('words-log-empty');
const wordAlert = document.getElementById('word-alert');
const alertWordText = document.getElementById('alert-word-text');
const alertWordPoints = document.getElementById('alert-word-points');

// --- GAME STATE ---
let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let score = 0;
let highScore = parseInt(localStorage.getItem('spelltris_high_score')) || 0;
let level = 1;
let wordsFoundCount = 0;
let linesClearedCount = 0;
let letterBag = [];
let currentPiece = null;
let nextPiece = null;
let heldPiece = null;
let hasHeld = false;
let gameState = 'START'; // START, PLAYING, PAUSED, ANIMATING, GAMEOVER
let isMuted = false;
let dropCounter = 0;
let dropInterval = 1000; // ms
let lastTime = 0;
let comboCount = 0;
let particles = [];
let clearingWords = []; // Coordinates of cells being cleared
let clearingRowsSet = new Set(); // Row indices being cleared

// Audio Context (initialized on first click)
let audioCtx = null;

// --- AUDIO SYNTHESIZER ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(freqs, type = 'sine', duration = 0.1, gainStart = 0.1, ramp = true) {
    if (isMuted) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    try {
        const now = audioCtx.currentTime;
        const mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(gainStart, now);
        if (ramp) {
            mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        } else {
            mainGain.gain.linearRampToValueAtTime(0.0001, now + duration);
        }
        mainGain.connect(audioCtx.destination);
        
        freqs.forEach(freq => {
            const osc = audioCtx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(mainGain);
            osc.start(now);
            osc.stop(now + duration);
        });
    } catch (e) {
        console.error("Audio playback error:", e);
    }
}

function playMoveSound() {
    playSound([150], 'triangle', 0.05, 0.15);
}

function playRotateSound() {
    playSound([220, 330], 'sine', 0.08, 0.1);
}

function playHoldSound() {
    playSound([260, 180], 'sine', 0.12, 0.1);
}

function playLandSound() {
    playSound([80], 'triangle', 0.15, 0.25, false);
}

function playWordClearedSound(combo) {
    // Play a rising chord progression based on combo
    const baseChords = [
        [261.63, 329.63, 392.00], // C4 major
        [329.63, 392.00, 493.88], // E4 minor/major7 sound
        [392.00, 493.88, 587.33], // G4 major
        [523.25, 659.25, 783.99, 1046.50] // C5 major with high C
    ];
    const chord = baseChords[Math.min(combo, baseChords.length - 1)];
    playSound(chord, 'sine', 0.5, 0.15);
}

function playGameOverSound() {
    // Play a sad descending scale
    if (isMuted) return;
    initAudio();
    const now = audioCtx.currentTime;
    
    const scale = [196.00, 155.56, 130.81]; // G3, Eb3, C3
    scale.forEach((freq, idx) => {
        setTimeout(() => {
            playSound([freq], 'sawtooth', 0.25, 0.1);
        }, idx * 250);
    });
}

// --- LETTER BAG SYSTEM ---
function refillLetterBag() {
    letterBag = [];
    for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
        for (let i = 0; i < count; i++) {
            letterBag.push(letter);
        }
    }
    // Shuffle the bag
    for (let i = letterBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letterBag[i], letterBag[j]] = [letterBag[j], letterBag[i]];
    }
}

function drawLetter() {
    if (letterBag.length === 0) {
        refillLetterBag();
    }
    return letterBag.pop();
}

function generatePieceLetters() {
    const letters = [];
    let vowelCount = 0;
    let rareCount = 0;
    
    // Draw 4 letters
    for (let i = 0; i < 4; i++) {
        let letter = drawLetter();
        
        // Count vowels and rares
        if (VOWELS.has(letter)) vowelCount++;
        if (RARE_LETTERS.has(letter)) rareCount++;
        
        letters.push(letter);
    }
    
    // Vowel Guarantee: Ensure at least 1 vowel is present
    if (vowelCount === 0) {
        const vowelArray = Array.from(VOWELS);
        const randomVowel = vowelArray[Math.floor(Math.random() * vowelArray.length)];
        // Replace a non-rare letter or random letter with a vowel
        const replaceIdx = letters.findIndex(l => !RARE_LETTERS.has(l)) !== -1 ? 
                           letters.findIndex(l => !RARE_LETTERS.has(l)) : 0;
        letters[replaceIdx] = randomVowel;
    }
    
    // Rare Limit Guarantee: Ensure at most 1 rare letter
    if (rareCount > 1) {
        let replacedRare = false;
        for (let i = 0; i < letters.length; i++) {
            if (RARE_LETTERS.has(letters[i])) {
                if (replacedRare) {
                    // Replace extra rare letter with a common consonant
                    const commonConsonants = ['T', 'R', 'S', 'N', 'L', 'D'];
                    letters[i] = commonConsonants[Math.floor(Math.random() * commonConsonants.length)];
                } else {
                    replacedRare = true; // Keep the first rare letter
                }
            }
        }
    }
    
    return letters;
}

// --- TETROMINO CREATION & ROTATION ---
function createPiece(type) {
    const shape = TETROMINOES[type];
    const letters = generatePieceLetters();
    let letterIdx = 0;
    const color = COLORS[type];
    
    // Map the 4 letters to the shape cells
    const matrix = shape.map(row => 
        row.map(cell => {
            if (cell === 1) {
                return {
                    letter: letters[letterIdx++],
                    color: color
                };
            }
            return null;
        })
    );
    
    return {
        type: type,
        matrix: matrix,
        color: color,
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: type === 'I' ? -2 : -1 // Start slightly offscreen
    };
}

function rotatePieceClockwise(matrix) {
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            rotated[c][N - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

// --- COLLISION & GRID MERGING ---
function checkCollision(matrix, px, py) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== null) {
                const boardX = px + c;
                const boardY = py + r;
                
                if (boardX < 0 || boardX >= COLS) {
                    return true;
                }
                
                if (boardY >= ROWS) {
                    return true;
                }
                
                if (boardY >= 0) {
                    if (grid[boardY][boardX] !== null) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function mergePiece() {
    for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== null) {
                const boardY = currentPiece.y + r;
                const boardX = currentPiece.x + c;
                if (boardY >= 0) {
                    grid[boardY][boardX] = {
                        letter: currentPiece.matrix[r][c].letter,
                        color: currentPiece.color,
                        highlight: false
                    };
                }
            }
        }
    }
}

// --- WORD SCANNING ENGINE ---
function scanForWords() {
    const foundWords = [];
    const rowsToClear = new Set();
    
    // 1. Horizontal Scan
    for (let y = 0; y < ROWS; y++) {
        // Find contiguous segments of blocks in the row
        let x = 0;
        while (x < COLS) {
            if (grid[y][x] !== null) {
                let start = x;
                while (x < COLS && grid[y][x] !== null) {
                    x++;
                }
                let end = x - 1;
                let runLen = end - start + 1;
                
                // If run length is at least 4, check all substrings of length 4 to 6
                if (runLen >= 4) {
                    for (let len = 4; len <= 6; len++) {
                        if (len <= runLen) {
                            for (let i = 0; i <= runLen - len; i++) {
                                const wordStartX = start + i;
                                const wordEndX = wordStartX + len - 1;
                                
                                // Extract word
                                let wordArr = [];
                                for (let col = wordStartX; col <= wordEndX; col++) {
                                    wordArr.push(grid[y][col].letter);
                                }
                                
                                const wordForward = wordArr.join('');
                                const wordBackward = [...wordArr].reverse().join('');
                                
                                if (DICTIONARY.has(wordForward)) {
                                    foundWords.push({
                                        word: wordForward,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: wordStartX + idx, y: y })),
                                        direction: 'horizontal',
                                        row: y
                                    });
                                    rowsToClear.add(y);
                                }
                                if (DICTIONARY.has(wordBackward) && wordForward !== wordBackward) {
                                    foundWords.push({
                                        word: wordBackward,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: wordStartX + idx, y: y })),
                                        direction: 'horizontal',
                                        row: y
                                    });
                                    rowsToClear.add(y);
                                }
                            }
                        }
                    }
                }
            } else {
                x++;
            }
        }
    }
    
    // 2. Vertical Scan
    for (let x = 0; x < COLS; x++) {
        // Find contiguous segments of blocks in the column
        let y = 0;
        while (y < ROWS) {
            if (grid[y][x] !== null) {
                let start = y;
                while (y < ROWS && grid[y][x] !== null) {
                    y++;
                }
                let end = y - 1;
                let runLen = end - start + 1;
                
                // If run length is at least 4, check all substrings of length 4 to 6
                if (runLen >= 4) {
                    for (let len = 4; len <= 6; len++) {
                        if (len <= runLen) {
                            for (let i = 0; i <= runLen - len; i++) {
                                const wordStartY = start + i;
                                const wordEndY = wordStartY + len - 1;
                                
                                // Extract word
                                let wordArr = [];
                                for (let row = wordStartY; row <= wordEndY; row++) {
                                    wordArr.push(grid[row][x].letter);
                                }
                                
                                const wordForward = wordArr.join('');
                                const wordBackward = [...wordArr].reverse().join('');
                                
                                if (DICTIONARY.has(wordForward)) {
                                    foundWords.push({
                                        word: wordForward,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: x, y: wordStartY + idx })),
                                        direction: 'vertical'
                                    });
                                    for (let r = wordStartY; r <= wordEndY; r++) {
                                        rowsToClear.add(r);
                                    }
                                }
                                if (DICTIONARY.has(wordBackward) && wordForward !== wordBackward) {
                                    foundWords.push({
                                        word: wordBackward,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: x, y: wordStartY + idx })),
                                        direction: 'vertical'
                                    });
                                    for (let r = wordStartY; r <= wordEndY; r++) {
                                        rowsToClear.add(r);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                y++;
            }
        }
    }
    
    return { foundWords, rowsToClear };
}

// --- CLEARING & CASCADE ENGINE ---
function processTurnEnd() {
    const { foundWords, rowsToClear } = scanForWords();
    
    if (foundWords.length > 0) {
        // Words found! Transition to ANIMATING state
        gameState = 'ANIMATING';
        clearingRowsSet = rowsToClear;
        
        // Mark all word cells for highlight animation
        clearingWords = [];
        foundWords.forEach(w => {
            clearingWords.push(w);
            w.cells.forEach(cell => {
                if (grid[cell.y][cell.x]) {
                    grid[cell.y][cell.x].highlight = true;
                }
            });
        });
        
        // Play success chime
        playWordClearedSound(comboCount);
        
        // Spawn particles at word blocks
        foundWords.forEach(w => {
            w.cells.forEach(cell => {
                const px = cell.x * BLOCK_SIZE + BLOCK_SIZE / 2;
                const py = cell.y * BLOCK_SIZE + BLOCK_SIZE / 2;
                const blockColor = grid[cell.y][cell.x] ? grid[cell.y][cell.x].color : COLORS['J'];
                spawnParticles(px, py, blockColor);
            });
        });
        
        // Display toast alerts for all words found
        displayWordAlerts(foundWords);
        
        // Trigger actual row removal after highlight delay
        setTimeout(() => {
            clearRowsAndDropBlocks();
        }, 600);
    } else {
        // No words found, spawn next piece
        comboCount = 0;
        gameState = 'PLAYING';
        spawnNextPiece();
    }
}

function clearRowsAndDropBlocks() {
    // 1. Calculate Score
    let pointsThisTurn = 0;
    let wordCountThisTurn = 0;
    
    clearingWords.forEach(wordObj => {
        const len = wordObj.word.length;
        let baseScore = 100;
        if (len === 5) baseScore = 250;
        if (len === 6) baseScore = 500;
        
        // Apply combo multiplier
        pointsThisTurn += baseScore * (1 + comboCount);
        wordCountThisTurn++;
        
        // Add to dictionary log
        addWordToLog(wordObj.word, baseScore * (1 + comboCount));
    });
    
    // Add row clear bonus (50 pts per row cleared)
    pointsThisTurn += clearingRowsSet.size * 50;
    score += pointsThisTurn;
    wordsFoundCount += wordCountThisTurn;
    linesClearedCount += clearingRowsSet.size;
    
    // Level Up logic: level increases every 5 rows cleared
    const newLevel = Math.floor(linesClearedCount / 5) + 1;
    if (newLevel > level) {
        level = newLevel;
        // Increase speed: decrease drop interval
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
    
    updateHUD();
    
    // 2. Perform grid manipulation (row deletion and falling)
    // Sort rows from top to bottom
    const sortedRows = Array.from(clearingRowsSet).sort((a, b) => a - b);
    
    sortedRows.forEach(rowIndex => {
        // Remove the row
        grid.splice(rowIndex, 1);
        // Prepend a new empty row at the top
        grid.unshift(Array(COLS).fill(null));
    });
    
    // Clear variables
    clearingWords = [];
    clearingRowsSet.clear();
    
    // Increment combo for cascade
    comboCount++;
    
    // 3. Scan again! Dropping blocks could form new words
    setTimeout(() => {
        processTurnEnd();
    }, 150);
}

// --- PARTICLE SYSTEM ---
function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 1, // slight bias upwards
            color: color,
            alpha: 1.0,
            size: Math.random() * 3 + 2,
            decay: Math.random() * 0.02 + 0.015
        });
    }
}

function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// --- HUD & UI UPDATES ---
function updateHUD() {
    scoreVal.textContent = score.toString().padStart(6, '0');
    levelVal.textContent = level;
    wordsVal.textContent = wordsFoundCount;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spelltris_high_score', highScore);
    }
    highScoreVal.textContent = highScore.toString().padStart(6, '0');
}

function addWordToLog(word, points) {
    // Hide placeholder
    wordsLogEmpty.classList.add('hidden');
    
    const li = document.createElement('li');
    li.innerHTML = `
        <span class="word-name">${word.toLowerCase()}</span>
        <span class="word-score">+${points}</span>
    `;
    
    // Add to list and scroll to top/bottom
    wordsLogList.insertBefore(li, wordsLogList.firstChild);
}

function displayWordAlerts(words) {
    if (words.length === 0) return;
    
    // If multiple words, combine their texts
    const totalPoints = words.reduce((sum, w) => {
        const len = w.word.length;
        let baseScore = 100;
        if (len === 5) baseScore = 250;
        if (len === 6) baseScore = 500;
        return sum + (baseScore * (1 + comboCount));
    }, 0);
    
    const wordListText = words.map(w => w.word).join(' & ');
    
    alertWordText.textContent = wordListText.toLowerCase();
    alertWordPoints.textContent = `+${totalPoints} PTS ${comboCount > 0 ? `(COMBO x${comboCount + 1})` : ''}`;
    
    wordAlert.classList.add('active');
    
    // Hide alert after 1.5 seconds
    setTimeout(() => {
        wordAlert.classList.remove('active');
    }, 1500);
}

// --- GAME LOOP MECHANICS ---
function spawnNextPiece() {
    hasHeld = false;
    
    if (nextPiece === null) {
        const keys = Object.keys(TETROMINOES);
        const randType = keys[Math.floor(Math.random() * keys.length)];
        nextPiece = createPiece(randType);
    }
    
    currentPiece = nextPiece;
    
    const keys = Object.keys(TETROMINOES);
    const randType = keys[Math.floor(Math.random() * keys.length)];
    nextPiece = createPiece(randType);
    
    // Check game over
    if (checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
        gameOver();
    }
    
    drawNext();
}

function holdCurrentPiece() {
    if (gameState !== 'PLAYING' || hasHeld) return;
    
    playHoldSound();
    
    const currentType = currentPiece.type;
    
    if (heldPiece === null) {
        // First hold of the game
        heldPiece = createPiece(currentType);
        spawnNextPiece();
    } else {
        // Swap with already held piece
        const temp = heldPiece;
        heldPiece = createPiece(currentType);
        currentPiece = temp;
        // Reset position of swapped piece
        currentPiece.x = Math.floor((COLS - currentPiece.matrix[0].length) / 2);
        currentPiece.y = currentPiece.type === 'I' ? -2 : -1;
    }
    
    hasHeld = true;
    drawHold();
}

function playerMove(dir) {
    if (gameState !== 'PLAYING') return;
    
    currentPiece.x += dir;
    if (checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
        currentPiece.x -= dir;
    } else {
        playMoveSound();
    }
}

function playerRotate() {
    if (gameState !== 'PLAYING') return;
    
    const oldMatrix = currentPiece.matrix;
    const rotated = rotatePieceClockwise(currentPiece.matrix);
    
    // Try rotate in place
    currentPiece.matrix = rotated;
    
    // Simple wall kick checks
    const kicks = [0, -1, 1, -2, 2];
    let successfulKick = false;
    
    for (const offset of kicks) {
        currentPiece.x += offset;
        if (!checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
            successfulKick = true;
            playRotateSound();
            break;
        }
        currentPiece.x -= offset; // revert
    }
    
    if (!successfulKick) {
        currentPiece.matrix = oldMatrix; // restore old rotation if all kicks fail
    }
}

function playerDrop() {
    if (gameState !== 'PLAYING') return;
    
    currentPiece.y++;
    if (checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
        currentPiece.y--;
        lockPiece();
    } else {
        dropCounter = 0; // Reset auto-drop timer on manual soft drop
    }
}

function playerHardDrop() {
    if (gameState !== 'PLAYING') return;
    
    let droppedRows = 0;
    while (!checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        droppedRows++;
    }
    
    lockPiece();
}

function lockPiece() {
    mergePiece();
    playLandSound();
    
    // Check for word clearances
    processTurnEnd();
}

// --- RENDER DRAWS ---
function drawBlock(ctx, x, y, letterInfo, size = BLOCK_SIZE) {
    if (!letterInfo) return;
    
    const px = x * size;
    const py = y * size;
    
    ctx.save();
    
    // Main fill gradient
    const grad = ctx.createLinearGradient(px, py, px + size, py + size);
    if (letterInfo.highlight) {
        // Clear Flash effect
        const pulse = (Date.now() % 300) < 150 ? '#ffffff' : '#ffd700';
        grad.addColorStop(0, pulse);
        grad.addColorStop(1, '#ff8800');
    } else {
        grad.addColorStop(0, letterInfo.color);
        grad.addColorStop(1, adjustColorBrightness(letterInfo.color, -50));
    }
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = letterInfo.highlight ? '#ffffff' : adjustColorBrightness(letterInfo.color, 40);
    ctx.lineWidth = letterInfo.highlight ? 3 : 2;
    
    // Neon glow effect for glowing pieces
    ctx.shadowBlur = letterInfo.highlight ? 15 : 6;
    ctx.shadowColor = letterInfo.highlight ? '#ffffff' : letterInfo.color;
    
    // Round block corners slightly
    roundRect(ctx, px + 2, py + 2, size - 4, size - 4, 5, true, true);
    
    // Draw Letter Text
    ctx.shadowBlur = 0; // disable shadow for text sharpness
    ctx.fillStyle = letterInfo.highlight ? '#000000' : '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.65)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letterInfo.letter.toLowerCase(), px + size / 2, py + size / 2);
    
    ctx.restore();
}

function drawBoard() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // 1. Draw Grid Gridlines
    gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    gameCtx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
        gameCtx.beginPath();
        gameCtx.moveTo(c * BLOCK_SIZE, 0);
        gameCtx.lineTo(c * BLOCK_SIZE, gameCanvas.height);
        gameCtx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        gameCtx.beginPath();
        gameCtx.moveTo(0, r * BLOCK_SIZE);
        gameCtx.lineTo(gameCanvas.width, r * BLOCK_SIZE);
        gameCtx.stroke();
    }
    
    // 2. Draw Locked Grid Cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== null) {
                drawBlock(gameCtx, c, r, grid[r][c]);
            }
        }
    }
    
    // 3. Draw Ghost Piece (Drop Prediction)
    if (gameState === 'PLAYING' && currentPiece) {
        let ghostY = currentPiece.y;
        while (!checkCollision(currentPiece.matrix, currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        
        gameCtx.save();
        gameCtx.globalAlpha = 0.15; // semi-transparent
        for (let r = 0; r < currentPiece.matrix.length; r++) {
            for (let c = 0; c < currentPiece.matrix[r].length; c++) {
                if (currentPiece.matrix[r][c] !== null) {
                    drawBlock(gameCtx, currentPiece.x + c, ghostY + r, currentPiece.matrix[r][c]);
                }
            }
        }
        gameCtx.restore();
    }
    
    // 4. Draw Falling Current Piece
    if (gameState === 'PLAYING' && currentPiece) {
        for (let r = 0; r < currentPiece.matrix.length; r++) {
            for (let c = 0; c < currentPiece.matrix[r].length; c++) {
                if (currentPiece.matrix[r][c] !== null) {
                    drawBlock(gameCtx, currentPiece.x + c, currentPiece.y + r, currentPiece.matrix[r][c]);
                }
            }
        }
    }
    
    // 5. Draw Particles
    updateAndDrawParticles(gameCtx);
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    
    const mat = nextPiece.matrix;
    // Calculate bounds to center piece
    const bounds = getPieceBounds(mat);
    const size = 20; // smaller blocks for previews
    const offsetX = (nextCanvas.width - bounds.width * size) / 2 - bounds.minX * size;
    const offsetY = (nextCanvas.height - bounds.height * size) / 2 - bounds.minY * size;
    
    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] !== null) {
                nextCtx.save();
                nextCtx.translate(offsetX, offsetY);
                drawBlock(nextCtx, c, r, mat[r][c], size);
                nextCtx.restore();
            }
        }
    }
}

function drawHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!heldPiece) return;
    
    const mat = heldPiece.matrix;
    const bounds = getPieceBounds(mat);
    const size = 20;
    const offsetX = (holdCanvas.width - bounds.width * size) / 2 - bounds.minX * size;
    const offsetY = (holdCanvas.height - bounds.height * size) / 2 - bounds.minY * size;
    
    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] !== null) {
                holdCtx.save();
                holdCtx.translate(offsetX, offsetY);
                
                // If already held in this turn, draw slightly faded to indicate lock
                if (hasHeld) {
                    holdCtx.globalAlpha = 0.5;
                }
                
                drawBlock(holdCtx, c, r, mat[r][c], size);
                holdCtx.restore();
            }
        }
    }
}

// --- UTILITIES FOR DRAWING ---
function getPieceBounds(matrix) {
    let minX = matrix.length, maxX = -1, minY = matrix.length, maxY = -1;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== null) {
                if (c < minX) minX = c;
                if (c > maxX) maxX = c;
                if (r < minY) minY = r;
                if (r > maxY) maxY = r;
            }
        }
    }
    return {
        minX, maxX, minY, maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

// --- GAME FLOW ---
function startGame() {
    initAudio();
    
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    level = 1;
    wordsFoundCount = 0;
    linesClearedCount = 0;
    dropInterval = 1000;
    comboCount = 0;
    particles = [];
    heldPiece = null;
    currentPiece = null;
    nextPiece = null;
    
    // Clear list
    wordsLogList.innerHTML = '';
    wordsLogEmpty.classList.remove('hidden');
    
    refillLetterBag();
    updateHUD();
    
    spawnNextPiece();
    gameState = 'PLAYING';
    
    startScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    gameoverScreen.classList.remove('active');
    
    // Start RAF loop
    lastTime = performance.now();
    requestAnimationFrame(updateLoop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    playGameOverSound();
    
    finalScoreSpan.textContent = score;
    finalWordsSpan.textContent = wordsFoundCount;
    gameoverScreen.classList.add('active');
}

function pauseGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    pauseScreen.classList.add('active');
    pauseIcon.classList.add('hidden');
    playIcon.classList.remove('hidden');
}

function resumeGame() {
    if (gameState !== 'PAUSED') return;
    gameState = 'PLAYING';
    pauseScreen.classList.remove('active');
    pauseIcon.classList.remove('hidden');
    playIcon.classList.add('hidden');
    
    lastTime = performance.now();
    requestAnimationFrame(updateLoop);
}

function togglePause() {
    if (gameState === 'PLAYING') {
        pauseGame();
    } else if (gameState === 'PAUSED') {
        resumeGame();
    }
}

function toggleAudio() {
    isMuted = !isMuted;
    if (isMuted) {
        soundIconOn.classList.add('hidden');
        soundIconOff.classList.remove('hidden');
    } else {
        soundIconOn.classList.remove('hidden');
        soundIconOff.classList.add('hidden');
    }
}

// --- MAIN LOOP ---
function updateLoop(time = 0) {
    if (gameState !== 'PLAYING' && gameState !== 'ANIMATING') return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (gameState === 'PLAYING') {
        dropCounter += deltaTime;
        if (dropCounter >= dropInterval) {
            currentPiece.y++;
            if (checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
                currentPiece.y--;
                lockPiece();
            }
            dropCounter = 0;
        }
    }
    
    // Always draw board (updates animations, ghost piece, current piece, particles)
    drawBoard();
    
    requestAnimationFrame(updateLoop);
}

// --- CONTROLS INPUT HANDLING ---
const KEY_MAP = {
    'ArrowLeft': () => playerMove(-1),
    'KeyA': () => playerMove(-1),
    'ArrowRight': () => playerMove(1),
    'KeyD': () => playerMove(1),
    'ArrowDown': () => playerDrop(),
    'KeyS': () => playerDrop(),
    'ArrowUp': () => playerRotate(),
    'KeyW': () => playerRotate(),
    'Space': () => playerHardDrop(),
    'ShiftLeft': () => holdCurrentPiece(),
    'ShiftRight': () => holdCurrentPiece(),
    'KeyC': () => holdCurrentPiece(),
    'KeyP': () => togglePause(),
    'Escape': () => togglePause()
};

document.addEventListener('keydown', event => {
    // Prevent scrolling and default browser actions for game controls (like space/enter triggering button clicks)
    if (['ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(event.code)) {
        event.preventDefault();
    }
    
    if (KEY_MAP[event.code]) {
        KEY_MAP[event.code]();
    }
});

// --- UI BUTTON LISTENERS ---
startBtn.addEventListener('click', () => {
    startGame();
});

resumeBtn.addEventListener('click', () => {
    resumeGame();
});

restartBtn.addEventListener('click', () => {
    startGame();
});

audioToggleBtn.addEventListener('click', () => {
    toggleAudio();
});

pauseToggleBtn.addEventListener('click', () => {
    togglePause();
});

// Blur buttons after click or focus to prevent Space/Enter from triggering them
document.querySelectorAll('button, .cyber-btn, .icon-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.blur());
    btn.addEventListener('focus', () => btn.blur());
});

// --- INITIALIZE DISPLAY ---
// Set initial high score label
highScoreVal.textContent = highScore.toString().padStart(6, '0');
// Draw empty canvases
gameCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
nextCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
holdCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

// SpellTris Monte Carlo Simulator & AI Solver
// Headless Game Engine, AI Heuristics, Charts, and Live Batch Simulation

// --- SIMULATOR CONFIG & CONSTANTS ---
const ROWS = 20;

// Tetromino definitions
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

const COLORS = {
    'I': '#00f0ff', 'O': '#ff0077', 'T': '#a020f0', 
    'S': '#05ff85', 'Z': '#ff2a2a', 'J': '#ffb700', 'L': '#ff7700'
};

const VOWEL_LIST = ['A', 'E', 'I', 'O', 'U', 'Y'];
const CONSONANT_LIST = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'];

const VOWEL_WEIGHTS = { 'A': 9, 'E': 12, 'I': 9, 'O': 8, 'U': 4, 'Y': 2 };
const CONSONANT_WEIGHTS = {
    'B': 2, 'C': 2, 'D': 4, 'F': 2, 'G': 3, 'H': 2, 'J': 1, 'K': 1, 'L': 4, 
    'M': 2, 'N': 6, 'P': 2, 'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'V': 2, 'W': 2, 'X': 1, 'Z': 1
};

// --- DOM ELEMENTS ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

// Sliders and controls
const weightHoleInput = document.getElementById('weight-hole');
const weightHoleVal = document.getElementById('weight-hole-val');
const weightBumpInput = document.getElementById('weight-bump');
const weightBumpVal = document.getElementById('weight-bump-val');
const weightHeightInput = document.getElementById('weight-height');
const weightHeightVal = document.getElementById('weight-height-val');
const weightWordInput = document.getElementById('weight-word');
const weightWordVal = document.getElementById('weight-word-val');
const lookaheadInput = document.getElementById('ai-lookahead');

const paramWidthInput = document.getElementById('param-width');
const paramWidthVal = document.getElementById('param-width-val');
const paramVowelInput = document.getElementById('param-vowel');
const paramVowelVal = document.getElementById('param-vowel-val');
const paramVowelGuarInput = document.getElementById('param-vowel-guar');
const paramVowelGuarVal = document.getElementById('param-vowel-guar-val');

const simSpeedInput = document.getElementById('sim-speed');
const simSpeedVal = document.getElementById('sim-speed-val');
const simBatchInput = document.getElementById('sim-batch');
const simBatchVal = document.getElementById('sim-batch-val');

const presetSpaceBtn = document.getElementById('preset-spacesaver');
const presetWordBtn = document.getElementById('preset-wordhunter');
const presetBalancedBtn = document.getElementById('preset-balanced');

const simRunBtn = document.getElementById('sim-run-btn');
const simStopBtn = document.getElementById('sim-stop-btn');

// Stats and Outputs
const statCompleted = document.getElementById('stat-completed');
const statAvgScore = document.getElementById('stat-avg-score');
const statAvgMoves = document.getElementById('stat-avg-moves');
const statAvgWords = document.getElementById('stat-avg-words');
const statMaxMoves = document.getElementById('stat-max-moves');
const simTerminal = document.getElementById('sim-terminal');

const chartSurvivalCanvas = document.getElementById('chart-survival');
const chartWordsCanvas = document.getElementById('chart-words');

// --- SIMULATOR STATE ---
let simBoardWidth = 10;
let simVowelRatio = 45; // percentage of vowels in bag
let simVowelGuarantee = 1; // min vowels per tetromino
let simBatchSize = 10;
let simSpeed = 20; // delay in ms

let aiWeights = {
    hole: -8.0,
    bump: -1.5,
    height: -1.0,
    word: 0.0,
    lookahead: true
};

// Monte Carlo Trials Data
let trialsResults = []; // stores { score, moves, wordsCount, wordLengths }
let currentTrialIndex = 0;
let currentTrialMoves = 0;
let currentTrialScore = 0;
let currentTrialWordsCount = 0;
let currentTrialWordLengths = { 4: 0, 5: 0, 6: 0 };

let isSimRunning = false;
let simIntervalId = null;

// Live game state for visualization
let simGrid = [];
let simLetterBag = [];
let currentPiece = null;
let nextPiece = null;
let blockPixelSize = 30; // updated based on board width

// --- PRESET MAPPINGS ---
const PRESETS = {
    spacesaver: { hole: -8.0, bump: -1.5, height: -1.0, word: 0.0, lookahead: true },
    wordhunter: { hole: -2.5, bump: -0.3, height: -0.2, word: 15.0, lookahead: true },
    balanced:   { hole: -6.0, bump: -1.0, height: -0.8, word: 5.0,  lookahead: true }
};

function applyPreset(presetName) {
    const config = PRESETS[presetName];
    if (!config) return;
    
    weightHoleInput.value = config.hole;
    weightHoleVal.textContent = config.hole.toFixed(1);
    
    weightBumpInput.value = config.bump;
    weightBumpVal.textContent = config.bump.toFixed(1);
    
    weightHeightInput.value = config.height;
    weightHeightVal.textContent = config.height.toFixed(1);
    
    weightWordInput.value = config.word;
    weightWordVal.textContent = config.word.toFixed(1);
    
    lookaheadInput.checked = config.lookahead;
    
    aiWeights = { ...config };
    
    // Toggle active classes
    [presetSpaceBtn, presetWordBtn, presetBalancedBtn].forEach(btn => btn.classList.remove('active'));
    if (presetName === 'spacesaver') presetSpaceBtn.classList.add('active');
    if (presetName === 'wordhunter') presetWordBtn.classList.add('active');
    if (presetName === 'balanced') presetBalancedBtn.classList.add('active');
}

// --- INITIALIZE SLIDER EVENT LISTENERS ---
weightHoleInput.addEventListener('input', (e) => {
    aiWeights.hole = parseFloat(e.target.value);
    weightHoleVal.textContent = aiWeights.hole.toFixed(1);
    presetSpaceBtn.classList.remove('active');
    presetWordBtn.classList.remove('active');
    presetBalancedBtn.classList.remove('active');
});
weightBumpInput.addEventListener('input', (e) => {
    aiWeights.bump = parseFloat(e.target.value);
    weightBumpVal.textContent = aiWeights.bump.toFixed(1);
    presetSpaceBtn.classList.remove('active');
    presetWordBtn.classList.remove('active');
    presetBalancedBtn.classList.remove('active');
});
weightHeightInput.addEventListener('input', (e) => {
    aiWeights.height = parseFloat(e.target.value);
    weightHeightVal.textContent = aiWeights.height.toFixed(1);
    presetSpaceBtn.classList.remove('active');
    presetWordBtn.classList.remove('active');
    presetBalancedBtn.classList.remove('active');
});
weightWordInput.addEventListener('input', (e) => {
    aiWeights.word = parseFloat(e.target.value);
    weightWordVal.textContent = aiWeights.word.toFixed(1);
    presetSpaceBtn.classList.remove('active');
    presetWordBtn.classList.remove('active');
    presetBalancedBtn.classList.remove('active');
});
lookaheadInput.addEventListener('change', (e) => {
    aiWeights.lookahead = e.target.checked;
});

paramWidthInput.addEventListener('input', (e) => {
    simBoardWidth = parseInt(e.target.value);
    paramWidthVal.textContent = simBoardWidth;
    adjustCanvasSize();
});
paramVowelInput.addEventListener('input', (e) => {
    simVowelRatio = parseInt(e.target.value);
    paramVowelVal.textContent = simVowelRatio + '%';
});
paramVowelGuarInput.addEventListener('input', (e) => {
    simVowelGuarantee = parseInt(e.target.value);
    paramVowelGuarVal.textContent = simVowelGuarantee + ' Vowel' + (simVowelGuarantee !== 1 ? 's' : '');
});

simSpeedInput.addEventListener('input', (e) => {
    simSpeed = parseInt(e.target.value);
    if (simSpeed === 0) {
        simSpeedVal.textContent = "Instant (Hyper)";
    } else {
        simSpeedVal.textContent = `Fast (${simSpeed}ms)`;
    }
    // If running, restart the interval with the new speed
    if (isSimRunning && simSpeed > 0) {
        clearInterval(simIntervalId);
        simIntervalId = setInterval(simulationTick, simSpeed);
    }
});
simBatchInput.addEventListener('input', (e) => {
    simBatchSize = parseInt(e.target.value);
    simBatchVal.textContent = simBatchSize + " Games";
});

presetSpaceBtn.addEventListener('click', () => applyPreset('spacesaver'));
presetWordBtn.addEventListener('click', () => applyPreset('wordhunter'));
presetBalancedBtn.addEventListener('click', () => applyPreset('balanced'));

// --- DYNAMIC LETTER BAG GENERATOR ---
function createSimLetterBag() {
    simLetterBag = [];
    
    // Total vowels and consonants weight sums
    const totalVowelWeight = VOWEL_LIST.reduce((sum, v) => sum + VOWEL_WEIGHTS[v], 0);
    const totalConsonantWeight = CONSONANT_LIST.reduce((sum, c) => sum + CONSONANT_WEIGHTS[c], 0);
    
    // We construct a bag of 100 tiles based on the vowel ratio
    const vowelCount = Math.round(simVowelRatio);
    const consonantCount = 100 - vowelCount;
    
    // Draw Vowels
    for (let i = 0; i < vowelCount; i++) {
        let randVal = Math.random() * totalVowelWeight;
        let cumulative = 0;
        for (const vowel of VOWEL_LIST) {
            cumulative += VOWEL_WEIGHTS[vowel];
            if (randVal <= cumulative) {
                simLetterBag.push(vowel);
                break;
            }
        }
    }
    
    // Draw Consonants
    for (let i = 0; i < consonantCount; i++) {
        let randVal = Math.random() * totalConsonantWeight;
        let cumulative = 0;
        for (const consonant of CONSONANT_LIST) {
            cumulative += CONSONANT_WEIGHTS[consonant];
            if (randVal <= cumulative) {
                simLetterBag.push(consonant);
                break;
            }
        }
    }
    
    // Shuffle
    for (let i = simLetterBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [simLetterBag[i], simLetterBag[j]] = [simLetterBag[j], simLetterBag[i]];
    }
}

function drawSimLetter() {
    if (simLetterBag.length === 0) {
        createSimLetterBag();
    }
    return simLetterBag.pop();
}

function generateSimPieceLetters() {
    const letters = [];
    let vowelCount = 0;
    
    for (let i = 0; i < 4; i++) {
        let letter = drawSimLetter();
        if (VOWEL_LIST.includes(letter)) vowelCount++;
        letters.push(letter);
    }
    
    // Apply Vowel Guarantee
    if (vowelCount < simVowelGuarantee) {
        const vowelsNeeded = simVowelGuarantee - vowelCount;
        let vowelIndex = 0;
        for (let i = 0; i < letters.length; i++) {
            if (!VOWEL_LIST.includes(letters[i])) {
                // Replace consonant with random vowel
                letters[i] = VOWEL_LIST[Math.floor(Math.random() * VOWEL_LIST.length)];
                vowelIndex++;
                if (vowelIndex >= vowelsNeeded) break;
            }
        }
    }
    
    return letters;
}

// --- HEADLESS SIMULATION ENGINE ---
function createSimPiece(type) {
    const shape = TETROMINOES[type];
    const letters = generateSimPieceLetters();
    let letterIdx = 0;
    
    const matrix = shape.map(row => 
        row.map(cell => {
            if (cell === 1) {
                return {
                    letter: letters[letterIdx++],
                    color: COLORS[type]
                };
            }
            return null;
        })
    );
    
    return {
        type: type,
        matrix: matrix,
        color: COLORS[type],
        x: Math.floor((simBoardWidth - matrix[0].length) / 2),
        y: type === 'I' ? -2 : -1
    };
}

function rotateMatrixClockwise(matrix) {
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            rotated[c][N - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

function checkCollisionSim(gridBoard, matrix, px, py, boardWidth) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== null) {
                const boardX = px + c;
                const boardY = py + r;
                
                if (boardX < 0 || boardX >= boardWidth) return true;
                if (boardY >= ROWS) return true;
                
                if (boardY >= 0) {
                    if (gridBoard[boardY][boardX] !== null) return true;
                }
            }
        }
    }
    return false;
}

function copyGrid(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

// --- OPTIMIZED LOCALIZED WORD SCANNER ---
// Checks words only in columns and rows that have changed, drastically increasing speed.
function scanForWordsSim(board, boardWidth) {
    const foundWords = [];
    const rowsToClear = new Set();
    
    // 1. Horizontal Scan
    for (let y = 0; y < ROWS; y++) {
        let x = 0;
        while (x < boardWidth) {
            if (board[y][x] !== null) {
                let start = x;
                while (x < boardWidth && board[y][x] !== null) {
                    x++;
                }
                let end = x - 1;
                let runLen = end - start + 1;
                
                if (runLen >= 4) {
                    for (let len = 4; len <= 6; len++) {
                        if (len <= runLen) {
                            for (let i = 0; i <= runLen - len; i++) {
                                const wordStartX = start + i;
                                const wordEndX = wordStartX + len - 1;
                                
                                let wordArr = [];
                                for (let col = wordStartX; col <= wordEndX; col++) {
                                    wordArr.push(board[y][col].letter);
                                }
                                
                                const wordForward = wordArr.join('');
                                const wordBackward = [...wordArr].reverse().join('');
                                
                                if (DICTIONARY.has(wordForward)) {
                                    foundWords.push({ 
                                        word: wordForward, 
                                        length: len,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: wordStartX + idx, y: y }))
                                    });
                                    rowsToClear.add(y);
                                }
                                if (DICTIONARY.has(wordBackward) && wordForward !== wordBackward) {
                                    foundWords.push({ 
                                        word: wordBackward, 
                                        length: len,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: wordStartX + idx, y: y }))
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
    for (let x = 0; x < boardWidth; x++) {
        let y = 0;
        while (y < ROWS) {
            if (board[y][x] !== null) {
                let start = y;
                while (y < ROWS && board[y][x] !== null) {
                    y++;
                }
                let end = y - 1;
                let runLen = end - start + 1;
                
                if (runLen >= 4) {
                    for (let len = 4; len <= 6; len++) {
                        if (len <= runLen) {
                            for (let i = 0; i <= runLen - len; i++) {
                                const wordStartY = start + i;
                                const wordEndY = wordStartY + len - 1;
                                
                                let wordArr = [];
                                for (let row = wordStartY; row <= wordEndY; row++) {
                                    wordArr.push(board[row][x].letter);
                                }
                                
                                const wordForward = wordArr.join('');
                                const wordBackward = [...wordArr].reverse().join('');
                                
                                if (DICTIONARY.has(wordForward)) {
                                    foundWords.push({ 
                                        word: wordForward, 
                                        length: len,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: x, y: wordStartY + idx }))
                                    });
                                    for (let r = wordStartY; r <= wordEndY; r++) rowsToClear.add(r);
                                }
                                if (DICTIONARY.has(wordBackward) && wordForward !== wordBackward) {
                                    foundWords.push({ 
                                        word: wordBackward, 
                                        length: len,
                                        cells: Array.from({ length: len }, (_, idx) => ({ x: x, y: wordStartY + idx }))
                                    });
                                    for (let r = wordStartY; r <= wordEndY; r++) rowsToClear.add(r);
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

// Simulates clear and returns points earned and new grid state
function simulateClearCascade(board, boardWidth) {
    let scoreEarned = 0;
    let wordsSpelled = [];
    let localCombo = 0;
    let gridCopy = copyGrid(board);
    
    while (true) {
        const { foundWords, rowsToClear } = scanForWordsSim(gridCopy, boardWidth);
        if (foundWords.length === 0) break;
        
        foundWords.forEach(w => {
            wordsSpelled.push(w);
            let base = w.length === 4 ? 100 : (w.length === 5 ? 250 : 500);
            scoreEarned += base * (1 + localCombo);
        });
        
        scoreEarned += rowsToClear.size * 50;
        
        // Remove rows
        const sortedRows = Array.from(rowsToClear).sort((a, b) => a - b);
        sortedRows.forEach(rowIndex => {
            gridCopy.splice(rowIndex, 1);
            gridCopy.unshift(Array(boardWidth).fill(null));
        });
        
        localCombo++;
        if (localCombo > 10) break; // Infinite safety break
    }
    
    return { grid: gridCopy, score: scoreEarned, words: wordsSpelled };
}

// --- AI SOLVER EVALUATOR ---
function getColumnHeights(board, boardWidth) {
    const heights = Array(boardWidth).fill(0);
    for (let c = 0; c < boardWidth; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c] !== null) {
                heights[c] = ROWS - r;
                break;
            }
        }
    }
    return heights;
}

function countHoles(board, boardWidth) {
    let holes = 0;
    for (let c = 0; c < boardWidth; c++) {
        let blockFound = false;
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c] !== null) {
                blockFound = true;
            } else if (blockFound && board[r][c] === null) {
                holes++;
            }
        }
    }
    return holes;
}

function countClosedSpaces(board, boardWidth) {
    // A more advanced hole heuristic: count completely walled-off cavities
    let closedSpaces = 0;
    for (let c = 0; c < boardWidth; c++) {
        let blockFound = false;
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c] !== null) {
                blockFound = true;
            } else if (blockFound && board[r][c] === null) {
                // Check if this hole is sealed (e.g. has blocks above it, and perhaps left/right limits)
                closedSpaces++;
            }
        }
    }
    return closedSpaces;
}

function getBumpiness(heights) {
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i+1]);
    }
    return bumpiness;
}

function evaluateGrid(board, wordsScore, boardWidth) {
    const heights = getColumnHeights(board, boardWidth);
    const holes = countHoles(board, boardWidth);
    const bumpiness = getBumpiness(heights);
    const maxHeight = Math.max(...heights);
    
    // Heuristic Score Calculation
    return (aiWeights.hole * holes) + 
           (aiWeights.bump * bumpiness) + 
           (aiWeights.height * maxHeight) + 
           (aiWeights.word * wordsScore);
}

// Finds the optimal placement (1-step solver)
function evaluateAllMoves(board, piece, boardWidth) {
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Try all rotations
    let rotMatrix = piece.matrix;
    const maxRotations = piece.type === 'O' ? 1 : (['I', 'S', 'Z'].includes(piece.type) ? 2 : 4);
    
    for (let r = 0; r < maxRotations; r++) {
        if (r > 0) {
            rotMatrix = rotateMatrixClockwise(rotMatrix);
        }
        
        const pieceWidth = rotMatrix[0].length;
        
        // Try all columns
        for (let x = 0; x <= boardWidth - pieceWidth; x++) {
            // Find drop row
            let y = -1;
            while (!checkCollisionSim(board, rotMatrix, x, y + 1, boardWidth)) {
                y++;
            }
            
            // If it lands completely offscreen, invalid move (blocks overflow)
            if (y < 0) continue;
            
            // Simulate landing
            const tempBoard = copyGrid(board);
            for (let pr = 0; pr < rotMatrix.length; pr++) {
                for (let pc = 0; pc < rotMatrix[pr].length; pc++) {
                    if (rotMatrix[pr][pc] !== null) {
                        const targetY = y + pr;
                        const targetX = x + pc;
                        if (targetY >= 0) {
                            tempBoard[targetY][targetX] = {
                                letter: rotMatrix[pr][pc].letter,
                                color: piece.color
                            };
                        }
                    }
                }
            }
            
            // Simulate word clearance
            const clearResult = simulateClearCascade(tempBoard, boardWidth);
            
            // Evaluate grid
            const moveScore = evaluateGrid(clearResult.grid, clearResult.score, boardWidth);
            
            if (moveScore > bestScore) {
                bestScore = moveScore;
                bestMove = {
                    x: x,
                    rotationCount: r,
                    matrix: rotMatrix,
                    y: y,
                    score: moveScore,
                    gridBefore: tempBoard,
                    gridAfter: clearResult.grid,
                    wordsScore: clearResult.score,
                    wordsSpelled: clearResult.words
                };
            }
        }
    }
    
    return bestMove;
}

// Finds best move with 2-step lookahead
function getBestMoveLookahead(board, current, next, boardWidth) {
    let bestFirstMove = null;
    let bestTotalScore = -Infinity;
    
    // 1. Get first-level placements
    let rotMatrix1 = current.matrix;
    const maxRotations1 = current.type === 'O' ? 1 : (['I', 'S', 'Z'].includes(current.type) ? 2 : 4);
    
    for (let r1 = 0; r1 < maxRotations1; r1++) {
        if (r1 > 0) rotMatrix1 = rotateMatrixClockwise(rotMatrix1);
        
        const w1 = rotMatrix1[0].length;
        for (let x1 = 0; x1 <= boardWidth - w1; x1++) {
            let y1 = -1;
            while (!checkCollisionSim(board, rotMatrix1, x1, y1 + 1, boardWidth)) {
                y1++;
            }
            
            if (y1 < 0) continue;
            
            // Merge first piece
            const tempBoard1 = copyGrid(board);
            for (let pr = 0; pr < rotMatrix1.length; pr++) {
                for (let pc = 0; pc < rotMatrix1[pr].length; pc++) {
                    if (rotMatrix1[pr][pc] !== null) {
                        if (y1 + pr >= 0) {
                            tempBoard1[y1 + pr][x1 + pc] = {
                                letter: rotMatrix1[pr][pc].letter,
                                color: current.color
                            };
                        }
                    }
                }
            }
            
            const clearRes1 = simulateClearCascade(tempBoard1, boardWidth);
            
            // 2. Evaluate next piece options on resulting board (1-step evaluate)
            const secondMove = evaluateAllMoves(clearRes1.grid, next, boardWidth);
            
            let totalMoveScore = 0;
            if (secondMove) {
                // Combine scores: First move immediate evaluation + Second move evaluation
                const score1 = evaluateGrid(clearRes1.grid, clearRes1.score, boardWidth);
                totalMoveScore = score1 + secondMove.score;
            } else {
                // Next piece overflows (death state), strongly penalize this path
                totalMoveScore = -999999;
            }
            
            if (totalMoveScore > bestTotalScore) {
                bestTotalScore = totalMoveScore;
                bestFirstMove = {
                    x: x1,
                    rotationCount: r1,
                    matrix: rotMatrix1,
                    y: y1,
                    score: totalMoveScore,
                    gridBefore: tempBoard1,
                    gridAfter: clearRes1.grid,
                    wordsScore: clearRes1.score,
                    wordsSpelled: clearRes1.words
                };
            }
        }
    }
    
    // Fallback to 1-step solver if lookahead fails to find anything
    if (!bestFirstMove) {
        return evaluateAllMoves(board, current, boardWidth);
    }
    
    return bestFirstMove;
}

// --- VISUAL RENDERING ---
function adjustCanvasSize() {
    blockPixelSize = Math.floor(300 / simBoardWidth);
    canvas.width = simBoardWidth * blockPixelSize;
    canvas.height = ROWS * blockPixelSize;
}

function drawSimBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= simBoardWidth; c++) {
        ctx.beginPath();
        ctx.moveTo(c * blockPixelSize, 0);
        ctx.lineTo(c * blockPixelSize, canvas.height);
        ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * blockPixelSize);
        ctx.lineTo(canvas.width, r * blockPixelSize);
        ctx.stroke();
    }
    
    // Draw grid cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < simBoardWidth; c++) {
            if (simGrid[r][c] !== null) {
                drawBlock(c, r, simGrid[r][c]);
            }
        }
    }
}

function drawBlock(x, y, blockInfo) {
    const px = x * blockPixelSize;
    const py = y * blockPixelSize;
    
    ctx.save();
    const grad = ctx.createLinearGradient(px, py, px + blockPixelSize, py + blockPixelSize);
    if (blockInfo.highlight) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#ffd700');
    } else {
        grad.addColorStop(0, blockInfo.color);
        grad.addColorStop(1, adjustColorBrightness(blockInfo.color, -50));
    }
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = blockInfo.highlight ? '#ffffff' : adjustColorBrightness(blockInfo.color, 30);
    ctx.lineWidth = blockInfo.highlight ? 2 : 1;
    ctx.shadowBlur = blockInfo.highlight ? 10 : 4;
    ctx.shadowColor = blockInfo.highlight ? '#ffd700' : blockInfo.color;
    
    // Rounded block
    roundRect(ctx, px + 1, py + 1, blockPixelSize - 2, blockPixelSize - 2, 4, true, true);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = blockInfo.highlight ? '#000000' : '#ffffff';
    ctx.font = `bold ${Math.round(blockPixelSize * 0.55)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blockInfo.letter.toLowerCase(), px + blockPixelSize / 2, py + blockPixelSize / 2);
    ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = Math.min(255, Math.max(0, R));
    G = Math.min(255, Math.max(0, G));
    B = Math.min(255, Math.max(0, B));
    return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

// --- MONTE CARLO STATS & CHARTS DRAWING ---
function updateHUD() {
    statCompleted.textContent = `${trialsResults.length} / ${simBatchSize}`;
    
    if (trialsResults.length > 0) {
        const scores = trialsResults.map(r => r.score);
        const moves = trialsResults.map(r => r.moves);
        const words = trialsResults.map(r => r.wordsCount);
        
        const avgScore = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
        const avgMoves = Math.round(moves.reduce((a,b) => a+b, 0) / moves.length);
        const avgWords = (words.reduce((a,b) => a+b, 0) / words.length).toFixed(1);
        const maxMoves = Math.max(...moves);
        
        statAvgScore.textContent = avgScore.toLocaleString();
        statAvgMoves.textContent = avgMoves.toLocaleString();
        statAvgWords.textContent = avgWords;
        statMaxMoves.textContent = maxMoves.toLocaleString();
    } else {
        statAvgScore.textContent = '0';
        statAvgMoves.textContent = '0';
        statAvgWords.textContent = '0';
        statMaxMoves.textContent = '0';
    }
}

function logToTerminal(msg) {
    // Hide placeholder
    const placeholder = simTerminal.querySelector('.terminal-log-empty');
    if (placeholder) placeholder.remove();
    
    const div = document.createElement('div');
    div.textContent = msg;
    simTerminal.appendChild(div);
    simTerminal.scrollTop = simTerminal.scrollHeight;
}

// Render statistical graphs on HTML5 Canvases
function drawCharts() {
    drawSurvivalChart();
    drawWordDistributionChart();
}

function drawSurvivalChart() {
    const sCtx = chartSurvivalCanvas.getContext('2d');
    sCtx.clearRect(0, 0, chartSurvivalCanvas.width, chartSurvivalCanvas.height);
    
    if (trialsResults.length === 0) return;
    
    const w = chartSurvivalCanvas.width;
    const h = chartSurvivalCanvas.height;
    
    // Draw background grid lines
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    sCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const yCoord = (h - 10) * (i / 4) + 5;
        sCtx.beginPath();
        sCtx.moveTo(0, yCoord);
        sCtx.lineTo(w, yCoord);
        sCtx.stroke();
    }
    
    const moves = trialsResults.map(r => r.moves);
    const maxMoves = Math.max(...moves, 50); // floor of 50 for scale
    const avgMoves = moves.reduce((a,b) => a+b, 0) / moves.length;
    
    // Plot Line
    sCtx.strokeStyle = '#00f0ff';
    sCtx.lineWidth = 2.5;
    sCtx.shadowBlur = 6;
    sCtx.shadowColor = '#00f0ff';
    sCtx.beginPath();
    
    const pointsCount = moves.length;
    for (let i = 0; i < pointsCount; i++) {
        // Distribute points horizontally
        const xPos = pointsCount > 1 ? (w - 20) * (i / (pointsCount - 1)) + 10 : w / 2;
        // Map Y position (inverted because Canvas Y=0 is at top)
        const yPos = h - ((moves[i] / maxMoves) * (h - 20) + 10);
        
        if (i === 0) {
            sCtx.moveTo(xPos, yPos);
        } else {
            sCtx.lineTo(xPos, yPos);
        }
    }
    sCtx.stroke();
    sCtx.shadowBlur = 0; // reset
    
    // Plot points
    sCtx.fillStyle = '#ffffff';
    for (let i = 0; i < pointsCount; i++) {
        const xPos = pointsCount > 1 ? (w - 20) * (i / (pointsCount - 1)) + 10 : w / 2;
        const yPos = h - ((moves[i] / maxMoves) * (h - 20) + 10);
        sCtx.beginPath();
        sCtx.arc(xPos, yPos, 3, 0, Math.PI * 2);
        sCtx.fill();
    }
    
    // Draw Running Average line (Dashed)
    sCtx.strokeStyle = '#ffb700';
    sCtx.lineWidth = 1.5;
    sCtx.setLineDash([4, 4]);
    sCtx.beginPath();
    const avgY = h - ((avgMoves / maxMoves) * (h - 20) + 10);
    sCtx.moveTo(0, avgY);
    sCtx.lineTo(w, avgY);
    sCtx.stroke();
    sCtx.setLineDash([]); // reset
    
    // Average Label
    sCtx.fillStyle = '#ffb700';
    sCtx.font = '9px Orbitron';
    sCtx.fillText(`avg: ${Math.round(avgMoves)}`, 5, avgY - 4);
}

function drawWordDistributionChart() {
    const wCtx = chartWordsCanvas.getContext('2d');
    wCtx.clearRect(0, 0, chartWordsCanvas.width, chartWordsCanvas.height);
    
    const w = chartWordsCanvas.width;
    const h = chartWordsCanvas.height;
    
    // Aggregate word lengths
    let counts = { 4: 0, 5: 0, 6: 0 };
    trialsResults.forEach(r => {
        counts[4] += r.wordLengths[4];
        counts[5] += r.wordLengths[5];
        counts[6] += r.wordLengths[6];
    });
    
    const totalWords = counts[4] + counts[5] + counts[6];
    const maxVal = Math.max(counts[4], counts[5], counts[6], 1);
    
    const barWidth = 40;
    const spacing = 45;
    const startX = (w - (barWidth * 3 + spacing * 2)) / 2;
    
    const labels = ['4 letters', '5 letters', '6 letters'];
    const lengths = [4, 5, 6];
    const colors = ['#00f0ff', '#ffb700', '#ff0077'];
    
    for (let i = 0; i < 3; i++) {
        const len = lengths[i];
        const val = counts[len];
        const barHeight = (val / maxVal) * (h - 35);
        const x = startX + i * (barWidth + spacing);
        const y = h - 20 - barHeight;
        
        // Draw Bar
        wCtx.save();
        wCtx.fillStyle = colors[i];
        wCtx.shadowBlur = 8;
        wCtx.shadowColor = colors[i];
        
        roundRect(wCtx, x, y, barWidth, barHeight, 4, true, false);
        wCtx.restore();
        
        // Draw value text
        wCtx.fillStyle = '#ffffff';
        wCtx.font = 'bold 10px Inter';
        wCtx.textAlign = 'center';
        wCtx.fillText(val.toLocaleString(), x + barWidth / 2, y - 5);
        
        // Draw label text
        wCtx.fillStyle = '#94a3b8';
        wCtx.font = '9px Orbitron';
        wCtx.textAlign = 'center';
        wCtx.fillText(labels[i], x + barWidth / 2, h - 6);
    }
}

// --- SIMULATION ROUND FLOW ---
function startBatchSimulation() {
    if (isSimRunning) return;
    
    isSimRunning = true;
    trialsResults = [];
    currentTrialIndex = 1;
    
    // Update button states
    simRunBtn.disabled = true;
    simStopBtn.disabled = false;
    simRunBtn.textContent = "RUNNING...";
    
    startScreen.classList.remove('active');
    simTerminal.innerHTML = '';
    
    logToTerminal(`[SIM START] Running batch of ${simBatchSize} games...`);
    logToTerminal(`AI Config: Holes(${aiWeights.hole}), Bump(${aiWeights.bump}), Height(${aiWeights.height}), Words(${aiWeights.word}), Lookahead(${aiWeights.lookahead})`);
    logToTerminal(`Game Config: BoardWidth(${simBoardWidth}), VowelRatio(${simVowelRatio}%), Guarantee(${simVowelGuarantee})`);
    logToTerminal(`-------------------------------------------`);
    
    startNewTrial();
}

function stopSimulation() {
    if (!isSimRunning) return;
    
    isSimRunning = false;
    if (simIntervalId) clearInterval(simIntervalId);
    
    simRunBtn.disabled = false;
    simStopBtn.disabled = true;
    simRunBtn.textContent = "RUN BATCH";
    
    logToTerminal(`[SIM HALTED] Simulation aborted by user.`);
    updateHUD();
}

function startNewTrial() {
    // Reset virtual board
    simGrid = Array.from({ length: ROWS }, () => Array(simBoardWidth).fill(null));
    currentTrialMoves = 0;
    currentTrialScore = 0;
    currentTrialWordsCount = 0;
    currentTrialWordLengths = { 4: 0, 5: 0, 6: 0 };
    
    createSimLetterBag();
    
    // Setup initial pieces
    const keys = Object.keys(TETROMINOES);
    currentPiece = createSimPiece(keys[Math.floor(Math.random() * keys.length)]);
    nextPiece = createSimPiece(keys[Math.floor(Math.random() * keys.length)]);
    
    adjustCanvasSize();
    drawSimBoard();
    
    if (simSpeed === 0) {
        // Hyper Speed: Queue next tick immediately
        setTimeout(simulationTick, 0);
    } else {
        // Timer Speed: Tick game periodically
        simIntervalId = setInterval(simulationTick, simSpeed);
    }
}

function simulationTick() {
    if (!isSimRunning) return;
    
    // In hyper-speed (speed=0), run up to 15 moves in a single tick to yield to the browser
    const movesToRun = simSpeed === 0 ? 15 : 1;
    
    for (let m = 0; m < movesToRun; m++) {
        // Determine best placement using AI solver
        let bestPlacement = null;
        if (aiWeights.lookahead) {
            bestPlacement = getBestMoveLookahead(simGrid, currentPiece, nextPiece, simBoardWidth);
        } else {
            bestPlacement = evaluateAllMoves(simGrid, currentPiece, simBoardWidth);
        }
        
        if (!bestPlacement) {
            // Game Over! Stack hit ceiling
            trialCompleted();
            return;
        }
        
        // Execute placement
        simGrid = bestPlacement.gridAfter;
        currentTrialMoves++;
        currentTrialScore += bestPlacement.wordsScore;
        
        // Increment word counts
        bestPlacement.wordsSpelled.forEach(w => {
            currentTrialWordsCount++;
            currentTrialWordLengths[w.length] = (currentTrialWordLengths[w.length] || 0) + 1;
        });
        
        // Rotate and position piece for canvas visualization before dropping
        currentPiece.matrix = bestPlacement.matrix;
        currentPiece.x = bestPlacement.x;
        currentPiece.y = bestPlacement.y;
        
        // Optional Mode: Pause when a word is spelled to inspect
        const pauseOnWord = document.getElementById('sim-pause-on-word').checked;
        if (pauseOnWord && bestPlacement.wordsSpelled.length > 0) {
            // Show board before clearing with the word highlighted
            simGrid = bestPlacement.gridBefore;
            const scanRes = scanForWordsSim(simGrid, simBoardWidth);
            scanRes.foundWords.forEach(w => {
                if (w.cells) {
                    w.cells.forEach(cell => {
                        if (simGrid[cell.y][cell.x]) {
                            simGrid[cell.y][cell.x].highlight = true;
                        }
                    });
                }
            });
            drawSimBoard();
            
            // Revert internal state back to gridAfter for subsequent turns
            simGrid = bestPlacement.gridAfter;
            currentPiece = null; // hide active piece since it is merged
            
            stopSimulation();
            logToTerminal(`[PAUSED] Word spelled: ${bestPlacement.wordsSpelled.map(w => w.word).join(', ')}`);
            return;
        }
        
        // Safety cap to prevent runaway games on perfect AI parameters
        if (currentTrialMoves > 2500) {
            trialCompleted(true);
            return;
        }
        
        // Setup next pieces
        currentPiece = nextPiece;
        const keys = Object.keys(TETROMINOES);
        nextPiece = createSimPiece(keys[Math.floor(Math.random() * keys.length)]);
        
        // Collision check at spawn
        if (checkCollisionSim(simGrid, currentPiece.matrix, currentPiece.x, currentPiece.y, simBoardWidth)) {
            trialCompleted();
            return;
        }
    }
    
    // Draw the board showing where the piece landed
    drawSimBoard();
    
    // Queue next tick if running and speed is 0
    if (isSimRunning && simSpeed === 0) {
        setTimeout(simulationTick, 0);
    }
}

function trialCompleted(capped = false) {
    if (simIntervalId) clearInterval(simIntervalId);
    
    // Record results
    trialsResults.push({
        score: currentTrialScore,
        moves: currentTrialMoves,
        wordsCount: currentTrialWordsCount,
        wordLengths: { ...currentTrialWordLengths }
    });
    
    logToTerminal(`[Trial ${currentTrialIndex}/${simBatchSize}] Score: ${currentTrialScore} | Moves: ${currentTrialMoves}${capped ? ' (MAX)' : ''} | Words: ${currentTrialWordsCount} (4L:${currentTrialWordLengths[4]}, 5L:${currentTrialWordLengths[5]}, 6L:${currentTrialWordLengths[6]})`);
    
    // Update stats and charts in real-time
    updateHUD();
    drawCharts();
    
    if (currentTrialIndex < simBatchSize && isSimRunning) {
        currentTrialIndex++;
        // Start next trial
        setTimeout(startNewTrial, 20);
    } else {
        // Batch completed!
        isSimRunning = false;
        simRunBtn.disabled = false;
        simStopBtn.disabled = true;
        simRunBtn.textContent = "RUN BATCH";
        
        logToTerminal(`-------------------------------------------`);
        logToTerminal(`[SIM COMPLETE] Batch of ${simBatchSize} games finished!`);
        updateHUD();
        drawCharts();
    }
}

// --- INITIALIZE START SCREEN DRAW ---
adjustCanvasSize();
ctx.fillStyle = 'rgba(0,0,0,0.5)';
ctx.fillRect(0, 0, canvas.width, canvas.height);

startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    startBatchSimulation();
});

simRunBtn.addEventListener('click', () => {
    startBatchSimulation();
});

simStopBtn.addEventListener('click', () => {
    stopSimulation();
});

// Setup default preset
applyPreset('spacesaver');

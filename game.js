/**
 * =========================================================================
 *                           SPELLTRIS GAME ENGINE
 * =========================================================================
 * 
 * PROGRAM STRUCTURE:
 * 1. GAME CONFIG & CONSTANTS: Grid dimensions, block sizes, color definitions,
 *    and shaped piece matrices.
 * 2. AUDIO SYNTHESIZER: Web Audio API integration for real-time chord synthesis
 *    and sound effects (rotations, clearances, hold mechanics).
 * 3. LANGUAGE LEARNING DATA LAYOUT: Filtering vocabulary banks based on setup
 *    criteria, generating dictionaries, and rendering pre-game study guides.
 * 4. SPELLING DICTIONARY ENGINE: Frequencies extraction, letter bags generation,
 *    segment-based piece generation, and board-wide dictionary clearances.
 * 5. CORE GAMEPLAY INTERACTIVE SYSTEMS: Locking pieces, processing matches,
 *    triggering challenges (with hints and attempts), cascading dropping blocks,
 *    and checking Game Over constraints.
 * 6. USER INPUT & PIECE MANIPULATION: Game play action mappings (left/right/down/
 *    harddrop/rotate/hold), cyclic letter shifting, and letter mirroring.
 * 7. RENDER ENGINE: 2D Canvas rendering of board grids, glowing blocks, ghost projection
 *    ghost lines, visual feedback, hold/next preview panes, and scoring updates.
 * 8. GAME FLOW CONTROLLER: Game loops, pauses, resumptions, countdown overlays,
 *    main menu exits, and setup configurations.
 * 
 * FUNCTION SUMMARY AND PURPOSES:
 * - initAudio(): Initializes the Web Audio API context for sound synthesis.
 * - playSound(freqs, type, duration, gainStart, ramp): Synthesizes chords or beeps dynamically.
 * - playMoveSound(), playRotateSound(), playHoldSound(), playLandSound(): Gameplay sound helpers.
 * - playWordClearedSound(combo): Play special success chord progression scaled by combo multiplier.
 * - playGameOverSound(): Synthesizes a descending game-over melody.
 * - normalizeText(str): Standardizes strings for case/accent-insensitive comparisons.
 * - setupVocabulary(): Configures vocabulary filters and maps for selected languages.
 * - updateStudyGuide(): Generates and renders the list of active spelling dictionary words.
 * - refillLetterBag(): Constructs a pool of letters proportional to active dictionary frequencies.
 * - drawLetter(): Picks a letter from the letter bag, refilling it if empty.
 * - generatePieceLetters(): Extracts contiguous letter segments from dictionary words.
 * - createPiece(type): Spawns a tetromino object with styled letters and coordinates.
 * - rotatePieceClockwise(matrix): Rotates the block matrix clockwise.
 * - checkCollision(matrix, px, py): Verifies if a piece placement hits border boundaries or static blocks.
 * - mergePiece(): Seals the current falling piece into the permanent grid map.
 * - scanForWords(): Scans the grid horizontally and vertically for valid dictionary words.
 * - clearWordNormally(wordObj, rowsToClear): Directly clears rows for untranslated matches.
 * - processTurnEnd(): Handles cascading scans, clearing sequences, or triggers translation challenges.
 * - showChallengeHint(): Displays translation hint (first character and length).
 * - submitTranslation(): Validates challenge answers, deducts attempts, or schedules clearing/solidifying.
 * - clearRowsAndDropBlocks(): Computes scored values, clears filled grid rows, and cascades block cells.
 * - spawnParticles(x, y, color): Launches particle coordinates for cell explosion animations.
 * - updateAndDrawParticles(ctx): Drives physics and renders grid clearing explosions.
 * - updateHUD(): Updates HUD statistics (score, level, words count).
 * - addWordToLog(word, points): Appends successfully spelled words to the Dictionary Log.
 * - displayWordAlerts(words): Triggers incorrect alert toasts or neon points banners.
 * - spawnNextPiece(): Dequeues the next tetromino and updates current positions.
 * - holdCurrentPiece(): Places current piece in hold slot or swaps with already held piece.
 * - playerMove(dir), playerRotate(), playerDrop(), playerHardDrop(): Input key actions.
 * - lockPiece(): Locks piece, triggers landing chimes, and initializes cascade evaluations.
 * - shiftPieceLetters(): Cyclically rotates the sequence of letters within falling block cells.
 * - flipPieceLettersHorizontal(): Reverses the letter sequence layout horizontally inside the active block.
 * - startCountdown(callback): Intercepts resuming gameplay with a visual 3, 2, 1 overlay.
 * - quitToMenu(): Resets gameplay parameters and returns the viewport to the start screen.
 * - drawBlock(ctx, x, y, letterInfo, size): Renders a single neon-styled cell with its letter.
 * - drawBoard(): Renders the main board grid, locked blocks, active block, ghost piece, and particles.
 * - drawNext(), drawHold(): Renders the small preview panels for held and upcoming blocks.
 * - getPieceBounds(matrix): Computes bounding box dimensions of a piece matrix.
 * - roundRect(ctx, x, y, w, h, r): Helper to draw rounded rectangle shapes.
 * - adjustColorBrightness(hex, percent): Utility to blend color channels.
 * - startGame(): Resets grid metrics, configures language settings, and starts the gameplay loops.
 * - gameOver(): Transitions game loop state to GAMEOVER and reveals stats overlay.
 * - pauseGame(), resumeGame(), togglePause(), toggleAudio(): Controls state toggles.
 * - updateLoop(time): The primary game animation frame update dispatcher.
 * - handleLanguageChange(changedSelect): Validates select combinations.
 * =========================================================================
 */

// --- GAME CONFIG & CONSTANTS ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 35; // pixels

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

// --- LANGUAGE-SPECIFIC SCRABBLE TILE DISTRIBUTIONS & VOWELS ---
const LANG_TILE_DISTRIBUTIONS = {
    'en': {
        'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2, 'I': 9, 
        'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2, 'Q': 1, 'R': 6, 
        'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1
    },
    'es': {
        'A': 12, 'B': 2, 'C': 4, 'D': 5, 'E': 12, 'F': 1, 'G': 2, 'H': 2, 'I': 6, 
        'J': 1, 'L': 4, 'M': 2, 'N': 5, 'Ñ': 1, 'O': 9, 'P': 2, 'Q': 1, 'R': 5, 
        'S': 6, 'T': 4, 'U': 5, 'V': 1, 'X': 1, 'Y': 1, 'Z': 1
    },
    'de': {
        'A': 5, 'B': 2, 'C': 2, 'D': 4, 'E': 15, 'F': 2, 'G': 3, 'H': 4, 'I': 6, 
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 9, 'O': 3, 'P': 1, 'Q': 1, 'R': 6, 
        'S': 7, 'T': 6, 'U': 6, 'V': 1, 'W': 1, 'X': 1, 'Y': 1, 'Z': 1, 'Ä': 1, 'Ö': 1, 'Ü': 1
    }
};

const LANG_VOWELS = {
    'en': new Set(['A', 'E', 'I', 'O', 'U', 'Y']),
    'es': new Set(['A', 'E', 'I', 'O', 'U', 'Y']),
    'de': new Set(['A', 'E', 'I', 'O', 'U', 'Y', 'Ä', 'Ö', 'Ü'])
};

const LANG_RARE_LETTERS = {
    'en': new Set(['J', 'Q', 'X', 'Z', 'K']),
    'es': new Set(['J', 'Ñ', 'Q', 'X', 'Z']),
    'de': new Set(['J', 'Q', 'X', 'Y', 'Z'])
};

// --- LANGUAGE LEARNING GAME STATE ---
let langFrom = 'en';
let langTo = 'es';
let filterLevel = 'all';
let filterType = 'all';
let filterTheme = 'all';

let DICTIONARY = new Set();
let VOCAB_MAP = new Map();
let activeVowels = new Set();
let activeRares = new Set();
let currentChallengeWordObj = null;
let currentChallengeWord = '';
let challengeAttemptsLeft = 0;
let challengeWordCells = [];
let challengeRowsToClear = new Set();
const LANG_NAMES = { 'en': 'English', 'es': 'Spanish', 'de': 'German' };

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

// New DOM Elements
const pauseQuitBtn = document.getElementById('pause-quit-btn');
const gameoverQuitBtn = document.getElementById('gameover-quit-btn');
const countdownScreen = document.getElementById('countdown-screen');
const countdownText = document.getElementById('countdown-text');
const challengeLearnInfo = document.getElementById('challenge-learn-info');
const challengeLearnDefinition = document.getElementById('challenge-learn-definition');
const challengeLearnContinueBtn = document.getElementById('challenge-learn-continue-btn');
const challengeQuizForm = document.getElementById('challenge-quiz-form');
const challengeQuizButtons = document.getElementById('challenge-quiz-buttons');
const challengeAttempts = document.getElementById('challenge-attempts');
const challengeHintBox = document.getElementById('challenge-hint-box');
const challengeTitle = document.getElementById('challenge-title');
const challengeDesc = document.getElementById('challenge-desc');

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
let gameState = 'START'; // START, PLAYING, PAUSED, ANIMATING, GAMEOVER, CHALLENGING, COUNTDOWN
let spelledWordsSet = new Set(); // Track spelled words for Learning Mode
let learningMode = false;        // Track if Learning Mode is enabled
let challengeResolutionState = null; // 'LEARNING', 'SUCCESS', 'FAILURE'
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

// --- LANGUAGE LEARNING UTILITIES & SETUP ---
function normalizeText(str) {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    
    // Replace German/Spanish specific combinations first
    s = s.replace(/ß/g, 'ss');
    s = s.replace(/ä/g, 'a').replace(/ae/g, 'a');
    s = s.replace(/ö/g, 'o').replace(/oe/g, 'o');
    s = s.replace(/ü/g, 'u').replace(/ue/g, 'u');
    s = s.replace(/ñ/g, 'n');
    
    // Decompose other accents (like á, é, í, ó, ú, etc.)
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Replace double s with single s for tolerance (ss or s for ß)
    s = s.replace(/ss/g, 's');
    
    return s;
}

function setupVocabulary() {
    langFrom = document.getElementById('lang-from').value;
    langTo = document.getElementById('lang-to').value;
    filterLevel = document.getElementById('filter-level').value;
    filterType = document.getElementById('filter-type').value;
    filterTheme = document.getElementById('filter-theme').value;

    DICTIONARY.clear();
    VOCAB_MAP.clear();

    VOCABULARY.forEach(item => {
        if (filterLevel !== 'all' && item.level !== filterLevel) return;
        if (filterType !== 'all' && item.type !== filterType) return;
        if (filterTheme !== 'all' && item.theme !== filterTheme) return;

        const sourceWord = item[langFrom];
        const targetWord = item[langTo];

        if (!sourceWord || !targetWord) return;

        const sourceWordClean = sourceWord.trim().toLowerCase();
        const targetWordClean = targetWord.trim().toLowerCase();

        // Length restriction: spelling word must be between 2 and 8 letters
        if (sourceWordClean.length < 2 || sourceWordClean.length > 8) return;

        const sourceUpper = sourceWordClean.toUpperCase();
        DICTIONARY.add(sourceUpper);

        if (!VOCAB_MAP.has(sourceUpper)) {
            VOCAB_MAP.set(sourceUpper, []);
        }
        VOCAB_MAP.get(sourceUpper).push(targetWordClean);
    });

    // Populate active vowels and active rare letters dynamically from DICTIONARY
    const generalVowels = LANG_VOWELS[langFrom] || LANG_VOWELS['en'];
    const generalRares = LANG_RARE_LETTERS[langFrom] || LANG_RARE_LETTERS['en'];
    
    activeVowels.clear();
    activeRares.clear();
    
    DICTIONARY.forEach(word => {
        for (let i = 0; i < word.length; i++) {
            const letter = word[i].toUpperCase();
            if (generalVowels.has(letter)) {
                activeVowels.add(letter);
            }
            if (generalRares.has(letter)) {
                activeRares.add(letter);
            }
        }
    });

    console.log(`Setup vocabulary: Spelling in ${langFrom}, translating to ${langTo}. Active words: ${DICTIONARY.size}`);
}

function updateStudyGuide() {
    const fromLang = document.getElementById('lang-from').value;
    const toLang = document.getElementById('lang-to').value;
    const lvl = document.getElementById('filter-level').value;
    const typ = document.getElementById('filter-type').value;
    const thm = document.getElementById('filter-theme').value;
    
    const listEl = document.getElementById('study-guide-list');
    const countEl = document.getElementById('study-guide-count');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    let count = 0;
    VOCABULARY.forEach(item => {
        if (lvl !== 'all' && item.level !== lvl) return;
        if (typ !== 'all' && item.type !== typ) return;
        if (thm !== 'all' && item.theme !== thm) return;
        
        const src = item[fromLang];
        const tgt = item[toLang];
        if (!src || !tgt) return;
        
        const srcClean = src.trim().toLowerCase();
        if (srcClean.length < 2 || srcClean.length > 8) return;
        
        count++;
        const itemEl = document.createElement('div');
        itemEl.style.padding = '1px 3px';
        itemEl.style.borderBottom = '1px dashed rgba(255,255,255,0.04)';
        itemEl.style.whiteSpace = 'nowrap';
        itemEl.style.overflow = 'hidden';
        itemEl.style.textOverflow = 'ellipsis';
        itemEl.innerHTML = `<span style="color:#fff; font-weight:600;">${srcClean}</span> &rarr; <span style="color:var(--neon-cyan);">${tgt.trim().toLowerCase()}</span>`;
        listEl.appendChild(itemEl);
    });
    
    countEl.textContent = `${count} word${count !== 1 ? 's' : ''}`;
    
    if (count === 0) {
        listEl.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--neon-red); font-style: italic;">No matching words</div>';
    }
}

// --- LETTER BAG SYSTEM ---
function refillLetterBag() {
    letterBag = [];
    
    const frequencies = {};
    let totalLettersCount = 0;
    
    DICTIONARY.forEach(word => {
        for (let i = 0; i < word.length; i++) {
            const letter = word[i].toUpperCase();
            frequencies[letter] = (frequencies[letter] || 0) + 1;
            totalLettersCount++;
        }
    });
    
    if (totalLettersCount === 0) {
        // Fallback to standard distributions
        const dist = LANG_TILE_DISTRIBUTIONS[langFrom] || LANG_TILE_DISTRIBUTIONS['en'];
        for (const [letter, count] of Object.entries(dist)) {
            for (let i = 0; i < count; i++) {
                letterBag.push(letter);
            }
        }
    } else {
        // Populate bag based on frequency, ensuring at least 100 letters for good shuffling randomness
        const multiplier = Math.ceil(100 / totalLettersCount);
        for (const [letter, count] of Object.entries(frequencies)) {
            for (let i = 0; i < count * multiplier; i++) {
                letterBag.push(letter);
            }
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
    let letters = [];
    
    if (DICTIONARY.size > 0) {
        // Convert DICTIONARY Set to Array for random selection
        const dictArray = Array.from(DICTIONARY);
        const randomWord = dictArray[Math.floor(Math.random() * dictArray.length)]; // e.g. "SCHLANGE"
        
        if (randomWord.length === 4) {
            // Azul -> ['A', 'Z', 'U', 'L']
            letters = randomWord.split('');
        } else if (randomWord.length > 4) {
            // Pick a random 4-letter contiguous segment
            const maxStart = randomWord.length - 4;
            const startIdx = Math.floor(Math.random() * (maxStart + 1));
            letters = randomWord.substring(startIdx, startIdx + 4).split('');
        } else {
            // Word is shorter than 4 (2 or 3 letters)
            letters = randomWord.split('');
            // Fill remaining spots from the letter bag
            while (letters.length < 4) {
                letters.push(drawLetter());
            }
        }
        
        // Randomly reverse the letters with 30% chance to allow backward spelling variations
        if (Math.random() < 0.3) {
            letters.reverse();
        }
    } else {
        // Fallback: draw 4 letters from letter bag
        for (let i = 0; i < 4; i++) {
            letters.push(drawLetter());
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
                
                // If run length is at least 2, check all substrings of length 2 to 8
                if (runLen >= 2) {
                    for (let len = 2; len <= 8; len++) {
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
                
                // If run length is at least 2, check all substrings of length 2 to 8
                if (runLen >= 2) {
                    for (let len = 2; len <= 8; len++) {
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
function clearWordNormally(wordObj, rowsToClear) {
    gameState = 'ANIMATING';
    clearingRowsSet = rowsToClear;
    clearingWords = [wordObj];
    wordObj.cells.forEach(cell => {
        if (grid[cell.y][cell.x]) {
            grid[cell.y][cell.x].highlight = true;
        }
    });
    playWordClearedSound(comboCount);
    
    // Spawn particles
    wordObj.cells.forEach(cell => {
        const px = cell.x * BLOCK_SIZE + BLOCK_SIZE / 2;
        const py = cell.y * BLOCK_SIZE + BLOCK_SIZE / 2;
        const blockColor = grid[cell.y][cell.x] ? grid[cell.y][cell.x].color : COLORS['J'];
        spawnParticles(px, py, blockColor);
    });
    
    displayWordAlerts([wordObj]);
    
    setTimeout(() => {
        clearRowsAndDropBlocks();
    }, 600);
}

function processTurnEnd() {
    const { foundWords, rowsToClear } = scanForWords();
    
    if (foundWords.length > 0) {
        // Word(s) found! Transition to CHALLENGING state
        gameState = 'CHALLENGING';
        
        // Take the first found word to challenge
        const wordObj = foundWords[0];
        currentChallengeWordObj = wordObj;
        currentChallengeWord = wordObj.word;
        
        const targetTranslations = VOCAB_MAP.get(currentChallengeWord.toUpperCase());
        if (!targetTranslations || targetTranslations.length === 0) {
            console.warn(`Word ${currentChallengeWord} found but not in VOCAB_MAP`);
            clearWordNormally(wordObj, rowsToClear);
            return;
        }
        
        challengeAttemptsLeft = 2;
        challengeWordCells = wordObj.cells;
        
        const wordRowsToClear = new Set();
        if (wordObj.direction === 'horizontal') {
            wordRowsToClear.add(wordObj.row);
        } else {
            wordObj.cells.forEach(cell => wordRowsToClear.add(cell.y));
        }
        challengeRowsToClear = wordRowsToClear;
        
        // Highlight the cells of the challenged word in the grid
        challengeWordCells.forEach(cell => {
            if (grid[cell.y][cell.x]) {
                grid[cell.y][cell.x].highlight = true;
            }
        });
        
        // Populate and display challenge modal / learning mode card
        const isNewWordInLearningMode = learningMode && !spelledWordsSet.has(currentChallengeWord.toUpperCase());
        
        if (isNewWordInLearningMode) {
            challengeResolutionState = 'LEARNING';
            challengeTitle.textContent = "NEW WORD SPELLED!";
            challengeDesc.innerHTML = `Spelled "<span class="stat-highlight" style="font-family:'Orbitron',sans-serif; font-size:1.15rem;">${currentChallengeWord.toUpperCase()}</span>" (${LANG_NAMES[langFrom]}):`;
            
            challengeQuizForm.classList.add('hidden');
            challengeQuizButtons.classList.add('hidden');
            challengeAttempts.classList.add('hidden');
            challengeHintBox.classList.add('hidden');
            
            challengeLearnInfo.classList.remove('hidden');
            challengeLearnDefinition.textContent = targetTranslations[0] ? targetTranslations[0].toUpperCase() : '';
        } else {
            challengeResolutionState = null;
            challengeTitle.textContent = "TRANSLATE IT!";
            challengeDesc.innerHTML = `Translate "<span id="challenge-word-source" class="stat-highlight" style="font-family:'Orbitron',sans-serif; font-size:1.15rem;">${currentChallengeWord.toUpperCase()}</span>" into <span id="challenge-target-lang" class="stat-highlight" style="color:var(--neon-cyan)">${LANG_NAMES[langTo]}</span>:`;
            
            challengeQuizForm.classList.remove('hidden');
            challengeQuizButtons.classList.remove('hidden');
            challengeAttempts.classList.remove('hidden');
            
            challengeLearnInfo.classList.add('hidden');
            
            const inputEl = document.getElementById('challenge-input');
            inputEl.value = '';
            
            const feedbackEl = document.getElementById('challenge-feedback');
            feedbackEl.classList.add('hidden');
            feedbackEl.textContent = '';
            feedbackEl.className = 'challenge-feedback hidden';
            
            const attemptsCountEl = document.getElementById('challenge-attempts-count');
            attemptsCountEl.textContent = challengeAttemptsLeft;
            
            const hintBoxEl = document.getElementById('challenge-hint-box');
            hintBoxEl.classList.add('hidden');
        }
        
        document.getElementById('challenge-screen').classList.add('active');
        
        if (!isNewWordInLearningMode) {
            const inputEl = document.getElementById('challenge-input');
            inputEl.focus();
            setTimeout(() => {
                inputEl.focus();
            }, 10);
            setTimeout(() => {
                inputEl.focus();
            }, 50);
        }
        
        // Keep the render loop going
        lastTime = performance.now();
        requestAnimationFrame(updateLoop);
        
    } else {
        // No words found, spawn next piece
        comboCount = 0;
        gameState = 'PLAYING';
        spawnNextPiece();
    }
}

function showChallengeHint() {
    const hintBoxEl = document.getElementById('challenge-hint-box');
    const hintTextEl = document.getElementById('challenge-hint-text');

    const targetTranslations = VOCAB_MAP.get(currentChallengeWord.toUpperCase()) || [];
    if (targetTranslations.length === 0) return;

    const primaryTranslation = targetTranslations[0];
    const firstLetter = primaryTranslation.charAt(0).toUpperCase();
    const length = primaryTranslation.length;

    hintTextEl.textContent = `Starts with "${firstLetter}", length ${length}`;
    hintBoxEl.classList.remove('hidden');
}

function submitTranslation() {
    const inputEl = document.getElementById('challenge-input');
    const feedbackEl = document.getElementById('challenge-feedback');
    const attemptsCountEl = document.getElementById('challenge-attempts-count');

    const userVal = inputEl.value.trim();
    if (!userVal) return; // Don't submit empty values

    const normalizedUser = normalizeText(userVal);
    const targetTranslations = VOCAB_MAP.get(currentChallengeWord.toUpperCase()) || [];
    const isCorrect = targetTranslations.some(t => normalizeText(t) === normalizedUser);

    if (isCorrect) {
        // SUCCESS CASE: Show success confirmation card
        challengeResolutionState = 'SUCCESS';
        
        challengeTitle.textContent = "CORRECT!";
        challengeDesc.innerHTML = `"${currentChallengeWord.toUpperCase()}" translates to <span class="stat-highlight" style="color:var(--neon-green)">${userVal.toUpperCase()}</span>.`;
        
        challengeQuizForm.classList.add('hidden');
        challengeQuizButtons.classList.add('hidden');
        challengeAttempts.classList.add('hidden');
        challengeHintBox.classList.add('hidden');
        
        challengeLearnInfo.classList.remove('hidden');
        challengeLearnDefinition.textContent = "SUCCESS! WELL DONE.";
        
    } else {
        // INCORRECT CASE
        challengeAttemptsLeft--;
        attemptsCountEl.textContent = challengeAttemptsLeft;

        // Play buzzer / fail audio
        playSound([150, 100], 'sawtooth', 0.25, 0.15);

        if (challengeAttemptsLeft > 0) {
            // First failure: show feedback and reveal hint
            feedbackEl.textContent = "INCORRECT!";
            feedbackEl.className = "challenge-feedback incorrect";
            feedbackEl.classList.remove('hidden');

            showChallengeHint();
            
            // Focus input and select text for quick re-typing
            inputEl.focus();
            inputEl.select();
        } else {
            // Second failure: show correct answer card
            challengeResolutionState = 'FAILURE';
            
            challengeTitle.textContent = "FAILED!";
            challengeDesc.innerHTML = `No attempts left for "${currentChallengeWord.toUpperCase()}".`;
            
            challengeQuizForm.classList.add('hidden');
            challengeQuizButtons.classList.add('hidden');
            challengeAttempts.classList.add('hidden');
            challengeHintBox.classList.add('hidden');
            
            challengeLearnInfo.classList.remove('hidden');
            const correctTranslation = targetTranslations[0] || "";
            challengeLearnDefinition.textContent = `Correct translation: ${correctTranslation.toUpperCase()}`;
            
            // Show a red warning toast/alert with the correct answer
            alertWordText.textContent = `INCORRECT. ANSWER: ${correctTranslation.toUpperCase()}`;
            alertWordPoints.textContent = `NO POINTS - BLOCKS SOLIDIFIED`;
            wordAlert.style.background = 'rgba(255, 42, 42, 0.9)';
            wordAlert.style.border = '2px solid #ff2a2a';
            wordAlert.classList.add('active');

            setTimeout(() => {
                wordAlert.classList.remove('active');
                wordAlert.style.background = '';
                wordAlert.style.border = '';
            }, 2500);
        }
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
        dropInterval = Math.max(100, 1000 - (level - 1) * 50);
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
        const { foundWords } = scanForWords();
        if (foundWords.length > 0) {
            processTurnEnd();
        } else {
            // Cascade complete. Run countdown before resuming play
            startCountdown(() => {
                comboCount = 0;
                gameState = 'PLAYING';
                spawnNextPiece();
            });
        }
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
    
    const onlyEasy = document.getElementById('only-easy-pieces').checked;
    const piecePool = onlyEasy ? ['I', 'O'] : Object.keys(TETROMINOES);
    
    if (nextPiece === null) {
        const randType = piecePool[Math.floor(Math.random() * piecePool.length)];
        nextPiece = createPiece(randType);
    }
    
    currentPiece = nextPiece;
    
    const randType = piecePool[Math.floor(Math.random() * piecePool.length)];
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

function shiftPieceLetters() {
    if (gameState !== 'PLAYING' || !currentPiece) return;
    
    // Gather all occupied coordinates in row-major order
    const cells = [];
    for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== null) {
                cells.push({r, c, letter: currentPiece.matrix[r][c].letter});
            }
        }
    }
    
    if (cells.length < 2) return;
    
    // Shift letters cyclically forward (0 -> 1 -> 2 -> 3 -> 0)
    const lastLetter = cells[cells.length - 1].letter;
    for (let i = cells.length - 1; i > 0; i--) {
        cells[i].letter = cells[i - 1].letter;
    }
    cells[0].letter = lastLetter;
    
    // Apply changes back to matrix
    cells.forEach(cell => {
        currentPiece.matrix[cell.r][cell.c].letter = cell.letter;
    });
    
    // Play sound effect
    playSound([300], 'sine', 0.05, 0.08);
}

function flipPieceLettersHorizontal() {
    if (gameState !== 'PLAYING' || !currentPiece) return;
    
    // Gather all occupied coordinates in row-major order
    const cells = [];
    for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== null) {
                cells.push({r, c, letter: currentPiece.matrix[r][c].letter});
            }
        }
    }
    
    if (cells.length < 2) return;
    
    // Reverse the letters sequence
    const reversedLetters = cells.map(cell => cell.letter).reverse();
    
    // Put them back in reversed order (shape stays identical)
    cells.forEach((cell, idx) => {
        currentPiece.matrix[cell.r][cell.c].letter = reversedLetters[idx];
    });
    
    // Play sound effect
    playSound([260], 'sine', 0.05, 0.08);
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
    const size = 24; // smaller blocks for previews
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
    const size = 24;
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

function startCountdown(callback) {
    gameState = 'COUNTDOWN';
    countdownScreen.classList.add('active');
    let count = 1;
    countdownText.textContent = count;
    playSound([330], 'sine', 0.15, 0.1);
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.textContent = count;
            playSound([330], 'sine', 0.15, 0.1);
        } else {
            clearInterval(interval);
            countdownScreen.classList.remove('active');
            playSound([660], 'sine', 0.3, 0.1);
            callback();
        }
    }, 800);
}

function quitToMenu() {
    gameState = 'START';
    
    // Hide all overlays
    pauseScreen.classList.remove('active');
    gameoverScreen.classList.remove('active');
    document.getElementById('challenge-screen').classList.remove('active');
    countdownScreen.classList.remove('active');
    
    // Show start screen
    startScreen.classList.add('active');
    
    // Hide Spelling Bank
    document.getElementById('active-words-panel').classList.add('hidden');
    
    // Reset play/pause icon in hud
    pauseIcon.classList.remove('hidden');
    playIcon.classList.add('hidden');
    
    // Reset preview canvases
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    // Reset game canvas
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Redraw study guide
    updateStudyGuide();
}

function handleChallengeContinue() {
    document.getElementById('challenge-screen').classList.remove('active');
    
    if (challengeResolutionState === 'LEARNING' || challengeResolutionState === 'SUCCESS') {
        gameState = 'ANIMATING';
        
        clearingWords = [currentChallengeWordObj];
        clearingRowsSet = challengeRowsToClear;
        
        challengeWordCells.forEach(cell => {
            if (grid[cell.y][cell.x]) {
                grid[cell.y][cell.x].highlight = true;
            }
        });
        
        playWordClearedSound(comboCount);
        
        challengeWordCells.forEach(cell => {
            const px = cell.x * BLOCK_SIZE + BLOCK_SIZE / 2;
            const py = cell.y * BLOCK_SIZE + BLOCK_SIZE / 2;
            const blockColor = grid[cell.y][cell.x] ? grid[cell.y][cell.x].color : COLORS['J'];
            spawnParticles(px, py, blockColor);
        });
        
        displayWordAlerts([currentChallengeWordObj]);
        
        spelledWordsSet.add(currentChallengeWord.toUpperCase());
        
        setTimeout(() => {
            clearRowsAndDropBlocks();
        }, 600);
        
    } else if (challengeResolutionState === 'FAILURE') {
        challengeWordCells.forEach(cell => {
            if (grid[cell.y][cell.x]) {
                grid[cell.y][cell.x].highlight = false;
            }
        });
        
        startCountdown(() => {
            comboCount = 0;
            gameState = 'PLAYING';
            spawnNextPiece();
        });
    }
}

// --- GAME FLOW ---
function startGame() {
    initAudio();
    
    setupVocabulary();
    if (DICTIONARY.size === 0) {
        alert("No vocabulary words match your selected filters (Level, Word Type, Theme) and are between 2 and 8 letters in the spelling language. Please choose different settings.");
        startScreen.classList.add('active');
        return;
    }
    
    spelledWordsSet.clear();
    learningMode = document.getElementById('learning-mode').checked;
    
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
    
    // Populate active spelling bank list during play if option is checked
    const showSpellingBank = document.getElementById('show-spelling-bank').checked;
    const activeWordsPanel = document.getElementById('active-words-panel');
    const activeWordsList = document.getElementById('active-words-list');
    
    if (showSpellingBank) {
        activeWordsPanel.classList.remove('hidden');
        activeWordsList.innerHTML = '';
        Array.from(DICTIONARY).sort().forEach(word => {
            const li = document.createElement('li');
            li.textContent = word.toLowerCase();
            li.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
            li.style.padding = '2px';
            activeWordsList.appendChild(li);
        });
    } else {
        activeWordsPanel.classList.add('hidden');
    }
    
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
    
    // Hide active words panel when game is over
    document.getElementById('active-words-panel').classList.add('hidden');
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
    if (gameState !== 'PLAYING' && gameState !== 'ANIMATING' && gameState !== 'CHALLENGING' && gameState !== 'COUNTDOWN') return;
    
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
    'KeyX': () => shiftPieceLetters(),
    'KeyZ': () => flipPieceLettersHorizontal(),
    'KeyP': () => togglePause(),
    'Escape': () => togglePause()
};

document.addEventListener('keydown', event => {
    // Support Enter key to continue when learning card, success card, or failure card is shown
    if (gameState === 'CHALLENGING' && !challengeLearnInfo.classList.contains('hidden')) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleChallengeContinue();
            return;
        }
    }

    // If typing in an input or select element, do not intercept keystrokes for game controls
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
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

pauseQuitBtn.addEventListener('click', () => {
    quitToMenu();
});

gameoverQuitBtn.addEventListener('click', () => {
    quitToMenu();
});

challengeLearnContinueBtn.addEventListener('click', () => {
    handleChallengeContinue();
});

// --- CHALLENGE MODAL LISTENERS ---
const challengeInput = document.getElementById('challenge-input');
const challengeSubmitBtn = document.getElementById('challenge-submit-btn');
const challengeHintBtn = document.getElementById('challenge-hint-btn');

challengeSubmitBtn.addEventListener('click', () => {
    submitTranslation();
});

challengeHintBtn.addEventListener('click', () => {
    showChallengeHint();
    challengeInput.focus();
});

challengeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitTranslation();
    }
});

// --- LANGUAGE SELECTION UNIQUE FORCE ---
const langFromSelect = document.getElementById('lang-from');
const langToSelect = document.getElementById('lang-to');
const filterLevelSelect = document.getElementById('filter-level');
const filterTypeSelect = document.getElementById('filter-type');
const filterThemeSelect = document.getElementById('filter-theme');

function handleLanguageChange(changedSelect) {
    if (langFromSelect.value === langToSelect.value) {
        const languages = ['en', 'es', 'de'];
        const currentVal = changedSelect.value;
        const otherSelect = changedSelect === langFromSelect ? langToSelect : langFromSelect;
        
        // Pick a different language
        const newVal = languages.find(lang => lang !== currentVal);
        otherSelect.value = newVal;
    }
}

// Bind all selectors to update the study guide dynamically
langFromSelect.addEventListener('change', () => {
    handleLanguageChange(langFromSelect);
    updateStudyGuide();
});
langToSelect.addEventListener('change', () => {
    handleLanguageChange(langToSelect);
    updateStudyGuide();
});
filterLevelSelect.addEventListener('change', () => updateStudyGuide());
filterTypeSelect.addEventListener('change', () => updateStudyGuide());
filterThemeSelect.addEventListener('change', () => updateStudyGuide());

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

// Initialize Study Guide on startup
updateStudyGuide();

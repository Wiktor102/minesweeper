class MinesweeperGame {
	constructor() {
		this.board = [];
		this.width = 9;
		this.height = 9;
		this.mineCount = 10;
		this.flagCount = 0;
		this.revealedCount = 0;
		this.gameState = "ready"; // ready, playing, won, lost
		this.timer = 0;
		this.timerInterval = null;
		this.firstClick = true;

		// Difficulty settings
		this.difficulties = {
			beginner: { width: 9, height: 9, mines: 10 },
			intermediate: { width: 16, height: 16, mines: 40 },
			expert: { width: 30, height: 16, mines: 99 }
		};

		this.initializeElements();
		this.setupEventListeners();
		this.newGame("beginner");
	}

	initializeElements() {
		this.gameBoard = document.getElementById("game-board");
		this.mineCountDisplay = document.getElementById("mine-count");
		this.timerDisplay = document.getElementById("timer-count");
		this.smileyBtn = document.getElementById("smiley-btn");
		this.newGameBtn = document.getElementById("new-game-btn");
		this.difficultySelect = document.getElementById("difficulty");
		this.gameContainer = document.querySelector(".game-container");
	}

	setupEventListeners() {
		this.smileyBtn.addEventListener("click", () => this.resetGame());
		this.newGameBtn.addEventListener("click", () => this.resetGame());
		this.difficultySelect.addEventListener("change", e => {
			this.newGame(e.target.value);
		});

		// Prevent right-click context menu on game board
		this.gameBoard.addEventListener("contextmenu", e => e.preventDefault());
	}

	newGame(difficulty = "beginner") {
		this.stopTimer();

		const settings = this.difficulties[difficulty];
		this.width = settings.width;
		this.height = settings.height;
		this.mineCount = settings.mines;
		this.flagCount = 0;
		this.revealedCount = 0;
		this.gameState = "ready";
		this.timer = 0;
		this.firstClick = true;

		this.updateDisplay();
		this.initializeBoard();
		this.renderBoard();
		this.updateSmiley();
	}

	resetGame() {
		const currentDifficulty = this.difficultySelect.value;
		this.newGame(currentDifficulty);
	}

	initializeBoard() {
		this.board = [];
		for (let row = 0; row < this.height; row++) {
			this.board[row] = [];
			for (let col = 0; col < this.width; col++) {
				this.board[row][col] = {
					isMine: false,
					isRevealed: false,
					isFlagged: false,
					neighborMines: 0,
					row: row,
					col: col
				};
			}
		}
	}

	placeMines(excludeRow, excludeCol) {
		const totalCells = this.width * this.height;
		const availablePositions = [];

		// Create list of available positions (excluding first click)
		for (let row = 0; row < this.height; row++) {
			for (let col = 0; col < this.width; col++) {
				if (row !== excludeRow || col !== excludeCol) {
					availablePositions.push({ row, col });
				}
			}
		}

		// Randomly place mines
		for (let i = 0; i < this.mineCount; i++) {
			if (availablePositions.length === 0) break;

			const randomIndex = Math.floor(Math.random() * availablePositions.length);
			const { row, col } = availablePositions.splice(randomIndex, 1)[0];
			this.board[row][col].isMine = true;
		}

		// Calculate neighbor mine counts
		this.calculateNeighborCounts();
	}

	calculateNeighborCounts() {
		for (let row = 0; row < this.height; row++) {
			for (let col = 0; col < this.width; col++) {
				if (!this.board[row][col].isMine) {
					this.board[row][col].neighborMines = this.countNeighborMines(row, col);
				}
			}
		}
	}

	countNeighborMines(row, col) {
		let count = 0;
		const directions = [
			[-1, -1],
			[-1, 0],
			[-1, 1],
			[0, -1],
			[0, 1],
			[1, -1],
			[1, 0],
			[1, 1]
		];

		for (const [dRow, dCol] of directions) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol].isMine) {
				count++;
			}
		}

		return count;
	}

	isValidPosition(row, col) {
		return row >= 0 && row < this.height && col >= 0 && col < this.width;
	}

	renderBoard() {
		this.gameBoard.innerHTML = "";
		this.gameBoard.className = `game-board ${this.difficultySelect.value}`;

		for (let row = 0; row < this.height; row++) {
			for (let col = 0; col < this.width; col++) {
				const cell = this.createCellElement(row, col);
				this.gameBoard.appendChild(cell);
			}
		}
	}

	createCellElement(row, col) {
		const cellElement = document.createElement("div");
		cellElement.className = "cell";
		cellElement.dataset.row = row;
		cellElement.dataset.col = col;

		cellElement.addEventListener("click", e => this.handleCellClick(e, row, col));
		cellElement.addEventListener("contextmenu", e => this.handleCellRightClick(e, row, col));

		return cellElement;
	}

	handleCellClick(event, row, col) {
		if (this.gameState === "won" || this.gameState === "lost") return;

		const cell = this.board[row][col];
		if (cell.isRevealed || cell.isFlagged) return;

		// Place mines on first click
		if (this.firstClick) {
			this.placeMines(row, col);
			this.firstClick = false;
			this.gameState = "playing";
			this.startTimer();
		}

		this.revealCell(row, col);
		this.updateDisplay();
		this.checkGameState();
	}

	handleCellRightClick(event, row, col) {
		event.preventDefault();

		if (this.gameState === "won" || this.gameState === "lost") return;

		const cell = this.board[row][col];
		if (cell.isRevealed) return;

		this.toggleFlag(row, col);
		this.updateDisplay();
	}

	revealCell(row, col) {
		if (!this.isValidPosition(row, col)) return;

		const cell = this.board[row][col];
		if (cell.isRevealed || cell.isFlagged) return;

		cell.isRevealed = true;
		this.revealedCount++;

		const cellElement = this.getCellElement(row, col);
		cellElement.classList.add("revealed");

		if (cell.isMine) {
			cellElement.classList.add("mine", "mine-exploded");
			this.gameState = "lost";
			this.revealAllMines();
			return;
		}

		if (cell.neighborMines > 0) {
			cellElement.textContent = cell.neighborMines;
			cellElement.classList.add(`number-${cell.neighborMines}`);
		} else {
			// Reveal all adjacent empty cells
			this.revealAdjacentCells(row, col);
		}
	}

	revealAdjacentCells(row, col) {
		const directions = [
			[-1, -1],
			[-1, 0],
			[-1, 1],
			[0, -1],
			[0, 1],
			[1, -1],
			[1, 0],
			[1, 1]
		];

		for (const [dRow, dCol] of directions) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			if (this.isValidPosition(newRow, newCol)) {
				const adjacentCell = this.board[newRow][newCol];
				if (!adjacentCell.isRevealed && !adjacentCell.isFlagged) {
					this.revealCell(newRow, newCol);
				}
			}
		}
	}

	toggleFlag(row, col) {
		const cell = this.board[row][col];
		const cellElement = this.getCellElement(row, col);

		if (cell.isFlagged) {
			cell.isFlagged = false;
			cellElement.classList.remove("flagged");
			this.flagCount--;
		} else {
			cell.isFlagged = true;
			cellElement.classList.add("flagged");
			this.flagCount++;
		}
	}

	getCellElement(row, col) {
		return this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
	}

	revealAllMines() {
		for (let row = 0; row < this.height; row++) {
			for (let col = 0; col < this.width; col++) {
				const cell = this.board[row][col];
				const cellElement = this.getCellElement(row, col);

				if (cell.isMine && !cell.isRevealed) {
					cellElement.classList.add("mine");
				}

				if (cell.isFlagged && !cell.isMine) {
					cellElement.classList.add("mine-wrong");
				}
			}
		}
	}

	checkGameState() {
		if (this.gameState === "lost") {
			this.stopTimer();
			this.updateSmiley();
			return;
		}

		// Check win condition: all non-mine cells revealed
		const totalCells = this.width * this.height;
		const nonMineCells = totalCells - this.mineCount;

		if (this.revealedCount === nonMineCells) {
			this.gameState = "won";
			this.stopTimer();
			this.flagAllRemainingMines();
			this.updateSmiley();
		}
	}

	flagAllRemainingMines() {
		for (let row = 0; row < this.height; row++) {
			for (let col = 0; col < this.width; col++) {
				const cell = this.board[row][col];
				if (cell.isMine && !cell.isFlagged) {
					this.toggleFlag(row, col);
				}
			}
		}
	}

	startTimer() {
		this.timerInterval = setInterval(() => {
			this.timer++;
			this.updateTimerDisplay();
		}, 1000);
	}

	stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	updateDisplay() {
		this.updateMineCountDisplay();
		this.updateTimerDisplay();
	}

	updateMineCountDisplay() {
		const remainingMines = this.mineCount - this.flagCount;
		this.mineCountDisplay.textContent = remainingMines.toString().padStart(3, "0");
	}

	updateTimerDisplay() {
		const displayTime = Math.min(this.timer, 999);
		this.timerDisplay.textContent = displayTime.toString().padStart(3, "0");
	}

	updateSmiley() {
		this.gameContainer.className = `game-container game-${this.gameState}`;

		switch (this.gameState) {
			case "won":
				this.smileyBtn.textContent = "😎";
				break;
			case "lost":
				this.smileyBtn.textContent = "😵";
				break;
			default:
				this.smileyBtn.textContent = "😊";
				break;
		}
	}
}

// --- i18n support (English + Polish) ---
const i18n = (function () {
	const translations = {
		en: {
			title: "Minesweeper",
			difficulty_label: "Difficulty:",
			difficulty_beginner: "Beginner (9x9, 10 mines)",
			difficulty_intermediate: "Intermediate (16x16, 40 mines)",
			difficulty_expert: "Expert (30x16, 99 mines)",
			language_label: "Language:",
			new_game: "New Game",
			mines_label: "Mines:",
			time_label: "Time:",
			how_to_play: "How to Play:",
			how_left: "<strong>Left click:</strong> Reveal a cell",
			how_right: "<strong>Right click:</strong> Flag/unflag a suspected mine",
			how_goal: "<strong>Goal:</strong> Reveal all cells without mines",
			how_numbers: "<strong>Numbers:</strong> Show how many mines are adjacent to that cell"
		},
		pl: {
			title: "Saper",
			difficulty_label: "Poziom:",
			difficulty_beginner: "Łatwy (9x9, 10 min)",
			difficulty_intermediate: "Średni (16x16, 40 min)",
			difficulty_expert: "Trudny (30x16, 99 min)",
			language_label: "Język:",
			new_game: "Nowa gra",
			mines_label: "Miny:",
			time_label: "Czas:",
			how_to_play: "Jak grać:",
			how_left: "<strong>Klik lewym przyciskiem:</strong> Odkryj pole",
			how_right: "<strong>Klik prawym przyciskiem:</strong> Oznacz/usuń flagę podejrzanej miny",
			how_goal: "<strong>Cel:</strong> Odkryj wszystkie pola bez min",
			how_numbers: "<strong>Cyfry:</strong> Pokazują ile min jest przy danym polu"
		}
	};

	function detect() {
		const stored = localStorage.getItem("lang");
		if (stored && translations[stored]) return stored;
		const nav = navigator.language || navigator.userLanguage || "en";
		if (nav.toLowerCase().startsWith("pl")) return "pl";
		return "en";
	}

	let current = detect();

	function t(key) {
		return (translations[current] && translations[current][key]) || translations.en[key] || key;
	}

	function apply() {
		document.documentElement.lang = current;
		document.querySelectorAll("[data-i18n]").forEach(el => {
			const key = el.getAttribute("data-i18n");
			el.innerHTML = t(key);
		});
		// document title
		document.title = t("title");
		const langSelect = document.getElementById("language-select");
		if (langSelect) langSelect.value = current;
	}

	function setLang(lang) {
		if (!translations[lang]) return;
		current = lang;
		localStorage.setItem("lang", lang);
		apply();
	}

	return {
		t,
		apply,
		setLang,
		get currentLang() {
			return current;
		}
	};
})();

// Initialize the game when the page loads and apply translations
document.addEventListener("DOMContentLoaded", () => {
	i18n.apply();
	const langSelect = document.getElementById("language-select");
	if (langSelect) {
		langSelect.addEventListener("change", e => i18n.setLang(e.target.value));
	}
	new MinesweeperGame();
});

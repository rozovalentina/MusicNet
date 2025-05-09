
//Settings
var resolution = [window.innerWidth, window.innerHeight]
var gravity = 850;
var gameVelocity = 1;
var playerGravity = 2000 * gameVelocity;
var numberOfLevels = 8;
var backgroundGridColor = 0xA98467;
var backgroundColor = 0xF0EAD2;
var platformColor = 0xA98467;
var gridColor = "221,229,182,"; // Verde (RGB: 0, 128, 0)
var gridOpacity = 0.4;
var fontSize = 20;
var fontColor = '#A98467';
var pointsToChangeLevel = 5;

//Default Settings
//var noteReference -> Not here
var gameModality = GAME_MODE.STATIC; //Identify the default modality set when the game is loaded in the page
var startGameLevel = 0; //Identify the position of the default starting scale (from the relation scales[gameLevel])
//Then there's the noteReference variable that is not declared and set default here


var modalScaleName = scales[startGameLevel]; //Identify the name of the default scale taken from the startGameLevel position
changeScaleReference(modalScaleName);


//Game Configuration
var config = {
	type: Phaser.AUTO,
	width: resolution[0],
	height: resolution[1],
	backgroundColor: backgroundColor,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: gravity },
			debug: false
		}
	},
};

var game = new Phaser.Game(config);


//GAME VARIABLES

//Player object, player dimension
var player;
var playerWidth;
var playerHeight;

//Game score
var score; //Int
var scoreText;

//Game grid-rhythm settings
var timeSignature;

//Game status managing
var gameStatus;
var restartScene;
var changeLevelEvent;
var changeLevelStatusDuration;
var scoreToChangeLevel;
var changeLevelTextShown;

//Jump event managing
var goAhead;
var noAnswer;
var jumpArea;
var jumpAreaWidth;

//Player position
var gameInitialX;
var playerInitialY;
var playerPreviousY;

//Platforms (levels)
var levelsFieldHeight;
var stepHeight;
var platformVelocity;
var platformTouched;
var measurePlatformWidth;
var platformHeight;
var platformInitialX;
var platformInitialPlayerOffset;
var spaceBetweenPlatforms;
var levelsQueue;
var currentPlatform;
var playerPauseY;

//Game Levels
var gameLevel;
var lastLevel;
var currentScaleText;
var gameLevelProgressive; //Always increase

//PAUSE
var pauseEvent;
var playerEnterPause;
var jumpFromPause;
var fallBeforePause;
var playerEndY;
var endedPauseAnimation;
var initialPauseStability;

//Intro
var initialScaleNote;
var introVelocity;
var statusText;
var statusTextSmall;
var countdown;
var centeredText;

//Collider
var collider;

//Graphic drawings object manager
var graphics;

//Note reference
var currentNoteReference;

//Pitch detector initialization (here to create only one object even if the game is restarted)
const pitchDetector = new PitchDetector();
//pitchDetector.start();


//Game context
var gameContext;

//Buttons
var referenceNoteButton;
var playPauseButton;
var settingsButton;

const multiplayerState = {
	connected: false,
	retryCount: 0,
	sequenceNumber: 1,
	isHost: false,
	lastLatency: 0,
	stats: {
		messagesSent: 0,
		messagesReceived: 0,
		totalBytesSent: 0,
		lastError: null
	}
};

function initVariables() {
	//Game Level
	gameLevel = startGameLevel;
	gameLevelProgressive = 1;
	lastLevel = false;

	//Game score
	score = 0;

	//Game Intro
	initialScaleNote = 0;
	introVelocity = (resolution[1] / 636) * 1.5;
	countdown = 4;

	//Game state managing
	gameStatus = "Initialized";
	restartScene = false;
	changeLevelEvent = false; //Manage the period in which there's a change of level
	changeLevelStatusDuration = 1 / 2;
	scoreToChangeLevel = 0;
	changeLevelTextShown = false;

	//Game grid-rhythm settings
	timeSignature = 4;

	//Jump event managing
	goAhead = true;
	noAnswer = false;
	jumpArea = false;
	jumpAreaWidth = playerWidth + 10 * gameVelocity; //befere was 20

	//Player position
	playerFixedX = 100;
	playerInitialY = resolution[1] - playerHeight / 2 - playerHeight / 8;
	playerPreviousY = 0;

	//Platforms (levels)
	levelsFieldHeight = resolution[1] - playerHeight * 4; //Calculation of levels Field (Height of the scene in which levels can appear)
	stepHeight = levelsFieldHeight / numberOfLevels;

	platformTouched = false;
	platformVelocity = 0;
	measurePlatformWidth = 800;
	gameInitialX = 200;
	platformHeight = stepHeight - ((stepHeight * 40) / 100);
	platformInitialX = (gameInitialX - playerWidth / 2) + (measurePlatformWidth / 2);
	platformInitialPlayerOffset = 6;
	spaceBetweenPlatforms = 2;
	levelsQueue = [];

	//Pause
	playerEnterPause = false; //True only when the player enter the pause
	jumpFromPause = false; //True when the player jump from a pause to the next step
	pauseEvent = false; //Keep true from when the player enter jumpArea of the step before pause to when the player exit pause
	fallBeforePause = false; //True if the player fall because a note is played to enter a pause
	playerEndY = 0;
	endedPauseAnimation = false;
	initialPauseStability = 7; //Increase-> decrease stability; decrease-> increase stability but increase the delay of wings

	//ScaleMapping inizialization
	//changeNoteReference("C3")
	changeScaleReference(scales[gameLevel]);

	//Pitch manager
	if (pitchDetector.isEnable())
		pitchDetector.toggleEnable();
}


//GAME SCENES MANAGER
/*
Current Game Scenes pipeline:

splashScene -> settingsScene -> playScene --------------------|
																^			 												|
																|			  											|
															gameoverScene <-----------------

playScene: manage the starting state (with variable gameStatus) and the different levels (with the variable gameLevel)
*/

var splashScene = {
	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},
	create: function () {

		askForStartGame = false;

		playerWidth = 19;
		playerHeight = 48;

		initVariables();

		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3', 'player'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}

		// Título principal
		this.add.text(resolution[0] / 2, resolution[1] / 4, "MusicNet", {
			fontFamily: "Arial",
			fontSize: "60px",
			fontStyle: "bold",
			color: "#A98467", // Un color vibrante
			align: "center",
			stroke: "#000000", // Sombra para resaltar
			strokeThickness: 2
		}).setOrigin(0.5);


		// Botón Singleplayer con ícono 🎧
		createButton(this, resolution[0] / 2 - 150, resolution[1] / 2,
			"Singleplayer", 0x1E3A8A, 0xF0EAD2, 200, 70, 26, function () {
				game.scene.stop("splashScene");
				game.scene.start("settingsScene");
			}, "🎧");

		// Botón Multiplayer con ícono 🌐
		createButton(this, resolution[0] / 2 + 150, resolution[1] / 2,
			"Multiplayer", 0x6B21A8, 0xF0EAD2, 200, 70, 26, function () {
				game.scene.stop("splashScene");
				game.scene.start("multiplayerScene");
			}, "🌐");
		// Aviso sobre ruido ambiental
		this.add.text(resolution[0] / 2, resolution[1] - 60,
			"🔊 For best performance, please play in a quiet environment.\nBackground noise may affect note detection.",
			{
				fontFamily: "Arial",
				fontSize: "24px",
				color: "#444",
				align: "center",
				wordWrap: { width: resolution[0] - 40 }
			}
		).setOrigin(0.5);
	}
};

game.scene.add("splashScene", splashScene);


var askForStartGame;

var settingsScene = {
	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},
	create: function () {

		askForStartGame = false;

		playerWidth = 19;
		playerHeight = 48;

		initVariables();

		this.cameras.main.setBackgroundColor('#FFFFE0');
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3', 'player'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}

		settingsOffset = 0;

		//Relative scale settings
		//------------------------------------------------------------------------------------------------------
		firstNote = noteReference;
		firstNoteTextDesc = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 10, "______________________________________\nTonal Reference", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		firstNoteTextDesc.setAlign('center');
		firstNoteText = this.add.text(resolution[0] / 2 + settingsOffset - 100, resolution[1] / 3.6, "", { font: "bold 22px Arial", fill: "#A98467" }).setOrigin(0.5);
		firstNoteText.setText(firstNote);
		firstNoteText.setBackgroundColor("#FFFFE0"); //Color caja c3
		firstNoteText.setPadding(13, 13, 13, 13);
		firstNoteText.setInteractive();
		firstNoteText.on('pointerdown', function () {
			playNote(firstNote, 1.5);
		});

		prevNote = this.add.text(resolution[0] / 2 + settingsOffset - 50 - 100, resolution[1] / 3.6, "<", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		prevNote.setPadding(6, 10, 6, 10);
		prevNote.setInteractive();
		prevNote.on('pointerdown', function () {
			nextNote.setFill("#6C584C");
			if (firstNote != "C2") {
				if (firstNote == "C#2") {
					prevNote.setFill("#6C584C");
				}

				if (firstNote.substring(1, 2) == "#")
					octave = firstNote.substring(2, 3);
				else
					octave = firstNote.substring(1, 2);

				if (firstNote.substring(0, 1) == "C" && firstNote.substring(0, 2) != "C#")
					octave--;

				if (firstNote.substring(1, 2) == "#")
					firstNote = letters[letters.indexOf(firstNote.substring(0, 2)) - 1] + octave;
				else
					if (firstNote.substring(0, 1) == letters[0])
						firstNote = letters[letters.length - 1] + octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0, 1)) - 1] + octave;


				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);

			}
		});

		nextNote = this.add.text(resolution[0] / 2 + settingsOffset + 50 - 100, resolution[1] / 3.6, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		nextNote.setPadding(6, 10, 6, 10);
		nextNote.setInteractive();
		nextNote.on('pointerdown', function () {
			prevNote.setFill("#6C584C");
			if (firstNote != "B5") { //Set max range
				if (firstNote == "A#5") { //Set "inactive"
					nextNote.setFill("#6C584C");
				}

				if (firstNote.substring(1, 2) == "#")
					octave = firstNote.substring(2, 3);
				else
					octave = firstNote.substring(1, 2);

				if (firstNote.substring(0, 1) == "B")
					octave++;

				if (firstNote.substring(1, 2) == "#")
					if (firstNote.substring(0, 2) == letters[letters.length - 1])
						firstNote = letters[0] + octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0, 2)) + 1] + octave;
				else
					firstNote = letters[letters.indexOf(firstNote.substring(0, 1)) + 1] + octave;

				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);
			}
		});

		let buttonGraphics = this.add.graphics();
		buttonGraphics.fillStyle(0xA98467, 1);
		buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
		let playOctaveButton = this.add.container(
			resolution[0] / 2 + settingsOffset + 100,
			resolution[1] / 3.6
		);
		playOctaveButton.add(buttonGraphics);

		let buttonText = this.add.text(0, 0, "Play Octave", {
			font: "bold 22px Arial",
			fill: "#F0EAD2"
		}).setOrigin(0.5);
		playOctaveButton.add(buttonText);
		playOctaveButton.setSize(150, 40);
		playOctaveButton.setInteractive();
		playOctaveButton.on('pointerdown', function () {
			playNote(firstNote, 1.5);
			setTimeout(() => {
				if (firstNote.substring(1, 2) == "#")
					playNote(firstNote.substring(0, 2) + (parseInt(firstNote.substring(2, 3)) + 1), 1.5);
				else
					playNote(firstNote.substring(0, 1) + (parseInt(firstNote.substring(1, 2)) + 1), 1.5);
			}, 600);
		});

		//Game Modality
		//------------------------------------------------------------------------------------------------------
		gameModalityTextDesc = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 2.2, "______________________________________\nGame Modality & Modal Scale", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		gameModalityTextDesc.setAlign('center');

		function createMiddleButton(scene, x, y, text, bgColor, textColor) {
			let buttonGraphics = scene.add.graphics();
			buttonGraphics.fillStyle(bgColor, 1);
			buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
			let buttonContainer = scene.add.container(x, y);
			buttonContainer.add(buttonGraphics);
			let buttonText = scene.add.text(0, 0, text, {
				font: "bold 22px Arial",
				fill: Phaser.Display.Color.RGBToString(
					textColor >> 16,
					(textColor >> 8) & 0xff,
					textColor & 0xff
				)
			}).setOrigin(0.5);
			buttonContainer.add(buttonText);

			return { container: buttonContainer, text: buttonText, graphics: buttonGraphics };
		}

		let modalScaleButton = createMiddleButton(this, resolution[0] / 2 + settingsOffset, resolution[1] / 1.6,
			modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1), 0xA98467, 0xF0EAD2);

		function updateModalScaleButton() {
			modalScaleButton.text.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
			modalScaleButton.graphics.clear();
			modalScaleButton.graphics.fillStyle(0xA98467, 1);
			modalScaleButton.graphics.fillRoundedRect(-75, -20, 150, 40, 10);
		}

		prevScale = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.8, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		prevScale.setAngle(-90);
		prevScale.setPadding(6, 10, 6, 10);
		prevScale.setInteractive();
		prevScale.on('pointerdown', function () {
			if (startGameLevel == 0)
				startGameLevel = scales.indexOf(scales[scales.length - 1]);
			else
				startGameLevel--;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			updateModalScaleButton();
			modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
		});

		nextScale = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.44, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		nextScale.setAngle(90);
		nextScale.setPadding(6, 10, 6, 10);
		nextScale.setInteractive();
		nextScale.on('pointerdown', function () {
			if (startGameLevel == scales.indexOf(scales[scales.length - 1]))
				startGameLevel = 0;
			else
				startGameLevel++;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			updateModalScaleButton();
			modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
		});

		function createButton(scene, x, y, text, bgColor, textColor, callback) {
			let buttonGraphics = scene.add.graphics();
			buttonGraphics.fillStyle(bgColor, 1);
			buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
			let buttonContainer = scene.add.container(x, y);
			buttonContainer.add(buttonGraphics);
			let buttonText = scene.add.text(0, 0, text, {
				font: "bold 22px Arial",
				fill: Phaser.Display.Color.RGBToString(
					textColor >> 16,
					(textColor >> 8) & 0xff,
					textColor & 0xff
				)
			}).setOrigin(0.5);
			buttonContainer.add(buttonText);
			buttonContainer.setSize(150, 40);
			buttonContainer.setInteractive();
			buttonContainer.on('pointerdown', callback);

			return buttonContainer;
		}

		let gameModalityStatic = createButton(this, resolution[0] / 2 + settingsOffset - 160, resolution[1] / 1.6,
			"Static", gameModality === GAME_MODE.PROGRESSIVE ? 0xDDE5B6 : 0xADC178,
			gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 : 0xF0EAD2,
			function () {
				gameModality = GAME_MODE.STATIC;
				updateButtonStyles();
			});
		let gameModalityProgressive = createButton(this, resolution[0] / 2 + settingsOffset + 160, resolution[1] / 1.6,
			"Progressive", gameModality === GAME_MODE.STATIC ? 0xDDE5B6 : 0xADC178,
			gameModality === GAME_MODE.STATIC ? 0xA98467 : 0xF0EAD2,
			function () {
				gameModality = GAME_MODE.PROGRESSIVE;
				updateButtonStyles();
			});

		function updateButtonStyles() {
			gameModalityStatic.list[0].clear();
			gameModalityStatic.list[0].fillStyle(gameModality === GAME_MODE.PROGRESSIVE ? 0xDDE5B6 : 0xADC178, 1);
			gameModalityStatic.list[0].fillRoundedRect(-75, -20, 150, 40, 10);
			gameModalityStatic.list[1].setColor(
				Phaser.Display.Color.RGBToString(
					gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 >> 16 : 0xF0EAD2 >> 16,
					gameModality === GAME_MODE.PROGRESSIVE ? (0xA98467 >> 8) & 0xff : (0xF0EAD2 >> 8) & 0xff,
					gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 & 0xff : 0xF0EAD2 & 0xff
				)
			);
			gameModalityProgressive.list[0].clear();
			gameModalityProgressive.list[0].fillStyle(gameModality === GAME_MODE.STATIC ? 0xDDE5B6 : 0xADC178, 1);
			gameModalityProgressive.list[0].fillRoundedRect(-75, -20, 150, 40, 10);
			gameModalityProgressive.list[1].setColor(
				Phaser.Display.Color.RGBToString(
					gameModality === GAME_MODE.STATIC ? 0xA98467 >> 16 : 0xF0EAD2 >> 16,
					gameModality === GAME_MODE.STATIC ? (0xA98467 >> 8) & 0xff : (0xF0EAD2 >> 8) & 0xff,
					gameModality === GAME_MODE.STATIC ? 0xA98467 & 0xff : 0xF0EAD2 & 0xff
				)
			);
		}

		//Start Game button
		//------------------------------------------------------------------------------------------------------
		startGame = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.2, "Start Game", { font: "bold 80px Arial", fill: "#6B21A8" }).setOrigin(0.5);
		startGame.setPadding(15, 15, 15, 15);
		startGame.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
		startGame.setInteractive();
		startGame.on('pointerdown', function () {
			// game.anims.anims.clear() //Remove player animations before restarting the game
			// game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
			// game.scene.start("playScene");
			// game.scene.stop("settingsScene");
			askForStartGame = true;
		});

		this.input.keyboard.on('keydown', function (event) {
			if (event.key == " " || event.key == "Enter") {
				if (!window.pitchDetector) {
					window.pitchDetector = new PitchDetector();
					window.pitchDetector.start();
					window.pitchDetector.toggleEnable(); // Habilita detección
				}
				game.anims.anims.clear() //Remove player animations before restarting the game
				game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
				game.scene.start("playScene");
				game.scene.stop("settingsScene");
			}
		});
	},
	update: function () {
		if (askForStartGame == true) {
			game.anims.anims.clear() //Remove player animations before restarting the game
			//game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
			game.scene.start("playScene");
			game.scene.stop("settingsScene");
		}
	}
}
game.scene.add("settingsScene", settingsScene);

function generateRoomCode() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const codeLength = 6;
	let roomCode = '';

	for (let i = 0; i < codeLength; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		roomCode += characters[randomIndex];
	}

	return roomCode;
}

function createButton(scene, x, y, text, bgColor, textColor, width = 300, height = 70, fontSize = 26, callback, icon = null) {
	let buttonContainer = scene.add.container(x, y);

	// Fondo del botón
	let buttonGraphics = scene.add.graphics();
	buttonGraphics.fillStyle(bgColor, 1);
	buttonGraphics.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
	buttonGraphics.lineStyle(2, 0xffffff, 0.2);
	buttonGraphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 20);
	buttonContainer.add(buttonGraphics);

	// Ícono y texto en un grupo interior
	let contentContainer = scene.add.container(0, 0); // centrado respecto al botón
	let spacing = 10;

	if (icon) {
		let iconText = scene.add.text(0, 0, icon, {
			font: `${fontSize}px Arial`,
			fill: Phaser.Display.Color.RGBToString(
				textColor >> 16,
				(textColor >> 8) & 0xff,
				textColor & 0xff
			)
		}).setOrigin(0.5);
		contentContainer.add(iconText);

		let buttonText = scene.add.text(0, 0, text, {
			font: `bold ${fontSize}px Arial`,
			fill: Phaser.Display.Color.RGBToString(
				textColor >> 16,
				(textColor >> 8) & 0xff,
				textColor & 0xff
			),
			align: "center"
		}).setOrigin(0.5);

		scene.time.delayedCall(0, () => {
			const totalWidth = iconText.width + spacing + buttonText.width;
			iconText.x = -totalWidth / 2 + iconText.width / 2;
			buttonText.x = iconText.x + iconText.width / 2 + spacing + buttonText.width / 2;
		});

		contentContainer.add(buttonText);
	} else {
		let buttonText = scene.add.text(0, 0, text, {
			font: `bold ${fontSize}px Arial`,
			fill: Phaser.Display.Color.RGBToString(
				textColor >> 16,
				(textColor >> 8) & 0xff,
				textColor & 0xff
			),
			align: "center"
		}).setOrigin(0.5);
		contentContainer.add(buttonText);
	}

	buttonContainer.add(contentContainer);

	// Interacción
	buttonContainer.setSize(width, height);
	buttonContainer.setInteractive({ useHandCursor: true });

	// Hover effect
	buttonContainer.on('pointerover', () => {
		buttonGraphics.clear();
		buttonGraphics.fillStyle(Phaser.Display.Color.GetColor(
			Math.min((bgColor >> 16) + 30, 255),
			Math.min(((bgColor >> 8) & 0xff) + 30, 255),
			Math.min((bgColor & 0xff) + 30, 255)
		), 1);
		buttonGraphics.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
	});

	buttonContainer.on('pointerout', () => {
		buttonGraphics.clear();
		buttonGraphics.fillStyle(bgColor, 1);
		buttonGraphics.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
	});

	buttonContainer.on('pointerdown', callback);

	return buttonContainer;
}

var multiplayerScene = {
	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},
	create: function () {
		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3', 'player'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}

		// Título principal
		this.add.text(resolution[0] / 2, resolution[1] / 4, "MusicNet", {
			fontFamily: "Arial",
			fontSize: "60px",
			fontStyle: "bold",
			color: "#A98467", // Un color vibrante
			align: "center",
			stroke: "#000000", // Sombra para resaltar
			strokeThickness: 2
		}).setOrigin(0.5);

		createButton(this, resolution[0] / 2 - 150, resolution[1] / 2,
			"Create Room", 0xA98467, 0xF0EAD2, 180, 50, 26, function () {
				const roomCode = generateRoomCode();
				WebRTCManager.createRoom(roomCode);
				WebRTCManager.connect({
					roomCode: roomCode,
					isHost: true,
					onReady: () => {
						console.log("🟢 Host conectado a WebRTC.");
					}
				}),
					game.scene.stop("multiplayerScene");
				game.scene.start("createRoomScene", { roomCode: roomCode });
			});

		createButton(this, resolution[0] / 2 + 150, resolution[1] / 2,
			"Join Room", 0xADC178, 0xF0EAD2, 180, 50, 26, function () {
				game.scene.stop("multiplayerScene");
				game.scene.start("joinRoomScene");
			});

		createButton(this, 80, 40, "← Back", 0xA98467, 0xF0EAD2, 100, 40, 20, function () {
			game.scene.stop("multiplayerScene");
			game.scene.start("splashScene");
		});
	},
};
game.scene.add("multiplayerScene", multiplayerScene);

var createRoomScene = {
	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},
	create: function (data) {
		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}

		if (!data || !data.roomCode) {
			console.error("No room code provided");
			game.scene.stop("createRoomScene");
			//game.scene.start("multiplayerScene");
			return;
		}
		const roomCode = data.roomCode; // Code generated in the previous scene
		this.currentRoomId = roomCode; // Store the room code for later use
		// Set solid background color
		this.cameras.main.setBackgroundColor("#F0EAD2");

		// Scene title
		this.add.text(resolution[0] / 2, resolution[1] / 4, "Room Created",
			{ font: "bold 48px Arial", fill: "#6C584C", align: "center" })
			.setOrigin(0.5);

		// Display the room code
		this.add.text(resolution[0] / 2, resolution[1] / 2, `Code: ${roomCode}`,
			{ font: "bold 32px Arial", fill: "#A98467", align: "center" })
			.setOrigin(0.5);

		// Waiting message
		this.add.text(resolution[0] / 2, resolution[1] / 2 + 50,
			"Room created, waiting for other players...",
			{ font: "bold 24px Arial", fill: "#6C584C", align: "center" })
			.setOrigin(0.5);

		createButton(this, 80, 40, "← Back", 0xADC178, 0xF0EAD2, 100, 40, 20, function () {
			game.scene.stop("createRoomScene");
			WebRTCManager.leaveRoom(roomCode);
			game.scene.start("multiplayerScene");
		});

		this.time.delayedCall(500, () => {

			const socket = WebRTCManager.getSocket?.();
			if (socket) {
				socket.on('playerJoined', ({ playerId, roomCode }) => {
					console.log("🎉 Jugador se unió a la sala vía socket.io:", playerId);
					WebRTCManager.createOfferWhenReady(roomCode);
					game.scene.stop("createRoomScene");
					game.scene.stop("multiplayerScene");
					game.scene.start("multiplayerSettingsScene", {
						roomCode: roomCode,
						isHost: true
					});
				});
			} else {
				console.warn("⚠️ Socket no inicializado al momento de cargar createRoomScene");
			}
		});
	},
	// En cada escena:
	shutdown: function () {
		WebRTCManager.offAll(); // Remove all event listeners when the scene is shut down

	}
};
game.scene.add("createRoomScene", createRoomScene);

var joinRoomScene = {
	roomCode: "",

	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},

	create: function () {
		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}


		createButton(this, 80, 40, "← Back", 0xADC178, 0xF0EAD2, 100, 40, 20, () => {
			game.scene.stop("joinRoomScene");
			game.scene.start("multiplayerScene");
		});
		this.add.text(window.innerWidth / 2, window.innerHeight / 4, "Join Room",
			{ font: "bold 48px Arial", fill: "#6C584C", align: "center" })
			.setOrigin(0.5);

		this.roomCode = "";

		this.roomCodeText = this.add.text(window.innerWidth / 2, window.innerHeight / 2, "_______________",
			{ font: "bold 32px Arial", fill: "#6C584C", backgroundColor: "#FFFFFF", padding: 10 })
			.setOrigin(0.5);

		this.input.keyboard.on('keydown', (event) => {
			if (typeof this.roomCode !== "string") {
				this.roomCode = "";
			}

			if (event.key === "Backspace") {
				this.roomCode = this.roomCode.slice(0, -1);
			} else if (event.key.length === 1 && this.roomCode.length < 6) {
				this.roomCode += event.key.toUpperCase();
			} else if (event.key === "Enter") {
				//joinRoomScene.joinRoom(this.roomCode);
			}
			this.roomCodeText.setText(this.roomCode.length > 0 ? this.roomCode : "_______________");
		});

		createButton(this, window.innerWidth / 2, window.innerHeight / 2 + 80, "Join", 0xDDE5B6, 0x6C584C, 120, 50, 20, () => {
			joinRoomScene.joinRoom(this.roomCode);
		});
	},

	joinRoom: function (roomCode) {
		if (!roomCode || roomCode.length < 6) {
			console.error("❌ Invalid room code");
			return;
		}

		console.log("🔄 Intentando unirse a la sala:", roomCode);

		console.log("🔄 Conectando WebRTC como invitado...");
		WebRTCManager.connect({
			roomCode: roomCode,
			isHost: false,
			onReady: () => {
				console.log("🟢 Guest conectado a WebRTC.");
			}
		});
		// Conexión establecida, ahora sí hacemos join
		WebRTCManager.joinRoom(roomCode, (response) => {
			if (response.success) {
				console.log("🟢 Invitado conectado a WebRTC. Enviando playerJoined...");

				WebRTCManager.sendMessage({
					type: 'playerJoined',
					roomCode: roomCode
				});

				game.scene.stop("joinRoomScene");
				game.scene.start("multiplayerSettingsScene", {
					roomCode: roomCode,
					isHost: false
				});
			} else {
				console.error("❌ Fallo al unirse a la sala:", response.error);
			}
		});
	},
	// En cada escena:
	shutdown: function () {
		WebRTCManager.offAll();
	}

};
game.scene.add("joinRoomScene", joinRoomScene);

var multiplayerSettingsScene = {
	preload: function () {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
		this.load.image('note1', 'assets/note1.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note2', 'assets/note2.png', { frameWidth: 25, frameHeight: 54 });
		this.load.image('note3', 'assets/note3.png', { frameWidth: 25, frameHeight: 54 });
	},
	create: function (data) {
		console.log("🔄 Cargando escena multiplayerSettingsScene...");
		if (!data || !data.roomCode) {
			console.error("No room code provided");
			game.scene.stop("multiplayerSettingsScene");
			game.scene.start("multiplayerScene");
			return;
		}

		this.roomCode = data.roomCode;
		this.isHost = data.isHost || false;

		askForStartGame = false;
		playerWidth = 19;
		playerHeight = 48;
		initVariables();
		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);

		settingsOffset = 0;

		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}

		function broadcastSettings() {
			if (!multiplayerSettingsScene.isHost) return;

			const settings = {
				noteReference: firstNote,
				modalScaleName: modalScaleName,
				gameModality: gameModality
			};

			WebRTCManager.sendMessage({
				type: "settingsUpdated",
				roomCode: multiplayerSettingsScene.roomCode,
				settings: settings
			});
		}

		// 💬 ESCUCHAR CAMBIOS si es INVITADO
		if (!this.isHost) {
			WebRTCManager.onMessage((data) => {
				if (data.type === 'settingsUpdated' && data.roomCode === this.roomCode) {
					const newSettings = data.settings;

					firstNote = newSettings.noteReference;
					modalScaleName = newSettings.modalScaleName;
					gameModality = newSettings.gameModality;

					firstNoteText.setText(firstNote);
					changeNoteReference(firstNote);

					modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
					updateModalScaleButton();
					updateButtonStyles();
				}
			});
		}
		// Room code display
		this.add.text(resolution[0] / 2, resolution[1] / 10, "Room Code: " + this.roomCode,
			{ font: "bold 32px Arial", fill: "#6C584C" }).setOrigin(0.5);

		// Player status (host/guest)
		const playerStatus = this.isHost ? "Host" : "Guest";
		this.add.text(resolution[0] / 2, resolution[1] / 7, `You are: ${playerStatus}`,
			{ font: "bold 24px Arial", fill: "#A98467" }).setOrigin(0.5);

		//Relative scale settings
		//------------------------------------------------------------------------------------------------------
		firstNote = noteReference;
		firstNoteTextDesc = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 5, "______________________________________\nTonal Reference", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		firstNoteTextDesc.setAlign('center');
		firstNoteText = this.add.text(resolution[0] / 2 + settingsOffset - 100, resolution[1] / 3.6, "", { font: "bold 22px Arial", fill: "#A98467" }).setOrigin(0.5);
		firstNoteText.setText(firstNote);
		firstNoteText.setBackgroundColor("rgba(240,234,210)"); //Color caja c3
		firstNoteText.setPadding(13, 13, 13, 13);
		firstNoteText.setInteractive();
		firstNoteText.on('pointerdown', function () {
			playNote(firstNote, 1.5);
		});

		prevNote = this.add.text(resolution[0] / 2 + settingsOffset - 50 - 100, resolution[1] / 3.6, "<", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		prevNote.setPadding(6, 10, 6, 10);
		prevNote.setInteractive();
		prevNote.on('pointerdown', function () {
			nextNote.setFill("#6C584C");
			if (firstNote != "C2") {
				if (firstNote == "C#2") {
					prevNote.setFill("#6C584C");
				}

				if (firstNote.substring(1, 2) == "#")
					octave = firstNote.substring(2, 3);
				else
					octave = firstNote.substring(1, 2);

				if (firstNote.substring(0, 1) == "C" && firstNote.substring(0, 2) != "C#")
					octave--;

				if (firstNote.substring(1, 2) == "#")
					firstNote = letters[letters.indexOf(firstNote.substring(0, 2)) - 1] + octave;
				else
					if (firstNote.substring(0, 1) == letters[0])
						firstNote = letters[letters.length - 1] + octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0, 1)) - 1] + octave;


				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);

			}
			broadcastSettings();
		});

		nextNote = this.add.text(resolution[0] / 2 + settingsOffset + 50 - 100, resolution[1] / 3.6, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		nextNote.setPadding(6, 10, 6, 10);
		nextNote.setInteractive();
		nextNote.on('pointerdown', function () {
			prevNote.setFill("#6C584C");
			if (firstNote != "B5") { //Set max range
				if (firstNote == "A#5") { //Set "inactive"
					nextNote.setFill("#6C584C");
				}

				if (firstNote.substring(1, 2) == "#")
					octave = firstNote.substring(2, 3);
				else
					octave = firstNote.substring(1, 2);

				if (firstNote.substring(0, 1) == "B")
					octave++;

				if (firstNote.substring(1, 2) == "#")
					if (firstNote.substring(0, 2) == letters[letters.length - 1])
						firstNote = letters[0] + octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0, 2)) + 1] + octave;
				else
					firstNote = letters[letters.indexOf(firstNote.substring(0, 1)) + 1] + octave;

				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);
			}
			broadcastSettings();
		});

		let buttonGraphics = this.add.graphics();
		buttonGraphics.fillStyle(0xA98467, 1);
		buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
		let playOctaveButton = this.add.container(
			resolution[0] / 2 + settingsOffset + 100,
			resolution[1] / 3.6
		);
		playOctaveButton.add(buttonGraphics);

		let buttonText = this.add.text(0, 0, "Play Octave", {
			font: "bold 22px Arial",
			fill: "#F0EAD2"
		}).setOrigin(0.5);
		playOctaveButton.add(buttonText);
		playOctaveButton.setSize(150, 40);
		playOctaveButton.setInteractive();
		playOctaveButton.on('pointerdown', function () {
			playNote(firstNote, 1.5);
			setTimeout(() => {
				if (firstNote.substring(1, 2) == "#")
					playNote(firstNote.substring(0, 2) + (parseInt(firstNote.substring(2, 3)) + 1), 1.5);
				else
					playNote(firstNote.substring(0, 1) + (parseInt(firstNote.substring(1, 2)) + 1), 1.5);
			}, 600);
		});

		//Game Modality
		//------------------------------------------------------------------------------------------------------
		gameModalityTextDesc = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 2.2, "______________________________________\nGame Modality & Modal Scale", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		gameModalityTextDesc.setAlign('center');

		function createMiddleButton(scene, x, y, text, bgColor, textColor) {
			let buttonGraphics = scene.add.graphics();
			buttonGraphics.fillStyle(bgColor, 1);
			buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
			let buttonContainer = scene.add.container(x, y);
			buttonContainer.add(buttonGraphics);
			let buttonText = scene.add.text(0, 0, text, {
				font: "bold 22px Arial",
				fill: Phaser.Display.Color.RGBToString(
					textColor >> 16,
					(textColor >> 8) & 0xff,
					textColor & 0xff
				)
			}).setOrigin(0.5);
			buttonContainer.add(buttonText);

			return { container: buttonContainer, text: buttonText, graphics: buttonGraphics };
		}

		let modalScaleButton = createMiddleButton(this, resolution[0] / 2 + settingsOffset, resolution[1] / 1.6,
			modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1), 0xA98467, 0xF0EAD2);

		function updateModalScaleButton() {
			modalScaleButton.text.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
			modalScaleButton.graphics.clear();
			modalScaleButton.graphics.fillStyle(0xA98467, 1);
			modalScaleButton.graphics.fillRoundedRect(-75, -20, 150, 40, 10);
		}

		prevScale = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.8, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		prevScale.setAngle(-90);
		prevScale.setPadding(6, 10, 6, 10);
		prevScale.setInteractive();
		prevScale.on('pointerdown', function () {
			if (startGameLevel == 0)
				startGameLevel = scales.indexOf(scales[scales.length - 1]);
			else
				startGameLevel--;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			updateModalScaleButton();
			modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1)); broadcastSettings();
		});

		nextScale = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.44, ">", { font: "bold 22px Arial", fill: "#6C584C" }).setOrigin(0.5);
		nextScale.setAngle(90);
		nextScale.setPadding(6, 10, 6, 10);
		nextScale.setInteractive();
		nextScale.on('pointerdown', function () {
			if (startGameLevel == scales.indexOf(scales[scales.length - 1]))
				startGameLevel = 0;
			else
				startGameLevel++;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			updateModalScaleButton();
			modalScaleButton.text.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
			broadcastSettings();
		});

		function createButton(scene, x, y, text, bgColor, textColor, callback) {
			let buttonGraphics = scene.add.graphics();
			buttonGraphics.fillStyle(bgColor, 1);
			buttonGraphics.fillRoundedRect(-75, -20, 150, 40, 10);
			let buttonContainer = scene.add.container(x, y);
			buttonContainer.add(buttonGraphics);
			let buttonText = scene.add.text(0, 0, text, {
				font: "bold 22px Arial",
				fill: Phaser.Display.Color.RGBToString(
					textColor >> 16,
					(textColor >> 8) & 0xff,
					textColor & 0xff
				)
			}).setOrigin(0.5);
			buttonContainer.add(buttonText);
			buttonContainer.setSize(150, 40);
			buttonContainer.setInteractive();
			buttonContainer.on('pointerdown', callback);

			return buttonContainer;
		}

		let gameModalityStatic = createButton(this, resolution[0] / 2 + settingsOffset - 160, resolution[1] / 1.6,
			"Static", gameModality === GAME_MODE.PROGRESSIVE ? 0xDDE5B6 : 0xADC178,
			gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 : 0xF0EAD2,
			function () {
				gameModality = GAME_MODE.STATIC;
				updateButtonStyles();
				broadcastSettings();
			});
		let gameModalityProgressive = createButton(this, resolution[0] / 2 + settingsOffset + 160, resolution[1] / 1.6,
			"Progressive", gameModality === GAME_MODE.STATIC ? 0xDDE5B6 : 0xADC178,
			gameModality === GAME_MODE.STATIC ? 0xA98467 : 0xF0EAD2,
			function () {
				gameModality = GAME_MODE.PROGRESSIVE;
				updateButtonStyles();
				broadcastSettings();
			});

		function updateButtonStyles() {
			gameModalityStatic.list[0].clear();
			gameModalityStatic.list[0].fillStyle(gameModality === GAME_MODE.PROGRESSIVE ? 0xDDE5B6 : 0xADC178, 1);
			gameModalityStatic.list[0].fillRoundedRect(-75, -20, 150, 40, 10);
			gameModalityStatic.list[1].setColor(
				Phaser.Display.Color.RGBToString(
					gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 >> 16 : 0xF0EAD2 >> 16,
					gameModality === GAME_MODE.PROGRESSIVE ? (0xA98467 >> 8) & 0xff : (0xF0EAD2 >> 8) & 0xff,
					gameModality === GAME_MODE.PROGRESSIVE ? 0xA98467 & 0xff : 0xF0EAD2 & 0xff
				)
			);
			gameModalityProgressive.list[0].clear();
			gameModalityProgressive.list[0].fillStyle(gameModality === GAME_MODE.STATIC ? 0xDDE5B6 : 0xADC178, 1);
			gameModalityProgressive.list[0].fillRoundedRect(-75, -20, 150, 40, 10);
			gameModalityProgressive.list[1].setColor(
				Phaser.Display.Color.RGBToString(
					gameModality === GAME_MODE.STATIC ? 0xA98467 >> 16 : 0xF0EAD2 >> 16,
					gameModality === GAME_MODE.STATIC ? (0xA98467 >> 8) & 0xff : (0xF0EAD2 >> 8) & 0xff,
					gameModality === GAME_MODE.STATIC ? 0xA98467 & 0xff : 0xF0EAD2 & 0xff
				)
			);
		}

		// Start Game button (only visible to host)
		if (this.isHost) {
			startGame = this.add.text(resolution[0] / 2 + settingsOffset, resolution[1] / 1.2, "Start Game", { font: "bold 80px Arial", fill: "#F00" }).setOrigin(0.5);
			startGame.setPadding(15, 15, 15, 15);
			startGame.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
			startGame.setInteractive();
			startGame.on('pointerdown', function () {
				askForStartGame = true;
			});

			this.input.keyboard.on('keydown', function (event) {
				if (event.key == " " || event.key == "Enter") {
					game.anims.anims.clear() //Remove player animations before restarting the game
					game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game

					multiplayerSettingsScene.startGameForHost(settings, this);
					game.scene.stop("multiplayerSettingsScene");
				}
			});
		} else if (!this.isHost) {
			// Deshabilitar controles de configuración para invitado
			prevNote.disableInteractive();
			nextNote.disableInteractive();
			playOctaveButton.disableInteractive();
			prevScale.disableInteractive();
			nextScale.disableInteractive();
			gameModalityStatic.disableInteractive();
			gameModalityProgressive.disableInteractive();

			// Mostrar mensaje de espera más prominente
			this.add.text(resolution[0] / 2, resolution[1] / 1.2, "Waiting for host to start the game...",
				{ font: "bold 32px Arial", fill: "#6C584C" }).setOrigin(0.5);
			// Escuchar cuando el host inicia el juego
			WebRTCManager.onMessage((data) => {
				if (data.type === 'gameStarting' && data.roomCode === this.roomCode) {
					console.log("Starting game as guest...");
					multiplayerSettingsScene.startGameForGuest(data.settings, this);
				}
			});

			WebRTCManager.sendMessage({
				type: 'playerReady',
				roomCode: this.roomCode
			});

		}
	},
	update: function () {
		if (askForStartGame == true && this.isHost) {
			// Host inicia el juego
			const settings = {
				noteReference: firstNote,
				modalScaleName: modalScaleName,
				gameModality: gameModality
			};
			multiplayerSettingsScene.startGameForHost(settings, this);
		}

	},
	startGameForHost: function (settings, scene) {
		WebRTCManager.sendMessage({
			type: 'gameStarting',
			roomCode: scene.roomCode, // ✅ usamos `scene` en lugar de `this`
			settings: settings
		});

		game.anims.anims.clear();
		game.scene.stop("multiplayerSettingsScene");

		game.scene.start("playSceneMultiplayer", {
			roomCode: scene.roomCode,
			isHost: true,
			settings: settings
		});
	},

	startGameForGuest: function (settings, scene) {
		game.anims.anims.clear();

		game.scene.stop("splashScene");
		game.scene.stop("multiplayerScene");
		game.scene.stop("createRoomScene");
		game.scene.stop("joinRoomScene");
		game.scene.stop("multiplayerSettingsScene");

		game.scene.start("playSceneMultiplayer", {
			roomCode: scene.roomCode,
			isHost: false,
			settings: settings
		});
	}

	,
	shutdown: function () {
		// Clean up socket listeners
		WebRTCManager.offAll();
	}
};
game.scene.add("multiplayerSettingsScene", multiplayerSettingsScene);

var playSceneMultiplayer = {
	preload: function () {
		playerWidth = 19;
		playerHeight = 48;
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: playerWidth, frameHeight: playerHeight });
		this.load.spritesheet('player-fly', 'assets/player_fly.png', { frameWidth: 28, frameHeight: playerHeight });
		this.load.image('play', 'assets/play.png');
		this.load.image('pause', 'assets/pause.png');
		this.load.image('settings', 'assets/settings.png');
	},
	create: function (data) {
		console.log("Pantalla multijugador");
		console.log("Datos recibidos en playSceneMultiplayer:", data);
		if (!data || !data.roomCode) {
			console.error("No room ID provided - Returning to menu");
			game.scene.start("multiplayerScene");
			return;
		}

		// Guardar referencia al contexto
		accuracyList = [];
		const scene = this;
		this.scores = { player: 0, opponent: 0, lastUpdate: 0 };
		this.currentRoomId = data.roomCode || '';
		this.isHost = !!data.isHost;
		this.gameSettings = data.settings || {};

		if (this.gameSettings.noteReference) {
			firstNote = this.gameSettings.noteReference;
		}
		if (this.gameSettings.modalScaleName) {
			modalScaleName = this.gameSettings.modalScaleName;
		}
		if (typeof this.gameSettings.gameModality === 'number') {
			gameModality = this.gameSettings.gameModality;
		}

		changeNoteReference(firstNote);
    	changeScaleReference(modalScaleName);

		// Conexión WebRTC ya creada en escenas anteriores
		this.peerConnection = WebRTCManager.getPeerConnection?.();
		this.dataChannel = WebRTCManager.getDataChannel?.();
		console.log("🧩 Verificando conexión WebRTC en playSceneMultiplayer...");
		console.log("📡 peerConnection:", this.peerConnection);
		console.log("📦 dataChannel:", this.dataChannel);
		console.log("📦 dataChannel.readyState:", this.dataChannel?.readyState);

		// Intentar reconectar si la dataChannel no está abierta
		if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
			console.warn("⚠️ DataChannel no disponible. Intentando reconectar...");
			const socket = WebRTCManager.getSocket?.();

			if (socket && !this.peerConnection) {
				WebRTCManager.connect({
					roomCode: this.currentRoomId,
					isHost: this.isHost,
					onReady: ({ peerConnection, dataChannel }) => {
						console.log("🟢 Reconexión WebRTC establecida en playSceneMultiplayer");
						this.peerConnection = peerConnection;
						this.dataChannel = dataChannel;

						// Test de envío tras reconexión
						this.time.delayedCall(2000, () => {
							if (dataChannel?.readyState === 'open') {
								WebRTCManager.sendMessage({ type: "ping", from: this.isHost ? "host" : "guest" });
								console.log("📤 Enviado ping tras reconexión");
							}
						});
					}
				});
			}
		}





		if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
			console.warn("⚠️ DataChannel no está abierto en playSceneMultiplayer");
		}


		initVariables();
		gameContext = this;
		this.cameras.main.fadeIn(500, 255, 255, 255);
		createBackground(this);
		backgroundImage = this.add.image(resolution[0] / 2, resolution[1] / 2, 'background' + gameLevel);
		backgroundImage.setDepth(-2);
		backgroundImage.setAlpha(0);
		tween = this.add.tween({ targets: backgroundImage, ease: 'Sine.easeInOut', duration: 1000, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
		this.physics.world.setBounds(0, 0, resolution[0], resolution[1]);
		footer = this.add.text(resolution[0] / 2, resolution[1] - 20, "Copyright © 2025 - Rozo · Lopez", { font: "15px Arial", fill: platformColor }).setOrigin(0.5);
		player = this.physics.add.sprite(playerFixedX, playerInitialY, 'player').setScale(resolution[1] / 636);
		player.setCollideWorldBounds(false);
		player.body.setGravityY(-gravity);
		this.anims.create({
			key: 'playerRun',
			frames: this.anims.generateFrameNumbers('player', { start: 0, end: 8 }),
			frameRate: 15 * Math.sqrt(gameVelocity),
			repeat: -1
		});
		this.anims.create({
			key: 'playerStop',
			frames: [{ key: 'player', frame: 0 }],
			frameRate: 2
		});
		this.anims.create({
			key: 'playerFly',
			frames: this.anims.generateFrameNumbers('player-fly', { start: 0, end: 8 }),
			frameRate: 15 * Math.sqrt(gameVelocity),
			repeat: -1
		});
		platforms = this.physics.add.staticGroup();
		pointer = 0;
		j = 0;
		while (pointer < resolution[0]) {
			newLevel = generateLevel();
			levelValue = newLevel[0];
			levelHeight = newLevel[1];
			levelDuration = newLevel[2];
			createPlatformTexture(this, measurePlatformWidth * levelDuration, platformHeight, levelDuration);
			if (j == 0) {
				platformInitialX = (gameInitialX - playerWidth / 2) + ((measurePlatformWidth * levelDuration) / 2) - platformInitialPlayerOffset;
				pointer = platformInitialX;
			}
			else {
				pointer += (measurePlatformWidth * levelDuration) / 2;
			}
			lastCreatedPlatform = platforms.create(pointer, levelHeight, 'platform' + levelDuration + platformHeight);
			lastCreatedPlatform.level = levelValue;
			lastCreatedPlatform.duration = levelDuration;
			lastCreatedPlatform.changeLevel = false;
			if (changeLevelEvent) {
				lastCreatedPlatform.changeLevel = true;
				changeLevelEvent = false;
			}
			if (levelValue == 0) {
				lastCreatedPlatform.setVisible(false); //Hide texture
				lastCreatedPlatform.disableBody(); //Disable the body
			}
			levelsQueue.push(levelValue);
			pointer += (measurePlatformWidth * levelDuration) / 2;
			if (j == 0)
				currentPlatform = lastCreatedPlatform;
			j++;
		}
		levelValue = 1;
		levelHeight = (player.height * 3) + ((numberOfLevels - levelValue) * stepHeight) + (stepHeight / 2);
		levelDuration = 1 / 8;
		createPlatformTexture(this, measurePlatformWidth * levelDuration, 1, levelDuration);
		scalePlatform = platforms.create(playerFixedX, levelHeight, 'platform' + levelDuration + 1);
		scalePlatform.setVisible(false); //Hide texture
		//GRID GENERATION
		//------------------------------------------------------------------------------------------------------
		createGridTexture(this, measurePlatformWidth, timeSignature);
		measureGrids = this.physics.add.staticGroup();
		gridLength = measurePlatformWidth;
		numberOfInitialMeasures = resolution[0] / measurePlatformWidth;


		// Crear el grid con referencias de piano
		for (let i = 0; i < numberOfInitialMeasures; i++) {
			const gridX = (gameInitialX - (playerWidth / 2) + (gridLength / 2)) + (gridLength * i) - platformInitialPlayerOffset;
			const gridY = (resolution[1] / 2) + playerHeight;

			lastGrid = measureGrids.create(gridX, gridY, 'grid-texture');
			lastGrid.setDepth(-1);
			lastGrid.progressiveNumber = 0;

		}

		//Creation of collider between the player and the platforms, with a callback function
		collider = this.physics.add.collider(player, platforms, platformsColliderCallbackMultiplayer,null,this);
		scoreText = this.add.text(16, 16, 'Score: ' + score, { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });

		opponentScoreText = this.add.text(16, 40, 'Opponent: 0', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" }).setScrollFactor(0);
		this.startTime = this.time.now / 1000;
		this.timeText = this.add.text(200, 16, 'Time: 0s', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
		referenceNoteButton = this.add.text(resolution[0], playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
		referenceNoteButton.setBackgroundColor("#F0EAD2");
		referenceNoteButton.setPadding(8, 8, 8, 8);
		referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
		referenceNoteButton.setY(referenceNoteButton.y - 10);
		referenceNoteButton.setInteractive();
		referenceNoteButton.on('pointerdown', () => {
			buttonPlayReference();
		});
		currentScaleText = this.add.text(resolution[0] - ((resolution[0] - referenceNoteButton.x) - referenceNoteButton.width), playerHeight * 1.8, '', { fontSize: fontSize + 2 + 'px', fill: fontColor, fontFamily: "Arial" }).setOrigin(1);
		currentScaleTextDesc = this.add.text((resolution[0] - ((resolution[0] - referenceNoteButton.x) - referenceNoteButton.width)), playerHeight * 1.8, 'Current Scale: ', { fontSize: (fontSize - 4) + 'px', fill: fontColor, fontFamily: "Arial" }).setOrigin(1);
		currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);
		if (noteReference.substring(1, 2) == '#')
			currentNoteReference = noteReference.substring(0, 2);
		else
			currentNoteReference = noteReference.substring(0, 1);
		currentScaleText.setText('' + currentNoteReference + ' ' + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
		currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);
		this.input.on('pointerdown', function () {
		}, this);

		const initialStatusText = this.isHost ? "To Play =>!" : "Waiting for Host...";
		statusText = this.add.text(resolution[0] / 2, playerHeight * 3 / 2, initialStatusText, { font: "bold 40px Arial", fill: fontColor }).setOrigin(0.5);
		statusText.setShadow(2, 2, '#F0EAD2', 2);
		statusText.setAlign('center');
		tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
		statusTextSmall = this.add.text(resolution[0] / 2, playerHeight * 2, '', { font: "bold 25px Arial", fill: fontColor }).setOrigin(0.5);
		statusTextSmall.setShadow(2, 2, '#F0EAD2', 2);
		statusTextSmall.setAlign('center');
		centeredText = this.add.text(resolution[0] / 2, resolution[1] / 2, '', { font: "bold 190px Arial", fill: fontColor }).setOrigin(0.5);
		centeredText.setShadow(5, 5, '#F0EAD2', 5);
		centeredText.setAlign('center');
		if (this.isHost) {
			playPauseButton = this.add.image(resolution[0] - 100, (playerHeight * 0.6), 'play').setScale(0.8);
			playPauseButton.setInteractive();
			playPauseButton.on('pointerdown', function () {
				WebRTCManager.sendMessage({
					type: 'hostStartingGame',
					roomCode: this.roomCode
				});
				console.log("📤 Iniciar partida enviado vía WebRTC:", score);
				manageStatus();
			});
			settingsButton = this.add.image(resolution[0] - (playerHeight * resolution[1] / 636) / 2 - 10, (playerHeight * 0.6), 'settings').setScale(0.6);
			settingsButton.setInteractive();
			settingsButton.on('pointerdown', function () {
				game.scene.stop("playSceneMultiplayer");
				game.scene.stop("gamoverScene");
				game.scene.stop("pauseScene");
				game.scene.start("multiplayerSettingsScene");
			});
			gameStatus = "Started";
		} else if (!this.isHost) {
			WebRTCManager.onMessage((message) => {
				if (message.type === 'hostStartingGame' && message.roomCode === this.roomCode) {
					console.log("Starting game as guest...");
					manageStatus();
				}
			});
			gameStatus = "Started";
		}
	},

	update: function () {
		let elapsedTime = Math.floor((this.time.now / 1000) - this.startTime);
		let minutes = Math.floor(elapsedTime / 60);
		let seconds = elapsedTime % 60;
		let formattedTime = (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
		this.timeText.setText('Time: ' + formattedTime);
		if (game.scene.isActive("playSceneMultiplayer")) {
			measureGrids.getChildren().forEach(function (p) {
				if (p.x < -p.width / 2)
					p.destroy();
			})
			measureGrids.getChildren().forEach(function (p) {
				p.x = p.x - platformVelocity;
				p.body.x = p.body.x - platformVelocity;
			});
			if (lastGrid.x <= resolution[0] - measurePlatformWidth / 2) { //When the platform is completely on the screen, generate a new platform
				prevGridNumber = lastGrid.progressiveNumber;
				if (lastGrid.progressiveNumber == 0) { //The first to be created with update function
					lastGrid = measureGrids.create(resolution[0] + (measurePlatformWidth / 2) - 1, (resolution[1] / 2) + playerHeight, 'grid-texture');
					lastGrid.setDepth(-1);
				}
				else {
					lastGrid = measureGrids.create(resolution[0] + (measurePlatformWidth / 2), (resolution[1] / 2) + playerHeight, 'grid-texture');
					lastGrid.setDepth(-1);
				}
				lastGrid.progressiveNumber = prevGridNumber + 1;
			}
			if (lastCreatedPlatform.x <= resolution[0] - lastCreatedPlatform.width / 2) { //When the platform is completely on the screen, generate a new platform
				newLevel = generateLevel();
				levelValue = newLevel[0];
				levelHeight = newLevel[1];
				levelDuration = newLevel[2];
				createPlatformTexture(this, measurePlatformWidth * levelDuration, platformHeight, levelDuration);
				lastCreatedPlatform = platforms.create(resolution[0] + (measurePlatformWidth * levelDuration) / 2, levelHeight, 'platform' + levelDuration + platformHeight);
				lastCreatedPlatform.level = levelValue;
				lastCreatedPlatform.duration = levelDuration;
				lastCreatedPlatform.changeLevel = false;
				if (changeLevelEvent) {
					lastCreatedPlatform.changeLevel = true;
					changeLevelEvent = false;
				}
				if (levelValue == 0) {
					lastCreatedPlatform.setVisible(false);
					lastCreatedPlatform.disableBody();
				}

				levelsQueue.push(levelValue);
			}
			playerLeftBorder = (gameInitialX - player.width / 2);
			platforms.getChildren().forEach(function (p) {
				if (p.x < -p.width / 2)
					p.destroy();
			})
			platforms.getChildren().forEach(function (p) {
				p.x = p.x - platformVelocity;
				p.body.x = p.body.x - platformVelocity;
				platformLeftBorder = (p.x - (p.width / 2));
				currentPlatformWidth = currentPlatform.width;
				playerEnterJumpArea = (playerLeftBorder > platformLeftBorder + currentPlatformWidth - jumpAreaWidth) && ((playerLeftBorder - gameVelocity) <= (platformLeftBorder + currentPlatformWidth - jumpAreaWidth));
				if (playerEnterJumpArea) {
					jumpArea = true;
					noAnswer = true;
					fallBeforePause = false;
					if (levelsQueue[1] == 0) {
						pauseEvent = true;
						playerPauseY = player.y;
					}
				}
				currentPlatformChanged = (playerLeftBorder > platformLeftBorder) && (playerLeftBorder - gameVelocity <= platformLeftBorder);
				if (currentPlatformChanged) {
					if (levelsQueue[0] == 0) {
						pauseEvent = false;
						player.setGravityY(playerGravity);
					}
					levelsQueue.shift();
					if (levelsQueue[0] == 0) {
						playerEnterPause = true;
						if (pitchDetector.isEnable()) {
							pitchDetector.toggleEnable();
						}
					}
					else {
						playerEnterPause = false;
					}
					currentPlatform = p;
					if (noAnswer)
						goAhead = false;

					jumpArea = false;
				}
			})
			if (player.body.touching.down && playerFixedX == 200) {
				player.anims.play('playerRun', true);
				player.body.setGravityY(playerGravity);
				gameStatus = "Running";
				jumpFromPause = false;
				playerEndY = 0;
				endedPauseAnimation = false;
				if (score == 0) {
					score++;
					this.scores.player = score;
					scoreText.setText('Score: ' + score);
					if (this.dataChannel?.readyState === 'open') {
						WebRTCManager.sendMessage({
							type: "scoreUpdate",
							score: this.scores.player,
							timestamp: Date.now()
						});
						console.log("📤 Puntaje enviado vía WebRTC:", score);
					} else {
						console.warn("⚠️ No se pudo enviar el puntaje: canal cerrado");
					}
					const socket = WebRTCManager.getSocket?.();
					if (socket) {
						socket.emit('updateScore', {
							roomCode: this.currentRoomId,
							score: this.scores.player
						});
						console.log("📤 Puntaje enviado al servidor vía Socket.IO");
					}
					WebRTCManager.onMessage((message) => {
						this.handleMessage?.(message);
					});
					WebRTCManager.onMessage((message) => {
						console.log("📩 Mensaje recibido en playSceneMultiplayer:", message);
						this.scores.opponent = message.score;
						opponentScoreText.setText('Opponent: ' + this.scores.opponent);
					});

					this.time.delayedCall(500, () => {
						if (socket) {
							socket.on('updateScore', ({ roomCode, score }) => {
								console.log("🎉 Jugador recibio el puntaje via socket:", score);
								this.scores.opponent = score;
								opponentScoreText.setText('Opponent: ' + this.scores.opponent);
							});
						}
					});

					statusText.setText("Sing!");
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
					tween2 = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
					tween.setCallback(function () {
						statusText.setText();
						centeredText.setText();
					});
					if (noAnswer) {
						goAhead = false;
					}
				}
			}
			else {
				if (levelsQueue[0] != 0 || jumpFromPause) {
					nextExpectedNoteTime = performance.now();
					player.anims.play('playerStop', true);
				}
				platformTouched = false;
			}
			if (!player.body.touching.down) {
				if (player.y > playerPreviousY + 1 && collider.overlapOnly == true) {
					collider.overlapOnly = false;
				}
				playerPreviousY = player.y;
			}
			if (levelsQueue[1] == 0 && player.x > currentPlatform.x + currentPlatform.width / 2 + initialPauseStability && !fallBeforePause) {
				player.y = playerPauseY;
				player.body.y = playerPauseY;
				player.setGravityY(-gravity);
			}
			if (levelsQueue[0] == 0 && !jumpFromPause && pauseEvent) {
				player.body.setGravityY(-gravity);
				goAhead = true;
				if (playerEnterPause) {
					playerEndY = ((player.height * 3) + ((numberOfLevels - levelsQueue[1]) * stepHeight) + (stepHeight / 2)) - 5;
					pauseStepTween = gameContext.add.tween({ targets: player, ease: 'Sine.easeInOut', duration: (currentPlatform.duration * 10000), delay: 0, y: { getStart: () => playerPauseY, getEnd: () => playerEndY } });
					pauseStepTween.setCallback("onComplete", function () {
						endedPauseAnimation = true;
						if (!pitchDetector.isEnable()) {
							pitchDetector.toggleEnable();
						}
					}, player);
					playerEnterPause = false;
					if (currentPlatform.changeLevel && gameModality == GAME_MODE.PROGRESSIVE) {
						changeLevelAndBackground();
						currentScaleTextTween = gameContext.add.tween({ targets: currentScaleText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
						currentScaleTextDescTween = gameContext.add.tween({ targets: currentScaleTextDesc, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
						currentScaleTextTween.setCallback("onComplete", function () {
							if (noteReference.substring(1, 2) == '#')
								currentNoteReference = noteReference.substring(0, 2);
							else
								currentNoteReference = noteReference.substring(0, 1);
							currentScaleText.setText('' + currentNoteReference + ' ' + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
							currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);
						}, currentScaleText);
						gameContext.add.tween({ targets: currentScaleText, ease: 'Sine.easeInOut', duration: 300, delay: 300, alpha: { getStart: () => 0, getEnd: () => 1 } });
						gameContext.add.tween({ targets: currentScaleTextDesc, ease: 'Sine.easeInOut', duration: 300, delay: 300, alpha: { getStart: () => 0, getEnd: () => 1 } });
					}
				}
				if (endedPauseAnimation) {
					player.y = playerEndY;
					player.body.y = playerEndY;
				}
				if (player.x - playerWidth / 2 - 5 > currentPlatform.x - currentPlatform.width / 2 && player.x + playerWidth / 2 < currentPlatform.x + currentPlatform.width / 2) {
					player.anims.play('playerFly', true);
				}
			}
			if (gameStatus == "Intro") {
				if (player.body.touching.down && initialScaleNote + 1 < 8) {
					initialScaleNote++;
					playLevel(initialScaleNote);
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 1.5, 1 / 2));
					collider.overlapOnly = true;
					levelValue = initialScaleNote + 1;
					levelHeight = (player.height * 3) + ((numberOfLevels - levelValue) * stepHeight) + (stepHeight / 2);
					levelDuration = 1 / 8;
					createPlatformTexture(this, measurePlatformWidth * levelDuration, 1, levelDuration);
					scalePlatform = platforms.create(playerFixedX, levelHeight, 'platform' + levelDuration + 1);
					scalePlatform.setVisible(false);
				}
				else if (player.body.touching.down && countdown > 1) {
					countdown--;
					if (countdown == 3) {
						initialScaleNote++;
						playLevel(initialScaleNote);
						statusText.setAlpha(0);
						statusText.setText("Ready?!");
						statusTextTween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
					}
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 2 * (636 / resolution[1]), 1 / 2));
					centeredText.setAlpha(0);
					centeredText.setText(countdown);
					centeredTextTween = gameContext.add.tween({ targets: centeredText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else if (player.body.touching.down) {
					countdown--;
					centeredText.setText();
					statusText.setText("Sing!");
					noAnswer = true;
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 2.3 * (636 / resolution[1]), 1 / 2));
					if (!pitchDetector.isEnable())
						pitchDetector.toggleEnable();
					t = gameContext.add.tween({ targets: player, ease: 'Sine.easeInOut', duration: (800 / Math.sqrt(introVelocity * 1.5)) * Math.sqrt(resolution[1] / 636) * 1.1, delay: 0, x: { getStart: () => playerFixedX, getEnd: () => gameInitialX } });
					t.setCallback("onComplete", function () {
						playerFixedX = gameInitialX;
						player.setGravityY(playerGravity);
					}, player);
				}
			}
			if (gameStatus == "Running")
				platformVelocity = gameVelocity;
			if (player.y > resolution[1] + player.height / 2) {
				game.scene.stop("playSceneMultiplayer");
				game.scene.start("gameoverScene", { time: elapsedTime, score: score, scoreOpponent: this.scores.opponent, gameLevel: gameLevel, gameVelocity: gameVelocity, detectedNote: lastDetectedNote || "—", expectedNote: convertLevelToNote(levelsQueue[0]) || "—" });
			}
			if (!goAhead) {
				if (gameStatus == "Running") {
					player.body.setGravityY(playerGravity);
					player.angle += 5;
				}
				this.physics.world.colliders.destroy();
			}
		}

	},
	sendData: function (data) {
		//WebRTCManager.sendMessage(data);
	},
	handleMessage: function (message) {
		try {
			if (message.type === "scoreUpdate") {
				console.log("🎯 Puntaje del oponente recibido:", message.score);
				this.scores.opponent = message.score;
				if (this.opponentScoreText?.setText) {
					opponentScoreText.setText('Opponent: ' + message.score);
				} else {
					console.warn("⚠️ opponentScoreText no está listo para actualizar");
				}
			}
		} catch (error) {
			console.error("❌ Error al procesar mensaje WebRTC:", error);
		}
	},
	handleDisconnection: function () {
		const warningText = this.add.text(resolution[0] / 2, resolution[1] / 2,
			"OPPONENT DISCONNECTED\nReturning to menu...",
			{
				font: "bold 32px Arial",
				fill: "#FF5555",
				align: "center",
				backgroundColor: "#333"
			}).setOrigin(0.5);

		setTimeout(() => {
			game.scene.stop("playSceneMultiplayer");
			game.scene.start("multiplayerScene");
		}, 3000);
	},

	handleReconnection: function () {
		// Re-enviar el puntaje actual al reconectar
		/*if (this.scores.player > 0) {
			WebRTCManager.sendMessage({
				type: "scoreUpdate",
				roomId: this.currentRoomId,
				score: this.scores.player,
				timestamp: Date.now()
			});
		}*/

		// Mostrar notificación al jugador
		const reconnectText = this.add.text(resolution[0] / 2, 100,
			"Connection reestablished!",
			{
				font: "bold 24px Arial",
				fill: "#4CAF50",
				backgroundColor: "#333"
			}).setOrigin(0.5);

		this.tweens.add({
			targets: reconnectText,
			alpha: 0,
			duration: 2000,
			delay: 1000,
			onComplete: () => reconnectText.destroy()
		});
	},
	shutdown: function () {
		// Limpiar listeners de socket
		WebRTCManager.offAll();
	}
};
game.scene.add("playSceneMultiplayer", playSceneMultiplayer);

var playScene = {
	preload: function () {
		//Needed to be set here to set the player dimension correctly
		playerWidth = 19;
		playerHeight = 48;

		//Loading of game resources
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: playerWidth, frameHeight: playerHeight });
		this.load.spritesheet('player-fly', 'assets/player_fly.png', { frameWidth: 28, frameHeight: playerHeight });
		this.load.image('play', 'assets/play.png');
		this.load.image('pause', 'assets/pause.png');
		this.load.image('settings', 'assets/settings.png');
	},
	create: function () {

		initVariables();
		gameContext = this;

		this.cameras.main.fadeIn(500, 255, 255, 255);

		//WORLD
		//------------------------------------------------------------------------------------------------------
		//Add Background
		createBackground(this); //Draw the background texture
		backgroundImage = this.add.image(resolution[0] / 2, resolution[1] / 2, 'background' + gameLevel);
		backgroundImage.setDepth(-2);
		backgroundImage.setAlpha(0); //In order to create a fade-in animation for the background
		tween = this.add.tween({ targets: backgroundImage, ease: 'Sine.easeInOut', duration: 1000, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

		//Set world bounds
		accuracyList = [];
		this.physics.world.setBounds(0, 0, resolution[0], resolution[1]);

		//Footer
		footer = this.add.text(resolution[0] / 2, resolution[1] - 20, "Copyright © 2025 - Rozo · Lopez", { font: "15px Arial", fill: platformColor }).setOrigin(0.5);

		//PLAYER
		//------------------------------------------------------------------------------------------------------
		player = this.physics.add.sprite(playerFixedX, playerInitialY, 'player').setScale(resolution[1] / 636);
		player.setCollideWorldBounds(false); //So the player can exceed the world boundaries
		player.body.setGravityY(-gravity); //For the player to have an y acceleration; set to (-gravity) to make the player have no y motion at first
		//player.setTint(0x000000); //Set a color mask for the player

		//Player Animations Creation
		this.anims.create({
			key: 'playerRun',
			frames: this.anims.generateFrameNumbers('player', { start: 0, end: 8 }),
			frameRate: 15 * Math.sqrt(gameVelocity), //To set the veloticy of "rotation" dependent to the gameVelocity
			repeat: -1 //loop=true
		});

		this.anims.create({
			key: 'playerStop',
			frames: [{ key: 'player', frame: 0 }],
			frameRate: 2
		});

		this.anims.create({
			key: 'playerFly',
			frames: this.anims.generateFrameNumbers('player-fly', { start: 0, end: 8 }),
			frameRate: 15 * Math.sqrt(gameVelocity), //To set the veloticy of "rotation" dependent to the gameVelocity
			repeat: -1 //loop=true
		});

		//PLATFORMS GENERATION
		//------------------------------------------------------------------------------------------------------
		platforms = this.physics.add.staticGroup(); //Platforms empty group creation

		//Generation of the platforms visible when the game starts

		pointer = 0;
		j = 0;
		while (pointer < resolution[0]) {
			newLevel = generateLevel();
			levelValue = newLevel[0];
			levelHeight = newLevel[1];
			levelDuration = newLevel[2];
			createPlatformTexture(this, measurePlatformWidth * levelDuration, platformHeight, levelDuration);
			if (j == 0) {
				platformInitialX = (gameInitialX - playerWidth / 2) + ((measurePlatformWidth * levelDuration) / 2) - platformInitialPlayerOffset;
				pointer = platformInitialX;
			}
			else {
				pointer += (measurePlatformWidth * levelDuration) / 2;
			}

			lastCreatedPlatform = platforms.create(pointer, levelHeight, 'platform' + levelDuration + platformHeight);
			lastCreatedPlatform.level = levelValue;
			lastCreatedPlatform.duration = levelDuration;
			lastCreatedPlatform.changeLevel = false;
			if (changeLevelEvent) {
				lastCreatedPlatform.changeLevel = true;
				changeLevelEvent = false;
			}

			if (levelValue == 0) {
				lastCreatedPlatform.setVisible(false); //Hide texture
				lastCreatedPlatform.disableBody(); //Disable the body
			}

			levelsQueue.push(levelValue);
			//console.log("levelsQueue: ",levelsQueue);

			pointer += (measurePlatformWidth * levelDuration) / 2;

			//Set the first platform as current platform when the game starts
			if (j == 0)
				currentPlatform = lastCreatedPlatform;

			j++;

		}

		//INITIAL SCALE, FIRST HIDDEN PLATFORM GENERATION
		levelValue = 1;
		levelHeight = (player.height * 3) + ((numberOfLevels - levelValue) * stepHeight) + (stepHeight / 2);
		levelDuration = 1 / 8;

		createPlatformTexture(this, measurePlatformWidth * levelDuration, 1, levelDuration);

		scalePlatform = platforms.create(playerFixedX, levelHeight, 'platform' + levelDuration + 1);
		scalePlatform.setVisible(false); //Hide texture


		//GRID GENERATION
		//------------------------------------------------------------------------------------------------------
		createGridTexture(this, measurePlatformWidth, timeSignature); //Draw grid texture
		measureGrids = this.physics.add.staticGroup(); //Grids empty group creation

		gridLength = measurePlatformWidth;
		numberOfInitialMeasures = resolution[0] / measurePlatformWidth;


		// Crear el grid con referencias de piano
		for (let i = 0; i < numberOfInitialMeasures; i++) {
			const gridX = (gameInitialX - (playerWidth / 2) + (gridLength / 2)) + (gridLength * i) - platformInitialPlayerOffset;
			const gridY = (resolution[1] / 2) + playerHeight;

			lastGrid = measureGrids.create(gridX, gridY, 'grid-texture');
			lastGrid.setDepth(-1);
			lastGrid.progressiveNumber = 0;
		}


		//Creation of collider between the player and the platforms, with a callback function
		collider = this.physics.add.collider(player, platforms, platformsColliderCallback);


		//SCORE
		//------------------------------------------------------------------------------------------------------
		scoreText = this.add.text(16, 16, 'Score: ' + score, { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });

		// Tiempo transcurrido en segundos
		this.startTime = this.time.now / 1000;

		// Texto del cronómetro
		this.timeText = this.add.text(200, 16, 'Time: 0s', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });


		//Change Reference Button
		referenceNoteButton = this.add.text(resolution[0], playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
		referenceNoteButton.setBackgroundColor("#F0EAD2");
		referenceNoteButton.setPadding(8, 8, 8, 8);
		referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
		referenceNoteButton.setY(referenceNoteButton.y - 10);
		referenceNoteButton.setInteractive();
		referenceNoteButton.on('pointerdown', () => {
			buttonPlayReference();
		});

		//Current Mode visualization
		currentScaleText = this.add.text(resolution[0] - ((resolution[0] - referenceNoteButton.x) - referenceNoteButton.width), playerHeight * 1.8, '', { fontSize: fontSize + 2 + 'px', fill: fontColor, fontFamily: "Arial" }).setOrigin(1);
		currentScaleTextDesc = this.add.text((resolution[0] - ((resolution[0] - referenceNoteButton.x) - referenceNoteButton.width)), playerHeight * 1.8, 'Current Scale: ', { fontSize: (fontSize - 4) + 'px', fill: fontColor, fontFamily: "Arial" }).setOrigin(1);
		currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);

		if (noteReference.substring(1, 2) == '#')
			currentNoteReference = noteReference.substring(0, 2);
		else
			currentNoteReference = noteReference.substring(0, 1);
		currentScaleText.setText('' + currentNoteReference + ' ' + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
		currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);

		//Touch input MANAGER
		this.input.on('pointerdown', function () {
		}, this);

		//INTRO MANAGER
		//------------------------------------------------------------------------------------------------------
		statusText = this.add.text(resolution[0] / 2, playerHeight * 3 / 2, 'Space/Enter To Play!', { font: "bold 40px Arial", fill: fontColor }).setOrigin(0.5);
		statusText.setShadow(2, 2, '#F0EAD2', 2);
		statusText.setAlign('center');
		tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

		statusTextSmall = this.add.text(resolution[0] / 2, playerHeight * 2, '', { font: "bold 25px Arial", fill: fontColor }).setOrigin(0.5);
		statusTextSmall.setShadow(2, 2, '#F0EAD2', 2);
		statusTextSmall.setAlign('center');

		centeredText = this.add.text(resolution[0] / 2, resolution[1] / 2, '', { font: "bold 190px Arial", fill: fontColor }).setOrigin(0.5);
		centeredText.setShadow(5, 5, '#F0EAD2', 5);
		centeredText.setAlign('center');

		// PLAY - SETTINGS BUTTONS
		playPauseButton = this.add.image(resolution[0] - 100, (playerHeight * 0.6), 'play').setScale(0.8);
		playPauseButton.setInteractive();
		playPauseButton.on('pointerdown', function () {
			manageStatusSingle();
		});

		//Settings button
		settingsButton = this.add.image(resolution[0] - (playerHeight * resolution[1] / 636) / 2 - 10, (playerHeight * 0.6), 'settings').setScale(0.6);
		settingsButton.setInteractive();
		settingsButton.on('pointerdown', function () {
			game.scene.stop("playScene");
			game.scene.stop("gamoverSceneSingle");
			game.scene.stop("pauseSceneSingle");
			game.scene.start("settingsScene");
		});

		//SETTING OF GAME STATUS
		//------------------------------------------------------------------------------------------------------
		gameStatus = "Started";
	},

	update: function () {
		let elapsedTime = Math.floor((this.time.now / 1000) - this.startTime);
		let minutes = Math.floor(elapsedTime / 60);
		let seconds = elapsedTime % 60;

		// Formatear con ceros a la izquierda
		let formattedTime = (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;

		this.timeText.setText('Time: ' + formattedTime);
		if (game.scene.isActive("playScene")) {
			//GRID MANAGER
			//------------------------------------------------------------------------------------------------------
			measureGrids.getChildren().forEach(function (p) {
				if (p.x < -p.width / 2)
					p.destroy(); //Remove grids that are no more visible
			})

			measureGrids.getChildren().forEach(function (p) {
				//Move grids (body and texture)
				p.x = p.x - platformVelocity;
				p.body.x = p.body.x - platformVelocity;
			});

			//Creation of new grid measures
			if (lastGrid.x <= resolution[0] - measurePlatformWidth / 2) { //When the platform is completely on the screen, generate a new platform
				prevGridNumber = lastGrid.progressiveNumber;

				if (lastGrid.progressiveNumber == 0) { //The first to be created with update function
					lastGrid = measureGrids.create(resolution[0] + (measurePlatformWidth / 2) - 1, (resolution[1] / 2) + playerHeight, 'grid-texture');
					lastGrid.setDepth(-1);
				}
				else {
					lastGrid = measureGrids.create(resolution[0] + (measurePlatformWidth / 2), (resolution[1] / 2) + playerHeight, 'grid-texture');
					lastGrid.setDepth(-1);
				}
				lastGrid.progressiveNumber = prevGridNumber + 1;
			}


			// PLATFORMS MANAGER: MOVEMENT, REMOVAL, CONDITIONS
			//------------------------------------------------------------------------------------------------------
			//Creation of new platforms
			if (lastCreatedPlatform.x <= resolution[0] - lastCreatedPlatform.width / 2) { //When the platform is completely on the screen, generate a new platform
				newLevel = generateLevel();
				levelValue = newLevel[0];
				levelHeight = newLevel[1];
				levelDuration = newLevel[2];
				createPlatformTexture(this, measurePlatformWidth * levelDuration, platformHeight, levelDuration);
				lastCreatedPlatform = platforms.create(resolution[0] + (measurePlatformWidth * levelDuration) / 2, levelHeight, 'platform' + levelDuration + platformHeight);
				lastCreatedPlatform.level = levelValue;
				lastCreatedPlatform.duration = levelDuration;
				lastCreatedPlatform.changeLevel = false;
				if (changeLevelEvent) {
					lastCreatedPlatform.changeLevel = true;
					changeLevelEvent = false;
				}

				if (levelValue == 0) {
					lastCreatedPlatform.setVisible(false); //Hide texture
					lastCreatedPlatform.disableBody(); //Disable the body
				}

				levelsQueue.push(levelValue);
				//console.log("levelsQueue: ",levelsQueue);
			}

			playerLeftBorder = (gameInitialX - player.width / 2);

			platforms.getChildren().forEach(function (p) {
				if (p.x < -p.width / 2)
					p.destroy(); //Remove platforms that are no more visible
			})

			platforms.getChildren().forEach(function (p) {

				//PLATFORM MOVEMENT-REMOVAL MANAGEMENT
				//------------------------------------------------------------------------------------------------------
				//Move platforms (body and texture)
				p.x = p.x - platformVelocity;
				p.body.x = p.body.x - platformVelocity;

				//PLATFORMS CONDITIONAL EVENTS
				//------------------------------------------------------------------------------------------------------
				platformLeftBorder = (p.x - (p.width / 2));
				currentPlatformWidth = currentPlatform.width;

				//Set jumpArea when the player enter the jumpArea
				playerEnterJumpArea = (playerLeftBorder > platformLeftBorder + currentPlatformWidth - jumpAreaWidth) && ((playerLeftBorder - gameVelocity) <= (platformLeftBorder + currentPlatformWidth - jumpAreaWidth));
				if (playerEnterJumpArea) {
					//console.log("Entered jump area");
					jumpArea = true;
					noAnswer = true; //Answer again ungiven
					fallBeforePause = false;

					if (levelsQueue[1] == 0) {
						pauseEvent = true;
						playerPauseY = player.y;
						//console.log("playerPauseY", playerPauseY);
					}
				}

				currentPlatformChanged = (playerLeftBorder > platformLeftBorder) && (playerLeftBorder - gameVelocity <= platformLeftBorder); //Condition to summarize when the player enter on another platform

				//Current Platform Changed Event: if no events are triggered before the platform changes, the player was wrong and it has to die, otherwise it jumps to another platform
				if (currentPlatformChanged) {

					//If the player is exiting a pause
					if (levelsQueue[0] == 0) { //The step in which the player enter is levelsQueue[1] because it's before the shift of the removal
						pauseEvent = false;
						player.setGravityY(playerGravity);
					}

					levelsQueue.shift(); //Remove the first element of the list
					//console.log('remove item!: ', levelsQueue);

					//If the player is entering a pause
					if (levelsQueue[0] == 0) {
						playerEnterPause = true;
						if (pitchDetector.isEnable()) {
							pitchDetector.toggleEnable();
							//console.log("Pitch detector OFF");
						}
					}
					else {
						playerEnterPause = false;
					}

					currentPlatform = p;

					if (noAnswer) //Answer ungiven: the player should die
						goAhead = false;

					jumpArea = false;//Not anymore in the jump area

				}
			})


			//PLAYER ANIMATION MANAGER
			//------------------------------------------------------------------------------------------------------
			if (player.body.touching.down && playerFixedX == 200) {
				player.anims.play('playerRun', true);
				player.body.setGravityY(playerGravity);
				gameStatus = "Running"; //The first time change the game status from Started to Running

				//Reset Pause variables when the player touch a platform
				jumpFromPause = false;
				playerEndY = 0;
				endedPauseAnimation = false;

				//Enter only the first time (at the first collide with a step)
				if (score == 0) {
					score++;
					scoreText.setText('score: ' + score);
					statusText.setText("Sing!");

					//Hide intro and centered text
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
					tween2 = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
					tween.setCallback(function () {
						statusText.setText();
						centeredText.setText();
					});

					//Check if the first note is played correctly
					if (noAnswer) {
						goAhead = false;
					}
				}
			}
			else {
				if (levelsQueue[0] != 0 || jumpFromPause) {
					player.anims.play('playerStop', true);
					nextExpectedNoteTime = performance.now();
				}
				platformTouched = false;
			}

			//Make it possible to pass through the platform if the player comes from below
			if (!player.body.touching.down) {
				if (player.y > playerPreviousY + 1 && collider.overlapOnly == true) {
					collider.overlapOnly = false;
				}
				playerPreviousY = player.y;
			}

			// PAUSE MANAGER
			//------------------------------------------------------------------------------------------------------

			//Avoid little initial falling of the player
			if (levelsQueue[1] == 0 && player.x > currentPlatform.x + currentPlatform.width / 2 + initialPauseStability && !fallBeforePause) {
				player.y = playerPauseY;
				player.body.y = playerPauseY;
				player.setGravityY(-gravity);
			}
			//Pause Event Handler
			if (levelsQueue[0] == 0 && !jumpFromPause && pauseEvent) {
				player.body.setGravityY(-gravity); //In order to make the player FLOW
				goAhead = true; //The player can keep going even if there was no answer (pause: you stay silent)

				//This condition is entered only once when the pause starts
				if (playerEnterPause) {
					playerEndY = ((player.height * 3) + ((numberOfLevels - levelsQueue[1]) * stepHeight) + (stepHeight / 2)) - 5; //Save the player y position (need to create the animation)

					//Player translation animation
					pauseStepTween = gameContext.add.tween({ targets: player, ease: 'Sine.easeInOut', duration: (currentPlatform.duration * 10000), delay: 0, y: { getStart: () => playerPauseY, getEnd: () => playerEndY } });
					//console.log("Start animation");
					pauseStepTween.setCallback("onComplete", function () {
						endedPauseAnimation = true;
						if (!pitchDetector.isEnable()) {
							pitchDetector.toggleEnable();
							//console.log("End Animation");
						}
					}, player);

					playerEnterPause = false; //condition should not enter anymore

					//Detect of "change level" type of pause and call of change level and background
					if (currentPlatform.changeLevel && gameModality == GAME_MODE.PROGRESSIVE) {
						changeLevelAndBackground();
						currentScaleTextTween = gameContext.add.tween({ targets: currentScaleText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
						currentScaleTextDescTween = gameContext.add.tween({ targets: currentScaleTextDesc, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 1, getEnd: () => 0 } });
						currentScaleTextTween.setCallback("onComplete", function () {
							if (noteReference.substring(1, 2) == '#')
								currentNoteReference = noteReference.substring(0, 2);
							else
								currentNoteReference = noteReference.substring(0, 1);
							currentScaleText.setText('' + currentNoteReference + ' ' + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
							currentScaleTextDesc.setX(currentScaleText.x - currentScaleText.width);
						}, currentScaleText);
						gameContext.add.tween({ targets: currentScaleText, ease: 'Sine.easeInOut', duration: 300, delay: 300, alpha: { getStart: () => 0, getEnd: () => 1 } });
						gameContext.add.tween({ targets: currentScaleTextDesc, ease: 'Sine.easeInOut', duration: 300, delay: 300, alpha: { getStart: () => 0, getEnd: () => 1 } });
					}
				}

				if (endedPauseAnimation) {
					player.y = playerEndY;
					player.body.y = playerEndY;
				}

				//Condition needed because the playerWidth with the wings is greater than the normal player
				if (player.x - playerWidth / 2 - 5 > currentPlatform.x - currentPlatform.width / 2 && player.x + playerWidth / 2 < currentPlatform.x + currentPlatform.width / 2) {
					player.anims.play('playerFly', true);
				}
			}

			//INITIAL SCALE ANIMATION MANAGER
			//------------------------------------------------------------------------------------------------------
			if (gameStatus == "Intro") {
				if (player.body.touching.down && initialScaleNote + 1 < 8) {
					initialScaleNote++;
					playLevel(initialScaleNote);
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 1.5, 1 / 2));
					collider.overlapOnly = true;

					//INITIAL SCALE, HIDDEN PLATFORMS GENERATION
					levelValue = initialScaleNote + 1;
					levelHeight = (player.height * 3) + ((numberOfLevels - levelValue) * stepHeight) + (stepHeight / 2);
					levelDuration = 1 / 8;

					createPlatformTexture(this, measurePlatformWidth * levelDuration, 1, levelDuration);

					scalePlatform = platforms.create(playerFixedX, levelHeight, 'platform' + levelDuration + 1);
					scalePlatform.setVisible(false); //Hide texture
				}
				else if (player.body.touching.down && countdown > 1) {
					countdown--;
					if (countdown == 3) {
						initialScaleNote++;
						playLevel(initialScaleNote);
						statusText.setAlpha(0);
						statusText.setText("Ready?!");
						statusTextTween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
					}
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 2 * (636 / resolution[1]), 1 / 2));
					centeredText.setAlpha(0);
					centeredText.setText(countdown);
					centeredTextTween = gameContext.add.tween({ targets: centeredText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else if (player.body.touching.down) { //If you are at the last step, the game should start
					countdown--; //Bring countdown to 0
					centeredText.setText();
					statusText.setText("Sing!");
					noAnswer = true;
					player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 2.3 * (636 / resolution[1]), 1 / 2));

					//Starting Pitch Detector (the condition is not mandatory)
					if (!pitchDetector.isEnable())
						pitchDetector.toggleEnable();

					t = gameContext.add.tween({ targets: player, ease: 'Sine.easeInOut', duration: (800 / Math.sqrt(introVelocity * 1.5)) * Math.sqrt(resolution[1] / 636) * 1.1, delay: 0, x: { getStart: () => playerFixedX, getEnd: () => gameInitialX } });
					t.setCallback("onComplete", function () {
						playerFixedX = gameInitialX;
						player.setGravityY(playerGravity);
					}, player);
				}
			}

			//GAME VELOCITY MANAGER
			//------------------------------------------------------------------------------------------------------
			if (gameStatus == "Running")
				platformVelocity = gameVelocity; //Keeps the platforms velocity updated since when the game is Running

			//GAME OVER HANDLER
			//------------------------------------------------------------------------------------------------------
			if (player.y > resolution[1] + player.height / 2) { //When the player is below the screen resolution (no more visible), go to gameoverScene
				game.scene.stop("playScene");
				game.scene.start("gameoverSceneSingle", {
					time: elapsedTime,
					score: score,
					gameLevel: gameLevel,
					gameVelocity: gameVelocity,
					detectedNote: lastDetectedNote || "—",
					expectedNote: convertLevelToNote(levelsQueue[0]) || "—"
				});
			}

			//GO TO DEATH MANAGER
			//------------------------------------------------------------------------------------------------------
			if (!goAhead) { //If the player can't go ahead, the colliders with the world are destroyed
				if (gameStatus == "Running") {
					player.body.setGravityY(playerGravity); //Needed to fall when in a pause step
					player.angle += 5; //Death Animation
				}
				this.physics.world.colliders.destroy();
			}
		}
	}
}
game.scene.add("playScene", playScene);

var pauseScene = {
	create: function () {
		//Change Reference Button
		referenceNoteButton.destroy();
		referenceNoteButton = this.add.text(resolution[0], playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
		referenceNoteButton.setBackgroundColor("#F0EAD2");
		referenceNoteButton.setPadding(8, 8, 8, 8);
		referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
		referenceNoteButton.setY(referenceNoteButton.y - 10);
		referenceNoteButton.setInteractive();
		referenceNoteButton.on('pointerdown', () => {
			buttonPlayReference();
		});

		//Set Status Text
		statusTextSmall.setText("");
		statusText.setAlpha(0);
		statusText.setY(playerHeight * 3 / 2);
		statusText.setText('Game Paused\nEnter/Space to resume...');
		tween = this.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

		//Settings button
		settingsButton = this.add.image(resolution[0] - (playerHeight * resolution[1] / 636) / 2 - 10, (playerHeight * 0.6), 'settings').setScale(0.6);
		settingsButton.setInteractive();
		settingsButton.on('pointerdown', function () {
			game.scene.stop("playSceneMultiplayer");
			game.scene.stop("gamoverScene");
			game.scene.stop("pauseScene");
			game.scene.start("MultiPlayerSettingsScene");
		});
	}
}
game.scene.add("pauseScene", pauseScene);

var gameoverScene = {
	init(data) {
	  this.time = data.time;
	  this.score = data.score;
	  this.scoreOpponent = data.scoreOpponent;
	  this.gameLevel = data.gameLevel;
	  this.gameVelocity = data.gameVelocity;
	  this.detectedNote = data.detectedNote || "—";
	  this.expectedNote = data.expectedNote || "—";
	  this.roomCode = data.roomCode;
	},
	preload() {
	  this.load.image('restart', 'assets/restart.png');
	},
	create() {
	  gameoverContext = this;
	  gameStatus = "Gameover";
	  player.destroy();
	  this.cameras.main.setBackgroundColor('#FFFFE0');
	  this.add.rectangle(0, 0, resolution[0], resolution[1], 0xffffff, 1).setOrigin(0);
	  this.cameras.main.fadeIn(500, 255, 255, 255);
	  this.notesGroup = this.add.group();
	  let noteKeys = ['note1', 'note2', 'note3', 'player'];
	  for (let i = 0; i < 12; i++) {
		let key = Phaser.Utils.Array.GetRandom(noteKeys);
		let note = this.add.image(
		  Phaser.Math.Between(0, resolution[0]),
		  Phaser.Math.Between(0, resolution[1]),
		  key
		).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
		this.notesGroup.add(note);
		this.tweens.add({
		  targets: note,
		  y: note.y - Phaser.Math.Between(20, 40),
		  duration: Phaser.Math.Between(3000, 5000),
		  yoyo: true,
		  repeat: -1,
		  ease: 'Sine.easeInOut',
		  delay: Phaser.Math.Between(0, 1000)
		});
	  }
	  this.add.text(resolution[0] / 2, resolution[1] / 2 - 140, "🎮 GAME RESULTS", {
		font: "32px Arial",
		fill: "#222",
		fontStyle: "bold"
	  }).setOrigin(0.5);
	  const avgAccuracy = accuracyList.length > 0
		? (accuracyList.reduce((a, b) => a + b, 0) / accuracyList.length).toFixed(1)
		: "N/A";
	  this.add.text(resolution[0] / 2, resolution[1] / 2 - 80, `⏱ Time: ${this.time} seconds`, { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  this.add.text(resolution[0] / 2, resolution[1] / 2 - 45, `🎯 Your score: ${this.score}`, { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  this.opponentScoreText = this.add.text(
		resolution[0] / 2,
		resolution[1] / 2 - 10,
		`👤 Opponent score: ${this.scoreOpponent}`,
		{ font: "22px Arial", fill: "#333", align: "center" }
	  ).setOrigin(0.5);
	  this.add.text(resolution[0] / 2, resolution[1] / 2 + 20, `🎵 Level: ${this.gameLevel}`, { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  this.add.text(resolution[0] / 2, resolution[1] / 2 + 55, `🧠 You played: ${this.detectedNote} — Expected: ${this.expectedNote}`, { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  this.add.text(resolution[0] / 2, resolution[1] / 2 + 90, `🎯 Accuracy Time: ${avgAccuracy}%`, { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  this.add.text(resolution[0] / 2, resolution[1] / 2 + 125, "🔁 Press Enter to try again", { font: "22px Arial", fill: "#333", align: "center" }).setOrigin(0.5);
	  WebRTCManager.onMessage((message) => {
		if (message.type === 'scoreUpdate' && message.roomCode === this.roomCode) {
		  this.scoreOpponent = message.score;
		  this.opponentScoreText.setText(`👤 Opponent score: ${this.scoreOpponent}`);
		}
	  });
	  const noteButton = this.add.text(resolution[0] / 2, resolution[1] - 20, '🔊 Listen to expected note', { font: '20px Arial', fill: '#000', backgroundColor: '#F0EAD2', padding: { x: 12, y: 6 } }).setOrigin(0.5).setInteractive();
	  noteButton.on('pointerdown', () => { playNote(this.expectedNote, 1.5); });
	  settingsButton = gameoverContext.add.image(resolution[0] - 50, 50, 'settings').setScale(0.6).setInteractive();
	  settingsButton.on('pointerdown', function () {
		game.scene.stop("playSceneMultiplayer");
		game.scene.stop("gameoverScene");
		game.scene.stop("pauseScene");
		game.scene.start("splashScene");
	  });
	  playPauseButton?.destroy();
	  playPauseButton = this.add.image(resolution[0] - 110, 50, 'restart').setScale(0.6).setInteractive();
	  playPauseButton.on('pointerdown', () => {
		game.anims.anims.clear();
		game.textures.remove("grid-texture");
		game.scene.start("playSceneMultiplayer");
		game.scene.stop("gameoverScene");
	  });
	  this.input.keyboard.on('keydown', (e) => {
		if (e.key === " " || e.key === "Enter") {
		  game.anims.anims.clear();
		  game.textures.remove("grid-texture");
		  game.scene.start("playSceneMultiplayer");
		  game.scene.stop("gameoverScene");
		}
	  });
	}
  };
  game.scene.add("gameoverScene", gameoverScene);
  

var pauseSceneSingle = {
	create: function () {
		//Change Reference Button
		referenceNoteButton.destroy();
		referenceNoteButton = this.add.text(resolution[0], playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
		referenceNoteButton.setBackgroundColor("#F0EAD2");
		referenceNoteButton.setPadding(8, 8, 8, 8);
		referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
		referenceNoteButton.setY(referenceNoteButton.y - 10);
		referenceNoteButton.setInteractive();
		referenceNoteButton.on('pointerdown', () => {
			buttonPlayReference();
		});

		//Set Status Text
		statusTextSmall.setText("");
		statusText.setAlpha(0);
		statusText.setY(playerHeight * 3 / 2);
		statusText.setText('Game Paused\nEnter/Space to resume...');
		tween = this.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

		//Play Pause Button
		playPauseButton.destroy();
		playPauseButton = this.add.image(resolution[0] - 100, (playerHeight * 0.6), 'play').setScale(0.8);
		playPauseButton.setInteractive();
		playPauseButton.on('pointerdown', function () {
			manageStatusSingle();
		});

		//Settings button
		settingsButton = this.add.image(resolution[0] - (playerHeight * resolution[1] / 636) / 2 - 10, (playerHeight * 0.6), 'settings').setScale(0.6);
		settingsButton.setInteractive();
		settingsButton.on('pointerdown', function () {
			game.scene.stop("playScene");
			game.scene.stop("gamoverSceneSingle");
			game.scene.stop("pauseSceneSingle");
			game.scene.start("settingsScene");
		});
	}
}
game.scene.add("pauseSceneSingle", pauseSceneSingle);

var gameoverSceneSingle = {
	init(data) {
		this.time = data.time;
		this.score = data.score;
		this.gameLevel = data.gameLevel;
		this.gameVelocity = data.gameVelocity;
		this.detectedNote = data.detectedNote || "—";
		this.expectedNote = data.expectedNote || "—";
	},

	preload: function () {
		this.load.image('restart', 'assets/restart.png');
	},

	create: function () {
		gameoverContext = this;
		gameStatus = "Gameover";
		player.destroy();

		this.add.rectangle(0, 0, resolution[0], resolution[1], 0xffffff, 1).setOrigin(0);
		this.cameras.main.setBackgroundColor('#FFFFE0'); // fondo estilo mockup
		this.cameras.main.fadeIn(500, 255, 255, 255);
		// 🎵 Notas flotantes animadas
		this.notesGroup = this.add.group();
		let noteKeys = ['note1', 'note2', 'note3', 'player'];

		for (let i = 0; i < 12; i++) {
			let key = Phaser.Utils.Array.GetRandom(noteKeys);
			let note = this.add.image(
				Phaser.Math.Between(0, resolution[0]),
				Phaser.Math.Between(0, resolution[1]),
				key
			).setAlpha(0.15).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
			this.notesGroup.add(note);

			this.tweens.add({
				targets: note,
				y: note.y - Phaser.Math.Between(20, 40),
				duration: Phaser.Math.Between(3000, 5000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 1000)
			});
		}
		this.add.text(resolution[0] / 2, resolution[1] / 2 - 120, "🎮 GAME RESULTS", {
			font: "32px Arial",
			fill: "#222",
			fontStyle: "bold"
		}).setOrigin(0.5);

		const avgAccuracy = accuracyList.length > 0
			? (accuracyList.reduce((a, b) => a + b, 0) / accuracyList.length).toFixed(1)
			: "N/A";

		const info = [
			{ icon: "⏱", label: `Time: ${this.time} seconds` },
			{ icon: "🎯", label: `Score: ${this.score}` },
			{ icon: "🎵", label: `Level: ${this.gameLevel}` },
			{ icon: "🧠", label: `You played: ${this.detectedNote} — Expected: ${this.expectedNote}` },
			{ icon: "🎯", label: `Accuracy Time: ${avgAccuracy}%` },
			{ icon: "🔁", label: "Press Enter to try again" }
		];

		info.forEach((item, i) => {
			this.add.text(resolution[0] / 2, resolution[1] / 2 - 60 + i * 35, `${item.icon} ${item.label}`, {
				font: "22px Arial",
				fill: "#333",
				align: "center"
			}).setOrigin(0.5);
		});

		if (this.detectedNote === this.expectedNote) {
			this.add.text(resolution[0] / 2, resolution[1] - 100,
				"🎶 You played the correct note,\nbut not at the right time.\nTry to improve your timing!", {
				font: "20px Arial",
				fill: "#BB0000",
				align: "center"
			}).setOrigin(0.5);
		}

		const noteButton = this.add.text(resolution[0] / 2, resolution[1] - 50, '🔊 Listen to expected note', {
			font: '20px Arial',
			fill: '#000',
			backgroundColor: '#F0EAD2',
			padding: { x: 12, y: 6 }
		}).setOrigin(0.5).setInteractive();

		noteButton.on('pointerdown', () => {
			playNote(this.expectedNote, 1.5);
		});

		settingsButton = this.add.image(resolution[0] - 50, 50, 'settings').setScale(0.6).setInteractive();
		settingsButton.on('pointerdown', () => {
			game.scene.stop("gameoverSceneSingle");
			game.scene.stop("pauseSceneSingle");
			game.scene.start("settingsScene");
		});

		playPauseButton.destroy();
		playPauseButton = this.add.image(resolution[0] - 110, 50, 'restart').setScale(0.6).setInteractive();
		playPauseButton.on('pointerdown', () => {
			game.anims.anims.clear();
			game.textures.remove("grid-texture");
			game.scene.start("playScene");
			game.scene.stop("gameoverSceneSingle");
		});

		this.input.keyboard.on('keydown', (e) => {
			if (e.key === " " || e.key === "Enter") {
				game.anims.anims.clear();
				game.textures.remove("grid-texture");
				game.scene.start("playScene");
				game.scene.stop("gameoverSceneSingle");
			}
		});
	}
};
game.scene.add("gameoverSceneSingle", gameoverSceneSingle);

function createPlatformTexture(context, width, height, levelDuration, color = platformColor) {
	graphics = context.add.graphics();
	graphics.fillStyle('#8B4513', 1);
	graphics.fillRect(0, 0, width - spaceBetweenPlatforms, height); //width-1 to see the division between two platforms at the same level
	graphics.generateTexture('platform' + levelDuration + height, width, height);
	graphics.destroy();
}

function createGridTexture(context, measurePlatformWidth, timeSignature) {

	var texture = 0;
	if (texture == 0)
		texture = context.textures.createCanvas('grid-texture', measurePlatformWidth, resolution[1] - playerHeight * 4);
	textureContext = texture.getContext();

	xPointer = 0;
	for (i = 0; i <= timeSignature; i++) {
		switch (i) {
			case 0:
				grd = textureContext.createLinearGradient(xPointer, 0, xPointer + 5, 0);

				grd.addColorStop(0, "rgba(" + gridColor + "0.8)");
				grd.addColorStop(1, "rgba(" + gridColor + "0)");

				textureContext.fillStyle = grd;
				textureContext.fillRect(xPointer, 0, xPointer + 5, window.innerHeight);

				// Agregar referencia de piano justo después de dibujar la primera línea
				const currentScale = modalScaleName;
				const baseNote = firstNote;
				const baseOctave = parseInt(baseNote.slice(-1));
				const noteLetter = baseNote.replace(/\d/g, '');

				const modalScales = {
					'ionian': [0, 2, 4, 5, 7, 9, 11],
					'dorian': [0, 2, 3, 5, 7, 9, 10],
					'phrygian': [0, 1, 3, 5, 7, 8, 10],
					'lydian': [0, 2, 4, 6, 7, 9, 11],
					'mixolydian': [0, 2, 4, 5, 7, 9, 10],
					'aeolian': [0, 2, 3, 5, 7, 8, 10],
					'locrian': [0, 1, 3, 5, 6, 8, 10]
				};

				const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

				function getScaleNotes() {
					const scaleIntervals = modalScales[currentScale];
					const baseIndex = noteNames.indexOf(noteLetter);
					let notes = [];

					for (let oct = 0; oct < 1; oct++) {
						scaleIntervals.forEach(interval => {
							const noteIndex = (baseIndex + interval) % 12;
							const currentOctave = baseOctave + oct;
							notes.push({
								name: noteNames[noteIndex],
								octave: currentOctave,
								fullName: noteNames[noteIndex] + currentOctave,
								isSharp: noteNames[noteIndex].includes('#')
							});
						});
					}

					const tonicOctave = baseOctave + 1;
					notes.push({
						name: noteLetter,
						octave: tonicOctave,
						fullName: noteLetter + tonicOctave,
						isSharp: noteLetter.includes('#')
					});

					return notes;
				}

				const scaleNotes = getScaleNotes();

				// Suponiendo que estás en un contexto de escena de Phaser
				const totalHeight = texture.height;
				const keyHeight = totalHeight / scaleNotes.length;
				const pianoWidth = 60;

				const pianoStartX = 0; // Alineado con el borde izquierdo del grid
				const pianoStartY = 142;

				// Añadir título de la escala
				const scaleTitle = context.add.text(
					pianoStartX + 5,
					pianoStartY - 20,
					`${noteLetter} ${currentScale}`,
					{ font: '14px Arial', fill: '#6C584C' }
				);
				scaleTitle.setDepth(0);

				// Añadir notas de la escala
				scaleNotes.slice().reverse().forEach((note, index) => {
					const yPos = pianoStartY + (keyHeight * index);
					const keyBg = context.add.rectangle(
						pianoStartX,
						yPos,
						pianoWidth,
						keyHeight,
						note.isSharp ? 0x333333 : 0xFFFFFF
					).setOrigin(0, 0);
					keyBg.setStrokeStyle(2, 0x000000); // 2px border, black color

					const noteText = context.add.text(
						pianoStartX + pianoWidth / 2,
						yPos + keyHeight / 2,
						note.fullName,
						{
							font: '12px Arial',
							fill: note.isSharp ? '#FFFFFF' : '#000000',
							align: 'center'
						}
					);
					noteText.setOrigin(0.5);

					noteText.setInteractive();
					noteText.on('pointerdown', () => {
						playNote(note.fullName, 1.0);

						context.tweens.add({
							targets: keyBg,
							fillColor: note.isSharp ? 0x555555 : 0xDDDDDD,
							duration: 100,
							yoyo: true
						});
					});
				});
				break;
			case 1:
			case 3:
				grd = textureContext.createLinearGradient(xPointer - 1 - spaceBetweenPlatforms / 2, 0, xPointer + 1, 0);

				grd.addColorStop(0, "rgba(" + gridColor + "0)");
				grd.addColorStop(0.5, "rgba(" + gridColor + "0.8)");
				grd.addColorStop(1, "rgba(" + gridColor + "0)");

				textureContext.fillStyle = grd;
				textureContext.fillRect(xPointer - 1 - spaceBetweenPlatforms / 2, 0, xPointer + 1, window.innerHeight);
				break;
			case 2:
				grd = textureContext.createLinearGradient(xPointer - 2 - spaceBetweenPlatforms / 2, 0, xPointer + 2, 0);

				grd.addColorStop(0, "rgba(" + gridColor + "0)");
				grd.addColorStop(0.5, "rgba(" + gridColor + "0.8)");
				grd.addColorStop(1, "rgba(" + gridColor + "0)");

				textureContext.fillStyle = grd;
				textureContext.fillRect(xPointer - 2 - spaceBetweenPlatforms / 2, 0, xPointer + 2, window.innerHeight);
				break;
			case 4:
				grd = textureContext.createLinearGradient(xPointer - 5, 0, xPointer, 0);

				grd.addColorStop(0, "rgba(" + gridColor + "0)");
				grd.addColorStop(1, "rgba(" + gridColor + "0.8)");

				textureContext.fillStyle = grd;
				textureContext.fillRect(xPointer - 5, 0, xPointer, window.innerHeight);
				break;
		}
		xPointer += (measurePlatformWidth / timeSignature);
	}
	texture.refresh();
}

function createBackground(context, color = backgroundGridColor, black = false) {

	if (black) {
		graphics = context.add.graphics();
		yPointer = playerHeight * 3; //Starts from the top to draw
		graphics.fillStyle('#000000', 1);
		graphics.fillRect(0, yPointer, resolution[0], levelsFieldHeight);
		graphics.strokeRect(0, yPointer, resolution[0], levelsFieldHeight); //Rectangle border
		graphics.generateTexture('background-black', resolution[0], resolution[1]);
		graphics.destroy();
	}
	else {
		graphics = context.add.graphics();

		//From the bottom (position 0) to the top (position 7) of the screen
		yPointer = playerHeight * 3; //Starts from the top to draw
		colorsArray = scaleToColorsArray[gameLevelToScaleArray[gameLevel]]
		for (i = 1; i <= colorsArray.length; i++) {
			graphics.fillStyle(colorsArray[scaleToColorsArray[gameLevelToScaleArray[0]].length - i], 1);
			graphics.lineStyle(0.1, "0x000000", 1);
			graphics.fillRect(0, yPointer, resolution[0], stepHeight);

			graphics.strokeRect(0, yPointer, resolution[0], stepHeight); //Rectangle border
			yPointer += stepHeight;
		}

		graphics.generateTexture('background' + gameLevel, resolution[0], resolution[1]);

		graphics.destroy();
	}
}

var generateLevel = function () {
	scoreToChangeLevel++;

	durationAndNote = getDurationAndNote();

	if (durationAndNote[0] != null) {
		levelDuration = durationAndNote[0]; //level Duration i.e.:1, 1/2, 1/4, 1/8, ...
	}
	else {
		console.log("WARNING!!!! YOUR DEVICE WILL EXPLODE!!!!");
		levelDuration = 1;
	}

	if (durationAndNote[1] != null && scoreToChangeLevel <= pointsToChangeLevel)
		levelValue = durationAndNote[1];
	else if (levelsQueue.length == 0) { //If it's the first level of the game, avoid generation of a pause
		levelValue = Math.floor(Math.random() * (numberOfLevels)) + 1; //Generate levels without pause
	}
	else {
		//Avoid creation of two successive pauses
		if (levelsQueue[levelsQueue.length - 1] == 0) {
			levelValue = Math.floor(Math.random() * (numberOfLevels)) + 1; //Generate levels without pause
		}
		else {
			levelValue = Math.floor(Math.random() * (numberOfLevels + 1)); //Generate levels with pause
		}

		if (scoreToChangeLevel == pointsToChangeLevel) { //Avoid creation of a pause before a change of level
			levelValue = Math.floor(Math.random() * (numberOfLevels)) + 1; //Generate levels without pause
		}
	}

	//Change game level each n points (endless)
	if (scoreToChangeLevel - 1 == pointsToChangeLevel && gameModality == GAME_MODE.PROGRESSIVE) {
		changeLevelEvent = true;
		levelValue = 0;
		scoreToChangeLevel = 0;
		levelDuration = changeLevelStatusDuration;
	}

	levelHeight = (player.height * 3) + ((numberOfLevels - levelValue) * stepHeight) + (stepHeight / 2);
	return [levelValue, levelHeight, levelDuration];
}

function platformsColliderCallbackMultiplayer() {
	if (!platformTouched && player.body.touching.down && gameStatus == "Running") {
		score++;
		this.scores.player = score;
		scoreText.setText('score: ' + this.scores.player);
  
	  // ÚNICAMENTE envío de score (buffer si hace falta)
	  WebRTCManager.sendMessage({
		type: "scoreUpdate",
		score: this.scores.player,
		timestamp: Date.now()
	  });
	  console.log("📤 Puntaje enviado vía WebRTC:", score);
  
	  // Si usas Socket.IO para redundancia, envías también aquí:
	  const socket = WebRTCManager.getSocket?.();
	  if (socket) {
		socket.emit('updateScore', {
		  roomCode: this.currentRoomId,
		  score: this.scores.player
		});
		console.log("📤 Puntaje enviado al servidor vía Socket.IO");
	  }
	}
	platformTouched = true;
}
  

function platformsColliderCallback() {
	if (!platformTouched && player.body.touching.down && gameStatus == "Running") {
		score++;
		scoreText.setText('score: ' + score);
	}
	platformTouched = true; //Needed to take only the first collision with the platform
}

function changeLevelAndBackground() {
	//console.log("Change Level And Background!");
	gameLevelProgressive++; //Increase progressive level

	//Change Level
	if (gameLevel < gameLevelToScaleArray.length - 1 && !lastLevel) {
		gameLevel++;
		if (gameLevel == gameLevelToScaleArray.length - 1)
			lastLevel = true;
	}
	else {
		newLevel = Math.round(Math.random() * (gameLevelToScaleArray.length - 1)); //After the player reach the last level, random levels will generate
		while (newLevel == gameLevel) {
			newLevel = Math.round(Math.random() * (gameLevelToScaleArray.length - 1)); //After the player reach the last level, random levels will generate
		}
		gameLevel = newLevel;
	}

	//Remove Old Background
	tween = gameContext.add.tween({ targets: backgroundImage, ease: 'Sine.easeInOut', duration: 1000, delay: 500, alpha: { getStart: () => 1, getEnd: () => 0 } });
	tween.setCallback("onComplete", function () {
		backgroundImage.destroy();
		backgroundImage = newbackgroundImage;
	}, backgroundImage);

	//Add new background
	createBackground(gameContext);
	changeGameLevel(gameLevel);
	newbackgroundImage = gameContext.add.image(resolution[0] / 2, resolution[1] / 2, 'background' + gameLevel);
	newbackgroundImage.setAlpha(0);
	newbackgroundImage.setDepth(-2);
	newtween = gameContext.add.tween({ targets: newbackgroundImage, ease: 'Sine.easeInOut', duration: 1000, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

	//play next scale
	playScale(gameLevelToScaleArray[gameLevel], noteReference, 0.5)

	//Darker Background
	createBackground(gameContext, '#000000', true);
	darkBackgroundImage = gameContext.add.image(resolution[0] / 2, resolution[1] / 2, 'background-black');
	darkBackgroundImage.setAlpha(0);
	darkBackgroundImage.setDepth(-1);
	changelevelDuration = 2000;
	darkTween = gameContext.add.tween({ targets: darkBackgroundImage, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 5, delay: 0, alpha: { getStart: () => 0, getEnd: () => 0.2 } });
	darkTween = gameContext.add.tween({ targets: darkBackgroundImage, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 10, delay: changelevelDuration * 3.6 * changeLevelStatusDuration, alpha: { getStart: () => 0.2, getEnd: () => 0 } });

	statusTextSmall.setAlpha(0);
	statusTextSmall.setText("Mode: " + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
	statusText.setY(playerHeight * 1.1);
	gameContext.add.tween({ targets: statusTextSmall, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 5, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
	gameContext.add.tween({ targets: statusTextSmall, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 10, delay: changelevelDuration * 3.6 * changeLevelStatusDuration, alpha: { getStart: () => 1, getEnd: () => 0 } });

	statusText.setAlpha(0);
	statusText.setText("Level " + gameLevelProgressive);
	gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 5, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
	statustextLevelTween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: changelevelDuration * 4 / 10, delay: changelevelDuration * 3.6 * changeLevelStatusDuration, alpha: { getStart: () => 1, getEnd: () => 0 } });

	statustextLevelTween.setCallback("onComplete", function () {
		statusText.setY(playerHeight * 3 / 2);
	}, statusText);

	darkTween.setCallback("onUpdate", function () {
		changeLevelTextShown = false;
	}, darkBackgroundImage);

	changeLevelTextShown = true;
}

function manageStatus() {
	switch (gameStatus) {

		case "Started": //The game should start running
			//pitchDetector.resumeAudioContext()	//to enable the AudioContext of PitchDetector
			pitchDetector.start(); //Restart the pitch detector after resuming the AudioContext
			game.scene.resume("playSceneMultiplayer"); //Starting scene (update() function starts looping)
			//playPauseButton.setTexture('pause');

			if (pitchDetector.isEnable()) {
				pitchDetector.toggleEnable();
			}

			gameStatus = "Intro";
			player.body.setGravityY(playerGravity * (introVelocity / 10));
			player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 1.5 * 636 / resolution[1], 1 / 2));
			collider.overlapOnly = true;

			statusText.setText('Listen...');
			tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
			break;

		case "Intro":
			if (game.scene.isActive("playSceneMultiplayer")) {
				game.scene.pause("playSceneMultiplayer");
				game.scene.start("pauseScene");
				if (pitchDetector.isEnable()) {
					pitchDetector.toggleEnable();
				}
			}
			else {
				game.scene.resume("playSceneMultiplayer");
				game.scene.stop("pauseScene");

				referenceNoteButton = gameContext.add.text(resolution[0] - 150, playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
				referenceNoteButton.setBackgroundColor("#F0EAD2");
				referenceNoteButton.setPadding(8, 8, 8, 8);
				referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
				referenceNoteButton.setY(referenceNoteButton.y - 10);
				referenceNoteButton.setInteractive();
				referenceNoteButton.on('pointerdown', () => {
					buttonPlayReference();
				});

				if (initialScaleNote < 8) {
					statusText.setText('Listen...');
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else if (countdown > 0) {
					statusText.setText("Ready?!");
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else {
					statusText.setText("Sing!");
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
					if (!pitchDetector.isEnable()) {
						pitchDetector.toggleEnable();
					}
				}
			}
			break;

		case "Running": //The game should toggle the pause status
			if (game.scene.isActive("playSceneMultiplayer")) {
				game.scene.pause("playSceneMultiplayer");
				game.scene.start("pauseScene");
				if (pitchDetector.isEnable()) {
					pitchDetector.toggleEnable();
				}
			}
			else {
				game.scene.resume("playSceneMultiplayer");
				game.scene.stop("pauseScene");
				statusText.setText();
				if (changeLevelTextShown) {
					statusTextSmall.setAlpha(0);
					statusTextSmall.setText("Mode: " + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
					statusText.setY(playerHeight * 1.1);
					gameContext.add.tween({ targets: statusTextSmall, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

					statusText.setAlpha(0);
					statusText.setText("Level " + gameLevelProgressive);
					gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}

				//Reload play reference button
				referenceNoteButton = gameContext.add.text(resolution[0] - 150, playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
				referenceNoteButton.setBackgroundColor("#F0EAD2");
				referenceNoteButton.setPadding(8, 8, 8, 8);
				referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
				referenceNoteButton.setY(referenceNoteButton.y - 10);
				referenceNoteButton.setInteractive();
				referenceNoteButton.on('pointerdown', () => {
					buttonPlayReference();
				});

				if (!pitchDetector.isEnable()) {
					if (levelsQueue[0] == 0 && endedPauseAnimation) {
						pitchDetector.toggleEnable();
					}
					else if (levelsQueue[0] != 0) {
						pitchDetector.toggleEnable();
					}
				}

				//if next scale was playing, I finish it
				if (scaleOnPlay == true)
					playScale(gameLevelToScaleArray[gameLevel], noteReference, 0.5)

			}
			break;

		default:
			break;
	}
}

function manageStatusSingle() {
	switch (gameStatus) {

		case "Started": //The game should start running
			//pitchDetector.resumeAudioContext()	//to enable the AudioContext of PitchDetector
			pitchDetector.start(); //Restart the pitch detector after resuming the AudioContext
			game.scene.resume("playScene"); //Starting scene (update() function starts looping)
			//playPauseButton.setTexture('pause');

			if (pitchDetector.isEnable()) {
				pitchDetector.toggleEnable();
			}

			gameStatus = "Intro";
			player.body.setGravityY(playerGravity * (introVelocity / 10));
			player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity * (introVelocity / 10)) * stepHeight * 1.5 * 636 / resolution[1], 1 / 2));
			collider.overlapOnly = true;

			statusText.setText('Listen...');
			tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
			break;

		case "Intro":
			if (game.scene.isActive("playScene")) {
				game.scene.pause("playScene");
				game.scene.start("pauseSceneSingle");
				if (pitchDetector.isEnable()) {
					pitchDetector.toggleEnable();
				}
			}
			else {
				game.scene.resume("playScene");
				game.scene.stop("pauseSceneSingle");

				playPauseButton.destroy();
				playPauseButton = gameContext.add.image(resolution[0] - 100, (playerHeight * 0.6), 'pause').setScale(0.8);
				playPauseButton.setInteractive();
				playPauseButton.on('pointerdown', function () {
					manageStatusSingle();
				});

				referenceNoteButton = gameContext.add.text(resolution[0] - 150, playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
				referenceNoteButton.setBackgroundColor("#F0EAD2");
				referenceNoteButton.setPadding(8, 8, 8, 8);
				referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
				referenceNoteButton.setY(referenceNoteButton.y - 10);
				referenceNoteButton.setInteractive();
				referenceNoteButton.on('pointerdown', () => {
					buttonPlayReference();
				});

				if (initialScaleNote < 8) {
					statusText.setText('Listen...');
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else if (countdown > 0) {
					statusText.setText("Ready?!");
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}
				else {
					statusText.setText("Sing!");
					tween = gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
					if (!pitchDetector.isEnable()) {
						pitchDetector.toggleEnable();
					}
				}
			}
			break;

		case "Running": //The game should toggle the pause status
			if (game.scene.isActive("playScene")) {
				game.scene.pause("playScene");
				game.scene.start("pauseSceneSingle");
				if (pitchDetector.isEnable()) {
					pitchDetector.toggleEnable();
				}
			}
			else {
				game.scene.resume("playScene");
				game.scene.stop("pauseSceneSingle");
				statusText.setText();
				if (changeLevelTextShown) {
					statusTextSmall.setAlpha(0);
					statusTextSmall.setText("Mode: " + gameLevelToScaleArray[gameLevel].charAt(0).toUpperCase() + gameLevelToScaleArray[gameLevel].slice(1));
					statusText.setY(playerHeight * 1.1);
					gameContext.add.tween({ targets: statusTextSmall, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });

					statusText.setAlpha(0);
					statusText.setText("Level " + gameLevelProgressive);
					gameContext.add.tween({ targets: statusText, ease: 'Sine.easeInOut', duration: 300, delay: 0, alpha: { getStart: () => 0, getEnd: () => 1 } });
				}

				playPauseButton.destroy();
				playPauseButton = gameContext.add.image(resolution[0] - 100, (playerHeight * 0.6), 'pause').setScale(0.8);
				playPauseButton.setInteractive();
				playPauseButton.on('pointerdown', function () {
					manageStatusSingle();
				});

				//Reload play reference button
				referenceNoteButton = gameContext.add.text(resolution[0] - 150, playerHeight * 2.2, 'Play Reference', { fontSize: fontSize + 'px', fill: fontColor, fontFamily: "Arial" });
				referenceNoteButton.setBackgroundColor("#F0EAD2");
				referenceNoteButton.setPadding(8, 8, 8, 8);
				referenceNoteButton.setX(resolution[0] - referenceNoteButton.width - 10);
				referenceNoteButton.setY(referenceNoteButton.y - 10);
				referenceNoteButton.setInteractive();
				referenceNoteButton.on('pointerdown', () => {
					buttonPlayReference();
				});

				if (!pitchDetector.isEnable()) {
					if (levelsQueue[0] == 0 && endedPauseAnimation) {
						pitchDetector.toggleEnable();
					}
					else if (levelsQueue[0] != 0) {
						pitchDetector.toggleEnable();
					}
				}

				//if next scale was playing, I finish it
				if (scaleOnPlay == true)
					playScale(gameLevelToScaleArray[gameLevel], noteReference, 0.5)

			}
			break;

		default:
			break;
	}
}

var enableKeyDebug = false
var buttonD = false
var buttonB = false

document.onkeydown = function (event) {
	if (!event.repeat) {
		if (event.key == "Enter" || event.key == " ") {
			manageStatusSingle();
		}
		else if (buttonD && buttonB && ((gameStatus == "Running" && (player.body.touching.down || (levelsQueue[0] == 0)) && jumpArea) || (score == 0 && initialScaleNote == 8))) {
			console.log("KEYS")
			//Play a note directly into the pitchDetector module for the pitch detecting step (Debug code)
			noteKeys = "12345678" //Keys To use
			noteFreqKeys = [];
			for (i = 0; i < currentScale.length; i++) {
				noteFreqKeys[i] = noteFreq[currentScale[i]];
			}
			//console.log("keys")
			if (parseInt(event.key) >= 1 && parseInt(event.key) <= 8) {
				//console.log("Note played: ", currentScale[noteKeys.indexOf(event.key)])
				pitchDetector.tuner.play(noteFreqKeys[noteKeys.indexOf(event.key)]);

				//setTimeout(pitchDetector.tuner.stop, 1000)
				//setTimeout(pitchDetector.tuner.oscillator.stop(), 1000)

			}
		}


	}

}

// function to debug the game with the number keys [1 - 8]
document.onkeypress = function (event) {
	if (!event.repeat) {
		if (event.key == "d")
			buttonD = !buttonD
		if (event.key == "b")
			buttonB = !buttonB
	}

}

//stop the play of the oscillator from the keyboard
document.onkeyup = function (event) {
	//console.log("up")
	if ((gameStatus == "Running" && (player.body.touching.down || (levelsQueue[0] == 0)) && jumpArea) || (score == 0 && initialScaleNote == 8)) {
		if (parseInt(event.key) >= 1 && parseInt(event.key) <= 8) {
			//console.log(parseInt(event.key))
			if (pitchDetector.tuner.oscillator != null) {
				pitchDetector.tuner.oscillator.stop()
				pitchDetector.tuner.oscillator = null
			}
		}
	}
}

function jumpAtLevel(level) {
	//console.log("called jumpAtLevel", level)
	if (score == 0 && initialScaleNote == 8 && level == levelsQueue[0]) {
		noAnswer = false;
	}
	else if (gameStatus == "Running" && (player.body.touching.down || (levelsQueue[0] == 0)) && jumpArea && level != 0) {
		if (levelsQueue[0] == 0) {
			jumpRatio = 1.5;

			if (level == levelsQueue[1]) //If the answer is correct
				jumpFromPause = true; //Need to remove the "fly" texture of the player when it jumps out of the pause
		} else
			jumpRatio = String(levelsQueue[1] - levelsQueue[0] + 1);

		//If the note detected is correct:
		if (level == levelsQueue[1] && parseInt(jumpRatio) > 0 && noAnswer == true) { //Go up
			//console.log("jump Up!", level);
			player.body.setGravityY(playerGravity);
			player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity) * stepHeight * jumpRatio, 1 / 2));
			collider.overlapOnly = true;

			goAhead = true; //The answer is correct
			noAnswer = false; //An answer has been given
		} else if (level == levelsQueue[1] && noAnswer == true) { //Go down
			//console.log("jump Down!", level);
			player.body.setGravityY(playerGravity);
			player.setVelocityY(-1 * Math.pow(2 * (gravity + playerGravity) * stepHeight * 1, 1 / 2));
			goAhead = true;
			noAnswer = false;
		}
		//Else go ahead remain false and the player fall down

		//In order to fall down if you play something before entering the pause
		if (level != levelsQueue[0] && levelsQueue[1] == 0 && (level == 1 || level == 2 || level == 3 || level == 4 || level == 5 || level == 6 || level == 7 || level == 8)) {
			noAnswer = false;
			goAhead = false;
			pauseEvent = false; //Avoid starting of the pause animation
			fallBeforePause = true; //Needed to show the right message for this event
			//console.log("Next is pause, you play something!");
		}

	}
	else if (level == -1 && player.body.touching.down && gameStatus == "Running") {
		//goAhead = false; //The player fall down if a wrong note is singed (even out of the jump area)
		player.body.setGravityY(playerGravity);
	}
}

game.scene.start("splashScene");

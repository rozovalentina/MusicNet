//Maneja la representación visual del juego.

//Settings
var resolution = [window.innerWidth, window.innerHeight]
var gravity = 850;
var gameVelocity = 1;
var playerGravity = 2000*gameVelocity;
var numberOfLevels = 8;
var backgroundGridColor = 0xADD8E6;
var backgroundColor = 0xFFFFFF;
var platformColor = 0x41423c;
var gridColor = "186, 181, 180, "
var gridOpacity = 0.4;
var fontSize = 20;
var fontColor = '#F00';
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
	}
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

const pitchDetector = new PitchDetector();
pitchDetector.start();

var askForStartGame;

var settingsScene = {
	preload: function() {
		this.load.spritesheet('player', 'assets/player.png', { frameWidth: 19, frameHeight: 48 });
	},
	create: function() {

		askForStartGame = false;

		playerWidth = 19;
		playerHeight = 48;

		initVariables();

		this.cameras.main.setBackgroundColor('#ADD8E6');
		this.cameras.main.fadeIn(500, 255,255,255);

		settingsOffset = 0;

		//Animation to the left
		settingsPlayer = this.physics.add.sprite(resolution[0]/2-400, resolution[1]/2-100, 'player').setScale(resolution[1]/636);
		settingsPlayer.setCollideWorldBounds(false); //So the player can exceed the world boundaries
		settingsPlayer.body.setGravityY(playerGravity);
		settingsPlayer.setBounce(1);

		createPlatformTexture(this, measurePlatformWidth*1/4, platformHeight, 1/4);
		settingsPlatforms = this.physics.add.staticGroup();
		settingsPlatforms.create(resolution[0]/2-400, resolution[1]/2+100, 'platform'+1/4+platformHeight);

		settingsCollider = this.physics.add.collider(settingsPlayer, settingsPlatforms);

		//Animation to the right
		createPlatformTexture(this, measurePlatformWidth*1/4, platformHeight, 1/4);
		settingsPlatforms2 = this.physics.add.staticGroup();
		settingsPlatforms2.create(resolution[0]/2+400, resolution[1]/2+100, 'platform'+1/4+platformHeight);

		settingsPlayer2 = this.physics.add.sprite(resolution[0]/2+400, resolution[1]/2-100, 'player').setScale(resolution[1]/636);
		settingsPlayer2.setCollideWorldBounds(false); //So the player can exceed the world boundaries
		settingsPlayer2.body.setGravityY(playerGravity-500);
		settingsPlayer2.setBounce(1);

		settingsCollider2 = this.physics.add.collider(settingsPlayer2, settingsPlatforms2);

		//Relative scale settings
		//------------------------------------------------------------------------------------------------------
		firstNote = noteReference;
		firstNoteTextDesc = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/10, "______________________________________\nTonal Reference",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		firstNoteTextDesc.setAlign('center');
		firstNoteText = this.add.text(resolution[0]/2+settingsOffset-100,resolution[1]/3.6, "",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		firstNoteText.setText(firstNote);
		firstNoteText.setBackgroundColor("rgba(255,160,160,0.5)");
		firstNoteText.setPadding(13, 13, 13, 13);
		firstNoteText.setInteractive();
		firstNoteText.on('pointerdown', function() {
			playNote(firstNote, 1.5);
		});

		prevNote = this.add.text(resolution[0]/2+settingsOffset-50-100,resolution[1]/3.6, "<",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		prevNote.setPadding(6, 10, 6, 10);
		prevNote.setInteractive();
		prevNote.on('pointerdown', function() {
			nextNote.setFill("#F00");
			if(firstNote != "C2"){
				if(firstNote == "C#2") {
					prevNote.setFill("rgba(245,160,160,0.5)");
				}

				if(firstNote.substring(1,2) == "#")
					octave = firstNote.substring(2,3);
				else
					octave = firstNote.substring(1,2);

				if(firstNote.substring(0,1) == "C" && firstNote.substring(0,2) != "C#")
					octave--;

				if(firstNote.substring(1,2) == "#")
					firstNote = letters[letters.indexOf(firstNote.substring(0,2))-1]+octave;
				else
					if(firstNote.substring(0,1) == letters[0])
						firstNote = letters[letters.length-1]+octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0,1))-1]+octave;


				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);

			}
		});

		nextNote = this.add.text(resolution[0]/2+settingsOffset+50-100,resolution[1]/3.6, ">",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		nextNote.setPadding(6, 10, 6, 10);
		nextNote.setInteractive();
		nextNote.on('pointerdown', function() {
			prevNote.setFill("#F00");
			if(firstNote != "B5"){ //Set max range
				if(firstNote == "A#5"){ //Set "inactive"
					nextNote.setFill("rgba(245,160,160,0.5)");
				}

				if(firstNote.substring(1,2) == "#")
					octave = firstNote.substring(2,3);
				else
					octave = firstNote.substring(1,2);

				if(firstNote.substring(0,1) == "B")
					octave++;

				if(firstNote.substring(1,2) == "#")
					if(firstNote.substring(0,2) == letters[letters.length-1])
						firstNote = letters[0]+octave;
					else
						firstNote = letters[letters.indexOf(firstNote.substring(0,2))+1]+octave;
				else
					firstNote = letters[letters.indexOf(firstNote.substring(0,1))+1]+octave;

				firstNoteText.setText(firstNote);
				changeNoteReference(firstNote);
				playNote(firstNote, 1.5);
			}
		});

		playOctaveButton = this.add.text(resolution[0]/2+settingsOffset+100,resolution[1]/3.6, "Play Octave",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		playOctaveButton.setBackgroundColor("rgba(240,160,160,0.5)");
		playOctaveButton.setFill("#F00");
		playOctaveButton.setPadding(10, 10, 10, 10);
		playOctaveButton.setInteractive();
		playOctaveButton.on('pointerdown', function() {
			playNote(firstNote, 1.5);
			setTimeout(()=>{
				if(firstNote.substring(1,2) == "#")
					playNote(firstNote.substring(0,2)+(parseInt(firstNote.substring(2,3))+1), 1.5);
				else
					playNote(firstNote.substring(0,1)+(parseInt(firstNote.substring(1,2))+1), 1.5);
			},600);

		});

		//Game Modality
		//------------------------------------------------------------------------------------------------------
		gameModalityTextDesc = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/2.2, "______________________________________\nGame Modality & Modal Scale",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		gameModalityTextDesc.setAlign('center');

	  startGameLevel = scales.indexOf(modalScaleName);
		modalScaleText = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/1.6, "",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
		modalScaleText.setBackgroundColor("rgba(255,160,160,0.5)");
		modalScaleText.setPadding(13, 13, 13, 13);

		prevScale = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/1.8, ">",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		prevScale.setAngle(-90);
		prevScale.setPadding(6, 10, 6, 10);
		prevScale.setInteractive();
		prevScale.on('pointerdown', function() {
			if(startGameLevel == 0)
				startGameLevel = scales.indexOf(scales[scales.length-1]);
			else
				startGameLevel--;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
		});

		nextScale = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/1.44, ">",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		nextScale.setAngle(90);
		nextScale.setPadding(6, 10, 6, 10);
		nextScale.setInteractive();
		nextScale.on('pointerdown', function() {
			if(startGameLevel == scales.indexOf(scales[scales.length-1]))
				startGameLevel = 0;
			else
				startGameLevel++;
			modalScaleName = scales[startGameLevel];
			changeScaleReference(modalScaleName);
			modalScaleText.setText(modalScaleName.charAt(0).toUpperCase() + modalScaleName.slice(1));
		});

		gameModalityProgressive = this.add.text(resolution[0]/2+settingsOffset+160,resolution[1]/1.6, "Progressive",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		if(gameModality == GAME_MODE.STATIC) {
			gameModalityProgressive.setBackgroundColor("rgba(240,160,160,0.5)");
			gameModalityProgressive.setFill("#F00");
		}
		else {
			gameModalityProgressive.setBackgroundColor("rgba(255,0,0,0.5)");
			gameModalityProgressive.setFill("#FFFFFF");
		}
		gameModalityProgressive.setPadding(10, 10, 10, 10);
		gameModalityProgressive.setInteractive();
		gameModalityProgressive.on('pointerdown', function() {
			gameModalityProgressive.setBackgroundColor("rgba(255,0,0,0.5)");
			gameModalityProgressive.setFill("#FFFFFF");
			gameModality = GAME_MODE.PROGRESSIVE;

			gameModalityStatic.setBackgroundColor("rgba(240,160,160,0.5)");
			gameModalityStatic.setFill("#F00");
		});

		gameModalityStatic = this.add.text(resolution[0]/2+settingsOffset-160,resolution[1]/1.6, "Static",  { font: "bold 22px Arial", fill: "#F00"}).setOrigin(0.5);
		if(gameModality == GAME_MODE.PROGRESSIVE) {
			gameModalityStatic.setBackgroundColor("rgba(240,160,160,0.5)");
			gameModalityStatic.setFill("#F00");
		}
		else {
			gameModalityStatic.setBackgroundColor("rgba(255,0,0,0.5)");
			gameModalityStatic.setFill("#FFFFFF");
		}
		gameModalityStatic.setPadding(10+(gameModalityProgressive.width-20-gameModalityStatic.width)/2, 10, 10+(gameModalityProgressive.width-20-gameModalityStatic.width)/2, 10);
		gameModalityStatic.setInteractive();
		gameModalityStatic.on('pointerdown', function() {
			gameModalityStatic.setBackgroundColor("rgba(255,0,0,0.5)");
			gameModalityStatic.setFill("#FFFFFF");
			gameModality = GAME_MODE.STATIC;

			gameModalityProgressive.setBackgroundColor("rgba(240,160,160,0.5)");
			gameModalityProgressive.setFill("#F00");
		});

		//Start Game button
		//------------------------------------------------------------------------------------------------------
		startGame = this.add.text(resolution[0]/2+settingsOffset,resolution[1]/1.2, "Iniciar Partida",  { font: "bold 80px Arial", fill: "#F00"}).setOrigin(0.5);
		startGame.setPadding(15, 15, 15, 15);
		startGame.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
		startGame.setInteractive();
		startGame.on('pointerdown', function() {
			// game.anims.anims.clear() //Remove player animations before restarting the game
			// game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
			// game.scene.start("playScene");
			// game.scene.stop("settingsScene");
			askForStartGame = true;
		});

		this.input.keyboard.on('keydown', function(event) {
			if(event.key == " " || event.key == "Enter") {
				game.anims.anims.clear() //Remove player animations before restarting the game
				game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
				game.scene.start("playScene");
				game.scene.stop("settingsScene");
			}
		});
	},
	update: function() {
		if(askForStartGame == true && settingsPlayer.body.touching.down) {
			settingsPlayer.setVelocityX(-600);
		}
		else if(askForStartGame == true && settingsPlayer2.body.touching.down){
			settingsPlayer2.setVelocityX(600);
		}

		if(settingsPlayer.x <= 0) {
			game.anims.anims.clear() //Remove player animations before restarting the game
			game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
			game.scene.start("playScene");
			game.scene.stop("settingsScene");
		} else if(settingsPlayer2.x >= resolution[0]){
			game.anims.anims.clear() //Remove player animations before restarting the game
			game.textures.remove("grid-texture"); //Remove canvas texture before restarting the game
			game.scene.start("playScene");
			game.scene.stop("settingsScene");
		}
	}
}
game.scene.add("settingsScene", settingsScene);
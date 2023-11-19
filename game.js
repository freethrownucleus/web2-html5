const minimum_X = -250;                 //x i y granice izvan kojih će se asteroid obrisati iz memorije
const minimum_Y = -250;
const maximum_X = document.getElementById('canvas').clientWidth + 250;
const maximum_Y = document.getElementById('canvas').clientHeight + 250;
const NUM_OF_ASTEROIDS = 15;            // početni broj asteroida
const MAX_ASTEROIDS = 150;              //maksimalni broj asteroida na canvasu
const QUICKNESS_MAX = 7;                //maksimalna brzina asteroida
const NEW_ASTEROID_POSSIBILITY = 0.10;  //vjeorjatnost generiranja novih asteroida svako novo pokretanje


//modeli asteroida koji se kreću po canvasu
class Asteroid {
  constructor(size, color, border, point_x, point_y, x_quickness, y_quickness, playingArea) {
    this.size = size;
    this.color = color;
    this.border = border;
    this.point_x = point_x;
    this.point_y = point_y;
    this.x_quickness = x_quickness;
    this.y_quickness = y_quickness;
    this.playingArea = playingArea;
  }

  //crtanje ažurirane pozicije komponente na canvas
  newPosition = () => {
    const newP = this.playingArea.drawingContext;
    newP.save();
    newP.translate(this.point_x, this.point_y);

    newP.shadowColor = 'black';
    newP.shadowBlur = 10;

    newP.fillStyle = this.color;
    newP.fillRect(this.size / -2, this.size / -2, this.size, this.size);

    newP.strokeRect(this.size / -2, this.size / -2, this.size, this.size);
    newP.restore();
  };

  //ažuriranje trenutne pozicije
  positionUpdate = () => {
    this.point_x += this.x_quickness;
    this.point_y += this.y_quickness;
  };
}


//područje na kojem se igra zbiva
class PlayingArea {
  constructor(canvasWidth, canvasHeight) {
    this.asteroids = [];
    this.canvas = document.createElement('canvas');
    this.drawingContext = this.canvas.getContext('2d');
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.currentTimeInterval = 0;
    this.mostSuccessfulTimeInterval = mostSuccessfulTimeLS();
    this.isPaused = false;
    this.collided = false;
    this.crashSound = document.getElementById('crashSound');
    
    this.canvas.addEventListener('click', () => {
      if (event.target === this.canvas) {
        return;
      }

      if (this.isPaused) {
        this.resumeGame();          //nastavak igre pri povratku u prozor preglednika s igrom
      } else {
        this.pauseGame();           //pauziranje igre ako se izašlo iz prozora preglednika s igrom
      } 
    });

    window.addEventListener('resize', () => {
      this.updateCanvasSize();      //prilagođavanje veličine canvasa ako se slučajno promijeni veličina prozora preglednika
      this.updateTextPosition();    //ažuriranje trenutnog vremena i najboljeg vremena na canvasu
    });
  }
  
  //postavljanje canvasa i osluškivanje vidljivosti prozora s igrom za automatsko pauziranje ili nastavak igre kada se prozor preglednika sakrije ili pojavi
  beginning = () => {
    const gameElement = document.getElementById('canvas');
    if (gameElement) {
      gameElement.insertBefore(this.canvas, gameElement.childNodes[0]);
      if (!this.began) {
        this.timeBeginning = new Date();
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.pauseGame();       //pauziranje igre ako se izašlo iz prozora preglednika s igrom
          } else {
            this.resumeGame();      //nastavak igre pri povratku u prozor preglednika s igrom
          }
        });

        
        this.interval = setInterval(() => {
          if (!this.isPaused) {
            playingAreaUpdated();     //ažuriranje konteksta igre
          }
        }, 20);

        this.began = true;
        this.updateCanvasSize();      //prilagođavanje veličine canvasa ako se slučajno promijeni veličina prozora preglednika
      }
    }
  };

  //igra se nastavlja ako igrač nije izašao iz prozora ili ju resetirao/refreshao
  resumeGame = () => {
    if (this.began && this.isPaused) {
      this.timeBeginning = new Date() - this.pauseTime;
      this.isPaused = false;
    }
  };

  //igra se pauzira ako je igrač slučajno izašao iz prozora
  pauseGame = () => {
    if (this.began && !this.isPaused) {
      this.pauseTime = new Date() - this.timeBeginning;
      this.isPaused = true;
    }
  };

  //provjera ako je igra završena (ili se dogodio sudar ili je igrač resetirao/refreshao igru)
  ending = () => {
    if (this.began) {
      clearInterval(this.interval);

      this.currentTimeInterval = new Date() - this.timeBeginning;

      for (const asteroid of this.asteroids) {
        if (playersCrash(player, asteroid)) {
          this.collided = true;
          break;
        }
      }

      if (
        (this.mostSuccessfulTimeInterval === 0 ||
          this.currentTimeInterval > this.mostSuccessfulTimeInterval) &&
        this.collided === true && this.countElapsedTime
      ) {
        this.mostSuccessfulTimeInterval = this.currentTimeInterval;
        localStorage.setItem('Najbolje vrijeme', this.currentTimeInterval);
      }

      this.began = false;
      this.countElapsedTime = false; 
    }
  };
  
  //ažuriranje trenutnog vremena i najboljeg vremena na canvasu
  updateTextPosition = () => {
    const { drawingContext, canvas, timeBeginning } = this;
    const mostSuccessfulTimeTextHeight = drawingContext.measureText(`Najbolje vrijeme: 00:00.000`).actualBoundingBoxAscent;
    const currentTimeTextHeight = drawingContext.measureText(`Vrijeme: 00:00.000`).actualBoundingBoxAscent;
  
    drawingContext.font = '32px Helvetica, sans-serif';
  
    //ažuriranje teksta u gornjem desnom kutu canvasa
    drawingContext.fillText(
      `Najbolje vrijeme: ${minSecMillisec(this.mostSuccessfulTimeInterval)}`,
      canvas.width - 10,
      mostSuccessfulTimeTextHeight + 20
    );
  
    drawingContext.fillText(
      `Vrijeme: ${minSecMillisec(new Date() - timeBeginning)}`,
      canvas.width - 10,
      mostSuccessfulTimeTextHeight + 20 + currentTimeTextHeight + 20
    );
  };

  //ažuriranje veličine canvasa ako se slučajno prozor s igrom smanji ili poveća
  updateCanvasSize = () => {
    const gameElement = document.getElementById('canvas');
    this.canvas.width = gameElement.clientWidth;
    this.canvas.height = gameElement.clientHeight;

    //ažuriranje pozicija novih asteroida ako se veličina prozora, time i canvasa, promijeni
    for (const asteroid of this.asteroids) {
      asteroid.playingArea = this;
    }
  };
  
  //ispis trenutnog i najboljeg vremena na canvas
  canvasTimePrint = () => {
    const { drawingContext, canvas, timeBeginning } = this;
    const currentTimeInterval = new Date() - timeBeginning;
    const currentTimeToString = minSecMillisec(currentTimeInterval);
  
    const mostSuccessfulTimeInterval = mostSuccessfulTimeLS();
    const mostSuccessfulTimeToString = minSecMillisec(mostSuccessfulTimeInterval);
  
    const mostSuccessfulTimeText = `Najbolje vrijeme: ${mostSuccessfulTimeToString}`;
    const mostSuccessfulTimeTextWidth = drawingContext.measureText(mostSuccessfulTimeText).width;
    const mostSuccessfulTimeTextHeight = drawingContext.measureText(mostSuccessfulTimeText).actualBoundingBoxAscent;
    
    const currentTimeText = `Vrijeme: ${currentTimeToString}`;
    const currentTimeTextWidth = drawingContext.measureText(currentTimeText).width;
    const currentTimeTextHeight = drawingContext.measureText(currentTimeText).actualBoundingBoxAscent;
  
    drawingContext.font = '32px Helvetica, sans-serif';
  
    //postavljanje oba vremena u gornji desni kut canvasa
    drawingContext.fillText(
      mostSuccessfulTimeText,
      canvas.width - mostSuccessfulTimeTextWidth - 10,
      mostSuccessfulTimeTextHeight + 20
    );
  
    drawingContext.fillText(
      currentTimeText,
      canvas.width - currentTimeTextWidth - 10,
      mostSuccessfulTimeTextHeight + 20 + currentTimeTextHeight + 20
    );
  };
  
  //stvaranje novog asteroida (nasumični izbor njegove veličine, nijanse sive boje i dijela ruba canvasa iz kojeg će se pojaviti)
  newObject = () => {
    const size = getRandomInt(10, 100);

    const positions = [
        { xRange: [0, this.canvas.width], yRange: [-120, -80], y_quickness: Math.random() * QUICKNESS_MAX, x_quickness: Math.random() * (QUICKNESS_MAX * 0.8) * 2 - QUICKNESS_MAX * 0.8 },
        { xRange: [-120, -80], yRange: [0, this.canvas.height], y_quickness: Math.random() * (QUICKNESS_MAX * 0.8) * 2 - QUICKNESS_MAX * 0.8, x_quickness: Math.random() * QUICKNESS_MAX },
        { xRange: [0, this.canvas.width], yRange: [this.canvas.height + 80, this.canvas.height + 120], y_quickness: -Math.random() * QUICKNESS_MAX, x_quickness: Math.random() * (QUICKNESS_MAX * 0.8) * 2 - QUICKNESS_MAX * 0.8 },
        { xRange: [this.canvas.width + 80, this.canvas.width + 120], yRange: [0, this.canvas.height], y_quickness: Math.random() * (QUICKNESS_MAX * 0.8) * 2 - QUICKNESS_MAX * 0.8, x_quickness: -Math.random() * QUICKNESS_MAX }
    ];

    const position = getRandomInt(0, 3);

    const { xRange, yRange, x_quickness, y_quickness } = positions[position];

    let point_x = getRandomInt(...xRange);
    let point_y = getRandomInt(...yRange);

    //izbor nijanse sive boje
    const baseGrayValue = 128;
    const offsetRange = [5, 25, 50, 75, 100]; 

    const grayShades = offsetRange.map(offset => {
      return `rgb(${baseGrayValue + offset}, ${baseGrayValue + offset}, ${baseGrayValue + offset})`;
    });

    //nasumični odabir nijanse sive boje za pojedini asteroid
    const asteroidColor = grayShades[getRandomInt(0, grayShades.length - 1)];

    //kreiranje objekta koji predstavlja asteroid
    const asteroid = new Asteroid (size, asteroidColor, 'black', point_x, point_y, x_quickness, y_quickness, this);

    //dodavanje asteroida u područje igre (na canvas)
    this.asteroids.push(asteroid);
  };

  //brisanje postojećih elemenata s canvasa prije nego se nacrtaju novi
  canvasClearance = () => {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };
};


//dohvaćanje najbolje ostvarenog vremena iz local storage-a
//najbolje vrijeme zapisuje se u local storage kao interval u milisekundama
const mostSuccessfulTimeLS = () => {
  const mostSuccessfulTimeStorage = localStorage.getItem('Najbolje vrijeme');

  if (mostSuccessfulTimeStorage === null || mostSuccessfulTimeStorage === "" || !/^[0-9]+$/.test(mostSuccessfulTimeStorage)) {
    // Ako je vrijednost prazna, nije broj ili ne postoji, vrati 0
    return 0;
  } else {
    // Ako je vrijednost valjana, parsiraj i vrati je
    return parseInt(mostSuccessfulTimeStorage);
  }
};

//pretvorba vremenskog intervala u milisekundama u traženi format (minute:sekunde.milisekunde)
const minSecMillisec = (interval) => {
  const minutes = Math.trunc(interval / 1000 / 60);
  const seconds = Math.trunc(interval / 1000) % 60;
  const milliseconds = interval % 1000;

  let minutesPrint, secondsPrint, millisecondsPrint;

  if (minutes < 10) {
    minutesPrint = `0${minutes}`;
  } else {
    minutesPrint = minutes;
  }

  if (seconds < 10) {
    secondsPrint = `0${seconds}`;
  } else {
    secondsPrint = seconds;
  }

  if (milliseconds < 10) {
    millisecondsPrint = `00${milliseconds}`;
  } else if (milliseconds < 100) {
    millisecondsPrint = `0${milliseconds}`;
  } else {
    millisecondsPrint = milliseconds;
  }

  const timeToPrint = `${minutesPrint}:${secondsPrint}.${millisecondsPrint}`;

  return timeToPrint;
};

//slučajno generiranje cijelog broja unutar zadanog raspona
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max + 1 - min) + min);
};

//pokretanje igre
const toBegin = () => {
  const gameElement = document.getElementById('canvas');

  //prilagodba veličine canvasa veličini prozora preglednika
  window.addEventListener('resize', () => {
    playingArea.updateCanvasSize();
    player.playingArea = playingArea; 
  });
  
  //generiranje asteroida na početku igre
  for (let i = 0; i < NUM_OF_ASTEROIDS; i++) {
    playingArea.newObject();      //stvaranje novog asteroida (nasumični izbor njegove veličine, nijanse sive boje i dijela ruba canvasa iz kojeg će se pojaviti)
  }
  //pokretanje konteksta igre
  playingArea.beginning();
};

//ažuriranje konteksta na canvasu
const playingAreaUpdated = () => {
  playingArea.canvasClearance();  //brisanje postojećih elemenata s canvasa prije nego se nacrtaju novi
  newAsteroid();                  //generiranje novih asteroida
  playingArea.canvasTimePrint();  //ispis trenutnog i najboljeg vremena na canvas
};

//generiranje novog asteroida
const newAsteroid = () => {
  if (Math.random() <= NEW_ASTEROID_POSSIBILITY && playingArea.asteroids.length <= MAX_ASTEROIDS) {
    playingArea.newObject();      //stvaranje novog asteroida (nasumični izbor njegove veličine, nijanse sive boje i dijela ruba canvasa iz kojeg će se pojaviti)
  }

  //ažuriranje pozicije igrača i brisanje asteroida koji su izašli izvan granica
  player.positionUpdate();

  //određivanje x i y pozicija crvenog igrača na canvasu za provjeru ako je igrač izašao iz područja canvasa
  const wrapAround = (point, min, max) => {
    if (point < min) {
      return max;
    } else if (point > max) {
      return min;
    }
    return point;
  };

  //provjera je li igrač na canvasu i vraćanje na suprotnu stranu ako je izašao iz canvasa
  const wrapPlayerAround = () => {
    player.point_x = wrapAround(player.point_x, 0, playingArea.canvas.width);
    player.point_y = wrapAround(player.point_y, 0, playingArea.canvas.height);
  };

  wrapPlayerAround(); //provjera je li igrač na canvasu i vraćanje na suprotnu stranu ako je izašao iz canvasa

  const asteroids = playingArea.asteroids;
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];
    asteroid.positionUpdate();          //ažuriranje pozicija asteroida ako je prešao na drugu stranu canvasa
    if (
      (asteroid.point_x <= minimum_X || asteroid.point_x >= maximum_X) &&
      (asteroid.point_y <= minimum_Y || asteroid.point_y >= maximum_Y)
    ) {
      asteroids.splice(i, 1);
    }
  }

  wrapPlayerAround(); //ponovna provjera je li igrač na canvasu i vraćanje na suprotnu stranu ako je izašao iz canvasa

  //crtanje novih pozicija i provjera je li došlo do kraja igre
  //priprema podataka pomoću playersCrash() s kojima se provjerava ako se dogodio sudar s asteroidom
  let collided = false;
  player.newPosition();
  for (const asteroid of playingArea.asteroids) {
    asteroid.newPosition();
    if (playersCrash(player, asteroid)) {
      collided = true;
    }
  }

  if (collided) {
    playingArea.crashSound.play();      //pusti zvuk pri sudaru
    playingArea.ending();               //završi igru
  }
};


//priprema podataka s kojima se provjerava ako se dogodio sudar s asteroidom
const playersCrash = (var1, var2) => {
  const peak1 = {
    max_X: var1.point_x + var1.size / 2,
    min_X: var1.point_x - var1.size / 2,
    max_Y: var1.point_y + var1.size / 2,
    min_Y: var1.point_y - var1.size / 2
  };

  const peak2 = {
    max_X: var2.point_x + var2.size / 2,
    min_X: var2.point_x - var2.size / 2,
    max_Y: var2.point_y + var2.size / 2,
    min_Y: var2.point_y - var2.size / 2
  };

  //provjera ako je došlo do sudara crvenog igrača s asteroidom
  if (
    collide(peak1, peak2) ||
    collide(peak2, peak1)
  ) {
    return true;
  } else {
    return false;
  }
};

//provjera nalazi li se igrač u području canvasa
const rangeCheck = (begin, end, value) => {
  if (value >= Math.min(begin, end) && value <= Math.max(begin, end)) {
    return true;
  } else {
    return false;
  }
};

//provjera je li jedan objekt unutar drugoga (je li se dogodio sudar crvenog igrača i asteroida)
const collide = (peak1, peak2) => {
  if (
    (rangeCheck(peak1.min_X, peak1.max_X, peak2.min_X) ||
      rangeCheck(peak1.min_X, peak1.max_X, peak2.max_X)) &&
    (rangeCheck(peak1.min_Y, peak1.max_Y, peak2.min_Y) ||
      rangeCheck(peak1.min_Y, peak1.max_Y, peak2.max_Y))
  ) {
    return true;
  } else {
    return false;
  }
};

//dohvaćanje HTML elementa za resetGameButton
const resetGameButton = document.getElementById('resetGameButton');

//funkcionalnost resetGameButton-a
resetGameButton.addEventListener('click', () => {
  resetGame();
});

//resetiranje igre (ili klikom na "New Game" button ili refreshanjem stranice)
const resetGame = () => {
  if (playingArea.began) {
    playingArea.ending();
  }

  playingArea.asteroids = [];

  //centriranje crvenog igrača na canvasu
  player.point_x = playingArea.canvas.width / 2;
  player.point_y = playingArea.canvas.height / 2;

  //reset početnog vremena
  playingArea.timeBeginning = 0;

  //reset pauziranog stanja
  playingArea.isPaused = false;

  if (!playingArea.began) {
    playingArea.updateCanvasSize();     //prilagođavanje veličine canvasa ako se slučajno promijeni veličina prozora preglednika
    player.playingArea = playingArea;
  }

  playingArea.countElapsedTime = true;

  //localStorage.clear();

  //ponovno pokretanje igre
  toBegin();

  //prikaz oba vremena na canvasu
  playingArea.canvasTimePrint();
};


//kontroliranje smjera i brzine kretanja crvenog igrača kad se pritisne određena strelica
document.body.addEventListener('keyup', (event) => {
  const { key, keyCode } = event;

  if (keyCode === 38 || keyCode === 40) { // ArrowUp i ArrowDown
    player.y_quickness = 0;
  } else if (keyCode === 37 || keyCode === 39) { // ArrowLeft i ArrowRight
    player.x_quickness = 0;
  }
});

//zaustavljanje kretanja crvenog igrača
document.body.addEventListener('keydown', (event) => {
  const { key, keyCode } = event;

  if (keyCode === 38) { // ArrowUp
    player.y_quickness = -QUICKNESS_MAX;
  } else if (keyCode === 40) { // ArrowDown
    player.y_quickness = QUICKNESS_MAX;
  } else if (keyCode === 37) { // ArrowLeft
    player.x_quickness = -QUICKNESS_MAX;
  } else if (keyCode === 39) { // ArrowRight
    player.x_quickness = QUICKNESS_MAX;
  }
});


//instanciranje canvasa u kojem se igra
const playingArea = new PlayingArea(document.getElementById('canvas').clientWidth, document.getElementById('canvas').clientHeight);

playingArea.countElapsedTime = true;

//instanciranje crvenog igrača
const player = new Asteroid (40, 'red', '#d0d0d0', document.getElementById('canvas').clientWidth / 2, document.getElementById('canvas').clientHeight / 2, 0, 0, playingArea);
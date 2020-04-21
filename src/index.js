const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const rules = {
  "5": {
    stage: [2, 3, 2, 3, 3],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민"],
  },
  "6": {
    stage: [2, 3, 4, 3, 4],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민", "시민"],
  },
  "7": {
    stage: [2, 3, 2, 3, 3],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민"],
  },
  "8": {
    stage: [2, 3, 2, 3, 3],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민"],
  },
  "9": {
    stage: [2, 3, 2, 3, 3],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민"],
  },
  "10": {
    stage: [2, 3, 2, 3, 3],
    classes: ["멀린", "암살자", "모르가나", "퍼시벌", "시민"],
  },
};

const games = [];
const gameInfos = [];

app.use(express.static("src"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/game/:id/:name", (req, res) => {
  res.sendFile(__dirname + "/main.html");
});

io.on("connection", (socket) => {
  io.emit("gameList", games);
  socket.on("newGame", (game) => {
    if (game.total < 5 || game.total > 6) {
      return;
    }
    const id = Date.now();
    games.push({
      id,
      ...game,
      num: 0,
    });
    const space = io.of("/" + id);
    const index = games.length - 1;
    io.emit("gameList", games);
    const { stage, classes } = rules[game.total];
    gameInfos.push({
      playerNum: game.total,
      players: [],
      getNumber: {},
      isReady: {},
      stage,
      classes,
      expeditionResult: [],
      nowStage: 0,
      expeditionNum: 0,
      expedition: Array(game.total).fill(false),
      history: Array(game.total),
      votes: Array(game.total).fill(false),
      king: 0,
      voteCnt: 0,
    });

    space.on("connection", (socket) => {
      socket.on("join", (name) => {
        if (gameInfos[index].players.includes(name)) {
          socket.emit("block", "동일한 이름은 사용할 수 없습니다.");
          return;
        }
        games[index].num++;
        io.emit("gameList", games);

        gameInfos[index].players.push(name);
        gameInfos[index].getNumber[name] = gameInfos[index].players.length;
        gameInfos[index].isReady[name] = false;
        console.log(name + " joined server");
        space.emit("join", gameInfos[index].players);
      });

      socket.on("leave", (name) => {
        games[index].num--;
        io.emit("gameList", games);
        const playerIndex = gameInfos[index].players.indexOf(name);
        gameInfos[index].players.splice(playerIndex, 1);
        delete gameInfos[index].getNumber[name];
        delete gameInfos[index].isReady[name];
        console.log(name + " leaved server");
      });

      socket.on("expedition", (num, value) => {
        gameInfos[index].expeditionResult.push(value == "true");
        if (
          gameInfos[index].expeditionResult.length ==
          gameInfos[index].stage[nowStage]
        ) {
          const result = gameInfos[index].expeditionResult.every((v) => v);
          space.emit("expeditionResult", gameInfos[index].nowStage, result);
          gameInfos[index].expeditionResult = [];
          gameInfos[index].nowStage++;
          gameInfos[index].expedition = Array(gameInfos[index].playerNum).fill(
            false
          );
          gameInfos[index].voteCnt = 0;
          space.emit("expedition", gameInfos[index].expedition);
          space.emit("king", gameInfos[index].king);
        }
      });
      socket.on("member", (number) => {
        if (gameInfos[index].expeditionNum < gameInfos[index].stage[nowStage]) {
          if (gameInfos[index].expedition[number - 1]) return;
          gameInfos[index].expeditionNum++;
          gameInfos[index].expedition[number - 1] = true;
          space.emit("expedition", gameInfos[index].expedition);
          if (
            gameInfos[index].expeditionNum ==
            gameInfos[index].stage[gameInfos[index].nowStage]
          ) {
            gameInfos[index].history = Array(gameInfos[index].playerNum);
            space.emit("vote", gameInfos[index].voteCnt);
          }
        }
      });
      socket.on("vote", (num, value) => {
        gameInfos[index].history[num - 1] = value == "true";
        gameInfos[index].votes[num - 1] = true;
        if (votes.every((v) => v)) {
          gameInfos[index].king =
            (gameInfos[index].king + 1) % gameInfos[index].playerNum;
          gameInfos[index].expeditionNum = 0;
          gameInfos[index].votes = Array(6).fill(false);
          space.emit("voteResult", gameInfos[index].history);
          const isGo = gameInfos[index].history.reduce(
            (a, c) => (c ? a + 1 : a),
            0
          );
          if (isGo > 2) {
            space.emit("startExpediton", gameInfos[index].expedition);
          } else {
            gameInfos[index].history = Array(gameInfos[index].playerNum);
            gameInfos[index].expedition = Array(
              gameInfos[index].playerNum
            ).fill(false);
            space.emit("vote", ++gameInfos[index].voteCnt);
            space.emit("expedition", gameInfos[index].expedition);
            space.emit("king", gameInfos[index].king);
          }
        }
      });

      socket.on("chat message", (name, msg) => {
        console.log(`${name} : ${msg}`);
        space.emit("chat message", name, gameInfos[index].getNumber[name], msg);
        if (msg === "ready") {
          gameInfos[index].isReady[name] = true;
          if (Object.values(isReady).every((v) => v)) {
            const shuffled = classes.sort(() => 0.5 - Math.random());
            space.emit("class", shuffled);
            console.log(shuffled);
            console.log("start");
            space.emit("chat message", "관리자", 0, "게임이 시작되었습니다.");
            space.emit("king", gameInfos[index].king);
          }
        }
      });
    });
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

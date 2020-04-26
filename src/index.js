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

let gameList = [];
const gameInfos = [];

app.use(express.static("src"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/game/:id/:name", (req, res) => {
  res.sendFile(__dirname + "/main.html");
});

const updateGameList = (id, num) => {
  gameList.forEach((game, index) => {
    if (game.id === id) {
      gameList[index].num = num;
    }
  });
};

io.on("connection", (defaultSocket) => {
  console.log("user connected");
  io.emit("gameList", gameList);

  defaultSocket.on("newGame", (game) => {
    if (game.total < 5 || game.total > 6) {
      return;
    }
    gameList.push({
      ...game,
      num: 0,
    });
    const space = io.of("/" + game.id);
    io.emit("gameList", gameList);
    const { stage, classes } = rules[game.total];
    const playerNum = Number(game.total);
    const gameInfo = {
      id: game.id,
      playerNum,
      players: [],
      getNumber: {},
      isReady: {},
      stage,
      stageResult: { success: 0, fail: 0 },
      classes,
      expeditionResult: [],
      nowStage: 0,
      expeditionNum: 0,
      expeditionMember: Array(playerNum).fill(false),
      history: Array(playerNum),
      votes: Array(playerNum).fill(false),
      king: 0,
      voteCnt: 0,
      merlin: -1,
      assassin: -1,
    };

    space.on("connection", (socket) => {
      // 스테이지 설정
      socket.emit("stage", gameInfos[index].stage);

      const addPlayer = (name) => {
        gameInfo.players.push(name);
        gameInfo.getNumber[name] = gameInfo.players.length;
        gameInfo.isReady[name] = false;
      };

      const removePlayer = (name) => {
        const index = gameInfo.players.indexOf(name);
        gameInfo.players.splice(index, 1);
        delete gameInfo.getNumber[name];
        delete gameInfo.isReady[name];
      };

      const removeSocket = (id) => {
        Object.keys(space.connected).forEach((socketId) => {
          space.connected[socketId].disconnect();
        });
        space.removeAllListeners();
        delete io.nsps["/" + id];
        const index = gameList.findIndex((game) => game.id === id);
        delete gameList[index];
        io.emit("gameList", gameList);
      };

      const terminateGame = (winner) => {
        space.emit(
          "chat message",
          "관리자",
          0,
          `${winner ? "선" : "악"}의 승리입니다.`
        );
        space.emit("exit", -1);
        removeSocket(gameInfo.id);
      };

      const joinGame = (name) => {
        if (gameInfo.players.includes(name)) {
          socket.emit("block", "동일한 이름은 사용할 수 없습니다.");
          return;
        }
        addPlayer(name);
        updateGameList(gameInfo.id, gameInfo.players.length);
        io.emit("gameList", gameList);

        console.log(name + " joined server");
        space.emit("chat message", name, 0, "님이 입장하였습니다.");
        space.emit("join", gameInfo.players);
      };

      const leaveGame = (name) => {
        removePlayer(name);
        console.log(name + " leaved server");
        updateGameList(gameInfo.id, gameInfo.players.length);
        io.emit("gameList", gameList);
        // 참가자 목록 업데이트
        space.emit("join", gameInfo.players);
        space.emit("chat message", name, 0, "님이 퇴장하였습니다.");
        if (gameInfo.players.length == 0) {
          removeSocket(gameInfo.id);
        }
      };

      const isAllReady = (current, total, readyList) => {
        if (current !== total) return false;
        return Object.values(readyList).every((v) => v);
      };

      const startGame = (classes) => {
        const shuffled = classes.sort(() => 0.5 - Math.random());
        shuffled.forEach((c, i) => {
          if (c == "멀린") {
            gameInfo.merlin = i + 1;
          }
          if (c == "암살자") {
            gameInfo.assassin = i + 1;
          }
        });
        space.emit("class", shuffled);
        space.emit("chat message", "관리자", 0, "게임이 시작되었습니다.");
        space.emit("king", gameInfo.king, 0);
      };

      const readyGame = (name) => {
        gameInfo.isReady[name] = true;
        if (
          isAllReady(
            gameInfo.players.length,
            gameInfo.playerNum,
            gameInfo.isReady
          )
        ) {
          startGame(gameInfo.classes);
        }
      };

      const isSelected = (expeditionMember, number) => {
        return expeditionMember[number];
      };
      const getExpeditionNum = (expeditionMember) => {
        return expeditionMember.reduce((num, exp) => (exp ? num + 1 : num), 0);
      };
      const isCompleteSelect = (current, total) => {
        return current === total;
      };

      const selectMember = (number) => {
        if (isSelected(gameInfo.expeditionMember, number - 1)) return;
        const expeditionNum = getExpeditionNum(gameInfo.expeditionMember);
        const total = gameInfo.stage[gameInfo.nowStage];

        if (isCompleteSelect(expeditionNum, total)) return;

        gameInfo.expeditionMember[number - 1] = true;
        space.emit("showMember", gameInfo.expedition);

        if (isCompleteSelect(expeditionNum + 1, total)) {
          gameInfo.history = Array(gameInfos[index].playerNum);
          gameInfo.isVoted = Array(gameInfos[index].playerNum);
          space.emit("vote");
        }
      };

      const isCompleteVote = (isVoted) => {
        return isVoted.every((v) => v);
      };

      const nextKing = (current, total) => {
        return (current + 1) % total;
      };

      const isMajority = (voteResult, playerNum) => {
        const agreeNum = voteResult.reduce(
          (num, isAgree) => (isAgree ? num + 1 : num),
          0
        );

        return agreeNum > Math.floor(playerNum / 2);
      };

      const checkFinish = ({ success, fail }) => {
        switch (3) {
          case success:
            space.emit("exit", gameInfo.assassin);
            break;
          case fail:
            terminateGame(false);
            break;
          default:
            break;
        }
      };

      const initVote = (playerNum) => {
        gameInfo.votes = Array(playerNum).fill(false);
        gameInfo.history = Array(playerNum);
      };

      const initStage = (stageNum) => {
        gameInfo.expeditionResult = [];
        gameInfo.nowStage = stageNum;
        gameInfo.expeditionMember = Array(gameInfo.playerNum).fill(false);
        gameInfo.voteCnt = 0;
        space.emit("showMember", gameInfo.expeditionMember);
        space.emit("king", gameInfo.king, 0);
      };

      const voteForSelected = (num, value) => {
        gameInfo.history[num - 1] = value == "true";
        gameInfo.isVoted[num - 1] = true;
        if (isCompleteVote(gameInfo.isVoted)) {
          space.emit("voteResult", gameInfos[index].history);
          gameInfo.king = nextKing(gameInfo.king, gameInfo.playerNum);
          if (isMajority(gameInfo.history, gameInfo.playerNum)) {
            // 투표 통과
            space.emit(
              "startExpediton",
              gameInfo.nowStage,
              gameInfo.expeditionMember
            );
            initVote(gameInfo.playerNum);
          } else {
            // 투표 실패
            if (gameInfo.voteCnt === 4) {
              space.emit("expeditionResult", gameInfo.nowStage, false);
              gameInfo.stageResult.fail++;
              checkFinish(gameInfo.stageResult);
            } else {
              initVote(gameInfo.playerNum);
              initStage(gameInfo.stageNum + 1);
            }
            gameInfo.expeditionMember = Array(gameInfo.playerNum).fill(false);
            space.emit("showMember", gameInfo.expeditionMember);
            space.emit("king", gameInfo.king, ++gameInfo.voteCnt);
          }
        }
      };

      const showResult = (expeditionResult) => {
        const result = expeditionResult.every((v) => v);
        gameInfo.stageResult[result ? "success" : "fail"]++;
        space.emit("expeditionResult", gameInfo.nowStage, result);
      };
      const voteForExpedition = (num, value) => {
        gameInfo.expeditionResult.push(value == "true");
        if (
          isCompleteSelect(
            gameInfo.expeditionResult.length,
            gameInfo.stage[gameInfo.nowStage]
          )
        ) {
          showResult(gameInfo.expeditionResult);
          checkFinish(gameInfo.stageResult);
          initStage(gameInfo.nowStage + 1);
        }
      };

      const findMerlin = (number) => {
        space.emit("merlinResult", number, gameInfo.merlin);
        if (number == gameInfo.merlin) {
          space.emit("chat message", "관리자", 0, "악의 승리입니다.");
        } else {
          space.emit("chat message", "관리자", 0, "선의 승리입니다.");
        }
        removeSocket(gameInfo.id);
      };

      socket.on("join", joinGame);
      socket.on("leave", leaveGame);
      socket.on("ready", readyGame);
      socket.on("member", selectMember);
      socket.on("vote", voteForSelected);
      socket.on("expedition", voteForExpedition);
      socket.on("merlin", findMerlin);

      socket.on("chat message", (name, num, msg) => {
        console.log(`${name} : ${msg}`);
        space.emit("chat message", name, num, msg);
      });
    });
  });
  defaultSocket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

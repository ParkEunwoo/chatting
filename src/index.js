const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const playerNum = 5;

const players = [];
const getNumber = {};
const isReady = {};
const stage = [2, 3, 2, 3, 3];
let expeditionResult = [];
let nowStage = 0;
let expeditionNum = 0;
const classes = ["멀린", "암살자", "모르가나", "퍼시벌", "시민"];

let expedition = Array(playerNum).fill(false);
let history = Array(playerNum);
let votes = Array(playerNum).fill(false);
let king = 0;
let voteCnt = 0;

app.use(express.static("src"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join", (name) => {
    players.push(name);
    getNumber[name] = players.length;
    isReady[name] = false;
    console.log(name + " joined server");
    io.emit("join", players);
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("expedition", (num, value) => {
    expeditionResult.push(value == "true");
    if (expeditionResult.length == stage[nowStage]) {
      const result = expeditionResult.every((v) => v);
      io.emit("expeditionResult", nowStage, result);
      expeditionResult = [];
      nowStage++;
      expedition = Array(playerNum).fill(false);
      voteCnt = 0;
      io.emit("expedition", expedition);
      io.emit("king", king);
    }
  });
  socket.on("member", (number) => {
    if (expeditionNum < stage[nowStage]) {
      if (expedition[number - 1]) return;
      expeditionNum++;
      expedition[number - 1] = true;
      io.emit("expedition", expedition);
      if (expeditionNum == stage[nowStage]) {
        history = Array(playerNum);
        io.emit("vote", voteCnt);
      }
    }
  });
  socket.on("vote", (num, value) => {
    history[num - 1] = value == "true";
    votes[num - 1] = true;
    if (votes.every((v) => v)) {
      king = (king + 1) % playerNum;
      expeditionNum = 0;
      votes = Array(6).fill(false);
      io.emit("voteResult", history);
      const isGo = history.reduce((a, c) => (c ? a + 1 : a), 0);
      console.log(expedition);
      console.log(isGo);
      if (isGo > 2) {
        io.emit("startExpediton", expedition);
      } else {
        history = Array(playerNum);
        expedition = Array(playerNum).fill(false);
        io.emit("vote", ++voteCnt);
        io.emit("expedition", expedition);
        io.emit("king", king);
      }
    }
  });

  socket.on("chat message", (name, msg) => {
    console.log(`${name} : ${msg}`);
    io.emit("chat message", name, getNumber[name], msg);
    if (msg === "ready") {
      isReady[name] = true;
      if (Object.values(isReady).every((v) => v)) {
        const shuffled = classes.sort(() => 0.5 - Math.random());
        io.emit("class", shuffled);
        console.log(shuffled);
        console.log("start");
        io.emit("chat message", "관리자", 0, "게임이 시작되었습니다.");
        io.emit("king", king);
      }
    }
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

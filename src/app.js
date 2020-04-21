const id = location.href.split("/")[4];
const name = location.href.split("/")[5];
let isBlock = false;
document.querySelector(".name").textContent = name;

const socket = io("/" + id);
window.onbeforeunload = () => {
  if (!isBlock) socket.emit("leave", name);
};

window.onload = () => {
  socket.emit("join", name);
  socket.on("block", (msg) => {
    isBlock = true;
    alert(msg);
    location.href = "/";
  });

  const form = document.querySelector("#chat");
  const send = document.querySelector("#m");
  const messages = document.querySelector(".messages");
  const participants = document.querySelector(".participants");
  const selection = document.querySelector(".selection");
  const histories = document.querySelector(".history");
  const votes = document.querySelector(".votes");
  const stages = document.querySelector(".stages");
  let whatVote = "vote";
  let myNum = 0;
  let isKing = false;
  let myClass = "";

  socket.on("join", function (players) {
    if (myNum === 0) myNum = players.length;
    participants.innerHTML = players
      .map((name, index) => `<li class="player${index + 1}">${name}</li>`)
      .join("");
  });

  participants.addEventListener("click", (event) => {
    if (isKing) {
      socket.emit("member", event.target.classList[0].substr(-1));
    }
  });

  selection.addEventListener("click", (event) => {
    socket.emit(whatVote, myNum, event.target.classList[0]);
    whatVote = "vote";
    selection.style.display = "none";
  });

  socket.on("expedition", (list) => {
    [...participants.children].forEach((elem, index) => {
      if (list[index]) {
        elem.classList.add("expedition");
      } else {
        elem.classList.remove("expedition");
      }
    });
  });

  socket.on("vote", (voteNum) => {
    selection.style.display = "flex";
    [...votes.children].forEach((elem, index) => {
      if (index == voteNum) {
        elem.classList.add("flag");
      } else {
        elem.classList.remove("flag");
      }
    });
  });

  socket.on("voteResult", (history) => {
    const list = document.createElement("li");
    list.innerHTML = history
      .map((v) => `<div class="${v ? "agree" : "disagree"}"></div>`)
      .join("");
    histories.appendChild(list);
  });

  socket.on("expeditionResult", (stage, result) => {
    stages.children[stage].classList.add(result ? "success" : "fail");
  });

  socket.on("startExpediton", (member) => {
    if (member[myNum - 1]) {
      selection.style.display = "flex";
      whatVote = "expedition";
    }
  });

  socket.on("king", (king) => {
    if (myNum - 1 === king) isKing = true;
    else isKing = false;
    [...participants.children].forEach((elem, index) => {
      if (king === index) {
        elem.classList.add("king");
      } else {
        elem.classList.remove("king");
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (send.value === "") return;
    socket.emit("chat message", name, send.value);
    send.value = "";
  });

  socket.on("class", (shuffled) => {
    myClass = shuffled[myNum - 1];
    document.querySelector(".class").textContent = myClass;

    switch (myClass) {
      case "멀린":
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
      case "암살자":
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
      case "퍼시벌":
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "멀린" || shuffled[index] == "모르가나") {
            elem.classList.add("blue");
          }
        });
        break;
      case "모르가나":
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
    }
  });

  socket.on("chat message", function (name, number, msg) {
    const message = document.createElement("li");
    message.innerHTML = `<span class="player${number}">${name}</span><span> : ${msg}</span>`;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  });
};

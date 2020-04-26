const id = location.href.split("/")[4];
const name = decodeURI(location.href.split("/")[5]);
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
  const expeditions = document.querySelector(".expeditions");
  const prepare = document.querySelector(".prepare");

  const readyHandler = (event) => {
    event.preventDefault();
    socket.emit("ready", name);

    prepare.classList.add("ready");
    prepare.disabled = true;
    prepare.removeEventListener("click", readyHandler);
  };
  prepare.addEventListener("click", readyHandler);

  socket.on("stage", (round) => {
    [...stages.children].forEach((elem, i) => {
      elem.textContent = round[i];
    });
  });
  let whatVote = "vote";
  let myNum = 0;
  let isKing = false;
  let myClass = "";

  socket.on("join", function (players) {
    myNum = players.indexOf(name) + 1;
    participants.innerHTML = players
      .map((name, index) => `<li class="player${index + 1}">${name}</li>`)
      .join("");
  });

  const selectMember = (event) => {
    if (isKing) {
      socket.emit("member", event.target.classList[0].substr(-1));
    }
  };

  const voteHandler = (event) => {
    socket.emit(whatVote, myNum, event.target.classList[0]);
    whatVote = "vote";
    selection.style.display = "none";
  };

  const findMerlin = (event) => {
    socket.emit("merlin", event.target.classList[0].substr(-1));
    participants.removeEventListener("click", findMerlin);
  };

  participants.addEventListener("click", selectMember);

  selection.addEventListener("click", voteHandler);

  socket.on("showMember", (list) => {
    [...participants.children].forEach((elem, index) => {
      if (list[index]) {
        elem.classList.add("expedition");
      } else {
        elem.classList.remove("expedition");
      }
    });
  });

  socket.on("vote", () => {
    selection.style.display = "flex";
  });
  socket.on("voteResult", (history) => {
    const list = document.createElement("li");
    list.innerHTML = history
      .map(
        (v, i) =>
          `<div class="${v ? "agree" : "disagree"} player${i + 1}"></div>`
      )
      .join("");
    histories.appendChild(list);

    selection.style.display = "none";
  });

  socket.on("expeditionResult", (stage, result) => {
    const divide = document.createElement("hr");
    histories.appendChild(divide);
    stages.children[stage].classList.add(result ? "success" : "fail");

    selection.lastElementChild.style.display = "block";
    [...votes.children].forEach((elem, index) => {
      if (index == 0) {
        elem.classList.add("flag");
      } else {
        elem.classList.remove("flag");
      }
    });
  });

  socket.on("startExpediton", (round, member) => {
    member.forEach((m, i) => {
      if (m) {
        expeditions.children[round].innerHTML += `<div class="exp p${
          i + 1
        }"></div>`;
      }
    });
    if (member[myNum - 1]) {
      selection.style.display = "flex";
      switch (myClass) {
        case "멀린":
        case "퍼시벌":
        case "시민":
          selection.lastElementChild.style.display = "none";
          break;
      }
      whatVote = "expedition";
    }
  });

  socket.on("king", (king, voteNum) => {
    if (myNum - 1 === king) isKing = true;
    else isKing = false;
    [...participants.children].forEach((elem, index) => {
      if (king === index) {
        elem.classList.add("king");
      } else {
        elem.classList.remove("king");
      }
    });

    [...votes.children].forEach((elem, index) => {
      if (index == voteNum) {
        elem.classList.add("flag");
      } else {
        elem.classList.remove("flag");
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (send.value === "") return;
    socket.emit("chat message", name, myNum, send.value);
    send.value = "";
  });

  socket.on("class", (shuffled) => {
    myClass = shuffled[myNum - 1];
    document.querySelector(".class").textContent = myClass;

    switch (myClass) {
      case "멀린":
        document.querySelector(".class").classList.add("good");
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
      case "암살자":
        document.querySelector(".class").classList.add("bad");
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
      case "퍼시벌":
        document.querySelector(".class").classList.add("good");
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "멀린" || shuffled[index] == "모르가나") {
            elem.classList.add("blue");
          }
        });
        break;
      case "모르가나":
        document.querySelector(".class").classList.add("bad");
        [...participants.children].forEach((elem, index) => {
          if (shuffled[index] == "암살자" || shuffled[index] == "모르가나") {
            elem.classList.add("red");
          }
        });
        break;
      default:
        document.querySelector(".class").classList.add("good");
        break;
    }
  });

  socket.on("merlinResult", (select, merlin) => {
    participants.children[select - 1].classList.add("selected");
    participants.children[merlin - 1].classList.add("merlin");
  });

  socket.on("exit", (assassin) => {
    if (myNum != assassin) {
      participants.removeEventListener("click", selectMember);
      selection.removeEventListener("click", voteHandler);
    }
    if (assassin != -1) {
      participants.children[assassin - 1].classList.add("assassin");
      if (myNum == assassin) {
        participants.addEventListener("click", findMerlin);
      }
    }
  });

  socket.on("chat message", function (name, number, msg) {
    const message = document.createElement("li");
    if (number == 0) {
      message.classList.add("player0");
    }
    message.innerHTML = `<span class="player${number}">${name}</span><span> : ${msg}</span>`;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  });
};

const ANIMALS = ['cat','dog','fish'];
const ADJECTIVES = ['big','small','friendly'];

$(function () {
  var socket = io();

  // Set page into 'wait' mode
  setWaitMode();

  // Inform the server of the name of the room
  socket.emit('room-name', window.location.pathname.split("/").pop());

  // Assign newly connected user a random name
  setName(randomName());

  socket.on('scorecard', function (scorecard) {
    // Determine if single or multiplayer mode
    var singleplayerSC = document.getElementById("singleplayer-score-card");
    var multiplayerSC = document.getElementById("multiplayer-score-card");
    if(scorecard.length > 1){
      var tableBody = multiplayerSC.querySelector('tbody');
      tableBody.innerHTML = "";
      scorecard.forEach(function(userInfo){
        var row = document.createElement('tr');
        row.classList.add("player-info-row");
        row.innerHTML = '<td><div class="text-center my-badge md-badge accent-mid-light shadow-sm">' + userInfo.wins + '</div></td><td>' +
          userInfo.username + '</td><td><div class="text-center my-badge md-badge primary-mid-light shadow-sm">' + userInfo.highScore + '</div></td>';
        tableBody.appendChild(row);
      });
      singleplayerSC.style.display = "none";
      multiplayerSC.style.display = "block";
    } else {
      var SCRow = document.createElement('div');
      SCRow.classList.add("info-row");
      SCRow.innerHTML = '<span class="float-left">High Score</span><span class="float-right"><div class="text-center my-badge md-badge primary-mid-light shadow-sm">' +
        scorecard[0].highScore + '</div></span>';
      singleplayerSC.innerHTML = "";
      singleplayerSC.appendChild(SCRow);
      singleplayerSC.style.display = "block";
      multiplayerSC.style.display = "none";
    }
  });

  socket.on('game-state', function (state){
    console.log("Received game state");
    var pauseBTN = document.getElementById("pause");
    var resumeBTN = document.getElementById("resume");
    switch(state){
      case 'ready':
        setWaitMode();
        break;
      case 'playing':
        pauseBTN.style.display = "inline";
        resumeBTN.style.display = "none";
        break;
      case 'paused':
        pauseBTN.style.display = "none";
        resumeBTN.style.display = "inline";
        break;
    }
  });

  socket.on('board', function (board) {
    console.log("Received board");
    startRound(board);
  });

  socket.on('time', function (time) {
    var seconds = time % 60;
    var minutes = (time - seconds) / 60;
    var timerVal = minutes + ':' + seconds;
    if (seconds <= 9) {
      timerVal = minutes + ':0' + seconds;
    }
    document.getElementById("timer").innerHTML = timerVal
  });

  socket.on('send-words', function (board) {
    console.log("Sending word list");
    var wordList = [];
    $('#found-words').find('.word').each(function () {
      wordList.push($(this).text());
    });
    socket.emit('found-words', wordList);
  });

  socket.on('result', function (result) {
    console.log("Result received");
    endRound(result);
  });

  // Sets the name of the user
  function setName(name){
    socket.emit("username", name);
    $('#username').val(name);
  }

  // Generates a random name for the user
  function randomName() {
    return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + "-" + ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  }

  // Submit button submits word
  document.getElementById("submit-word").addEventListener("click", function(){
    submitWord();
  });

  // Enter submits word
  document.getElementById("word").addEventListener("keyup", function(event){
    if(event.keyCode === 13){
      event.preventDefault();
      submitWord();
    }
  });

  // Change name
  document.getElementById("username").addEventListener("keyup", function(event){
    if(event.keyCode === 13){
      event.preventDefault();
      document.getElementById("username").blur();
    } else {
      var name = document.getElementById("username").value;
      if (!name == "") {
        socket.emit("username", name);
      }
    }
  });

  // Toggle sort results
  document.getElementById('sortResultsToggle').addEventListener("click", sortResultsCheck);

  // Add a word to the word list
  function submitWord(){
    var word = $("#word").val();
    $("#word").val('');
    $("#word").focus();
    if(word.length < 4){
      throwError("Words must be at least four letters long");

    } else if(isDuplicate(word)){
      throwError("Word already found");
    } else {
      document.getElementById('error-container').innerHTML = "";
      $(document).on("click", "#found-words .delete-word", function () {
        $that = $(this);
        $that.parent().remove();
      });
      $("#found-words").prepend('<li><span class="word">' + word + '</span><div class="float-right my-badge delete-word shadow-sm" onmouseover="">x</div></li>');
    }
  }

  // Checks if the given word is a duplicate
  function isDuplicate(word){
    var wordList = [];
    $('#found-words').find('.word').each(function () {
      wordList.push($(this).text());
    });
    return wordList.includes(word);
  }

  // Throws the given error message, clears after 3 seconds
  function throwError(message){
    document.getElementById('error-container').innerHTML = message;
    setTimeout(
      function() {
        document.getElementById('error-container').innerHTML = "";
      }, 3000);
  }

  // Set up the page as it should be before the game starts
  function setWaitMode(){
    document.getElementById("post-game-container").style.display = "none";
    var inGameDivs = document.getElementsByClassName("in-game");
    for(var i=0; i < inGameDivs.length; i++){
      inGameDivs[i].style.display = "none";
    }
  }

  // Set elements visible needed for playing a round, clear any words from last round
  function startRound(board){
    $('#board div').remove();
    document.getElementById("found-words").innerHTML = "";
    board.forEach(letter => $('#board').append('<div class="board-cell grey-ultralight light-grey-border">' + letter + '</div>'));
    document.getElementById("start-round").disabled = true;
    document.getElementById("welcome").style.display = "none";
    document.getElementById("post-game-container").style.display = "none";
    var inGameDivs = document.getElementsByClassName("in-game");
    for(var i=0; i < inGameDivs.length; i++){
      inGameDivs[i].style.display = "block";
    }
    document.getElementById('word').focus();
  }

  function endRound(result){
    var container = document.getElementById("post-game-container");
    container.innerHTML = "";
    for(var i = 0; i < result.length; i++){
      var player = result[i];
      var player_card = document.createElement('div');
      player_card.classList.add("card", "player-result", "light-grey-border", "shadow", "mx-3", "mb-3");
      var header = document.createElement('div');
      header.classList.add("card-header", "py-2", "px-3", "grey-ultralight", "header-light-grey-border");
      header.innerHTML = '<div class="font-weight-bold">' + player.name + '</div><div class="float-left">Score: <div class="my-badge md-badge primary-mid-light shadow-sm">' +
        player.score + '</div></div><div class="float-right">Words: <div class="my-badge md-badge accent2-mid-light shadow-sm">' + player.validWords + '</div></div>';
      var body = document.createElement('div');
      body.classList.add("card-body", "grey-ultralight", "overflow-auto");
      var unsortedWords = document.createElement('ol');
      unsortedWords.classList.add("mb-0", "unsorted-result");
      unsortedWords.innerHTML = generatedPlayerResultList(result[i].wordsUnsorted);
      var sortedWords = document.createElement('ol');
      sortedWords.classList.add("mb-0", "sorted-result", "d-none");
      sortedWords.innerHTML = generatedPlayerResultList(result[i].wordsSorted);
      body.appendChild(unsortedWords);
      body.appendChild(sortedWords);
      player_card.appendChild(header);
      player_card.appendChild(body);
      container.append(player_card);
    }
    document.getElementById("start-round").disabled = false;
    var inGameDivs = document.getElementsByClassName("in-game");
    for(var i=0; i < inGameDivs.length; i++){
      inGameDivs[i].style.display = "none";
    }
    document.getElementById("post-game-container").style.display = "block";
    sortResultsCheck();
  }

  function generatedPlayerResultList(list){
    result = [''];
    list.forEach(function(pair){
      var wordStyling;
      var badgeStyling;
      var val = pair['val'];
      var word = pair['word'];
      switch(val){
        case -1:
          wordStyling = "danger-color";
          badgeStyling = "danger";
          break;
        case 0:
          wordStyling = "canceled-color";
          badgeStyling = "canceled";
          break;
        case 1:
          wordStyling = "correct-color";
          badgeStyling = "correct-1";
          break;
        case 2:
          wordStyling = "correct-color";
          badgeStyling = "correct-2";
          break;
        case 3:
          wordStyling = "correct-color";
          badgeStyling = "correct-3";
          break;
        case 5:
          wordStyling = "correct-color";
          badgeStyling = "correct-4";
          break;
        case 11:
          wordStyling = "correct-color";
          badgeStyling = "correct-5";
          break;
      }
      result.push('<li><div class="d-inline-block ' + wordStyling + '">' + word + 
        '</div><div class="float-right my-badge md-badge shadow-sm text-center ' + badgeStyling + '">' + val + '</div></li>');
    });
    return result.join('');
  }

  function sortResultsCheck(){
    var checkbox = document.getElementById('sortResultsToggle');
    var container = document.getElementById("post-game-container");
    var elementsToToggleOff;
    var elementsToToggleOn;
    if(checkbox.checked){
      elementsToToggleOff = container.getElementsByClassName('unsorted-result');
      for(var i=0; i < elementsToToggleOff.length; i++){
        elementsToToggleOff[i].classList.remove('d-none');
        elementsToToggleOff[i].classList.add('d-none');
      }
      elementsToToggleOn = container.getElementsByClassName('sorted-result');
      for(var i=0; i < elementsToToggleOn.length; i++){
        elementsToToggleOn[i].classList.remove('d-none');
      }
    } else {
      elementsToToggleOff = container.getElementsByClassName('sorted-result');
      for(var i=0; i < elementsToToggleOff.length; i++){
        elementsToToggleOff[i].classList.remove('d-none');
        elementsToToggleOff[i].classList.add('d-none');
      }
      elementsToToggleOn = container.getElementsByClassName('unsorted-result');
      for(var i=0; i < elementsToToggleOn.length; i++){
        elementsToToggleOn[i].classList.remove('d-none');
      }
    }
  }

  // Buttons
  $("#start-round").click(function(){
    console.log("Starting round");
    socket.emit('start-round');
  });

  $("#pause").click(function(){
    socket.emit('pause-round');
  });

  $("#resume").click(function(){
    socket.emit('resume-round');
  });

  $("#end-round").click(function(){
    console.log("Ending round");
    socket.emit('end-round');
  });

  $("#reset-score").click(function(){
    console.log("Resetting score");
    socket.emit('reset-score');
  });
});
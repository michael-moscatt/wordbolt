$(function () {
  var socket = io();
  var roundTime = 60;

  socket.on('name', function (name) {
    console.log(name + " is the assigned name.");
    $('#username').val(name);
  });

  socket.on('lobby names', function (usernames) {
    $('#users tbody tr').remove();
    usernames.forEach(username => $('#users > tbody').append('<tr><td>' + username + '</td></tr>'));
    // Determine if single or multiplayer mode
    if(usernames.length > 1){
      document.getElementById("singleplayer-score-card").style.display = "none";
      document.getElementById("multiplayer-score-card").style.display = "block";
    } else {
      document.getElementById("singleplayer-score-card").style.display = "block";
      document.getElementById("multiplayer-score-card").style.display = "none";
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

  socket.on('send words', function (board) {
    console.log("Sending word list");
    var wordList = [];
    $('#found-words').find('.word').each(function () {
      wordList.push($(this).text());
    });
    socket.emit('word list', wordList);
  });

  socket.on('result', function (result) {
    console.log("Result received");
    endRound(result);
  });

  // Set page into 'wait' mode
  setWaitMode();

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
      console.log("Enter, set focus elsewhere");
      event.preventDefault();
      document.getElementById("start-game").focus();
    } else {
      var username = document.getElementById("username").value;
      if (!username == "") {
        socket.emit("username", username);
      }
    }
  });

  // Add a word to the word list
  function submitWord(){
    var word = $("#word").val();
    // Determine if word is legal

    $("#word").val('');
    $("#word").focus();
    $("#found-words").prepend('<li><span class="word">' + word + '</span><span class="float-right badge delete-word">&#10005</span></li>');

    $(document).on("click", "#found-words .delete-word", function () {
      $that = $(this);
      $that.parent().remove();
    });

    console.log("Added word '" + word + "'")
  }

  // Set up the page as it should be before the game starts
  function setWaitMode(){
    document.getElementById("found-words-container").style.display = "none";
    document.getElementById("board-container").style.display = "none";
    document.getElementById("post-game-container").style.display = "none";

    //temp
    document.getElementById("post-game-container").style.display = "none";
    document.getElementById("post-game-container2").style.display = "none";
    document.getElementById("post-game-container3").style.display = "none";
  }

  // Set elements visible needed for playing a round, clear any words from last round
  function startRound(board){
    $('#board div').remove();
    document.getElementById("found-words").innerHTML = "";
    board.forEach(letter => $('#board').append('<div class="board-cell">' + letter + '</div>'));
    document.getElementById("start-game-container").style.display = "none";
    document.getElementById("post-game-container").style.display = "none";
    document.getElementById("found-words-container").style.display = "block";
    document.getElementById("board-container").style.display = "block";
  }

  // Ends the round by displaying the result
  function endRound(result){
    var container = $('#post-game-container');
    container.empty();
    result.forEach(function(player){
      var player_card = $($.parseHTML('<div class="card bg-light" id="player-result"><div class="card-header"><h5 class="m-1">' + player.name
      + '<span class="float-right badge score">' + player.score + '</span></h5></div><div class="card-body"></div></div>'));
      container.append(player_card);
      // var listLength = player['words'].length;
      // for(var i = 0; i < listLength; i++){
      // }
    });
    document.getElementById("post-game-container").style.display = "block";
    document.getElementById("start-game-container").style.display = "none";
    document.getElementById("found-words-container").style.display = "none";
    document.getElementById("board-container").style.display = "none";

    //temp
    document.getElementById("post-game-container").style.display = "block";
    document.getElementById("post-game-container2").style.display = "block";
    document.getElementById("post-game-container3").style.display = "block";
  }

  // Buttons
  $("#start-game").click(function(){
    console.log("Starting round");
    socket.emit('start round');
  });

  $("#pull").click(function(){
    socket.emit('pull');
  });

  $("#save-board").click(function(){
    socket.emit('save board');
  });

  $("#load-board").click(function(){
    socket.emit('load board');
  });

  $("#remove-word").click(function(){
    $('#found-words > .selected').remove();
  });

});
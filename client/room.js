const ANIMALS = ['cat','dog','fish'];
const ADJECTIVES = ['big','small','friendly'];

$(function () {
  var socket = io();
  var debug = true;

  // Set page into 'wait' mode
  setWaitMode();

  // Inform the server of the name of the room
  socket.emit('room-name', window.location.pathname.split("/").pop());

  // Assign newly connected user a random name
  setName(randomName());

  socket.on('room-names', function (usernames) {
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
      console.log("Enter, set focus elsewhere");
      event.preventDefault();
      document.getElementById("start-game").focus();
    } else {
      var name = document.getElementById("username").value;
      if (!name == "") {
        socket.emit("username", name);
      }
    }
  });

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
      $("#found-words").prepend('<li><span class="word">' + word + '</span><span class="float-right badge delete-word">&#10005</span></li>');
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
    document.getElementById("in-game-container").style.display = "none";
    document.getElementById("post-game-container").style.display = "none";
    if(debug){
      document.getElementById("debug-buttons").style.display = "block";
    } else {
      document.getElementById("debug-buttons").style.display = "none";
    }
  }

  // Set elements visible needed for playing a round, clear any words from last round
  function startRound(board){
    $('#board div').remove();
    document.getElementById("found-words").innerHTML = "";
    board.forEach(letter => $('#board').append('<div class="board-cell">' + letter + '</div>'));
    document.getElementById("pre-game-container").style.display = "none";
    document.getElementById("post-game-container").style.display = "none";
    document.getElementById("in-game-container").style.display = "block";
  }

  // Ends the round by displaying the result
  function endRound(result){
    document.getElementById("result-col-1").style.display = "none";
    document.getElementById("result-col-2").style.display = "none";
    document.getElementById("result-col-3").style.display = "none";
    var columns = [document.getElementById('result-col-1'), document.getElementById('result-col-2'), document.getElementById('result-col-3')];
    for(var i = 0; i < 3; i++){
      columns[i].innerHTML = "";
    }
    for(var i = 0; i < result.length; i++){
      var player = result[i];
      var player_card = document.createElement('div');
      player_card.classList.add("card", "bg-light", "player-result");
      var header = document.createElement('div');
      header.classList.add("card-header");
      var header_content = document.createElement('h5');
      header_content.classList.add("m-1");
      header_content.innerHTML = player.name + '<span class="float-right badge badge-pill total-score">' + player.score + '</span>';
      header.appendChild(header_content);
      var body = document.createElement('div');
      body.classList.add("card-body", "overflow-auto");
      var playerWordsHtml = ['<ol>']
      for(var  j = 0; j < player['words'].length; j++){
        var val = player['wordVals'][j];
        var word = player['words'][j];
        playerWordsHtml.push('<li>' + word + '<span class="float-right badge score">' + val + '</span></li>');
      }
      playerWordsHtml.push('</ol>')
      body.innerHTML = playerWordsHtml.join('');
      player_card.appendChild(header);
      player_card.appendChild(body);
      columns[i % 3].append(player_card);
      columns[i % 3].style.display = "block";
    }
    document.getElementById("pre-game-container").style.display = "block";
    document.getElementById("in-game-container").style.display = "none";
    document.getElementById("post-game-container").style.display = "block";
  }

  // Buttons
  $("#start-game").click(function(){
    console.log("Starting round");
    socket.emit('start-round');
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
});
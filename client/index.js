$(function () {
  var socket = io();

  socket.on('name', function (name) {
    console.log(name + " is the assigned name.");
    $('#username').val(name);
  });

  socket.on('lobby names', function (usernames) {
    console.log("Received list of %i names", usernames.length);
    $('#users tbody tr').remove();
    usernames.forEach(username => $('#users > tbody').append('<tr><td>' + username + '</td></tr>'));
  });

  socket.on('board', function (board) {
    console.log("Received board");
    $('#board div').remove();
    board.forEach(letter => $('#board').append('<div class="board-cell">' + letter + '</div>'));
  });

  socket.on('send words', function (board) {
    console.log("Sending word list");
    var wordList = [];
    $('#found-words').children('li').each(function () {
      wordList.push($(this).text());
    });
    socket.emit('word list', wordList);
  });


  $("#submit-word").click(function(){
    var word = $("#word").val();
    $("#word").val('');
    $("#word").focus();
    $("#found-words").prepend('<li>' + word + '</li>');
    console.log("Added word '" + word + "'")
  });

  $("#start-game").click(function(){
    socket.emit('start game');
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
// Express
const express = require('express');
const app = express();
var path = require('path');
const port = process.env.PORT || 3000;

// Socket
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var fs = require('fs');
var util = require('util');
// console.log(util.inspect(OBJECT));

var rooms = {}; // roomName -> room
tree = {};

const STANDARD_DICE = [
    ['A','E','D','N','N','N'],
    ['H','O','R','D','L','N'],
    ['M','A','E','E','E','E'],
    ['M','E','G','A','E','U'],
    ['T','T','O','O','O','U'],
    ['D','O','N','T','D','H'],
    ['S','U','N','S','E','S'],
    ['G','O','R','R','W','V'],
    ['F','A','R','S','A','I'],
    ['N','A','M','E','G','N'],
    ['T','O','M','E','T','T'],
    ['T','O','W','N','O','U'],
    ['H','O','W','H','D','N'],
    ['F','A','R','S','A','A'],
    ['L','O','R','D','H','H'],
    ['B','X','Z','J','B','K'],
    ['R','I','P','Y','S','Y'],
    ['T','I','P','L','E','S'],
    ['S','E','T','L','I','I'],
    ['T','E','M','P','P','P'],
    ['S','E','N','T','C','C'],
    ['T','I','P','S','C','E'],
    ['E','E','E','E','A','A'],
    ['T','T','I','I','I','E'],
    ['F','A','R','S','I','Y']
]

const ROUND_LENGTH = 180;

buildTree('twl2.txt');

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/client/index.html')));

app.get(/\/room\/.+/, (req, res) => res.sendFile(path.join(__dirname, '/client/room.html')));

app.use(express.static(path.join(__dirname, 'client')));

io.on('connection', function (socket) {
    var room;
    var user = createUser(socket);
    socket.emit('request-user-info');

    socket.on('room-name', function(roomName){
        if(!rooms.hasOwnProperty(roomName)){
            console.log("Room '%s': created", roomName);
            rooms[roomName] = {
                'users': [],
                'host': user,
                'name': roomName,
                'state': 'ready',
                'board': [],
                'timer': false,
                'time': false,
                'solution': []
            };
        }
        room = rooms[roomName];
        if(!room['users'].includes(user)){
            room['users'].push(user);
            console.log("User has joined room '%s'", roomName);
            // Get user up to speed who joins mid-round
            if(room.state == 'playing' || room.state == 'paused'){
                socket.emit('game-state', room.state);
                socket.emit('board', room.board);
                user.socket.emit('time', room.time);
            }
        }
    });

    socket.on('disconnect', function() {
        console.log("'%s' has left room '%s'", user.username, room.name);
        room['users'] = room['users'].filter(function (oneUser) {
            return oneUser !== user;
        });
        if(room['users'].length < 1){
            delete rooms[room.name];
        }
        broadcastScorecard(room);
    });

    socket.on('username', function(username){
        if(username.length <= 16) {
            user.username = username;
            broadcastScorecard(room);
        }
    });

    socket.on('start-round', function() {
        if(room.state == 'ready'){
            room.state = 'playing';
            startRound(room);
        }
    });

    socket.on('request-board', function() {
        if(room.state == 'playing'){
            socket.emit('board', room.board);
        }
    });

    socket.on('found-words', function(list){
        user.wordList = list;
    });

    socket.on('end-round', function() {
        endRound(room);
    });

    socket.on('pause-round', function() {
        if(room.state == 'playing'){
            console.log("Room '%s': round paused", room.name);
            room.state = 'paused';
            broadcastGameState(room);
            clearInterval(room.timer);
        }
    });

    socket.on('resume-round', function() {
        if(room.state == 'paused'){
            console.log("Room '%s': round resumed", room.name);
            room.state = 'playing';
            broadcastGameState(room);
            room.timer = setInterval(timerTick, 1000, room);
        }
    });

    socket.on('reset-score', function() {
        console.log("Room '%s': user '%s' reset score", room.name, user.username);
        user.highScore = 0;
        user.wins = 0;
        broadcastScorecard(room);
    });
});

http.listen(port, function() {
    console.log('Server running. Port: ' + port);
});

function createUser(socket){
    var empty = [];
    var user = {
        username: false,
        socket: socket,
        wordList: empty,
        score: 0,
        highScore: 0,
        wins: 0
    };
    return user;
}

// Broadcasts names & scoring to users in the room
function broadcastScorecard(room) {
    scorecard = [];
    room['users'].forEach(function(user){
        var user = {
            'username': user.username,
            'highScore': user.highScore,
            'wins': user.wins
        }
        scorecard.push(user);
    });
    scorecard.sort(function(a, b){
        if ( a.wins > b.wins ){
            return -1;
          }
          if ( a.wins < b.wins ){
            return 1;
          }
          return 0;
    });
    room['users'].forEach(function(user){
        user.socket.emit('scorecard', scorecard);
    });
}

// Start the round for the given room: Broadcasts board, resets wordlists
function startRound(room) {
    console.log("Room '%s': Round started", room.name);
    room.board = generateBoardArray(STANDARD_DICE);
    room['users'].forEach(function(user){
        user.socket.emit('board', room.board);
        user.wordList = [];
    });

    room.solution = generateSolution(room.board);
    room.time = ROUND_LENGTH;
    room['users'].forEach(function(user){
        user.socket.emit('time', room.time);
    });
    room.timer = setInterval(timerTick, 1000, room);
}

function timerTick(room){
    room.time--;
    room['users'].forEach(function (user) {
        user.socket.emit('time', room.time);
    });
    if (room.time == 0) {
        endRound(room);
    }
}

// Generates an array of letters given the set
function generateBoardArray(diceSet) {
    var letters = [];
    diceSet.forEach(die => letters.push(die[Math.floor(Math.random() * 6)]))
    var i;
    for(i = letters.length - 1; i > 0; i--){
        const randInd = Math.floor(Math.random() * (i + 1));
        const holdVal = letters[i];
        letters[i] = letters[randInd];
        letters[randInd] = holdVal;
    }
    return letters;
}

// Broadcasts the state of the game to the given room
function broadcastGameState(room){
    room['users'].forEach(function(user){
        user.socket.emit('game-state', room.state);
    });
}

// Ends a round of the game for the given room
function endRound(room){
    console.log("Room '%s': Round ended", room.name);
    clearInterval(room.timer);
    // Asks all players for their word list
    room['users'].forEach(function(user){
        user.socket.emit('send-words');
    });
    var delay;
    if(room['users'].length > 1){
        delay = 300;
    }
    else{
        delay = 50;
    }
    setTimeout(generateResult, delay, room);
}

// Generates the result of the round for the given room
function generateResult(room){
    var winningScore = 0;
    var result = [];
    var pooledFoundWords = [];
    // Add legal words found by players
    room['users'].forEach(function(user){
        user.wordList.forEach(function(word){
            if(solution.includes(word)){
                pooledFoundWords.push(word);
            }
        });
    });
    // Generate result for each player
    room['users'].forEach(function(user){
        var userResult = new Object();
        var score = 0;
        var validWords = 0;
        userResult['name'] = user.username;
        userResult['wordsUnsorted'] = [];
        user.wordList.forEach(function(word){
            if(room['solution'].includes(word)){
                var count = 0;
                validWords++;
                for (var i = 0; i < pooledFoundWords.length; i++) {
                    if (pooledFoundWords[i] == word){
                        count++;
                    }
                }
                if(count > 1){
                    userResult['wordsUnsorted'].push({'word': word, 'val': 0});
                }
                else{
                    var wordVal = 0;
                    if(word.length <= 4){
                        wordVal = 1;
                    } else if (word.length == 5){
                        wordVal = 2;
                    } else if (word.length == 6){
                        wordVal = 3;
                    } else if (word.length == 7){
                        wordVal = 5;
                    } else if (word.length >= 8){
                        wordVal = 11;
                    }
                    score = score + wordVal;
                    userResult['wordsUnsorted'].push({'word': word, 'val': wordVal});
                }
            }
            else{
                score = score - 1;
                userResult['wordsUnsorted'].push({'word': word, 'val': -1})
            }
        });
        var unsorted = userResult['wordsUnsorted'];
        userResult['wordsSorted'] = unsorted.slice(0, unsorted.length);
        userResult['wordsSorted'].sort(function(a, b){
            if(a['val'] > b['val']){
                return -1;
            } else if(a['val'] < b['val']) {
                return 1;
            } else {
                if(a['word'].length > b['word'].length){
                    return -1;
                } else if(a['word'].length < b['word'].length){
                    return 1;
                } else {
                    if (a['word'] < b['word']) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            }
        });
        userResult['score'] = score;
        userResult['validWords'] = validWords;
        user.score = score;
        user.highScore = Math.max(user.highScore, score);
        winningScore = Math.max(winningScore, score);
        result.push(userResult);
    });
    result.sort(function(a, b){
        if ( a.score > b.score ){
            return -1;
          }
          if ( a.score < b.score ){
            return 1;
          }
          return 0;
    });
    room['users'].forEach(function(user){
        user.socket.emit('result', result);
        if(result.length > 1 && user.score == winningScore){
            user.wins++;
        }
    });
    room.state = 'ready';
    broadcastScorecard(room);
}

// Generate tree from wordlist
function buildTree(filename){
    fs.readFile('server/' + filename, "utf8", function (err, data) {
        var words = data.split("\n");
        words.pop(); // remove blank word from trailing newline
        var prefix = '';
        var  i;
        for(i = 0; i < words.length; i++){
            var word = words[i];
            if(word.substring(0,4) === prefix) {
                buildTreeHelperSameRoot(tree[word.substring(0,4)], word, 4);
            } else {
                prefix = word.substring(0,4);
                tree[prefix] = {};
                if(word.length == 4){
                    tree[prefix].word = true;
                } else {
                    tree[prefix].word = false;
                    tree[prefix][word[4]] = buildTreeHelper(word, 4);
                }
            }
        
        }
        console.log("Tree Built.");
        // str = JSON.stringify(tree, null, 4);
        // console.log(str);
    })
}

function buildTreeHelper(word, index){
    var suffix = new Object();
    if(index >= word.length - 1){
        suffix['word'] = true;
        return suffix;
    } else {
        suffix['word'] = false;
        suffix[word[index + 1]] = buildTreeHelper(word, index + 1);
        return suffix;
    }
}

function buildTreeHelperSameRoot(section, word, index){
    if(word[index] in section){
        buildTreeHelperSameRoot(section[word[index]], word, index + 1)
    } else{
        section[word[index]] = buildTreeHelper(word, index);
    }
}

// Generates all legal words for the given board
function generateSolution(board){
    solution = [];
    var i;
    for(i = 0; i < board.length; i++){
        var visitedIndices = [i];
        var string = board[i];
        generateSolutionHelper(i, visitedIndices, string, board);
    }
    return solution;
}

function generateSolutionHelper(currentIndex, visited, string, board){
    // console.log("---execution of helper for %s---", string)
    if(string.length > 3){
        if(string.length == 4 && !tree.hasOwnProperty(string.substring(0,4))){
            // console.log("Root %s unfound", string);
            return false;
        }
        var rootSection = tree[string.substring(0, 4)];
        var i;
        for(i = 3; i < string.length; i++){
            // console.log("started iteration through word %s", string);
            if(i == string.length - 1){
                // console.log("Reached end of word %s", string);
                if(rootSection['word'] == true && !solution.includes(string)){
                    solution.push(string);
                    // console.log("Pushed %s to solution", string);
                }
                if(Object.keys(rootSection).length == 1){
                    // console.log("No more words spellable with this stem: %s", string);
                    return false;
                }
            } else{
                if(!rootSection.hasOwnProperty(string[i + 1])){
                    // console.log("No rootsection: %s", string);
                    return false;
                }
                rootSection = rootSection[string[i + 1]];
            }
        }
    }

    indices = nextInds(currentIndex, visited);

    // console.log("Generated next indices for %s", string);
    // console.log(JSON.stringify(indices));

    indices.forEach(function(nextIndex){
        // console.log("Exploring index %i", nextIndex);
        // console.log(JSON.stringify(board, null, 4));
        var updatedVisited = Array.from(visited);
        updatedVisited.push(nextIndex);
        generateSolutionHelper(nextIndex, updatedVisited, string + board[nextIndex], board);
    });
}

// Finds the indices that must be visited next
function nextInds(current, visited){
    var upperLeft = [1, 6, 5];
    var upperRight = [9, 8, 3];
    var lowerRight = [19, 23, 18];
    var lowerLeft = [15, 16, 21];
    var indices = [];
    if(current == 0){
        indices = upperLeft;
    } else if(current == 4){
        indices = upperRight;
    } else if(current == 24){
        indices = lowerRight;
    } else if(current == 20){
        indices = lowerLeft;
    } else if(current < 4){
        indices = [current + 1, current + 6, current + 5, current + 4, current - 1];
    } else if((current + 1) % 5 == 0){
        indices = [current - 5, current + 5, current + 4, current - 1, current - 6];
    } else if(current > 20){
        indices = [current - 5, current - 4, current + 1, current - 1, current - 6];
    } else if(current % 5 == 0){
        indices = [current - 5, current - 4, current + 1, current + 6, current  + 5];
    } else {
        indices = [current - 5, current - 4, current + 1, current + 6, current  + 5, current + 4, current - 1, current - 6];
    }
    visited.forEach(function(visitedIndex){
        if(indices.includes(visitedIndex)){
            const removeIndex = indices.indexOf(visitedIndex);
            indices.splice(removeIndex, 1);
        }
    });
    return indices;
}

function sortLengthAlpha(list){
    sortedList = [];
    var longest = 0;
    list.forEach(function(word){
        if(word.length > longest){
            longest = word.length;
        }
    });
    var i;
    for(i = longest; i > 3; i--){
        var listAtThisLetter = [];
        list.forEach(function(word){
            if(word.length == i){
                listAtThisLetter.push(word);
            }
        });
        listAtThisLetter.sort();
        listAtThisLetter.forEach(function(word){
            sortedList.push(word);
        });
    }
    return sortedList;
}

// Cut all <4 letter words out
// function cutfour() {
//     fs.readFile('server/twl.txt', "utf8", function (err, data) {
//         var string = "";
//         var words = data.split("\r\n");
//         words.forEach(function (word) {
//             if (word.length > 3) {
//                 var wordUpper = word.toUpperCase();
//                 string = string + wordUpper + '\n';
//                 console.log("Pushed %s", wordUpper);
//             }
//         });
//         fs.writeFile('server/twl2.txt', string,
//             function (err) {
//                 if (err)
//                     console.log(err);
//                 else
//                     console.log('Write operation complete.');
//             }
//         );
//     })
// }
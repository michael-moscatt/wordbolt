// Express
const express = require('express');
const app = express();
var path = require('path');
const port = 3000;

// Socket
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var session = require('express-session');
var fs = require('fs');

var users = {}; // socketID -> user
var board = [];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/client/index.html')));

app.get('/lobby', (req, res) => res.sendFile(path.join(__dirname, '/client/lobby.html')));

app.use(express.static(path.join(__dirname, 'client')));

io.on('connection', function (socket) {
    console.log('Connection established');
    // Assign random name and create new user
    name = randomName();
    socket.emit('name', name);
    users[socket.id] = createUser(name, socket);
    broadcastLobbyNames();

    socket.on('disconnect', function() {
        console.log('Disconnection');
        delete users[socket.id];
        broadcastLobbyNames();
    });

    socket.on('start game', function() {
        startGame();
    });

    socket.on('pull', function() {
        endRound();
    });

    socket.on('word list', function(list){
        users[socket.id].wordList = list;
    });

    socket.on('load word list', function (list) {
        fs.readFile('server/twl.txt', "utf8", function (err, data) {
            var words = data.split("\n");
            words.forEach(function (word) {
                console.log(word);
            });
        })
    });
});

http.listen(3000, function() {
    console.log('Server running. Port: ' + port);
});

// dice sets
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

function randomName(){
    const animals = ['cat','dog','fish'];
    const descriptors = ['big','small','friendly'];
    return descriptors[Math.floor(Math.random() * descriptors.length)] + "-" + animals[Math.floor(Math.random() * animals.length)];
}

function createUser(username, socket){
    var empty = [];
    var user = {
        username: username,
        socket: socket,
        wordList: empty
    };
    return user;
}

// broadcasts names to all users in lobby
function broadcastLobbyNames() {
    console.log("Broadcasting lobby names");
    var usernames = [];
    Object.values(users).forEach(function(user){
        usernames.push(user.username);
    });
    Object.keys(users).forEach(function(socketID){
        user = users[socketID];
        console.log("Broadcasting names to: %s", user.username);
        user.socket.emit('lobby names', usernames);
    });
}

// Start the game. Broadcast board, reset wordlists
function startGame() {
    board = generateBoardArray(STANDARD_DICE);
    Object.keys(users).forEach(function(socketID){
        user = users[socketID];
        console.log("Broadcasting board to: %s", user.username);
        user.socket.emit('board', board);
        user.wordList = [];
    });
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
    console.log("Board generated.");
    return letters;
}

// Ends a round of the game
function endRound(){
    // Asks all players for their word list
    console.log("Requesting words");
    Object.keys(users).forEach(function(socketID){
        user = users[socketID];
        console.log("Requesting words from: %s", user.username);
        user.socket.emit('send words');
    });
    setTimeout(checkWords, 500);
}

// Checks words from players
function checkWords(){
    console.log("Checking Words");
    Object.keys(users).forEach(function(socketID){
        user = users[socketID];
        user.wordList.forEach(word => console.log(word));
    });
}

// Check username, if unique broadcasts names to lobby
// function usernameSubmission(socket, username) {
//     if (checkUniqueUser(username)) {
//         // Check if this 
//         user = makeUser(socket, username);
//         users[socket.id] = user;
//         socket.emit('username validity', true);
//         broadcastLobbyNames();
//     } else {
//         console.log('Username already in use');
//         socket.emit('username validity', false);
//     }
// }

// function checkUniqueUser(username){
//     Object.values(users).forEach(function(user){
//         if(user.username==username) {
//             return false;
//         }
//     });
//     console.log('Username %s is unique.', username);
// }

// Cut all <4 letter words out
// function cutfour() {
//     fs.readFile('server/twl.txt', "utf8", function (err, data) {
//         var string = "";
//         var words = data.split("\r\n");
//         words.forEach(function (word) {
//             if (word.length > 3) {
//                 string = string + word + '\n';
//                 console.log("Pushed %s", word);
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
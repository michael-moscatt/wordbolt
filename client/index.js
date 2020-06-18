const ADJECTIVES = ['metal', 'plastic', 'sleek', 'modern'];
const NOUNS = ['stapler', 'pen', 'pencil', 'glue'];

$(function () {
    document.getElementById("new-room").onclick = function() {
        randRoomRedirect();
    };
});

function randRoomRedirect(){
    console.log("asdfasdf");
    location.href = '/room/' + ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + "-" + NOUNS[Math.floor(Math.random() * NOUNS.length)];
}
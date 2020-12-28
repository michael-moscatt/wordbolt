# Wordbolt

![Logo](https://user-images.githubusercontent.com/51413275/103239463-8dfc5100-491b-11eb-9591-e451b031647a.png)

[Wordbolt](http://wordbolt.herokuapp.com/) is a online, multiplayer version of the Allan Turoff word game Boggle. The goal of the game is score as many points as possible in three minutes by finding words in a 5x5 grid.

Try it out [here](http://wordbolt.herokuapp.com/). Please note that this is hosted on Heroku, so allow around 10 seconds for dynos to spin up.

## Software

The backend uses Node.js with Express.js, and the app uses Socket.IO for client/server communication. The frontend uses Bootstrap and jQuery.

## Installing

To build the site, first install Node.js and npm. Then run the following in the root folder:

```
npm install
npm start
```

The site is then accessible through the browser at 'localhost:3000'

## Acknowledgments

* Special thanks to J for playtesting and wording

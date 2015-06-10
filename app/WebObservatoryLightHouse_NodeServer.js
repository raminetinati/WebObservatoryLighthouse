var Twit = require('twit')
var app = require('http').createServer(handler);
var io = require('socket.io')(app);

app.listen(9001);

function handler (req, res) {
    res.writeHead(200);
    res.end("");
}

var T = new Twit({
    consumer_key:         'xBKmTz61D88R9axzb67LIQ'
  , consumer_secret:      '4dVqfkB92gam2s9ds2U9Ux9xFJH7Y26HQWNojJwyU'
  , access_token:         '41944067-tGaOU7HxzbDdGOLm89fT4az6tYQ9q0fFwEwdq1wfh'
  , access_token_secret:  'X3TvO96cU0P8X45dLyE1VejtbsCh43qMTzcYBssjPQk'
});



T.get('search/tweets', { q: '#webwewantfest', count: 100 }, function(err, data, response) {
  //console.log(data)
});

//var stream = T.stream('statuses/filter', { track: ['webwewantfest', 'webwewant', 'webweshare'] });
//var stream = T.stream('statuses/filter', { track: ['twitpic', 'http://img', 'img'] });
var stream = T.stream('statuses/sample');



io.on('connection', function (socket) {
     io.emit('tweets', { hello: 'world' });
});

console.log("Emitting Tweets");


stream.on('tweet', function (tweet) {
  //console.log(tweet);
// emitMsg('tweets', tweet);
        io.emit('tweets',tweet);
});

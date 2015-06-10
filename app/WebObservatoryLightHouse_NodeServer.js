var Twit = require('twit')
var app = require('http').createServer(handler);
var io = require('socket.io')(app);

app.listen(9876);

active_WOs = {};

function handler (req, res) {
    res.writeHead(200);
    res.end("");
}

// Send Heartbreak to all connected clients
function sendHeartBeat() {
    io.emit('heartbeat_lighthouse', { heartbeat: true });
	//console.log("sending heartbeat");
}

// Interval on heartbreat
setInterval(sendHeartBeat, 2000);


// Send Heartbreak to all connected clients
function requestDatasetList() {
    io.emit('dataset_list_request', { heartbeat: true });
	//console.log("Requesting Dataset List");
}

// Interval on heartbreat
setInterval(requestDatasetList, 5000);





io.on('connection', function (socket) {
     io.emit('connected', { message: 'you\'re connected to the Web Observatory Lighthouse'});

	//listen for a pulse from a WO instantiation
	socket.on('wo_pulse', function (data) {

		 //console.log("got WO Pulse");

		 if(!(data.wo_url in active_WOs)){
		
		 	//console.log("Adding newly active WO");
		 	active_WOs[data.wo_url] = [];
		
		 }else{
		 	//console.log("WO already witnessed");
		 }
	     //io.emit('connected', { message: 'you\'re connected to the Web Observatory Lighthouse'});
	});


	//listen for a pulse from a WO instantiation for their dataset
	socket.on('dataset_list_response', function (data) {

		 //console.log("got WO dataset response");
		 //console.log("Adding newly active WO");
		 try{
		 	if(data.wo_url != undefined){
		 
		 		active_WOs[data.wo_url] = data;
		 		console.log("WO: "+data.wo_url+" Total Datasets: "+data.data.length);
			}
		}catch (e){

		}
	});


});






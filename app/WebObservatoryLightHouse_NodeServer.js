var Twit = require('twit')
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var mongoose = require('mongoose');

app.listen(9876);

active_WOs = {};


mongoose.connect('mongodb://woAdmin:password12345@localhost/woLighthouse');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    console.log("connected to database");
});

var woListing = new mongoose.Schema({
  source: String,
  content: Object
});


Message = mongoose.model('globalWOListings', woListing); 


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
function requestDataList() {
    io.emit('data_list_request', { heartbeat: true });
	//console.log("Requesting Dataset List");
}

// Interval on heartbreat
setInterval(requestDataList, 5000);


// Send Heartbreak to all connected clients
function sendActiveWOList() {
    io.emit('active_wo_list',  createActiveList());
	console.log("Sending Active WOList "+createActiveList());
}

// Interval on heartbreat
setInterval(sendActiveWOList, 5000);

active_wo_meta = {}
function createActiveList(){
	for(i in active_WOs){
		try{
			active_wo_meta[i] = {"wo_name": active_WOs[i].wo_name, 
								"dataset_count": active_WOs[i].datasets.length,
								"vis_count": active_WOs[i].visualisations.length}; 
		}catch (e){}
	}

	addStaticObservatoriesList(active_wo_meta)
	return active_wo_meta; 
}



var totalEntities = 0;

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
	socket.on('data_list_response', function (data) {

		 //console.log("got WO dataset response");
		 //console.log("Adding newly active WO");
		 try{
		 	if(data.wo_url != undefined){
		 
		 		active_WOs[data.wo_url] = data;
		 		console.log("WO: "+data.wo_url
		 					+" Datasets: "+data.datasets.length
		 					+" Visualisations: "+data.visualisations.length
		 					);
			
		 		// if(updateMongoDatasetList()){
		 		// 	console.log("updated Mongo with new records");
		 		// }
			}
		}catch (e){
			console.log(e)
		}
	});


	//listen for a pulse from a WO instantiation for their dataset
	socket.on('search_from_web', function (data) {
		
		var query_string;
		if(data.search_query != undefined){
			console.log("Search from web: "+data.search_query);
			query_string = data.search_query;
		}

		if(query_string){
			io.emit('search_for_data', query_string);
			//need to send off some queries to see if there is data listed...

		}

		
	});

	//listen for a pulse from a WO instantiation for their dataset
	socket.on('search_results', function (data) {

		
   		 io.emit('search_results_for_web',  data);

		
	});


});



var active_WOs_old = {};

function updateMongoDatasetList(){

	//first drop the collection - really  bad practise...

	// mongoose.connection.collections['globalWOListings'].drop( function(err) {
 //    	console.log('collection dropped');
	// });

	Message.remove({}, function(err) { 
	   console.log('collection removed') 
	
// Message = mongoose.model('globalWOListings', woListing); 


		//create document and save
    var doc = new Message({
    	  source: "lighthouse",
          content: JSON.stringify(active_WOs)
    });

    doc.save(function(err, doc) {
    if (err) return console.error(err);
    	return false;
    });


    console.log("added");

    return true;



	});

	

}


  function addStaticObservatoriesList(active_wo_meta){

      //RPI
      key = 'https://logd.tw.rpi.edu/web_observatory';
      obj = {'wo_name':'RPI Web Observatory', 'dataset_count': '-', 'vis_count': '-'};
      active_wo_meta[key] = obj;


      //Indiana
      key = 'http://truthy.indiana.edu/';
      obj = {'wo_name':'Indiana University Truthy', 'dataset_count': '-', 'vis_count': '-'};
      active_wo_meta[key] = obj;

      //Singapore
      key = 'http://www.nextcenter.org/';
      obj = {'wo_name':'National University of Singapore NeXT Observatory', 'dataset_count': '-', 'vis_count': '-'};
      active_wo_meta[key] = obj;

      //Cardiff
      key = 'http://www.cs.cf.ac.uk/cosmos/';
      obj = {'wo_name':'COSMOS - Cardiff', 'dataset_count': '-', 'vis_count': '-'};
      active_wo_meta[key] = obj;

       //Cardiff
      key = 'http://sonic.northwestern.edu/';
      obj = {'wo_name':'SONIC - Northwestern', 'dataset_count': '-', 'vis_count': '-'};
      active_wo_meta[key] = obj;


    }




//TODO

function searchForDataByID(datasetID){



}


function searchForDataByAuthor(){




}

//kick it off quickly, then set off a timer.
updateMongoDatasetList()

var interval = setInterval(function(){updateMongoDatasetList()}, 60000);

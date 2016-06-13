var Twit = require('twit')
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var mongoose = require('mongoose');
var http = require('http');


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
		 		// console.log("WO: "+data.wo_url
		 		// 			+" Datasets: "+data.datasets.length
		 		// 			+" Visualisations: "+data.visualisations.length
		 		// 			);
			
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
		var request_type;
		if(data.search_query != undefined){
			console.log("Search from web: "+data.search_query);
			query_string = data.search_query;
			request_type = data.from_page;
		}

		if(request_type && query_string){
			searchLOCCatalogue(query_string);
			io.emit('search_for_data', query_string);


		}
		else if(query_string){
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

	var added = 0;
	for(key in active_WOs){

		//do some manipulation of the keys to make sure the schema.org is removed before inserting

		objectToInsert = removeSchemaOrgInKeys(active_WOs[key]);

		//console.log(JSON.stringify(objectToInsert));
		//console.log("TO INSERT: ",JSON.stringify(active_WOs[key]))
			//create document and save
	    var doc = new Message({
	    	  source: objectToInsert["wo_name"],
	          content: objectToInsert
	    });

	    doc.save(function(err, doc) {
	    if (err) return console.error(err);
	    	//console.log("KEY  CAUSING ERROR",active_WOs[key])
	    	return false;
	    	added = added - 1;
	    });

	    added = added + 1;
	}

	console.log("Inserted: ",added);

    return true;
	});
}


datasets_all = {}
visualisations_all = {}

function removeSchemaOrgInKeys(wo_object){

	datasets_tmp = {}
	visualisations_tmp = {}

	for(var i=0; i<wo_object.datasets.length; i++){
		properties = {}
		for(key in wo_object.datasets[i].properties){
			try{
				newKey = key.replace("http://schema.org/","");
				properties[newKey] = wo_object.datasets[i].properties[key];
			}catch(e){

			}
		}
		wo_object.datasets[i].properties = properties;

		if(wo_object.datasets[i].id in datasets_all){

		}else{
			datasets_all[wo_object.datasets[i].id] = wo_object.datasets[i]
			datasets_tmp[wo_object.datasets[i].id] = wo_object.datasets[i]
		}
	}


	addDatasetsToDatabase(datasets_tmp);


	for(var i=0; i<wo_object.visualisations.length; i++){
		properties = {}
		for(key in wo_object.visualisations[i].properties){
			try{
				newKey = key.replace("http://schema.org/","");
				properties[newKey] = wo_object.visualisations[i].properties[key];
			}catch(e){

			}
		}
		wo_object.visualisations[i].properties = properties;
		if(wo_object.datasets[i].id in visualisations_all){

		}else{
			visualisations_tmp[wo_object.datasets[i].id] = wo_object.datasets[i]
			visualisations_all[wo_object.datasets[i].id] = wo_object.datasets[i]
		}
	}

	addVisualisationsToDatabase(visualisations_tmp);

	return wo_object

}


Dataset = mongoose.model('woLighthouseDatasets', woListing); 
Visualisation = mongoose.model('woLighthouseApplications', woListing); 


function addDatasetsToDatabase(datasets){


	for(key in datasets){

		var doc = new Dataset({
		    	  source: key,
		          content: datasets[key]
		    });

		doc.save(function(err, doc) {
	    if (err) return console.error(err);
	    	//console.log("KEY  CAUSING ERROR",active_WOs[key])
	    	return false;
	    });


	}
}


function addVisualisationsToDatabase(visualisations){


	for(key in visualisations){

		var doc = new Visualisation({
		    	  source: key,
		          content: visualisations[key]
		    });

		doc.save(function(err, doc) {
	    if (err) return console.error(err);
	    	//console.log("KEY  CAUSING ERROR",active_WOs[key])
	    	return false;
	    });


	}
}




  function addStaticObservatoriesList(active_wo_meta){

      //RPI
      key = 'https://logd.tw.rpi.edu/web_observatory';
      obj = {'wo_name':'RPI Web Observatory', 'dataset_count': 'tba', 'vis_count': 'tba'};
      active_wo_meta[key] = obj;


      //Indiana
      key = 'http://truthy.indiana.edu/';
      obj = {'wo_name':'Indiana University Truthy', 'dataset_count': 'tba', 'vis_count': 'tba'};
      active_wo_meta[key] = obj;

      //Singapore
      key = 'http://www.nextcenter.org/';
      obj = {'wo_name':'National University of Singapore NeXT Observatory', 'dataset_count': 'tba', 'vis_count': 'tba'};
      active_wo_meta[key] = obj;

      //Cardiff
      key = 'http://www.cs.cf.ac.uk/cosmos/';
      obj = {'wo_name':'COSMOS - Cardiff', 'dataset_count': 'tba', 'vis_count': 'tba'};
      active_wo_meta[key] = obj;

       //Cardiff
      key = 'http://sonic.northwestern.edu/';
      obj = {'wo_name':'SONIC - Northwestern', 'dataset_count': 'tba', 'vis_count': 'tba'};
      active_wo_meta[key] = obj;


    }


function deleteCollections(){

	Dataset.remove({}, function(err) { 
	   console.log('Dataset collection removed') 
	   });

	Visualisation.remove({}, function(err) { 
	   console.log('Visualisation collection removed') 
	   });
}



//TODO

function searchForDataByID(datasetID){



}


function searchForDataByAuthor(){




}


function searchLOCCatalogue(keyword){

    var urlPath = encodeURI('/api/search/'+keyword.toLowerCase());

return http.get({
        host: 'sotonwo.cloudapp.net',
        port: 4567,
        path: urlPath
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            //console.log(parsed);
            if (parsed.length == 0){
                console.log("NO RESULTS from store");
            }else{

            	var toSend = []
            	results = parsed.results
            	for(key in results){

            		var formattedResult = {};
            		var properties = {}
            		result =results[key];
            		// properties[] = result['@id'];
            		// properties[] = result['@type'];
            		properties['http://schema.org/description'] = result['schema:description'];
            		properties['http://schema.org/name'] = result['schema:name'];
            		properties['http://schema.org/url'] = result['schema:url'];
            		properties['http://schema.org/provider'] = result['schema:provider'];

            		formattedResult['properties'] = properties;
            		toSend.push(formattedResult);
            	}


   				io.emit('search_results_for_web', toSend);
            }


        });
    });
}



//kick it off quickly, then set off a timer.
updateMongoDatasetList();
//deleteCollections();

var interval = setInterval(function(){updateMongoDatasetList()}, 6000);

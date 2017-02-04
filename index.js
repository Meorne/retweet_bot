const http = require('http');
const fs = require('fs');
const Twit = require('twit');
const _ = require('underscore');

const EventEmitter = require('events');
class emitEvent extends EventEmitter {}


const emiter = new emitEvent();
const streamers = null;


const request_options = {
	hostname: 'localhost',
	port: 8080,
	path: '/oversquad/rest/player/',
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
};

//request api ip to list twitter account
var req = ()=>{
	let dataResult = '';
	let streamerList = [];

	//request methode
	let request = http.request(request_options, function(res) {

		//list data value
		res.on('data', (chunk) => {
			dataResult += chunk;
		});

		//on request ended get twitter name list
		res.on('end', () => {
			let jsonResult = JSON.parse(dataResult);
			let twitterAccountList = [];
			jsonResult.forEach((data,i)=>{

				//list twitter acount url
				var twitterUrlList = _.filter(data.mapNetworks, function(val){
					return (/twitter/i).test(val);
				})

				twitterAccountList = _.union(twitterAccountList, twitterUrlList);
			});

			//get twitter
			streamerList = _.map(twitterAccountList, function(val){
				return val.match(/http(?:s|):\/\/twitter.com\/([\w]+)[\S]*/)[1];
			});

			emiter.emit('listStreamer',streamerList);

		});

	});

	request.on('error', (e) => {
		console.log(`problem with request: ${e.message}`);
	});

	request.end();
};

req();




setInterval(()=>{
	req();
},10*60000);

const conf = JSON.parse(fs.readFileSync('conf-retweet.json','utf8'));

emiter.on('listStreamer',(streamerList)=>{
	streamers = streamerList;
});

// Load NPM LIB
// JS function for looking in array and return true if users are in it
var contains = function(needle) {var findNaN = needle !== needle; var indexOf; if(!findNaN && typeof Array.prototype.indexOf === 'function') {indexOf = Array.prototype.indexOf; } else {indexOf = function(needle) {var i = -1, index = -1; for(i = 0; i < this.length; i++) {var item = this[i]; if((findNaN && item !== item) || item === needle) {index = i; break; } } return index; }; } return indexOf.call(this, needle) > -1; };

// Twiter Credentials (KEEP IT PRIVATE !)
var T = new Twit({
	consumer_key:         conf.consumer_key,
	consumer_secret:      conf.consumer_secret,
	access_token:         conf.access_token,
	access_token_secret:  conf.access_token_secret,
	timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

// List of Twitter users who will be RT by the Bot

// Mention for get RT
var watcher = '@OversquadFR';

// User to check following
var userToCheckFollow = 'OversquadFR';
var followingsUsers = [];

// Store the IDS of the followings accounts
T.get('followers/ids', { screen_name: userToCheckFollow },  function (err, data, response) {
	followingsUsers = data.ids;
})

var stream = T.stream('statuses/filter', { track: watcher });

stream.on('tweet', function (tweet) {

	// Test if the user who had tweeted is in the streamers list & if the 'userToCheckFollow' is following him
	if ( streamers && contains.call(streamers, tweet.user.screen_name) && contains.call(followingsUsers, tweet.user.id)) {

		// We RT his tweet
		T.post('statuses/retweet/:id', { id: tweet.id_str }, function (err, data, response) {
			console.log('Just RT @' + tweet.user.screen_name);
		})

	}
})

const http = require('http');
const fs = require('fs');
const Twit = require('twit');
const _ = require('underscore');
const EventEmitter = require('events');

class EmitEvent extends EventEmitter {}
const conf = JSON.parse(fs.readFileSync('conf-retweet.json', 'utf8'));


const emiter = new EmitEvent();
let streamers = null;


const requestOptions = {
	hostname: conf.target_url,
	port: 8080,
	path: '/oversquad/rest/player/',
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
	},
};

// request api ip to list twitter account
function req() {
	let dataResult = '';
	let streamerList = [];

	// request methode
	const request = http.request(requestOptions, (res) => {
		// list data value
		res.on('data', (chunk) => {
			dataResult += chunk;
		});

		// on request ended get twitter name list
		res.on('end', () => {
			const jsonResult = JSON.parse(dataResult);
			let twitterAccountList = [];
			jsonResult.forEach((data) => {
				// list twitter acount url
				const twitterUrlList = _.filter(data.mapNetworks, val => (/twitter/i).test(val));

				twitterAccountList = _.union(twitterAccountList, twitterUrlList);
			});

			// get twitter
			streamerList = _.map(twitterAccountList, val => val.match(/http(?:s|):\/\/twitter.com\/([\w]+)[\S]*/)[1]);

			emiter.emit('listStreamer', streamerList);
		});
	});

	request.on('error', (e) => {
		console.log(`problem with request: ${e.message}`);
	});

	request.end();
}

req();


setInterval(() => {
	req();
}, 10 * 60000);


emiter.on('listStreamer', (streamerList) => {
	streamers = streamerList;
});

// Twiter Credentials (KEEP IT PRIVATE !)
const T = new Twit({
	consumer_key: conf.consumer_key,
	consumer_secret: conf.consumer_secret,
	access_token: conf.access_token,
	access_token_secret: conf.access_token_secret,
	timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
});

// List of Twitter users who will be RT by the Bot

// Mention for get RT
const watcher = '@OversquadFR';

// User to check following
const userToCheckFollow = 'OversquadFR';
let followingsUsers = [];

// Store the IDS of the followings accounts
T.get('followers/ids', { screen_name: userToCheckFollow }, (err, data) => {
	followingsUsers = data.ids;
});

const stream = T.stream('statuses/filter', { track: watcher });

stream.on('tweet', (tweet) => {
	// Test if the user who had tweeted is in the streamers list
	// & if the 'userToCheckFollow' is following him

	if (_.contains(streamers, tweet.user.screen_name)	&& _.contains(followingsUsers, tweet.user.id)) {
		// We RT his tweet
		T.post('statuses/retweet/:id', { id: tweet.id_str }, () => {
			console.log(`Just RT @${tweet.user.screen_name}`);
		});
	}
});

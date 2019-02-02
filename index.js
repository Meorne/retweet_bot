const http = require('http');
const fs = require('fs');
const Twit = require('twit');
const EventEmitter = require('events');

const _ = {};
_.indexOf = require('lodash/indexOf');
_.filter = require('lodash/filter');
_.intersection = require('lodash/intersection');
_.union = require('lodash/union');

class EmitEvent extends EventEmitter {}
const getConf = fs.readFileSync('conf-retweet.json', 'utf8');
const conf = JSON.parse(getConf);


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
			try {
				JSON.parse(dataResult);
			} catch (e) {
				console.error(`error ${e} in ${dataResult}`);
				req();
				return false;
			}
			const jsonResult = JSON.parse(dataResult);
			let twitterAccountList = [];
			jsonResult.forEach((data) => {
				// list twitter acount url
				const twitterUrlList = _.filter(data.mapNetworks, (val, i) => (/twitter/i).test(i));

				twitterAccountList = _.union(twitterAccountList, twitterUrlList);
			});

			// get twitter
			streamerList = twitterAccountList.map(val => val.match(/http(?:s|):\/\/twitter.com\/([\w]+)[\S]*/)[1]);

			emiter.emit('listStreamer', streamerList);

			return streamerList;
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

// let followingsUsers = [];

// Store the IDS of the followings accounts
// T.get('friends/list', { screen_name: conf.userToCheckFollow }, (err, data) => {
// 	if (!err && data && data.users) {
// 		followingsUsers = data.users.map(e => e.screen_name);
// 		console.log(followingsUsers, _.intersection(followingsUsers, streamers));
// 	} else if (err.allErrors) {
// 		console.error(err.allErrors);
// 	}
// });
const stream = T.stream('statuses/filter', { track: conf.watcher });

stream.on('tweet', (tweet) => {
	// Test if the user who had tweeted is in the streamers list
	// & if the 'userToCheckFollow' is following him
  // temporary anavailable
	// const availableStreamer = _.intersection(followingsUsers, streamers);
	if (_.indexOf(streamers, tweet.user.screen_name) >= 0) {
		// We RT his tweet
		T.post('statuses/retweet/:id', { id: tweet.id_str }, () => {
			console.log(`Just RT @${tweet.user.screen_name}`);
		});
	}
});

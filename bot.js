//This is the main script for the bot. To start the bot, run this script with node
var port = 8080
try {
	var port = process.argv[2];
} catch (e){
	console.log("Port not given - defaulting to 8080");
}

try {
	var Discord = require("discord.js");
} catch (e){
	console.log("Please run npm install and ensure it passes with no errors!");
	process.exit();
}

try {
	var discord_auth = require('./auth.json');
} catch (e) {
	console.log("Auth file not found!");
}

var bot = new Discord.Client();

var http = require('http');

var Twitter = require('twitter');
var child_process = require('child_process');

var twitter_bot = require('./nifty/twitter.js');
var decider = require('./nifty/decisions.js');

var twitter_client = new Twitter({
	consumer_key: discord_auth.twitter.consumer_key,
	consumer_secret: discord_auth.twitter.consumer_secret,
	access_token_key: discord_auth.twitter.access_token_key,
	access_token_secret: discord_auth.twitter.access_token_secret
})

//call checkRole(message.sender, message.server, 'role')
var checkRole = function(user, server, role){
	for (var i = 0; i < server.roles.length; i++){
		if(server.roles[i] == role && user.hasRole(server.roles[i])){
			return true
		}
	}
	return false
}

var commands = {
	//example command object
	//each object has three attributes: process, usage, and description.
	//usage and description are to help users when they run !help
	//the process attribute contains the definition of a function which calls the desired feature,
	//which should be imported from a .js file stored in the nifty directory.
	//In general, one should design their functions to take a callback function as the last parameters, which
	//is to be defined in this object. The callback can handle things like messaging the channel or users.
	//'!example': {
		//process: function(user, channel, server, message){
			//my_package.myFunction(foo, bar, callbackFunction(){
				//bot.sendMessage(channel, "Example callback executed")	
			//})
		//},
		//usage: "!example <arguments>",
		//description: "This is an example implementation of a command.",
	//},
	'!tweet': {
		process: function(user, channel, server, tweet) {
			if(checkRoloe(user, server, 'tweeter')){
				twitter_bot.postTweet(twitter_client, user, tweet, function(success){
					if(success){
						bot.sendMessage(channel, "Tweet posted!");
					}else{
						bot.sendMessage(channel, "Tweet failed to post :( !");
					};
				})
			}else{
				bot.sendMessage(channel, "You must have role 'tweeter' to post a tweet.")
			}
		},
		usage: "!tweet <tweet body>",
		description: "Post a tweet from the twitter channel. You must have the role 'tweeter' to post a tweet"
	},
	'!ping': {
		process: function(user, channel, server, argument){
			bot.sendMessage(channel, "Hi there, " + user.name + "! :)");
			console.log("Ping from " + user + " aka " + user.name);
		},
		usage: "!ping",
		description: "dumps info on the user to the console of the server."
	},
	'!pull': {
		process: function(user, channel, server, argument){
			if (checkRole(user, server, 'developer'){
				child_process.exec('git pull', function(error, stdout, stderr){
					if(error){
						console.log(error);
						bot.sendMessage(channel, 'error: ' + error);
						return;
					}
					bot.sendMessage(channel, 'stdout: ' + stdout);
					bot.sendMessage(channel, 'stderr: ' + stderr);
				})
			})
		},
		usage: "!pull",
		description: "Pulls the bot's code from github on to the server. You must have the role 'developer' to use this functionality."
	},
	'!help': {
		process: function(user, channel, server, argument) {
			bot.sendMessage(user, "Available Commands: ", function() {
				for (var cmd in commands) {
					var info = cmd;
					var usage = commands[cmd].usage;
					if (usage) {
						info += " " + usage;
					}
					var description = commands[cmd].description;
					if(description){
						info += "\n\t" + description;
					}
					bot.sendMessage(user,info);
				}
			})
		},
		usage: "!help",
		description: "PM's users a list of commands and invocation"
	},
	'!roll': {
		process: function(user, channel, server, argument) {
			decider.rollDice(argument, function(result){
				bot.sendMessage(channel, result)
			})
		},
		usage: "!roll <d20 syntax>",
		description: "Roll dice using d20 syntax"
	}
}

function output(error, token) {
    if (error) {
        console.log('There was an error logging in: ' + error);
        return;
    } else {
        console.log('Logged in. Token: ' + token);
    }
}

bot.loginWithToken(discord_auth.token, output);

bot.on('message', function(message){
	//if bot is mentioned
	if (message.isMentioned(bot.user)) {
		//Trim the mention from the message and any whitespace
		var command = message.content.substring(bot.user.id.length+4,message.content.length).trim();
		//If first character is !, <insert hella commands>
		if (command.substring(0,1) === "!") {
			var to_execute = command.split(' ')[0];
			var argument = command.substring(command.indexOf(' ')+1, command.length);
			console.log('command: ' + to_execute);
			console.log('argument: ' + argument);
			if (commands[to_execute]) {
				commands[to_execute].process(message.author, message.channel, message.server, argument)
			}  else {
				bot.sendMessage(message.channel, "Unknown Command :(");
			}
		}
	}
})

http.createServer().listen(port, function(){
	console.log("Listening on port: " + port);
})

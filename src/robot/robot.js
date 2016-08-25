var botnames = new Set();
var humans = new Set();
var bots = new Set();
const MIN_PLAYERS = 8;
var _ = require('lodash');

var timers = {};
setInterval(function() {
    _.values(timers).forEach(function(t) {
        t();
    });
}, 1000);

module.exports = {

    new: function(controller, server, width, height, exit_callback) {

        var name = controller.name || 'A robot has no name';

        console.log('Creating robot "', name, '" on server', server);

        var global = {
            'name': name,
            'width': width,
            'height': height,
            'state': "new"
        };
        botnames.add(name);

        function checkRespawn() {
            if (global.state === "rip" && (bots.size + humans.size) < MIN_PLAYERS ) {
                if ((MIN_PLAYERS - bots.size - humans.size) / MIN_PLAYERS > Math.random()) {
                    respawn();
                }
            }
        }
        timers[name] = checkRespawn;

        var socket = require("socket.io-client")(server, {query:"type=player"});

        socket.on('connect', function() {
            console.log(name, 'Connected');
        });

        socket.on('welcome', function (robotSettings) {
            global.settings = robotSettings;
            robotSettings.name = global.name;
            robotSettings.screenHeight = global.height;
            robotSettings.screenWidth = global.width;
            socket.emit('gotit', robotSettings);
        });


        // Handle error.
        socket.on('connect_failed', function () {
            socket.close();
            console.log(name, 'connection failed');
        });

        socket.on('gameSetup', function(data) {
            if (isFunction(controller.game_setup)) {
                controller.game_setup(data);
            }
        });

        socket.on('serverTellPlayerMove', function (userData, foodsList, massList, virusList) {
            var playerData;
            var data;
            var enemyData = [];

            // get player data from all users
            for (var i = 0; i < userData.length; i++) {
                data = userData[i];

                if (typeof(data.id) == "undefined") {
                    playerData = data;
                    userData.splice(i, 1);
                } else if (!data.waitingRespawn) {
                    // players waiting to respawn should be invisible to
                    // robots
                    enemyData.push(data);
                }
            }

            if (!playerData) {
                return;
            }

            var move = controller.step(playerData, enemyData, foodsList, massList, virusList);

            if (move && !isNaN(move.x) && !isNaN(move.y)) {
                socket.emit('0', move);
            } else if (move === 'fire-food') {
                socket.emit('1');
            } else if (move === 'split') {
                socket.emit('2');
            } else {
                console.log('[WARN] Robot name, invalid move:', move);
            }
        });




        function respawn() {
            console.log(name, "respawning");
            global.state = "respawning";
            setTimeout(function() {
                 socket.emit('respawn');
            }, 1000, Math.random() * 4000);
        }

        socket.on('leaderboard', function (data) {
            if (isFunction(controller.leaderboard)) {
                controller.leaderboard(data.leaderboard);
            }

            bots.clear();
            humans.clear();
            for(var i=0; i < data.leaderboard.length ; i++ ) {
                if (!botnames.has(data.leaderboard[i].name)) {
                    humans.add(data.leaderboard[i].name);
                } else {
                    bots.add(data.leaderboard[i].name);
                }
            }
        });

        // Death.
        socket.on('RIP', function () {
            console.log(name, 'you are dead');
            global.state = "rip";
            bots.delete(name);
        });

        socket.on('kick', function (data) {
            console.log(name, 'you got kicked from the game:', data);
        });

        socket.on('virusSplit', function (virusCell) {
            socket.emit('2', virusCell);
        });

        socket.on('disconnect', function () {
            socket.close();
            console.log(name, 'disconnected');
            exit_callback(name);
        });

        socket.on('playerDied', function (data) {
            var name = data.name || 'An unnamed cell';
            // console.log(global.name, '{GAME} - <b>' + name + '</b> was eaten.');
            bots.delete(name);
            humans.delete(name);
        });

        socket.on('playerDisconnect', function (data) {
            var name = data.name || 'An unnamed cell';
            // console.log('{GAME} - <b>' + name + '</b> disconnected.');
        });

        socket.on('playerJoin', function (data) {
            var name = data.name || 'An unnamed cell';
            // console.log('{GAME} - <b>' + name + '</b> joined.');
        });

        socket.emit('respawn');

        return socket;
    }
};

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

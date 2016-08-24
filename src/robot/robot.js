var botnames = new Set();
var humans = 0;
const MIN_HUMANS = 2;

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

        var socket = require("socket.io-client")(server, {query:"type=player"});

        socket.on('connect', function() {
            console.log('Connected');
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
            console.log('connection failed');
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
            global.state = "respawning";
            setTimeout(function() {
                 socket.emit('respawn');
            }, 1000, Math.random() * 4000);
        }

        socket.on('leaderboard', function (data) {
            if (isFunction(controller.leaderboard)) {
                controller.leaderboard(data.leaderboard);
            }

            var h = 0;
            for(var i=0; i < data.leaderboard.length ; i++ ) {
                if (!botnames.has(data.leaderboard[i].name)) {
                    h++;
                }
            }
            humans = h;
            // console.log("humans", humans);
            if (h < MIN_HUMANS && global.state === "rip") {
                respawn();
            }
        });

        // Death.
        socket.on('RIP', function () {
            console.log('you are dead');
            global.state = "rip";

            // console.log("humans", humans);
            if (humans < MIN_HUMANS) {
                respawn();
            }

            // restart
        });

        socket.on('kick', function (data) {
            console.log('you got kicked from the game:', data);
        });

        socket.on('virusSplit', function (virusCell) {
            socket.emit('2', virusCell);
        });

        socket.on('disconnect', function () {
            socket.close();
            console.log('disconnected');
            exit_callback(name);
        });

        socket.on('playerDied', function (data) {
            var name = data.name || 'An unnamed cell';
            console.log('{GAME} - <b>' + name + '</b> was eaten.');
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

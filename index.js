var args = process.argv;
var DubAPI = require('dubapi');
var inspect = require('util').inspect;
var log4js = require('log4js');
var logger = log4js.getLogger();
var fs = require('fs');

global.bot;
global.myutils = require('./myutils.js');

//Format: output({text: [required], destination: [required],
//                userid: [required for PM], format: [optional]});
global.output = function(data) {
    if(data.destination == 'chat') {
        bot.sendChat(data.text);
    } else if(data.destination == 'pm') {
//        bot.pm(data.text, data.userid);
    } else if(data.destination == 'http') {
//        response.writeHead(200, {'Content-Type':'text/plain'});
//        if(data.format == 'json') {
//            response.end(JSON.stringify(data.text));
//        } else {
//            response.end(data.text);
//        }
    }
}

function initializeModules () {
    //Creates the config object
    try {
        if (args[2] == '-c' && args[3] != null) {
            config = JSON.parse(fs.readFileSync(args[3], 'ascii'));
        } else {
            config = JSON.parse(fs.readFileSync('config.json', 'ascii'));
        }
    } catch(e) {
        //todo: update error handling
        console.log(e);
        console.log('Error loading config.json. Check that your config file exists and is valid JSON.');
        process.exit(33);
    }

    if (!config.debugmode) {
        logger.info('Loglevel INFO');
        logger.setLevel('INFO');
    }
    else {
        logger.info('Loglevel DEBUG');
    }

    //Creates mariasql db object
    if (config.database.usedb) {
        try {
            mariasql = require('mariasql');
        } catch(e) {
            console.log(e);
            console.log('It is likely that you do not have the mariadb node module installed.'
                + '\nUse the command \'npm install mariasql\' to install.');
            console.log('Starting bot without database functionality.');
            config.database.usedb = false;
        }
    }

    if (config.database.usedb) {
        //Connects to mariasql server
        try {
            var dbhost = 'localhost';
            if (config.database.login.host != null && config.database.login.host != '') {
                dbhost = config.database.login.host;
            }
            dbclient = new mariasql();
            dbclient.connect({user: config.database.login.user,
                              password: config.database.login.password,
                              database: config.database.dbname,
                              host: dbhost});
        } catch(e) {
            console.log(e);
            console.log('Make sure that a MariaDB server instance is running and that the '
                + 'username and password information in config.js are correct.');
            console.log('Starting bot without database functionality.');
            config.database.usedb = false;
        }
    }

    loadCommands(null);
}

function loadCommands (data) {
    var newCommands = new Array();
    var j = 0;
    var response = '';

    try {
        var filenames = fs.readdirSync('./commands');
        var copyFound = false;
        
        for (i in filenames) {
            var command = require('./commands/' + filenames[i]);
            if (command.equiv) {
                command.equivalent = command.equiv.split(',');
            }
            else {
                command.equivalent = [];
            }
            newCommands.push({name: command.name, equiv: command.equivalent, handler: command.handler,
                hidden: command.hidden, enabled: command.enabled, matchStart: command.matchStart});
            j++;
        }

        commands = newCommands;
        response = j + ' commands loaded.';
        if (data == null) {
            console.log(response);
        }
        else {
            output({text: response, destination: data.source, userid: data.userid});
        }
    } catch (e) {
        response = 'Command reload failed: ' + e;
        if (data == null) {
            console.log(response);
        }
        else {
            output({text: response, destination: data.source, userid: data.userid});
        }
    }
}

function handleCommand (command, text, name, userid, source) {
    var i,j,isFound;

    for (i in commands) {
        if (commands[i].name == command) {
            commands[i].handler({name: name, userid: userid, text: text, source: source});
            break;
        }
        else if (commands[i].equiv.length > 0) {
            isFound = false;
            for (j in commands[i].equiv) {
                if (commands[i].equiv[j] == command) {
                    commands[i].handler({name: name, userid: userid, text: text, source: source});
                    isFound = true;
                    break;
                }
            }
            if (isFound) {
                break;
            }
        }
    }
}

initializeModules();

bot = new DubAPI({username: config.botinfo.username, password: config.botinfo.password}, function(err, bot) {
    if (err) return console.error(err);

    logger.info('Running DubAPI v' + bot.version);

    function connect() {bot.connect(config.roomid);}

    connect();
});

bot.on('connected', function(name) {
    logger.info('Connected to ' + name);
    //bot.sendChat('Hello, world!');
});

bot.on('disconnected', function(name) {
    logger.info('Disconnected from ' + name);

    setTimeout(connect(), 15000);
});

bot.on('error', function(err) {
    logger.error(err);
});

bot.on(bot.events.roomPlaylistUpdate, function(data) {
//        console.log('roomPlaylistUpdate:' + inspect(data));
    if ( (data) && (data.media)) {
        bot.sendChat(':musical_note: ' + data.media.name + ' (' + data.user.username + ')');
    }
});

bot.on(bot.events.userJoin, function(data) {
    logger.debug('userJoin: ' + inspect(data));
    setTimeout(function () {
        bot.sendChat('Hello, @' + data.user.username + '!');
    }, 5000);
});

bot.on(bot.events.userLeave, function(data) {
    logger.debug('userLeave: ' + inspect(data));
    bot.sendChat(data.user.username + ' has left the building.');
});

bot.on(bot.events.chatMessage, function(data) {
    var fromID = data.user.id;
    var fromUser = data.user.username;

    logger.debug('chatMessage: ' + inspect(data));
    logger.info(data.user.username + ': ' + data.message);

    var command = data.message.split(' ')[0].toLowerCase();
    var firstIndex = data.message.indexOf(' ');
    var qualifier = "";
    if (firstIndex != -1){
        qualifier = data.message.substring(firstIndex+1, data.message.length);
    }
    qualifier = qualifier.replace(/&#39;/g, '\'');
    qualifier = qualifier.replace(/&#34;/g, '\"');
    qualifier = qualifier.replace(/&amp;/g, '\&');
    qualifier = qualifier.replace(/&lt;/gi, '\<');
    qualifier = qualifier.replace(/&gt;/gi, '\>');
    switch (command)
    {
/*        case '#shutdown':
            // Gracefully logoff and exit with 0 to stop bot
            if (data.fromID == config.admin) {
                bot.leaveBooth();
                bot.sendChat("Shutting down...");
                setTimeout(function() {
                    process.exit(0);
                }, 5000);
            }
            else {
                bot.sendChat("I don't think so, " + data.from + "...");
            }
            break;
        case '#restart':
            // Gracefully logoff and exit with 34 to restart
            if (data.fromID == config.admin) {
                bot.leaveBooth();
                bot.sendChat("Restarting...");
                setTimeout(function() {
                    process.exit(34);
                }, 5000);
            }
            else {
                bot.sendChat("I don't think so, " + data.from + "...");
            }
            break;
        case '#comebacklater':
            // Gracefully logoff and exit with 35 to come back after 10 minutes
            if (data.fromID == config.admin) {
                bot.leaveBooth();
                bot.sendChat("I'll be back later!");
                setTimeout(function() {
                    process.exit(35);
                }, 5000);
            }
            else {
                bot.sendChat("I don't think so, " + data.from + "...");
            }
            break;
*/            
        default:
            handleCommand(command, qualifier, fromUser, fromID, "chat");
            break;
    }
});

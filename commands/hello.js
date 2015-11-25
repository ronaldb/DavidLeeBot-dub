//Displays the list of commands found in ./commands/

exports.name = '.hello';
exports.equiv = '.hey,.hi,.yo,.ola';
exports.hidden = false;
exports.enabled = true;
exports.matchStart = false;
exports.handler = function(data) {
    var response = 'Well hey there, @' + data.name + '!'; 
    output({text: response, destination: data.source, userid: data.userid});
}
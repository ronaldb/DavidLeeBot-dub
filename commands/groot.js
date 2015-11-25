//I am Groot!

exports.name = '.groot';
exports.hidden = true;
exports.enabled = true;
exports.matchStart = false;
exports.handler = function(data) {
	var responses = ["I am Groot!",
                     "I am Groot.",
                     "We are Groot.",
                     "/me begins to chew on a leaf protruding from his shoulder",
                     "/me grunts",
                     "http://i.imgur.com/Iyl7WKU.gif",
                     "http://i.imgur.com/Okzfq5E.gif",
                     "http://i.imgur.com/1GpkElw.gif",
                     "http://i.imgur.com/Smx1uL8.png",
                     "http://i.imgur.com/C0F5GYP.gif"];
    var response = myutils.pickone(responses);
    output({text: response, destination: data.source, userid: data.userid});
}

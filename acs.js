/*

	AUTOMATIC CINEMA
	Server.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Dieses Programm ist Freie Software: Sie können es unter den Bedingungen
    der GNU General Public License, wie von der Free Software Foundation,
    Version 3 der Lizenz oder (nach Ihrer Wahl) jeder neueren
    veröffentlichten Version, weiterverbreiten und/oder modifizieren.

    Dieses Programm wird in der Hoffnung, dass es nützlich sein wird, aber
    OHNE JEDE GEWÄHRLEISTUNG, bereitgestellt; sogar ohne die implizite
    Gewährleistung der MARKTFÄHIGKEIT oder EIGNUNG FÜR EINEN BESTIMMTEN ZWECK.
    Siehe die GNU General Public License für weitere Details.

    Sie sollten eine Kopie der GNU General Public License zusammen mit diesem
    Programm erhalten haben. Wenn nicht, siehe <http://www.gnu.org/licenses/>.
*/

var config = require('./_config.js');

if (config.html) console.log("<html>\
<head>\
<style>\
body {\
display: block;\
position: absolute;\
left: 0;\
right: 0;\
top: 220px;\
bottom: 0;\
overflow: none;\
overflow-y: scroll;\
white-space: pre;\
font: normal normal normal 1em Courier, \"Courier New\", monospace;\
}\
div {\
z-index: 1;\
white-space: normal;\
position: fixed;\
right: 0;\
top: 0;\
left: 0;\
height: 190px;\
font: normal normal normal 1em Arial, sans-serif;\
padding: 1em;\
padding-bottom: 0.5em;\
background: rgba(130,130,130,0.8);\
}\
.blur {\
z-index: 0;\
filter: blur(10px);\
-webkit-filter: blur(10px);\
-moz-filter: blur(10px);\
}\
h1 {\
	font-size: 1.2em;\
}\
hr {\
	height: 0;\
	border-bottom: 1px solid #000;\
}\
</style>\
</head>\
<body>\
<div>")
console.log(config.html?"<hr>":"-----------------------------------------------------")
console.log(config.html?"<h1>Automatic Cinema Server</h1>":"- Automatic Cinema Server                           -")
console.log(config.html?"<hr>":"-                                                   -")



/* Load Library */

var express = require('express'),
	mongoskin = require('mongoskin'),
	bodyParser = require('body-parser'),
	cors = require('cors'),
	path = require('path')
	util = require('util'),
	ip = require("ip"),
	app = express(),
	utils = require('./_utils.js')(config),
	narration = require('./_narration.js')(config, utils),	
	utils.narration = narration,
	fs = require('fs'),
	mime = require('mime')
	app.use(bodyParser({limit: '5000mb'}))
	app.use(cors())


/* Database Setup */

var db = mongoskin.db(config.mongo, {
	safe: true,
	auto_reconnect: true
})

db.open(function (err) {
	if (err) {
		console.log("-----------------------------------------------------")
		console.log("- Could not connect to MongoDB. Make sure you have  -")
		console.log("- a Database running and the _config file correctly -")	
		console.log("- set up.                                           -")		
		console.log("-----------------------------------------------------")
		process.exit()
	}
})
 

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};


var users = db.collection('users');
users.ensureIndex({
	"username": 1
}, {
	unique: true,
	dropDups: true,
	sparse: true
}, function(err, replies) {})
users.bind(require('./_db.users.js'));


app.param(':checkSession', function(req, res, next, checkSession) {
	users.findById(checkSession, function(e, results) {
		if (e || results == null) {
			res.send(utils.error(100));
			req.ischecked = false
			// die here!
		} else {
			req.current = results
			req.id = checkSession
			if (req.current.options == null) {
				console.log("no options stored for user. resetting.")
				req.current.options = {
					show: null,
					style: null,
					target: null,
					content: null,
					time: 0,
					projects: config.version,
					preroll: config.preroll
				}
				utils.update(users, req).then(function(data) {
					if (data.Error) res.send(data);
					else res.send(true);
				});
			}
			return next()
		}
	})
})



/* 
	Login
	-----

	Creates a new Account if user and Name is not known.
	Returns a Session Id otherwise

 */

app.post('/Login', function(req, res, next) {
	users.getByLogin(req.body, function(e, results) {
		if (e || results == null) {
			users.insert({
				username: req.body.username,
				password: req.body.password,
				shows: [],
				options: {
					show: null,
					style: null,
					target: null,
					content: null,
					time: 0,
					projects: config.version,
					preroll: config.preroll					
				}
			}, {}, function(e, results) {
				if (e) {
					res.send(utils.error(e.code));
					return;
				}
				res.send(results[0]._id)
			})
		} else {
			res.send(results._id);
		}
	})
})

/* 
	Check Session
	-------------

	Checks if a session Id is Valid
	Returns true or an error

 */

app.get('/CheckSession/:checkSession', function(req, res, next) {
	// Due to the app.param callback :checkSession, the point here 
	// is only reached if :checkSession is valid. Therefore, it can
	// always return true.
	res.send(true)
})



/* 
  	Store
	-----
  	Updates data
  
*/

app.post('/Store/:checkSession/:function', function(req, res, next) {
	if (req.body == null) {
		res.send(utils.error(104));
		return
	}
	
	var returndata = true;

	switch (req.params.function) {
		case 'addshow':
			if (req.body.name == null) {
				res.send(utils.error(102, "No Name Set"));
				return
			}
			if (!req.current.shows instanceof Array || req.current.shows == null) req.current.shows = [];
			req.current.shows.push({
				name: req.body.name,
				targets: [],
				styles: [],
				contents: [],
				channels: [],
				clips: []
			})
			break;
		case 'addchannel':
			if (req.body.name == null || req.body.suffix == null) {
				res.send(utils.error(102, "No Name Set"));
				return
			}
			if (req.current.options.show == null) {
				res.send(utils.error(102, "No select a show first."));
				return
			}
//			console.log(req.body);
			req.body.suffix = req.body.suffix.split(";");
			req.body.status = "Open";
			req.body.id = utils.guid();
			
			if (req.current.shows[req.current.options.show]) {
				if (!req.current.shows[req.current.options.show].channels instanceof Array || req.current.shows[req.current.options.show].channels == null)
					req.current.shows[req.current.options.show].channels = [];
				if (utils.channelexists(req.body.name,req.current.shows[req.current.options.show].channels)===false)
					req.current.shows[req.current.options.show].channels.push(req.body);
				else {
					res.send(utils.error(116));				
					return;
				}
			}
			break;

		case 'addstyle':
		case 'addcontent':
		case 'addtarget':
			if (req.body.name == null) {
				res.send(utils.error(102, "No Name Set"));
				return
			}
			if (req.current.options.show == null || req.current.shows[req.current.options.show] == null) {
				break;
			}
		case 'addcontent':
			if (req.params.function == 'addcontent') {
				if (!req.current.shows[req.current.options.show].contents instanceof Array || req.current.shows[req.current.options.show].contents == null)
					req.current.shows[req.current.options.show].contents = [];
				req.current.shows[req.current.options.show].contents.push({
					name: req.body.name,
					data: utils.createemptydata(req.params.function)
				});
				console.log("Push Content")
				break;
			}

		case 'addstyle':
			if (req.params.function == 'addstyle') {
				if (!req.current.shows[req.current.options.show].styles instanceof Array || req.current.shows[req.current.options.show].styles == null)
					req.current.shows[req.current.options.show].styles = [];
				req.current.shows[req.current.options.show].styles.push({
					name: req.body.name,
					data: {}
				});
				console.log("Push Style")
				break;
			}

		case 'addtarget':
			if (req.params.function == 'addtarget') {
				if (!req.current.shows[req.current.options.show].targets instanceof Array || req.current.shows[req.current.options.show].targets == null)
					req.current.shows[req.current.options.show].targets = [];
				req.current.shows[req.current.options.show].targets.push({
					name: req.body.name,
					data: false
				});
				console.log("Push Target")
				break;
			}

		case 'time':
			console.log("Updated Time:" + req.body.time)			
			req.current.options.time = parseInt(req.body.time);
			break;

		case 'preroll':
			console.log("Updated Preroll: " + req.body.preroll)			
			req.current.options.preroll = parseInt(req.body.preroll);
			break;

		case 'content':
			for (var d in req.body.data) if (req.body.data.hasOwnProperty(d)) {
				var _keywords = req.body.data[d].Keywords;
				var _valid = {};
				for (var k in _keywords) if (_keywords.hasOwnProperty(k)) {
					_valid[_keywords[k][0]] = _keywords[k][0];
				}
				var _nodes = req.body.data[d].Nodes;
				if (_nodes != null) {
					for (var n in _nodes) if (_nodes.hasOwnProperty(n)) {
						if(!(_nodes[n][0] in _valid && _nodes[n][1] in _valid)) {
							console.log("Delete Node")
							_nodes[n] = null;					
						}
					}
					_nodes.clean(null);
				}
			}
			
			
			
			req.current.shows[req.current.options.show].contents[req.current.options.content].data = req.body.data;
			break;

		case 'style':
			req.current.shows[req.current.options.show].styles[req.current.options.style].data = req.body.data;
			break;

		case 'target':
			req.current.shows[req.current.options.show].targets[req.current.options.target].data = req.body.data;
			break;

		case 'annotate':
			utils.annotate(
				req.current.shows[req.current.options.show].contents[req.current.options.content].data, 
				req.body.dim, 
				req.body.x, 
				req.body.y, 
				req.body.object,
				req.body.preview				
			)
			returndata = req.current.shows[req.current.options.show].contents[req.current.options.content].data;
			break;

		case 'config':
			if (req.body.show != null) req.current.options.show = req.body.show
			if (req.body.style != null) req.current.options.style = req.body.style
			if (req.body.target != null) req.current.options.target = req.body.target
			if (req.body.content != null) req.current.options.content = req.body.content
			if (req.body.time != null) req.current.options.time = req.body.time
			if (req.body.preroll != null) req.current.options.preroll = req.body.preroll
			console.log("Updated Config")
			break;
		default:
			res.send(utils.error(101, req.params.function));
			return
	}
	
	/* Update DB */
	utils.update(users, req).then(function(data) {
		if (data.Error) res.send(data);
		else {
			utils.synchronize(users, req, db).then(function(res){
				if (res===false) {
					console.log("[sync] Failed!");
				}
			});
			res.send(returndata);
		}
	});


})

/* 
  	LoadOptions
	-----------
  	Loads Available Options
  
*/


app.get('/LoadOptions/:checkSession', function(req, res, next) {

	var options = {
		projects: config.version
	}
	options.style = []
	options.target = []
	options.content = []
	options.shows = []
	/* Populate Shows */
	for (var i = 0, len = req.current.shows.length; i < len; i++)
		options.shows.push([i, req.current.shows[i].name]);

	/* Populate Rest */
	if (req.current.options && req.current.shows[req.current.options.show]) {
		for (var i = 0, len = req.current.shows[req.current.options.show].targets.length; i < len; i++)
			if (req.current.shows[req.current.options.show].targets[i])
				options.target.push([i, req.current.shows[req.current.options.show].targets[i].name]);
		for (var i = 0, len = req.current.shows[req.current.options.show].styles.length; i < len; i++)
			if (req.current.shows[req.current.options.show].styles[i])
				options.style.push([i, req.current.shows[req.current.options.show].styles[i].name]);
		for (var i = 0, len = req.current.shows[req.current.options.show].contents.length; i < len; i++)
			if (req.current.shows[req.current.options.show].contents[i])
				options.content.push([i, req.current.shows[req.current.options.show].contents[i].name]);


	}
	res.send(options)
})

/* 
  	LoadConfig
	----------
  	Sends the current configuration
  
*/


app.get('/LoadConfig/:checkSession', function(req, res, next) {
	res.send(req.current.options)
})

/* 
  	Channels
	--------
  	Loads Available Channels
  
*/

app.get('/Channels/:checkSession/:channel', function(req, res, next) {
	console.log("[channels] all channel ")
	if (req.current.options.show == null || req.current.shows[req.current.options.show] == null) {
		res.send(utils.error(103));
		return;
	}
	if (req.current.shows[req.current.options.show].channels)
		res.send(req.current.shows[req.current.options.show].channels)
	else res.send(false)
})

app.get('/Channels/:checkSession', function(req, res, next) {
	if (!config.quiet) console.log("[channels] active channel")
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	var active = function(obj) {
		return obj.filter(function(el) {return el.status == "Close";});
	}
	if (req.current.shows[req.current.options.show].channels)
		res.send(active(req.current.shows[req.current.options.show].channels))
	else res.send(false)
})

/* 
  	Toggle
	------
  	Toggles the State of channels
  
*/


app.get('/Toggle/:checkSession/:channel/:state', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	for (var i = 0, len = req.current.shows[req.current.options.show].channels.length; i < len; i++) {
		if (req.current.shows[req.current.options.show].channels[i].name == req.params.channel) {
			req.current.shows[req.current.options.show].channels[i].status = req.params.state
			utils.update(users, req).then(function(data) {
				if (data.Error) res.send(data);
				else res.send(true);
			});
			return;
		}
	}
	res.send(false)
})

/* 
  	Delete
	------
  	Deletes a show, style, target, channel
  
*/


app.delete('/Delete/:checkSession/:type/:name', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}

	var del = function(obj) {
		return obj.filter(function(el) {
			console.log(el);
			if (el == null) return false;
			return el.name != null && el.name !== req.params.name;
		});
	}

	switch (req.params.type) {
		case "channel":
			req.current.shows[req.current.options.show].channels = del(req.current.shows[req.current.options.show].channels);
			break;
		case "style":
			req.current.shows[req.current.options.show].styles = del(req.current.shows[req.current.options.show].styles);
			break;
		case "target":
			req.current.shows[req.current.options.show].targets = del(req.current.shows[req.current.options.show].targets);
			break;
		case "content":
			req.current.shows[req.current.options.show].contents = del(req.current.shows[req.current.options.show].contents);
			break;
		case "show":
			req.current.shows = del(req.current.shows);
			break;

		default:
			res.send(utils.error(101, "wrong parameter"));
			return;
			break;
	}

	utils.update(users, req).then(function(data) {
		if (data.Error) res.send(data);
		else {
			utils.synchronize(users, req, db).then(function(res){
				if (res===false) {
					console.log("[sync] Failed!");
				}
			});			
			res.send(true);
		}
	});
})

/* 
  	Rename
	------
  	Renames a show, style, target, channel
  
*/

app.post('/Rename/:checkSession/:type/:name', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	if (req.body == null || req.body.newname == "") {
		res.send(utils.error(104));
		return;
	}

	var ren = function(obj) {
		for (var i = 0, len = obj.length; i < len; i++)
			if (obj[i].name == req.params.name)
				obj[i].name = req.body.newname
		return obj;
	}

	switch (req.params.type) {
		case "channel":
			req.current.shows[req.current.options.show].channels = ren(req.current.shows[req.current.options.show].channels);
			break;
		case "style":
			req.current.shows[req.current.options.show].styles = ren(req.current.shows[req.current.options.show].styles);
			break;
		case "target":
			req.current.shows[req.current.options.show].targets = ren(req.current.shows[req.current.options.show].targets);
			break;
		case "content":
			req.current.shows[req.current.options.show].contents = ren(req.current.shows[req.current.options.show].contents);
			break;
		case "show":
			req.current.shows = ren(req.current.shows);
			break;
		default:
			res.send(utils.error(101, "wrong parameter"));
			return;
			break;
	}
	utils.update(users, req).then(function(data) {
		if (data.Error) res.send(data);
		else {
			utils.synchronize(users, req, db).then(function(res){
				if (res===false) {
					console.log("[sync] Failed!");
				}
			});
			res.send(true);
		}
	});
})


/* 
  	Load
	----
    Loads a show, style, target, channel
  
*/

app.get('/Load/:checkSession/:type', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	var data = false;

	switch (req.params.type) {
		case "style":
			if (req.current.options.style == null || req.current.shows[req.current.options.show].styles[req.current.options.style] == null) {
				res.send(utils.error(105));
				return;
			}
			data = req.current.shows[req.current.options.show].styles[req.current.options.style].data;
			break;
		case "target":
			if (req.current.options.target == null || req.current.shows[req.current.options.show].targets[req.current.options.target] == null) {
				res.send(utils.error(106));
				return;
			}
			data = req.current.shows[req.current.options.show].targets[req.current.options.target].data;
//			console.log(data);
			break;
		case "content":
			if (req.current.options.content == null || req.current.shows[req.current.options.show].contents[req.current.options.content] == null) {
				res.send(utils.error(107));
				return;
			}
			data = req.current.shows[req.current.options.show].contents[req.current.options.content].data;
			break;
		default:
			res.send(utils.error(101, "wrong parameter"));
			return;
			break;
	}
//	console.log(util.inspect(data, false,null))	
	res.send(data || utils.error(115, "wrong parameter"));
})

/* 
  	StoreFile
	---------
    Stores a File with a multi part file form

	<form>
		<input type="hidden" id="add_dim" 	name="add_dim" value="">
 		<input type="hidden" id="add_x" 	name="add_x" value="">
 		<input type="hidden" id="add_y" 	name="add_y" value="">
 		<input type="file" id="url" name="url">
	</form>
  
*/

app.post('/StoreFile/:checkSession', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	if (req.current.shows[req.current.options.show].clips == null)
		req.current.shows[req.current.options.show].contents = [];

	// Process Uploads

	utils.processfileupload(req, res, db, users).then(function(data) {
		if (data.Error) {
			res.send(data);
			return;
		} else {
			// Add File to ontology
			var other_dims = utils.addontology(
					data.element,
					data.fields, 
					req.current.shows[req.current.options.show].contents[req.current.options.content]
				);

			// Store Data
			utils.update(users, req).then(function(store) {
				if (store.Error) {
					res.send(store);
					return;
				}
				else {
					res.send({
						keywords:other_dims,
						preview:data.element.thumb,
						object:data.element.name,
						metadata:req.current.shows[req.current.options.show].contents[req.current.options.content].data
					});
					
					// Sync Contents
					utils.synchronize(users, req, db).then(function(res){
						if (res===false) {
							console.log("[sync] Failed!");
						}
					});
				}
			});
		}
	})
})

/* 
  	StoreFile
	---------
    Stores a File with a multi part file form and accepts the keyword
    data as json string

	<form>
		<input type="hidden" id="meta" name="meta" value="jsondata">
 		<input type="file" id="url" name="url">
	</form>
  
*/

app.post('/StoreFileAnnotaded/:checkSession', function(req, res, next) {
	if (req.current.options.show == null) {
		res.send(utils.error(103));
		return;
	}
	if (req.current.shows[req.current.options.show].clips == null)
		req.current.shows[req.current.options.show].contents = [];

	// Process 
	utils.processfileupload(req, res, db, users).then(function(data) {
		if (!config.quiet) console.log("Files processed.");
//		if (!config.quiet) console.log(util.inspect(data, false,null))					
		if (data.Error) {
			if (!config.quiet) console.log("Error Uploading:" + data.Error);
			res.send(data);
			return;
		} else {
			// Add File to ontology
			utils.addontologymulti(
					data.element,
					data.fields, 
					req.current.shows[req.current.options.show].contents[req.current.options.content]
				);

			// Store Data
			utils.update(users, req).then(function(store) {
				if (store.Error) {
					res.send(store);
					return;
				}
				else {
					res.send(true);
					
					// Sync Contents
					utils.synchronize(users, req, db).then(function(res){
						if (res===false) {
							console.log("[sync] Failed!");
						}
					});
				}
			});
		}
	})
})


/* 
  	Preview
	-------
    Sends a preview file
  
*/

app.get('/Preview/:checkSession/:thumb', function(req, res, next) {
	if (req.params.thumb==null||req.params.thumb=="null") {
		res.send(utils.error(404));
		return;
	}
	var gs = db.gridStore(path.basename(req.params.thumb), 'r')
	gs.open(function(err, d) {
		if (err) {
			res.send(utils.error(404));
			return;
		}
		gs.seek(0, function() {
			// Read the entire file
			gs.read(function(err, data) {
		        res.writeHead(200, {
		            'Content-Type': mime.lookup(d.filename),
		            'Content-Length': d.length
		        });
		        res.end(data, 'binary');;				
				//db.close();
			});
		});
	});
})

/* 
  	Preview
	-------
    Sends a preview file
  
*/

app.get('/Download/:checkSession/:file', function(req, res, next) {
	if (req.params.file==null||req.params.file=="null") {
		res.send(utils.error(404));
		return;
	}
	var gs = db.gridStore(path.basename(req.params.file), 'r')
	
	gs.open(function(err, d) {
		if (err) {
			res.send(utils.error(404));
			return;
		}
		gs.seek(0, function() {
			// Read the entire file
			gs.read(function(err, data) {
		        res.writeHead(200, {
		            'Content-Type': mime.lookup(d.filename),
		            'Content-Length': d.length
		        });
		        res.end(data);
//				db.close();
			});
		});
	});	
})

/* 
  	File List
	---------
    Sends a file list
  
*/

app.get('/List/:checkSession', function(req, res, next) {
	var list = []
	var show = req.current.shows[req.current.options.show];
	for (var i = 0, len = show.clips.length; i < len; i++) {
		var c = utils.findchannelbyid(show.clips[i].channel, show.channels);
		if (c) {
			if (config.channel_types[c.typ] != null) {
				list.push({
					t:config.channel_types[c.typ],
					f:show.clips[i].file,
					c:show.clips[i].hash
				})
			}
		}
	}	
	res.send(list);
})


/* 
  	Next
	----
  	Get Next Clip in Narration
  
*/
app.get('/Next/:checkSession/:channel', function(req, res, next) {
	narration.next(req, res, users, req.params.channel).then(function(data){
		res.send(data);
	})
})

/* 
  	Reset
	-----
  	Resets the channel
  
*/
app.get('/Reset/:checkSession/:channel', function(req, res, next) {
	var show = req.current.shows[req.current.options.show];
	var channel = utils.findchannelbyname(req.params.channel,show.channels);
	if (channel === false) 
		res.send(utils.error(108));
	else 
		res.send(narration.reset(req, users, channel.id, true));
})
app.get('/Reset/:checkSession', function(req, res, next) {
	narration.reset(req, users, null, true).then(function(data) {
					if (data.Error) res.send(data);
					else res.send(true);
				});
})
/* 
  	Is Reset
	----
  	Get Next Clip in Narration
  
*/
app.post('/SyncState/:checkSession', function(req, res, next) {
//	console.log("[SyncState] check channels for reset & update live timer")
	var live = JSON.parse(req.body.data)[0];
	ret = {}
	var show = req.current.shows[req.current.options.show];
	if (show.channels == undefined) 
		res.send(utils.error(108));
    for (var c in show.channels) if (show.channels.hasOwnProperty(c)) {
		if (show.narration[show.channels[c].id] != undefined) {
			ret[show.channels[c].name] = show.narration[show.channels[c].id].reset
			show.narration[show.channels[c].id].live = (live && live[show.channels[c].name]) ? live[show.channels[c].name] : 0;
			// Update reset state: if there are new elements, isnew is false
			// If the timeline is still blank, isnew is true. So we just copy isnew to reset
			//show.narration[show.channels[c].id].reset = false

		}
	}
	utils.update(users, req).then(function(data) {
		if (data.Error) res.send(data);
		else res.send(ret);
	});	
})

/* 
  	Is New Timeline
	---------------
	Returns true if a timeline is restarted,
	otherwise false
  
*/
app.get('/IsNewTimeline/:checkSession/:channel', function(req, res, next) {
	var show = req.current.shows[req.current.options.show];
	var channel = utils.findchannelbyname(req.params.channel,show.channels);
	if (channel === false) 
		res.send(utils.error(108));
	else		
		res.send(show.narration[channel.id].isnew);
})

/* 
  	Timeline
	--------
	Returns the timeline data of a channel
  
*/
app.get('/Timeline/:checkSession/:channel', function(req, res, next) {
	var show = req.current.shows[req.current.options.show];
	var channel = utils.findchannelbyname(req.params.channel,show.channels);
	if (channel === false || show.narration[channel.id] == undefined) 
		res.send(utils.error(108));
	else		
		res.send({
			live: show.narration[channel.id].live,
			data: show.narration[channel.id].history
		});
})


/* 
  	HasMaster
	---------------
	Returns false if a channel is master,
	otherwise returns the name of the master channel
  
*/
app.get('/HasMaster/:checkSession/:channel', function(req, res, next) {
	console.log("[hasmaster] channel " + req.params.channel)	
	var show = req.current.shows[req.current.options.show];
	var channel = utils.findchannelbyname(req.params.channel,show.channels);
	if (channel === false) 
		res.send(utils.error(108));
	else {
		channel.master = channel.master || -1;
		if (channel.master==-1) res.send({slave:false,master:""});
		else {
			var masterchannel = utils.findchannelbyname(channel.master,show.channels);			
			if (masterchannel === false) 
				res.send(utils.error(108));
			else
				res.send({slave:true,master:masterchannel.name});
		}
	}
})


/* 
  	Preroll
	-------
  	Sends the global preroll value in ms
  
*/
app.get('/Preroll/:checkSession', function(req, res, next) {
	console.log("[preroll] get preroll value " + req.current.options.preroll)
	res.send(req.current.options.preroll.toString());
})

/* 
  	Rate
	----
  	Sends the global frames per second rate
  
*/
app.get('/Rate/:checkSession', function(req, res, next) {
	console.log("[rate] get rate " + config.fps)
	res.send(config.fps.toString())
})

/* 
  	Texttiming
	----------
  	Sends the global text timings: lines per screen and
  
*/
app.get('/Texttiming/:checkSession', function(req, res, next) {
	console.log("[texttiming] get rate")
	res.send(
		{
			spl : 	config.textline_duration,
			lps :   config.textlines_perscreen
		}
	)
})

/* 
  	Default
	-------
  	Deletes a show, style, target, channel
  
*/

app.get('/', function(req, res, next) {
	res.sendFile(path.join(config.html_dir, 'index.html'));
})

console.log(config.html?"<p>Server running on</p>":"- Server running on                                 -")
console.log(config.html?"<p class='address'><a target='_blank' href='http://" + ip.address() + ":" + config.port + "'>http://" + ip.address() + ":" + config.port + "</a></p>":"- \033[31m" + "http://" + ip.address() + ":" + config.port + "\033[0m                           -")		
console.log(config.html?"<hr>":"-----------------------------------------------------")
if (config.html) console.log("</div><div class='blur'></div>");
app.listen(config.port)

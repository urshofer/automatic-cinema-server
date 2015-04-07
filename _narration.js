/*

	AUTOMATIC CINEMA
	Narration Library 

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


var q = require("q"),
	path = require('path'),
	util = require('util');

	
	
module.exports = function(c,utils) {
	var module = {};
	var time = 0;
	console.log(c.html?"<p>Narration Ready</p>":"- narration ready                                   -")

	
	module.reset = function(req, users, channel_id_only, force){
		if (channel_id_only==null) channel_id_only=false;
		if (force==null) force=false;		
//		console.log("[narration] reset")
		try {
			var show 	= req.current.shows[req.current.options.show],
				target  = show.targets[req.current.options.target].data,
				content = show.contents[req.current.options.content].data;
		}
		catch(err) {
			return utils.error(102, err.message);
		}		
		if (show.narration==null) show.narration = {}
		// Cycle thru all channels
		for (var i in show.channels) if (show.channels.hasOwnProperty(i)) {		

			if (channel_id_only!==false && channel_id_only!==show.channels[i].id) {
				continue;
			}
			try {
				if (!c.quiet) console.log("[narration] resetting channel " + show.channels[i].name)
				var style   = show.styles[req.current.options.style].data[show.channels[i].name];
				var clips	= show.clips.filter(function(el) {return el.channel == show.channels[i].id});		
			}
			catch(err) {
				return utils.error(102, err.message);
			}						
			if (style) {
				module._interpolate(style,req.current.options.time * 1000, 0)
				show.narration[show.channels[i].id] = {
					name: 		show.channels[i].name,
					time: 		0,
					reset: 		force,
					tension: 	0,
					tension_required: false,
					isnew: 		true, 
					current: 	false,
					cursor: 	false,
					master: 	false,
					dimensions: {},
					usage: 		{
									nodes:{},
									clips:{}
								},
					history : 	[]
				};
			
			
				// Target & Dimension Analysis
				// creating narration.dimensions array populated
				// with active dimensions in the target, target position
				// and importance and tension values defined in the style
				for (var t in target) if (target.hasOwnProperty(t)) {
					if (target[t].Target[2]==1) {
						var ret = []
						var log = []
						for (var s in style) if (style.hasOwnProperty(s)) {
							if (style[s].type==3 && style[s].key==t) 
								ret = [style[s].ipl[0],style[s].ipl[1]]
							if (style[s].type==2 && style[s].key=="Logic") 
								log = [style[s].ipl[0],style[s].ipl[1]]
						}
						
						show.narration[show.channels[i].id].dimensions[t] = {
							target: [parseFloat(target[t].Target[0]),parseFloat(target[t].Target[1])],
							importance: ret[0],
							tension: ret[1],
							logic: log[0],
							jumpcut: log[1],
							count: 0
						}
					}
					// Reset Node Counts
					show.narration[show.channels[i].id].usage.nodes[t] = {};
					for (var n in content[t].Nodes) if (content[t].Nodes.hasOwnProperty(n))
						show.narration[show.channels[i].id].usage.nodes[t][n] = 0;
				
					// Reset Object Count and Coordinate Cache
					show.narration[show.channels[i].id].usage.clips[t] = {};
					
					for (var n = 0, len = clips.length; n < len; n++) {
						// Find all Coordinates of a clip within this dimension
						if (show.narration[show.channels[i].id].usage.clips[t][clips[n].id]==null) {
							show.narration[show.channels[i].id].usage.clips[t][clips[n].id] = {count:0, coords:[]}
						}
						for (var nn in content[t].Objects) if (content[t].Objects.hasOwnProperty(nn)) {
							if (content[t].Objects[nn][0]==clips[n].name) 
								show.narration[show.channels[i].id].usage.clips[t][clips[n].id].coords.push(content[t].Objects[nn][1]);
						}			
					}
				}
			}


		}
		
		//console.log(util.inspect(show.narration, false, null))





		if (users != null) {
			var deferred = q.defer();
			utils.update(users, req).then(function(data) {
				if (!c.quiet) console.log("[narration] reset stored")
				if (data.Error) deferred.resolve(false);
				else deferred.resolve(true);				
			});
			return deferred.promise;
		}
		else {
			return show.narration;
		}
	};
	
	
	// _distance:
	// Returns the distance between two coordinates
	// Coordinates are passed as arrays [x,y]
	module._distance = function(coord1,coord2) {
		if (coord1==undefined || coord2==undefined) return 0;
		return (Math.sqrt(Math.pow(Math.abs(parseFloat(coord1[0])-parseFloat(coord2[0])),2)+Math.pow(Math.abs(parseFloat(coord1[1])-parseFloat(coord2[1])),2)));					
	}	
	
	
	// _triangleheight
	// Returns the base coordinate of the height of a triangle
	// Given are the three coordinates of the corners
	module._triangleheight = function(_A,_B,_C) {
		
		var a = module._distance(_B,_C);
		var b = module._distance(_A,_C);		
		var c = module._distance(_A,_B);		
		
		
		var s = (a+b+c)/2;
		var h = (2/c) * Math.sqrt(s*(s-a)*(s-b)*(s-c));

		var c1 = Math.sqrt((b*b)-(h*h));
		return [
			((c1/c) * (parseFloat(_B[0])-parseFloat(_A[0]))) + parseFloat(_A[0]),
			((c1/c) * (parseFloat(_B[1])-parseFloat(_A[1]))) + parseFloat(_A[1])		
		];
	}
	
	

	// _interpolate:
	// Interpolates all style parameters on a linear basis between
	// start and end point.
	module._interpolate = function(data, duration, time) {
		for (var v in data) if (data.hasOwnProperty(v)) {
			if (data[v].from==null) data[v].from = [50,50]
			var x_in = parseFloat(data[v].from[0]),
				y_in = parseFloat(data[v].from[1]),
				x_out = parseFloat((data[v].to==null)?x_in:data[v].to[0]),
				y_out = parseFloat((data[v].to==null)?y_in:data[v].to[1])

			data[v].ipl = [
				(x_in + ((x_out - x_in) / duration * time)) / 100,
				(y_in + ((y_out - y_in) / duration * time)) / 100
			]
		}		
	}
	
	// getkeywordindex
	// search for a keyword in the content object and returns its index
	module._getkeywordindex = function(dim,keyword, content) {
		for (var k in content[dim].Keywords) if (content[dim].Keywords.hasOwnProperty(k)) {					
			if (content[dim].Keywords[k][0]==keyword) {
				return k
			}
		}			
		return false;
	}	
	
	// maxdim
	// Returns the key of the dimension in the narration object 
	// with the highest importance
	module._maxdim = function(narration) {
	    var max = 0;
		var m = false
		for (var s in narration.dimensions) if (narration.dimensions.hasOwnProperty(s)) {		
			if (narration.dimensions[s].importance >= max) {
				max = narration.dimensions[s].importance
				m = s
			}
		}		
		return m;
	}
	
	// contentanalysis
	// returns an object with the closest keyword and all its nodes
	// relative to a coord [x,y] within a certain dimension
	module._contentanalysis = function(narration, content) {
		var dim = narration.current,
			coord = narration.cursor,
			ret = {keyword:'', position: false, nodes:[]},
			mindist = false;
			
		for (var k in content[dim].Keywords) if (content[dim].Keywords.hasOwnProperty(k)) {					
			var d = module._distance(content[dim].Keywords[k][1], coord);
			if (mindist===false || d < mindist) {
				mindist = d;
				ret.keyword  = content[dim].Keywords[k][0];
				ret.position = [parseFloat(content[dim].Keywords[k][1][0]),parseFloat(content[dim].Keywords[k][1][1])];				
			}
		}
		
		for (var n in content[dim].Nodes) if (content[dim].Nodes.hasOwnProperty(n)) {					
			var node = content[dim].Nodes[n];
			if ( (node[2]>2 && node[0]==ret.keyword) || (node[2]<=2 && (node[0]==ret.keyword || node[1]==ret.keyword)) ) {

				var _topos = content[dim].Keywords[module._getkeywordindex(dim,node[1]==ret.keyword?node[0]:node[1],content)];
				ret.nodes.push({
					ref		:n,
					dim		:dim,
					to		:node[1]==ret.keyword?node[0]:node[1],
					topos	:_topos?_topos[1]:false,					
					arrow	:node[2]>2?1:0,
					color	:node[2]%2?"green":"red",
					distance:_topos?module._distance(
								content[dim].Keywords[module._getkeywordindex(dim,node[0],content)][1], 
								content[dim].Keywords[module._getkeywordindex(dim,node[1],content)][1]
							) : false
				})
			}
		}
		narration.dimensions[narration.current].context = ret
		return ret
	}
	
	module._findclosestelement = function(position,dim,content) {
		var mindist = false,
			ret = false
		for (var e in content[dim].Objects) if (content[dim].Objects.hasOwnProperty(e)) {					
			var d = module._distance(content[dim].Objects[e][1], position);
			if (mindist===false || d < mindist) {
				mindist = d;
				if (ret===false) ret = {};
				ret.value = content[dim].Objects[e][0]
				ret.key		= e
				ret.dist	= d
			}
		}		
		return ret
	}
	
	module._findclosestkeywordindimension = function(position,dim,content) {
		var mindist = false,
			ret = false
		for (var e in content[dim].Keywords) if (content[dim].Keywords.hasOwnProperty(e)) {					
			var d = module._distance(content[dim].Keywords[e][1], position);
			if (mindist===false || d < mindist) {
				mindist = d;
				if (ret===false) ret = {};
				ret.value 	= content[dim].Keywords[e][0]
				ret.objpos	= position
				ret.keypos	= content[dim].Keywords[e][1]			
				ret.key		= e
				ret.dist	= d
			}
		}		
		return ret
	}	
	
	
	module._findclosestkeywordsbyelement = function(element,content, narration) {
		var mindist = false,
			ret = false
			
		for (var dim in narration.dimensions) if (content.hasOwnProperty(dim)) {					
			
			// Find pos of element in dim
			// p contains all coordinates of an element in a dimension
			var p = [];
			for (var e in content[dim].Objects) if (content[dim].Objects.hasOwnProperty(e))
				if (content[dim].Objects[e][0]==element) 
					p.push(module._findclosestkeywordindimension(content[dim].Objects[e][1],dim,content))

			if (ret===false) ret = [];
			ret.push({dimension:dim,value:p.reduce(function(x,y) {return x.dist>y.dist?y:x;})})
		}
		return ret
	}	
	
	// _choosedimension
	// sets the narration.current dimension
	// on init, sets it to the master value, the cursor is the target position
	// on repeated calls, sets it to the dimension which has a keyword closest to
	// the element next to the current cursor position
	// If a actual change happens in the end
	module._choosedimension = function(narration, content) {
		narration.master  = module._maxdim(narration);
		var switched = false;
		// Initial Setup
		if (narration.current===false || narration.cursor===false) {
			narration.current = narration.master
			narration.cursor  = narration.dimensions[narration.current].target
			if (!c.quiet) console.log("[_choosedimension] Init: " + narration.current)
		}
		else if (Object.keys( narration.dimensions).length == 1) {
			return false;
		}
		// Switch Setup for running shows
		else {
			var threshold = content[narration.current].Keywords.length * narration.dimensions[narration.current].importance
			if (narration.dimensions[narration.current].count > threshold) {
				// Determine dimension where we switch to.
				// If current equals master, find a dimension with a keyword the most close to the current
				// Element. If a different dimension as the master dimension is selected choose the master.
				// If narration.tension_required is false choose the best other_dimension without respecting
				// the current. narration.tension_required is false only after initialisation or if the next
				// algorithm did not found any elements.
				var element = module._findclosestelement(narration.cursor,narration.current,content).value
				var otherdims = module._findclosestkeywordsbyelement(element, content, narration);


				if (otherdims && otherdims.length>1) {

					otherdims = otherdims.filter(function(x) {return narration.current==narration.master && narration.tension_required != false ? x.dimension!=narration.master : x.dimension==narration.master;})

					if (otherdims.length>1)
						otherdims = otherdims.reduce(function(x,y) {return x.value.dist>y.value.dist?y:x;})
					else 
						otherdims = otherdims[0]

					if (otherdims.dimension) {
						switched = narration.current == otherdims.dimension;
						narration.current = otherdims.dimension
						narration.cursor  = otherdims.value.objpos
					}
				}
			}
			else {
				if (!c.quiet) console.log("[_choosedimension] Kept same dimension. Threshold too high ("+ threshold +" / " + narration.dimensions[narration.current].count +")")
			}
		}
		if (switched)
			narration.dimensions[narration.current].count = 0;
		else 
			narration.dimensions[narration.current].count++

		return switched;
	}

	
	// _contentscores
	// adding score[clipid].content.__norm to the score array. Normalized values have
	// a range between 0 and 1.
	
	module._contentscores = function(scores, style, clips, content, narration, target) {
		if (Object.keys( narration.dimensions).length == 0) {
			return false
		}
//		console.log("[narration] content score: tension " + narration.tension + " req. " + narration.tension_required);
		var importance = 1;
	    for (var s in style) if (style.hasOwnProperty(s)) 
			if (style[s].key=="Scoring" && style[s].type==1) 
				importance = style[s].ipl[0]
				
				
		// Slave Channels: Sync Narration Settings with Master channel if there is one
		if (narration.hasmaster) {
			narration.cursor  = narration.master_narration.cursor
			narration.tonode  = narration.master_narration.tonode
			narration.context = narration.master_narration.context
			narration.master  = narration.master_narration.master
			narration.current = narration.master_narration.current
		}				
		else {		
			// Switch Keyword & Dimension
			// if tension over threshold ore threshold is not set
			if (narration.tension>narration.tension_required || narration.tension_required===false) {
				// Set current dimension, adjust cursor if required
				var switched = module._choosedimension(narration, content)
//				if (switched) console.log("[narration] switched dimension: " + narration.current)
				// Choose context around active dimension and cursor
				narration.context = module._contentanalysis(narration, content)

				//console.log(narration.context)

				// Choose Node outgoing from this context to another context
				var mindist = false;
				var nodechoosen = false;
				for (var n in narration.context.nodes) if (narration.context.nodes.hasOwnProperty(n)) {
					var nd = narration.context.nodes[n]
					// Prefer less use count over more
					var u = narration.usage.nodes[nd.dim][nd.ref]||0
					// Prefer short over long
					var d = nd.distance * (u+1)
					if (d < mindist || mindist === false) {
						mindist = d;
						nodechoosen = n
					}
				}
				// Store new node && update node usage count
				narration.tonode = nodechoosen===false ? false : narration.context.nodes[nodechoosen];
				if (narration.tonode != false) {
					narration.usage.nodes[nd.dim][nd.ref]++
					// Now we can find out the narration.tension_required
					narration.tension_required = narration.tonode.distance * narration.dimensions[narration.current].tension;
					// Update cursor if color of node is red
					// Setting cursor to node end instead of beginning
					// for red (negative) nodes. Only applied it tension is over tension_required
					if (narration.tonode.color=="red" && 
						narration.tension>narration.tension_required && 
						switched === false) 
						narration.cursor = narration.tonode.topos
	//				console.log("[narration] switched to keyword " + narration.tonode.to)
				}
				// Always set tension to 0
//				console.log("[narration] switched to keyword " + narration.tonode.to || "empty")
//				console.log("[narration] To Pos " + narration.tonode.topos || "empty")			
//				console.log("[narration] Cursor " + narration.cursor || "empty")						
				narration.tension = 0;
			}
		}
		
		// Choose best Element: 
		// Next to Current Cursor is associative top
		// Next to node.topos is logically top
		// By the way: The Maximum Distance between two points in a 100x100 Matrix
		// is sqrt(100*100*2) 141.4213562373095
		var distance = [];
		var base = (narration.tonode&&narration.tonode.topos)?module._triangleheight(narration.context.position, narration.tonode.topos, narration.cursor):false
		for (var i = 0, len = clips.length; i < len; i++) {
			// Find all Coordinates of a clip within this dimension

			if (narration.usage.clips[narration.current] == null || narration.usage.clips[narration.current][clips[i].id] == undefined || narration.usage.clips[narration.current][clips[i].id] == null) {
//				console.log(narration.current)
//				console.log(clips[i].id)				
//				console.log(narration.usage)								
				return;
			}
			var _c = narration.usage.clips[narration.current][clips[i].id].coords;

			var _d = []
			for (var n in _c) if (_c.hasOwnProperty(n)) {
				var d_a = module._distance(_c[n], narration.cursor);
				var d_b = 0
				if (narration.tonode.topos) {
					var h = (module._distance(_c[n], narration.tonode.topos)+module._distance(_c[n], base)-module._distance(base, narration.tonode.topos));
					var d_b = (d_a * Math.pow(h+1,3))
				}
				d_b *= narration.dimensions[narration.current].logic;


				_d.push({
					score : d_a + d_b,
					cursor: [parseFloat(_c[n][0]),parseFloat(_c[n][1])]
				})			
			}
			// If Multiple Coordinates, reduce it to one 
			// according to the jump cut feature.
			// The higher the jump cut setting is set, the further
			// position of an element is chosen. If there is only one
			// element, it will be chosen no matter what jump cut setting
			// is set.
			
			_d = _d.sort(function(a,b){return a.score-b.score})
			var s = Math.round((_d.length - 1) * narration.dimensions[narration.current].jumpcut)
//			console.log("[narration] jump cut: choose item " + s)
			distance.push({
				clip  : i, 
				score : _d[s].score,
				cursor: _d[s].cursor
			})						
			
		}
		// Normalize Scores between 0 an 1.
		var maxscore = false
		var minscore = false
		distance.filter(function(el) {
			if (maxscore==false||el.score>maxscore) maxscore=el.score;
			if (minscore==false||el.score<minscore) minscore=el.score;			
		});		
		distance.filter(function(el,i) {distance[i].__norm=importance * (1-((el.score-minscore)/(maxscore-minscore)))});		

		// Push to Scores Array

		for (var i = 0, len = clips.length; i < len; i++) 
			scores[clips[i].id].content = distance[i]

	}

	module._physicalscores = function(scores,style, clips) {
		// Normalize
		var importance = 1;
	    for (var s in style) if (style.hasOwnProperty(s)) 
			if (style[s].key=="Scoring" && style[s].type==1) 
				importance = 1-style[s].ipl[0]
				
		for (var i = 0, len = clips.length; i < len; i++) {
			var max = 0;
			var tot = 0;
		    for (var p in clips[i].norm) if (clips[i].norm.hasOwnProperty(p)) {		
				var sc = false;
			    for (var s in style) if (style.hasOwnProperty(s)) {		
					if (style[s].key==p && style[s].type==4) {
						if (style[s].ipl[0]>0) {
							sc = (1 - Math.abs(clips[i].norm[p] - style[s].ipl[1])) * style[s].ipl[0]
							tot += sc;
						}
						max ++;
					}
				}
				if (scores[clips[i].id]==null) scores[clips[i].id] = {};
				if (scores[clips[i].id].physical==null) scores[clips[i].id].physical = {};				
				if (sc !== false) scores[clips[i].id].physical[p] = sc;
				scores[clips[i].id].physical.clip = i;
				scores[clips[i].id].physical.__total = tot;
				scores[clips[i].id].physical.__norm = importance * (max > 0 ? tot / max : tot);				
			}
		}
	}
	
	module.next = function(req, res, users, _channel){
		// Scores Holds the Element Scores
		// scores{element:{physical,content,history}}
		var deferred = q.defer();
	    process.nextTick(function(){		
			var scores	= {}
			var show = req.current.shows[req.current.options.show];
			if (show == null) {
				deferred.resolve(utils.error(103));
				return;
			}
			var channel = utils.findchannelbyname(_channel,show.channels);
			if (channel === false) {
				deferred.resolve(utils.error(108));
				return;
			}
			try {
				var style   = show.styles[req.current.options.style].data[channel.name];
				var target  = show.targets[req.current.options.target].data;		
				var content = show.contents[req.current.options.content].data;				
			}
			catch(err) {
				deferred.resolve(utils.error(102, err.message));
				return;				
			}
			var clips	= show.clips.filter(function(el) {return el.channel == channel.id});		
			if (clips.length == 0) {
				deferred.resolve(utils.error(115));
				return;
			}

			// Reset narration 
			// if no narration object: do a general reset
			// if time is bigger than duration: only this channel
			if (show.narration==null) module.reset(req, null, channel.id);
			var narration = show.narration[channel.id]

			narration.hasmaster = utils.findchannelbyname(channel.master,show.channels);
			narration.snap = narration.hasmaster && (channel.snap===true||channel.snap==='true')


			// Slave Channels: Sync Narration Settings with Master channel if there is one
			if (narration.hasmaster) {
				narration.master_narration = util._extend({},show.narration[narration.hasmaster.id]);
//				console.log("channel " + channel.name + " is slave")
//				console.log("Master Time: " + narration.master_narration.time + " Slave Time " + narration.time)
				if (narration.master_narration.time >= narration.time) 
					narration.time = narration.snap ? narration.master_narration.time : narration.time
				else {
//					console.log("Force Exit")
					deferred.resolve(false);
					return;
				}
		
			}
			// Master Channel: Reset time if over the limit
			else {
//				console.log("channel " + channel.name + " is master")
				if (narration.time > req.current.options.time * 1000) {
					module.reset(req,null,channel.id);
					if (!c.quiet) console.log("reset master: " + channel.name)
					
					// Force Reset Slaves.
					for (var _c in show.channels) if (show.channels.hasOwnProperty(_c)) {	
						if (show.channels[_c].master == channel.name) {
							if (!c.quiet) console.log("[narration] resetting slave channel " + show.channels[_c].name)
							module.reset(req, null, show.channels[_c].id, true);
						}
					}
				}
			}
		
			// Step 1: Interpolate Data: create .ipl in style
			module._interpolate(style,req.current.options.time * 1000, narration.time)
			// Store interpolated values in dimensions
			for (var t in target) if (target.hasOwnProperty(t)) {
				if (target[t].Target[2]==1) {
					var ret = []
					var log = []
					for (var s in style) if (style.hasOwnProperty(s)) {
						if (style[s].type==3 && style[s].key==t) 
							ret = [style[s].ipl[0],style[s].ipl[1]]
						if (style[s].type==2 && style[s].key=="Logic") 
							log = [style[s].ipl[0],style[s].ipl[1]]
					}
					if (narration.dimensions[t] != undefined) {
						narration.dimensions[t].importance 	= ret[0]
						narration.dimensions[t].tension		= ret[1]
						narration.dimensions[t].logic		= log[0]
						narration.dimensions[t].jumpcut		= log[1]
					}
				}

			}

			// Step 2: Create Physical Scores
			module._physicalscores(scores,style, clips)
		
			// Step 3: Choose Content Dimension and Keyword
			module._contentscores(scores, style, clips, content, narration, target)

			// Step 4: Summarize Scores
		
			var repetition, randomness, minscore;
			for (var s in style) if (style.hasOwnProperty(s)) {
				if (style[s].type==2 && style[s].key=="Selection") {
					repetition = style[s].ipl[0]
					randomness = style[s].ipl[1]
				}
				if (style[s].key=="Scoring" && style[s].type==1) 
					minscore = style[s].ipl[1]
			}
		
			var ordered_scores = [];
			for (var s in scores) 
			 	if (scores.hasOwnProperty(s)) {
					// rep_fac, will be multiplied with the score
					// (1 / ((10 * 0) + 1) * 1) = 1
					// (1 / ((10 * .25) + 1) * 0.75) = 0.21
					// (1 / ((10 * .5) + 1) * 0.5) = 0.08
					// (1 / ((10 * 1) + 1) * 0) = 0
					scores[s].rep_fac = narration.current ? (1 / ((narration.usage.clips[narration.current][s].count * repetition) + 1)) : 1
					scores[s].total = (scores[s].physical.__norm + (scores[s].content?scores[s].content.__norm:0)) * scores[s].rep_fac
					ordered_scores.push({clip:s,total:scores[s].total})
				}

			// Step 5: Sort by score, desc,
		
			ordered_scores = ordered_scores.sort(function(a,b){return b.total-a.total}).slice(
				0,
				Math.round((ordered_scores.length - 1) * randomness) + 1
			)
			// create a slice of a length from 1 to the size of score array (defined by the style
			// random setting)
			// Pick an element randomly
			var clipid  = ordered_scores[Math.floor(Math.random()*ordered_scores.length)].clip,
				match = scores[clipid],
				ret = {},
				clip = {};
			
			if (clipid == undefined || match == undefined || match.content == undefined) {
				return;
			}
			
			for (var _c in clips) if (clips.hasOwnProperty(_c) && clips[_c].id==clipid) {
				clip = clips[_c];
				break;
			}

			// Step 4: Select and update narration
			if (match.total > minscore && narration.usage.clips[narration.current]) {
			
//				console.log("------------------------")
//				console.log( clip.name)

			
				narration.tension 	+= narration.cursor ? module._distance(narration.cursor, match.content.cursor) : 0;	
				narration.usage.clips[narration.current][clipid].count++
				ret = {
					element : {
						element_id				: clipid,
						element_name			: clip.name,
						element_duration		: clip.parameter.duration, 
						element_data_checksum	: clip.file,
						element_type			: clip.media,
						is_new					: narration.isnew,
						reset					: narration.reset && narration.isnew,						
					},
					in							: parseFloat(narration.time),
					out							: parseFloat(narration.time)+parseFloat(clip.parameter.duration)-req.current.options.preroll
				}


			

				var _d = [],
					_t = [];
				
				for (var d in narration.dimensions) if (narration.dimensions.hasOwnProperty(d)) {
					_d.push(d)
					_t.push(narration.dimensions[d].tension)
				}
			
			
				narration.history.push(
					{
						cursor:{
							Position			: narration.cursor||false,
						},
						active_dimension		: narration.current,
						master_dimension		: narration.master,
						dimensions				: _d,
						thresholds				: _t,
						keyword					: narration.context.keyword, 
						tokeyword				: narration.tonode.to||narration.context.keyword, 
						tension_dimensions		: narration.tension,
						element_id				: clipid,
						element_in				: parseFloat(narration.time),
						element_name			: clip.name,
						element_duration		: parseFloat(clip.parameter.duration)-req.current.options.preroll,
						element_parameters  	: clip.parameter,
						element_score_physical 	: match.physical.__norm,
						element_score_tension 	: match.content.__norm,
						element_score_demerit 	: match.rep_fac,
						element_score 			: match.total,
						element_data_checksum 	: clip.parameter.hash,
						current_position 		: match.content.cursor
					}				
				)
//				console.log("History length: " + narration.history.length)
//				console.log("------------------------")
				narration.isnew 	= false;
				narration.reset 	= false;
				narration.cursor 	= match.content.cursor
				narration.time   	+= parseFloat(clip.parameter.duration)-req.current.options.preroll;		
			}
			// No Element found with a score higher than minimal score
			// Creating fake cursor, advancing time
			else {
				narration.tension_required = false;
				narration.cursor	= narration.tonode ? narration.tonode.topos : [0,0];
				narration.time   	+= c.emptygap;
			}

		 
			// Reset Narration in case there is no to node
			if (narration.tonode == null || narration.tonode.topos == null) {
				if (!c.quiet) console.log("[narration] Nothing found...")										
				narration.cursor = false
			}

			//console.log(match)
			utils.update(users, req).then(function(f){
				if (!f) deferred.resolve(false);
				else deferred.resolve(ret);
			})
		})
		return deferred.promise;
	};

	return module;
}

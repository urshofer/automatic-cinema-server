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
	var ZERO_TOLERANCE = 0.05;
	var _lookup_keyword_coord = [];	

	console.log(c.html?"<p>Narration Ready</p>":"- narration ready                                   -")

	
	module.reset = function(req, users, channel_id_only, force){
		if (channel_id_only==null) channel_id_only=false;
		if (force==null) force=false;		
		if (!c.quiet) console.log("[narration] reset " + force);
		
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
			var _t = Date.now();
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
			if (!c.quiet) console.log ("[narration] loading data: " + (Date.now() - _t) + " ms" );
			_t = Date.now();
			if (style) {
				module._interpolate(style,req.current.options.time * 1000, 0)
				var _reset_time       = show.narration[show.channels[i].id] && show.narration[show.channels[i].id].abs_time && !force ? show.narration[show.channels[i].id].abs_time : 0;
				var _master_narration = show.narration[show.channels[i].id] && show.narration[show.channels[i].id].master_narrations.length > 0 && !force ? show.narration[show.channels[i].id].master_narrations : [];				
				show.narration[show.channels[i].id] = {
					name: 		show.channels[i].name,
					time: 		0,
					abs_time: 	_reset_time, 
					master_narrations: _master_narration,
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
				if (!c.quiet) console.log("[narration] interpolation " + show.channels[i].name + ": " + (Date.now() - _t) + " ms" );
			
				// Target & Dimension Analysis
				// creating narration.dimensions array populated
				// with active dimensions in the target, target position
				// and importance and tension values defined in the style
				for (var t in target) if (target.hasOwnProperty(t)) {
					_t = Date.now();			

					if (target[t].Target[2]==1) {
						var ret = []
//						var log = []
						for (var s in style) if (style.hasOwnProperty(s)) {
							if (style[s].type==3 && style[s].key==t) 
								ret = [style[s].ipl[0],style[s].ipl[1]]
							/*if (style[s].type==2 && style[s].key=="Logic") 
								log = [style[s].ipl[0],style[s].ipl[1]]*/
						}
						
						show.narration[show.channels[i].id].dimensions[t] = {
							target: [parseFloat(target[t].Target[0]),parseFloat(target[t].Target[1])],
							importance	: Math.max((ret[0] - 0.5) * 2, 0),
							filter		: 1 - Math.min(ret[0] * 2, 1),
							tension		: ret[1],
							logic		: Math.abs(ret[1] * 2 - 1),
							jumpcut		: 1 - ret[1],
							count: 0
						}
					}
					if (!c.quiet) console.log("[narration] reset target " + show.channels[i].name + ": " + (Date.now() - _t) + " ms" );
					
					// Reset Node Counts
					_t = Date.now();			
					show.narration[show.channels[i].id].usage.nodes[t] = {};

					var _lookup_nodes = {};	
					for (var n in content[t].Nodes) if (content[t].Nodes.hasOwnProperty(n)) {
						show.narration[show.channels[i].id].usage.nodes[t][n] = 0;
						_lookup_nodes[content[t].Nodes[n][0]] == null ? 
							_lookup_nodes[content[t].Nodes[n][0]] = 1 :
							_lookup_nodes[content[t].Nodes[n][0]] ++;
						_lookup_nodes[content[t].Nodes[n][1]] == null ? 
							_lookup_nodes[content[t].Nodes[n][1]] = 1 :
							_lookup_nodes[content[t].Nodes[n][1]] ++;

					}
					

					
					if (!c.quiet) console.log("[narration] reset node count " + show.channels[i].name + ": " + (Date.now() - _t) + " ms" );
				
					// Reset Object Count and Coordinate Cache
					_t = Date.now();			
					show.narration[show.channels[i].id].usage.clips[t] = {};
					var _count = 0;

					// Create Lookup Tables
					var _lookup_element = {};
					var _lookup_keyword = {};	
					_lookup_keyword_coord[t] = false;
					for (var nn in content[t].Objects) if (content[t].Objects.hasOwnProperty(nn)) {
						if (_lookup_element[content[t].Objects[nn][0]] == null)
							_lookup_element[content[t].Objects[nn][0]] = [];
						if (_lookup_keyword[content[t].Objects[nn][0]] == null)
							_lookup_keyword[content[t].Objects[nn][0]] = {};
												
						if (content[t].Objects[nn][1][0] != 0.5 && content[t].Objects[nn][1][0] != 0.5 ) {
							_lookup_element[content[t].Objects[nn][0]].push(content[t].Objects[nn][1]);
							var _closest_key = module._findclosestkeywordindimension(content[t].Objects[nn][1],t,content);
							_closest_key.count = _lookup_nodes[_closest_key.value]
							_lookup_keyword[content[t].Objects[nn][0]][_closest_key.value] = _closest_key;
						}
					}

					
					for (var n = 0, len = clips.length; n < len; n++) {
						// Find all Coordinates of a clip within this dimension
						if (show.narration[show.channels[i].id].usage.clips[t][clips[n].id]==null) {
							show.narration[show.channels[i].id].usage.clips[t][clips[n].id] = {count:0, coords:[], closest_keys: {}}
						}
						
						// Copy coordinates to narration, based on the lookup table
						if (_lookup_element[clips[n].name] != null) {
							show.narration[show.channels[i].id].usage.clips[t][clips[n].id].coords = _lookup_element[clips[n].name];
							show.narration[show.channels[i].id].usage.clips[t][clips[n].id].closest_keys = _lookup_keyword[clips[n].name];							
							_count++;
						}
					}
					if (!c.quiet) console.log("[narration] reset object and coordinates " + show.channels[i].name + ": " + (Date.now() - _t) + " ms ("+ _count +" loops)" );
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
	module._distance = function(coord1, coord2, noroot) {
		noroot = typeof noroot !== 'undefined' ? noroot : false;
		if (coord1==undefined || coord2==undefined) return 0;
		if (noroot) {
			return (Math.pow(Math.abs(parseFloat(coord1[0])-parseFloat(coord2[0])),2)+Math.pow(Math.abs(parseFloat(coord1[1])-parseFloat(coord2[1])),2));					
		}
		else {
			return (Math.sqrt(Math.pow(Math.abs(parseFloat(coord1[0])-parseFloat(coord2[0])),2)+Math.pow(Math.abs(parseFloat(coord1[1])-parseFloat(coord2[1])),2)));					
		}
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
			if ((data[v].to==null)) {
				data[v].ipl = [
					data[v].from[0] / 100,
					data[v].from[1] / 100
				]
			}
			else {
				var x_in = parseFloat(data[v].from[0]),
					y_in = parseFloat(data[v].from[1]),
					x_out = parseFloat(data[v].to[0]),
					y_out = parseFloat(data[v].to[1])

				data[v].ipl = [
					(x_in + ((x_out - x_in) / duration * time)) / 100,
					(y_in + ((y_out - y_in) / duration * time)) / 100
				]
			}
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
	
	module._addkeywordindex = function(dim, keyword, content, initial) {
		var sC = initial
					?	[parseFloat(content[dim].Keywords[initial][1][0]), parseFloat(content[dim].Keywords[initial][1][1])]
					:	[50,50];
		var rMax = 5,
			rMin = 4,
			rRand = 0.75,
			emergency = 200,
			minDist = 1.5;

		var angle = Math.random() * (2 * Math.PI);
		var radius = (((rMax - rMin) / (50*50) * (sC[0]*sC[1])) + rMin) * (Math.random() * (1 - rRand) + rRand)

		var nC = [];
		var _neighbour = {};
		var _count = 0;
		do {
			nC[0] = Math.abs(sC[0] + Math.cos(angle) * radius);
			nC[1] = Math.abs(sC[1] + Math.sin(angle) * radius);
			angle += .1;		
			_count++;
			_neighbour = module._findclosestkeywordindimension(nC,dim,content);
		} while (_neighbour.dist < minDist && _count < emergency);

		console.log("_addkeywordindex", keyword, nC, sC);

		if (content[dim].Keywords == undefined) {
			content[dim].Keywords = [];
		}
		return content[dim].Keywords.push([keyword,nC]) - 1;
	}	

	
	// maxdim
	// Returns the key of the dimension in the narration object 
	// with the highest importance
	module._maxdim = function(narration) {
	    var max = ZERO_TOLERANCE;
		var m = false
		for (var s in narration.dimensions) if (narration.dimensions.hasOwnProperty(s)) {		
			var _check = narration.dimensions[s].importance > narration.dimensions[s].filter ?
			 				narration.dimensions[s].importance : 
							narration.dimensions[s].filter;
			if (_check >= max) {
				max = _check
				m = s
			}
		}	
		// Return max dim, or if no one is found, the last (fallback)
		return m ? m : s;
	}
	
	module._checknode = function (from, to, content, dim) {
		for (var n in content[dim].Nodes) if (content[dim].Nodes.hasOwnProperty(n)) {					
			var node = content[dim].Nodes[n];
			if ( (node[0] == from && node[1] == to) || (node[0] == to && node[1] == from)) {
				return true;
			}
		}
		return false;
	}
	
	// contentanalysis
	// returns an object with the closest keyword and all its nodes
	// relative to a coord [x,y] within a certain dimension
	// 
	// Returns a context object:
	// 
	// { keyword: 'Lonelyness-D',
	//   position: [ 55.09404388714734, 16.50641025641026 ],
	//   nodes: 
	//    [
	//     { ref: '13',
	//        dim: 'Thema',
	//        to: 'Lonelyness',
	//        topos: [x,y],
	//        arrow: 0,
	//        color: 'green',
	//        distance: 6.278551627971833 
	//      } 
	//    ] 
	// }
	// 
	module._contentanalysis = function(narration, content) {
		var dim = narration.current,
			coord = narration.cursor,
			ret = {keyword:'', position: false, nodes:[]},
			mindist = false;
			
		
		for (var k in content[dim].Keywords) if (content[dim].Keywords.hasOwnProperty(k)) {					
			var d = module._distance(content[dim].Keywords[k][1], coord);

			// Distance should be bigger than 0, otherwise it's the same keyword

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

		
		// Create Keyword Lookup based on integer reduction of float coords.
		// Integers are stored by x, y and x/y lookup tables
		if (!_lookup_keyword_coord[dim]) {
			_lookup_keyword_coord[dim] = {x:[],y:[],xy:[[]]};					
			for (var k in content[dim].Keywords) if (content[dim].Keywords.hasOwnProperty(k)) {					
				if (_lookup_keyword_coord[dim].x[parseInt(content[dim].Keywords[k][1][0])]==null) _lookup_keyword_coord[dim].x[parseInt(content[dim].Keywords[k][1][0])] = [];
				if (_lookup_keyword_coord[dim].y[parseInt(content[dim].Keywords[k][1][1])]==null) _lookup_keyword_coord[dim].y[parseInt(content[dim].Keywords[k][1][1])] = [];						
				if (_lookup_keyword_coord[dim].xy[parseInt(content[dim].Keywords[k][1][0])]==null) 
					_lookup_keyword_coord[dim].xy[parseInt(content[dim].Keywords[k][1][0])] = [];						
				if (_lookup_keyword_coord[dim].xy[parseInt(content[dim].Keywords[k][1][0])][parseInt(content[dim].Keywords[k][1][1])] ==null) 
					_lookup_keyword_coord[dim].xy[parseInt(content[dim].Keywords[k][1][0])][parseInt(content[dim].Keywords[k][1][1])] = [];						
				_lookup_keyword_coord[dim].x[parseInt(content[dim].Keywords[k][1][0])].push(content[dim].Keywords[k]);
				_lookup_keyword_coord[dim].y[parseInt(content[dim].Keywords[k][1][1])].push(content[dim].Keywords[k]);						
				_lookup_keyword_coord[dim].xy[parseInt(content[dim].Keywords[k][1][0])][parseInt(content[dim].Keywords[k][1][1])].push(content[dim].Keywords[k]);										
			}		
		}		
		
		// Select Closest Integer Keywords based upon lookup table
		// Running in squares around the start point, at least one full spin
		
		var _int_x =
			_max_x = 
			_min_x = parseInt(position[0]);
		var _int_y = 
			_max_y = 
			_min_y = parseInt(position[1]);
		
		var _closest = [];		
		var _direction = "right";
		var _dx = 1,
			_dy = 0;

		var _repeat = 0;
		while (_closest.length == 0 && _repeat < 100*100) {

//			console.log(_direction, _int_x, _int_y, _dx, _dy);
			if (_lookup_keyword_coord[dim].xy[_int_x] && _lookup_keyword_coord[dim].xy[_int_x][_int_y]) {
				_closest.push(_lookup_keyword_coord[dim].xy[_int_x][_int_y]);
//				console.log("Compare ", _lookup_keyword_coord[dim].y[_int_y][f][0], _lookup_keyword_coord[dim].x[_int_x][e][0], _closest.length);
				break;
			}				
			
			_int_x += _dx;
			_int_y += _dy;

			switch (_direction) {
				case "right":
					if (_int_x > _max_x) {
						_direction = "down";
						_max_x = _int_x;
						_dx = 0;
						_dy = 1;	
					}
				break;
				case "down":
					if (_int_y > _max_y) {
						_direction = "left";
						_max_y = _int_y;
						_dx = -1;
						_dy = 0;			
					}
				break;
				case "left":
					if (_int_x < _min_x) {
						_direction = "up";
						_min_x = _int_x;
						_dx = 0;
						_dy = -1;			
					}
				break;	
				case "up":
					if (_int_y < _min_y) {
						_direction = "right";
						_min_y = _int_y;
						_dx = 1;
						_dy = 0;
					}
				break;							
			}
			_repeat++;
		}
		
		var mindist = false,
			ret = false,
			key  = false,
			key2  = false;			
			var count = 0;
		for (var e in _closest) if (_closest.hasOwnProperty(e)) {					
			for (var f in _closest[e]) if (_closest[e].hasOwnProperty(f)) {			
				var d = module._distance(_closest[e][f][1], position, true);
				if (mindist===false || d < mindist) {
						mindist = d;
						key = e;
						key2 = f;						
					}
					count ++;
			}
		}		
		if (key) {
			ret = {};
			ret.value 	= _closest[key][key2][0]
			ret.objpos	= position
			ret.keypos	= _closest[key][key2][1]			
			ret.key		= key
			ret.dist	= module._distance(_closest[key][key2][1], position)
		}
		return ret
	}	
	
	
	module._findclosestkeywordsbyelement = function(element,content, narration) {
		var mindist = false,
			ret = false

		for (var dim in narration.dimensions) if (content.hasOwnProperty(dim) && narration.dimensions[dim].importance > ZERO_TOLERANCE) {					
			
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

		var switched = null;
		var threshold = content[narration.current].Keywords.length * narration.dimensions[narration.current].importance
		if (!c.quiet) console.log("[_choosedimension] threshold " + threshold + " / " + narration.dimensions[narration.current].count)
		if (narration.dimensions[narration.current].count > threshold && narration.dimensions[narration.current].importance > ZERO_TOLERANCE) {
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
			if (!c.quiet) console.log("[_choosedimension] Kept same dimension. Threshold too high ("+ threshold +" / " + narration.dimensions[narration.current].count +") or Importance (" + narration.dimensions[narration.current].importance + ") less than " + ZERO_TOLERANCE)
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
			if (!c.quiet) console.log("[_contentscores] emergency break: narration.dimensions length is zero")
			return false
		}
//		console.log("[narration] content score: tension " + narration.tension + " req. " + narration.tension_required);
		var importance = 1;
	    for (var s in style) if (style.hasOwnProperty(s)) 
			if (style[s].key=="Scoring" && style[s].type==1) 
				importance = style[s].ipl[0]
				
				
		// Switch Keyword & Dimension
		// if tension over threshold ore threshold is not set
		if (!c.quiet) {
			console.log("[_contentscores] tension " + narration.tension + " req. " + narration.tension_required);
		}
		if (narration.tension>narration.tension_required || narration.tension_required===false) {
			if (!c.quiet) {
				console.log("[_contentscores] resetting tension")
				console.log("                 tension: " + narration.tension)
				console.log("                 requird: " + narration.tension_required)
			}
			// Set current dimension, adjust cursor if required
			var switched = module._choosedimension(narration, content)
			// Choose context around active dimension and cursor
			narration.context = module._contentanalysis(narration, content)

			// This is true if there are no dimensions with positive importance
			if (switched === null) {
				if (!c.quiet) console.log("[_contentscores] emergency break: no dimension with positive importance")
				return;
			}

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
					if (!c.quiet) console.log("[_contentscores] switched to keyword " + narration.tonode.to)
			}
			// Always set tension to 0
			if (!c.quiet) {
				console.log("[_contentscores] switched to keyword " + narration.tonode.to || "empty")
				console.log("                 To Pos: " + narration.tonode.topos || "empty")			
				console.log("                 Cursor:  " + narration.cursor || "empty")						
			}
			narration.tension = 0;
		}

		
		// Choose best Element: 
		// Next to Current Cursor is associative top
		// Next to node.topos is logically top
		// By the way: The Maximum Distance between two points in a 100x100 Matrix
		// is sqrt(100*100*2) 141.4213562373095
		var distance = [];
		var base = (narration.tonode && narration.tonode.topos)
						? module._triangleheight(narration.context.position, narration.tonode.topos, narration.cursor)
						: false
		
//		for (var i = 0, len = clips.length; i < len; i++) {

		for (var _i in narration.usage.clips[narration.current]) if (narration.usage.clips[narration.current].hasOwnProperty(_i)) {

			// Find all Coordinates of a clip within this dimension

/*			if (narration.usage.clips[narration.current] == null || 
				narration.usage.clips[narration.current][clips[i].id] == undefined || 
				narration.usage.clips[narration.current][clips[i].id] == null) {
//				console.log(narration.current)
//				console.log(clips[i].id)				
//				console.log(narration.usage)								
				return;
			}*/


			var _d = [],
				i = narration.usage.clips[narration.current][_i];
				
			for (var n in i.coords) if (i.coords.hasOwnProperty(n)) {
				var d_a = module._distance(i.coords[n], narration.cursor);
				var d_b = 0
				if (narration.tonode.topos) {
					var h = (module._distance(i.coords[n], narration.tonode.topos)+module._distance(i.coords[n], base)-module._distance(base, narration.tonode.topos));
					var d_b = (d_a * Math.pow(h+1,3))
				}
				d_b *= narration.dimensions[narration.current].logic;
				
				_d.push({
					score : d_a + d_b,
					cursor: [parseFloat(i.coords[n][0]),parseFloat(i.coords[n][1])]
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
			if (_d[s]) {
	//			console.log("[narration] jump cut: choose item " + s)
				distance.push({
					clip  : i, 
					score : _d[s].score,
					cursor: _d[s].cursor
				})						
			}			
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

		for (var i = 0, len = clips.length; i < len; i++) {
			if (scores[clips[i].id]==null) scores[clips[i].id] = {};
			scores[clips[i].id].content = distance[i]
		}

	}

	// _filterscores
	// adding score[clipid].filter.__norm to the score array. Normalized values have
	// a range between 0 and 1.
	
	module._filterscores = function(scores, style, clips, content, narration, target) {
		if (Object.keys( narration.dimensions).length == 0) {
			return false
		}
		var importance = 1;
	    for (var s in style) if (style.hasOwnProperty(s)) 
			if (style[s].key=="Scoring" && style[s].type==1) {
				importance = style[s].ipl[0]
			}


		// Cycle through all active dimensions with a positive filter value
		var distance = [],
			maxscore = false,
			minscore = 0

		for (var dim in narration.dimensions) if (content.hasOwnProperty(dim)) {
			if (!c.quiet) {					
				console.log("[_filterscores]: ",dim,narration.dimensions[dim].filter)
			}		
			if (narration.dimensions[dim].filter > ZERO_TOLERANCE) {
				
				// Context of the current target position. Keyword is the string
//				narration.dimensions[dim].jumpcut
				
				// Get Reference from Previous Clip
				var prev =	false;
				var _t = [];
				var _maxcount = false;
				if (narration.history && narration.history.length > 0) {
					var prev = narration.history[narration.history.length - 1];

					for (var __t in narration.usage.clips[dim][prev.element_id].closest_keys) if (narration.usage.clips[dim][prev.element_id].closest_keys.hasOwnProperty(__t)) {								
						var _ck = narration.usage.clips[dim][prev.element_id].closest_keys[__t];
						if (_ck.count != null && _ck.count > 1) {
							_t.push({value:_ck.value,type:'ref', count: _ck.count})
							if (_maxcount==false||_ck.count>_maxcount) _maxcount=_ck.count;
						}
					}
				}
				_t.push({value:module._findclosestkeywordindimension(narration.dimensions[dim].target,dim,content).value,type:'target', count: 1});
				if (!_maxcount) _maxcount = 1;
				if (!c.quiet) {					
					console.log("[_filterscores]: compare to targets")
					console.log(_t)	
					console.log(_maxcount)						
				}	
				
				for (var _i in narration.usage.clips[dim]) if (narration.usage.clips[dim].hasOwnProperty(_i)) {			

					if (distance[_i] == null)	distance[_i] = {score: 0}
					
					// Get Target Similarities
					var _scorepart = 0;
					for (var __t in _t) if (_t.hasOwnProperty(__t)) {								
						if (narration.usage.clips[dim][_i].closest_keys[_t[__t].value]) {
//							var _d = (141.4213562373095 - narration.usage.clips[dim][_i].closest_keys[_t[__t].value].dist) / 141.4213562373095;
							var _d = 1;
//							_d = _d / 0.5 + ((2 - (2 / _maxcount * _t[__t].count)));
//							if (_t[__t].type=='ref')
//								_d = _d * (1 - (1 / _maxcount * _t[__t].count));							

							/* Apply Filter Factor */
							_scorepart += (_d * narration.dimensions[dim].filter * (_t[__t].type=='target' ? narration.dimensions[dim].jumpcut : narration.dimensions[dim].tension)) ;
//							_scorepart += _d / _t.length;
						}
					}
					distance[_i].score += _scorepart;
					if (maxscore==false||distance[_i].score>maxscore) maxscore=distance[_i].score;
				}
			}
		}

		// Push to Scores Array

		for (var i = 0, len = clips.length; i < len; i++) {
			if (scores[clips[i].id]==null) scores[clips[i].id] = {};
			if (distance[clips[i].id]==null) scores[clips[i].id].filter = {score: 0, __norm: 0}
			else {
				scores[clips[i].id].filter = distance[clips[i].id]
				scores[clips[i].id].filter.__norm = importance * ((distance[clips[i].id].score-minscore)/(maxscore-minscore))
//				scores[clips[i].id].filter.__norm = importance * (distance[clips[i].id].score/maxscore)
			}
			scores[clips[i].id].clip = i;
		}

	}


	module._physicalscores = function(scores,style, clips) {
		// Normalize
		var importance = 1;
	    for (var s in style) if (style.hasOwnProperty(s)) 
			if (style[s].key=="Scoring" && style[s].type==1) 
				importance = 1-style[s].ipl[0]
				
		// Get Reference from Previous Clip
		var prev =	false;
		if (narration.history && narration.history.length > 0) {
			var prev = narration.history[narration.history.length - 1];
		}
				
		for (var i = 0, len = clips.length; i < len; i++) {
			var max = 0;
			var tot = 0;
		    for (var p in clips[i].norm) if (clips[i].norm.hasOwnProperty(p)) {		
				var sc = false;
			    for (var s in style) if (style.hasOwnProperty(s)) {		
					if (style[s].key==p && style[s].type==4) {
						var imp_abs = 2 * (style[s].ipl[0] < 0.5 ? 0 : style[s].ipl[0] - 0.5);
						var imp_cnt = 2 * (0.5 - (style[s].ipl[0] > 0.5 ? 0 : style[s].ipl[0]));

						if (imp_abs > ZERO_TOLERANCE || imp_cnt > ZERO_TOLERANCE) {
//							console.log("Name",style[s].key,"Abs",imp_abs,"Rel",imp_cnt,"Orig",style[s].ipl[0])
							// Exception for continuity measuring if no history is present
							// Using an absolute value as start parameter, disabling continuity
							if (imp_cnt > 0 && !prev) {
								imp_abs = imp_cnt;
								imp_cnt = 0;
							}
							
							sc = ((1 - Math.abs(clips[i].norm[p] - style[s].ipl[1])) * imp_abs) +
								 (prev ? ((1 - Math.abs(clips[i].norm[p] - prev.norm[p])) * imp_cnt) : 0)
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
			var syncpoint = false;
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

			// Resolve Master Channel
			narration.hasmaster = utils.findchannelbyname(channel.master,show.channels);
			narration.snap = channel.snap===true||channel.snap==='true';


			// Slave Channels: Sync Narration Settings with Master channel if there is one
			if (narration.hasmaster) {
				if (narration.master_narrations != undefined && narration.master_narrations[0] != undefined) {
					// Snap: Sync time to next master point
					// If there is a master point in the past, clone it and delete it
					if (narration.master_narrations[0].time <= narration.abs_time) {
						
						var _next_point = narration.master_narrations.shift();
						syncpoint = true;
//						if (_next_point.reset)
//							module.reset(req, null, channel.id);							
						if (narration.snap) 
							narration.time = _next_point.in;
						for (var _m in _next_point.coords) if ( _next_point.coords.hasOwnProperty(_m)) {					
							var _c = _next_point.coords[_m];
							if (_c.dim != "Stereotypes") {
								narration.dimensions[_c.dim].target = _c.coords[0];
								if (!c.quiet) {
									console.log("[narration] slave " + channel.name + " compare " +_next_point.time + " with " + narration.abs_time)																		
									console.log("            slave " + channel.name + " is syncing dim " + _c.dim + " at " + _c.coords[0][0] + "/" + _c.coords[0][1])																		
									}
							}
							else {
								do {
									var item = content[_c.dim].Keywords[Math.floor(Math.random()*content[_c.dim].Keywords.length)];
									if (!c.quiet) {
										console.log(item);
										console.log("skip stereotypes. make random target: " + item[0])
									}
								} while (narration.dimensions[_c.dim].target == item[1]);
								narration.dimensions[_c.dim].target = item[1];								
							}
						}
					}
				}				
			}
			// Master Channel: Reset time if over the limit
//			else {
//				console.log("channel " + channel.name + " is master")

//			}
		
			// Step 1: Interpolate Data: create .ipl in style
			module._interpolate(style,req.current.options.time * 1000, narration.time)
			// Store interpolated values in dimensions
			for (var t in target) if (target.hasOwnProperty(t)) {
				if (target[t].Target[2]==1) {
					var ret = []
//					var log = []
					for (var s in style) if (style.hasOwnProperty(s)) {
						if (style[s].type==3 && style[s].key==t) 
							ret = [style[s].ipl[0],style[s].ipl[1]]
//						if (style[s].type==2 && style[s].key=="Logic") 
//							log = [style[s].ipl[0],style[s].ipl[1]]
					}
					if (narration.dimensions[t] != undefined) {
						narration.dimensions[t].importance 	= Math.max((ret[0] - 0.5) * 2, 0)
						narration.dimensions[t].filter	 	= 1 - Math.min(ret[0] * 2, 1)						
						narration.dimensions[t].tension		= ret[1]
						narration.dimensions[t].logic		= Math.abs(ret[1] * 2 - 1)
						narration.dimensions[t].jumpcut		= 1 - ret[1]
					}
				}

			}
			if (!c.quiet) console.log("[narration] interpolated finished")			

			// Step 2: Create Physical Scores
			module._physicalscores(scores,style, clips)
			if (!c.quiet) console.log("[narration] physicalscores finished")			
				
			
			// Step 3: Prepare Master Dimension
			narration.master  = module._maxdim(narration);
		
			
			if (narration.master === false) {
				if (!c.quiet) console.log("[narration] [_choosedimension] Init: " + narration.current)
			}
			// Initial Setup
			if (narration.current === false || narration.cursor === false) {
				narration.current = narration.master
				narration.cursor  = narration.dimensions[narration.current].target
				if (!c.quiet) console.log("[narration] [_choosedimension] Init: " + narration.current)
			}
			else if (Object.keys( narration.dimensions).length == 0) {
				if (!c.quiet) console.log("[narration] [_choosedimension] Error: no dimensions active")
			}
			else if (Object.keys( narration.dimensions).length == 0) {
				if (!c.quiet) console.log("[narration] [_choosedimension] Return " + narration.current + " (only dimension)")
			}
			
						
			// Step 3a: Choose Content Dimension and Keyword, add to content scores
			module._contentscores(scores, style, clips, content, narration, target)
			if (!c.quiet) console.log("[narration] contentscores finished")			
				
			// Step 3b: Add content scores for dimensions with positive filter value
			module._filterscores(scores, style, clips, content, narration, target)
			if (!c.quiet) console.log("[narration] filterscores finished")			
							
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
					scores[s].total = (scores[s].physical.__norm + (scores[s].content && !isNaN(scores[s].content) ?scores[s].content.__norm:0) + (scores[s].filter?scores[s].filter.__norm:0) ) * scores[s].rep_fac
					if (scores[s].total > 0)
						ordered_scores.push({clip:s,total:scores[s].total})
				}
			if (!c.quiet) console.log("[narration] summarized finished")		

			// Step 5: Sort by score, desc,
		
			ordered_scores = ordered_scores.sort(function(a,b){return b.total-a.total}).slice(
				0,
				Math.round((ordered_scores.length - 1) * randomness) + 1
			)
			
			if (ordered_scores[Math.floor(Math.random()*ordered_scores.length)] == undefined) {
				deferred.resolve(false);
				if (!c.quiet) {
					console.log("[narration] error: no scores found")							
					console.log(ordered_scores)
				}
				return;				
			}
			
			// create a slice of a length from 1 to the size of score array (defined by the style
			// random setting)
			// Pick an element randomly
			var clipid  = ordered_scores[Math.floor(Math.random()*ordered_scores.length)].clip,
				match = scores[clipid],
				ret = {},
				clip = {};
			
			if (clipid == undefined || match == undefined /*|| match.content == undefined*/) {
				deferred.resolve(false);
				if (!c.quiet) {
					console.log("[narration] error: no match found")							
					console.log("\n- - - - \n ordered_scores\n- - - -\n")							
					console.log(ordered_scores)
					console.log("\n- - - - \n match\n- - - -\n")												
					console.log(match)					
					console.log("\n- - - - \n scores\n- - - -\n")																	
					console.log(scores)
				}	
				return;
			}
			
			for (var _c in clips) if (clips.hasOwnProperty(_c) && clips[_c].id==clipid) {
				clip = clips[_c];
				break;
			}

			// Step 4: Select and update narration
			if (match.total > minscore) {

				if (narration.current) {
					var _narr_add = (narration.cursor && match.content) 
										?	module._distance(narration.cursor, match.content.cursor) == 0
											?	narration.dimensions[narration.current].importance
											:	module._distance(narration.cursor, match.content.cursor)
										: 	0;
					if (!c.quiet) {
						console.log("[narration] adding " + _narr_add + " to tension")											
					}
					narration.tension 	+= _narr_add;	
					narration.usage.clips[narration.current][clipid].count++
				}
				
				ret = {
					element : {
						element_id				: clipid,
						element_name			: clip.name,
						element_duration		: clip.parameter.duration, 
						element_data_checksum	: clip.file,
						element_type			: clip.media,
						is_new					: narration.reset && narration.isnew,
						reset					: narration.reset && narration.isnew,						
					},
					in							: parseFloat(narration.abs_time),
					out							: parseFloat(narration.abs_time)+parseFloat(clip.parameter.duration)-req.current.options.preroll,
					syncpoint					: syncpoint
				}
				
				if (!c.quiet) {
					console.log("[narration] ordering finished")	
					for (var d in narration.dimensions) if (narration.dimensions.hasOwnProperty(d)) {
						console.log("           ", d, Object.keys(narration.usage.clips[d][clipid].closest_keys));							
					}
				}
			

			
				// Debug Stuff - used by the Controller Interface to draw Timelines
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
						tokeyword				: narration.tonode ? narration.tonode.to : narration.context.keyword, 
						tension_dimensions		: narration.tension,
						element_id				: clipid,
						element_in				: parseFloat(narration.time),
						element_name			: clip.name,
						element_name			: clip.name,
						element_duration		: parseFloat(clip.parameter.duration)-req.current.options.preroll,
						element_parameters  	: clip.parameter,
						element_score_physical 	: match.physical.__norm,
						element_score_tension 	: match.content ? match.content.__norm : 0,
						element_score_demerit 	: match.rep_fac,
						element_score 			: match.total,
						element_data_checksum 	: clip.parameter.hash,
						current_position 		: match.content ? match.content.cursor : 0
					}				
				)
//				console.log("History length: " + narration.history.length)
//				console.log("------------------------")

				// Cloning Narration Data into Slave channels
				for (var _c in show.channels) if (show.channels.hasOwnProperty(_c)) {
					if (show.channels[_c].master == channel.name) {
						var _id = show.channels[_c].id;

						var _master_point = {time:(narration.abs_time), coords:[]}
						for (var dim in narration.usage.clips) if (narration.usage.clips.hasOwnProperty(dim)) {		
							_master_point.coords.push({dim: dim, coords: narration.usage.clips[dim][clipid].coords})
						}
						if (!c.quiet) {
							console.log("[narration] "+channel.name+" is pushing into " + show.channels[_c].name+" at "+ (narration.abs_time))										
						}
						show.narration[_id].master_narrations.push(_master_point);
					}
				}

				var _clip_duration  = parseFloat(clip.parameter.duration)-req.current.options.preroll;
				narration.isnew 	= false;
				narration.reset 	= false;
				narration.cursor 	= match.content ? match.content.cursor : false;
				narration.time   	+= _clip_duration;		
				narration.abs_time  += _clip_duration;
				

			}
			// No Element found with a score higher than minimal score
			// Creating fake cursor, advancing time
			else {
				narration.tension_required = false;
				narration.cursor	= narration.tonode ? narration.tonode.topos : [0,0];
				narration.time   	+= c.emptygap;
				narration.abs_time  += c.emptygap;
			}
			if (!c.quiet) console.log("[narration] match finished")							
		 
			// Reset Narration in case there is no to node
			if (narration.tonode == null || narration.tonode.topos == null) {
				if (!c.quiet) console.log("[narration] Nothing found...")										
				narration.cursor = false
			}
			//console.log(match)
			if (!c.quiet) console.log("[narration] updating")										
			utils.update(users, req).then(function(f){
				if (!c.quiet) console.log("[narration] finished")										
				if (!f) deferred.resolve(false);
				else deferred.resolve(ret);
			})
			
			if (narration.time > req.current.options.time * 1000 && !narration.hasmaster) {
				module.reset(req,null,channel.id);
				if (!c.quiet) console.log("[narration] timeline: " + channel.name)

				// Force Reset Slaves.
				for (var _c in show.channels) if (show.channels.hasOwnProperty(_c)) {	
					if (show.channels[_c].master == channel.name) {
						if (!c.quiet) console.log("[narration] resetting slave channel " + show.channels[_c].name)
						module.reset(req, null, show.channels[_c].id, true);
					}
				}
			}
			
		})
		return deferred.promise;
	};

	return module;
}

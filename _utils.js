/*

	AUTOMATIC CINEMA
	Helper Library 

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


var fs = require('fs'),
	q = require("q"),
	ffmpeg = require('fluent-ffmpeg'),
	path = require('path'),
	gm = require('gm'),
	formidable = require('formidable'),
	mime = require('mime'),
	exec = require('child_process').exec

	Array.prototype.sum = function () {
	    var total = 0;
	    var i = this.length; 

	    while (i--) {
	        total += this[i];
	    }

	    return total;
	}
	
	Array.prototype.clean = function(deleteValue) {
	  for (var i = 0; i < this.length; i++) {
	    if (this[i] == deleteValue) {         
	      this.splice(i, 1);
	      i--;
	    }
	  }
	  return this;
	};

	module.exports = function(c) {
		var module = {};
		ffmpeg.setFfmpegPath(c.ffmpeg_path)
		ffmpeg.setFfprobePath(c.ffprobe_path)
		
		// Check temporary dir:
		fs.exists(c.upload_dir, function (exists) {
		  if (!exists) {
	  		console.log("create temp dir")
  			fs.mkdirSync(c.upload_dir)
		  }
		});
		
		console.log("export ready")
		
		module.guid = (function() {
		  function s4() {
		    return Math.floor((1 + Math.random()) * 0x10000)
		               .toString(16)
		               .substring(1);
		  }
		  return function() {
		    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		           s4() + '-' + s4() + s4() + s4();
		  };
		})();
		
		module.error = function(code, message) {
			var e = {};
			e.Error = {};
			if (message == null) message = "";
			e.Error.code = code;
			switch (code) {
				case 11000:
					e.Error.Message = "User exists or wrong password...";
					break;
				case 100:
					e.Error.Message = "Wrong password...";
					break;
				case 101:
					e.Error.Message = "Unknown function call " + message;
					break;
				case 102:
					e.Error.Message = "Data missing " + message;
					break;
				case 103:
					e.Error.Message = "No active Show";
					break;
				case 104:
					e.Error.Message = "JSON Post Data missing";
					break;
				case 105:
					e.Error.Message = "No active Style";
					break;
				case 106:
					e.Error.Message = "No active Target";
					break;
				case 107:
					e.Error.Message = "No active Content";
					break;
				case 108:
					e.Error.Message = "No channel found";
					break;
				case 109:
					e.Error.Message = "No channel type found";
					break;
				case 110:
					e.Error.Message = "File Upload failed: " + message;
					break;
				case 111:
					e.Error.Message = "FFmpeg could not parse media file";
					break;
				case 112:
					e.Error.Message = "Could not generate Thumbnail";
					break;
				case 113:
					e.Error.Message = "Could not write into gridfs";
					break;
				case 114:
					e.Error.Message = "Could not get HSL info";
					break;
				case 115:
					e.Error.Message = "Empty Data. Please upload content first!";
					break;			
				case 116:
					e.Error.Message = "Channel Name already exists";
					break;			
				case 404:
					e.Error.Message = "File not found";
					break;															
				default:
					e.Error.Message = message || "Unknown error";

			}
			return e;
		}

		module.update = function(db, req) {
			var deferred = q.defer();
			db.updateById(req.id, req.current, {
				safe: true,
				multi: false
			}, function(e, result) {
				if (e) console.log("Store error")
				if (e || result == null) deferred.resolve(module.error(100, "Store Error"));
				else deferred.resolve(true)
			})
			return deferred.promise;
		}

		module.storefile = function(db, filename) {
			var deferred = q.defer();
			var gs = db.gridStore(path.basename(filename), 'w')
			gs.writeFile(filename, function(err, fileInfo) {
				if (err) {
					console.log("[gridstore] Store Error: " + path.basename(filename))					
					deferred.resolve(false)
				} else {
					deferred.resolve(path.basename(filename))
				}
			});
			return deferred.promise;
		}
		
		
		module.deletefile = function(db, filename) {
			var deferred = q.defer();
			var gs = db.gridStore(path.basename(filename), 'r')
			gs.unlink(function(err, fileInfo) {
				if (err) {
					console.log("[gridstore] Delete Error: " + path.basename(filename))
					deferred.resolve(false)
				} else {
					deferred.resolve(true)
				}
			});
			return deferred.promise;
		}

		module.ffprobe = function(file) {
			var deferred = q.defer();
			var command = ffmpeg();
			command.input(file).ffprobe(function(err, data) {
				if (err) deferred.resolve(false)
				else deferred.resolve(data)
			})
			return deferred.promise;
		}

		module.channelexists = function(name,channels) {
			for (var i = 0, len = channels.length; i < len; i++) {
				if (channels[i].name===name) return true;
			}
			return false;			
		}

		module.findchannelbyid = function(id,channels) {
			for (var i = 0, len = channels.length; i < len; i++) {
				if (channels[i].id===id) return channels[i];
			}
			return false;			
		}

		module.findchannelbyname = function(name,channels) {
			for (var i = 0, len = channels.length; i < len; i++) {
				if (channels[i].name===name) return channels[i];
			}
			return false;			
		}

		module.findchannel = function(originalname, channels, typ) {
			for (var i = 0, len = channels.length; i < len; i++) {
				for (var ii = 0, llen = channels[i].suffix.length; ii < llen; ii++) {
					var patt = new RegExp(channels[i].suffix[ii], "g");
					if (patt.test(originalname)) {
						switch (parseInt(channels[i].typ)) {
							case 0: // Video
								if (typ == "video") return channels[i].id;
								break;
							case 1: // Image
								if (typ == "image") return channels[i].id;
								break;
							case 4: // Text
								if (typ == "text") return channels[i].id;
								break;
							case 2: // Audio
								if (typ == "audio") return channels[i].id;
								break;
							case 3: // Audio
								if (typ == "audio") return channels[i].id;
								break;
						}
					}
				}
			}
			return false;
		}

		// Create Thumbnail, store file and thumbnail in griddb
		// Delete Thumbnail

		module.processimage = function(filepath, filename, db) {
			var deferred = q.defer();
			var thumb = filepath + '.thmb.jpg';
			gm(filepath)
				.resize(c.thumb_size)
				.noProfile()
				.options({
					imageMagick: true
				})
				.write(thumb, function(err) {
					
					// Error Scaling down to Thumbnail
					
					if (err) deferred.resolve(module.error(112))

					// HLS Analysis

					else exec(c.convert_path + ' ' + filepath + ' -colorspace rgb -scale 1x1 -format "{\\\"h\\\":%[fx:hue],\\\"s\\\":%[fx:saturation],\\\"l\\\":%[fx:lightness]}" info:', function(err, stdout, stderr) {
						if (err) deferred.resolve(module.error(114))
						else {
							var hls = JSON.parse(stdout.toString())
							module.storefile(db, filepath).then(function(data) {
								// Create Thumbs
								if (data)
								// Store Thumbs									  
									module.storefile(db, thumb).then(function(datat) {
										if (datat) {
											fs.unlinkSync(thumb);
											deferred.resolve({
												thumb: datat,
												file: data,
												hls: hls
											})
										}
										// Grid fs store error						
										else deferred.resolve(module.error(113))
									});
								// Grid fs store error						
								else deferred.resolve(module.error(113))
							})
						}
					})
				})
			return deferred.promise;
		}

		// Create Animated gif, store file and thumbnail in griddb
		// Delete Thumbnail
		
		module.processvideo = function(filepath, filename, db) {
			var deferred = q.defer();
			var thumbs = [];
			var thumbname =  c.upload_dir + "/" + path.basename(filepath, path.extname(filepath)) + '_t.gif';			
			
			var hls_average = function(paths) {
				var hlsdeferred = q.defer();
				for (var i = 0, len = paths.length; i < len; i++) {
					var _h = [];
					exec(c.convert_path + ' ' + c.upload_dir + "/" + paths[i] + ' -colorspace rgb -scale 1x1 -format "{\\\"h\\\":%[fx:hue],\\\"s\\\":%[fx:saturation],\\\"l\\\":%[fx:lightness]}" info:', function(err, stdout, stderr) {
						if (err) hlsdeferred.resolve(module.error(114))
						else {
							_h.push(JSON.parse(stdout.toString()));
						}
						if (_h.length == len) {
							__h = {h:0,l:0,s:0};
							for (var _i = 0, _len = _h.length; _i < len; _i++) {
								__h.h += _h[_i].h
								__h.l += _h[_i].l
								__h.s += _h[_i].s																
							}
							hlsdeferred.resolve({
								h:__h.h/_h.length,
								l:__h.l/_h.length,								
								s:__h.s/_h.length								
							})
						}
					})
				}
				return hlsdeferred.promise;				
			}
			var command = ffmpeg();			
			command.input(filepath)
			  .on('error', function(err) {
			    console.log(err);
			  })
			  .on('filenames', function(fn){
				thumbs = fn;				  			  	
			  })
			  .on('end', function() {

				// Average HLS here
				  hls_average(thumbs).then(function(hls){
					  if (hls.Error) deferred.resolve(hls);
					  else {
						  // Stick to animated gif here
						  ffstick = ffmpeg();			
						  ffstick
							  .input(filepath + "_%02d.png")
							  .size(c.thumb_size+'x?')
							  .noAudio()
							  .inputFPS(2)
							  .output(thumbname)
							  .on('error', function(err, stdout, stderr) {
								  deferred.resolve(module.error(112))
							  })
							  .on('end', function() {
	  							module.storefile(db, filepath).then(function(data) {
	  								// Create Thumbs
	  								if (data)
	  								// Store Thumbs									  
	  									module.storefile(db, thumbname).then(function(datat) {
	  										if (datat) {
	  											fs.unlinkSync(thumbname);
												for (var i = 0, len = thumbs.length; i < len; i++) fs.unlinkSync(c.upload_dir + "/" + thumbs[i]);
	  											deferred.resolve({
	  												thumb: datat,
	  												file: data,
	  												hls: hls
	  											})
	  										}
	  										// Grid fs store error						
	  										else deferred.resolve(module.error(113))
	  									});
	  								// Grid fs store error						
	  								else deferred.resolve(module.error(113))
	  							})
							  })
							  .run();

					  }
				  })
			  })
			  .autoPad()
			  .takeScreenshots({count: 10, size: c.thumb_size+'x?', filename: path.basename(filepath)+'_%0i.png'}, c.upload_dir)
			return deferred.promise;
		}

		module.checkfile = function(name, clips) {
			var count = 0;
			var origname = name;
			for (var i = 0, len = clips.length; i < len; i++)
				if (clips[i].name === name) {
					name = path.basename(origname, path.extname(origname)) + "_" + count + path.extname(origname);
					count++;
				}
			return name;
		}

		module.processfileupload = function(req, res, db, users) {
			// parse a file upload
			var deferred = q.defer();
			
			var form = new formidable.IncomingForm();
			form.uploadDir = c.upload_dir;
			form.keepExtensions = true;
			form.hash = "md5";
			form.maxFieldsSize = c.upload_limit;
			form.parse(req, function(err, fields, files) {
				if (req.current.shows[req.current.options.show].contents[req.current.options.content] == null) {
						deferred.resolve(module.error(107))
				}
				else if (err) {
					deferred.resolve(module.error(110, err.message));
				} else {
					files.url.name = module.checkfile(files.url.name, req.current.shows[req.current.options.show].clips);
					console.log("Checking upload for " + files.url.name)
					// Text Parsing: Sync Function
					if (mime.lookup(files.url.path) == 'text/plain') {
						console.log("TEXT")
						var media_type = "text"
						var content = fs.readFileSync(files.url.path).toString()
						var lines = content.split(/\r\n|\r|\n/);
						var channel_id = module.findchannel(files.url.name, req.current.shows[req.current.options.show].channels, media_type);
						if (channel_id === false) {
							fs.unlinkSync(files.url.path);
							deferred.resolve(module.error(108));
							return;
						}
						module.storefile(db, files.url.path).then(function(data) {
							fs.unlinkSync(files.url.path);
							if (data) {
								var newElement = {
									name: files.url.name,
									file: data,
									thumb: files.url.name,
									parameter: {
										duration: lines.length * c.textline_duration
									},
									channel: channel_id,
									hash: files.url.hash,
									media: media_type
								}
								req.current.shows[req.current.options.show].clips.push(newElement)
								module.update(users, req).then(function(data) {
									if (data.Error) deferred.resolve(data);
									else deferred.resolve({element:newElement,fields:fields});
								});

							}
							// Grid fs store error						
							else {
								deferred.resolve(module.error(113));
								return;
							}
						});
					}
					// Image Parsing: 
					else if (c.image_mime.indexOf(mime.lookup(files.url.path)) != -1) {
						console.log("IMAGE")
						var media_type = "image"
						var channel_id = module.findchannel(files.url.name, req.current.shows[req.current.options.show].channels, media_type);
						if (channel_id === false) {
							fs.unlinkSync(files.url.path);
							deferred.resolve(module.error(108));
							return;
						}
						module.processimage(files.url.path, files.url.name, db).then(function(data) {
							fs.unlinkSync(files.url.path);
							if (data.Error) {
								deferred.resolve(data);
								return;
							} else {
								var newElement = {
									name: files.url.name,
									file: data.file,
									thumb: data.thumb,
									parameter: {
										hue: data.hls.h,
										lightness: data.hls.l,
										saturation: data.hls.s,
										duration: c.image_duration
									},
									channel: channel_id,
									hash: files.url.hash,
									media: media_type
								}
								req.current.shows[req.current.options.show].clips.push(newElement)
								module.update(users, req).then(function(data) {
									if (data.Error) deferred.resolve(data);
									else deferred.resolve({element:newElement,fields:fields});
								});
								return;
							}
						})


					}
					// Media Parsing
					else module.ffprobe(files.url.path).then(function(data) {
						// Media File:
						if (data) {
							var video = false;
							for (var i = 0, len = data.streams.length; i < len; i++)
								if (data.streams[i].codec_type == 'video') video = true;
							var channel_id;
							var media_type =  video ? "video" : "audio"
							channel_id = module.findchannel(files.url.name, req.current.shows[req.current.options.show].channels, media_type);
							if (channel_id === false) {
								fs.unlinkSync(files.url.path);
								deferred.resolve(module.error(108));
								return;
							}

							if (video) {
								module.processvideo(files.url.path, files.url.name, db).then(function(param) {
									fs.unlinkSync(files.url.path);
									if (param.Error) {
										deferred.resolve(param);
										return;
									} else {
										var newElement = {
											name: files.url.name,
											file: param.file,
											thumb: param.thumb,
											parameter: {
												hue: param.hls.h,
												lightness: param.hls.l,
												saturation: param.hls.s,
												duration: data.format.duration * 1000
											},
											channel: channel_id,
											hash: files.url.hash,
											media: media_type
										}
										req.current.shows[req.current.options.show].clips.push(newElement)
										module.update(users, req).then(function(err) {
											if (err.Error) deferred.resolve(err);
											else deferred.resolve({element:newElement,fields:fields});											
										});
										return;
									}
								})
							}

							// Store Audio
							else {
								module.storefile(db, files.url.path).then(function(filename) {
									fs.unlinkSync(files.url.path);
									if (filename) {
										var newElement = {
											name: files.url.name,
											thumb: files.url.name,
											file: filename,
											parameter: {
												duration: data.format.duration * 1000
											},
											channel: channel_id,
											hash: files.url.hash,
											media: media_type
										}
										req.current.shows[req.current.options.show].clips.push(newElement)
										module.update(users, req).then(function(err) {
											if (err.Error) deferred.resolve(err);
											else deferred.resolve({element:newElement,fields:fields});											
										});

									}
									// Grid fs store error						
									else {
										deferred.resolve(module.error(113));
									}
								});
							}
						}
						// FFMPEG Error: Could not Work on Data...
						else {
							fs.unlinkSync(files.url.path);
							res.send(module.error(111));
						}
					});
				}
			});
			return deferred.promise;
		}

		module.createemptydata = function(action) {
			switch (action) {
				case "addcontent":
					return ({"Dimension":{id:module.guid(),Keywords:[["Keyword 1",[40,50]],["Keyword 2",[60,50]]],Objects:[],Nodes:[["Keyword 1","Keyword 2","1"]]}});
				case "addstyle":
					return([
						{key:"Scoring",type:1,legends:["Physical vs. Semantical","Minimum Score"],id:module.guid()},
						{key:"Logic",type:2,legends:["Path Accuracy","Jump Cuts"],id:module.guid()},
						{key:"Selection",type:2, legends:["Repetition","Randomness"],id:module.guid()}
					])
			}
		}

		// Add an Element into the active ontology data
		module.addontology = function(element,data,json) {
			var other_dims = {};
		    for (var dim in json.data) {
		        if (json.data.hasOwnProperty(dim)) {
					if (json.data[dim].Objects==null) json.data[dim].Objects = []
					json.data[dim].Objects.push([element.name,(dim==data.add_dim)?[data.add_x,data.add_y]:[50,50],element.thumb,(dim==data.add_dim)?false:true])
		        	if (dim!=data.add_dim) other_dims[dim] = json.data[dim].Keywords
				}
		    }						
			return other_dims;
		}
		
		module.annotate = function(data, dim, x, y, name, prev) {
			var upd = false;
		    for (var o in data[dim].Objects) if (data[dim].Objects.hasOwnProperty(o)) {
				if (data[dim].Objects[o][0]==name && data[dim].Objects[o][3]==true) {
					console.log("[upd] Annotating " + name + " in " + dim + " on " + x + "/" + y)
					data[dim].Objects[o][1] = [x,y]
					data[dim].Objects[o][3] = false
					upd = true;
				}
			}
			if (upd===false) {
				console.log("[add] Annotating " + name + " in " + dim + " on " + x + "/" + y)
				data[dim].Objects.push([name,[x,y],prev,false])
			}
		}
		
		module.normalize = function(clips) {
			var min = {},
				max = {};
			// Max Min
			for (var i = 0, len = clips.length; i < len; i++) {
				if (clips[i].id==null) clips[i].id = module.guid();
				if (min[clips[i].channel]==null) min[clips[i].channel] = {};
				if (max[clips[i].channel]==null) max[clips[i].channel] = {};				
			    for (var p in clips[i].parameter) if (clips[i].parameter.hasOwnProperty(p)) {
						if (min[clips[i].channel][p]==null || clips[i].parameter[p] < min[clips[i].channel][p])
							min[clips[i].channel][p] = clips[i].parameter[p];
						if (max[clips[i].channel][p]==null || clips[i].parameter[p] > max[clips[i].channel][p])							
							max[clips[i].channel][p] = clips[i].parameter[p];
				}
			}
			// Normalize
			for (var i = 0, len = clips.length; i < len; i++) {
				if (clips[i].norm==null) clips[i].norm = {};
			    for (var p in clips[i].parameter) if (clips[i].parameter.hasOwnProperty(p)) {
						if (min[clips[i].channel][p]==null || clips[i].parameter[p] < min[clips[i].channel][p])
							min[clips[i].channel][p] = clips[i].parameter[p];
						if (max[clips[i].channel][p]==null || clips[i].parameter[p] > max[clips[i].channel][p])							
							max[clips[i].channel][p] = clips[i].parameter[p];
							
					clips[i].norm[p] = (max[clips[i].channel][p] != min[clips[i].channel][p]) ?
						(clips[i].parameter[p] - min[clips[i].channel][p]) / (max[clips[i].channel][p] - min[clips[i].channel][p]) : 
							1;
							
				}
			}				
			console.log("[sync] Normalizing Elements:")
		    for (var c in max) if (max.hasOwnProperty(c)) {
				console.log("       - - - - - - - - - - - - - - - - - - - - - - - -")
				console.log("       Channel: " + c)
			    for (var p in max[c]) if (max[c].hasOwnProperty(p)) {
					console.log("       " + p + " max : " + max[c][p])
					console.log("       " + p + " min : " + min[c][p])					
			    }		    	
				console.log("       - - - - - - - - - - - - - - - - - - - - - - - -")
		    }
		}

		
		// async synchronize function
		module.synchronize = function(users, req, db){
			var deferred = q.defer();
		    process.nextTick(function(){

				// Prepare Sync Data
				// - params{channel:params...}
				// - dims{name:true,...}
				// ---------------------------------------------
				var show = req.current.shows[req.current.options.show];
				if (show == null) {q.resolve(false);return;}

				var params = {},
					dims   = {},
					dimkey = {},
					empty = module.createemptydata("addstyle"),
					emptykey = {},
					clipnames = {};
					
    			for (var d in empty) {
					if (empty[d].key) emptykey[empty[d].key]=empty[d].id;
				}					
					
				var currentcontent = show.contents[req.current.options.content];
				if (currentcontent == null) {q.resolve(false);return;}

				// Step one: Delete all Clips without a channel.
				//           Delete Files not in ontology				
				// ---------------------------------------------
				
				var count = 0;
				var clipsinontology = {};
    			for (var d in currentcontent.data) if (currentcontent.data.hasOwnProperty(d)) {
					if (d==currentcontent.data[d]._active) { 
						for (var o in currentcontent.data[d].Objects) if (currentcontent.data[d].Objects.hasOwnProperty(o)) {
							clipsinontology[currentcontent.data[d].Objects[o][0]] = true;
						}
					}
				}
    			
				for (var i = 0, len = show.clips.length; i < len; i++) {
					if (clipsinontology[show.clips[i].name]==null || module.findchannel(show.clips[i].name, show.channels, show.clips[i].media) != show.clips[i].channel) {
						if (show.clips[i].thumb) {
							module.deletefile(db, show.clips[i].thumb).then(function(e){});
						}
						if (show.clips[i].file) {
							module.deletefile(db, show.clips[i].file).then(function(e){});
						}	
						count ++;
						show.clips[i] = null;					
					}
			    }
				show.clips.clean(null);
				console.log((count>0?"\033[31m":"") + "[sync] Deleted " + count + " Files" + (count>0?"\033[0m":""))		

				module.normalize(show.clips)

				// Prepare:  Preload CLips and Dimensions
				// ---------------------------------------------

    			for (var d in currentcontent.data) if (currentcontent.data.hasOwnProperty(d)) {
					dims[d]=currentcontent.data[d].id;
					dimkey[currentcontent.data[d].id]=d;
				}
				console.log("[sync] Loaded Dimensions")	
    			for (var i = 0, len = show.clips.length; i < len; i++) {
					var c = module.findchannelbyid(show.clips[i].channel, show.channels);
					if (c) {
						params[c.name] = show.clips[i].parameter;
						clipnames[show.clips[i].name] = show.clips[i].thumb;
					}
				}					
				console.log("[sync] Loaded Clips and Parameters")		
				
				// Step two: Sync styles w. clips and content
				// ---------------------------------------------

				var count = 0;
    			for (var i = 0, len = show.styles.length; i < len; i++) {
					var currentstyle = show.styles[i]
					// Add Channel if not found
					if (currentstyle.data==null) currentstyle.data = {}

				    for (var ch in params) if (params.hasOwnProperty(ch)) {
						if (currentstyle.data[ch]==null) currentstyle.data[ch] = []
						// Cycle thru all Parameters in Style
						for (var p in params[ch]) if (params[ch].hasOwnProperty(p)) {
							// p: Parameter Name from Clips
							var f = false;
							for (var v in currentstyle.data[ch]) if (currentstyle.data[ch].hasOwnProperty(v)) {
								if (currentstyle.data[ch][v].key==p) 
									f = true;
								if (currentstyle.data[ch][v].type==4 && params[ch][currentstyle.data[ch][v].key]==null) 
									currentstyle.data[ch][v] = null;
							}
							currentstyle.data[ch].clean(null);
							if (!f) {
								currentstyle.data[ch].push({key:p,type:4,legends:["Weight","Value"],id:module.guid()})
								console.log("[sync] push parameter " + p)
							}
						}
					}
					// Sync Dimensions by key
					for (var d in dims)  {
						if (currentstyle.data[ch]==null) currentstyle.data[ch] = []
						var f = false;
						for (var v in currentstyle.data[ch]) if (currentstyle.data[ch].hasOwnProperty(v)) {
							if (currentstyle.data[ch][v].id==dims[d]) {
								f = true;
								currentstyle.data[ch][v].key = d;
							}
							if (currentstyle.data[ch][v].type==3 && dimkey[currentstyle.data[ch][v].id]==null) 
								currentstyle.data[ch][v] = null;
						}
						currentstyle.data[ch].clean(null);
						if (!f) {
							currentstyle.data[ch].push({key:d,type:3,legends:["Importance","Tension"], id:dims[d]})
							console.log("[sync] push dimension " + d)
						}
					}
					// Sync Basic Parameters (if not already added when creating)	
					var statics = [];

					for (var e in empty) if (empty.hasOwnProperty(e)) {
						if (currentstyle.data[ch]==null) currentstyle.data[ch] = []
						var f = false;
						for (var v in currentstyle.data[ch]) if (currentstyle.data[ch].hasOwnProperty(v)) {
							// if (currentstyle.data[ch][v]==null) continue;
							if (currentstyle.data[ch][v].key==empty[e].key) {
								f = true;
							}
							if (currentstyle.data[ch][v].type==2 && emptykey[currentstyle.data[ch][v].key]==null) 
								currentstyle.data[ch][v] = null;
						}
						currentstyle.data[ch].clean(null);
						if (!f) {
							currentstyle.data[ch].push(empty[e])
							console.log("[sync] push default " + empty[e].key)
						}						
					}
					
											
						
					// Clean out wrong elements
					for (var v in currentstyle.data[ch]) if (currentstyle.data[ch].hasOwnProperty(v)) {
						if (currentstyle.data[ch][v].type==null) 
							currentstyle.data[ch][v] = null;
					}											
					currentstyle.data[ch].clean(null);

					// Clean out Empty Channels
					for (var v in currentstyle.data) if (currentstyle.data.hasOwnProperty(v)) {
						if (module.channelexists(v,show.channels)===false) {
							console.log("---")
							delete currentstyle.data[v];
						}
					}

					count++
				}	



				console.log("[sync] Synced " + count + " Styles")							

				// Step three: Sync clips with contents
				// ---------------------------------------------
				var count = 0,
					del = 0,
					add = 0,
					keep = 0;
				
    			for (var i = 0, len = show.contents.length; i < len; i++) {
					var dims = show.contents[i].data		
					if (dims==null) dims = module.createemptydata("addcontent")									
					for (var d in dims) if (dims.hasOwnProperty(d)) {
						for (var c in clipnames) if (clipnames.hasOwnProperty(c)) {
							var f = false;
							if (dims[d].Objects == null) {
								dims[d].Objects = []
							}
							for (var o in dims[d].Objects) if (dims[d].Objects.hasOwnProperty(o)) {

								// Mark to add
								if (dims[d].Objects[o][0] == c) {
									f = true;
								}
								// Step One: Delete nonexisting Material
								if (clipnames[dims[d].Objects[o][0]]==null) {
									dims[d].Objects[o] = null;
									del++;
								}
							}	
							dims[d].Objects.clean(null);
							if (f===false) {
								dims[d].Objects.push([c,[50,50],clipnames[c],true])
								add++;
							}
							else {
								keep++;
							}
						}							
					}				
					count++
				}	
				console.log("[sync] Synced " + count + " Contents (Del: "+del+" Add: "+add+ " Keep: "+keep+ ")")


				// Step four: Sync content with targets
				// ---------------------------------------------
				var count = 0;
				var add = 0;
				var del = 0;
				var ren = 0;				
				for (var i = 0, len = show.targets.length; i < len; i++) {
					if (show.targets[i].data==null||show.targets[i].data==false)
						show.targets[i].data = {}
					var target = show.targets[i].data
					for (var d in currentcontent.data) if (currentcontent.data.hasOwnProperty(d)) {
						var f = false;
						for (var t in target) if (target.hasOwnProperty(t)) {
							if (target[t].key == null || dimkey[target[t].key]==null) {
								delete target[t];
								del++;
							}
							else if (target[t].key == currentcontent.data[d].id) {
								f = true;
								target[d] = target[t]
								if (t != d) delete target[t];
								ren++;
							}
						}
						if (f === false) {
							add++;
							target[d] = {
								key:currentcontent.data[d].id,
								Keywords:{},
								Target:[50,50,0]
							}
						}
						else target[d].Keywords = {}
						for (var o in currentcontent.data[d].Keywords) if (currentcontent.data[d].Keywords.hasOwnProperty(o)) {
							target[d].Keywords[currentcontent.data[d].Keywords[o][0]] = currentcontent.data[d].Keywords[o][1]
						}			
						// Delete obsolete
//						target.clean(null);
					}
					count++
				}
				console.log("[sync] Synced " + count + " Targets (Del: "+del+" Add: "+add+ " Keep: "+ren+ ")")
				
				narration.reset(req, null, null, true)
								
				module.update(users, req);
				deferred.resolve(true);
		    });
			return deferred.promise;
		};

		return module;

	}

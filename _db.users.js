/*

	AUTOMATIC CINEMA
	Database Access Functions

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

var fs = require('fs');

module.exports = function(c) {

	module = {};
	var filename = c.json_dir + "/_userdata_.json";
	var userdata;

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

	/* Store Data in File */
	module._storeData = function() {
		if (fs.existsSync(filename)) {
			fs.writeFileSync(filename, JSON.stringify(userdata), 'utf8');
			return true
		}
		return false;
	}

	/* Load Show Data from File */
	module._loadData = function() {
		if (fs.existsSync(filename)) {
			userdata = JSON.parse(fs.readFileSync(filename, 'utf8'));
		}
		else {
			userdata =  {};
			fs.writeFileSync(filename, JSON.stringify(userdata), 'utf8');
		}
	}

	
	module.findById = function(id, callback) {
//		console.log("checking: " + id);
//		console.log(userdata);
		var error = true;
		var results = null;
		if (userdata[id] != null) {
			error = false;
			results = userdata[id];
		}
		callback(error, results);
	}

	module.getByLogin = function(request, callback) {
		for (var _id in userdata) if (userdata.hasOwnProperty(_id)) {
			if (userdata[_id].username == request.username && userdata[_id].password == request.password) {
//				console.log("found: " + userdata[_id]._id);
				return callback(false, userdata[_id]);
			}
		}
		callback(true, null);		
	}

	module.insert = function(data, options, callback) { // options are only for compatibility with mongo
		var error = true;
		var results = null;
		_id = module.guid();
		userdata[_id] = {};
		userdata[_id] = data;		
		userdata[_id]._id = '"' + _id + '"';
		if (module._storeData()) {
			error = false;
			results = [data];
		}
		callback(error, results);		
	}

	module.updateById = function(id, data, options, callback) { // options are only for compatibility with mongo
		var error = true;
		var results = null;
		if (userdata[id]) {
			userdata[id] = data;
			userdata[id]._id = '"' + id + '"';
			error = false;
			results = data;
			module._storeData();
		}
		callback(error, results);		
	}

	module._loadData();
	
	return module;
}

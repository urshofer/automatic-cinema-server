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
	var storage = c.json_dir + "/gridstore/";
	if (!fs.existsSync(storage)) {
		fs.mkdirSync(storage);
	}
	

	module.gridStore = function(gridFileName, mode) {
		var _f = storage + gridFileName;
		return {
			open: function(callback) {
				var d = null
				var err = true
				if (fs.existsSync(_f)) {
					err = false;
					d = {filename: gridFileName, length: fs.statSync(_f)};
				}
				callback(err, d);
			},
			seek: function(pos, callback) {
				var err = true
				if (fs.existsSync(_f)) {
					err = false;
				}				
				callback(err);
			},
			read: function(callback) {
				var err = true
				var data = null;
				if (fs.existsSync(_f)) {
					err = false;
					data = fs.readFileSync(_f);
				}
				callback(err, data)
			},
			writeFile: function(filename, callback) {
		  	  var cbCalled = false;

		  	  var rd = fs.createReadStream(filename);
		  	  rd.on("error", function(err) {
		  	    done(err);
		  	  });
		  	  var wr = fs.createWriteStream(_f);
		  	  wr.on("error", function(err) {
		  	    done(err);
		  	  });
		  	  wr.on("close", function(ex) {
		  	    done();
		  	  });
		  	  rd.pipe(wr);

		  	  function done(err) {
		  	    if (!cbCalled) {
		  	      callback(err, _f);
		  	      cbCalled = true;
		  	    }
		  	  }
			},
			unlink: function(callback) {
				var err = true
				var fileInfo = null
				if (fs.existsSync(_f)) {
					fs.unlinkSync(_f)
					err = false;
					fileInfo = _f;
				}
				callback(err, fileInfo);				
			},
		}
	}

	
	return module;
}

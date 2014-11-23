/*

	AUTOMATIC CINEMA
	Server Configuration

*/

module.exports = {

		/* 
		You likely need to change these values. The variable __dirname refers always 
		to the directory in which the server scripts are stored.
		*/
	
		ffmpeg_path: 		__dirname + '/ffmpeg/osx/ffmpeg',
		ffprobe_path: 		__dirname + '/ffmpeg/osx/ffprobe',
		convert_path: 		"/usr/local/bin/convert",
		mongo: 				'mongodb://username:password@host:port/database',
		port: 				3000,
		
		
		/* 
		Set to true for more verbosity on the command line 
		*/
		
		quiet: 				true, 
		
		/* 
		Extended Parameters: Normally, parameters below here don't need to be changed 
		*/
		
		version: 			"acs_2_0",
		html_dir: 			__dirname + "/html/",
		image_duration: 	5000,
		textline_duration: 	3000,
		textlines_perscreen:2,
		upload_limit: 		1000 * 1024 * 1024,
		upload_dir: 		__dirname + '/tmp',
		image_mime: 		['image/jpeg', 
							 'image/png', 
							 'image/gif', 
							 'image/tiff'],
		thumb_size: 		100,
		channel_types: 		["Video","Bild","Musik","Sprache","Text"],
		fps: 				25,
		preroll: 			250,
		emptygap: 			2000
}

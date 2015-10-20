/*

	AUTOMATIC CINEMA
	Server Configuration

*/

module.exports = {

		/* 
		You likely need to change these values. The variable __dirname refers always 
		to the directory in which the server scripts are stored.
		*/
		ffmpeg_path: 		__dirname + '/bin/osx/ffmpeg/bin/',
		convert_path: 		'/opt/ImageMagick/bin/',

		/*
		safe_mode stores all changes instantly to disc. slower but safer (useful when building a database)
		if false, changes are stored automatically when the server is killed or shut down (useful for running systems)
		*/
		safe_mode: 			false,


		/* Communication Port. Leave it, otherwise you need to 
		   change it in the controller as well */
		port: 				3000,

		/* 
		Set to true for more verbosity on the command line 
		*/
		quiet: 				true, 

		/* 
		Set to true if the output of the server is html. used for the platypus binary package
		*/
		html: 				false, 
		
		/* 
		NLP: Natural Language Processing. EXPERIMENTAL !!!
		With NLP enabled, the Automatic Cinema Server does a segmentation of a string passed along with
		media data. If set to true, rename the package.json.nlp file to package.json and do an npm install
		afterwards. Currently only used in combination with HEKSLER */
		nlp: 				false,

		/* 
		Extended Parameters: Normally, parameters below here don't need to be changed 
		*/
		version: 			"acs_2_0",
		html_dir: 			__dirname + "/html/",
		json_dir: 			__dirname + "/json/",		
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
		preroll: 			100,
		emptygap: 			2000
}

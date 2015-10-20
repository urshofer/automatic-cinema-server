/*

	AUTOMATIC CINEMA
	Server Configuration

*/

module.exports = {
		
		/* 
		Make sure that ffmpeg and convert are in the path environment if the values are left blank
		*/
		ffmpeg_path: 		"",
		convert_path: 		"",	
	

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
		By default, "lib_name" points to the same directory where the server is stored
		*/
		version: 			"acs_2_0",
		html_dir: 			GLOBAL.lib_name + "/html/",
		json_dir: 			GLOBAL.lib_name + "/json/",		
		image_duration: 	5000,
		textline_duration: 	3000,
		textlines_perscreen:2,
		upload_limit: 		1000 * 1024 * 1024,
		upload_dir: 		GLOBAL.lib_name + '/tmp',
		image_mime: 		['image/jpeg', 
							 'image/png', 
							 'image/gif', 
							 'image/tiff'],
		thumb_size: 		100,
		channel_types: 		["Video","Bild","Musik","Sprache","Text"],
		fps: 				25,
		preroll: 			100,
		emptygap: 			2000,
	
		/*
		HTML Stuff
		*/
		htmlheader: "<html>\
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
			<div>",
		htmlfooter: "</div><div class='blur'></div>"
	
}

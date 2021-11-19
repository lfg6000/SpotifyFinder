# SpotifyFinder

### Website:
View this project live at:   https://www.SpotifyFinder.com

### Why (App Overview)
This website is a set of tools to help you organize/curate your Spotify playlists. 
  * Use this website to search for tracks, artists, albums <i><u>across</u></i> your Spotify playlists.
  * Use this website to find duplicates <i><u>across</u></i> playlists or in the same playlists and remove them.
  * Use this website to move or copy tracks to another playlist.

### Technical Details
* Server Side:
    * Python v3.8 - server side language
    * Flask (pkg v1.1.1) - web application framework
    * Flask-Session  (pkg v0.3.2) - server side sessions
    * Spotipy (pkg v2.16.1) - python wrapper around Spotify Web Client API
    * Flask-MySqlDb (pkg v0.2.0) - flask wrapper around db connections
    * MySql (server) - sql database (optional)
    * the pkg versions specified above match the pkg versions used by the actual website
* Client side:
    * Html - ui elements
    * Css - ui elements styling
    * Javascript - client side language 
    * Datatables - html tables
    * JQuery - wrapper for HTML DOM, CSS, Ajax functionality
    * Stack-Trace-Parser - utility to get the call stack when an error occurs
    * jquery.ScrolTo - utility to scroll a previously selected table row into view

### Values Specific to your Instance
The app needs a few values that are specific to your instance to run. You will need to edit 
sfCfg.json. This file is in the main project dir.  In sfCfg.json there are 9 config params. 
You must set the first 3 values, the fourth value is already set for you, and the last 5 values
are optionally. 

    "local_server_127_0_0_1":   
    {
        "sFlaskAppSecretKey":     "your flask secret key",
        "sSpotifyClientId":       "your spotify client id",
        "sSpotifyClientSecret":   "your spotify client secret",
        "sSpotifyRedirectUri":    "http://127.0.0.1:5000/oAuthCallback",
        "sMySqlHost":             "",  # optional
        "sMySqlUser":             "",  # optional
        "sMySqlPwRoot":           "",  # optional
        "sMySqlPwUser":           "",  # optional
        "sMySqlDbName":           ""   # optional
    }

You will need to go to the Spotify Developer website, https://developer.spotify.com/, 
to create a Spotify App which will provide you with a spotify client id and a spotify 
client secret, be sure to set the spotify redirect Uri to "http://127.0.0.1:5000/oAuthCallback"
in the spotify dev console for the spotify app you created.  Put the sSpotifyClientId
and sSpotifyClientSecret from the Spotify dev console into the above json dict. MySql
is optional so you can just leave the MySql values empty/blank.

### MySql is Optional
This website works fine w/o a MySql server/db.  If you leave sMySqlDbName, in sfCfg.json, empty you 
will not need to setup a MySql server/db. You will still need to import the Flask-MySqlDb package 
into your IDE.

### Running this Project from an IDE
  * download the project from github
  * open the project in your favorite IDE.  
  * import these python packages
    * Flask (pkg) - web application framework
    * Flask-Session  (pkg) - server side sessions
    * Spotipy (pkg) - python wrapper around Spotify Web Client API
    * Flask-MySqlDb (pkg) - flask wrapper around db connections
  * ensure the run/debug working dir is set to the project's home dir
  * edit sfCfg.json and set the first 3 values
  * use the IDE to start the project  
  * open a web browser to http://127.0.0.1:5000
  * the home page will appear  
  * hit "Login with Spotify" and a Spotify.com dialogue will ask you to login in


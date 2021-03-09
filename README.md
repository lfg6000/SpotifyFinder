# SpotifyFinder

### Website:
View this project live at:   https://slipstreamcode.pythonanywhere.com/

### Overview
SpotifyFinder is a web app that allows you to:
  * find duplicates (and remove them) in your Spotify playlists.
  * to see where a particular artist appears in your Spotify playlists.

### Technical Details
* Server Side:
    * Python - server side language
    * Flask (pkg) - web application framework
    * Flask (pkg) -Session - server side sessions
    * Spotipy (pkg) - python wrapper around Spotify Web Client API
    * MySql (server) - sql database (optional)
    * Flask-MySqlDb (pkg) - flask wrapper around db connections
* Client side:
    * Html - ui elements
    * Css - ui elements styling
    * Javascript - client side language 
    * Datatables - html tables
    * JQuery - wrapper for HTML DOM, CSS, Ajax functionality
    * Stack-Trace-Parser - utility to get the call stack when an error occurs
    * jquery.ScrolTo - utility to scroll a previously selected table row into view

### Values Specific to your Instance
The app needs a few values that are specific to your instance to run.  Put this json dictionary
into a file called helper.txt in the templates directory.

{

    "local_server_127_0_0_1":   
    {
        "sAppSecretKey":     "your flask secret key",
        "sClientId":         "your spotify client id",
        "sClientSecret":     "your spotify client secret",
        "sRedirectUri":      "http://127.0.0.1:5000/oAuthCallback",
        "sMySqlHost":        "localhost or leave blank",
        "sMySqlUser":        "your user name or leave blank",
        "sMySqlPwRoot":      "your root pw or leave blank",
        "sMySqlPwUser":      "your pw or leave blank",
        "sMySqlDbName":      "name of your db or leave blank"
    }     
}

You will need to go to the Spotify Developer website, https://developer.spotify.com/, 
to create a Spotify App which will provide you with a spotify client id and a spotify 
client secret, be sure to set the redirect Uri to "http://127.0.0.1:5000/oAuthCallback"
in the spotify dev console for the spotify app you created.  Put the values from the 
Spotify dev console into the above json dict. MySql is optional so you can just 
leave the MySql values empty/blank.

### MySql is Optional
To remove the need for a MySql server from this project just do not populate the above MySql 
config params and this website will work just fine and you will not need to setup a MySql 
server.  You will still need to import the Flask-MySqlDb package into your IDE.

### Running this Project from and IDE
  * download the project from github
  * open the project directory in your favorite IDE.  
  * import the above python packages marked with (pkg).
  * use the IDE to start the project  
  * open a web browser to http://127.0.0.1:5000
  * the home page will appear  
  * hit login w/ spotify and a Spotify.com dialogue will ask you to login in


@ECHO OFF

REM Runs py script

REM Start browser
ECHO ---------Starting Browser-----------
start "" http://127.0.0.1:5000

REM Start browser
ECHO ---------Starting Flask server app.py in WA_SpotifyFinder -----------
ECHO -- waSpotifyFinderApp.py print statements follow --
C:\Users\lfg70\.aa\LFG_Code\Python\WA_SpotifyFinder\venv39\Scripts\python C:\Users\lfg70\.aa\LFG_Code\Python\WA_SpotifyFinder\waSpotifyFinderApp.py

ECHO flask server app.py was started

PAUSE
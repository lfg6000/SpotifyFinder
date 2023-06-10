import sys
from flask import Flask, render_template, session, request, redirect, make_response
from flask_session import Session
from flask import jsonify
from flask_mysqldb import MySQL
import spotipy
import json, logging, datetime, pprint, os, time
import sfLoader, sfConst

# import gc
# from guppy import hpy

#----------------------------------------------------------------------------------------------
# - flask requries all .css and js files be in '/static/..'
# - favicon not showing up firefox/chrome: clear the cache in firefox/chrome
#----------------------------------------------------------------------------------------------

# SW Stack
# ---------------------------------------------------------------------------------------------
# python anywhere uses nginx and uwsgi so the sw stack looks like this:
# HTTP client ↔ Nginx ↔ uWSGI ↔ Flask ↔ Python app
# - https://medium.com/techtofreedom/backend-architecture-of-a-python-web-application-7af256ee004c
# - https://www.pythonanywhere.com/forums/topic/2776/
# - user agent (web browser client) initiates communication by making a request for a web page
# - A web server (nginx) is hw/sw that accepts requests via HTTP(s) protocol.
# - WSGI (Web Server Gateway Interface) a calling convention for web servers to forward requests
#   to web applications or frameworks written in the Python
# -

app = Flask(__name__)

oLoader = sfLoader.SpfLoader()
oLoader.loadCfgFile() # call this before setting 'SECRET_KEY'

# for firefox debugging use this to stop caching...so html files are alwasy reload...put this in a .css file used by all pages
#   <meta http-equiv="cache-control" content="no-cache, must-revalidate, post-check=0, pre-check=0" />
#   <meta http-equiv="cache-control" content="max-age=0" />
#   <meta http-equiv="expires" content="0" />
#   <meta http-equiv="expires" content="Tue, 01 Jan 1980 1:00:00 GMT" />
#   <meta http-equiv="pragma" content="no-cache" />

# flask config values are defined here:  https://flask.palletsprojects.com/en/1.1.x/config/

# allow break/continue in jinga for loops
app.jinja_env.add_extension('jinja2.ext.loopcontrols')

# needed for flash messages
# needed for encrypting session cookies
app.config['SECRET_KEY'] = oLoader.sFlaskAppSecretKey
# print('>>app.config[SECRET_KEY] = ', app.config['SECRET_KEY'])

# SESSION_COOKIE_HTTPONLY defaults to true, if true javascript cookies=document.cookie is not able to read the cookie(s)
# because the cookie(s) are only for server side usage and not accessible to the client
# the cookie(s) are sent with every subsequent requests after being issued by the server
# this app only has two cookies: session id (plus signer extension if used), and saved playlist selections
# chrome console.log reports cookies = 'session=dff678bd-d9fa-45f0-9bec-840f6e630533'  (it is not encrypted like i thought it would be)
# app.config['SESSION_COOKIE_HTTPONLY'] = False
# app.config['SESSION_COOKIE_NAME'] = 'session'  # defaults to 'session' for the cookie name

# when 'SESSION_USE_SIGNER' is true cookie = 'session=84491ef3-6de1-4108-898c-8ba5a4c24c46.2EPj5iiVZe6-CYgIKN22e9KpXQY'
# note the session cookie is appended  with .11chars-15chars (.2EPj5iiVZe6-CYgIKN22e9KpXQY)
# note the session id is still = '84491ef3-6de1-4108-898c-8ba5a4c24c46'
# app.config['SESSION_USE_SIGNER'] = True

# 3/16/23
#  - added a param to getDupsTrackList cmd and a few users were not getting the updated dupsTab.js which caused an error when clicking on the dups tab
#  - not sure why most users see the new dupsTab.js and a few were still using the old dupsTab.js,
#  - so we are trying this:
#  - we are now using ?v=xx, on each /static/js and /static/css file that we use so the browser will reload them if the ?v=xx changes
#  - ?v=xx is updated in _js_files.html and _css_files.html anytime we update a /static/js or /static/css file
# [obsolete] always resend the js/css files in case they were edited; so chrome does not reuse cached js/css files
# [obsolete] app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

app.config['TEMPLATES_AUTO_RELOAD'] = True

# disable get/post logging to console window
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# this prevents returned json dictionaries from being sorted by key
# we do not want return jsonify(session['mPlSelectedDict']) to be sorted
app.config['JSON_SORT_KEYS'] = False

# always True in debug mode...setting this False does nothing with debug=True
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# data store for session info
# SESSION_TYPE = 'filesystem' #'redis' # turns out redislite is not available for windows
app.config['SESSION_TYPE'] = 'filesystem'

# - after the files per session threshold (500 default) is hit the excess files are deleted
# - this app only creates 6 or so files per session so we never hit this limit so after the session is closed
#   the session files are left stranded on the disk
# - to deal with this we have a scheduled PA task (rmOldSessionFiles()) to remove stranded session files over x seconds old
# - rmOldSessionFileAge used in rmOldSessionFiles() must be greater than 'PERMANENT_SESSION_LIFETIME' to aviod deleting active session files
app.config['SESSION_FILE_THRESHOLD'] = 500 # defaults to 500

# if 'SESSION_PERMANENT'=False then the session is only closed when the browser is closed
# if 'SESSION_PERMANENT'=True then the session timeouts in 'PERMANENT_SESSION_LIFETIME' seconds even if the browser remains open
app.config['SESSION_PERMANENT'] = True  # defaults to true

# 1800 = .5 hr, 3600 = 1 hr, 5400 = 1.5 hrs, 7200 = 2 hrs, 9000 = 2.5 hrs, 10800 = 3 hrs, 21600 = 6hrs
# 14400 = 4 hrs, 28800 = 8hrs, 43200 = 12hrs, 57600 = 16hrs, 86400 = 24hrs
# - rmOldSessionFileAge used in rmOldSessionFiles() must be greater than 'PERMANENT_SESSION_LIFETIME' to aviod deleting active session files
app.config['PERMANENT_SESSION_LIFETIME'] = 43200

# firefox ok with this true and 127.0.0.1
# firefox not ok with this true and 192.168.2.10
# chrome not ok with this true and 127.0.0.1
# chrome not ok with this true and 192.168.2.10
app.config['SESSION_COOKIE_SECURE'] = False     # leave this set to false for now

# call from_object after all the config params are set
app.config.from_object(__name__)


# Flask app context notes
# - https://flask.palletsprojects.com/en/1.1.x/appcontext/
# - When a Flask application begins handling a request, it pushes an application context and a request context. When the request ends it
#   pops the request context then the application context. Typically, an application context will have the same lifetime as a request.

# Db Connection Notes
# - Flask_MySqlDb opens and closes db connections using a flask app context.
# - If a request (route) uses the db: a connection will be opened and when the request finishes the connection will automatically be closed.
# - venv/Lib/site-packages/flask_mysqldb/__init__.py  connection is called by your request code when updating the db
# - venv/Lib/site-packages/flask_mysqldb/__init__.py  teardown is called automatically when the request finishes to close the connection

# using a MySql db is optional
# if the sMySqlDbName is empty then do not use the db
if (oLoader.sMySqlDbName != ''):
  app.config['MYSQL_HOST'] = oLoader.sMySqlHost
  app.config['MYSQL_USER'] = oLoader.sMySqlUser
  app.config['MYSQL_PASSWORD'] = oLoader.sMySqlPwRoot
  app.config['MYSQL_DB'] = oLoader.sMySqlDbName
  mysql = MySQL(app)

# init the server side session handler
Session(app)

#----------------------------------------------------------------------------------------------
# flask session file clean up
# - PA: flask-apscheduler can not be used on pythonanywhere so we are using a scheduled tasks instead to delete flask session files
# - PA: we just schedule the rmOldSessionFiles.py script to run periodically
# - Local: we manually run rmOldSessionFiles.py from the pycharm terminal
#----------------------------------------------------------------------------------------------


#----------------------------------------------------------------------------------------------
# from html you can print a msg in the pycharm console
# in html do this: {{ mdebug("in for loop = " + n|string) }}
# @app.context_processor
# def utility_functions():
#     def print_in_console(message):
#         print(str(message))
#     return dict(mdebug=print_in_console)

#----------------------------------------------------------------------------------------------
# @app.before_first_request
# def before_1st_rq():
#     print('>>---- start before_1st_rq  ----' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

#----------------------------------------------------------------------------------------------
# @app.before_request
# def before_request():
#   if request.method == 'POST':
#     rqJson = request.get_json()
#     if rqJson is not None:
#       key = next(iter(rqJson))
#       print(f" before rq: {request.method}, {request.endpoint}, {request.url}, {key} ")
#   else:
#     print(f" before rq: {request.method}, {request.endpoint}, {request.url} ")

# ----------------------------------------------------------------------------------------------
# @app.after_request
# def add_header(response):
#     print(f"after rq: {response.headers}")
#     return response

#----------------------------------------------------------------------------------------------
def getCookie(cookieName):
    # cookie = request.headers.get('Cookie')
    cookie = request.cookies.get(cookieName)
    if cookie is None:
      return 'not set'
    else:
      return cookie

#----------------------------------------------------------------------------------------------
def cookieDump(caller, cookieName):
    print('>>cookie,  ' + caller + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + ',  ' + cookieName + ' = ' + getCookie(cookieName))

#----------------------------------------------------------------------------------------------
@app.route('/', methods=['get', 'post'])
def home():
  # hdrs = dict(request.headers)  # use this to view request msg header
  # cookieDump('home', 'session')
  # cookieDump('home', 'plDefault')
  return render_template("home.html")

# #----------------------------------------------------------------------------------------------
@app.route("/SpotifyLogin")
def SpotifyLogin():
  # cookieDump('SpotifyLogin', 'session')
  # cookieDump('SpotifyLogin', 'plDefault')
  try:
    authUrl = oLoader.oAuthLogin()
    # raise Exception('throwing app.route err in SpotifyLogin()')
    return redirect(authUrl)
  except Exception:
    exTyp, exObj, exTrace = sys.exc_info()
    es = f"errSpotifyLogin():{exTrace.tb_lineno},  typ:{str(exTyp)},  obj:{str(exObj)}"
    retVal = [sfConst.errSpotifyLogin, oLoader.getDateTm(), 'exception in SpotifyLogin()', 'login issues', es, 'redirect failed?']
    pprint.pprint(retVal)
    return "401- SpotifyFinder: Spotify Login Failed.  Try again."

#----------------------------------------------------------------------------------------------
@app.route("/oAuthCallback")
def oAuthCallback():
  # cookieDump('oAuthCallback', 'session')
  # cookieDump('oAuthCallback', 'plDefault')
  try:
    oLoader.oAuthCallback()
    oLoader.initLoader()
    # raise Exception('throwing app.route err in oAuthCallback()')
    return redirect("Tabs")
  except Exception:
    exTyp, exObj, exTrace = sys.exc_info()
    es = f"oAuthCallback():{exTrace.tb_lineno},  typ:{str(exTyp)},  obj:{str(exObj)}"
    retVal = [sfConst.errAuthCallback, oLoader.getDateTm(), 'exception in oAuthCallback()', 'login issues', es, 'redirect failed?']
    pprint.pprint(retVal)
    return "401 - SpotifyFinder: Spotify Login Failed. Try again."

#----------------------------------------------------------------------------------------------
@app.route("/Tabs", methods=['get', 'post'])
def Tabs():
  # cookieDump('Tabs', 'session')
  # cookieDump('Tabs', 'plDefault')

  # if this throws than the session has expired, the user will be sent to the home page
  # normal scenario - spotifyfinder.com/tabs page is open and the session expires so user gets an alert box saying session expired
  #                   and pressess ok and is sent to spotifyfinder.com
  # goofy  scenario - usr presses a spotifyfinder.com/tab shortcut and the page is not open or is expired....users sees the retval
  #                   strings as plain txt.  shortcuts should always be www.spotifyfinder.com
  try:
    # when a user visits this site a new session obj is created and the session['mUserId'] value will initially be ''
    # the session object is deleted when a session timeout occurs, after a timeout this line will throw because the session obj does not exist
    id = session['mUserId']
  except Exception:
    retVal = [sfConst.errSessionTimeOut, oLoader.getDateTm(), 'Tabs()', 'Your session has expired.', 'To restart your session goto:', 'www.SpotifyFinder.com', '']
    return jsonify({ 'errRsp': retVal }) # errSessionTimeOut = -742

  if request.method == 'POST':
    rqJson = request.get_json()
    if rqJson is not None:
      key = next(iter(rqJson))

      # gc.collect()
      try:
        if (key == 'playTracks'):
          # experimental code for a potential play btn feature
          # print('>>/Tabs playTrack()')
          trackUris = rqJson['trackUris']
          retVal = oLoader.playTracks(trackUris);
          # if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
          #   oLoader.updateDbVisitCnt(mysql, 'Help')
          return jsonify({ 'errRsp': retVal })

        if (key == 'runSearch'):
          # print('>>/Tabs runSearch()')
          ckTrackName = rqJson['ckTrackName']
          ckArtistName = rqJson['ckArtistName']
          ckAlbumName = rqJson['ckAlbumName']
          ckPlaylistName = rqJson['ckPlaylistName']
          ckDurationHms = rqJson['ckDurationHms']
          ckTrackId = rqJson['ckTrackId']
          searchText = rqJson['searchText']
          retVal = oLoader.runSearch(searchText, ckTrackName, ckArtistName, ckAlbumName, ckPlaylistName, ckDurationHms, ckTrackId)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Search')
          return jsonify({ 'errRsp': retVal })

        if (key == 'getSearchTrackList'):
          # print('>>/Tabs getNameSearchTrackList()')
          retVal, searchTrackList, numSearchMatches, plSelectedDict, numTracksInSelectedPl = oLoader.getSearchTrackList()
          return jsonify({ 'errRsp': retVal, 'searchTrackList': searchTrackList, 'numSearchMatches': numSearchMatches, 'plSelectedDict': plSelectedDict, 'numTracksInSelectedPl': numTracksInSelectedPl })

        if (key == 'clearSearchTrackList'):
          # print('>>/Tabs clearSearchTrackList()')
          retVal = oLoader.clearSearchTrackList()
          return jsonify({ 'errRsp': retVal })

        if (key == 'findDups'):
          modePlaylist = rqJson['modePlaylist']
          modeSearch = rqJson['modeSearch']
          durTimeDiff = rqJson['durTimeDiff']
          # print('>>/Tabs findDups() - modePlaylist = ' + modePlaylist + ', modeSearch = ' + modeSearch + ', durTimeDiff = ' + durTimeDiff)
          retVal = oLoader.findDups(modePlaylist, modeSearch, durTimeDiff)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Dups')
          return jsonify({ 'errRsp': retVal })

        if (key == 'getDupsTrackList'):
          modePlaylist = rqJson['modePlayList']
          modeSearch = rqJson['modeSearch']
          durTimeDiff = rqJson['durTimeDiff']
          # print('>>/Tabs getDupsTrackList()')
          retVal, dupsTrackList, numDupsMatch, dupsClrList = oLoader.getDupsTrackList(modePlaylist, modeSearch, durTimeDiff)
          return jsonify({ 'errRsp': retVal, 'dupsTrackList': dupsTrackList, 'numDupsMatch': numDupsMatch, 'dupsClrList': dupsClrList})

        if (key == 'loadArtistDict'):
          # print('>>/Tabs loadArtistDict()')
          retVal = oLoader.loadArtistDict()
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Art')
          return jsonify({ 'errRsp': retVal})

        if (key == 'getArtistDict'):
          # print('>>/Tabs getArtistDict()')
          retVal, artistDict, plSelectedDict = oLoader.getArtistDict()
          return jsonify({ 'errRsp': retVal, 'artistDict': artistDict, 'plSelectedDict': plSelectedDict})

        if (key == 'loadArtistTrackList'):
          artistId = rqJson['artistId']
          # print('>>/Tabs loadArtistTrackList() - artistId = ' + artistId)
          retVal = oLoader.loadArtistTrackList(artistId)
          return jsonify({ 'errRsp': retVal })

        if (key == 'getArtistTrackList'):
          # print('>>/Tabs getArtistTrackList()')
          retVal, artistTrackList = oLoader.getArtistTrackList()
          return jsonify({ 'errRsp': retVal, 'artistTrackList': artistTrackList})

        if (key == 'loadPlTracks1x'):
          # print('>>/Tabs loadPlTracks1x()')
          plId = rqJson['plId']
          retVal, loadedPlIds = oLoader.loadPlTracks1x(plId)
          return jsonify({ 'errRsp': retVal, 'loadedPlIds': loadedPlIds})

        if (key == 'incTrackCnt'):
          # print('>>/Tabs incTrackCnt()')
          if (oLoader.sMySqlDbName != ''):
            oLoader.updateDbVisitCnt(mysql, 'Tracks')
          retVal = [sfConst.errNone]
          return jsonify({ 'errRsp': retVal})

        if (key == 'getPlSelectedDict'):
          # print('>>/Tabs getPlSelectedDict')
          retVal, plSelectedDict = oLoader.getPlSelectedDict()
          return jsonify({ 'errRsp': retVal, 'plSelectedDict': plSelectedDict })

        if (key == 'getPlSelectedDictNotLoaded'):
          # print('>>/Tabs getPlSelectedDictNotLoaded')
          retVal, plSelectedDictNotLoaded = oLoader.getPlSelectedDictNotLoaded()
          return jsonify({ 'errRsp': retVal, 'plSelectedDictNotLoaded': plSelectedDictNotLoaded })

        if (key == 'getTrackList'):
          plId = rqJson['plId']
          # print('>>/Tabs getTrackList() - plId = ' + plId)
          retVal, trackList, duration = oLoader.getTrackList(plId)
          return jsonify({ 'errRsp': retVal, 'trackList': trackList, 'plDuration': duration})

        if (key == 'setPlSelectedDict'):
          # print('>>/Tabs setPlSelectedDict()')
          newPlSelectedDict = rqJson['newPlSelectedDict']
          retVal = oLoader.setPlSelectedDict(newPlSelectedDict)
          return jsonify({ 'errRsp': retVal })

        if (key == 'loadSpotifyInfo'):
          # print('>>/Tabs loadSpotifyInfo')
          winWidth = rqJson['winWidth']
          winHeight = rqJson['winHeight']
          if 'X-Real-IP' in request.headers:  # 'X-Real-IP' tag is a pyAny specific tag
            ip = request.headers['X-Real-IP']
          else:
            ip = request.remote_addr
          retVal, userId, userName, sid = oLoader.loadSpotifyInfo(winWidth, winHeight, ip)
          return jsonify({ 'errRsp': retVal, 'userId': userId, 'userName': userName, 'cookie': getCookie('session'), 'sid': sid})

        if (key == 'loadPlDictBatch'):
          idx = rqJson['idx']
          retVal, nPlRxd = oLoader.loadPlDictBatch(idx)
          # print('>>/Tabs loadPlDictBatch() idx = ' + str(idx) + ', nPlRxd = ' + str(nPlRxd))
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '') and (nPlRxd < 50)):
            oLoader.updateDbUniqueSpotifyInfo(mysql)
          return jsonify({ 'errRsp': retVal, 'nPlRxd': nPlRxd })

        if (key == 'getPlDict'):
          # print('>>/Tabs getPlDict')
          retVal, plDict, nPlaylists, nTracks, userList = oLoader.getPlDict()
          return jsonify({ 'errRsp': retVal, 'plDict': plDict , 'NPlaylists': nPlaylists, 'NTracks': nTracks, 'userList': userList })

        if (key == 'rmTracksByPos'):  # uses both track id and track position
          # print('>>/Tabs rmTracksByPos()')
          rmTrackList = rqJson['rmTrackList']
          # pprint.pprint(rmTracksList)  # pprint sorts on key
          retVal = oLoader.rmTracksByPos(rmTrackList)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Rm')
          return jsonify({ 'errRsp': retVal })

        if (key == 'rmTracksById'): # uses track id
          # print('>>/Tabs rmTracksById()')
          plId = rqJson['plId']
          rmTrackList = rqJson['rmTrackList']
          reload = rqJson['reload']
          # pprint.pprint(rmTracksList)  # pprint sorts on key
          retVal = oLoader.rmTracksById(plId, rmTrackList, reload)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Rm')
          return jsonify({ 'errRsp': retVal })

        if (key == 'mvcpTracks'):
          # print('>>/Tabs mvcpTracks()')
          destPlId = rqJson['destPlId']
          trackList = rqJson['trackList']
          type = rqJson['type']
          # pprint.pprint(destPlId)
          # pprint.pprint(trackList)  # pprint sorts on key
          retVal = oLoader.mvcpTracks(destPlId, trackList)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, type)
          return jsonify({ 'errRsp': retVal })

        if (key == 'createPlaylist'):
          # print('>>/Tabs createPlaylist()')
          newPlNm = rqJson['newPlNm']
          createUriTrackList = rqJson['createUriTrackList']
          retVal = oLoader.createPlaylist(newPlNm, createUriTrackList)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Create')
          return jsonify({ 'errRsp': retVal })

        if (key == 'deletePlaylist'):
          print('>>/Tabs deletePlaylist()')
          plNm = rqJson['plNm']
          plId = rqJson['plId']
          retVal = oLoader.deletePlaylist(plNm, plId)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'DelPl')
          return jsonify({ 'errRsp': retVal })

        if (key == 'getErrLog'):
          # print('>>/Tabs getErrLog()')
          retVal, errLog = oLoader.getErrLog()
          return jsonify({ 'errRsp': retVal, 'errLog': errLog })

        if (key == 'getInfoHtml'):
          # print('>>/Tabs getInfoHtml()')
          fnRq = rqJson['infoRq']
          retVal, htmlStr = oLoader.getInfoHtml(fnRq);
          # jsonStr = json.dumps(htmlStr)
          if ((retVal[0] == 1) and (oLoader.sMySqlDbName != '')):
            oLoader.updateDbVisitCnt(mysql, 'Help')
          return jsonify({ 'errRsp': retVal, 'htmlInfo': htmlStr })

        # - this is the error in the logs when a route return nothing....
        #   File "C:\Users\lfg70\.aa\LFG_Code\Python\WA_SpotifyFinder\venv\Lib\site-packages\flask\app.py", line 2097, in make_response
        #     raise TypeError(
        # TypeError: The view function did not return a valid response. The function either returned None or ended without a return statement.

        # we should not ever get here...the key from a post cmd should always recognized
        if (key is None):
          key = 'unknown post cmd: key = None'
        retVal = [sfConst.errUnknownPostCmd, oLoader.getDateTm(), '@app.route Tabs post', 'Post Cmd not recognized key = ', str(key), ' ', ' ']
        oLoader.addErrLogEntry(retVal)
        # print(gc.collect())
        return jsonify({ 'errRsp': retVal })  # always return something
      except Exception:
        # added a param to getDupsTrackList cmd and a few users were not getting the updated dupsTab.js which caused an error when clicking on the dups tab
        # not sure why most users see the new dupsTab.js and a few were still using the old dupsTab.js
        # 3/16/23 we are now using ?v=xx, on each /static/js and /static/css file that we use so the browser will reload them
        # 3/16/23 ?v=xx is updated in _js_files.html and _css_files.html anytime we update a /static/js or /static/css file
        exTyp, exObj, exTrace = sys.exc_info()
        es = f"Tabs():{exTrace.tb_lineno},  typ:{str(exTyp)},  obj:{str(exObj)}"
        retVal = [sfConst.errRmJavaScriptSyncErr, oLoader.getDateTm(), 'Tabs()', 'Client broswers javascript is out of sync with server.', es, 'You may need to clear your browsers cache.']
        oLoader.addErrLogEntry(retVal)
        return jsonify({'errRsp': retVal})

    # we should not ever get here...post cmd is completely invalid
    retVal = [sfConst.errUnknownPost, oLoader.getDateTm(), '@app.route Tabs post', 'Post missing cmd', 'request.get_json() returns nothing', ' ', ' ']
    oLoader.addErrLogEntry(retVal)
    return '200';  # always return something

  # print('>>/Tabs render_template sfTabs.html')
  return render_template("sfTabs.html")


# notes on creating a distro (creates a dist dir)
#------------------------------------------------------------------------------------------------------------
# - add pyinstaller to project in settings, python interpreter, install pkg
# - use py terminal in your pycharm project (so that your project venv is used)
# - using an assets dir to hold projects files i created such as:  icon files, json cfg files
# - pyinstaller.exe must be copied from venv/scripts dir to dir with seApp.py (as of 12/8/20)
# - if you change the prj dir you must reinstall pyinstaller and copy the exe again
# - change version number below

# - creates a dist folder w/ a seApp.exe - has a terminal window when running from dist
# - this terminal window is needed to see traceback
# - jinja2 template not found requires the use of a spec file with custom addition
# - run this to create initial spec file
# -> pyinstaller paSpotifyFinderApp.py --clean --add-data "templates;templates" --add-data "static;static" -i ./assets/spfIcon.ico --noconfirm
# - drop in waSpotifyFinderApp.spec addition from https://stackoverflow.com/questions/35811448/pyinstaller-jinja2-templatenotfound
# - run this to create a working dist from a spec file
# -> pyinstaller waSpotifyFinderApp.spec --noconfirm

# - creates a dist folder w/ a seApp.exe - no terminal window when running from dist
# -> pyinstaller waSpotifyFinderApp.py --clean --add-data "assets;assets" -i ./assets/seIcon.ico --windowed --noconfirm


#----------------------------------------------------------------------------------------------
if __name__ == '__main__':
  # use_reloader=False ;python codes changes not automatically picked up

  # depending on how this app is invoked this code may or may not run
  print(f"calling: app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False)", flush=True)
  app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False) #, threaded=True)

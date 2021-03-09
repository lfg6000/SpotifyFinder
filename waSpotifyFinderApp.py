from flask import Flask, render_template, session, request, redirect, make_response
from flask_session import Session
from flask import jsonify
from flask_mysqldb import MySQL
import spotipy
import json, logging, datetime, pprint, os, time
import sfLoader, sfConst


# { mozilla request headers
#     'Host': '127.0.0.1:5000',
#     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:83.0) Gecko/20100101 Firefox/83.0',
#     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
#     'Accept-Language': 'en-US,en;q=0.5',
#     'Accept-Encoding': 'gzip, deflate',
#     'Referer': 'http://127.0.0.1:5000/',
#     'Dnt': '1',
#     'Connection': 'keep-alive',
#     'Cookie': 'session=41556fbc-1549-409a-821e-34169e2462ca',
#     'Upgrade-Insecure-Requests': '1',
#     'Sec-Gpc': '1'
# }

# {  chrome browser request headers
#     'Host': '127.0.0.1:5000',
#     'Connection': 'keep-alive',
#     'Upgrade-Insecure-Requests': '1',
#     'Dnt': '1',
#     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
#     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
#     'Sec-Fetch-Site': 'same-origin',
#     'Sec-Fetch-Mode': 'navigate',
#     'Sec-Fetch-User': '?1',
#     'Sec-Fetch-Dest': 'document',
#     'Referer': 'http://127.0.0.1:5000/',
#     'Accept-Encoding': 'gzip, deflate, br',
#     'Accept-Language': 'en-US,en;q=0.9',
#     'Cookie': 'session=ec898092-228f-410b-9051-359c7f2a9660'
# }

#----------------------------------------------------------------------------------------------
# things to remember
# - favicon not showing up firefox: clear the cache in firefox (options,privacy,clear data,clear cache)
#   - you will have to login to all your standard sites again, gmail, amazon
# - flask requries all .css and js fine be in '../static'

#----------------------------------------------------------------------------------------------
app = Flask(__name__)

oLoader = sfLoader.SpfLoader()
oLoader.loadKvFile() # call this before setting 'SECRET_KEY'

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
app.config['SECRET_KEY'] = oLoader.sAppSecretKey
# print('app.config[SECRET_KEY] = ', app.config['SECRET_KEY'])

# SESSION_COOKIE_HTTPONLY defaults to true, if true javascript cookies=document.cookie is not able to read the cookie(s)
# because the cookie(s) are only for server side usage and not accessible to the client
# the cookie(s) are sent with every subsequent requests after being issued by the server
# this app only has one cookie and it is the session id (plus signer extension if used)
# chrome console.log reports cookies = 'session=dff678bd-d9fa-45f0-9bec-840f6e630533'  (it is not encrypted like i thought it would be)
# app.config['SESSION_COOKIE_HTTPONLY'] = False
# app.config['SESSION_COOKIE_NAME'] = 'session'  # defaults to 'session' for the cookie name

# when 'SESSION_USE_SIGNER' is true cookie = 'session=84491ef3-6de1-4108-898c-8ba5a4c24c46.2EPj5iiVZe6-CYgIKN22e9KpXQY'
# note the session cookie is appended  with .11chars-15chars (.2EPj5iiVZe6-CYgIKN22e9KpXQY)
# note the session id is still = '84491ef3-6de1-4108-898c-8ba5a4c24c46'
# app.config['SESSION_USE_SIGNER'] = True

# always resend the js/css files in case they were edited; so chrome does not reuse cached js/css files
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
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

# 1800 = .5 hr, 3600 = 1 hr, 5400 = 1.5 hrs, 7200 = 2 hrs, 9000 = 2.5 hrs, 10800 = 3 hrs,
# 14400 = 4 hrs, 28800 = 8hrs, 57600 = 16hrs, 86400 = 24hrs
# - rmOldSessionFileAge used in rmOldSessionFiles() must be greater than 'PERMANENT_SESSION_LIFETIME' to aviod deleting active session files
app.config['PERMANENT_SESSION_LIFETIME'] = 1800

# firefox ok with this true and 127.0.0.1
# firefox not ok with this true and 192.168.2.10
# chrome not ok with this true and 127.0.0.1
# chrome not ok with this true and 192.168.2.10
app.config['SESSION_COOKIE_SECURE'] = False     # leave this set to false for now

# call from_object after all the config params are set
app.config.from_object(__name__)

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
# timestamp
# @app.before_first_request
# def before_1st_rq():
#     print('---- start before_1st_rq  ----' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

#----------------------------------------------------------------------------------------------
# @app.before_request
# def before_rq():
#   print('---- start before_rq  ----')

#----------------------------------------------------------------------------------------------
def getCookie():
    cookie = request.headers.get('Cookie')
    if cookie is None:
      return 'not set'
    else:
      return cookie

#----------------------------------------------------------------------------------------------
def cookieDump(caller):
    print('cookie/sid,  ' + caller + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + ',  cookie = ' + getCookie() + ',  sid = ' + session.sid)

#----------------------------------------------------------------------------------------------
@app.route('/', methods=['get', 'post'])
def home():
  # hdrs = dict(request.headers)  # use this to view request msg header
  cookieDump('home')
  return render_template("home.html")

# #----------------------------------------------------------------------------------------------
@app.route("/SpotifyLogin")
def SpotifyLogin():
  cookieDump('SpotifyLogin')
  authUrl = oLoader.oAuthLogin()
  return redirect(authUrl)

#----------------------------------------------------------------------------------------------
@app.route("/oAuthCallback")
def oAuthCallback():
  cookieDump('oAuthCallback')
  oLoader.oAuthCallback()
  oLoader.initLoader()
  return redirect("Tabs")

#----------------------------------------------------------------------------------------------
@app.route("/Tabs", methods=['get', 'post'])
def Tabs():
  cookieDump('/Tabs')

  # if this throws than the session has expired, the user will be sent to the home page
  try:
    id = session['mUserId']
  except Exception:
    retVal = [sfConst.errSessionTimeOut, oLoader.getDateTm(), 'Tabs()', 'Session has expired.', '', '', '']
    return jsonify({ 'errRsp': retVal })

  if request.method == 'POST':
    rqJson = request.get_json()
    if rqJson != None:
      key = next(iter(rqJson))

      if (key == 'findDups'):
        modePlaylist = rqJson['modePlaylist']
        modeSearch = rqJson['modeSearch']
        print('/Tabs findDups() - modePlaylist = ' + modePlaylist + ', modeSearch = ' + modeSearch)
        retVal = oLoader.findDups(modePlaylist, modeSearch)
        return jsonify({ 'errRsp': retVal })

      if (key == 'getDupsTrackList'):
        modePlaylist = rqJson['modePlayList']
        modeSearch = rqJson['modeSearch']
        print('/Tabs getDupsTrackList()')
        retVal, dupsTrackList, numDupsMatch, dupsClrList = oLoader.getDupsTrackList(modePlaylist, modeSearch)
        return jsonify({ 'errRsp': retVal, 'dupsTrackList': dupsTrackList, 'numDupsMatch': numDupsMatch, 'dupsClrList': dupsClrList})

      if (key == 'loadArtistDict'):
        print('/Tabs loadArtistDict()')
        retVal = oLoader.loadArtistDict()
        return jsonify({ 'errRsp': retVal})

      if (key == 'getArtistDict'):
        print('/Tabs getArtistDict()')
        retVal, artistDict = oLoader.getArtistDict()
        return jsonify({ 'errRsp': retVal, 'artistDict': artistDict})

      if (key == 'loadArtistTrackList'):
        artistId = rqJson['artistId']
        print('/Tabs loadArtistTrackList() - artistId = ' + artistId)
        retVal = oLoader.loadArtistTrackList(artistId)
        return jsonify({ 'errRsp': retVal })

      if (key == 'getArtistTrackList'):
        print('/Tabs getArtistTrackList()')
        retVal, artistTrackList = oLoader.getArtistTrackList()
        return jsonify({ 'errRsp': retVal, 'artistTrackList': artistTrackList})

      if (key == 'loadPlTracks'):
        print('/Tabs loadPlTracks()')
        retVal = oLoader.loadPlTracks()
        return jsonify({ 'errRsp': retVal})

      if (key == 'getPlSelectedDict'):
        print('/Tabs getPlSelectedDict')
        retVal, plSelectedDict = oLoader.getPlSelectedDict()
        return jsonify({ 'errRsp': retVal, 'plSelectedDict': plSelectedDict })

      if (key == 'getTrackList'):
        plId = rqJson['plId']
        print('/Tabs getTrackList() - plId = ' + plId)
        retVal, trackList, duration = oLoader.getTrackList(plId)
        return jsonify({ 'errRsp': retVal, 'trackList': trackList, 'plDuration': duration})

      if (key == 'setPlSelectedDict'):
        print('/Tabs setPlSelectedDict()')
        newPlSelectedDict = rqJson['newPlSelectedDict']
        retVal = oLoader.setPlSelectedDict(newPlSelectedDict)
        return jsonify({ 'errRsp': retVal })

      # if (key == 'getCntrs'):
      #   print('/Tabs getCntrs')
      #   retVal, plSelectionCntr, tracksRemovedCntr = oLoader.getCntrs()
      #   return jsonify({ 'errRsp': retVal, 'plSelectionCntr': plSelectionCntr, 'tracksRemovedCntr': tracksRemovedCntr })

      if (key == 'loadSpotifyInfo'):
        print('/Tabs loadSpotifyInfo')
        retVal, userId, userName, sid = oLoader.loadSpotifyInfo()
        # the mysql server is optional if db name is not set skip the one and only db read/write
        if ((retVal[0] == 1) and (app.config['MYSQL_DB'] != '')): # if db name is not set skip the db write
          oLoader.loadUniqueSpotifyInfo(mysql)
        return jsonify({ 'errRsp': retVal, 'userId': userId, 'userName': userName, 'cookie': getCookie(), 'sid': sid})

      if (key == 'loadPlDict'):
        print('/Tabs loadPlDict()')
        retVal = oLoader.loadPlDict()
        return jsonify({ 'errRsp': retVal })

      if (key == 'getPlDict'):
        print('/Tabs getPlDict')
        retVal, plDict, nPlaylists, nTracks, userList = oLoader.getPlDict()
        return jsonify({ 'errRsp': retVal, 'plDict': plDict , 'NPlaylists': nPlaylists, 'NTracks': nTracks, 'userList': userList })

      # if (key == 'incPlSelectionCntr'):
      #   print('/Tabs incPlSelectionCntr')
      #   retVal = oLoader.incPlSelectionCntr()
      #   return jsonify({ 'errRsp': retVal })

      if (key == 'removeTracks'):
        print('/Tabs removeTracks()')
        rmTracksList = rqJson['rmTracksList']
        pprint.pprint(rmTracksList)  # pprint sorts on key
        retVal = oLoader.removeTracks(rmTracksList)
        return jsonify({ 'errRsp': retVal })

      if (key == 'getErrLog'):
        print('/Tabs getErrLog()')
        retVal, errLog = oLoader.getErrLog()
        return jsonify({ 'errRsp': retVal, 'errLog': errLog })

      if (key == 'getInfoHtml'):
        print('/Tabs getInfoHtml()')
        fnRq = rqJson['infoRq']
        retVal, htmlStr = oLoader.getInfoHtml(fnRq);
        # jsonStr = json.dumps(htmlStr)
        return jsonify({ 'errRsp': retVal, 'htmlInfo': htmlStr })

    return;

  print('/Tabs render_template sfTabs.html')
  # oLoader.initLoader()
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
  # use_reloader=False prevents app.run() from being called twice

  # app.run(host='0.0.0.0', port=5000, debug=True)
  # app.run(host='192.168.2.9', port=5000, debug=True)
  # app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False) #, threaded=True)
  print('calling app.run()')
  app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False) #, threaded=True)
  # app.run(host='192.168.2.10', port=5000, debug=True, use_reloader=False)#, threaded=True)
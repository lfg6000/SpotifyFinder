from flask import session, request
import pprint, json, collections, sys, datetime, time, os, logging, traceback
from operator import itemgetter
from flask_mysqldb import MySQL
import MySQLdb.cursors
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from collections import Counter
import sfConst

# from memory_profiler import profile

# ---------------------------------------------------------------
# flask returns a session id when receiving a connection request and
# upon subsequent requests the browser sends a session cookie in the request header
#     'Cookie': 'session=41556fbc-1549-409a-821e-34169e2462ca',




# ---------------------------------------------------------------
class SpfLoader():
  def __init__(this, **kwargs):
    # print('>>loader.SpfLoader()  __init__ method')

    this.sSpotifyScope  = 'playlist-read-private '
    this.sSpotifyScope += 'playlist-read-collaborative '
    this.sSpotifyScope += 'playlist-modify-public '
    this.sSpotifyScope += 'playlist-modify-private '
    this.sSpotifyScope += 'user-read-private '             # for country code

    # experimental code for a potential play btn feature
    # this.sSpotifyScope += 'user-read-playback-state '
    # this.sSpotifyScope += 'user-modify-playback-state '

    this.sFlaskAppSecretKey    = ''
    this.sSpotifyClientId        = ''
    this.sSpotifyClientSecret    = ''
    this.sSpotifyRedirectUri     = ''
    this.sMySqlHost       = ''
    this.sMySqlUser       = ''
    this.sMySqlPwRoot     = ''
    this.sMySqlPwUser     = ''
    this.sMySqlDbName     = ''


  # ---------------------------------------------------------------
  def initLoader(this):
    # print('>>loader.initLoader()' + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    # session['mSpotipy'] = None
    session['mUserId'] = ''
    session['mUserName'] = ''
    session['mUserCountry'] = '' # needs a user-read-private permission, # country codes https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

    session['mPlDict'] = {}
    session['mPlaylistCntUsr'] = 0
    session['mPlSelectedDict'] = {}
    session['mPlDictOwnersList'] = []

    session['mTotalTrackCnt'] = 0
    session['mTotalTrackCntUsr'] = 0

    session['mPlTracksDict'] = collections.OrderedDict();

    session['mDupsTrackList'] = []
    session['mNumDupsMatch'] = 0

    session['mArtistDict'] = {}
    session['mArtistTrackList'] = []

    session['mSearchTrackList'] = []
    session['mNumSearchMatches'] = 0

    session['mLastPlLoaded'] = ''
    session['mErrLog'] = []

  # -------------------------------------------------------------------------------------------------------------------------------------------
  def msToHms(this, ms, format):
    s = (ms / 1000) % 60
    s = int(round(s))
    m = (ms / (1000 * 60)) % 60
    m = int(m)
    h = (ms / (1000 * 60 * 60))  # % 24
    h = int(h)

    # Spirit Molecule - Wounded Man Pech Merle Mix was reading 9:60, this makes it 10:00
    if (s == 60):
      s = 0
      m += 1
      if (m == 60):
        h += 1

    if (h == 0):
      if format == 0:
        hmsVal = "   %2.2d:%2.2d" % (m, s)
      else:
        hmsVal = "%2d min" % m
    else:
      if format == 0:
        hmsVal = "%2.2d:%2.2d:%2.2d" % (h, m, s)
      else:
        hmsVal = "%3d hr %2d min" % (h, m)

    hmsVal = hmsVal.lstrip(' ')
    # hmsVal = hmsVal.lstrip('0')
    # print("hmsVal len %d" % (len(hmsVal)))
    return hmsVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # login and user
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def loadCfgFile(this):
    try:
      # - load cfg params from a cfg file (json dict)
      # - we can not push the json cfg file with our flask and spotify secret keys
      #   to github because this would expose them.

      # raise Exception('throwing loader.loadCfgFile()')
      cfgFnd = 0
      grpKey = 'local_server_127_0_0_1'

      # cfg when running on a hosting service
      # cfg when running on original developer's machine
      vPath = os.path.dirname(os.path.abspath(__file__)) + '/templates/' + 'helper.txt'
      if (os.path.isfile(vPath)):
        cfgFnd = 1
        if (vPath.find('slipstream') != -1):
          grpKey = 'remote_server'

      # cfg when running from a github clone
      if (cfgFnd == 0):
        vPath = os.path.dirname(os.path.abspath(__file__)) + '/sfCfg.json'
        if (os.path.isfile(vPath)):
          cfgFnd = 1

      if (cfgFnd == 0):
        raise Exception('Cfg file not found. Missing File: ', vPath)

      # print('>>loader.loadCfgFile() path to cfg file = ' + vPath)
      fHelper = open(vPath, "r")
      hVal = json.load(fHelper)
      this.sFlaskAppSecretKey     = hVal[grpKey]['sFlaskAppSecretKey']
      this.sSpotifyClientId       = hVal[grpKey]['sSpotifyClientId']
      this.sSpotifyClientSecret   = hVal[grpKey]['sSpotifyClientSecret']
      this.sSpotifyRedirectUri    = hVal[grpKey]['sSpotifyRedirectUri']
      this.sMySqlHost             = hVal[grpKey]['sMySqlHost']
      this.sMySqlUser             = hVal[grpKey]['sMySqlUser']
      this.sMySqlPwRoot           = hVal[grpKey]['sMySqlPwRoot']
      this.sMySqlPwUser           = hVal[grpKey]['sMySqlPwUser']
      this.sMySqlDbName     = hVal[grpKey]['sMySqlDbName']

      if (this.sFlaskAppSecretKey == ''):
        raise Exception('Cfg file error.  sFlaskAppSecretKey is empty. cfg file: ', vPath)
      if (this.sSpotifyClientId == ''):
        raise Exception('Cfg file error.  sSpotifyClientId is empty. cfg file: ', vPath)
      if (this.sSpotifyClientSecret == ''):
        raise Exception('Cfg file error.  sSpotifyClientSecret is empty. cfg file: ', vPath)

      return 1

    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errCfgFile, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Error loading config file.', str(exTyp), str(exObj)]
      pprint.pprint(retVal) #pprint sorts on key
      # this.addErrLogEntry(retVal) # session not available yet
      return -1

  # ---------------------------------------------------------------
  def oAuthLogin(this):

    # authorization-code-flow was lifted from this reply
    # https://stackoverflow.com/questions/57580411/storing-spotify-token-in-flask-session-using-spotipy

    # Step 1. Have your application request authorization
    #         The user sees a spotify provided login page
    #         The user logins to authorize access
    # Don't reuse a SpotifyOAuth object because they store token info and you could leak user tokens if you reuse a SpotifyOAuth object

    try:
      # raise Exception('throwing loader.oAuthLogin()')
      # print('>>loader.oAuthLogin()' + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

      # the pythonanywhere error log file is filling up with Spotipy warning: Couldn't read cache at: .cache
      # spotipy oauth2.py logs this warning to the python logger because it can not rd/wr a .cache file on pythonanywhere
      # we only do this when running on pythonanywhere by doing a path check
      # i think this forces all python loggers created after this point to only log ERRORs
      # so we are forcing the 'spotipy.oauth2' logger to only log errors
      # i tried putting this at the start of the main app py file but that did not fix this
      vPath = os.path.dirname(os.path.abspath(__file__)) + '/templates/'
      if (vPath.find('slipstream') != -1):
        logging.getLogger().setLevel('ERROR')



      spoAuth = spotipy.oauth2.SpotifyOAuth(client_id     = this.sSpotifyClientId,
                                            client_secret = this.sSpotifyClientSecret,
                                            redirect_uri  = this.sSpotifyRedirectUri,
                                            scope         = this.sSpotifyScope)

      authUrl = spoAuth.get_authorize_url()
      # print('>>authUrl = ' + authUrl)
      return authUrl

    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSpotiyLogin, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Spotify Login Failed.', str(exTyp), str(exObj)]
      pprint.pprint(retVal) #pprint sorts on key
      # this.addErrLogEntry(retVal) # session not available yet
      return 'oLoader:login() failed'

  # ---------------------------------------------------------------
  def oAuthCallback(this):
    # authorization-code-flow
    # Step 2. Have your application request refresh and access tokens; Spotify returns access and refresh tokens
    # Don't reuse a SpotifyOAuth object because they store token info and you could leak user tokens if you reuse a SpotifyOAuth object

    try:
      # raise Exception('throwing loader.oAuthCallback()')
      # print('>>loader.oAuthCallback()' + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

      # - on PA the .cache write fails if we do not set the cache_path param
      # - we do not care if the .cache wr fails on PA since we cache the token info in the session dict
      #   and i think we really do not want a .cache file when there are multiple users on the site
      spoAuth = spotipy.oauth2.SpotifyOAuth(client_id     = this.sSpotifyClientId,
                                            client_secret = this.sSpotifyClientSecret,
                                            redirect_uri  = this.sSpotifyRedirectUri,
                                            scope         = this.sSpotifyScope)
      session.clear()
      code = request.args.get('code')

      # ask spotify for a token
      tokenInfo = spoAuth.get_access_token(code)
      # print('>>loader.oAuthCallback() acquired token value'  + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
      # pprint.pprint(tokenInfo)

      # Saving the access token along with all other token related info
      session["tokenInfo"] = tokenInfo

    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSpotiyLogin, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'oAuthCallback failed.', str(exTyp), str(exObj)]
      pprint.pprint(retVal) #pprint sorts on key
      # this.addErrLogEntry(retVal) # session not available yet
      return

  # ---------------------------------------------------------------
  def oAuthGetToken(this, session):
    # Check to see if token is valid and gets a new token if not
    try:
      # raise Exception('throwing loader.oAuthGetToken()')
      # print('>>loader.oAuthGetToken()' + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
      tokenInfo = session.get("tokenInfo", {})

      # Checking if the session already has a token stored
      if not (session.get('tokenInfo', False)):
        tokenValid = False
        return tokenInfo, tokenValid

      # Checking if token has expired
      now = int(time.time())
      is_token_expired = session.get('tokenInfo').get('expires_at') - now < 60

      # Refreshing token if it has expired
      if (is_token_expired):
        # Don't reuse a SpotifyOAuth object because they store token info and you could leak user tokens if you reuse a SpotifyOAuth object
        # print('>>loader.oAuthGetToken() - token expired' + ',  ' + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        spoAuth = spotipy.oauth2.SpotifyOAuth(client_id=this.sSpotifyClientId, client_secret=this.sSpotifyClientSecret, redirect_uri=this.sSpotifyRedirectUri, scope=this.sSpotifyScope)
        tokenInfo = spoAuth.refresh_access_token(session.get('tokenInfo').get('refresh_token'))
        print('>>loader.oAuthGetToken() - token refresh, ' + this.getSidTruncated())
        # pprint.pprint(tokenInfo)

      tokenValid = True
      return tokenInfo, tokenValid
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSpotiyLogin, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to acquire spotify object.', str(exTyp), str(exObj)]
      # pprint.pprint(retVal) #pprint sorts on key
      this.addErrLogEntry(retVal)
      return None, None

  # ---------------------------------------------------------------
  def oAuthGetSpotifyObj(this):
    # try:
    #   raise Exception('throwing loader.oAuthGetToken() returned Not Authorized')
    #   print('>>loader.oAuthGetSpotifyObj()')

    # https: // developer.spotify.com / documentation / web - api /  # rate-limiting
    #  - If Web API returns status code 429, it means that you have sent too many requests.
    #    When this happens, check the Retry-After header, where you will see a number displayed.
    #    This is the number of seconds that you need to wait, before you try your request again.

    # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5)
    #  - loadPlTracks1x() could increase the timeout,  could catch and retry the call
    #  - sp = spotipy.Spotify(requests_timeout=10, auth=session.get('tokenInfo').get('access_token'))

    # when creating the Spotify object you can set a requests_timeout param
    #  - see \venv\Lib\site-packages\spotipy\client.py __init__() for list of config params

    # raise Exception('throwing loader.oAuthGetSpotifyObj()')
    session['tokenInfo'], tokenValid = this.oAuthGetToken(session)
    session.modified = True
    if not tokenValid:
      raise Exception('loader.oAuthGetToken() token is not valid, session expired.')
    sp = spotipy.Spotify(auth=session.get('tokenInfo').get('access_token'))
    return sp

    # except Exception:
    #   exTyp, exObj, exTrace = sys.exc_info()
    #   retVal = [spfConst.errSpotiyLogin, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to acquire spotify object.', str(exTyp), str(exObj)]
    #   pprint.pprint(retVal) #pprint sorts on key
    #   this.addErrLogEntry(retVal)
    #   return None

  # ---------------------------------------------------------------
  def loadSpotifyInfo(this, winWidth, winHeight):
    # print('>>loader.loadSpotifyInfo()')
    try:
      # raise Exception('throwing loader.loadSpotifyInfo()')
      results = this.oAuthGetSpotifyObj().current_user()
      session['mUserId'] = results['id']
      session['mUserName'] = results['display_name']
      session['mUserCountry'] = results['country']   # country codes https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
      print('>>loader.loadSpotifyInfo() usrId/usrName = ' + session['mUserId'] + '/' + session['mUserName'] + ', ' + this.getSidTruncated() + ', width = ' + str(winWidth) + ', heigth = ' + str(winHeight))
      return [sfConst.errNone], session['mUserId'], session['mUserName'], this.getSidTruncated()
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSpotifyInfo, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to get spotify info.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, '', '', ''

  # ---------------------------------------------------------------
  def updateDbUniqueSpotifyInfo(this, mysql):
    # print('>>loader.updateDbUniqueSpotifyInfo()')

    # using db is optional. the app works fine w/o a db.
    # if this.sMySqlDbName is empty we are not using a db so we just return

    # this web app does not use google analytics or any other tracking utilities
    # but we do want to know how many unique users actually use the web app
    # so we have a MySql table to count unique visits

    # it looks like using 'lock table' is not needed see: https://dev.mysql.com/doc/refman/8.0/en/table-locking.html
    # InnoDB tables use row-level locking so that multiple sessions and applications can read from and write to the same table
    # simultaneously, without making each other wait or producing inconsistent results. For this storage engine, avoid using the
    # LOCK TABLES statement, because it does not offer any extra protection, but instead reduces concurrency. The automatic
    # row-level locking makes these tables suitable for your busiest databases with your most important data, while also simplifying
    # application logic since you do not need to lock and unlock tables. Consequently, the InnoDB storage engine is the default in MySQL.

    # these are the sql cmds to create the database and it's one table
    # CREATE DATABASE IF NOT EXISTS `spotifyFinderDb` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
    # USE `spotifyFinderDb`;

    # see notes in waSpotifyFinderApp about db connections...when the request (route) finishes the db connection will be automatically closed
    cursor = None
    try:
      # raise Exception('throwing loader.updateDbUniqueSpotifyInfo()')

      # if sMySqlDbName is empty we are not configure to use a db
      if (this.sMySqlDbName == ''):
        return

      userId = session['mUserId']
      userName = session['mUserName']
      country = session['mUserCountry']  # needs a user-read-private permission, # country codes https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
      playlistCnt = len(session['mPlDict'])
      playlistCntUsr = session['mPlaylistCntUsr']
      totalTrackCnt = session['mTotalTrackCnt']
      totalTrackCntUsr = session['mTotalTrackCntUsr']
      sqlDate = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

      cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
      # cursor.execute('LOCK TABLE uniqueUsers WRITE')
      cursor.execute('SELECT * FROM uniqueUsers WHERE userid = % s FOR UPDATE', (userId,))
      user = cursor.fetchone()
      if user:
        visitCnt = user['visitCnt'] + 1
        # country can be removed after a while.
        # country was added after 197 user entries were created
        # so get the country of an existing user we need to set country here for now
        # once all the existing users visit the site we can remove country because it is set on the first visit also
        cursor.execute("UPDATE uniqueUsers SET country=%s, visitCnt=%s, playlistCnt=%s, playlistCntUsr=%s, totalTrackCnt=%s, totalTrackCntUsr=%s, lastVisit=%s WHERE userId=%s",
                       (country, int(visitCnt), int(playlistCnt), int(playlistCntUsr), int(totalTrackCnt), int(totalTrackCntUsr), sqlDate, userId))
        # print('>>loader.updateDbUniqueSpotifyInfo - inc existing user')
      else:
        visitCnt = 1
        visitCntTracks = 0
        visitCntDups = 0
        visitCntArt = 0
        visitCntRm = 0
        visitCntMv = 0
        visitCntCp = 0
        visitCntSearch = 0
        visitCntHelp = 0
        cursor.execute('INSERT INTO uniqueUsers VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )',
                       (userId, userName, country,
                        int(visitCnt), int(visitCntTracks), int(visitCntDups), int(visitCntArt),
                        int(visitCntRm), int(visitCntMv), int(visitCntCp), int(visitCntSearch), int(visitCntHelp),
                        int(playlistCnt), int(playlistCntUsr), int(totalTrackCnt), int(totalTrackCntUsr),
                        sqlDate))
        # print('>>loader.updateDbUniqueSpotifyInfo - add new user')

      mysql.connection.commit()
      cursor.close()
      # print('>>loader.updateDbUniqueSpotifyInfo - cursor close')

    except (MySQLdb.Error, MySQLdb.Warning, TypeError, ValueError) as e:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSqlErr, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to set unique spotify info.', str(e), ' ']
      this.addErrLogEntry(retVal)
      return
    except:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSqlErr, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to set unique spotify info.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return

  # ---------------------------------------------------------------
  def updateDbVisitCnt(this, mysql, cntType):
    # print('>>loader.updateDbVisitCnt()')

    cursor = None
    try:
      # raise Exception('throwing loader.updateDbVisitCnt()')

      # if sMySqlDbName is empty we are not configure to use a db
      if (this.sMySqlDbName == ''):
        return

      userId = session['mUserId']
      sqlDate = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

      cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
      # cursor.execute('LOCK TABLE uniqueUsers WRITE')
      cursor.execute('SELECT * FROM uniqueUsers WHERE userid = % s FOR UPDATE', (userId,))
      user = cursor.fetchone()
      if user:
        # print('>>loader.updateDbVisitCnt - inc existing user')

        visitCntTracks = user['visitCntTracks']
        visitCntDups = user['visitCntDups']
        visitCntArt = user['visitCntArt']
        visitCntRm = user['visitCntRm']
        visitCntMv = user['visitCntMv']
        visitCntCp = user['visitCntCp']
        visitCntSearch = user['visitCntSearch']
        visitCntHelp = user['visitCntHelp']

        if (cntType == 'Tracks'):
          visitCntTracks = visitCntTracks + 1
        if (cntType == 'Dups'):
          visitCntDups = visitCntDups + 1
        if (cntType == 'Art'):
          visitCntArt = visitCntArt + 1
        if (cntType == 'Rm'):
          visitCntRm = visitCntRm + 1
        if (cntType == 'Mv'):
          visitCntMv = visitCntMv + 1  # every mv also does a rm
        if (cntType == 'Cp'):
          visitCntCp = visitCntCp + 1
        if (cntType == 'Search'):
          visitCntSearch = visitCntSearch + 1
        if (cntType == 'Help'):
          visitCntHelp = visitCntHelp + 1

        cursor.execute("UPDATE uniqueUsers SET visitCntTracks=%s, visitCntDups=%s, visitCntArt=%s, visitCntRm=%s, visitCntMv=%s, visitCntCp=%s, visitCntSearch=%s, visitCntHelp=%s, lastVisit=%s WHERE userId=%s",
                                      (int(visitCntTracks), int(visitCntDups), int(visitCntArt), int(visitCntRm), int(visitCntMv), int(visitCntCp), int(visitCntSearch), int(visitCntHelp), sqlDate, userId))
        mysql.connection.commit()

      cursor.close()
      # print('>>loader.updateDbVisitCnt - cursor close')

    except (MySQLdb.Error, MySQLdb.Warning, TypeError, ValueError) as e:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSqlErr, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to set unique spotify info.', str(e), ' ']
      this.addErrLogEntry(retVal)
      return
    except:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSqlErr, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to set unique spotify info.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # utilities
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getDateTm(this):
    return datetime.datetime.now().strftime("%Y/%m/%d   %I:%M:%S  %f")

  # ---------------------------------------------------------------
  def getErrLog(this):
    try:
      # print('>>loader.getErrLog()')
      # raise Exception('throwing loader.getErrLog()')
      return [sfConst.errNone], session['mErrLog']
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetErrLog, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      pprint.pprint(retVal) #pprint sorts on key
      # this.addErrLogEntry(retVal)...we could not get errlog so it is not usable...
      return retVal, 0

  # ---------------------------------------------------------------
  def getInfoHtml(this, fn):
    try:
      vPath = os.path.dirname(os.path.abspath(__file__)) + '/templates/help/' + fn
      # print('>>loader.getInfoHtml() path = ' + vPath)
      # raise Exception('throwing loader.getInfoHtml()')
      with open(vPath, "r") as f:
        htmlStr = " ".join([l.rstrip() for l in f])
      return [sfConst.errNone], htmlStr
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetInfoHtml, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Check path to help file.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, ''

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # errLog array of arrays
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getSidTruncated(this):
    sid = session.sid
    sid = sid.split('-')
    sid = sid[0][0:5] + "...." + sid[len(sid) - 1][-5:]
    return sid

  # ---------------------------------------------------------------
  def addErrLogEntry(this, entry):
    # an entry needs to be an array with 7 entries
    # [0] = int,            errNone or err constant, see seConst
    # [1] = string,         date time
    # [2] = string,         method in which error occurred
    # [3] = string,         description of error for display
    # [4] = string,         str(exTyp) from sys.exc_info()
    # [5] = string,         str(exObj) from sys.exc_info()
    # entry[1] = datetime.datetime.now().strftime("%Y/%m/%d   %H:%M:%S  %f")

     # < and > cause the value string to be blank on the log screem using <pre>
    entry[4] = entry[4].replace('<', '')
    entry[4] = entry[4].replace('>', '')
    
    entry.insert(2, session['mUserName'])
    entry.insert(3, session['mUserId'])
    entry.insert(4, this.getSidTruncated())
    pprint.pprint(entry)  # pprint sorts on key,  this will show up in pythonAnywhere server log file
    session['mErrLog'].append(entry)

  # -------------------------------------------------------------------------------------
  def fNm(this, obj=None):
    # val = traceback.extract_stack(None, 2)
    mn = traceback.extract_stack(None, 2)[0][2] + '()'
    if (obj is None):
      return mn
    cn = obj.__class__.__name__
    return f"{cn}::{mn}"

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # Playlist Dictionary
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getPlDict(this):
    try:
      # print('>>loader.getPlDict()')
      # raise Exception('throwing loader.getPlDict()')
      return [sfConst.errNone], session['mPlDict'], len(session['mPlDict']), session['mTotalTrackCnt'], session['mPlDictOwnersList']
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetPlDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, [], 0, 0, []

  # ---------------------------------------------------------------
  # def loadPlDict(this, clean=True):
  #   # print('>>loader.loadPlDict()')
  #
  #   try:
  #     # raise Exception('throwing loader.loadPlDict() - playlist dict load error')
  #
  #     # clear dict if this a reload
  #     session['mPlDict'].clear()
  #     session['mTotalTrackCnt'] = 0
  #
  #     if clean == True:
  #       session['mPlSelectedDict'].clear()
  #       session['mPlTracksDict'].clear()
  #
  #     idx = 0
  #     done = False
  #     while (done == False):
  #       # spotify only returns 50 playlists at a time so we loop until we have them all
  #       # 'https://api.spotify.com/v1/me/playlists'
  #       results = this.oAuthGetSpotifyObj().current_user_playlists(limit=50, offset=idx)
  #       # print('>>num playlist fetched = ' + str(len(results['items'])))
  #       if (len(results['items']) < 50):
  #         done = True
  #
  #       for i, item in enumerate(results['items']):
  #         pub = 'Public' if item['public'] == True else 'Private'
  #         ownerId = item['owner']['id']
  #         ownerNm = item['owner']['display_name']
  #         session['mPlDict'][item['id']] = {'Playlist Id': item['id'],
  #                                           'Playlist Name': item['name'],
  #                                           'Playlist Owners Name': ownerNm,
  #                                           'Playlist Owners Id': ownerId,
  #                                           'Public': pub,
  #                                           'Snapshot Id': item['snapshot_id'],
  #                                           'Tracks': str(item['tracks']['total']),
  #                                           'Duration': '0'}
  #         session['mTotalTrackCnt'] += item['tracks']['total']
  #         if (ownerId == session['mUserId']):
  #           session['mPlaylistCntUsr'] += 1
  #           session['mTotalTrackCntUsr'] += item['tracks']['total']
  #         id = ownerNm + ' / ' + ownerId
  #         if id not in session['mPlDictOwnersList']:
  #           session['mPlDictOwnersList'].append(id)
  #       idx += 50
  #       if (idx > 699):
  #         break;
  #
  #     # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mPlDict.json', 'w') as f:
  #     #   json.dump(session['mPlDict'], f)
  #     return [sfConst.errNone]
  #   except Exception:
  #     exTyp, exObj, exTrace = sys.exc_info()
  #     retVal = [sfConst.errLoadPlDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Loading Playlists Failed', str(exTyp), str(exObj)]
  #     this.addErrLogEntry(retVal)
  #     return retVal

  # ---------------------------------------------------------------
  def loadPlDictBatch(this, idx):
    # print('>>loader.loadPlDict()')

    try:
      # raise Exception('throwing loader.loadPlDict() - playlist dict load error')

      # clear dict if this a reload
      if (idx == 0):
        session['mPlDict'].clear()
        session['mTotalTrackCnt'] = 0
        session['mTotalTrackCntUsr'] = 0
        session['mPlaylistCnt'] = 0
        session['mPlaylistCntUsr'] = 0
        session['mPlSelectedDict'].clear()
        session['mPlTracksDict'].clear()

        session['mPlDictOwnersList'].clear()
        session['mDupsTrackList'].clear()
        session['mNumDupsMatch'] = 0
        session['mArtistDict'].clear()
        session['mArtistTrackList'].clear()
        session['mSearchTrackList'].clear()
        session['mNumSearchMatches'] = 0
        session['mLastPlLoaded'] = ''

      # spotify only returns 50 playlists at a time so we loop until we have them all
      # 'https://api.spotify.com/v1/me/playlists'
      results = this.oAuthGetSpotifyObj().current_user_playlists(limit=50, offset=idx)
      # print('>>num playlist fetched = ' + str(len(results['items'])))
      nPlRxd = len(results['items'])

      for i, item in enumerate(results['items']):
        pub = 'Public' if item['public'] == True else 'Private'
        ownerId = item['owner']['id']
        ownerNm = item['owner']['display_name']
        if (ownerId is None):
          ownerId='unknownId'
        if (ownerNm is None):
          ownerNm = 'unknownNm'
        nTracks = item['tracks']['total']
        if (nTracks is None):
          nTracks = 0

        session['mPlDict'][item['id']] = {'Playlist Id': item['id'],
                                          'Playlist Name': item['name'],
                                          'Playlist Owners Name': ownerNm,
                                          'Playlist Owners Id': ownerId,
                                          'Public': pub,
                                          'Snapshot Id': item['snapshot_id'],
                                          'Tracks': str(nTracks),
                                          'Duration': '0'}
        session['mTotalTrackCnt'] += nTracks
        if (ownerId == session['mUserId']):
          session['mPlaylistCntUsr'] += 1
          session['mTotalTrackCntUsr'] += nTracks
        id = ownerNm + ' / ' + ownerId
        if id not in session['mPlDictOwnersList']:
          session['mPlDictOwnersList'].append(id)
        session['mLastPlLoaded'] = item['name']

      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mPlDict.json', 'w') as f:
      #   json.dump(session['mPlDict'], f)
      return [sfConst.errNone], nPlRxd
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errLoadPlDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Loading Playlists Failed', str(exTyp), 'last playlists successfully loaded = ' + session['mLastPlLoaded']]
      this.addErrLogEntry(retVal)
      return retVal, 0

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # PlSelectedDict
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getPlSelectedDict(this):
    try:
      # print('>>loader.getPlSelectedDict()')
      # raise Exception('throwing loader.getPlSelectedDict()')
      return [sfConst.errNone], session['mPlSelectedDict']
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetPlSelectedDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, []

  # ---------------------------------------------------------------
  def getPlSelectedDictNotLoaded(this):
    try:
      # print('>>loader.getPlSelectedDictNotLoaded()')
      # raise Exception('throwing loader.getPlSelectedDictNotLoaded()')
      plSelectedDictNotLoaded = {}
      for plSelectedId, plSelectedDictVals in session['mPlSelectedDict'].items():
        if plSelectedId not in session['mPlTracksDict']:  # did we already loaded the tracks for the pl
          plSelectedDictNotLoaded[plSelectedId] = plSelectedDictVals

      return [sfConst.errNone], plSelectedDictNotLoaded
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetPlSelectedDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, []

  # ---------------------------------------------------------------
  def setPlSelectedDict(this, newPlSelDict):
    # print('>>loader.setPlSelectedDict()')
    try:
      # raise Exception('throwing loader.setPlSelectedDict()')
      session['mPlSelectedDict'].clear()
      session['mPlSelectedDict'] = newPlSelDict.copy()
      # pprint.pprint(session['mPlSelectedDict']) # pprint sorts on key
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errSetPlSelectedDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to set the playlist selected dictionary.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # Playlist Tracks Dictionary
  #  - each dict entry is a list
  #  - each list contains a dictionary of track info
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getPlTracksDict(this):
    # print('>>loader.getPlTracksDict()')
    return session['mPlTracksDict']

  # ---------------------------------------------------------------
  # def loadPlTracks1x(this, plId, updateTrackCnt=0):
  def loadPlTracks1x(this, plId):
    # print('>>loader.loadPlTracks1x()')

    # session['mPlTracksDict'] = collections.OrderedDict();
    #   - below we do a: session['mPlTracksDict'][plId] = tracksList
    #     - the dict key is a plId and dict value is a trackList array
    #   - there is one trackList[] for each fetched playlist in the mPlTracksDict[]
    #     - each trackList[] is an array of dictionaries
    #     - example dict entries {'Track Id': track['id'], 'Track Name': track['name'],}
    #   - we are using a list because because a single playlist can have duplicates
    #   - this works: tn = session['mPlTracksDict'][plId][0]['Track Name'] .... track name for the first track in a specific pl

    try:
      # raise Exception('throwing loader.loadPlTracks1x()')

      if plId in session['mPlTracksDict']:  # did we already load the tracks/episodes for the pl
        loadedPlIds = []
        for plId in session['mPlTracksDict']:
          loadedPlIds.append(plId)
        return [sfConst.errNone], loadedPlIds


      idx = 0
      dur = 0
      done = False
      tracksList = []

      # lots of tracks have an available_markets list with 0 entries but not all
      # maybe we need to pass a market param (country code) in the .playlist_items() call and get back track linking info

      plValues = session['mPlDict'].get(plId)  # need the ownerName and ownerId
      trackCnt = 0
      while (False == done):
        # spotify only returns 100 tracks at a time so we loop until we have them all
        # 'https://api.spotify.com/v1/playlists/1JE8axNdv3Ko9mwSihdBHR/tracks?limit=100&offset=0&additional_types=track%2Cepisode'
        tracks = this.oAuthGetSpotifyObj().playlist_items(plId, limit=100, offset=idx)
        if (len(tracks['items']) < 100):
          done = True

        for item in tracks['items']:
          if (item['track'] is None):
            continue;

          track = item['track']
          # we do not have the users countryCode because we do not ask for that permission
          # if countryCode not in track['available_markets']:
          #   continue

          if (track['type'] != 'track') and (track['type'] != 'episode'):
            continue

          # a daily wellness playlist from spotify had a podcast episode in the middle of a bunch of songs
          # we are ignoring podcast episodes.  track['type'] can be 'track' or 'episode'
          if (track['type'] == 'track'):  # a daily wellness playlist from spotify had a
            tracksList.append({'Track Id': track['id'],
                               'Playlist Id': plId,
                               'Playlist Name': plValues['Playlist Name'],
                               'Track Name': track['name'],
                               'Track Position': (str(trackCnt)).zfill(4),
                               'Album Name': track['album']['name'],
                               'Album Id': track['album']['id'],
                               'Artist Name': track['artists'][0]['name'],
                               'Artist Id': track['artists'][0]['id'],
                               'Duration': track['duration_ms'],
                               'Duration Hms': this.msToHms(track['duration_ms'], 0),
                               'Track Uri': track['uri'],
                               'Playlist Owners Name': plValues['Playlist Owners Name'],
                               'Playlist Owners Id': plValues['Playlist Owners Id']
                               })

          if (track['type'] == 'episode'):  # a daily wellness playlist from spotify had a
            tracksList.append({'Track Id': track['id'],
                               'Playlist Id': plId,
                               'Playlist Name': plValues['Playlist Name'],
                               'Track Name': track['name'],
                               'Track Position': (str(trackCnt)).zfill(4),
                               'Album Name': track['show']['publisher'],
                               'Album Id': track['show']['id'],
                               'Artist Name': track['show']['name'] + ' (podcast)',
                               'Artist Id': track['show']['id'],
                               'Duration': track['duration_ms'],
                               'Duration Hms': this.msToHms(track['duration_ms'], 0),
                               'Track Uri': track['uri'],
                               'Playlist Owners Name': plValues['Playlist Owners Name'],
                               'Playlist Owners Id': plValues['Playlist Owners Id']
                               })

          trackCnt += 1
          dur += item['track']['duration_ms']
        idx += 100
        # print('track fetch loop idx = ', idx)

      # # updateTrackCnt is non zero during a Rm, Mp, Cp operation
      # # at one time updateTrackCnt was necessary because spotify was not returning unavailable tracks here, but # tracks in the get Pl call
      # # included unavailable tracks. this meant the number tracks on the plTab and the trackCnt here would not match. so we could not use
      # trackCnt and we had to just inc/dec the pl 'tracks' value to reflect the rm/mv/cp
      # if (updateTrackCnt != 0):
      #   nTracks = int(plValues['Tracks'])
      #   nTracks += updateTrackCnt;
      #   plValues['Tracks'] = str(nTracks)

      # it now appears we are getting unavailable tracks so the trackCnt will now match the pl tracks value
      plValues['Tracks'] = trackCnt

      # i am thinking we have to create this pl duration ourselves because spotify does not provide a total pl duration?
      plValues['Duration'] = this.msToHms(dur, 1)

      # - after tracks are removed the tracklist is deleted from the mPlTracksDict and refetched so it ends up in a different pos in the mPlTracksDict
      #   so we sort mPlTracksDict to get it back into order. we do this because do not want playlists swapping position in the dups tab after a remove
      session['mPlTracksDict'][plId] = tracksList
      sortedDict = collections.OrderedDict(sorted(session['mPlTracksDict'].items()))
      session['mPlTracksDict'] = sortedDict
      # print('>>loader.loadPlTracks1x() - plTracksAlreadyLoaded = ' + str(plTracksAlreadyLoaded))

      loadedPlIds = []
      for plId in session['mPlTracksDict']:
        loadedPlIds.append(plId)

      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mPlTracksDict.json', 'w') as f:
      #   json.dump(session['mPlTracksDict'], f)
      return [sfConst.errNone], loadedPlIds
    except Exception:
      # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5) see notes in: oAuthGetSpotifyObj()
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errLoadPlTracks1x, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Loading tracks for selected playlists failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, []

  # # ---------------------------------------------------------------
  # def loadPlTracks(this):
  #   # print('>>loader.loadPlTracks()')
  #   # mPlTracksDict['plId'] = trackList[]
  #   #   - one trackList[] for each playlist
  #   # trackList[] = each list entry is dict of track values
  #   #   - one track dict in the list for each track in the playlist
  #   #   - we are using a list because because a single playlist can have duplicates
  #
  #   try:
  #     # raise Exception('throwing loader.loadPlTracks()')
  #     plTracksAlreadyLoaded = 0
  #     for plSelectedId, plSelectedDictVals in session['mPlSelectedDict'].items():
  #       if plSelectedId in session['mPlTracksDict']:  # did we already loaded the tracks for the pl
  #         # print('>>loader.loadPlTracks() - skipping tracks in ' + plSelectedId + ', ' + plSelectedDictVals['Playlist Name'])
  #         plTracksAlreadyLoaded += 1
  #         continue
  #
  #       # print('>>loader.loadPlTracks() - fetching tracks in ' + plSelectedId + ', ' + plSelectedDictVals['Playlist Name'])
  #
  #       idx = 0
  #       dur = 0
  #       done = False
  #       tracksList = []
  #
  #       # lots of tracks have an available_markets list with 0 entries but not all
  #       # maybe we need to pass a market param (country code) in the .playlist_items() call and get back track linking info
  #
  #       plValues = session['mPlDict'].get(plSelectedId)  # need the ownerName and ownerId
  #       trackCnt = 0
  #       while (False == done):
  #         # spotify only returns 100 tracks at a time so we loop until we have them all
  #         # 'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
  #         # tracks = this.oAuthGetSpotifyObj().user_playlist_tracks(playlist_id=plId)
  #         # 'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
  #
  #         tracks = this.oAuthGetSpotifyObj().playlist_items(plSelectedId, limit=100, offset=idx)
  #         if (len(tracks['items']) < 100):
  #           done = True
  #
  #         for item in tracks['items']:
  #           if (item['track'] is None):
  #             continue;
  #
  #           track = item['track']
  #           # we do not have the users countryCode because we do not ask for that permission
  #           # if countryCode not in track['available_markets']:
  #           #   continue
  #
  #           # a daily wellness playlist from spotify had a podcast episode in the middle of a bunch of songs
  #           # we are ignoring podcast episodes.  track['type'] can be 'track' or 'episode'
  #           if (track['type'] != 'track'):  # a daily wellness playlist from spotify had a
  #             continue
  #           tracksList.append({'Track Id': track['id'],
  #                              'Playlist Id': plSelectedId,
  #                              'Playlist Name': plValues['Playlist Name'],
  #                              'Track Name': track['name'],
  #                              'Track Position': (str(trackCnt)).zfill(4),
  #                              'Album Name': track['album']['name'],
  #                              'Album Id': track['album']['id'],
  #                              'Artist Name': track['artists'][0]['name'],
  #                              'Artist Id': track['artists'][0]['id'],
  #                              'Duration': track['duration_ms'],
  #                              'Duration Hms': this.msToHms(track['duration_ms'], 0),
  #                              'Track Uri': track['uri'],
  #                              'Playlist Owners Name': plValues['Playlist Owners Name'],
  #                              'Playlist Owners Id': plValues['Playlist Owners Id']
  #                              })
  #
  #           trackCnt += 1
  #           dur += item['track']['duration_ms']
  #         idx += 100
  #         # print('track fetch loop idx = ', idx)
  #
  #       plValues['Duration'] = this.msToHms(dur, 1)
  #       session['mPlTracksDict'][plSelectedId] = tracksList
  #     # print('>>loader.loadPlTracks() - plTracksAlreadyLoaded = ' + str(plTracksAlreadyLoaded))
  #
  #     # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mPlTracksDict.json', 'w') as f:
  #     #   json.dump(session['mPlTracksDict'], f)
  #     return [sfConst.errNone]
  #   except Exception:
  #     exTyp, exObj, exTrace = sys.exc_info()
  #     retVal = [sfConst.errLoadPlTracks, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Loading tracks for selected playlists failed', str(exTyp), str(exObj)]
  #     this.addErrLogEntry(retVal)
  #     return retVal

  # ---------------------------------------------------------------
  def getTrackList(this, plId):
    try:
      # print('>>loader.getTrackList()')

      if len(session['mPlSelectedDict']) == 0:
        raise Exception('throwing loader.getTrackList() - no playlists selected')

      if plId not in session['mPlTracksDict']:
        raise Exception('throwning loader.getTrackList() - requested tracks not found for plId = ' + plId)

      trackList = session['mPlTracksDict'].get(plId)
      duration = session['mPlDict'].get(plId)['Duration']
      return [sfConst.errNone], trackList, duration
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, [], '0'

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # rmTracksByPos
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def rmTracksByPosFromSpotPlaylist(this, plId, spotRmTrackList):
    # print('>>loader.rmTracksByPosFromSpotPlaylist()')
    # spotRmTrackList uses spotify key names

    #  url         = 'https://api.spotify.com/v1/playlists/6llbMlPvjrSSy8NTLfBltc/tracks'
    #  method      = Delete
    #  header      = { 'User-Agent': 'python-requests/2.24.0', 'Accept-Encoding': 'gzip, deflate', 'Accept': '*/*', 'Connection': 'keep-alive',
    #                  'Authorization': 'Bearer BQB0t3dKk-DzTYWOF136n1MGj8sQGn.................................sy',
    #                  'Content-Type': 'application/json', 'Content-Length': '79'}
    #  body (json) = '{"tracks": [{"uri": "spotify:track:5dTuEVETmQ15gP2M8E5I45", "positions": 1}]}'

    try:
      # raise Exception('throwing loader.rmTracksByPosFromSpotPlaylist()')
      # since we are no longer reloading the playlists after a remove we can nolonger use snapshot id
      # we do reload the tracklist after each delete

      # plNm, pub, tn are fetched to make a more informative error msg
      plNm = 'not found'
      pub = 'not found'
      tn = f"rm list len = {len(spotRmTrackList)}"
      if plId in session['mPlDict']:
        plNm = session['mPlDict'][plId]['Playlist Name']
        pub = session['mPlDict'][plId]['Public']
      if len(spotRmTrackList) == 1:
        if plId in session['mPlTracksDict']:
          pos = spotRmTrackList[0]['positions'][0]
          tn = session['mPlTracksDict'][plId][pos]['Track Name']

      this.oAuthGetSpotifyObj().playlist_remove_specific_occurrences_of_items(plId, spotRmTrackList)
      del session['mPlTracksDict'][plId]
      retVal, loadedPlIds = this.loadPlTracks1x(plId)
      if retVal[sfConst.errIdxCode] != sfConst.errNone:
        return retVal
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errRmTracksByPosFromSpotPlaylist, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", f"Remove tracks from spotify playlist ({pub}:{plNm}:{tn}) by pos failed", str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def isTrackByPosInSpotRmTrackList(this, spotRmTrackList, trackUri, trackPosition):
    # print('>>loader.isTrackByPosInSpotRmTrackList()')
    for item in spotRmTrackList:
      if trackUri == item['uri']:
        if trackPosition == item['positions'][0]:
          return True
    return False

  # ---------------------------------------------------------------
  def rmTracksByPos(this, rmTrackList):
    # print('>>loader.rmTracksByPos()')

    try:
      # raise Exception('throwing loader.rmTracksByPos()')
      plIdsCompleted = []
      spotRmTrackList = []
      # raise Exception('throwing loader.rmTracksByPos()')
      for item1 in rmTrackList:  # for each unique plId in the list
        spotRmTrackList.clear()
        curPlId = item1['Playlist Id']
        if curPlId in plIdsCompleted:  # did we already find all the tracks for this playlist
          continue
        for item2 in rmTrackList:  # put all the tracks for this unique plId into a spotRmTrackList
          if curPlId != item2['Playlist Id']:  # is track in the pl we are currently working on
            continue
          # skip over tracks that are already in the spotRmTrackList match on uri and position
          if this.isTrackByPosInSpotRmTrackList(spotRmTrackList, item2['Track Uri'], item2['Track Position']) == False:
            spotRmTrackList.append({'uri': item2['Track Uri'], 'positions': [int(item2['Track Position'])]})

        # remove tracks for this unique plId
        retVal = this.rmTracksByPosFromSpotPlaylist(curPlId, spotRmTrackList)
        if retVal[sfConst.errIdxCode] != sfConst.errNone:
          return retVal
        plIdsCompleted.append(curPlId)
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errRmTracksByPos, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Remove tracks from playlist by pos failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # move copy Tracks
  # ---------------------------------------------------------------
  def cleanMvCpTrackList(this, plIdDest, trackList):
    # print('>>loader.cleanMvTrackList()')

    # if any of the tracks in the mvTrackList are already in the dest pl they are removed so we are creating dups in the dest pl
    if plIdDest not in session['mPlTracksDict']:
      raise Exception('throwning loader.cleanMvCpTrackList() - requested tracks not found for plId = ' + plId)

    plTrackList = session['mPlTracksDict'].get(plIdDest)

    trackListCleaned = []
    for trackId in trackList:
      fnd = False
      for track in plTrackList:
        if trackId == track['Track Id']:
          fnd = True
      if fnd == False:
        trackListCleaned.append(trackId)

    return trackListCleaned

  # ---------------------------------------------------------------
  def mvcpTracks(this, plIdDest, trackList):
    # print('>>loader.mvcpTracks()')

    #  url         = 'https://api.spotify.com/v1/playlists/6rfB2pTNv61ec3LiBV5SaK/tracks'
    #  method      = Post
    #  header      ={'Authorization': 'Bearer BQCDSMmq3w5RrX2..............',
    #                'Content-Type': 'application/json'}
    #  body (str) = ['spotify:track:4HbaSPG6qPH8PrBch3ojya', 'spotify:track:5dTuEVETmQ15gP2M8E5I45']

    try:
      # raise Exception('throwing loader.moveTracks()')
      trackListCleaned = this.cleanMvCpTrackList(plIdDest, trackList)
      if (len(trackListCleaned) > 0):
        newSnapshotId = this.oAuthGetSpotifyObj().playlist_add_items(plIdDest, trackListCleaned)
        del session['mPlTracksDict'][plIdDest]
        retVal, loadedPlIds = this.loadPlTracks1x(plIdDest)
        if retVal[sfConst.errIdxCode] != sfConst.errNone:
          return retVal
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errMvCpTracks, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'move/copy tracks to playlist failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # DupList
  #  - a list containing dictionaries
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------

  # ---------------------------------------------------------------
  def findDups(this, modePlaylist, modeSearch, durTimeDiff):
    # print('>>loader.findDups()')

    try:
      # raise Exception('throwing loader.findDups()')
      if (modeSearch == 'Track Id'):
        retVal = this.findDupsId(modePlaylist)

      if (modeSearch == 'Nad'):
        retVal = this.findDupsNad(modePlaylist, durTimeDiff)

      return retVal
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errFindDups, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'findDups failed.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def getDupsTrackList(this, modePlaylist, modeSearch):
    # print('>>loader.getDupsTrackList()')
    try:
      # raise Exception('throwing loader.getDupsTrackList()')
      dupsClrList = this.dupsRowBgClr(session['mDupsTrackList'], modePlaylist, modeSearch)
      return [sfConst.errNone], session['mDupsTrackList'], session['mNumDupsMatch'], dupsClrList
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetDupsTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, [], 0, []

  # ---------------------------------------------------------------
  def dupsRowBgClr(this, dupsTrackList, modePlaylist, modeSearch):
    # print('...tabDups.setRowBgClr()')

    r = 0
    clrIdx = 0
    colors = [0, 1]

    dupsClrList = []
    if len(dupsTrackList) == 0:
      return dupsClrList

    if modePlaylist == 'Across':  # color flip every two rows
      for dupTrk in dupsTrackList:
        if r % 2 == 0: clrIdx ^= 1
        dupsClrList.append(colors[clrIdx])
        r += 1

    if modePlaylist == 'Same':
      trigger = 'Track Id' # color flip when the track id changes
      if modeSearch == 'Nad':  # color flip when the track name changes
        trigger = 'Track Name'

      lastDupTrk = dupsTrackList[0]
      for dupTrk in dupsTrackList:
        if lastDupTrk[trigger] != dupTrk[trigger] or lastDupTrk['Playlist Id'] != dupTrk['Playlist Id']:
          clrIdx ^= 1
        dupsClrList.append(colors[clrIdx])
        lastDupTrk = dupTrk

    return dupsClrList

  # ---------------------------------------------------------------
  def isDupAlreadyInDupListId(this, ltkVals, rtkVals):
    lFnd = False
    lPlId = ltkVals['Playlist Id']
    lTrkId = ltkVals['Track Id']
    for item in session['mDupsTrackList']:
      if item['Playlist Id'] == lPlId:
        if item['Track Id'] == lTrkId:
          lFnd = True

    if False == lFnd:
      return False

    rFnd = False
    rPlId = rtkVals['Playlist Id']
    rTrkId = rtkVals['Track Id']
    for item in session['mDupsTrackList']:
      if item['Playlist Id'] == rPlId:
        if item['Track Id'] == rTrkId:
          rFnd = True

    if rFnd == False:
      return False

    return True

  # ---------------------------------------------------------------
  def isTrkAlreadyInDupListNad(this, ltkVals):
    for item in session['mDupsTrackList']:
      if item['Playlist Id'] == ltkVals['Playlist Id']:
        if item['Track Id'] == ltkVals['Track Id']:
          if item['Track Position'] == ltkVals['Track Position']:
            return True
    return False

  # ---------------------------------------------------------------
  # @profile
  def findDupsId(this, modePlaylist):
    # print('>>loader.findDupsId() match on Track Id')

    try:
      session['mDupsTrackList'].clear()
      session['mNumDupsMatch'] = 0
      leftPlTracksDict = this.getPlTracksDict()
      rightPlTracksDict = this.getPlTracksDict()

      # raise Exception('throwing loader.findDupsId()')

      if modePlaylist == 'Across':
        # look for dups across selected playlists (same song in more than one playlist)
        #   example with 4 playlists to compare
        #    - pass 1 compare 1 to 2, 1 to 3, 1 to 4
        #    - pass 2 compare 2 to 3, 3 to 4
        #    - pass 3 compare 3 to 4
        #    - pass 4 compare nothing
        lvl = 0
        for lplId, lplTrackList in leftPlTracksDict.items():
          lvl += 1
          lvlCnt = 0
          if lplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
            continue
          for rplId, rplTrackList in rightPlTracksDict.items():
            if lvl > lvlCnt:
              lvlCnt += 1
              continue
            if rplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
              continue
            # print('>>comparing lplId: ' + lplTrackList[0]['Playlist Name'] + ' to rplId: ' + rplTrackList[0]['Playlist Name'])
            for ltkVals in lplTrackList:
              for rtkVals in rplTrackList:
                if ltkVals['Track Id'] == rtkVals['Track Id']:
                  # if this.isDupAlreadyInDupListId(ltkVals, rtkVals) == False:
                  session['mDupsTrackList'].append(ltkVals)
                  session['mDupsTrackList'].append(rtkVals)
                  session['mNumDupsMatch'] += 1

      if modePlaylist == 'Same':
        # look for dups in a playlist, for each selected playlist  (same song 2 or more times in a playlist)
        trkList = []
        for lplId, lplTrackList in leftPlTracksDict.items():
          if lplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
            continue

          trkList.clear()  # create a list of the tracks in this playlist
          for ltkVals in lplTrackList:
            trkList.append(ltkVals['Track Id'])

          cntDict = dict(Counter(trkList))  # count the # of times each track appears in the list
          for key, val in cntDict.items():
            if val > 1:
              session['mNumDupsMatch'] += 1
              for ltkVals in lplTrackList:
                if (ltkVals['Track Id']) == key:
                  session['mDupsTrackList'].append(ltkVals)


      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mDupsTrackList.json', 'w') as f:
      #   json.dump(session['mDupsTrackList'], f)
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errFindDupsId, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Finding dups by track id failed.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def findDupsNad(this, modePlaylist, durTimeDiff):
    # print('>>loader.findDupsNad()  match on TrackName/ArtistName/Duration')

    try:
      session['mDupsTrackList'].clear()
      session['mNumDupsMatch'] = 0
      leftPlTracksDict = this.getPlTracksDict()
      rightPlTracksDict = this.getPlTracksDict()
      durTimeDiffInt = int(durTimeDiff) * 1000

      # raise Exception('throwing loader.findDupsNad()')

      if modePlaylist == 'Across':
        # look for dups across selected playlists (same song in more than one playlist)
        #   example with 4 playlists to compare
        #    - pass 1 compare 1 to 2, 1 to 3, 1 to 4
        #    - pass 2 compare 2 to 3, 3 to 4
        #    - pass 3 compare 3 to 4
        #    - pass 4 compare nothing
        lvl = 0
        for lplId, lplTrackList in leftPlTracksDict.items():
          lvl += 1
          lvlCnt = 0
          if lplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
            continue
          for rplId, rplTrackList in rightPlTracksDict.items():
            if lvl > lvlCnt:
              lvlCnt += 1
              continue
            if rplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
              continue
            # print('>>comparing lplId: ' + lplTrackList[0]['Playlist Name'] + ' to rplId: ' + rplTrackList[0]['Playlist Name'])
            for ltkVals in lplTrackList:
              for rtkVals in rplTrackList:
                if ltkVals['Track Id'] != rtkVals['Track Id']:
                  if ltkVals['Track Name'] == rtkVals['Track Name']:
                    if ltkVals['Artist Name'] == rtkVals['Artist Name']:
                      if abs(ltkVals['Duration'] - rtkVals['Duration']) <= durTimeDiffInt:
                        # if this.isDupAlreadyInDupIdList(ltkVals, rtkVals) == False:
                        session['mDupsTrackList'].append(ltkVals)
                        session['mDupsTrackList'].append(rtkVals)
                        session['mNumDupsMatch'] += 1

      if modePlaylist == 'Same':
        # look for dups in a playlist, for each selected playlist  (same song 2 or more times in a playlist)
        trkList = []
        for lplId, lplTrackList in leftPlTracksDict.items():
          if lplId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
            continue

          ix = 0
          for ltkVals in lplTrackList:
            ix +=1
            for x in range(ix, len(lplTrackList)):
              ntkVals = lplTrackList[x]
              if ltkVals['Track Id'] != ntkVals['Track Id']:
                if ltkVals['Track Name'] == ntkVals['Track Name']:
                  if ltkVals['Artist Name'] == ntkVals['Artist Name']:
                    # val = abs(ltkVals['Duration'] - ntkVals['Duration'])
                    if abs(ltkVals['Duration'] - ntkVals['Duration']) <= durTimeDiffInt:
                      session['mNumDupsMatch'] += 1
                      if this.isTrkAlreadyInDupListNad(ltkVals) == False:
                        session['mDupsTrackList'].append(ltkVals)
                      if this.isTrkAlreadyInDupListNad(ntkVals) == False:
                        session['mDupsTrackList'].append(ntkVals)

      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mDupsTrackList.json', 'w') as f:
      #   json.dump(session['mDupsTrackList'], f)
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errFindDupsNad, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Finding dups by track name/artist name/duration failed.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # ArtistDict and ArtistTrackList
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def getArtistDict(this):
    try:
      # print('>>loader.getArtistDict()')
      # raise Exception('throwing loader.getArtistDict()')
      return [sfConst.errNone], session['mArtistDict'], session['mPlSelectedDict']
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetArtistDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, [], []

  # ---------------------------------------------------------------
  def getArtistTrackList(this):
    try:
      # print('>>loader.getArtistTrackList()')
      # raise Exception('throwing loader.getArtistTrackList()')
      return [sfConst.errNone], session['mArtistTrackList']
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetArtistTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Session Invalid??', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, []

  # ---------------------------------------------------------------
  def loadArtistDict(this):
    # print('>>loader.loadArtistDict()')

    try:
      # raise Exception('throwing loader.loadArtistDict()')
      session['mArtistDict'].clear()
      plTracksDict = this.getPlTracksDict()

      toBeSortedDict = {}
      for plId, plTrackList in plTracksDict.items():
        if plId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
          continue
        for trkVals in plTrackList:
          if (trkVals['Artist Id'] is None):
            continue
          toBeSortedDict[trkVals['Artist Id']] = trkVals['Artist Name']

      sortedList = sorted(toBeSortedDict.items(), key=itemgetter(1))
      session['mArtistDict'] = collections.OrderedDict(sortedList)

      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mArtistDict.json', 'w') as f:
      #   json.dump(session['mArtistDict'], f)
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errLoadArtistDict, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to create artist list from selected playlists.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def loadArtistTrackList(this, artistId):
    # print('>>loader.loadArtistTrackList()')
    try:
      # raise Exception('throwing loader.loadArtistTrackList()')
      session['mArtistTrackList'].clear()
      plTracksDict = this.getPlTracksDict()

      for plId, plTrackList in plTracksDict.items():
        if plId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
          continue
        for trkVals in plTrackList:
          if artistId == trkVals['Artist Id']:
            session['mArtistTrackList'].append(trkVals)

      # with open('C:/Users/lfg70/.aa/LFG_Code/Python/Prj_SpotifyFinder/.lfg_work_dir/mArtistTrackList.json', 'w') as f:
      #   json.dump(session['mArtistTrackList'], f)
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errLoadArtistTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Failed to create track list for selected artists.', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # SearchList
  #  - a list containing dictionaries
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def clearSearchTrackList(this):
    # print('>>loader.clearSearchTrackList()')
    try:
      # raise Exception('throwing loader.clearSearchTrackList()')
      session['mSearchTrackList'].clear()
      session['mNumSearchMatches'] = 0
      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errClearSearchTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'clear search track list failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def searchAddTrack(this, trackId_plId_List, track):
    # print('>>loader.searchAddTrack()')

    trackId_plId = track['Track Id'] + '_' + track['Playlist Id']
    if (trackId_plId not in trackId_plId_List):
      trackId_plId_List.append(trackId_plId)
      session['mSearchTrackList'].append(track)
      session['mNumSearchMatches'] += 1

  # ---------------------------------------------------------------
  def runSearch(this, searchText, ckTrackName, ckArtistName, ckAlbumName, ckPlaylistName, ckDurationHms, ckTrackId):
    # print('>>loader.runSearch()')

    try:
      # raise Exception('throwing loader.runSearch()')
      trackId_plId_List = []
      session['mSearchTrackList'].clear()
      session['mNumSearchMatches'] = 0
      searchText = searchText.lower()

      plTracksDict = this.getPlTracksDict()
      for plId, plTrackList in plTracksDict.items():
        if plId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
          continue
        for track in plTrackList:
          if track['Track Id'] is None:
            continue
          if (ckTrackName):
            if searchText in track['Track Name'].lower():
              this.searchAddTrack(trackId_plId_List, track)
          if (ckArtistName):
            if searchText in track['Artist Name'].lower():
              this.searchAddTrack(trackId_plId_List, track)
          if (ckAlbumName):
            if searchText in track['Album Name'].lower():
              this.searchAddTrack(trackId_plId_List, track)
          if (ckPlaylistName):
            if searchText in track['Playlist Name'].lower():
              this.searchAddTrack(trackId_plId_List, track)
          if (ckDurationHms):
            if searchText in track['Duration Hms'].lower():
              this.searchAddTrack(trackId_plId_List, track)
          if (ckTrackId):
            if searchText in track['Track Id'].lower():
              this.searchAddTrack(trackId_plId_List, track)

      sortedList = sorted(session['mSearchTrackList'], key=itemgetter('Track Id'))
      session['mSearchTrackList'] = sortedList
      # pprint.pprint(sortedList)

      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errRunSearch, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'search failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal

  # ---------------------------------------------------------------
  def getSearchTrackList(this):
    # print('>>loader.getSearchTrackList()')
    try:
      # raise Exception('throwing loader.getSearchTrackList()')
      numTracksInSelectedPl = 0
      plTracksDict = this.getPlTracksDict()
      for plId, plTrackList in plTracksDict.items():
        if plId not in session['mPlSelectedDict']:  # only look at tracks that are in the selected pl's
          continue

        plValues = session['mPlDict'].get(plId)
        numTracksInSelectedPl += int(plValues['Tracks'])

      return [sfConst.errNone], session['mSearchTrackList'], session['mNumSearchMatches'], session['mPlSelectedDict'], numTracksInSelectedPl
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errGetSearchTrackList, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'get search track list failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal, [], [], [], 0,

  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  # rmTracksById
  # ---------------------------------------------------------------
  # ---------------------------------------------------------------
  def rmTracksById(this, plId, rmTrackList, reload):
    # print('>>loader.rmTracksById()')

    # this is currently coded to assume
    #   - rmTrackList is an array of dicts  { 'Playlist Id": plId, 'Track Id': trkId }
    #   - rmTrackList has up to 100 entries, spotify has a 100 track remove limit, you must call in bactches of 100 or less
    #   - all duplicate track ids have previously been removed, the list is a unique list of track ids
    #   - all tracks are in the same pl but could be upgraded to detect different plId's like rmTracksByPos

    #  url         = 'https://api.spotify.com/v1/playlists/4cMO7GcKEwsfDwhmzczuMz/tracks'
    #  method      = Delete
    #  header      = { 'User-Agent': 'python-requests/2.25.1', 'Accept-Encoding': 'gzip, deflate', 'Accept': '*/*', 'Connection': 'keep-alive',
    #                  'Authorization': 'Bearer BQCk60Nw6CrP-Ln0JWSnpJE1Z6jDQkQ.....mY', 'Content-Type':
    #                  'application/json', 'Content-Length': '1188'}
    #  body (json) = {"tracks": [{"uri": "spotify:track:5HuAzrXrJV7gINMZ39CygH"}, {"uri": "spotify:track:3GLKuZMs9FHwoO9su6ZB5P"}]}

    try:
      # raise Exception('throwing loader.rmTracksById()')
      # originally we rxd a list of track ids but when adding support for episodes we now rxd a list of track uri's
      # this spotipy api adds one 'tracks': prefix and a 'uri': prefix for each track uri
      this.oAuthGetSpotifyObj().playlist_remove_all_occurrences_of_items(plId, rmTrackList)

      # this method can be call in a loop in order to delete more than 100 tracks
      # on the last call to this method the reload value is set to the total # of tracks removed
      # if reload > 0 then refetch the tracks for this pl from spotify
      if (reload):
        del session['mPlTracksDict'][plId]
        retVal, loadedPlIds = this.loadPlTracks1x(plId)
        if retVal[sfConst.errIdxCode] != sfConst.errNone:
          return retVal
      return [sfConst.errNone]

    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errRmTracksById, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'Remove tracks from playlist by playlist id failed', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal



  # ---------------------------------------------------------------
  def playTracks(this, trackUris):
    # print('>>loader.playTracks()')
    try:
      # experimental code for a potential play btn feature

      # raise Exception('throwing loader.playTracks()')

      # print('>>loader.playTracks() - making a call to spotify')
      # this.oAuthGetSpotifyObj().start_playback(context_uri='spotify:playlist:6rfB2pTNv61ec3LiBV5SaK', uris=trackUris)

      # need to pass in a device id    (spotifyfinder app would need to get a list of device ids)
      # need to pass in a playlist uri (spotifyfinder app would need to add playlist uri to the return track info)
      #                                (this is needed for the Prj_Wifi_Display so it can display a playlist name, wdaLoader.getCurrentlyPlaying needs a playlist)
      # need to pass in an array of track uri's  (
      this.oAuthGetSpotifyObj().start_playback(device_id='307f858f43f7fc5961086511711646cac4455a4a', context_uri='spotify:playlist:0A4Apj44H0qVVyDdShxS9C')

      return [sfConst.errNone]
    except Exception:
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errPlayTracks, this.getDateTm(), f"{this.fNm(this)}:{exTrace.tb_lineno}", 'error when trying to start playback', str(exTyp), str(exObj)]
      this.addErrLogEntry(retVal)
      return retVal,

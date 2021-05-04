# constant declarations

# ---------------------------------------------------------------
# errors returned by loader
errNone = 1

errSessionTimeOut = -742
errSpotiyLogin = -1
errLoadPlDict = -2
errSetPlSelectedDict = -3
errLoadPlTracks = -4
errRmTracksFromSpotPlaylist = -5
errRemoveTracks = -6
errFindDupsId = -7
errFindDupsNad = -8
errLoadArtistDict = -9
errLoadArtistTrackList = -10
errSpotifyInfo = -11
errCfgFile = -12
errGetPlSelectedDict = -13
errGetTrackList = -14
errGetCntrs = -15
errGetPlDict = -16
errIncPlSelectionCntr = -17
errGetErrLog = -18
errGetInfoHtml = -19
errGetArtistDict = -20
errGetArtistTrackList = -21
errFindDups = -22
errGetDupsTrackList = -23
errSqlErr = -24
errMvCpTracks = -25


# ---------------------------------------------------------------
# err log entry values
errIdxCode = 0 # [0] = int,            errNone or err constant, see seConst
errIdxDate   = 1 # [1] = string,         date time
errIdxMethod = 2 # [2] = string,         method in which error occurred
errIdxDesc   = 3 # [3] = string,         description of error for display
errIdxTup1   = 4 # [4] = string or None, tupleExc[0] from sys.exc_info()
errIdxTup2   = 5 # [5] = string or None, tupleExc[1] from sys.exc_info()
errIdxTup3   = 6 # [6] = string or None, tupleExc[2] from sys.exc_info()

# ---------------------------------------------------------------
# general constants
c30seconds = 30000



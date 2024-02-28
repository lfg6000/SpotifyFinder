
# on 2/27/24 mv and cp tracks broke
# started getting 400 No uris provided errors
#
# see:
#  https://github.com/spotipy-dev/spotipy/issues/1075
#  https://community.spotify.com/t5/Spotify-for-Developers/Add-Tracks-to-Playlist-Changed-No-URIs-Provided-error/m-p/5911503#M12867
#
#
# the spotify server appears to no longer accept
# items = ['spotify:track:6HG5MFydepB9F8DAP0ejDD', 'spotify:track:3yQ4dy23XekcMsdeaBXZR6']
#
# you must now pass in
# items = {'uris': ['spotify:track:6HG5MFydepB9F8DAP0ejDD', 'spotify:track:3yQ4dy23XekcMsdeaBXZR6']}


# i hand edited these two files on the pyAny server and local server

# this is the old version
def mvcpTracks(this, plIdDest, trackList):
  this.oAuthGetSpotifyObj().playlist_add_items(plIdDest, addList)


# patch #1 to loader.py --- this is the patched version
# -----------------------------------------------------
# file location on pyAny
#       https://www.pythonanywhere.com/user/slipstreamcode/files/home/slipstreamcode/mysite
# file location on the local server
#       C:\Users\lfg70\.aa\LFG_Code\Python\WA_SpotifyFinder\sfLoader.py
def mvcpTracks(this, plIdDest, trackList):
  addDict = {'uris': addList}
  this.oAuthGetSpotifyObj().playlist_add_items(plIdDest, addDict)


# this is the old version that needs a patch
def playlist_add_items(self, playlist_id, items, position=None):
  plid = self._get_id("playlist", playlist_id)
  ftracks = [self._get_uri("track", tid) for tid in items]
  return self._post(
    "playlists/%s/tracks" % (plid),
    payload=ftracks,
    position=position,
  )

# patch #2 to client.py --- this is the patched version
# -----------------------------------------------------
# file location on pyAny
#     https://www.pythonanywhere.com/user/slipstreamcode/files/home/slipstreamcode/.local/lib/python3.9/site-packages/spotipy
# file location on the local server
#     C:\Users\lfg70\.aa\LFG_Code\Python\WA_SpotifyFinder\venv39\Lib\site-packages\spotipy\client.py
def playlist_add_items(self, playlist_id, items, position=None):
  plid = self._get_id("playlist", playlist_id)
  # ftracks = [self._get_uri("track", tid) for tid in items]
  ftracks = items
  return self._post(
    "playlists/%s/tracks" % (plid),
    payload=ftracks,
    # position=position,
  )
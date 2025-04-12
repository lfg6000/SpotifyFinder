from flask import session
import sys, time, inspect
import sfLoader, sfConst, sfTestData


# ---------------------------------------------------------------
class SpfTester():
  def __init__(this, oLoader, **kwargs):
    this.oLoader: sfLoader.SpfLoader = oLoader
    this.testsRan = []
    this.plNmT1 = 't1'
    this.plNmT2 = 't2'

  # ---------------------------------------------------------------
  def getLn(this):
    return inspect.currentframe().f_back.f_lineno

  # ---------------------------------------------------------------
  def runTest(this, testIndex):

    try:
      print(f"runTest: testIndex = {testIndex}")
      if testIndex == 0:
        retVal = this.runTest0()
      elif testIndex == 1:
        retVal = this.runTest1()
      elif testIndex == 2:
        retVal = this.runTest2()
      elif testIndex == 3:
        retVal = this.runTest3()
      elif testIndex == 4:
        retVal = this.runTest4()
      elif testIndex == 5:
        retVal = this.runTest5()
      elif testIndex == 6:
        retVal = this.runTest6()
      elif testIndex == 7:
        retVal = this.runTest7()
      elif testIndex == 8:
        retVal = this.runTest8()
      else:
        retVal = [sfConst.errRunTest, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"runTest() failed: index error", '', '']

      return retVal

    except Exception:
      # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5) see notes in: oAuthGetSpotifyObj()
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [sfConst.errRunTest, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{exTrace.tb_lineno}", 'runTest() caught a test exception', str(exTyp), str(exObj)]
      # this.addErrLogEntry(retVal)
      return retVal



  #-----------------------------------------------------------------------------------------------
  def tLoadPlDict(this):
    idx = 0
    done = False
    while (done == False):
      retVal, nPlRxd = this.oLoader.loadPlDictBatch(idx,True)
      idx += nPlRxd
      if (nPlRxd < 50):
        done = True

  #-----------------------------------------------------------------------------------------------
  def tIsPlNmInPlDict(this, plNm, plDict):
    for plId, plVals in plDict.items():
      nm = plVals['Playlist Name']
      if plNm in plVals['Playlist Name']:
        return plId
    return ''

  # ---------------------------------------------------------------
  # delete t1 and t2 test
  def runTest1(this):
    try:
      tNm = 'runTest1()'
      errConst = sfConst.errTest101
      print(f"{tNm} - enter")

      delCnt = 0
      this.tLoadPlDict()
      retVal1, plDict1, plDictLen1, totalTrackCnt1, plOwnerList1 = this.oLoader.getPlDict()
      print(f"pl dict len = {plDictLen1}, totalTrackCnt = {totalTrackCnt1}")

      # if pl t1 is present del it, then verify it was removed
      plId = this.tIsPlNmInPlDict(this.plNmT1, plDict1)
      if (plId != ''):
        this.oLoader.deletePlaylist(this.plNmT1, plId)
        delCnt +=1
      plId = this.tIsPlNmInPlDict(this.plNmT1, plDict1)
      if plId != '':
        retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: delete {this.plNmT1} pl failed", '', '']
        return retVal

      # if pl t2 is present del it, then verify it was removed
      plId = this.tIsPlNmInPlDict(this.plNmT2, plDict1)
      if (plId != ''):
        this.oLoader.deletePlaylist(this.plNmT2, plId)
        delCnt += 1
      plId = this.tIsPlNmInPlDict(this.plNmT2, plDict1)
      if plId != '':
        retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: delete {this.plNmT2} pl failed", '', '']
        return retVal

      this.tLoadPlDict()
      retVal2, plDict2, plDictLen2, totalTrackCnt2, plOwnerList2 = this.oLoader.getPlDict()

      delta = plDictLen1 - plDictLen2
      if delta != delCnt:
        retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: plDict len error", f"startLen {plDictLen1}, endLen {plDictLen2}, delCnt {delCnt}", '']
        return retVal

      return [sfConst.errNone]

    except Exception:
      # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5) see notes in: oAuthGetSpotifyObj()
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{exTrace.tb_lineno}", f"{tNm} failed: exception", str(exTyp), str(exObj)]
      # this.addErrLogEntry(retVal)
      return retVal
    finally:
      print(f"{tNm} - exit")


  # ---------------------------------------------------------------
  # create t1 test
  def runTest2(this):
    try:
      tNm = 'runTest2()'
      errConst = sfConst.errTest102
      print(f"{tNm} - enter")

      # array of ['spotify:track:1GOqp37rfWyCwXLJw5pa9p',...]
      t1Tl = []
      for trkId in sfTestData.t3x9:
        t1Tl.append('spotify:track:' + trkId)

      retVal, plIdT1 = this.oLoader.createPlaylist(this.plNmT1, t1Tl)
      if retVal[0] != 1:
        retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: err in createPlaylist(), t3x9 pl", '', '']
        return retVal

      print(f"plIdT1 = {plIdT1}")
      time.sleep(8.0)

      this.tLoadPlDict()
      retVal, trks = this.oLoader.loadPlTracks1x(plIdT1)
      if retVal[0] != 1:
        retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: loadPlTracks1x failed", '', '']
        return retVal

      return [sfConst.errNone]

    except Exception:
      # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5) see notes in: oAuthGetSpotifyObj()
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{exTrace.tb_lineno}", f"{tNm} failed: exception", str(exTyp), str(exObj)]
      # this.addErrLogEntry(retVal)
      return retVal
    finally:
      print(f"{tNm} - exit")

  # ---------------------------------------------------------------
  # delete tracks test
  def runTest3(this):
    try:
      tNm = 'runTest3()'
      errConst = sfConst.errTest103
      print(f"{tNm} - enter")

      # [{'Playlist Id': '6WJVHNvnOymndmThui3F7r', 'Track Uri': 'spotify:track:0TNV1Lsc32VP21mIcKWBAE', 'Track Position': 1},
      this.tLoadPlDict()
      retVal1, plDict1, plDictLen1, totalTrackCnt1, plOwnerList1 = this.oLoader.getPlDict()
      print(f"pl dict len = {plDictLen1}, totalTrackCnt = {totalTrackCnt1}")

      # verify t1 pl is present
      plIdT1 = this.tIsPlNmInPlDict(this.plNmT1, plDict1)
      if (plIdT1 == ''):
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: t1 pl missing", '', '']
      print(f"plIdT1 = {plIdT1}")

      retVal, loadedPls = this.oLoader.loadPlTracks1x(plIdT1)
      if retVal[0] != 1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: load tracks {this.plNmT1} failed", '', '']

      # mod1
      # ---------------------------------------------------------------------
      # t1 has 9 tracks that repeat 3 times
      # del the trk 2 from the first set of 9 leaving trk 2 in set 2 and set 3
      rmTl = []
      trk2 = '3BY9nCO4DwUFraxBlWcIWN'
      rmTl.append({'Playlist Id': f"{plIdT1}", 'Track Uri': f"spotify:track:{trk2}", 'Track Position': 2})
      retVal, plNm = this.oLoader.rmTracksByPos(rmTl)
      if retVal[0] != 1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod1 - delete trk 2 {plNm}:{trk2} failed", '', '']
      time.sleep(4.0)

      this.tLoadPlDict()
      retVal, loadedPls = this.oLoader.loadPlTracks1x(plIdT1)
      if retVal[0] != 1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod - load modified tracks {this.plNmT1} failed", '', '']

      trkDictMod1 = session['mPlTracksDict'].get(plIdT1)
      trksMod1 = []
      for trks in trkDictMod1:
        trksMod1.append(trks['Track Id'])

      if len(sfTestData.t3x9mod1) != len(trksMod1):
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod1 - test len error", f"t3x9mod1 len{len(sfTestData.t3x9mod1)}", f"trksMod1 = {len(trksMod1)}"]

      if sfTestData.t3x9mod1 != trksMod1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod1 -sfTestData.t3x9mod1 and trksMod1 are not identical", f"", f""]

      # mod2 starts with
      # ---------------------------------------------------------------------
      # t1 started of with 9 tracks that repeat 3 times
      # del 1 track from set 2 and 2 trks from set 3
      rmTl = []
      trk10 = '3BY9nCO4DwUFraxBlWcIWN'
      rmTl.append({'Playlist Id': f"{plIdT1}", 'Track Uri': f"spotify:track:{trk10}", 'Track Position': 10})
      trk17 = '1GOqp37rfWyCwXLJw5pa9p'
      rmTl.append({'Playlist Id': f"{plIdT1}", 'Track Uri': f"spotify:track:{trk17}", 'Track Position': 17})
      trk25 = '0bB92YSQEmA9WfAaXjYbKP'
      rmTl.append({'Playlist Id': f"{plIdT1}", 'Track Uri': f"spotify:track:{trk25}", 'Track Position': 25})

      retVal, plNm = this.oLoader.rmTracksByPos(rmTl)
      if retVal[0] != 1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod2 - delete trks {plNm} failed", '', '']
      time.sleep(4.0)

      this.tLoadPlDict()
      retVal, loadedPls = this.oLoader.loadPlTracks1x(plIdT1)
      if retVal[0] != 1:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod2 - load modified tracks {this.plNmT1} failed", '', '']

      trkDictMod2 = session['mPlTracksDict'].get(plIdT1)
      trksMod2 = []
      for trks in trkDictMod2:
        trksMod2.append(trks['Track Id'])

      if len(sfTestData.t3x9mod2) != len(trksMod2):
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod2 - test len error", f"t3x9mod2 len{len(sfTestData.t3x9mod2)}", f"trksMod2 = {len(trksMod2)}"]

      if sfTestData.t3x9mod2 != trksMod2:
        return [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{this.getLn()}", f"{tNm} failed: mod2 - sfTestData.t3x9mod2 and trksMod2 are not identical", f"", f""]

      return [sfConst.errNone]

    except Exception:
      # error: HTTPSConnectionPool(host='api.spotify.com', port=443): Read timed out. (read 'timeout=5) see notes in: oAuthGetSpotifyObj()
      exTyp, exObj, exTrace = sys.exc_info()
      retVal = [errConst, this.oLoader.getDateTm(), f"{this.oLoader.fNm(this)}:{exTrace.tb_lineno}", f"{tNm} failed: exception", str(exTyp), str(exObj)]
      # this.addErrLogEntry(retVal)
      return retVal
    finally:
      print(f"{tNm} - exit")

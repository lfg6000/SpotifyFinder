
  var vUrl;
  var vLastPlSelectionCntr = 0;
  var vCurPlSelectionCntr = 1;
  var vCurTracksRmMvCpCntr = 1;
  var vRedrawNeeded = [0,0,0,0,0];
  var vAborting = 0;
  var vProgressBarTmr = null;
  var vProgBar = null;
  var vLblId = null;
  var vSpotifyRmLimit = 100;
  var vSpotifyRmLimitMsg = "Spotify limit: max of 100 tracks per request.";
  var vShowExeTm = 0;
  const cbMvDestDefault = '     Select A Destination Playlist     ';


  //-----------------------------------------------------------------------------------------------
  // leave this commented out - show cursor position in browser console log
  // var pointerX = -1; var pointerY = -1;
  // document.onmousemove = function(event) { pointerX = event.pageX; pointerY = event.pageY; }
  // setInterval(pointerCheck, 1000);
  // function pointerCheck() { console.log('Cursor at: '+pointerX+', '+pointerY);}
  //-----------------------------------------------------------------------------------------------


  //
  // regex search to find await and _af on the same line .*?await.*?_af.*?
  //
  //-----------------------------------------------------------------------------------------------
  function tabs_documentReady() { /* make function appear in pycharm structure list */ }
  $(document).ready(function()
  {
    // - called on initial load
    // - called on a refresh
    // - all the tables are initialized

    vUrl = window.location.href;
    console.log('__SF__tabs_document.ready() ***** enter ***** vUrl = ' + vUrl);

    // - the tables resize horizntally at runtime
    // - the tables do not resize vertically at runtime
    // - we set the table scrolly height at init to take advantage of the current size of the browser window
    // - you can listen to doc resize events at runtime but to change the scrolly height at runtime the
    //   table must be destroyed and rebuilt on each resize

    // - this example does a runtime resize by destroying and rebuilding the table - we have opted not to do this
    // https://datatables.net/forums/discussion/50816/changing-datatable-scrolly-to-fill-parents-space

    // - getting the client window height
    // https://stackoverflow.com/questions/1145850/how-to-get-height-of-entire-document-with-javascript/44077777
    console.log('__SF__tabs_document.ready() docElement client witdh/height = ' + document.documentElement.clientWidth + '/' +  document.documentElement.clientHeight);


    // attempting to set the table scrolly to use most of the browser client window height
    tableHeight = document.documentElement.clientHeight-264;

    infoTab_addClientLogMsg(['SpotifyFinder', 'Started']);

    plTab_init(tableHeight);
    plTab_redraw();

    // simulate a playlist tab click to load the tab calls tabs_afSwitchTabs()
    $("#btnPlTab")[0].click(); // document.getElementById("btnPlTab").click();

    tracksTab_init(tableHeight);
    dupsTab_init(tableHeight);
    artistsTab_init(tableHeight);
    searchTab_init(tableHeight);
    infoTab_init(tableHeight+125);

    $(window).resize(function()
    {
      // console.log('__SF__>>>>>>>>>>>>>>>> reize()')
      vRedrawNeeded = [1,1,1,1,1];
    });

    // console.log('__SF__tab_document.ready() ***** exit *****')
  });

  //-----------------------------------------------------------------------------------------------
  async function tabs_afSwitchTabs(evt, tabName)
  {
    try
    {
      // console.log('__SF__tabs_afSwitchTabs() - enter', evt, tabName);

      if (tabName !== 'Info') // allow tab switch to info page on err even if loading is true
      {
        if ((tabName !== 'PlayLists') && (vPlTabActivated === 0))
        {
          // let the initial load of the plTab complete before allowing a switch to another tab
          return;
        }
        if (vPlTabLoading === true)
        {
          $("#plTab_info2").text("Playlist Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#plTab_info3").text('');
          }, 4500);
          return;
        }
        if ((tabName !== 'PlayLists') && (plTabs_getSelectedCnt() == 0))
        {
          alert('At least one playlist must be selected on the \'Playlist Tab\' before switching tabs.');
          return;
        }

        if (vTracksTabLoading === true)
        {
          $("#tracksTab_info3").text("Tracks Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#tracksTab_info3").text('');
          }, 4500);
          return;
        }
        if (vDupsTabLoading === true)
        {
          $("#dupsTab_info3").text("Duplicates Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#dupsTab_info3").text('');
          }, 4500);
          return;
        }
        if (vArtistsTabLoading === true)
        {
          $("#artistsTab_info3").text("Artists Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#artistsTab_info3").text('');
          }, 4500);
          return;
        }
        if (vSearchTabLoading === true)
        {
          $("#searchTab_info3").text("Search Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#searchTab_info3").text('');
          }, 4500);
          return;
        }
      }

      let i, tabcontent, tablinks;

      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++)
        tabcontent[i].style.display = "none";

      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++)
        tablinks[i].className = tablinks[i].className.replace(" active", "");

      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";

      if (tabName === 'Info')
      {
        infoTab_activate();
        return;
      }

      // console.log('__SF__tabs_afSwitchTabs() - switching tab to = ' + tabName);
      // var cookies = document.cookie; // only works if SESSION_COOKIE_HTTPONLY is false
      // console.log('__SF__cookies = ', cookies)

      if (vLastPlSelectionCntr !== vCurPlSelectionCntr)
      {
        // console.log('__SF__tabs_afSwitchTabs() - pl list selection cnt has changed - updating plSelectedDict');
        vLastPlSelectionCntr = vCurPlSelectionCntr;
        await plTab_afUpdatePlSelectedDict();
      }

      if (tabName === 'PlayLists')
      {
        await plTab_afActivate(vCurTracksRmMvCpCntr);
        if (vRedrawNeeded[0] === 1)
        {
          plTab_redraw();
          vRedrawNeeded[0] = 0;
        }
      }

      if (tabName === 'Tracks')
      {
        await tracksTab_afActivate(vCurPlSelectionCntr);
        if (vRedrawNeeded[1] === 1)
        {
          tracksTab_redraw();
          vRedrawNeeded[1] = 0;
        }
        tracksTab_selectRow();  // make sure last selected pl name has focus
      }

      if (tabName === 'Duplicates')
      {
        await dupsTab_afActivate(vCurPlSelectionCntr);
        if (vRedrawNeeded[2] === 1)
        {
          dupsTab_redraw();
          vRedrawNeeded[2] = 0;
        }
      }

      if (tabName === 'Artists')
      {
        await artistsTab_afActivate(vCurPlSelectionCntr);
        if (vRedrawNeeded[3] === 1)
        {
          artistsTab_redraw();
          vRedrawNeeded[3] = 0;
        }
        artistsTab_selectRow(); // make sure last selected artist name has focus
      }

      if (tabName === 'Search')
      {
        await searchTab_afActivate(vCurPlSelectionCntr);
        if (vRedrawNeeded[4] === 1)
        {
          searchTab_redraw();
          vRedrawNeeded[4] = 0;
        }
      }

    }
    catch(err)
    {
      // console.log('__SF__tabs_afSwitchTabs() caught error: ', err);
      tabs_errHandler(err);
    }
    // finally
    // {
    //   console.log('__SF__tabs_afSwitchTabs() - finally');
    // }
  }

  //-----------------------------------------------------------------------------------------------
  async function tabs_afRmTracksByPos(rmTrackList)
  {
    vCurPlSelectionCntr = vCurPlSelectionCntr + 1;
    vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

    if (Object.keys(rmTrackList).length > 100)
    {
      msg = 'Spotify limits the number of tracks that can be removed at a time to 100. No tracks were removed.\n'
      alert(msg);
      return;
    }

    console.log('__SF__tabs_afRmTracksByPos() - vUrl - rmTracksByPos');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ rmTracksByPos: 'rmTracksByPos', rmTrackList: rmTrackList }), });
    if (!response.ok)
      tabs_throwErrHttp('tabs_afRmTracksByPos()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tabs_afRmTracksByPos() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tabs_afRmTracksByPos()', reply['errRsp'], 'tracksTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tabs_afMvCpTracks(destPlId, trackList, type)
  {
    // console.log('__SF__tabs_afMvCpTracks()');
    vCurPlSelectionCntr = vCurPlSelectionCntr + 1;
    vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

    console.log('__SF__tabs_afMvCpTracks() - vUrl - mvcpTracks');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ mvcpTracks: 'mvcpTracks', destPlId: destPlId, trackList: trackList, type: type }), });
    if (!response.ok)
      tabs_throwErrHttp('tabs_afMvCpTracks()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tabs_afMvCpTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tabs_afMvCpTracks()', reply['errRsp'], 'tracksTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_progBarStart(progBar, lblId, lblStr, showStrImmed = true)
  {
    // console.log('__SF__tabs_progBarStart() - ' + progBar);
    let element = document.getElementById(progBar);
    let width = 10;
    let cntr = 0;
    let str = lblStr;
    // element.style.width = width + '%';
    // element.innerHTML = '&nbsp&nbsp'  + cntr.toString();
    if (showStrImmed)
      $("#" + lblId).text(lblStr);

    // on the tracks and artists tabs it was possible for the prog bar to keep spinning if
    // the user clicks or cursors very quickly in the playlistName/artistName column
    if ((vProgressBarTmr != null) && (vProgBar != null) && (vLblId != null))
        tabs_progBarStop(vProgBar, vLblId, '')

    vProgBar = progBar;
    vLblId = lblId;
    vProgressBarTmr = setInterval(scene, 1000);
    function scene()
    {
      // console.log('__SF__tabs_progBarStart() - scene');
      if (width >= 99)
        width = 0;
      else
        width += 10;
      cntr += 1;
      if (cntr >= 1)
      {
        element.style.width = width + '%';
        element.innerHTML = '&nbsp&nbsp' + cntr.toString();
        $("#" + lblId).text(lblStr);
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_progBarStop(progBar, lblId, lblStr)
  {
     // console.log('__SF__tabs_progBarStop() - ' + progBar);
     let element = document.getElementById(progBar);
     element.style.width = 0;
     element.innerHTML = '';
     clearInterval(vProgressBarTmr);
     vProgressBarTmr = null;
     vProgBar = null;
     vLblId = null;
     $("#" + lblId).text(lblStr);
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_setLabel(lblId, lblStr)
  {
    // console.log('__SF__tabs_setLabel() - id =' + lblId + ', str = ' + lblStr);
    $("#" + lblId).html(lblStr);
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_set2Labels(lblId1, lblStr1, lblId2, lblStr2)
  {
    // console.log('__SF__tabs_setLabel() - id =' + lblId + ', str = ' + lblStr);
    $("#" + lblId1).text(lblStr1);
    $("#" + lblId2).text(lblStr2);
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_throwErrHttp(methodName, statusCode)
  {
    let errMsg = 'errorType: '           + 'SpotifyFinder Http Error' +
                 ', clientMethod:  '     + methodName +
                 ', errCode: '           + statusCode.toString() +
                 ', dateTime: '          + (new Date().toLocaleString()).replace(',',' ');
    throw new Error(errMsg);
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_throwSvrErr(methodName, errArr, errCode)
  {
    // console.log('__SF__tabs_throwSvrErr()');
    // < and > cause the value string to be blank on the log screem using <pre>
    for (var i = 4; i <= 6; i++)
      errArr[i] = errArr[i].replace('<', ' ').replace('>', ' ');

    console.log('__SF__tabs_throwSvrErr() - errArr = ' + errArr);
    let errMsg =  'errorType: '           + 'SpotifyFinder Server Error' +
                  ', clientMethod:  '     + methodName +
                  ', errCode: '           + errArr[0].toString() +
                  ', dateTime: '          + errArr[1] +
                  ', serverMethod: '      + errArr[5] +
                  ', description: '       + errArr[6] +
                  ', svrSysStr1: '        + errArr[7] +
                  ', svrSysStr2: '        + errArr[8] +
                  ', svrSysStr3: '        + errArr[9];

    throw new Error(errMsg);
  }

  //-----------------------------------------------------------------------------------------------
  function tabs_errHandler(err)
  {
    console.log('__SF__tabs_errHandler() err = ', err);

    // console.log('__SF__tabs_errHandler() stackTrace = ', stacktrace());
    // st = printStackTrace();
    // console.log('__SF__tabs_errHandler() stackTrace = ', st);
    infoTab_addClientLogErrMsg(err, ErrorStackParser.parse(err));

    let msg = ' ';
    errStr = err.message;
    if (errStr.search('-742') != -1)
    {
      msg = 'Your session has timed out.\n' +
            'A session restart is needed.\n' +
            'A session timeouts after 12 hours of no activity.\n\n' +
            'Press Ok and you will be redirected to the home page.\n';

      vAborting = 1;
      alert(msg);
      let urlSpotifyFinderStartPage = window.location.origin;
      location.replace(urlSpotifyFinderStartPage);
      return;
    }

    if (vAborting === 1)
      return;

    vAborting = 1;

    msg = 'An error has occured.\n' +
      'A session restart is needed.\n\n' +
      'Press Ok and you will be redirected to the home page.\n' +
      'Press Cancel and you will be redirected to the log viewer.';


    let errMsgSplit = err.message.split(", ");
    console.log('splits = ', errMsgSplit);
    if (errMsgSplit[2] === "errCode: -5") // errRmTracksByPosFromSpotPlaylist = -5
    {
      msg = 'A remove track by position error has occured.\n\n' +
        'A session restart is needed.\n\n' +
        'Press Ok and you will be redirected to the home page.\n' +
        'Press Cancel and you will be redirected to the log viewer.\n\n' +
        'Details:\n' +
        '1) This error usually occurs when you have SpotifyFinder opened in your browser and you change the playlist in the Spotify App.\n\n' +
        '2) If you change a playlist outside of SpotifyFinder, while SpotifyFinder is opened in your browser, you must press \'Reload from Spotify\' to update SpotifyFinder with the current track positons. \n\n';
    }


    if (confirm(msg) == true)
    {
      let urlSpotifyFinderStartPage = window.location.origin;
      location.replace(urlSpotifyFinderStartPage);
    }
    else
    {
      // console.log('__SF__tabs_errHandler() cancel - goto info tab ');
      vHtmlInfoFn = 'clientLog';
      $("#btnInfoTab")[0].click();
    }
  }

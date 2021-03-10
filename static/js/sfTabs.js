
  var vUrl;
  var vLastPlSelectionCntr = 0;
  var vProgressBarTmr = null;
  var vCurPlSelectionCntr = 1;
  var vCurTracksRemovedCntr = 1;
  var vRedrawNeeded = [0,0,0,0];
  var vAborting = 0;

  //
  // regex search to find await and _af on the same line .*?await.*?_af.*?
  //
  //-----------------------------------------------------------------------------------------------
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
    tableHeight = document.documentElement.clientHeight-256;

    infoTab_addClientLogMsg(['SpotifyFinder', 'Started']);

    plTab_initPlTab(tableHeight);
    plTab_redraw();

    // simulate a playlist tab click to load the tab
    $("#btnPlTab")[0].click(); // document.getElementById("btnPlTab").click();

    tracksTab_initTracksTab(tableHeight);
    dupsTab_initPlTab(tableHeight);
    artistsTab_initArtistTab(tableHeight);
    infoTab_initInfoTab(tableHeight+125);

    $(window).resize(function()
    {
      // console.log('__SF__>>>>>>>>>>>>>>>> reize()')
      vRedrawNeeded = [1,1,1,1];
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
        if (vPlTabLoading === true)
        {
          $("#plTab_info2").text("Playlist Tab is loading. Please switch tabs after loading is complete.");
          setTimeout(function ()
          {
            $("#plTab_info3").text('');
          }, 4500);
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

      // await tabs_afGetCntrs();  // get vCurPlSelectionCntr and vCurTracksRemovedCntr from server
      // console.log('__SF__tabs_afSwitchTabs() -   \n vCurPlSelectionCntr ='    + vCurPlSelectionCntr +
      //                                    ',\n vCurTracksRemovedCntr = ' + vCurTracksRemovedCntr);

      if (vLastPlSelectionCntr !== vCurPlSelectionCntr)
      {
        // console.log('__SF__tabs_afSwitchTabs() - pl list selection cnt has changed - updating plSelectedDict');
        vLastPlSelectionCntr = vCurPlSelectionCntr;
        await plTab_afUpdatePlSelectedDict();
      }

      if (tabName === 'PlayLists')
      {
        await plTab_afActivate(vCurTracksRemovedCntr);
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

  // //-----------------------------------------------------------------------------------------------
  // async function tabs_afGetCntrs()
  // {
  //   // console.log('__SF__tabs_afGetCntrs()');
  //   console.log('__SF__tabs_afGetCntrs() - vUrl - getCntrs');
  //   let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
  //                                      body: JSON.stringify({ getCntrs: 'getCntrs' }), });
  //   if (!response.ok)
  //     tabs_throwErrHttp('tabs_afGetCntrs()', response.status, 'tracksTab_errInfo');
  //   else
  //   {
  //     let reply = await response.json();
  //     console.log('__SF__tabs_afGetCntrs() reply = ', reply);
  //     if (reply['errRsp'][0] !== 1)
  //       tabs_throwSvrErr('tabs_afGetCntrs()', reply['errRsp'], 'tracksTab_errInfo')
  //
  //     vCurPlSelectionCntr = reply['plSelectionCntr'];
  //     vCurTracksRemovedCntr = reply['tracksRemovedCntr'];
  //   }
  // }

  //-----------------------------------------------------------------------------------------------
  async function tabs_afRemoveTracks(rmTracksList)
  {
    // console.log('__SF__tabs_afRemoveTracks()');
    vCurPlSelectionCntr = vCurPlSelectionCntr + 1;
    vCurTracksRemovedCntr = vCurTracksRemovedCntr + 1;

    console.log('__SF__tabs_afRemoveTracks() - vUrl - removeTracks');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ removeTracks: 'loadPlTracks', rmTracksList: rmTracksList }), });
    if (!response.ok)
      tabs_throwErrHttp('tabs_afRemoveTracks()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tabs_afRemoveTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tabs_afRemoveTracks()', reply['errRsp'], 'tracksTab_errInfo')
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
                  ', serverMethod: '      + errArr[2] +
                  ', description: '       + errArr[3] +
                  ', svrSysStr1: '        + errArr[4] +
                  ', svrSysStr2: '        + errArr[5] +
                  ', svrSysStr3: '        + errArr[6];

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
            'A session restart is needed.\n\n' +
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


  var vHtmlInfo = 'unset';
  var vHtmlInfoFn = '';
  var vClientLog = [];

    //-----------------------------------------------------------------------------------------------
  function infoTab_initInfoTab(tableHeight=300)
  {
    // the area for the help text tracks the browser client height
    $(".innerInfoTextPanel").height(tableHeight-8);
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_activate()
  {
    // console.log('__SF__infoTab_activate() vHtmlInfoFn = ' + vHtmlInfoFn);

    if (vHtmlInfoFn == '')
    {
      infoTab_afLoadInfo('helpTextAbout.html');
      return;
    }

    if (vHtmlInfoFn == 'clientLog')
    {
      infoTab_btnClientLog();
      return;
    }

    infoTab_afLoadInfo(vHtmlInfoFn);
  }

  //-----------------------------------------------------------------------------------------------
  async function infoTab_afLoadInfo(fn)
  {
    await infoTab_afHtmlInfo(fn);
    vHtmlInfoFn = ''; // reset to default info text for helpTextAbout.html
    $(".innerInfoTextPanel").html(vHtmlInfo);

    // the user click a ? on another tab so we put focus on the btn that corresponds to the info being shown
    switch (fn)
    {
      case 'helpTextAbout.html':
        $('#infoTab_btnAppInfo').focus();
        break;
      case 'helpTextTabPl.html':
        $('#infoTab_btnPlaylistInfo').focus();
        break;
      case 'helpTextTabTracks.html':
        $('#infoTab_btnTracksInfo').focus();
        break;
      case 'helpTextTabDups.html':
        $('#infoTab_btnDupInfo').focus();
        break;
      case 'helpTextTabArtist.html':
        $('#infoTab_btnArtistInfo').focus();
        break;
      // case 'helpTextCoffee.html':
      //   $('#infoTab_btnCoffeeInfo').focus();
      //   break;
      default:
        break;
    }

  }

  //-----------------------------------------------------------------------------------------------
  async function infoTab_afHtmlInfo(fn)
  {
    // console.log('__SF__infoTab_afHtmlInfo()');
    try
    {
      console.log('__SF__infoTab_afHtmlInfo() - vUrl - getInfoHtml');
      let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                         body: JSON.stringify({ getInfoHtml: 'getInfoHtml', infoRq: fn}), });
      if (!response.ok)
        tabs_throwErrHttp('infoTab_afHtmlInfo()', response.status, 'infoTab_errInfo');
      else
      {
        let reply = await response.json();
        // console.log('__SF__infoTab_afHtmlInfo() reply = ', reply);
        if (reply['errRsp'][0] !== 1)
          tabs_throwSvrErr('infoTab_afHtmlInfo()', reply['errRsp'], 'plTab_errInfo')

        vHtmlInfo = reply['htmlInfo'];
        // console.log('__SF__infoTab_afHtmlInfo() - \n   htmlInfo = ' + vHtmlInfo);
      }
    }
    catch(err)
    {
      // console.log('__SF__infoTab_afHtmlInfo() caught error: ', err);
      msg = 'Unable to retrieve help info.\n' +
            'Session restart is needed.\n' +
            'Your session my have timed out.\n\n' +
            err.message;
      alert(msg);
    }
    // finally
    // {
    //   console.log('__SF__infoTab_afHtmlInfo() - finally');
    // }
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnAppInfo()
  {
    infoTab_afLoadInfo('helpTextAbout.html');
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnPlaylistInfo()
  {
    infoTab_afLoadInfo('helpTextTabPl.html');
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnTracksInfo()
  {
    infoTab_afLoadInfo('helpTextTabTracks.html');
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnDupInfo()
  {
    infoTab_afLoadInfo('helpTextTabDups.html');
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnArtistInfo()
  {
    infoTab_afLoadInfo('helpTextTabArtist.html');
  }

  //-----------------------------------------------------------------------------------------------
  // function infoTab_btnCoffeeInfo()
  // {
  //   infoTab_afLoadInfo('helpTextCoffee.html');
  // }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnClientLog()
  {
    vHtmlInfo = "<pre>" + JSON.stringify(vClientLog, null, 2) + "</pre>";
    $(".innerInfoTextPanel").html(vHtmlInfo);
    $('#infoTab_btnClientLog').focus();
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_btnServerLog()
  {
    infoTab_afShowServerLog()
    $('#infoTab_btnServerLog').focus();
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_addClientLogMsg(msgs)
  {
    msgs.unshift((new Date().toLocaleString()).replace(',',' '));
    vClientLog.push(msgs);
  }

  //-----------------------------------------------------------------------------------------------
  function infoTab_addClientLogErrMsg(errObj, stackTrace)
  {
    // console.log('__SF__infoTab_addClientLogErrMsg err.stack = ', err.stack);

    let arrErrStrs = [];
    arrErrStrs.push((new Date().toLocaleString()).replace(',',' '));
    let errName = 'ErrorName: ' + errObj.name;
    arrErrStrs.push(errName);

    let errMsgSplit = errObj.message.split(", ");
    errMsgSplit.forEach(function(estr, idx, arr)
    {
      arrErrStrs.push(estr);
    });

    stackTrace.forEach(function(stItem, stIdx, stArr)
    {
      if (stIdx < 5)
        arrErrStrs.push(stItem);
    });

    vClientLog.push(arrErrStrs);
  }

  //-----------------------------------------------------------------------------------------------
  async function infoTab_afShowServerLog()
  {
    await infoTab_afLoadErrLog()
    $(".innerInfoTextPanel").html(vHtmlInfo);
  }

  //-----------------------------------------------------------------------------------------------
  async function infoTab_afLoadErrLog()
  {
    // console.log('__SF__infoTab_afLoadErrLog()');
    try
    {
      console.log('__SF__infoTab_afLoadErrLog() - vUrl - getErrLog');
      let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                         body: JSON.stringify({ getErrLog: 'getErrLog'}), });
      if (!response.ok)
        tabs_throwErrHttp('infoTab_afLoadErrLog()', response.status, 'infoTab_errInfo');
      else
      {
        let reply = await response.json();
        // console.log('__SF__infoTab_afLoadErrLog() reply = ', reply);
        if (reply['errRsp'][0] !== 1)
          tabs_throwSvrErr('infoTab_afLoadErrLog()', reply['errRsp'], 'plTab_errInfo')

        vHtmlInfo = "<pre>" + JSON.stringify(reply['errLog'], undefined, 2) + "</pre>";
        // console.log('__SF__infoTab_afLoadErrLog() - \n   errLog = ' + vHtmlInfo);
      }
    }
    catch(err)
    {
      // console.log('__SF__infoTab_afLoadErrLog() caught error: ', err);
      msg = 'Unable to retrieve err log.\n' +
            'Session restart is needed.\n' +
            'Your session my have timed out.\n\n' +
            err.message;
      alert(msg);
    }
    // finally
    // {
    //   console.log('__SF__infoTab_afLoadErrLog() - finally');
    // }
  }

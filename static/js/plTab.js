
  var vPlTable;
  var vLastTracksRmMvCpCntr = 0;
  var vPlTabActivated = 0;
  var vPlTabLoading = false;
  var vPlTableLastSearchCol = '';
  var vTotalTracksSelected = 0;

  var vUserId = '';
  var vUserName = '';
  var vUserProduct = '';
  var vCookie = '';
  var vSid = '';

  const cbOwnerDefault = 'Show By Owner\'s Name';

  //-----------------------------------------------------------------------------------------------
  function plTab_init(tableHeight=300)
  {
    // console.log("plTab_initPlTab() - plTable ready()");

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#plTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="plTabs_btnClearSearchPlOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'plColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vPlTable = $('#plTable').DataTable(
    {
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull)
      {
        // assign unique class name to each row so we can scroll to it in plTabs_cbPlOwnersOnChange()
        // https://stackoverflow.com/questions/35468228/scroll-to-specific-row-in-datatable
        $(nRow).addClass("c" + aData[1].replace(/\W/g, '') + aData[5].replace(/\W/g, '')); // use playlist Name and Id as class name
      },

      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              vPlTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 18,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets: 0, className: 'select-checkbox', orderable: false },
                    { targets: 6, visible: false, searchable: false },
                    { targets: 7, visible: false, searchable: false } ],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_redraw()
  {
    // console.log('__SF__plTab_redraw()');
    vPlTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afActivate(curTracksRmMvCpCntr)
  {
    try
    {
      // console.log("plTab_afActivate() vPlTabActivated = " + vPlTabActivated);
      if (vPlTabActivated === 0)
      {
        vLastTracksRmMvCpCntr = 1;

        tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
        tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

        $('#plTabs_cbUsers').append($('<option>', { value: 0, text : cbOwnerDefault }));

        await plTab_afloadSpotifyInfo();
        await plTab_afLoadPlDict();
        await plTab_afLoadPlTable();
        plTab_initPlTableCkboxes();
        await plTab_afUpdatePlSelectedDict();
        plTabs_updateSelectedCntInfo();
      }
      else if (vLastTracksRmMvCpCntr !== curTracksRmMvCpCntr)
      {
        // console.log("plTab_afActivate() - last and cur removed cntrs are different");

        vLastTracksRmMvCpCntr = curTracksRmMvCpCntr;
        $("#plTab_plNmTextInput").val('');

        tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
        tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

        // note above removing tracks:
        //  - loadPlTracks1x(plId) is called by oLoader:rmTracksByPosFromSpotPlaylist() when removing tracks
        //    loadPlTracks1x(plId) updates the plDict[plId] with the new track cnt  so we only have to reload the
        //    PlTable with the updated plDict
        vPlTable.clear().draw();
        await plTab_afLoadPlTable();
        await plTab_afRestorePlTableCkboxes();
        plTabs_updateSelectedCntInfo();
      }
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afActivate() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
      vPlTabActivated = 1;
    }
  }


  //-----------------------------------------------------------------------------------------------
  function plTabs_btnRestore()
  {
    plTab_afRestoreSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRestoreSeq()
  {
    // console.log('plTab_afRestoreSeq()');
    plTabs_btnClearSearchPlOnClick(false);
    await plTab_afRestore();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRestore()
  {
    try
    {
      // console.log("plTab_afRefresh()");

      tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
      tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

      // await plTab_afPostCmdTestErrPath();
      await plTab_afUpdatePlSelectedDict();
      vPlTable.order([]); // remove sorting
      vPlTable.clear().draw();
      await plTab_afLoadPlTable();
      await plTab_afRestorePlTableCkboxes();
      plTabs_updateSelectedCntInfo();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afRefresh() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afRefresh() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
    }
  }

    //-----------------------------------------------------------------------------------------------
  async function plTab_afPartialReloadSeq(saveSelectedDict = false)
  {
    try
    {
      // used by plTab: rename, delete, & refresh to reload the mPlDict to avoid wiping out mPlTracksDict and mPlSelectedDict

      console.log("__SF__plTab_afPartialReload()");
      vPlTabLoading = true;
      tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading...', showStrImmed=true);

      // delete and rename:
      //  - in the loader the associated delete or rename plId is removed from the mPlDict, mPlTracksDict, mPlSelectedDict

      tabs_partialReloadVarReset();
      if (saveSelectedDict === true)
      {
        // refresh:
        //  - the only playlist selected is the one being refresh...make sure is it in the plSelectedDict
        //    so it is selected on reload if the user never left the plTab when refreshing it
        await plTab_afUpdatePlSelectedDict();
      }

      // with clearTracksDict = false the mPlTracksDict and mPlSelectedDict is not cleared when reloading the mPlDict
      // this way already loaded tracks are not wiped out after a refresh, rename, delete
      await plTab_afLoadPlDict(false);
      vPlTable.clear().draw();
      await plTab_afLoadPlTable();
      await plTab_afRestorePlTableCkboxes();
      plTabs_updateSelectedCntInfo();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afPartialReload() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afPartialReload() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
      vPlTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afloadSpotifyInfo()
  {
    // foo.bar();
    // console.log('__SF__plTab_afloadSpotifyInfo()');
    winWidth = document.documentElement.clientWidth;
    winHeight = document.documentElement.clientHeight;

    rVal = 1;
    console.log('__SF__plTab_afloadSpotifyInfo() - vUrl - loadSpotifyInfo');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadSpotifyInfo: 'loadSpotifyInfo', winWidth: winWidth, winHeight: winHeight }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afloadSpotifyInfo()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afloadSpotifyInfo() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afloadSpotifyInfo()', reply['errRsp'], 'plTab_errInfo')

      vUserId = reply['userId'];
      vUserName = reply['userName']
      vUserProduct = reply['userProduct']
      vCookie = reply['cookie']
      vSid = reply['sid']
      // console.log('__SF__plTabs_loadSpotifyInfo() - \n   userId = ' + vUserId + ',\n   userName = ' + vUserName + ',\n   cookie = ' + vCookie + ',\n   sid = ' + vSid);
      infoTab_addClientLogMsg([vSid]);
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlDict(clearTracksDict=true)
  {
    // clearTrackDict set to false:
    //  - by plTab rename, delete, refresh
    //  - by search tab, artist tab, tracks tab when doing a create
    //  - by tracks tab when doing a sort
    //  to avoid wiping the previously loaded tracks    
    // console.log('__SF__plTab_afLoadPlDict()');
    let idx = 0;
    let done = false;
    let nPlRxd = 0;
    while (done === false)
    {
      sIdx = idx;
      nPlRxd = await plTab_afLoadPlDictBatch(idx,clearTracksDict);
      idx += nPlRxd;
      if (nPlRxd < 50) // when fetch less then the batchSize we are done
        done = true;
      // done = true;  // stop after the first load...for testing...
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlDictBatch(idx, clearTracksDict)
  {
    // console.log('__SF__plTab_afLoadPlDictBatch()');
    // console.log('__SF__plTab_afLoadPlDictBatch() - vUrl - loadPlDictBatch');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlDictBatch: 'loadPlDictBatch',
                                                                    idx: idx,
                                                                    clearTracksDict: clearTracksDict
                                                                  }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afLoadPlDictBatch()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afLoadPlDictBatch() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afLoadPlDictBatch()', reply['errRsp'], 'plTab_errInfo')

      return reply['nPlRxd']
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlTable()
  {
    // console.log('__SF__plTab_afLoadPlTable()');
    console.log('__SF__plTab_afLoadPlTable() - vUrl - getPlDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getPlDict: 'getPlDict' }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afLoadPlTable()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afLoadPlTable()', reply['errRsp'], 'plTab_errInfo')

      let plDict = reply['plDict'];
      $.each(plDict, function(key, val)
      {
        // if (val['Playlist Owners Id'] === 'd821vfpc7iz90kbxig72n533l')
        if (val['Playlist Owners Id'] === vUserId)
          //                0   1:vis                 2:vis          3:vis          4:vis                        5:vis               6:invisible                7:invisible
          vPlTable.row.add(['', val['Playlist Name'], val['Tracks'], val['Public'], val['Playlist Owners Name'], val['Playlist Id'], val['Playlist Owners Id'], val['Playlist Uri']]);
      });
      $.each(plDict, function(key, val)
      {
        // if (val['Playlist Owners Id'] !== 'd821vfpc7iz90kbxig72n533l')
        if (val['Playlist Owners Id'] !== vUserId)
          //                0   1:vis                 2:vis          3:vis          4:vis                        5:vis               6:invisible                7:invisible
          vPlTable.row.add(['', val['Playlist Name'], val['Tracks'], val['Public'], val['Playlist Owners Name'], val['Playlist Id'], val['Playlist Owners Id'], val['Playlist Uri']]);
      });
      vPlTable.draw();

      let infoStr2 = 'Total Playlists: ' + reply['NPlaylists'] + '&nbsp &nbsp &nbsp &nbsp &nbsp' + ' Total Tracks: ' + reply['NTracks'];
      tabs_setLabel('plTab_info2', infoStr2);

      $('#plTabs_cbUsers').empty();
      $('#plTabs_cbUsers').append($('<option>', { value: 0, text : cbOwnerDefault }));
      let userList = reply['userList'];
      $.each(userList, function (i, item)
      {
        $('#plTabs_cbUsers').append($('<option>', { value: i+1, text : item }));
      });
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_initPlTableCkboxes()
  {
    // console.log('__SF__user id = ' + vUserId)
    vPlTabLoading = true;

    plDefault = plTab_getCookiePlDefault();
    if (Object.keys(plDefault).length > 0)
    {
      //console.log('__SF__plTab_afRestorePlTableCkboxes() - reselect rows using plSelectedDict ');
      vPlTabLoading = true;
      vPlTable.rows().every(function(rowIdx, tableLoop, rowLoop)
      {
        rowData = this.data();
        let rowPlId = rowData[5]
        $.each(plDefault, function (key, values)
        {
          //if plTable plId matches plSelectedDict plId than select the row
          if (rowPlId === key)
            vPlTable.row(rowIdx).select();
        });
      });
    }
    else
    {
      let cnt = 0;
      let setCkCnt = 2;
      vPlTable.rows().every(function(rowIdx, tableLoop, rowLoop)
      {
        let rowData = this.data()
        // if (rowData[6] === 'd821vfpc7iz90kbxig72n533l') // ownerId === vUserId
        if (rowData[6] === vUserId) // ownerId === vUserId
        {
          if (cnt < setCkCnt)
          {
            this.select();
            cnt += 1;
          }
        }
      });
    }
    vPlTabLoading = false;
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRestorePlTableCkboxes()
  {
    // console.log('__SF__plTab_afRestorePlTableCkboxes()');
    console.log('__SF__plTab_afRestorePlTableCkboxes() - vUrl - getPlSelectedDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getPlSelectedDict: 'getPlSelectedDict' }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afRestorePlTableCkboxes()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afRestorePlTableCkboxes() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afRestorePlTableCkboxes()', reply['errRsp'], 'plTab_errInfo')

      let plSelectedDict = reply['plSelectedDict']
      if (Object.keys(plSelectedDict).length > 0)
      {
        //console.log('__SF__plTab_afRestorePlTableCkboxes() - reselect rows using plSelectedDict ');
        vPlTabLoading = true;
        vPlTable.rows().every(function(rowIdx, tableLoop, rowLoop)
        {
          // console.log('RestorePlTableCkboxes row this = ' + this);
          rowData = this.data();
          let rowPlId = rowData[5]
          $.each(plSelectedDict, function(key, values)
          {
            //if plTable plId matches plSelectedDict plId than select the row
            if (rowPlId === key)
            {
              vPlTable.row(rowIdx).select();
              // console.log('RestorePlTableCkboxes() seldict plNm = ' + values['Playlist Name']);
              // console.log('RestorePlTableCkboxes() row plNm = ' + rowData[1]);
            }
          });
        });
        vPlTabLoading = false;
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnReload()
  {
    // console.log('plTabs_btnReload()')
    var vInfoReload = null;
    if (vSearchTabLoading === true)
    {
      vInfoReload = $("#searchTab_info3");
      // console.log('plTabs_btnReload search');
    }
    if (vDupsTabLoading === true)
    {
      vInfoReload = $("#dupsTab_info3");
      // console.log('plTabs_btnReload dups');
    }
    if (vPlTabLoading === true)
    {
      vInfoReload = $("#plTab_info3");
      // console.log('plTabs_btnReload pl');
    }
    if (vArtistsTabLoading === true)
    {
      vInfoReload = $("#artistsTab_info3");
      // console.log('plTabs_btnReload artists');
    }
    if (vTracksTabLoading === true)
    {
      vInfoReload = $("#tracksTab_info3");
      // console.log('plTabs_btnReload tracks');
    }
    if (vInfoReload != null)
    {
      vInfoReload.text("Please 'Reload from Spotify' after the current load has finished.");
      setTimeout(function ()
      {
        vInfoReload.text('');
      }, 4500);
      return;
    }
    // called when the user presses reload from spotify
    // refetch all the playlists from spotify (loadPlDict) and reloads the plTable
    // console.log("plTab_reload() - simulating a page refresh click");
    document.location.reload(true) // page refresh does a complete reload (this does not go to the home page)
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_plTableSelect() { /* make function appear in pycharm structure list */ }
  $('#plTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__plTabs_plTableSelect()');

    if (vPlTabLoading === true)
      return;

    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  });

  //-----------------------------------------------------------------------------------------------
  function plTabs_plTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#plTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__plTabs_plTableDeselect()');

    if (vPlTabLoading === true)
      return;

    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  });

  //-----------------------------------------------------------------------------------------------
  async function plTab_afUpdatePlSelectedDict()
  {
    // console.log('__SF__plTab_afUpdatePlSelectedDict()');
    let newPlSelectedDict = {};
    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      let rowData = vPlTable.row(this).data();
      newPlSelectedDict[rowData[5]] = { 'Playlist Name': rowData[1], 'Playlist Owners Id': rowData[6] };
    });

    console.log('__SF__plTab_afUpdatePlSelectedDict() - vUrl - setPlSelectedDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ setPlSelectedDict: 'setPlSelectedDict', newPlSelectedDict: newPlSelectedDict }) });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afUpdatePlSelectedDict()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afUpdatePlSelectedDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afUpdatePlSelectedDict()', reply['errRsp'], 'plTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afIncPlSelectionCntr()
  {
    vCurPlSelectionCntr = vCurPlSelectionCntr + 1;
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_getSelectedCnt()
  {
    //console.log('__SF__plTabs_getSelectedCnt()');
    let cnt = vPlTable.rows({ selected: true }).count();
    // console.log('__SF__plTabs_getSelectedCnt() - cnt = ' + cnt);
    return cnt;
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_updateSelectedCntInfo()
  {
    // console.log('__SF__plTabs_updateSelectedCntInfo()');

    // this was changed on 4/3/2024 to force the user to select fewer playlists to reduce the track total below 25k
    // note: that you can load 25k tracks then unselected the playlists and the already loaded tracks remain loaded
    //       then you can load another 25k tracks by selecting different playlists
    //       but only the selected playlist are examined by the dups, search, tracks and artists tabs
    vTotalTracksSelected = 0;
    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      let rowData = vPlTable.row(this).data();
      vTotalTracksSelected += parseInt(rowData[2], 10);
    });

    let count = vPlTable.rows({ selected: true }).count();
    tabs_setLabel('plTab_info1', 'Selected Playlists: ' + count + '&nbsp &nbsp &nbsp &nbsp &nbsp' + ' Selected Tracks: '+ vTotalTracksSelected);

    // console.log('tracksToBeLoaded = ', tracksToBeLoaded);
    if (vTotalTracksSelected > 25000)
    {
      msg = 'The maximum number of tracks that can be loaded is 25,000.\n' +
            'With the currently selected playlists  ' + vTotalTracksSelected + '  tracks will need to be loaded.\n' +
            'You must reduce the number of tracks to be loaded by selecting fewer playlists\n\n';
      alert(msg);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnClearSearchPlOnClick(focusOnField=true)
  {
    //console.log('__SF__plTabs_btnClearSearchPlNameOnClick()');
    // clear search boxes under pl table
    $("input[name^='plColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    if (focusOnField)
    {
      // last element edited gets focus
      let searchInputBox = $('input[name="'+vPlTableLastSearchCol+'"]');
      searchInputBox.focus();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnSelectAll()
  {
    // 4/3/2024 the button was removed to prevent user from selecting all the playlists
    // console.log('__SF__plTabs_btnSelectAll()')
    vPlTabLoading = true;
    vPlTable.rows().select();
    vPlTabLoading = false;

    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnClearAll()
  {
    // console.log('__SF__plTabs_btnClearAll()')
    vPlTabLoading = true;
    vPlTable.rows().deselect();
    vPlTabLoading = false;

    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_cbPlOwnersOnChange()
  {
    // console.log('__SF__plTabs_cbPlOwnersOnChange()')
    let curSel = $('#plTabs_cbUsers option:selected').text();
    // console.log('__SF__plTabs_cbPlOwnersOnChange() selected = ' + curSel);
    if (curSel === cbOwnerDefault)
      return;

    let selectRowData = '';
    vPlTabLoading = true;
    // vPlTable.rows().deselect();  // 4/3/2024 only show owner do not select/deselect to prevent auto select of all users playlists
    vPlTable.rows().every(function()
    {
      rowData = this.data();
      // if ((rowData[4] + ' / ' + rowData[6]) === curSel) // ownerName / ownerId === curSel
      if (rowData[4] === curSel) // just using ownerName
      {
        // this.select(); // 4/3/2024 only show owner do not select/deselect to prevent auto select of all users playlists
        if (selectRowData === '')  // recreate the unique class name assigned to row during init
          selectRowData = "c" + rowData[1].replace(/\W/g, '') + rowData[5].replace(/\W/g, '') // use playlist Name and Id
          return false;
      }
    });
    vPlTabLoading = false;

    $('#plTabs_cbUsers').val(0);
    plTabs_updateSelectedCntInfo();
    plTab_afIncPlSelectionCntr();

    if (selectRowData !== '')
    {
      // https://github.com/flesler/jquery.scrollTo  (a jquery plugin in)
      // https://stackoverflow.com/questions/35468228/scroll-to-specific-row-in-datatable
      // console.log('__SF__plTabs_cbPlOwnersOnChange() selectRowData = ' + selectRowData);
      let selection = $('#plTable .' + selectRowData);
      // console.log('__SF__plTabs_cbPlOwnersOnChange(): selection = \n' + JSON.stringify(selection, null, 4));
      $(".dataTables_scrollBody").scrollTo(selection);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnHelp()
  {
    // console.log('__SF__plTabs_btnHelp()');
    vHtmlInfoFn = 'helpTextTabPl.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnHelpRefresh()
  {
    // console.log('__SF__plTabs_btnHelp()');
    vHtmlInfoFn = 'helpTextRemoveErrors.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afPostCmdTestErrPath()
  {
    // console.log('plTab_afPostCmdTestBogus()');
    // console.log('plTab_afPostCmdTestBogus() - vUrl - bogus');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ bogus: 'bogus' }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afPostCmdTestBogus()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('plTab_afPostCmdTestBogus() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afPostCmdTestBogus()', reply['errRsp'], 'plTab_errInfo')

      return reply['nPlRxd']
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnSavePlDefault()
  {
    // console.log('plTabs_btnSavePlDefault()');
    plTab_setCookiePlDefault();
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_setCookiePlDefault()
  {
    // remember selected playlists.
    // Each time you visit spotifyFinder.com these playlists will be selected by default

    // console.log('__SF__plTab_setCookiePlDefault()');

    let plDefaultDict = {};
    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      let rowData = vPlTable.row(this).data();
      // replace all semicolons in plNm w/ spaces
      // semicolons are used by plTab_getCookiePlDefault() as a pl entry separator
      // the important part of the cookie is the plId, the plNm is not important and is there for debugging purposes
      // example: Johannes Brahms – Brahms: Symphony No. 4; Academic Festival Overture; Tragic Overture
      // console.log("plName = ", rowData[1])
      plNameCleaned = rowData[1].replace(/;/g, " ");  // replace all ; w/ spaces
      // console.log("plNameCleaned = ", plNameCleaned)
      plDefaultDict[rowData[5]] = { 'Playlist Name': plNameCleaned, 'Playlist Owners Id': rowData[6] };
    });

    // where mozilla stores the cookie fill for spotifyfinder.com
    // C:\Users\lfg70\AppData\Roaming\Mozilla\Firefox\Profiles\x4oiq1jf.default-release-1583154523772\cookies.sqlite

    // deleting the cookie file:
    // - goto firefox-settings-privacy & security-cookies & site data-manage data
    // - you have to reopen settings after you delete the cookie file to look see the new cookie file
    // - when using the local test server firefox stores the cookies under 127.0.0.1
    // - when using the pyany server firefox stores the cookies under spotifyfinder.com

    const d = new Date();
    d.setTime(d.getTime() + (730 * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    // console.log("plDefault = ", plDefaultDict)
    document.cookie = "plDefault" + "=" + JSON.stringify(plDefaultDict) + ";" + expires + ";path=/";
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_getCookiePlDefault()
  {
    // console.log('__SF__plTab_getCookiePlDefault()');
    plDefaultDict = {}
    let name = "plDefault=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++)
    {
      let c = ca[i];
      while (c.charAt(0) == ' ')
      {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0)
      {
        plDefaultDict = $.parseJSON(c.substring(name.length, c.length));
        // $.each(plDefaultDict, function(key, values)
        // {
        //   console.log("plDefaultDict plId = ", key, ", name", values['Playlist Name'], ", owner", values['Playlist Owners Id']);
        // });

        return plDefaultDict;
        // return c.substring(name.length, c.length);
      }
    }
    return plDefaultDict;
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_btnDelete()
  {
    plTab_afDeletePlaylist();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afDeletePlaylist()
  {
    // console.log('__SF__plTab_afDeletePlaylist()');
    let cnt = vPlTable.rows({ selected: true }).count();
    if (cnt == 0)
    {
      alert('First select a playlist before pressing delete.');
      return;
    }
    if (cnt > 1)
    {
      alert('You can only delete one playlist at a time.');
      return;
    }

    let plNm =  '';
    let plId =  '';

    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      let rowData = vPlTable.row(this).data();
      plNm =  rowData[1];
      plId =  rowData[5];
    });

    msg = 'Please confirm that you would like to delete this playlist: \n' +
           '   ' + plNm + '\n\n' +
          'FYI: You can recover deleted playlists on your spotify account page.\n';

    if (confirm(msg) == false)
      return;

    await plTab_afDeletePlaylistSeq(plNm, plId);
    await plTab_afPartialReloadSeq(false);
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afDeletePlaylistSeq(plNm, plId)
  {
    try
    {
      // console.log("__SF__plTab_afDeletePlaylistSeq()");
      var deleteErr = false;
      vPlTabLoading = true;
      tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
      tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Deleting Playlist...', showStrImmed=true);
      await tabs_afDeletePlaylist(plNm, plId);
    }
    catch(err)
    {
      deleteErr = true;
      // console.log('__SF__plTab_afDeletePlaylistSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afDeletePlaylistSeq() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
      vPlTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_btnClearPlNmText()
  {
    // console.log('__SF__plTab_btnClearPlNmText()');
    $("#plTab_plNmTextInput").val('');
  }

  //-----------------------------------------------------------------------------------------------
  function plTab_btnRenamePlaylist()
  {
    // console.log('__SF__plTab_btnRenamePlaylist()');
    plTab_afRenamePlaylistSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRenamePlaylistSeq()
  {
    // console.log('__SF__plTab_afRenamePlaylistSeq()');
    try
    {
      let cnt = vPlTable.rows({ selected: true }).count();
      if (cnt == 0)
      {
        alert('First select a playlist before pressing rename.');
        return;
      }
      if (cnt > 1)
      {
        alert('You can only rename one playlist at a time.');
        return;
      }

      let vNewPlNm = $("#plTab_plNmTextInput").val();
      if (vNewPlNm == '')
      {
        alert('Please enter a new name for the selected playlist.');
        return;
      }

      let plNmAlreadyExists = false;
      let plDict = await tabs_afGetPlDict();
      $.each(plDict, function (key, values)
      {
        if (vNewPlNm.toLowerCase() == values['Playlist Name'].toLowerCase())
          plNmAlreadyExists = true;
      });

      if (plNmAlreadyExists == true)
      {
        alert('Please enter a unique playlist name. You already have or follow a playlist with the currently entered name.');
        return;
      }

      let vPlId = '';
      let vPlUserId = '';
      $.each(vPlTable.rows('.selected').nodes(), function(i, item)
      {
        let rowData = vPlTable.row(this).data();
        vPlId =  rowData[5];
        vPlUserId = rowData[6]
      });

      if (vPlUserId !== vUserId)
      {
        alert('You can not rename a playlist you do not own.');
        return;
      }

      vPlTabLoading = true;
      tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Renaming Playlist...', showStrImmed=true);

      await plTab_afRenamePlaylist(vPlId, vNewPlNm);

      // Spotify can be slow to update the list of playlists so we check for up to 30 seconds
      let reNmCnt = 0;
      let reNmFound = false;
      while ((reNmCnt < 20) && (reNmFound === false))
      {
        // this will fetch a new plDict from spotify
        await plTab_afLoadPlDict(false);

        let plDict = await tabs_afGetPlDict();
        $.each(plDict, function (key, values)
        {
          if (vNewPlNm == values['Playlist Name'])
            reNmFound = true;
        });
        reNmCnt += 1;
        console.log('__SF__plTab_afRenamePlaylistSeq() reNmCnt = ' + reNmCnt);
        await new Promise(r => setTimeout(r, 6000));
      }

      // spotify can be slow
      if (reNmFound == false)
      {
        msg = 'The playlist rename was successfully submitted to Spotify.\n' +
            'but Spotify has not yet updated it\'s database.\n\n' +
            'It can take upto 2 minutes for the rename to take affect.\n\n' +
            'You can press \'Reload from Spotify\' to reload the playlist table.\n';
        alert(msg);
      }

      $("#plTab_plNmTextInput").val('');
      await plTab_afPartialReloadSeq(false);
    }
    catch(err)
    {
      // console.log('__SF__plTab_btnCppl() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afMvplSeq() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
      vPlTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRenamePlaylist(plId, newPlNm) {
    // console.log('__SF__plTab_afRenamePlaylist() - vUrl - CreatePlaylist');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                          body: JSON.stringify({renamePlaylist: 'renamePlaylist',
                                                                     plId: plId,
                                                                     newPlNm: newPlNm}),});
    if (!response.ok)
      tabs_throwErrHttp('plTab_afRenamePlaylist()', response.status, 'tabs_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('plTab_afRenamePlaylist() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afRenamePlaylist()', reply['errRsp'], 'tabs_errInfo')
    }
  }
  
  //-----------------------------------------------------------------------------------------------
  function plTab_btnRefresh()
  {
    // console.log('__SF__plTab_btnRefresh()');
    plTab_afRefreshPlaylist();
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRefreshPlaylist()
  {
    // console.log('__SF__plTab_refresh()');
    let cnt = vPlTable.rows({ selected: true }).count();
    if (cnt > 1)
    {
      alert('Select one playlist to Refresh.\nCurrently there are ' + cnt + ' playlists selected.');
      return;
    }

    let rowData;
    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      rowData = vPlTable.row(this).data();
    });

    plNm = rowData[1];
    nTrks = rowData[2];
    plId = rowData[5];
    ownerId = rowData[6];
    // console.log('trks: ' + nTrks + ', plId: ' + plId + ', ownerId: ' + ownerId + ', plNm: ' + plNm);

    if (nTrks === 0)
    {
      alert('The playlist selected does not have any tracks.');
      return;
    }

    //---- check if user owns playlist
    if (ownerId !== vUserId)
    {
      alert('You can not refresh a playlist you do not own.');
      return;
    }

    if (nTrks > 3000)
    {
      msg = 'Refresh is only allowed on playlists with less than 3000 tracks.\n' +
            'You can refresh the playlist using the Spotify App.\n' +
            'See the Help Page on \'Refreshing to fix Remove Errors\' for details\n';
      alert(msg);
      return;
    }

    msg = 'Refresh this playlist:\n' +
          '   ' + plNm + '\n\n' +
          'Note 1: A backup of this playlist is made prior to the Refresh.\n' +
          'Note 2: Once the Refresh completes, and you are satisfied with the results, you can delete the backup.\n\n' +
          '(*** only do this if you are seeing remove errors on this playlist ***)\n';
    if (confirm(msg) == false)
      return;

    rv = await plTab_afRefreshPlaylistSeq(plNm, plId);
    await plTab_afPartialReloadSeq(true);
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afRefreshPlaylistSeq(plNm, plId)
  {
    try
    {
      // console.log("__SF__plTab_afRefreshPlaylistSeq()");
      vPlTabLoading = true;
      tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Refreshing Playlist...', showStrImmed = true);

      let reply = await tabs_afRefreshPlaylist(plNm, plId, true);
      // console.log('reply = ', reply['errRsp']);
      buPlNm = reply['buPlNm'];

      // did we have a refresh error
      if (reply['errRsp'][0] != 1)
      {
        if (reply['errRsp'][0] === -52) // errRefreshPlaylistLd
        {
          msg = 'Refresh Failed\n' +
              'Failed to load tracks for the selected playlist:\n' +
              '   ' + plNm + '\n' +
              'This playlist was not modified.\n\n' +
              'A session restart is needed.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
        }

        if (reply['errRsp'][0] === -53) // errRefreshPlaylistBu
        {
          msg = 'Refresh Failed\n' +
              'Failed to create a playlist backup.\n' +
              'The original playlist was not modified.\n\n' +
              'A session restart is needed.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
        }

        if (reply['errRsp'][0] === -54) // errRefreshPlaylistWr
        {
          msg = '*** READ THIS MESSAGE CAREFULLY ***\n' +
              'Refresh Playlist Failed\n' +
              'Unable to copy tracks from backup to original playlist.\n' +
              'A backup playlist was successfully created:\n' +
              '   ' + buPlNm + '\n' +
              'You may need to recover from this error by using the Spotify App to copy the tracks from the backup playlist to the original playlist.\n\n' +
              'A session restart is needed.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
        }

        if (reply['errRsp'][0] === -55) // errRefreshPlaylistReLd
        {
          // reloading the playlist threw an error after the refresh write finished ok
          msg = 'Refresh Playlist Finished Successfully\n\n' +
              'A backup playlist was created:\n' +
              '   ' + buPlNm + '\n' +
              'Once you are satified with the results, you can delete the backup.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
        }

        if (reply['errRsp'][0] === -51) // errRefreshPlaylist
        {
          msg = 'Refresh Failed\n\n' +
              'A session restart is needed.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
        }
      }

      await new Promise(r => setTimeout(r, 4000));  // Spotify can be slow to update the list of playlists

      // console.log("__SF__plTab_afRefreshPlaylistSeq() success.");
      msg = 'Refresh Playlist Finished Successfully\n\n' +
          'A backup playlist was created:\n' +
          '   ' + buPlNm + '\n' +
          'Once you are satified with the results, you can delete the backup.\n' +
          'At this point you should be able remove any track from this playlist.\n'
      alert(msg);
    }
    catch(err)
    {
      // console.log('__SF__plTab_afRefreshPlaylistSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__plTab_afRefreshPlaylistSeq() finally.');
      tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
      vPlTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tabs_afRefreshPlaylist(plNm, plId, reload)
  {
    console.log('__SF__plTabs_afRefreshPlaylist() - vUrl - RefreshPlaylist');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ refreshPlaylist: 'refreshPlaylist',
                                                                    plNm: plNm,
                                                                    plId: plId,
                                                                    reload: reload,
                                                                  })});
    if (!response.ok)
      tabs_throwErrHttp('tabs_afRefreshPlaylist()', response.status, 'tabs_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTabs_afRefreshPlaylist() reply = ', reply);
      return reply
    }
  }
  
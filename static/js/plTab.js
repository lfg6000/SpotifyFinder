
  var vPlTable;
  var vLastTracksRmMvCpCntr = 0;
  var vPlTabActivated = 0;
  var vPlTabLoading = false;
  var vPlTableLastSearchCol = '';
  var vPlTmExe = 0;
  var vTrackLoadingWarning = false;

  var vUserId = '';
  var vUserName = '';
  var vUserProduct = '';
  var vCookie = '';
  var vSid = '';

  const cbOwnerDefault = 'Select By Owner\'s Name';

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
       // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0 = Date.now(); // on this tab we always collect ExeTm because vShowExeTm is always 0 on the initial load of the playlists

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

        tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
        tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

        // note loadPlDict() is called by oLoader:rmTracksFromSpotPlaylist() when removing tracks
        // so we only have to reload the PlTable with the updated number of tracks
        vPlTable.clear().draw();
        await plTab_afLoadPlTable();
        await plTab_afRestorePlTableCkboxes();
        plTabs_updateSelectedCntInfo();
      }

      // console.log('__SF__plTab_afActivate() - exit');
      vPlTmExe = Math.floor((Date.now() - t0) / 1000);
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
  async function plTab_afRefresh()
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

  // //-----------------------------------------------------------------------------------------------
  // async function plTab_afLoadPlDict()
  // {
  //   // console.log('__SF__plTab_afLoadPlDict()');
  //   console.log('__SF__plTab_afLoadPlDict() - vUrl - loadPlDict');
  //   let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
  //                                      body: JSON.stringify({ loadPlDict: 'loadPlDict' }), });
  //   if (!response.ok)
  //     tabs_throwErrHttp('plTab_afLoadPlDict()', response.status, 'plTab_errInfo');
  //   else
  //   {
  //     let reply = await response.json();
  //     // console.log('__SF__plTab_afLoadPlDict() reply = ', reply);
  //     if (reply['errRsp'][0] !== 1)
  //       tabs_throwSvrErr('plTab_afLoadPlDict()', reply['errRsp'], 'plTab_errInfo')
  //   }
  // }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlDict()
  {
    console.log('__SF__plTab_afLoadPlDict()');
    let idx = 0;
    let done = false;
    let nPlRxd = 0;
    while (done === false)
    {
      sIdx = idx;
      nPlRxd = await plTab_afLoadPlDictBatch(idx);
      idx += nPlRxd;
      if (nPlRxd < 50) // when fetch less then the batchSize we are done
      {
        done = true;
      }
      // console.log('__SF__plTab_afLoadPlDict() idx =' + sIdx + ', nPlRxd = ' + nPlRxd + ', nTotal = ' + idx + ', done = ' + done);
      // if (idx >= 700)
      //   done = true
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlDictBatch(idx)
  {
    // console.log('__SF__plTab_afLoadPlDictBatch()');
    // console.log('__SF__plTab_afLoadPlDictBatch() - vUrl - loadPlDictBatch');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlDictBatch: 'loadPlDictBatch', idx: idx }), });
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

  // //-----------------------------------------------------------------------------------------------
  // function plTab_initPlTableCkboxes()
  // {
  //   // on the initial load we select all the playlists for the current user
  //   let cnt = 0;
  //   // console.log('__SF__user id = ' + vUserId)
  //   vPlTabLoading = true;
  //
  //   let setCkCnt = 100000;
  //   if (vUrl.search("127.0.0.1") > 0)
  //   {
  //     // for testing on a local host we only select the first 6 playlists
  //     setCkCnt = 10;
  //   }
  //
  //   let plListNotAutoSelected = false;
  //   vPlTable.rows().every(function ()
  //   {
  //     // console.log(this.data());
  //     let rowData = this.data()
  //     if (rowData[6] === vUserId) // ownerId === vUserId
  //     {
  //       if (rowData[2] <= 1000) // number of tracks in playlist
  //       {
  //         if (cnt < setCkCnt)
  //         {
  //           // vPlTable.row(idx).select();
  //           this.select();
  //           cnt += 1;
  //         }
  //       }
  //       else
  //       {
  //         plListNotAutoSelected = true;
  //       }
  //     }
  //   });
  //
  //   if (plListNotAutoSelected == true)
  //   {
  //     $("#plTab_info3").text("Playlists that you own with > 1000 tracks are not autmatically selected.");
  //     setTimeout(function ()
  //     {
  //       $("#plTab_info3").text('');
  //     }, 4500);
  //   }
  //   vPlTabLoading = false;
  // }

  //-----------------------------------------------------------------------------------------------
  function plTab_initPlTableCkboxes()
  {
    // console.log('__SF__user id = ' + vUserId)
    vPlTabLoading = true;

    plDefault = plTab_getCookiePlDefault();
    if (Object.keys(plDefault).length > 0)
    {
      //console.log('__SF__plTab_afRestorePlTableCkboxes() - reselect rows using plSelectedDict ');
      let idx = 0;
      vPlTabLoading = true;
      vPlTable.rows().every(function ()
      {
        rowData = this.data();
        let rowPlId = rowData[5]
        $.each(plDefault, function (key, values)
        {
          //if plTable plId matches plSelectedDict plId than select the row
          if (rowPlId === key)
            vPlTable.row(idx).select();
        });
        idx += 1;
      });
    }
    else
    {
      let cnt = 0;
      let setCkCnt = 4;
      vPlTable.rows().every(function ()
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
        let idx = 0;
        vPlTabLoading = true;
        vPlTable.rows().every(function()
        {
          rowData = this.data();
          let rowPlId = rowData[5]
          $.each(plSelectedDict, function(key, values)
          {
            //if plTable plId matches plSelectedDict plId than select the row
            if (rowPlId === key)
              vPlTable.row(idx).select();
          });
          idx += 1;
        });
        vPlTabLoading = false;
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnReload()
  {
    console.log('reload,,,,,,,,,,,,')
    var vInfoReload = null;
    if (vSearchTabLoading === true)
    {
      vInfoReload = $("#searchTab_info3");
      console.log('plTabs_btnReload search');
    }
    if (vDupsTabLoading === true)
    {
      vInfoReload = $("#dupsTab_info3");
      console.log('plTabs_btnReload dups');
    }
    if (vPlTabLoading === true)
    {
      vInfoReload = $("#plTab_info3");
      console.log('plTabs_btnReload pl');
    }
    if (vArtistsTabLoading === true)
    {
      vInfoReload = $("#artistsTab_info3");
      console.log('plTabs_btnReload artists');
    }
    if (vTracksTabLoading === true)
    {
      vInfoReload = $("#tracksTab_info3");
      console.log('plTabs_btnReload tracks');
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
    // refetch all the playlists from spotify (loadPlDict) and reload the plTable
    // console.log("plTab_reload() - simulating a page refresh click");
    document.location.reload(true) // page refresh does a complete reload
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnRestore()
  {
    // console.log('__SF__plTabs_btnRestore()');
    plTabs_btnClearSearchPlOnClick(false);
    plTab_afRefresh();
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

    // if (Object.keys(newPlSelectedDict).length === 0)  // exit if no playlists are selected
    // {
    //   console.log('__SF__plTab_afUpdatePlSelectedDict() exiting because 0 playlists are selected');
    //   return;
    // }

    console.log('__SF__plTab_afUpdatePlSelectedDict() - vUrl - setPlSelectedDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ setPlSelectedDict: 'setPlSelectedDict', newPlSelectedDict: newPlSelectedDict }) });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afUpdatePlSelectedDict()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afUpdatePlSelectedDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afUpdatePlSelectedDict()', reply['errRsp'], 'tracksTab_errInfo')
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

    let tracksToBeLoaded = 0;
    let plNumTracksInSelectedPl = 0;
    $.each(vPlTable.rows('.selected').nodes(), function(i, item)
    {
      let rowData = vPlTable.row(this).data();
      plNumTracksInSelectedPl += parseInt(rowData[2], 10);
      if (vLoadedPlIds.includes(rowData[5]) === false)
        tracksToBeLoaded += parseInt(rowData[2], 10);
    });

    let count = vPlTable.rows({ selected: true }).count();
    tabs_setLabel('plTab_info1', 'Selected Playlists: ' + count + '&nbsp &nbsp &nbsp &nbsp &nbsp' + ' Selected Tracks: '+ plNumTracksInSelectedPl);

    // console.log('tracksToBeLoaded = ', tracksToBeLoaded);
    if ((vTrackLoadingWarning === false) && (tracksToBeLoaded > 30000))
    {
      vTrackLoadingWarning = true;
      msg = 'With the currently selected playlists  ' + tracksToBeLoaded + '  tracks will need to be loaded.\n\n' +
          'It is highly recommended that you select fewer playlists, to reduce the number of tracks that need to be loaded, before continiuing.\n\n' +
          'It is significantly more efficient to work on smaller batches of playlists.\n';
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
    vPlTable.rows().deselect();
    vPlTable.rows().every(function()
    {
      rowData = this.data();
      // if ((rowData[4] + ' / ' + rowData[6]) === curSel) // ownerName / ownerId === curSel
      if (rowData[4] === curSel) // just using ownerName
      {
        this.select();
        if (selectRowData === '')  // recreate the unique class name assigned to row during init
          selectRowData = "c" + rowData[1].replace(/\W/g, '') + rowData[5].replace(/\W/g, '') // use playlist Name and Id
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
  function plTabs_btnDelete()
  {
    console.log('__SF__plTabs_btnDelete()');
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
          'FYI: You can recover deleted playlists on you spotify account page.\n';

    if (confirm(msg) == false)
      return;

    plTab_afDeletePlaylistSeq(plNm, plId);
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afDeletePlaylistSeq(plNm, plId)
  {
    try
    {
      var deleteErr = false;
      console.log("__SF__plTab_afDeletePlaylistSeq()");
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
      if (deleteErr == false)
        plTabs_btnReload();
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
  function plTab_onDblClickExeTm()
  {
    // console.log("__SF__plTab_onDblClickExeTm = ", vShowExeTm);

    // if you click "Playlists selected on this tab determines..." at the bottom of theplTab load times for each tab will be displayed
    if (vShowExeTm == 0)
    {
      vShowExeTm = 1;
      $("#plTab_ExeTm").text(vPlTmExe);
      $('#cookieDisp').text(vSid);
      $('#cookieDisp').show();
    }
    else
    {
      vShowExeTm = 0;
      $("#plTab_ExeTm").text('');
      $('#cookieDisp').hide();
    }
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
      done = false
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
      done = true
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
      if (done)
        plTabs_btnReload()
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
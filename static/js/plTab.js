
  var vPlTable;
  var vLastTracksRmMvCpCntr = 0;
  var vPlTabActivated = 0;
  var vPlTabLoading = false;
  var vPlTableLastSearchCol = '';

  var vUserId = '';
  var vUserName = '';
  var vCookie = '';
  var vSid = '';

  const cbOwnerDefault = '     Select Playlists By Owners Name / Owners Id     ';

  //-----------------------------------------------------------------------------------------------
  function plTab_initPlTab(tableHeight=300)
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
      "scrollY":         tableHeight,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets: 0, className: 'select-checkbox', orderable: false },
                    { targets: 6, visible: false, searchable: false } ],
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
        vPlTabActivated = 1;
        vLastTracksRmMvCpCntr = 1;

        tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
        tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

        await plTab_afloadSpotifyInfo();
        await plTab_afLoadPlDict();
        await plTab_afLoadPlTable();
        plTab_initPlTableCkboxes();
        await plTab_afUpdatePlSelectedDict();

        plTabs_updateSelectedCntInfo();

        // $('#cookieDisp').text(vCookie);

        // console.log('__SF__plTab_afActivate() - exit');
        return;
      }

      if (vLastTracksRmMvCpCntr !== curTracksRmMvCpCntr)
      {
        // console.log("plTab_afActivate() - last and cur removed cntrs are different");

        vLastTracksRmMvCpCntr = curTracksRmMvCpCntr;

        tabs_set2Labels('plTab_info1', 'Loading...', 'plTab_info2', 'Loading...');
        tabs_progBarStart('plTab_progBar', 'plTab_progStat1', 'Loading Playlists...', showStrImmed=true);

        // note loadPlDict() is called by oLoader:rmTracksFromSpotPlaylist() when removing tracks
        // so we only have to reload the PlTable with the updated number of tracks
        vPlTable.clear().draw();
        $('#plTabs_cbUsers').empty();
        await plTab_afLoadPlTable();
        await plTab_afRestorePlTableCkboxes();
        // console.log('__SF__plTab_afActivate() - exit');
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

      vPlTable.order([]); // remove sorting
      vPlTable.clear().draw();
      await plTab_afLoadPlTable();
      await plTab_afRestorePlTableCkboxes();
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
    rVal = 1;
    console.log('__SF__plTab_afloadSpotifyInfo() - vUrl - loadSpotifyInfo');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadSpotifyInfo: 'loadSpotifyInfo' }), });
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
      vCookie = reply['cookie']
      vSid = reply['sid']
      // console.log('__SF__plTabs_loadSpotifyInfo() - \n   userId = ' + vUserId + ',\n   userName = ' + vUserName + ',\n   cookie = ' + vCookie + ',\n   sid = ' + vSid);
      infoTab_addClientLogMsg(['sid = '+ vSid ]);
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function plTab_afLoadPlDict()
  {
    // console.log('__SF__plTab_afLoadPlDict()');
    console.log('__SF__plTab_afLoadPlDict() - vUrl - loadPlDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlDict: 'loadPlDict' }), });
    if (!response.ok)
      tabs_throwErrHttp('plTab_afLoadPlDict()', response.status, 'plTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__plTab_afLoadPlDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('plTab_afLoadPlDict()', reply['errRsp'], 'plTab_errInfo')
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
        if (val['Playlist Owners Id'] === vUserId)
          vPlTable.row.add(['', val['Playlist Name'], val['Tracks'], val['Public'], val['Playlist Owners Name'], val['Playlist Id'], val['Playlist Owners Id']]);
      });
      $.each(plDict, function(key, val)
      {
        if (val['Playlist Owners Id'] !== vUserId)
          vPlTable.row.add(['', val['Playlist Name'], val['Tracks'], val['Public'], val['Playlist Owners Name'], val['Playlist Id'], val['Playlist Owners Id']]);
      });
      vPlTable.draw();

      let infoStr2 = 'Total Playlists: ' + reply['NPlaylists'] + '&nbsp &nbsp &nbsp &nbsp &nbsp' + ' Total Tracks: ' + reply['NTracks'];
      tabs_setLabel('plTab_info2', infoStr2);

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
    // on the initial load we select all the playlists for the current user
    let cnt = 0;
    // console.log('__SF__user id = ' + vUserId)
    vPlTabLoading = true;

    let setCkCnt = 100000;
    if (vUrl.search("127.0.0.1") > 0)
    {
      // for testing on a local host we only select the first 6 playlists
      setCkCnt = 6;
    }

    vPlTable.rows().every(function ()
    {
      // console.log(this.data());
      let rowData = this.data()
      if (rowData[6] === vUserId) // ownerId === vUserId
        if (cnt < setCkCnt)
        {
          // vPlTable.row(idx).select();
          this.select();
          cnt += 1;
        }
    });
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
    // called when the user presses reload from spotify
    // refetch all the playlists from spotify (loadPlDict) and reload the plTable
    // console.log("plTab_reload() - simulating a page refresh click");
    document.location.reload(true) // page refresh does a complete reload
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnRefresh()
  {
    // console.log('__SF__plTabs_btnRefresh()');
    plTab_afRefresh();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_plTableSelect() { /* make function appear in pycharm structure list */ }
  $('#plTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    if (vPlTabLoading === true)
      return;

    // let rowData = $('#plTable').DataTable().row(indexes).data();
    // console.log( 'plTab - You clicked on ' + rowData[1]);
    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  });

  //-----------------------------------------------------------------------------------------------
  function plTabs_plTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#plTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    if (vPlTabLoading === true)
      return;

    // let rowData = $('#plTable').DataTable().row(indexes).data();
    // console.log( 'plTab - You clicked on ' + rowData[1]);
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
    // try
    // {
    //   // console.log('__SF__plTab_afIncPlSelectionCntr()');
    //   console.log('__SF__plTab_afIncPlSelectionCntr() - vUrl - incPlSelectionCntr');
    //   let response = await fetch(vUrl, {
    //     method: 'POST', headers: {'Content-Type': 'application/json',},
    //     body: JSON.stringify({incPlSelectionCntr: 'incPlSelectionCntr'}),
    //   });
    //   if (!response.ok)
    //     tabs_throwErrHttp('plTab_afIncPlSelectionCntr()', response.status, 'plTab_errInfo');
    //   else
    //   {
    //     let reply = await response.json();
    //     // console.log('__SF__plTab_afIncPlSelectionCntr() reply = ', reply);
    //     if (reply['errRsp'][0] !== 1)
    //       tabs_throwSvrErr('plTab_afIncPlSelectionCntr()', reply['errRsp'], 'plTab_errInfo')
    //   }
    // }
    // catch(err)
    // {
    //   // console.log('__SF__plTab_afActivate() caught error: ', err);
    //   tabs_errHandler(err);
    // }
    // finally
    // {
    //   console.log('__SF__plTab_afIncPlSelectionCntr() finally.');
    //   tabs_progBarStop('plTab_progBar', 'plTab_progStat1', '');
    // }

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
    //console.log('__SF__plTabs_updateSelectedCntInfo()');
    let count = vPlTable.rows({ selected: true }).count();
    tabs_setLabel('plTab_info1', 'Selected Playlists: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnClearSearchPlOnClick()
  {
    //console.log('__SF__plTabs_btnClearSearchPlNameOnClick()');
    // clear search boxes under pl table
    $("input[name^='plColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vPlTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnSelectAll()
  {
    // console.log('__SF__plTabs_btnSelectAll()')
    vPlTabLoading = true;
    vPlTable.rows().every(function()
    {
      this.select();
    });
    vPlTabLoading = false;

    plTab_afIncPlSelectionCntr();
    plTabs_updateSelectedCntInfo();
  }

  //-----------------------------------------------------------------------------------------------
  function plTabs_btnClearAll()
  {
    // console.log('__SF__plTabs_btnClearAll()')
    vPlTabLoading = true;
    vPlTable.rows().every(function()
    {
      this.deselect();
    });
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
    vPlTable.rows().every(function()
    {
      rowData = this.data();
      if ((rowData[4] + ' / ' + rowData[6]) === curSel) // ownerName / ownerId === curSel
      {
        this.select();
        if (selectRowData === '')  // recreate the unique class name assigned to row during init
          selectRowData = "c" + rowData[1].replace(/\W/g, '') + rowData[5].replace(/\W/g, '') // use playlist Name and Id
      }
      else
        this.deselect();
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


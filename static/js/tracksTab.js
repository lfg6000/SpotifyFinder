
  var vPlNamesTable;
  var vPlTracksTable;
  var vLastPlSelectionCntrTracksTab = 0;
  var vTracksTabLoading = false;
  var vPlTracksTableLastSearchCol = '';
  var vPlNameTableLastSelectedRow = 0;

  //-----------------------------------------------------------------------------------------------
  function tracksTab_initTracksTab(tableHeight=300)
  {
    console.log("tracksTab_initTracksTab()  plNamesTable ready()");

    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#plNamesTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        //
        // id="tracksTab_btnClearSearchPlNameOnClick"  // did not work
        $(this).html('<button onclick="tracksTab_btnClearSearchPlNameOnClick()" class="btnClrSearch" style="float: left; margin-right: 5px;" title="Clear search">x</button> \
                      <input type="text" style="margin-top: 2px;" name="plNamesTableSearchBox" placeholder="Search"/> ' );
      }
      ftIdx += 1;
    });

    vPlNamesTable = $('#plNamesTable').DataTable(
    {
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull)
      {
        // assign unique class name to each row so we can scroll to it in tracksTab_selectRow()
        $(nRow).addClass("c" + aData[0].replace(/\W/g, '') + aData[1].replace(/\W/g, '')); // use playlist Name and Id as class name
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
      "orderClasses":    false,  // background color of sorted column does not change
      "order":           [],
      keys:              {blurable: false},
      columnDefs: [ { targets: 1, visible: false, searchable: false } ],
      select: { style: 'single' },
    });

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    ftIdx = 0;
    $('#tracksTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="tracksTab_btnClearSearchTracksOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'trackTableColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    });

    console.log("tracksTab_initTracksTab()  tracksTable ready()");
    vPlTracksTable = $('#tracksTable').DataTable(
    {
      "fnRowCallback": function(nRow, rowData)
      {
          if (rowData[10] != vUserId)  // playlistOwnerId != vUserId
            $('td:eq(0)', nRow).addClass('disabledCkBx');
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
              vPlTracksTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      "dom":            "rt",
      "scrollY":         tableHeight,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false,   // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets: 0, className: 'select-checkbox', orderable: false },
                    { targets: 8, visible: false, searchable: false },
                    { targets: 9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false } ],
      select: { style: 'multi' }
    } );
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_redraw()
  {
    console.log('tracksTab_redraw()');
    vPlNamesTable.columns.adjust().draw();
    vPlTracksTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_selectRow()
  {
    //console.log('tracksTab_selectRow()');
    // issue:
    //  - when clicking on a name row the selection is not remembered when switching back to this tab
    //  - when arrow up/dn on a name row the selection is remembered when switching back to this tab
    // fix:
    //  - we store the last selected row and apply it when switching this tab
    //  - focus() calls select() which calls artistsTab_afLoadArtistTracksTableSeq()
    console.log('tracksTab_selectRow() - focus - lastSelectedRow = ' + vPlNameTableLastSelectedRow);
    vPlNamesTable.cell(vPlNameTableLastSelectedRow, 0).focus();

    // issue:
    //  - if you scroll the selected pl name out of view and then go to plTab and back
    //    to the tracksTab the selected pl name is not visible
    // fix:
    //  - use scrollTo util to ensure selected pl name is viewable
    let rowData = vPlNamesTable.row(vPlNameTableLastSelectedRow).data();
    let selectRowData = "c" + rowData[0].replace(/\W/g, '') + rowData[1].replace(/\W/g, '') // use playlist Name and Id
    let selection = $('#plNamesTable .' + selectRowData);
    $(".dataTables_scrollBody").scrollTo(selection);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('tracksTab_activate()');
      console.log('tracksTab_activate() - lastCnt = ' + vLastPlSelectionCntrTracksTab + ', curCnt = ' + curPlSelectionCntr);

      if (vLastPlSelectionCntrTracksTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrTracksTab = curPlSelectionCntr;
        vPlNameTableLastSelectedRow = 0;
        vTracksTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vPlNamesTable.clear().draw();
        vPlTracksTable.clear().draw();

        // this will start a chain of async calls
        //   1) loadPlTracks -> loadPlTracks, 2) loadPlNames -> getPlSelectedDict, 3) loadPlTracks -> getTrackList
        console.log('tracksTab_afActivate() - start loading');
        tabs_set2Labels('tracksTab_info1', 'Loading', 'tracksTab_info2', 'Loading');
        tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...', showStrImmed=true);

        await tracksTab_afLoadPlTracks();
        await tracksTab_afLoadPlNameTable();
        await tracksTab_afLoadTracksTable(plId = '');

        console.log('tracksTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('tracksTab_afActivate() finally.');
      vTracksTabLoading = false;
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlTracks()
  {
    // console.log('tracksTab_afLoadPlTracks()');
    console.log('tracksTab_afLoadPlTracks() - vUrl - loadPlTracks');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlTracks: 'loadPlTracks' }), });
    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadPlTracks()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('tracksTab_afLoadPlTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadPlTracks()', reply['errRsp'], 'tracksTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlNameTable()
  {
    // console.log('tracksTab_afLoadPlNameTable()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    console.log('tracksTab_afLoadPlNameTable() - vUrl - getPlSelectedDict');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getPlSelectedDict: 'getPlSelectedDict'}),});
    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadPlNameTable()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('tracksTab_afLoadPlNameTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadPlNameTable()', reply['errRsp'], 'tracksTab_errInfo')

      let plSelectedDict = reply['plSelectedDict']
      // console.log('tracksTab_loadPlNameTable() - plSelectedDict = \n' + JSON.stringify(plSelectedDict, null, 4));
      $.each(plSelectedDict, function (key, values)
      {
        vPlNamesTable.row.add([values['Playlist Name'], key]);
      })
      vPlNamesTable.draw();

      if (Object.keys(plSelectedDict).length === 0)
        console.log('tracksTab_afLoadPlNameTable() - the returned plSelectedDict is empty');
      else
        vPlNamesTable.cell(':eq(0)').focus();
        // vPlNamesTable.row(':eq(0)').select();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableSelect() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    console.log('tracksTab_plNameTableRow_onSelect() - plNamesTable row select indexes = ', indexes);
    let rowData = $('#plNamesTable').DataTable().row(indexes).data();
    tracksTab_afLoadTracksTableSeq(plId = rowData[1]);
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableKeyFocus() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on('key-focus', function (e, datatable, cell)
  {
    console.log('tracksTab_plNameTableRow_onFocus() - plNamesTable key focus ');
    if (vTracksTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      console.log('tracksTab_plNameTableRow_onFocus() - exiting - loading is true');
      return;
    }
    // datatable.rows().deselect();
    console.log('tracksTab_plNameTableRow_onFocus() - selecting row = ' + cell.index().row);
    vPlNameTableLastSelectedRow = cell.index().row;
    datatable.row( cell.index().row ).select();
  });

  // //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTableSeq(plId)
  {
    try
    {
      // console.log('tracksTab_afLoadTracksTableSeq() - plId = ' + plId');
      vTracksTabLoading = true;
      vPlNamesTable.keys.disable();  // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks for selected playlist...', showStrImmed=false);

      // tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...');
      await tracksTab_afLoadTracksTable(plId)
    }
    catch(err)
    {
      // console.log('plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('tracksTab_afLoadTracksTableSeq() finally.');
      vTracksTabLoading = false;
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTable(plId = '')
  {
    if (plTabs_getSelectedCnt() === 0) // any pl selected on plTab?
      return

    if (plId === '')
    {
      plId = vPlNamesTable.row(0).data()[1];
      // console.log('tracksTab_afLoadTracksTable() - using first row plId = ' + plId);
    }

    // vPlTracksTable.clear().draw();// this does not work well here
    console.log('tracksTab_afLoadTracksTable() - vUrl - getTrackList');
    let response = await fetch(vUrl, {  method: 'POST', headers: {'Content-Type': 'application/json',},
                                        body: JSON.stringify({getTrackList: 'getTrackList', plId: plId}),});

    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadTracksTable()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('tracksTab_afLoadPlTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadTracksTable()', reply['errRsp'], 'tracksTab_errInfo')

      let trackList = reply['trackList']
      $.each(trackList, function (key, tVals)
      {
        vPlTracksTable.row.add(['', tVals['Track Name'], tVals['Artist Name'], tVals['Album Name'], tVals['Duration Hms'],
                                    tVals['Track Position'], tVals['Playlist Owners Name'], tVals['Track Id'], plId, tVals['Track Uri'],
                                    tVals['Playlist Owners Id']]);
      });
      vPlTracksTable.draw();

      tracksTab_updateSelectedCnt();
      let infoStr2 = trackList[0]['Playlist Name'] + ', &nbsp ' + trackList.length + ' songs, &nbsp ' + reply['plDuration']
      tabs_setLabel('tracksTab_info2', infoStr2);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_tracksTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    rowData = vPlTracksTable.row(cell.node()).data()
    // let rowData = vPlTracksTable.row(indexes).data();
    // console.log('tracksTab_tracksTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
    if (rowData[10] != vUserId)   // playlistOwnerId != vUserId
    {
       e.preventDefault();
       $("#tracksTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
       setTimeout(function() { $("#tracksTab_info3").text(''); }, 4500);
       return;
    }

    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_tracksTable_onDeselect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on( 'deselect.dt', function (e, dt, type, indexes)
  {
    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnRemoveTracks()
  {
    console.log('tracksTab_btnRemoveTracks()');
    tracksTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afRmTracksSeq()
  {
    try
    {
      console.log('tracksTab_afRmTracksSeq()');
      vTracksTabLoading = true;

      vPlNamesTable.keys.disable();  // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      console.log('tracksTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      await tracksTab_afLoadTracksTable(pl=rowData[8]);
    }
    catch(err)
    {
      // console.log('plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('tracksTab_afRmTracksSeq() finally.');
      vTracksTabLoading = false;
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnRefresh()
  {
    console.log('tracksTab_btnRefresh()');
    let rowData = vPlTracksTable.row(0).data();
    // console.log('tracksTab_btnReload() - plNameTable rowData = \n' + JSON.stringify(rowData, null, 4));
    vPlTracksTable.order([]); // remove sorting
    tracksTab_afLoadTracksTableSeq(plId = rowData[8]);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearSearchPlNameOnClick()
  {
    // console.log('tracksTab_btnClearSearchPlNameOnClick()');
    vTracksTabLoading = true; // prevent any pl name selections
    let searchInputBox = $('[name="plNamesTableSearchBox"]');
    searchInputBox.val('');
    searchInputBox.keyup();
    searchInputBox.focus();
    vTracksTabLoading = false;
    tracksTab_selectRow(); // put focus on last item found
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearSearchTracksOnClick()
  {
    // clear search boxes under tracks table
    $("input[name^='trackTableColSearchIB']").each(function() // clear search boxes under tracks table
    {
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vPlTracksTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_updateSelectedCnt()
  {
    // console.log('tracksTab_updateSelectedCnt()');
    let count = vPlTracksTable.rows({ selected: true }).count();
    tabs_setLabel('tracksTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnHelp()
  {
    vHtmlInfoFn = 'helpTextTabTracks.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  // function tracksTab_btnCoffee()
  // {
  //   console.log('plTabs_btnCoffee()');
  //   vHtmlInfoFn = 'helpTextCoffee.html';
  //   $("#btnInfoTab")[0].click();
  // }

  var vPlNamesTable;
  var vPlTracksTable;
  var vLastPlSelectionCntrTracksTab = 0;
  var vTracksTabLoading = false;
  var vPlTracksTableLastSearchCol = '';
  var vPlNameTableLastSelectedRow = 0;

  //-----------------------------------------------------------------------------------------------
  function tracksTab_init(tableHeight=300)
  {
    // console.log("tracksTab_initTracksTab()  plNamesTable ready()");

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
      "scrollY":         tableHeight - 18,
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

    // console.log("tracksTab_initTracksTab()  tracksTable ready()");
    vPlTracksTable = $('#tracksTable').DataTable(
    {
      // "fnRowCallback": function(nRow, rowData)
      // {
      //     if (rowData[10] != vUserId)  // playlistOwnerId != vUserId
      //       $('td:eq(0)', nRow).addClass('disabledCkBx');
      // },

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
      "scrollY":         tableHeight - 18,
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
    // console.log('__SF__tracksTab_redraw()');
    vPlNamesTable.columns.adjust().draw();
    vPlTracksTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_selectRow()
  {
    // console.log('__SF__tracksTab_selectRow()');
    // issue:
    //  - when clicking on a name row the selection is not remembered when switching back to this tab
    //  - when arrow up/dn on a name row the selection is remembered when switching back to this tab
    // fix:
    //  - we store the last selected row and apply it when switching this tab
    //  - focus() calls select() which calls artistsTab_afLoadArtistTracksTableSeq()
    // console.log('__SF__tracksTab_selectRow() - focus - lastSelectedRow = ' + vPlNameTableLastSelectedRow);
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
      // console.log('__SF__tracksTab_activate()');
      // console.log('__SF__tracksTab_activate() - lastCnt = ' + vLastPlSelectionCntrTracksTab + ', curCnt = ' + curPlSelectionCntr);

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#tracksTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrTracksTab !== curPlSelectionCntr)
      {
        vPlNamesTable.keys.disable();  // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
        vLastPlSelectionCntrTracksTab = curPlSelectionCntr;
        vPlNameTableLastSelectedRow = 0;
        vTracksTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vPlNamesTable.clear().draw();
        vPlTracksTable.clear().draw();
        $('#tracksTab_cbMvCpDest').empty();


        // this will start a chain of async calls
        //   1) loadPlTracks -> loadPlTracks, 2) loadPlNames -> getPlSelectedDict, 3) loadPlTracks -> getTrackList
        // console.log('__SF__tracksTab_afActivate() - start loading');
        tabs_set2Labels('tracksTab_info1', 'Loading...', 'tracksTab_info2', 'Loading...');
        tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...', showStrImmed=true);

        $('#tracksTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));

        await tracksTab_afLoadPlNameTable();
        await tracksTab_afLoadPlTracks();

        // 2x getTrackList()
        // - on tab switch we call tracksTab_selectRow()
        // - this invokes tracksTab_afLoadTracksTable() via chained events
        //   --> tracksTab_selectRow()
        //     --> tracksTab_plNameTableKeyFocus()
        //       --> tracksTab_plNameTableSelect()
        //         --> tracksTab_afLoadTracksTableSeq(plId, plName)
        //           --> tracksTab_afLoadTracksTable(plId, plName) this is vUrl getTrackList

        // await tracksTab_afLoadTracksTable(plId='');
        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#tracksTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__tracksTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afActivate() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      vTracksTabLoading = false;
    }
  }

  // //-----------------------------------------------------------------------------------------------
  // async function tracksTab_afLoadPlTracks()
  // {
  //   // console.log('__SF__tracksTab_afLoadPlTracks()');
  //   console.log('__SF__tracksTab_afLoadPlTracks() - vUrl - loadPlTracks');
  //   let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
  //                                      body: JSON.stringify({ loadPlTracks: 'loadPlTracks' }), });
  //   if (!response.ok)
  //     tabs_throwErrHttp('tracksTab_afLoadPlTracks()', response.status, 'tracksTab_errInfo');
  //   else
  //   {
  //     let reply = await response.json();
  //     // console.log('__SF__tracksTab_afLoadPlTracks() reply = ', reply);
  //     if (reply['errRsp'][0] !== 1)
  //       tabs_throwSvrErr('tracksTab_afLoadPlTracks()', reply['errRsp'], 'tracksTab_errInfo')
  //   }
  // }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlTracks()
  {
    // console.log('__SF__tracksTab_afLoadPlTracks()');
    let plSelectedDictNotLoaded = await tracksTab_afGetPlSelectedDictNotLoaded();
    console.log('__SF__tracksTab_afLoadPlTracks() plSelectedDictNotLoaded cnt = ' + Object.keys(plSelectedDictNotLoaded).length);
    // console.log('__SF__tracksTab_loadPlNameTable() - plSelectedDictNotLoaded = \n' + JSON.stringify(plSelectedDictNotLoaded, null, 4));
    // for (let plId in plSelectedDictNotLoaded)
    for (const [plId, value] of Object.entries(plSelectedDictNotLoaded))
      await tracksTab_afLoadPlTracks1x(plId, value['Playlist Name']);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlTracks1x(plId, plName)
  {
    // console.log('__SF__tracksTab_afLoadPlTracks1x()');
    // console.log('tracksTab_afLoadPlTracks1x() - vUrl - loadPlTracks1x plId = ' + plId + ', playlistName = ' + plName);
    // console.log('tracksTab_afLoadPlTracks1x() - vUrl - loadPlTracks1x');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlTracks1x: 'loadPlTracks1x', plId: plId }), });
    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadPlTracks1x()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadPlTracks1x() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadPlTracks1x()', reply['errRsp'], 'tracksTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlNameTable()
  {
    // console.log('__SF__tracksTab_afLoadPlNameTable()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    let plSelectedDict = await tracksTab_afLoadPlSelectedDict();

    // console.log('__SF__tracksTab_loadPlNameTable() - plSelectedDict = \n' + JSON.stringify(plSelectedDict, null, 4));
    $.each(plSelectedDict, function (key, values)
    {
      vPlNamesTable.row.add([values['Playlist Name'], key]);
    })
    vPlNamesTable.draw();

    if (Object.keys(plSelectedDict).length === 0)
    {
      // console.log('__SF__tracksTab_afLoadPlNameTable() - the returned plSelectedDict is empty');
      return;
    }

    vPlNamesTable.cell(':eq(0)').focus();
    // vPlNamesTable.row(':eq(0)').select();

    // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + JSON.stringify(plSelectedDict, null, 4));
    $.each(plSelectedDict, function (key, item)
    {
      if (item['Playlist Owners Id'] == vUserId)
      {
        idNm = key + '::::' + item['Playlist Name']
        // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
        plNm = item['Playlist Name']
        if (plNm.length > 44)
          plNm = plNm.slice(0, 44) + '...'
        $('#tracksTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
      }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableSelect() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_plNameTableRow_onSelect() - plNamesTable row select indexes = ', indexes);
    if (vTracksTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__tracksTab_plNameTableRow_onSelect() - exiting - loading is true');
      return;
    }
    let rowData = $('#plNamesTable').DataTable().row(indexes).data();
    tracksTab_afLoadTracksTableSeq(plId = rowData[1], plName = rowData[0]);
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableKeyFocus() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on('key-focus', function (e, datatable, cell)
  {
    // console.log('__SF__tracksTab_plNameTableRow_onFocus() - plNamesTable key focus ');
    if (vTracksTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__tracksTab_plNameTableRow_onFocus() - exiting - loading is true');
      return;
    }
    // datatable.rows().deselect();
    // console.log('__SF__tracksTab_plNameTableRow_onFocus() - selecting row = ' + cell.index().row);
    vPlNameTableLastSelectedRow = cell.index().row;
    datatable.row( cell.index().row ).select();
  });

  // //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTableSeq(plId, plName)
  {
    try
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() - plId = ' + plId);
      vTracksTabLoading = true;
      vPlNamesTable.keys.disable();  // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks for selected playlist...', showStrImmed=false);

      // tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...');
      await tracksTab_afLoadTracksTable(plId, plName)
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTable(plId = '', plName = '')
  {
    if (plId === '')
    {
      plId = vPlNamesTable.row(0).data()[1];
      plName = vPlNamesTable.row(0).data()[0];
      // console.log('__SF__tracksTab_afLoadTracksTable() - using first row plId = ' + plId);
    }

    infoStr2 = plName;
    tabs_setLabel('tracksTab_info2', infoStr2);


    // vPlTracksTable.clear().draw();// this does not work well here
    // console.log('__SF__tracksTab_afLoadTracksTable() - vUrl - getTrackList, plName = ', plName);
    console.log('__SF__tracksTab_afLoadTracksTable() - vUrl - getTrackList');
    let response = await fetch(vUrl, {  method: 'POST', headers: {'Content-Type': 'application/json',},
                                        body: JSON.stringify({getTrackList: 'getTrackList', plId: plId}),});

    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadTracksTable()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadTracksTable() reply = ', reply);
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
      let infoStr2 = 'Playlist is empty';
      if (vPlTracksTable.rows().count() != 0)
        infoStr2 = trackList[0]['Playlist Name'] + ', &nbsp ' + trackList.length + ' songs, &nbsp ' + reply['plDuration']
      tabs_setLabel('tracksTab_info2', infoStr2);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_tracksTableSelect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_tracksTab_tracksTableSelect() - tracksTable row select');
    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function plTabs_tracksTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_tracksTab_tracksTableDeselect() - tracksTable row deselect');
    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  // function tracksTab_tracksTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  // $('#tracksTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  // {
  //   // console.log('__SF__tracksTableRow_onUserSelect()');
  //
  //   let rowData = vPlTracksTable.row(cell.node()).data()
  //   // let rowData = vPlTracksTable.row(indexes).data();
  //   // console.log('__SF__tracksTab_tracksTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
  //   if (rowData[10] != vUserId)   // playlistOwnerId != vUserId...user is not the owner of the track....
  //   {
  //      e.preventDefault();
  //      $("#tracksTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
  //      setTimeout(function() { $("#tracksTab_info3").text(''); }, 4500);
  //      return;
  //   }

    // tracksTab_updateSelectedCnt(); // can not do this here since the select has yet to occur
  // });

  //-----------------------------------------------------------------------------------------------
  // function tracksTab_tracksTable_onDeselect() { /* make function appear in pycharm structure list */ }
  // $('#tracksTable').on( 'deselect.dt', function (e, dt, type, indexes)
  // {
  // });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnRemoveTracks()
  {
    // console.log('__SF__tracksTab_btnRemoveTracks()');
    tracksTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afRmTracksSeq()
  {
    try
    {
      // console.log('__SF__tracksTab_afRmTracksSeq()');
      vTracksTabLoading = true;
      vPlNamesTable.keys.disable();  // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[10] !== vUserId)
        {
          alert('You can not remove tracks from playlists you do not own.');
          throw "NotOwnerErr";
        }
        rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__tracksTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      await tracksTab_afLoadTracksTable(pl=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afRmTracksSeq() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afRmTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vPlNamesTable.keys.enable();   // prevent tracksTable from showing wrong playlist when user holds down up/dn arrows
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnRefresh()
  {
    // console.log('__SF__tracksTab_btnRefresh()');
    tracksTab_btnClearSearchPlNameOnClick();
    tracksTab_btnClearSearchTracksOnClick();
    let rowData = vPlTracksTable.row(0).data();
    // console.log('__SF__tracksTab_btnReload() - plNameTable rowData = \n' + JSON.stringify(rowData, null, 4));
    vPlTracksTable.order([]); // remove sorting
    tracksTab_afLoadTracksTableSeq(plId = rowData[8]);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearSearchPlNameOnClick()
  {
    // console.log('__SF__tracksTab_btnClearSearchPlNameOnClick()');
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
    // console.log('__SF__tracksTab_updateSelectedCnt()');
    let count = vPlTracksTable.rows({ selected: true }).count();
    // console.log('__SF__tracksTab_updateSelectedCnt() cnt = ', count);
    tabs_setLabel('tracksTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnHelp()
  {
    vHtmlInfoFn = 'helpTextTabTracks.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnMoveTracks()
  {
    // console.log('__SF__tracksTab_btnMoveTracks()');

    let idNm = $('#tracksTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__tracksTab_cbMvCpDestOnChange() val = ' + idNm[0]);
    // console.log('__SF__tracksTab_cbMvCpDestOnChange() val = ' + idNm[1]);

    let count = vPlTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To move a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To move tracks you need to   Select A Destination Playlist    from the drop down combo box.');
    else
      tracksTab_afMvTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afMvTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__tracksTab_afMvTracksSeq()');
      vtracksTabLoading = true;
      vPlNamesTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Moving Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let mvTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[10] !== vUserId)
        {
          alert('You can not move tracks you do not own (try using the copy feature instead).');
          throw "NotOwnerErr";
        }
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
          mvTrackList.push(rowData[7]); // track id
        }
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMoveCopyTracks(destPlId, mvTrackList, 'Mv');
      await tabs_afRemoveTracks(rmTrackList);
      await tracksTab_afLoadTracksTable(pl=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vtracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnCopyTracks()
  {
    // console.log('__SF__tracksTab_btnCopyTracks()');

    let idNm = $('#tracksTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__tracksTab_btnCopyTracks() val = ' + idNm[0]);
    // console.log('__SF__tracksTab_btnCopyTracks() val = ' + idNm[1]);

    let count = vPlTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To copy a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To copy tracks you need to   Select A Destination Playlist    from the drop down combo box.');
    else
      tracksTab_afCpTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afCpTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__tracksTab_afCpTracksSeq()');
      vtracksTabLoading = true;
      vPlNamesTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[7]); // track id
        }
      });

      if (Object.keys(cpTrackList).length < 0)
        return

      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMoveCopyTracks(destPlId, cpTrackList, 'Cp');
      await tracksTab_afLoadTracksTable(pl=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_btnCopyTracks() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vtracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlSelectedDict()
  {
    // console.log('__SF__tracksTab_afLoadPlSelectedDict()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    console.log('__SF__tracksTab_afLoadPlSelectedDict() - vUrl - getPlSelectedDict');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getPlSelectedDict: 'getPlSelectedDict'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__tracksTab_afLoadPlSelectedDict()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadPlSelectedDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__tracksTab_afLoadPlSelectedDict()', reply['errRsp'], 'tracksTab_errInfo')

      return reply['plSelectedDict']
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afGetPlSelectedDictNotLoaded()
  {
    // console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded() - vUrl - getPlSelectedDictNotLoaded');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getPlSelectedDictNotLoaded: 'getPlSelectedDictNotLoaded'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__tracksTab_afGetPlSelectedDictNotLoaded()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__tracksTab_afGetPlSelectedDictNotLoaded()', reply['errRsp'], 'tracksTab_errInfo')

      return reply['plSelectedDictNotLoaded']
    }
  }
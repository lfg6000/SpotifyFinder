
  var vArtistNamesTable;
  var vArtistTracksTable;
  var vLastPlSelectionCntrArtistsTab = 0;
  var vArtistsTabLoading = false;
  var vArtistTracksTableLastSearchCol = '';
  var vArtistNameTableLastSelectedRow = 0;

  //-----------------------------------------------------------------------------------------------
  function artistsTab_initArtistTab(tableHeight=300)
  {
    // console.log("artistsTab_initTracksTab()  artistNamesTable ready()");

    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#artistNamesTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        // id="artistsTab_btnClearSearchPlNameOnClick"  // did not work
        $(this).html('<button onclick="artistsTab_btnClearSearchArtistNameOnClick()" class="btnClrSearch" style="float: left; margin-right: 5px;" title="Clear search">x</button> \
                      <input type="text" style="margin-top: 2px;" name="artistNamesTableSearchBox" placeholder="Search"/> ' );
      }
      ftIdx += 1;
    });

    vArtistNamesTable = $('#artistNamesTable').DataTable(
    {
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull)
      {
        // assign unique class name to each row so we can scroll to it in artistsTab_selectRow()
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
    $('#artistTracksTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="artistsTab_btnClearSearchTracksOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'trackTableColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    });

    // console.log("artistsTab_initTracksTab()  artistTracksTable ready()");
    vArtistTracksTable = $('#artistTracksTable').DataTable(
    {
      // "fnRowCallback": function(nRow, rowData)
      // {
      //     if (rowData[11] != vUserId)  // playlistOwnerId != vUserId
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
              vArtistTracksTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      "dom":            "rt",
      "scrollY":         tableHeight -18,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false,   // background color of sorted column does not change
      "order":           [[ 2, "asc" ]],
      columnDefs: [ { targets: 0,  className: 'select-checkbox', orderable: false },
                    { targets: 8,  visible: false, searchable: false },
                    { targets: 9,  visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false } ],
      select: { style: 'multi' }
    } );
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_redraw()
  {
    // console.log('__SF__artistsTab_redraw()');
    vArtistNamesTable.columns.adjust().draw();
    vArtistTracksTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_selectRow()
  {
    // console.log('__SF__artistsTab_selectRow()');
    // issue:
    //  - when clicking on a name row the selection is not remembered when switching back to this tab
    //  - when arrow up/dn on a name row the selection is remembered when switching back to this tab
    // fix:
    //  - we store the last selected row and apply it when switching this tab
    //  - focus() calls select() which calls artistsTab_afLoadArtistTracksTableSeq()
    // console.log('__SF__artistsTab_selectRow() - focus lastSelectedRow= ' + vArtistNameTableLastSelectedRow);
    vArtistNamesTable.cell(vArtistNameTableLastSelectedRow, 0).focus();

    // issue:
    //  - if you scroll the selected artist name out of view and then go to plTab and back
    //    to the artistsTab the selected aritist name is not visible
    // fix:
    //  - use scrollTo util to ensure selected artist name is viewable
    let rowData = vArtistNamesTable.row(vArtistNameTableLastSelectedRow).data();
    let selectRowData = "c" + rowData[0].replace(/\W/g, '') + rowData[1].replace(/\W/g, '') // use playlist Name and Id
    let selection = $('#artistNamesTable .' + selectRowData);
    $(".dataTables_scrollBody").scrollTo(selection);
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__artistsTab_activate()');
      // console.log('__SF__artistsTab_activate() - lastCnt = ' + vLastPlSelectionCntrArtistsTab + ', curCnt = ' + curPlSelectionCntr);

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#artistsTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrArtistsTab !== curPlSelectionCntr)
      {
        vArtistNamesTable.keys.disable();
        vLastPlSelectionCntrArtistsTab = curPlSelectionCntr;
        vArtistNameTableLastSelectedRow = 0;
        vArtistsTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vArtistNamesTable.clear().draw();
        vArtistTracksTable.clear().draw();
        $('#artistsTab_cbMvCpDest').empty();

        // this will start a chain of async calls
        //   1) loadPlTracks -> loadPlTracks, 2) loadPlNames -> getPlSelectedDict, 3) loadPlTracks -> getTrackList
        // console.log('__SF__artistsTab_afActivate() - loading started');

        tabs_set2Labels('artistsTab_info1', 'Loading...', 'artistsTab_info2', 'Loading...');
        tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Loading Artists...', showStrImmed=true);

        $('#artistsTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));

        await tracksTab_afLoadPlTracks();
        await artistsTab_afLoadArtistNames();
        await artistsTab_afLoadArtistNameTable();

        // 2x loadArtistTrackList() and getArtistTrackList()
        // - on tab switch we call artistsTab_selectRow()
        // - this invokes artistsTab_afLoadArtistTracks() and artistsTab_afLoadArtistTracksTable() via chained events
        //   --> artistsTab_selectRow()
        //     --> artistsTab_plNameTableKeyFocus()
        //       --> artistsTab_plNameTableSelect()
        //         --> artistsTab_afLoadArtistTracksTableSeq(plId, plName)
        //           --> await artistsTab_afLoadArtistTracks(artistId = artistId)
        //           --> artistsTab_afLoadArtistTracksTable(plId, plName) this is vUrl getArtistTrackList
        // - so we do not have to call artistsTab_afLoadArtistTracksTable() here
        // - so we do not have to call artistsTab_afLoadArtistTracksTable() here
        // await artistsTab_afLoadArtistTracks(artistId = '')
        // await artistsTab_afLoadArtistTracksTable();

        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#artistsTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__artistsTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afActivate() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistsTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistNames()
  {
    // console.log('__SF__artistsTab_afLoadArtistNames()');
    console.log('__SF__artistsTab_afLoadArtistNames() - vUrl - loadArtistDict');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadArtistDict: 'loadArtistDict' }), });
    if (!response.ok)
      tabs_throwErrHttp('artistsTab_afLoadArtistNames()', response.status, 'artistsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__artistsTab_afLoadArtistNames() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('artistsTab_afLoadArtistNames()', reply['errRsp'], 'artistsTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistNameTable()
  {
    // console.log('__SF__artistsTab_afLoadArtistNameTable()');
    // vArtistNamesTable.clear().draw(); // this does not work well here

    console.log('__SF__artistsTab_afLoadArtistNameTable() - vUrl - getArtistDict');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getArtistDict: 'getArtistDict'}),});
    if (!response.ok)
      tabs_throwErrHttp('artistsTab_afLoadArtistNameTable()', response.status, 'artistsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__artistsTab_afLoadArtistNameTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('artistsTab_afLoadArtistNameTable()', reply['errRsp'], 'artistsTab_errInfo')

      let artistDict = reply['artistDict']
      // console.log('__SF__artistsTab_afLoadArtistNameTable() - artistDict = \n' + JSON.stringify(artistDict, null, 4));
      $.each(artistDict, function (key, value)
      {
        vArtistNamesTable.row.add([value, key]);
      })
      vArtistNamesTable.draw();

      if (Object.keys(artistDict).length === 0)
      {
        // console.log('__SF__artistsTab_afLoadArtistNameTable() - the returned plSelectedDict is empty');
        return;
      }

      vArtistNamesTable.cell(':eq(0)').focus();
      // vArtistNamesTable.row(':eq(0)').select();

      let plSelectedDict = reply['plSelectedDict'];
      // console.log('__SF__artistsTab_afLoadArtistNameTable() - userPl = \n' + JSON.stringify(plSelectedDict, null, 4));
      $.each(plSelectedDict, function (key, item)
      {
        if (item['Playlist Owners Id'] == vUserId)
        {
          idNm = key + '::::' + item['Playlist Name']
          // console.log('__SF__artistsTab_afLoadArtistNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
          plNm = item['Playlist Name']
          if (plNm.length > 44)
            plNm = plNm.slice(0, 44) + '...'
          $('#artistsTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
        }
      });
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_plNameTableSelect() { /* make function appear in pycharm structure list */ }
  $('#artistNamesTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__artistsTab_artistsNamesTable_onSelect() - artistNamesTable row select indexes = ', indexes);
    if (vArtistsTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__artistsTab_artistsNamesTable_onSelect() - exiting - loading is true');
      return;
    }

    // console.log('__SF__artistsTab_artistsNamesTable_onSelect() - artistNamesTable row select indexes = ', indexes);
    let rowData = $('#artistNamesTable').DataTable().row(indexes).data();
    artistsTab_afLoadArtistTracksTableSeq(artistId = rowData[1]);
  });

  //-----------------------------------------------------------------------------------------------
  function artistsTab_plNameTableKeyFocus() { /* make function appear in pycharm structure list */ }
  $('#artistNamesTable').on('key-focus', function (e, datatable, cell)
  {
    // console.log('__SF__artistsTab_artistNamesTableKeyFocus() - artistNamesTable key focus ');
    if (vArtistsTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__artistsTab_plNameTableKeyFocus() - exiting - loading is true');
      return;
    }

    // datatable.rows().deselect();
    // console.log('__SF__artistsTab_plNameTableKeyFocus() - selecting row = ' + cell.index().row);
    vArtistNameTableLastSelectedRow = cell.index().row;
    datatable.row( cell.index().row ).select();
  });


  // //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistTracksTableSeq(artistId = '')
  {
    try
    {
      // console.log('__SF__artistsTab_afLoadArtistTracksTableSeq() - plId = ' + plId');
      vArtistsTabLoading = true;
      vArtistNamesTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistTracksTable.clear();//.draw(); draw causes annoying flash
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Loading Tracks for selected artist...', showStrImmed=false);

      await artistsTab_afLoadArtistTracks(artistId = artistId)
      await artistsTab_afLoadArtistTracksTable()
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afLoadArtistTracksTableSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistsTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistTracks(artistId = '')
  {
    // console.log('__SF__artistsTab_afLoadArtistTracks() - enter')
    if (artistId === '')
    {
      artistId = vArtistNamesTable.row(0).data()[1];
      // console.log('__SF__artistsTab_afLoadArtistTracks() - using first row artistId = ' + artistId);
    }

    console.log('__SF__artistsTab_afLoadArtistTracks() - vUrl - loadArtistTrackList');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({loadArtistTrackList: 'loadArtistTrackList', artistId: artistId}),});
    if (!response.ok)
      tabs_throwErrHttp('artistsTab_afLoadArtistTracks()', response.status, 'artistsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__artistsTab_afLoadArtistTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('artistsTab_afLoadArtistTracks()', reply['errRsp'], 'artistsTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistTracksTable()
  {
    // console.log('__SF__artistsTab_afLoadArtistTracksTable() - enter')

    // vArtistTracksTable.clear().draw();// this does not work well here
    console.log('__SF__artistsTab_afLoadArtistTracksTable() - vUrl - getArtistTrackList');
    let response = await fetch(vUrl, {  method: 'POST', headers: {'Content-Type': 'application/json',},
                                        body: JSON.stringify({getArtistTrackList: 'getArtistTrackList'}),});

    if (!response.ok)
      tabs_throwErrHttp('artistsTab_afLoadArtistTracksTable()', response.status, 'artistsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__artistsTab_afLoadArtistTracksTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('artistsTab_afLoadArtistTracksTable()', reply['errRsp'], 'artistsTab_errInfo')

      let idx = 0
      let artistTrackList = reply['artistTrackList']
      $.each(artistTrackList, function (key, tVals)
      {
        vArtistTracksTable.row.add(['', tVals['Track Name'], tVals['Playlist Name'], tVals['Album Name'], tVals['Duration Hms'],
                                        tVals['Track Position'], tVals['Playlist Owners Name'], tVals['Track Id'], tVals['Playlist Id'],
                                        tVals['Track Uri'], tVals['Artist Id'], tVals['Playlist Owners Id']]);
      });
      vArtistTracksTable.draw();

      artistsTab_updateSelectedCnt();
      let infoStr2 = 'Tracks for Selected Artist: ' + '&nbsp' + artistTrackList.length + ', &nbsp         Artists in Selected Playlists: ' + vArtistNamesTable.rows().count();
      tabs_setLabel('artistsTab_info2', infoStr2);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_artistsTracksTableSelect() { /* make function appear in pycharm structure list */ }
  $('#artistTracksTable').on('select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_tracksTab_artistTracksTableSelect() - artistTracksTable row select');
    artistsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function plTabs_artistTracksTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#artistTracksTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    artistsTab_updateSelectedCnt();
  });

  // //-----------------------------------------------------------------------------------------------
  // function artistsTab_artistTracksTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  // $('#artistTracksTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  // {
  //   rowData = vArtistTracksTable.row(cell.node()).data()
  //   // let rowData = vPlTracksTable.row(indexes).data();
  //   // console.log('__SF__artistsTab_artistTracksTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
  //   if (rowData[11] != vUserId)   // playlistOwnerId != vUserId
  //   {
  //      e.preventDefault();
  //      $("#artistsTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
  //      setTimeout(function() { $("#artistsTab_info3").text(''); }, 4500);
  //      return;
  //   }
  //
  //   // artistsTab_updateSelectedCnt(); // can not do this here since the select has yet to occur
  // });

  //-----------------------------------------------------------------------------------------------
  // function artistsTab_artistTracksTableDeselect() { /* make function appear in pycharm structure list */ }
  // $('#artistTracksTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  // {
  // });

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnRemoveTracks()
  {
    // console.log('__SF__artistsTab_btnRemoveTracks()');
    artistsTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afRmTracksSeq()
  {
    try
    {
      // console.log('__SF__artistsTab_afRmTracksSeq()');
      vArtistsTabLoading = true;
      vArtistNamesTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vArtistTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        if (rowData[11] !== vUserId)
        {
          alert('You can not remove tracks from playlists you do not own.');
          throw "NotOwnerErr";
        }
        rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vArtistTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__artistsTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      await artistsTab_afLoadArtistTracks(artistId=rowData[10])
      vArtistTracksTable.clear();        //.draw(); draw causes annoying flash
      await artistsTab_afLoadArtistTracksTable();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afRmTracksSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistsTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnRefresh()
  {
    // console.log('__SF__artistsTab_btnRefresh()');
    artistsTab_btnClearSearchArtistNameOnClick();
    artistsTab_btnClearSearchTracksOnClick();
    let rowData = vArtistTracksTable.row(0).data();
    // console.log('__SF__artistsTab_btnReload() - plNameTable rowData = \n' + JSON.stringify(rowData, null, 4));
    vArtistTracksTable.order([2, 'asc']); // go back to default, sort on playlist name
    artistsTab_afLoadArtistTracksTableSeq(artistId = rowData[10]);
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClearSearchArtistNameOnClick()
  {
    // console.log('__SF__artistsTab_btnClearSearchArtistNameOnClick()');
    vArtistsTabLoading = true;  // prevent any artist name selections
    let searchInputBox = $('[name="artistNamesTableSearchBox"]');
    searchInputBox.val('');
    searchInputBox.keyup();
    searchInputBox.focus();
    vArtistsTabLoading = false;
    artistsTab_selectRow(); // put focus on last item found
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClearSearchTracksOnClick()
  {
    // clear search boxes under tracks table
    $("input[name^='trackTableColSearchIB']").each(function() // clear search boxes under tracks table
    {
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vArtistTracksTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_updateSelectedCnt()
  {
    //console.log('__SF__artistsTab_updateSelectedCnt()');
    let count = vArtistTracksTable.rows({ selected: true }).count();
    tabs_setLabel('artistsTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnHelp()
  {
    vHtmlInfoFn = 'helpTextTabArtist.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnMoveTracks()
  {
    // console.log('__SF__artistsTab_btnMoveTracks()');

    let idNm = $('#artistsTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__artistsTab_cbMvCpDestOnChange() val = ' + idNm[0]);
    // console.log('__SF__artistsTab_cbMvCpDestOnChange() val = ' + idNm[1]);

    let count = vArtistTracksTable.rows({ selected: true }).count();
    if (count == '0')
    {
      alert('To move a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To move tracks you need to   Select A Destination Playlist   from the drop down combo box.');
    else
      artistsTab_afMvTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afMvTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__artistsTab_afMvTracksSeq()');
      vArtistsTabLoading = true;
      vArtistNamesTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Moving Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let mvTrackList = [];
      let rowData;
      $.each(vArtistTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        if (rowData[11] !== vUserId)
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

      vArtistTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__artistsTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__artistsTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__artistsTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMoveCopyTracks(destPlId, mvTrackList, 'Mv');
      await tabs_afRemoveTracks(rmTrackList);
      await artistsTab_afLoadArtistTracks(rowData[10]) // artist id
      await artistsTab_afLoadArtistTracksTable();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afMvTracksSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistsTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnCopyTracks()
  {
    // console.log('__SF__artistsTab_btnCopyTracks()');

    let idNm = $('#artistsTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__artistsTab_btnCopyTracks() val = ' + idNm[0]);
    // console.log('__SF__artistsTab_btnCopyTracks() val = ' + idNm[1]);

    let count = vArtistTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To copy a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To copy tracks you need to   Select A Destination Playlist   from the drop down combo box.');
    else
      artistsTab_afCpTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afCpTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__artistsTab_afCpTracksSeq()');
      vArtistsTabLoading = true;
      vArtistTracksTable.keys.disable();  // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vArtistTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[7]); // track id
        }
      });

      if (Object.keys(cpTrackList).length < 0)
        return

      vArtistTracksTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__artistsTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__artistsTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__artistsTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMoveCopyTracks(destPlId, cpTrackList, 'Cp');
      await artistsTab_afLoadArtistTracks(rowData[10]) // artist id
      await artistsTab_afLoadArtistTracksTable();
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_afCpTracksSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afCpTracksSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistNamesTable.keys.enable();   // prevent artistTracksTable from showing wrong playlist when user holds down up/dn arrows
      vArtistsTabLoading = false;
    }
  }

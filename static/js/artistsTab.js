
  var vArtistNamesTable;
  var vArtistTracksTable;
  var vLastPlSelectionCntrArtistsTab = 0;
  var vArtistsTabLoading = false;
  var vArtistTracksTableLastSearchCol = '';
  var vArtistNameTableLastSelectedRow = 0;
  var vArtistNameTableInitComplete = false;

  //-----------------------------------------------------------------------------------------------
  function artistsTab_init(tableHeight=300)
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
        $(nRow).addClass("c" + aData[0].replace(/\W/g, '') + aData[2].replace(/\W/g, '')); // use playlist Name and Id as class name
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
      columnDefs: [ { targets: 2, visible: false, searchable: false } ],  // col2 - artist id is invisble
      select: { style: 'single', toggleable: false },
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
  function artistsTab_scrollToLastSelectedRow()
  {
    let rowData = vArtistNamesTable.row(vArtistNameTableLastSelectedRow).data();
    let selectRowData = "c" + rowData[0].replace(/\W/g, '') + rowData[2].replace(/\W/g, '') // use playlist Name and Id
    let selection = $('#artistNamesTable .' + selectRowData);
    $(".dataTables_scrollBody").scrollTo(selection);
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_selectRow()
  {
    // console.log('__SF__artistsTab_selectRow()');
    // issue:
    //  - when clicking on a artist name row the selection is not remembered when switching back to this tab
    // fix:
    //  - we store the last selected row and apply it when switching this tab
    //  - .select() triggres artistNameTableSelect() which calls afLoadArtistTracksTableSeq()
    // console.log('__SF__artistsTab_selectRow() - focus lastSelectedRow= ' + vArtistNameTableLastSelectedRow);
    $('#artistNamesTable').DataTable().row(vArtistNameTableLastSelectedRow).select();

    // issue:
    //  - if you scroll the selected artist name out of view and then go to plTab and back
    //    to the artistsTab the selected aritist name is not visible
    // fix:
    //  - use scrollTo util to ensure selected artist name is viewable
    artistsTab_scrollToLastSelectedRow();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__artistsTab_activate()');
      // console.log('__SF__artistsTab_activate() - lastCnt = ' + vLastPlSelectionCntrArtistsTab + ', curCnt = ' + curPlSelectionCntr);
      if (vLastPlSelectionCntrArtistsTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrArtistsTab = curPlSelectionCntr;
        vArtistNameTableLastSelectedRow = 0;
        vArtistNameTableInitComplete = false;
        vArtistsTabLoading = true;
        $("#artistsTab_plNmTextInput").val('');

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        artistsTab_setupPlaybackControls();
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
        //       --> artistsTab_plNameTableSelect()
        //         --> artistsTab_afLoadArtistTracksTableSeq(plId, plName)
        //           --> await artistsTab_afLoadArtistTracks(artistId = artistId)
        //           --> artistsTab_afLoadArtistTracksTable(plId, plName) this is vUrl getArtistTrackList
        // - so we do not have to call artistsTab_afLoadArtistTracksTable() here
        // await artistsTab_afLoadArtistTracks(artistId = '')
        // await artistsTab_afLoadArtistTracksTable();
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
      vArtistsTabLoading = false;
      vArtistNameTableInitComplete = true;
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
        // col0: artist name (visible),  col1: track cnt (visible),  col2: artistId (invisible)
        vArtistNamesTable.row.add([value[0], value[1],  key]);
      })
      vArtistNamesTable.draw();

      if (Object.keys(artistDict).length === 0)
      {
        // console.log('__SF__artistsTab_afLoadArtistNameTable() - the returned plSelectedDict is empty');
        return;
      }

      let plSelectedDict = reply['plSelectedDict'];
      // console.log('__SF__artistsTab_afLoadArtistNameTable() - userPl = \n' + JSON.stringify(plSelectedDict, null, 4));
      $.each(plSelectedDict, function (key, item)
      {
        if (item['Playlist Owners Id'] == vUserId)
        {
          idNm = key + '::::' + item['Playlist Name'];
          // console.log('__SF__artistsTab_afLoadArtistNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
          plNm = item['Playlist Name'];
          if (plNm.length > 84)
            plNm = plNm.slice(0, 84) + '...';
          $('#artistsTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
        }
      });
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_artistNameTableSelect() { /* make function appear in pycharm structure list */ }
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
    vArtistNameTableLastSelectedRow = indexes[0]

    // console.log('__SF__artistsTab_artistsNamesTable_onSelect() - lfg artistId = ', rowData[1]);
    artistsTab_afLoadArtistTracksTableSeq(artistId = rowData[2]);
  });

  //-----------------------------------------------------------------------------------------------
  function artistsTab_artistNameTableOrder() { /* make function appear in pycharm structure list */ }
  $('#artistNamesTable').on( 'order.dt', function ()
  {
    // console.log('__SF__artistsTab_artistNameTableOrder()');

    // order is getting called before the artist tab is even loaded so we have to do an init check
    if (vArtistNameTableInitComplete === false)
    {
      // console.log('__SF__artistsTab_artistNameTableOrder() - exiting - init is not complete');
      return;
    }

    if (vArtistsTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__artistsTab_artistNameTableOrder() - exiting - loading is true');
      return;
    }

    // order is called on every keystroke when editing the artistsName search box and .order() returns order[0] that is undefined
    // let order = $('#artistNamesTable').DataTable().order();
    // if (order[0] !== undefined && order[0] !== null)
    //   console.log('__SF__artistsTab_artistNameTableOrder() - calling scrollTo. user hit sort on col: ' + order[0][0] + ', dir: ' + order[0][1]);

    // use scrollTo to ensure selected artist name is viewable after the user did a sort on the artist name table
    artistsTab_scrollToLastSelectedRow();
  });

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistTracksTableSeq(artistId = '')
  {
    try
    {
      // console.log('__SF__artistsTab_afLoadArtistTracksTableSeq() - artistId = ' + artistId);
      vArtistsTabLoading = true;
      vArtistTracksTable.clear();//.draw(); draw causes annoying flash
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Loading Tracks...', showStrImmed=false);

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
      vArtistsTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afLoadArtistTracks(artistId = '')
  {
    // console.log('__SF__artistsTab_afLoadArtistTracks() - enter')
    if (artistId === '')
    {
      artistId = vArtistNamesTable.row(0).data()[2];
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
  function artistsTab_artistsTracksRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#artistTracksTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    // console.log('artistsTab_artistsTracksRow_onUserSelect() --- user-select.dt');
    // this onUser method is called prior to the checkbox being updated
    // we use it to tell the user they have hit the 100 track selection limit

    let rowAlreadySelected = false;
    let rowNum = cell.index().row;
    vArtistTracksTable.rows({selected: true}).every(function (rowIdx, tableLoop, rowLoop)
    {
      if (rowNum === rowIdx)
      {
        rowAlreadySelected = true;
        return false;
      }
    });

    let rowData = vArtistTracksTable.row(cell.node()).data()
    if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
    {
      e.preventDefault();
      $("#artistsTab_info3").text("Track can not be removed or moved or copied since it does not have a track id.");
      setTimeout(function ()
      {
        $("#artistsTab_info3").text('');
      }, 4500);
      return;
    }

    if (rowAlreadySelected == false)
    {
      let count = vArtistTracksTable.rows({selected: true}).count();
      if (count === vSpotifyRmLimit)
      {
        e.preventDefault();
        // alert('You have hit the track selection limit. The limit is 100 tracks.\n\n' +
        //       'This is a Spotify limit.\n' +
        //       'Spotify limits the number of tracks that can be removed or moved or copied per call to 100.\n\n');
        $("#artistsTab_info3").text(vSpotifyRmLimitMsg);
        setTimeout(function ()
        {
          $("#artistsTab_info3").text('');
        }, 4500);
        return;
      }
    }
  });

  //-----------------------------------------------------------------------------------------------
  function artistsTab_artistsTracksTableSelect() { /* make function appear in pycharm structure list */ }
  $('#artistTracksTable').on('select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__artistsTab_artistsTab_artistTracksTableSelect() - artistTracksTable row select');
    // this method is called after the checkbox has been selected so we update the selected count
    artistsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function artistisTab_artistTracksTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#artistTracksTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // this method is called after the checkbox has been deselected so we update the selected count
    artistsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnRmTracksByPos()
  {
    // console.log('__SF__artistsTab_btnRmTracksByPos()');
    artistsTab_afRmTracksByPosSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afRmTracksByPosSeq()
  {
    try
    {
      // console.log('__SF__artistsTab_afRmTracksByPosSeq()');
      vArtistsTabLoading = true;
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

      if (Object.keys(rmTrackList).length === 0)
        return;

      // console.log('__SF__artistsTab_afRmTracksByPosSeq() rmTrackList: = \n' + JSON.stringify(rmTrackList, null, 4));
      vArtistNamesTable.clear();
      vArtistTracksTable.clear();
      await tabs_afRmTracksByPos(rmTrackList);
      await artistsTab_afLoadArtistNames();
      await artistsTab_afLoadArtistNameTable();
      await artistsTab_afLoadArtistTracks(artistId=rowData[10]);
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
      // console.log('__SF__artistsTab_afRmTracksByPosSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistsTabLoading = false;
      artistsTab_selectRow();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClear()
  {
    // console.log('__SF__artistsTab_btnClear()');
    artistTab_afClearSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistTab_afClearSeq()
  {
    // console.log('__SF__artistsTab_afClear()');
    vArtistsTabLoading = true;
    artistsTab_btnClearSearchArtistNameOnClick(focusOnField=false);
    artistsTab_btnClearSearchTracksOnClick(focusOnField=false);
    vArtistNamesTable.order([]); // remore sorting on artistNm table
    vArtistTracksTable.order([]); // remove sorting on track table
    vArtistNamesTable.clear();  // remove data from artistNm table
    await artistsTab_afLoadArtistNameTable();  // reload artistNm table
    vArtistsTabLoading = false;
    artistsTab_selectRow();  // this will trigger an artist track table clear and reload
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClearSearchArtistNameOnClick(focusOnField=true)
  {
    // console.log('__SF__artistsTab_btnClearSearchArtistNameOnClick()');
    let searchInputBox = $('[name="artistNamesTableSearchBox"]');
    searchInputBox.val('');
    searchInputBox.keyup();
    if (focusOnField)
    {
      searchInputBox.focus();
      artistsTab_selectRow(); // put focus on last item found
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClearSearchTracksOnClick(focusOnField=true)
  {
    // clear search boxes under tracks table
    $("input[name^='trackTableColSearchIB']").each(function() // clear search boxes under tracks table
    {
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    if (focusOnField)
    {
      // last element edited gets focus
      let searchInputBox = $('input[name="' + vArtistTracksTableLastSearchCol + '"]');
      searchInputBox.focus();
    }
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
  function artistsTab_btnMvTracks()
  {
    // console.log('__SF__artistsTab_btnMvTracks()');

    let idNm = $('#artistsTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__artistsTab_cbMvCpDestOnChange() val = ' + idNm[0]);
    // console.log('__SF__artistsTab_cbMvCpDestOnChange() val = ' + idNm[1]);

    let count = vArtistTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To move a track(s) you need to select a track(s).');
      return;
    }
    if (count > 100)
    {
      alert('Spotify limits the number of tracks that can be moved at a time to 100. No tracks were moved.\n');
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
          mvTrackList.push(rowData[9]); // track uri
        }
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      // console.log('__SF__artistsTab_afMvTracksSeq() destPlId: = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__artistsTab_afMvTracksSeq() mvTrackList: = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__artistsTab_afMvTracksSeq() rmTrackList: = \n' + JSON.stringify(rmTrackList, null, 4));
      vArtistNamesTable.clear();
      vArtistTracksTable.clear();
      await tabs_afMvCpTracks(destPlId, mvTrackList, 'Mv');
      await tabs_afRmTracksByPos(rmTrackList);
      await artistsTab_afLoadArtistNames();
      await artistsTab_afLoadArtistNameTable();
      await artistsTab_afLoadArtistTracks(rowData[10]); // artist id
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
      vArtistsTabLoading = false;
      artistsTab_selectRow();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnCpTracks()
  {
    // console.log('__SF__artistsTab_btnCpTracks()');

    let idNm = $('#artistsTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__artistsTab_btnCpTracks() val = ' + idNm[0]);
    // console.log('__SF__artistsTab_btnCpTracks() val = ' + idNm[1]);

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
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vArtistTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[9]); // track uri
        }
      });

      if (Object.keys(cpTrackList).length === 0)
        return;

      // console.log('__SF__artistsTab_afCpTracksSeq() destPlId: = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__artistsTab_afCpTracksSeq() cpTrackList: = \n' + JSON.stringify(cpTrackList, null, 4));
      vArtistNamesTable.clear();
      vArtistTracksTable.clear();
      await tabs_afMvCpTracks(destPlId, cpTrackList, 'Cp');
      await artistsTab_afLoadArtistNames();
      await artistsTab_afLoadArtistNameTable();
      await artistsTab_afLoadArtistTracks(artistId=rowData[10]);
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
      vArtistsTabLoading = false;
      artistsTab_selectRow();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnSelectAll()
  {
    // console.log('__SF__artistsTab_btnSelectAll()');
    vArtistsTabLoading = true;
    let rowData;
    var cntInvalidTrackId = 0;
    vArtistTracksTable.rows().every(function ()
    {
      let rowData = this.data();
      // console.log('__SF__artistsTab_btnSelectAll() - track id ' + rowData[7] + ', len = ' + rowData[7].length);
      if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
        cntInvalidTrackId++;
      else
        this.select();
    });
    // console.log('__SF__artistsTab_btnSelectAll() - invalid track id cnt = ' + cntInvalidTrackId);
    vArtistsTabLoading = false;
    artistsTab_updateSelectedCnt();
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_setupPlaybackControls()
  {
    // enable/disable the playback btns
    let btn = [$('#artistsTab_PlayTracks'), $('#artistsTab_PauseTrack'), $('#artistsTab_NextTrack'), $('#artistsTab_AddToQueue')];

    btn.forEach((btn) =>
    {
      if (vUserProduct != 'premium')
      {
        btn.css('opacity', '0.2');
        btn.prop("disabled", true);  // disabled on free accounts
      }
      else
      {
        btn.css('opacity', '1.0');
        btn.prop("disabled", false); // enabled on premium accounts
      }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnAddToQueue()
  {
    // btn is disabled if account is not premium
    artistsTab_afAddToQueueSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afAddToQueueSeq()
  {
    try
    {
      // console.log('__SF__artistsTab_afAddToQueueSeq() - enter');
      let count = vArtistTracksTable.rows({ selected: true }).count();
      if (count == 0)
      {
        alert('Select one or more tracks and then press add to queue.');
        return;
      }

      vArtistsTabLoading = true;
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Adding tracks to queue...', showStrImmed=false);

      let trackUris = [];
      let rowData;
      let cntr = 0;
      $.each(vArtistTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        trackUris.push(rowData[9]); // track uri
        // limited to 20 tracks because the spotify api only allows adding one track at a time to the queue
        // if you call this api too fast it will miss tracks so the loader.addToQueue() has a delay between calls to spotify
        cntr++;
        if (cntr === 20)
          return false;
      });

      // console.log('trackuris = ' + trackUris);
      let retVal = await tabs_afAddToQueue(trackUris)
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_afAddToQueueSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afAddToQueueSeq() finally');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistsTabLoading = false;
    }

  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnPlayTracks()
  {
    // btn is disabled if account is not premium
    artistsTab_afPlayTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afPlayTracksSeq()
  {
    try
    {
      let contextUri = '';
      let trackUris = [];
      let retVal = await tabs_afPlayTracks(contextUri, trackUris) // pressing play on spotify
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_afPlayTracksSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnPauseTrack()
  {
    // btn is disabled if account is not premium
    artistsTab_afPauseTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afPauseTrackSeq()
  {
    try
    {
      let retVal = await tabs_afPauseTrack()
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_afPauseTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnNextTrack()
  {
    // btn is disabled if account is not premium
    artistsTab_afNextTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afNextTrackSeq()
  {
    try
    {
      let retVal = await tabs_afNextTrack()
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_afNextTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnClearPlNmText()
  {
    // console.log('__SF__artistsTab_btnClearPlNmText()');
    $("#artistsTab_plNmTextInput").val('');
  }

  //-----------------------------------------------------------------------------------------------
  function artistsTab_btnCreatePlaylist()
  {
    // console.log('__SF__artistsTab_btnCreatePlaylist()');
    artistsTab_afCreatePlaylistSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function artistsTab_afCreatePlaylistSeq()
  {
    try {
      // console.log('__SF__artistsTab_afCreatePlaylistSeq()');
      if ((vArtistTracksTable.rows({selected: true}).count() == 0))
      {
        alert('At least one track must be selected to create a new playlist.');
        return;
      }

      let vNewPlNm = $("#artistsTab_plNmTextInput").val();
      if (vNewPlNm == '')
      {
        alert('Please enter a name for the new playlist.');
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

      vArtistsTabLoading = true;
      tabs_progBarStart('artistsTab_progBar', 'artistsTab_progStat1', 'Creating Playlist...', showStrImmed=true);

      let rowData;
      let createUriTrackList = [];
      $.each(vArtistTracksTable.rows('.selected').nodes(), function(i, item)
      {
        rowData = vArtistTracksTable.row(this).data();
        if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
          cntInvalidTrackId++;
        else
          createUriTrackList.push(rowData[9]); // track uri
      });
      // console.log('artistsTab_afCreatePlaylistSeq() rmTrackList: rowData = \n' + JSON.stringify(createUriTrackList, null, 4));

      await tabs_afCreatePlaylist(vNewPlNm, createUriTrackList);
      await new Promise(r => setTimeout(r, 3000));  // Spotify can be slow to update the list of playlists

      // reload the plDict so the created pl is in the plDict
      await plTab_afLoadPlDict(false);

      // get the plTable to reload when the user goes back to the plTab
      vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

      $("#artistsTab_plNmTextInput").val('');
    }
    catch(err)
    {
      // console.log('__SF__artistsTab_btnCpTracks() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__artistsTab_afMvTracksSeq() finally.');
      tabs_progBarStop('artistsTab_progBar', 'artistsTab_progStat1', '');
      vArtistsTabLoading = false;
    }
  }


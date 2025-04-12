  var vSearchTable;
  var vLastPlSelectionCntrSearchTab = 0;
  var vSearchTableLastSearchCol = '';
  var vSearchTabLoading = false;

  var vCbxTrackNameVal = false;
  var vCbxArtistNameVal = false;
  var vCbxAlbumNameVal = false;
  var vCbxPlaylistNameVal = false;
  var vCbxDurationHmsVal = false;
  var vCbxTrackIdVal = false;

  var vSearchText = '';
  var vPrevSearchFieldVal = '';


  //-----------------------------------------------------------------------------------------------
  function searchTab_init(tableHeight=300)
  {
    // console.log("searchTab_initPlTab() - searchTable ready()");

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#searchTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="searchTab_btnClearColSearchFieldsOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'searchColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vSearchTable = $('#searchTable').DataTable(
    {
      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              vSearchTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 93,  // compensate for extra height for radio btns that the other tabs do not have
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets:  0, className: 'select-checkbox', orderable: false },
                    { targets:  9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false }],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_redraw()
  {
    // console.log('__SF__searchTab_redraw()');
    vSearchTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__searchTab_activate()');
      // console.log('__SF__searchTab_activate() - lastCnt = ' + vLastPlSelectionCntrSearchTab + ', curCnt = ' + curPlSelectionCntr);
      if (vLastPlSelectionCntrSearchTab !== curPlSelectionCntr)
      {
        // console.log('__SF__searchTab_activate() - lastCnt = ' + vLastPlSelectionCntrSearchTab + ', curCnt = ' + curPlSelectionCntr);
        vLastPlSelectionCntrSearchTab = curPlSelectionCntr;
        vSearchTabLoading = true;
        $('#searchTab_hint').hide();
        $("#searchTextInput").val('');
        $("#searchTab_plNmTextInput").val('');

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vSearchTable.clear().draw();
        $('#searchTab_cbMvCpDest').empty();
        $('#searchTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));

        // console.log('__SF__searchTab_afActivate() - start loading');
        $("#searchTab_info3").text('');
        tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');

        tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Loading Tracks...', showStrImmed=true);
        await tracksTab_afLoadPlTracks();

        tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);
        searchTab_setupPlaybackControls();
        await searchTab_afClearSearchTrackList();
        await searchTab_afRunSearch();
        await searchTab_afLoadSearchTable();
      }
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afActivate() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      searchTab_SetSearchTextFocus();
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_LoadSearchFields()
  {
    vCbxTrackNameVal = $('#cbxTrackNameId').is(':checked');
    vCbxArtistNameVal = $('#cbxArtistNameId').is(':checked');
    vCbxAlbumNameVal = $('#cbxAlbumNameId').is(':checked');
    vCbxPlaylistNameVal = $('#cbxPlaylistNameId').is(':checked');
    vCbxDurationHmsVal = $('#cbxDurationHmsId').is(':checked');
    vCbxTrackIdVal = $('#cbxTrackId').is(':checked');

    if (vCbxTrackNameVal === false && vCbxArtistNameVal === false && vCbxAlbumNameVal === false &&
        vCbxPlaylistNameVal === false && vCbxDurationHmsVal === false && vCbxTrackIdVal === false)
      return false;

    return true;
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_SetSearchTextFocus()
  {
    // put the focus at the end of the search text to make editing easier
    var sti = $("#searchTextInput")
    var txtVal = sti.val();
    sti.val('');
    sti.val(txtVal)
    sti.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_cbxEventSearchChange() { /* make function appear in pycharm structure list */  }
  $('input[type=checkbox][name=cbxSearchFields]').click(function ()
  {
    if (vSearchTabLoading === true)
    {
      $("#searchTab_info3").text("Search Tab is loading. Please switch search fields when loading is complete.");
      setTimeout(function ()
      {
        $("#searchTab_info3").text('');
      }, 4500);
      return false;
    }

    // clicking on search field cbx will trigger a search
    var cbxFound = searchTab_LoadSearchFields();
    if (cbxFound === false)
    {
      searchTab_afLoadSearchTableSeq(true); // no cbxs are set so clear the table
      return;
    }

    vSearchText = $("#searchTextInput").val();
    if (vSearchText === '')
      return

    searchTab_afRunSearchSeq() // run a search
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTextFieldKeyUpEvent() { /* make function appear in pycharm structure list */ }
  $("#searchTextInput").on('keyup', function (event)
  {
    // console.log('search txt key up,  val = ', $(this).val())

    // if the search field is cleared by a backspace or delete clear the search results
    if ((event.keyCode === 8) || (event.keyCode === 46)) // backspace || delete
    {
      if (vSearchTabLoading === true)
      {
        $("#searchTab_info3").text("Search Tab is loading. Please wait until loading is complete.");
        setTimeout(function ()
        {
          $("#searchTab_info3").text('');
        }, 4500);
        return false;
      }

      fieldVal = $(this).val();
      if ((vPrevSearchFieldVal != "") && (fieldVal == ""))
        searchTab_afLoadSearchTableSeq(true);
    }

    // do a search when the user hits enter
    if (event.keyCode === 13) // return
    {
      if (vSearchTabLoading === true)
      {
        $("#searchTab_info3").text("Search Tab is loading. Please wait until loading is complete.");
        setTimeout(function ()
        {
          $("#searchTab_info3").text('');
        }, 4500);
        return false;
      }
      vSearchText = $(this).val();
      if (vSearchText != "")
        searchTab_afRunSearchSeq();
    }

    vPrevSearchFieldVal = $(this).val();
  });

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRunSearchSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afRunSearchSeq()');
      vSearchTabLoading = true;
      $('#searchTab_hint').hide();
      vSearchTable.clear().draw();

      var cbxFound = searchTab_LoadSearchFields();
      if (cbxFound === false)
      {
        alert('A search field must be selected prior to doing a search.')
        return;
      }

      vSearchText = $("#searchTextInput").val();
      if (vSearchText === '')
      {
        alert("A search text string must be entered prior to doing a search.");
        return
      }

      // console.log("track = " + vCbxTrackNameVal + ", artist = " + vCbxArtistNameVal + ", album = " + vCbxAlbumNameVal + ", playlist = " + vCbxPlaylistNameVal + ", duration = " + vCbxDurationHmsVal + ", trackId = " + vCbxTrackIdVal);
      // console.log("search text = " + vSearchText);

      // console.log('__SF__searchTab_afRunSearchSeq() - start loading');
      $("#searchTab_info3").text('');
      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);

      await searchTab_afRunSearch();
      await searchTab_afLoadSearchTable();
      searchTab_SetSearchTextFocus();

      // console.log('__SF__searchTab_afRunSearchSeq() - loading done - exit');
    }
    catch(err)
    {
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afRunSearchSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRunSearch()
  {
    // console.log('__SF__searchTab_afRunSearch()');

    var cbxFound = searchTab_LoadSearchFields();
    if (cbxFound === false)
      return;

    vSearchText = $("#searchTextInput").val();
    if (vSearchText === '')
      return;

    console.log('__SF__searchTab_afRunSearch() - vUrl - runSearch');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ runSearch: 'runSearch',
                                                              searchText:     vSearchText,
                                                              ckTrackName:    vCbxTrackNameVal,
                                                              ckArtistName:   vCbxArtistNameVal,
                                                              ckAlbumName:    vCbxAlbumNameVal,
                                                              ckPlaylistName: vCbxPlaylistNameVal,
                                                              ckDurationHms:  vCbxDurationHmsVal,
                                                              ckTrackId:      vCbxTrackIdVal }), });
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afRunSearch()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afRunSearch()', reply['errRsp'], 'searchTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTableSeq(clear)
  {
    try
    {
      // console.log("searchTab_afLoadSearchTableSeq()");
      vSearchTabLoading = true;
      $('#searchTab_hint').hide();

      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);

      vSearchTable.clear().draw();

      if (clear) // true if no cbx's are selected
        await searchTab_afClearSearchTrackList(); // clear search results on server so next searchTab_afLoadSearchTable is an empty table

      await searchTab_afLoadSearchTable();
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTable()
  {
    // console.log('__SF__searchTab_afLoadSearchTable()');
    console.log('__SF__searchTab_afLoadSearchTable() - vUrl - getSearchTrackList');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getSearchTrackList: 'getSearchTrackList'}), });
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afLoadSearchTable()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__searchTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afLoadSearchTable()', reply['errRsp'], 'searchTab_errInfo');

      let searchTrackList = reply['searchTrackList'];
      $.each(searchTrackList, function(key, tvals)
      {
        vSearchTable.row.add(['', tvals['Track Name'], tvals['Artist Name'], tvals['Album Name'], tvals['Playlist Name'],
                                  tvals['Duration Hms'], tvals['Track Position'], tvals['Playlist Owners Name'], tvals['Track Id'],
                                  tvals['Playlist Id'], tvals['Track Uri'], tvals['Playlist Owners Id'] ]);
      });
      vSearchTable.draw();

      plSelectedDict = reply['plSelectedDict']
      nSelectedPl = Object.keys(plSelectedDict).length;

      searchTab_updateSelectedCnt();
      let infoStr2 = 'Tracks Found: ' + reply['numSearchMatches'] + '&nbsp &nbsp &nbsp in ' + nSelectedPl + ' Selected Playlists ' + ' with ' + reply['numTracksInSelectedPl'] + ' Tracks';
      tabs_setLabel('searchTab_info2', infoStr2);

      // on activate the combobox len will be one
      // do not clear combobox drop down between searches to preserve the user selection
      cbLen = $('#searchTab_cbMvCpDest').children('option').length
      // console.log('searchTab_afLoadSearchTable() - cbLen = ' + cbLen);
      if (cbLen <= 1)
      {
        $('#searchTab_cbMvCpDest').empty();
        $('#searchTab_cbMvCpDest').append($('<option>', {value: '0::::str2', text: cbMvDestDefault}));
        $.each(plSelectedDict, function (key, item) {
          if (item['Playlist Owners Id'] === vUserId) {
            idNm = key + '::::' + item['Playlist Name'];
            // console.log('__SF__searchTab_afLoadPlNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
            plNm = item['Playlist Name'];
            if (plNm.length > 84)
              plNm = plNm.slice(0, 84) + '...';
            $('#searchTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
          }
        });
      }
      // only show no matches found warning if we did a search and were not clearing the table
      vShowNoMatchesFound = true;
      vSearchText = $("#searchTextInput").val();
      var cbxFound = searchTab_LoadSearchFields();

      if (cbxFound === false)
        vShowNoMatchesFound = false;
      else if (vSearchText === '')
        vShowNoMatchesFound = false;
      else if (reply['numSearchMatches'] > 0)
        vShowNoMatchesFound = false;

      if (vShowNoMatchesFound)
      {
        msg = 'No matches found in selected playlists.';
        $("#searchTab_info3").text(msg);
      }
      else
        $("#searchTab_info3").text('');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afClearSearchTrackList()
  {
    // console.log('__SF__searchTab_afClearSearchTrackList()');

    console.log('__SF__searchTab_afClearSearchTrackList() - vUrl - clearSearchTrackList');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({clearSearchTrackList: 'clearSearchTrackList'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__searchTab_afClearSearchTrackList()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__searchTab_afClearSearchTrackList() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__searchTab_afClearSearchTrackList()', reply['errRsp'], 'searchTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_updateSelectedCnt()
  {
    //console.log('__SF__artistsTab_updateSelectedCnt()');
    let count = vSearchTable.rows({ selected: true }).count();
    tabs_setLabel('searchTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableRow_userSelect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    // console.log('searchTab_searchTableRow_userSelect() --- user-select.dt');
    // this onUser method is called prior to the checkbox being updated
    // we use it to tell the user they have hit the 100 track selection limit

    let rowAlreadySelected = false;
    let rowNum = cell.index().row;
    vSearchTable.rows({selected: true}).every(function (rowIdx, tableLoop, rowLoop)
    {
      if (rowNum === rowIdx)
      {
        rowAlreadySelected = true;
        return false;
      }
    });

    let rowData = vSearchTable.row(cell.node()).data()
    if (!rowData[8])    // !trackId tests for "", null, undefined, false, 0, NaN
    {
      e.preventDefault();
      $("#searchTab_info3").text("Track can not be removed or moved or copied since it does not have a track id.");
      setTimeout(function ()
      {
        $("#searchTab_info3").text('');
      }, 4500);
      return;
    }

    if (rowAlreadySelected == false)
    {
      let count = vSearchTable.rows({selected: true}).count();
      if (count === vSpotifyRmLimit)
      {
        e.preventDefault();
        // alert('You have hit the track selection limit. The limit is 100 tracks.\n\n' +
        //       'This is a Spotify limit.\n' +
        //       'Spotify limits the number of tracks that can be removed or moved or copied per call to 100.\n\n');
        $("#searchTab_info3").text(vSpotifyRmLimitMsg);
        setTimeout(function ()
        {
          $("#searchTab_info3").text('');
        }, 4500);
        return;
      }
    }
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableSelect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // this method is called after the checkbox has been selected so we update the selected count
    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // this method is called after the checkbox has been deselected so we update the selected count
    searchTab_updateSelectedCnt();
  });

    //-----------------------------------------------------------------------------------------------
  function searchTab_btnRmTracksByPos()
  {
    // console.log('__SF__searchTab_btnRmTracksByPos()');
    searchTab_afRmTracksByPosSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRmTracksByPosSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afRmTracksByPosSeq()');
      vSearchTabLoading = true;
      $('#searchTab_hint').hide();

      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        if (rowData[11] !== vUserId)
        {
          alert('You can not remove tracks from playlists you do not own.');
          throw "NotOwnerErr";
        }
        rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[6])});
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      vSearchTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__searchTab_afRmTracksByPosSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRmTracksByPos(rmTrackList);
      vSearchTable.clear();
      await searchTab_afRunSearchSeq();
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
      // console.log('__SF__searchTab_afRmTracksByPosSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnMvTracks()
  {
    // console.log('__SF__searchTab_btnMvTracks()');

    let idNm = $('#searchTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__searchTab_cbMvCpDestOnChange() val = ' + idNm[0]);
    // console.log('__SF__searchTab_cbMvCpDestOnChange() val = ' + idNm[1]);

    let count = vSearchTable.rows({ selected: true }).count();
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
      searchTab_afMvTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afMvTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__searchTab_afMvTracksSeq()');
      vSearchTabLoading = true;
      $('#searchTab_hint').hide();

      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Moving Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let mvTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        if (rowData[11] !== vUserId)
        {
          alert('You can not move tracks you do not own (try using the copy feature instead).');
          throw "NotOwnerErr";
        }

        if (rowData[9] != destPlId)  // if src plid == the dest plid skip the track
        {
          rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[6])});
          mvTrackList.push(rowData[10]); // track uri
        }
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      vSearchTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__searchTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__searchTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__searchTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMvCpTracks(destPlId, mvTrackList, 'Mv');
      await tabs_afRmTracksByPos(rmTrackList);
      await searchTab_afRunSearchSeq()
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
      // console.log('__SF__searchTab_afMvTracksSeq() finally.');
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      vSearchTabLoading = false;
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnCpTracks()
  {
    // console.log('__SF__searchTab_btnCpTracks()');

    let idNm = $('#searchTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__searchTab_btnCpTracks() val = ' + idNm[0]);
    // console.log('__SF__searchTab_btnCpTracks() val = ' + idNm[1]);

    let count = vSearchTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To copy a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To copy tracks you need to   Select A Destination Playlist   from the drop down combo box.');
    else
      searchTab_afCpTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afCpTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__searchTab_afCpTracksSeq()');
      vSearchTabLoading = true;
      $('#searchTab_hint').hide();

      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        if (rowData[9] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[10]); // track uri
        }
      });

      if (Object.keys(cpTrackList).length === 0)
        return;

      vSearchTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__searchTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__searchTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__searchTab_afCpTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afMvCpTracks(destPlId, cpTrackList, 'Cp');
      await searchTab_afRunSearchSeq();
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afCpTracksSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afCpTracksSeq() finally.');
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      vSearchTabLoading = false;
      $('#searchTab_hint').show();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearColSearchFieldsOnClick(focusOnField=true)
  {
    //console.log('__SF__searchTab_btnClearColSearchFieldsOnClick()');

    // clear table search boxes under track table
    $("input[name^='searchColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    if (focusOnField)
    {
      // last element edited gets focus
      let searchInputBox = $('input[name="' + vSearchTableLastSearchCol + '"]');
      searchInputBox.focus();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearch()
  {
    // console.log('__SF__searchTab_btnSearch()');
    if (vSearchTabLoading === true)
    {
      $("#searchTab_info3").text("Search Tab is loading. Please wait until loading is complete.");
      setTimeout(function ()
      {
        $("#searchTab_info3").text('');
      }, 4500);
      return false;
    }
    searchTab_afRunSearchSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearchClear()
  {
    // console.log('__SF__searchTab_btnSearchClear()');
    if (vSearchTabLoading === true)
    {
      $("#searchTab_info3").text("Search Tab is loading. Please wait until loading is complete.");
      setTimeout(function ()
      {
        $("#searchTab_info3").text('');
      }, 4500);
      return false;
    }    vSearchTable.clear().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClear()
  {
    // console.log('__SF__searchTab_btnClear()');
    vSearchTable.order([]); // remove sorting
    searchTab_btnClearColSearchFieldsOnClick(false);
    searchTab_afLoadSearchTableSeq(false);
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnHelp()
  {
    // console.log('__SF__searchTab_btnHelp()');
    vHtmlInfoFn = 'helpTextTabSearch.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearSearchText()
  {
    $("#searchTextInput").val('');
    searchTab_afLoadSearchTableSeq(true);
    searchTab_SetSearchTextFocus();
  }

    //-----------------------------------------------------------------------------------------------
  function searchTab_btnSelectAll()
  {
    // console.log('__SF__searchTab_btnSelectAll()');
    vSearchTabLoading = true;
    let rowData;
    var cntInvalidTrackId = 0;
    vSearchTable.rows().every(function ()
    {
      let rowData = this.data();
      // console.log('__SF__searchTab_btnSelectAll() - track id ' + rowData[7] + ', len = ' + rowData[7].length);
      if (!rowData[8])    // !trackId tests for "", null, undefined, false, 0, NaN
        cntInvalidTrackId++;
      else
        this.select();
    });
    vSearchTabLoading = false;
    searchTab_updateSelectedCnt();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_setupPlaybackControls()
  {
    // enable/disable the playback btns
    let btn = [$('#searchTab_PlayTracks'), $('#searchTab_PauseTrack'), $('#searchTab_NextTrack'), $('#searchTab_AddToQueue')];

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
  function searchTab_btnAddToQueue()
  {
    // btn is disabled if account is not premium
    searchTab_afAddToQueueSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afAddToQueueSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afAddToQueueSeq() - enter');
      let count = vSearchTable.rows({ selected: true }).count();
      if (count == 0)
      {
        alert('Select one or more tracks and then press add to queue.');
        return;
      }

      vSearchTabLoading = true;
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Adding tracks to queue...', showStrImmed=true);

      let trackUris = [];
      let rowData;
      let cntr = 0;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        trackUris.push(rowData[10]); // track uri
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
      // console.log('__SF__searchTab_afAddToQueueSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afAddToQueueSeq() - finally');
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      vSearchTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnPlayTracks()
  {
    // btn is disabled if account is not premium
    searchTab_afPlayTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afPlayTracksSeq()
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
      // console.log('__SF__searchTab_afPlayTracksSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnPauseTrack()
  {
    // btn is disabled if account is not premium
    searchTab_afPauseTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afPauseTrackSeq()
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
      // console.log('__SF__searchTab_afPauseTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnNextTrack()
  {
    // btn is disabled if account is not premium
    searchTab_afNextTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afNextTrackSeq()
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
      // console.log('__SF__searchTab_afNextTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearPlNmText()
  {
    // console.log('__SF__searchTab_btnClearPlNmText()');
    $("#searchTab_plNmTextInput").val('');
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnCreatePlaylist()
  {
    // console.log('__SF__searchTab_btnCreatePlaylist()');
    searchTab_afCreatePlaylistSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afCreatePlaylistSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afCreatePlaylistSeq()');
      if ((vSearchTable.rows({ selected: true }).count() == 0))
      {
        alert('At least one track must be selected to create a new playlist.');
        return;
      }

      let vNewPlNm = $("#searchTab_plNmTextInput").val();
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

      vSearchTabLoading = true;
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Creating Playlist...', showStrImmed=true);

      let rowData;
      let createUriTrackList = [];
      $.each(vSearchTable.rows('.selected').nodes(), function(i, item)
      {
        rowData = vSearchTable.row(this).data();
        if (!rowData[8])    // !trackId tests for "", null, undefined, false, 0, NaN
          cntInvalidTrackId++;
        else
          createUriTrackList.push(rowData[10]); // track uri
      });
      // console.log('searchTab_afCreatePlaylistSeq() createUriTrackList: rowData = \n' + JSON.stringify(createUriTrackList, null, 4));

      let vNewPlId = await tabs_afCreatePlaylist(vNewPlNm, createUriTrackList);
      await new Promise(r => setTimeout(r, 3000));  // Spotify can be slow to update the list of playlists

      // - get the new pl loaded into the plDict
      // - this reload will return a track count of 0 for the new pl
      // - spotify takes a long time to get the pl track cnt updated
      await plTab_afLoadPlDict(false);

      // - but if we load the bupl we just created it will have the tracks
      // - this will update the plDict w/ the correct track cnt
      await tracksTab_afLoadPlTracks1x(vNewPlId, vNewPlNm);

      // - get the updated plDict from the server and repaint the table
      vPlTable.clear().draw();
      await plTab_afLoadPlTable();
      await plTab_afRestorePlTableCkboxes();
      plTabs_updateSelectedCntInfo();


      // get the plTable to reload when the user goes back to the plTab
      vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

      $("#searchTab_plNmTextInput").val('');
    }
    catch(err)
    {
      // console.log('__SF__searchTab_btnCpTracks() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afMvTracksSeq() finally.');
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
      vSearchTabLoading = false;
    }
  }


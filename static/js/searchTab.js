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
      "scrollY":         tableHeight - 92,  // compensate for extra height for radio btns that the other tabs do not have
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

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#searchTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrSearchTab !== curPlSelectionCntr)
      {
        // console.log('__SF__searchTab_activate() - lastCnt = ' + vLastPlSelectionCntrSearchTab + ', curCnt = ' + curPlSelectionCntr);
        vLastPlSelectionCntrSearchTab = curPlSelectionCntr;
        vSearchTabLoading = true;

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
        await searchTab_afClearSearchTrackList();
        await searchTab_afRunSearch();
        await searchTab_afLoadSearchTable();

        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#searchTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__searchTab_afActivate() - loading done - exit');
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
  function searchTab_cbxEventSearch() { /* make function appear in pycharm structure list */  }
  $('input[type=checkbox][name=cbxSearchFields]').change(function ()
  {
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
    // do a search when the user hits enter
    if (event.keyCode === 13)
    {
      vSearchText = $(this).val();
      if (vSearchText != "")
        searchTab_afRunSearchSeq();
    }
  });

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRunSearchSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afRunSearchSeq()');
      vSearchTabLoading = true;
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

      $('#searchTab_cbMvCpDest').empty();
      $('#searchTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));
      $.each(plSelectedDict, function (key, item)
      {
        if (item['Playlist Owners Id'] === vUserId)
        {
          idNm = key + '::::' + item['Playlist Name'];
          // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
          plNm = item['Playlist Name'];
          if (plNm.length > 44)
            plNm = plNm.slice(0, 44) + '...';
          $('#searchTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
        }
      });

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
    if (count == '0')
    {
      alert('To move a track(s) you need to select a track(s).');
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
          mvTrackList.push(rowData[8]); // track id
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
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        if (rowData[9] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[8]); // track id
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
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearColSearchFieldsOnClick()
  {
    //console.log('__SF__searchTab_btnClearColSearchFieldsOnClick()');

    // clear table search boxes under track table
    $("input[name^='searchColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vSearchTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearch()
  {
    // console.log('__SF__searchTab_btnSearch()');
    searchTab_afRunSearchSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearchClear()
  {
    // console.log('__SF__searchTab_btnSearchClear()');
    vSearchTable.clear().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClear()
  {
    // console.log('__SF__searchTab_btnClear()');
    vSearchTable.order([]); // remove sorting
    searchTab_btnClearColSearchFieldsOnClick();
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

